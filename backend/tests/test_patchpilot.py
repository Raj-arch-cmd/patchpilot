"""
Backend tests for PatchPilot.

Tests are organized in dependency order:
1. Configuration and prioritization (no DB needed)
2. Integration tests (require FalkorDB — skipped gracefully if unavailable)

Run all: pytest tests/ -v
Run unit-only: pytest tests/ -v -m "not integration"
Run integration: pytest tests/ -v -m integration
"""
from __future__ import annotations

import json
import os
import sys

import pytest

# Add the backend root to path for direct imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# ---------------------------------------------------------------------------
# Unit tests — no FalkorDB required
# ---------------------------------------------------------------------------

class TestPrioritizationEngine:
    """Test the deterministic scoring engine with known inputs."""

    def _factors(self, **kwargs):
        from app.core.prioritization import PriorityFactors
        defaults = dict(
            vuln_id="TEST-001",
            vuln_severity="CRITICAL",
            cvss_score=9.8,
            affected_assets=[{"criticality": "CRITICAL", "exposed": True}],
            affected_applications=[{"name": "App A"}, {"name": "App B"}],
            dependency_depth=2,
            has_exposed_asset=True,
            incomplete_evidence=False,
            missing_team=False,
            missing_assets=False,
        )
        defaults.update(kwargs)
        return PriorityFactors(**defaults)

    def test_critical_severity_contributes_40(self):
        from app.core.prioritization import compute_priority
        f = self._factors(vuln_severity="CRITICAL", affected_assets=[], affected_applications=[])
        r = compute_priority(f)
        assert r.severity_contribution == 40.0

    def test_high_severity_contributes_30(self):
        from app.core.prioritization import compute_priority
        f = self._factors(vuln_severity="HIGH", affected_assets=[], affected_applications=[])
        r = compute_priority(f)
        assert r.severity_contribution == 30.0

    def test_critical_asset_contributes_30(self):
        from app.core.prioritization import compute_priority
        f = self._factors(affected_assets=[{"criticality": "CRITICAL", "exposed": False}])
        r = compute_priority(f)
        assert r.asset_criticality_contribution == 30.0

    def test_exposed_asset_adds_bonus(self):
        from app.core.prioritization import compute_priority
        f_exposed = self._factors(has_exposed_asset=True)
        f_not = self._factors(has_exposed_asset=False)
        r_exposed = compute_priority(f_exposed)
        r_not = compute_priority(f_not)
        assert r_exposed.exposure_contribution == 10.0
        assert r_not.exposure_contribution == 0.0

    def test_incomplete_evidence_penalty(self):
        from app.core.prioritization import compute_priority
        f = self._factors(incomplete_evidence=True)
        r = compute_priority(f)
        assert r.confidence_penalty == -15.0
        assert r.priority_label == "UNCERTAIN" or r.score < 85

    def test_no_affected_assets_reduces_score(self):
        from app.core.prioritization import compute_priority
        f_assets = self._factors()
        f_no_assets = self._factors(affected_assets=[], missing_assets=True)
        r_assets = compute_priority(f_assets)
        r_no = compute_priority(f_no_assets)
        assert r_assets.score > r_no.score

    def test_full_critical_scenario_is_critical_priority(self):
        """CRITICAL vuln + CRITICAL asset + exposed → CRITICAL priority."""
        from app.core.prioritization import compute_priority
        f = self._factors()
        r = compute_priority(f)
        assert r.priority_label == "CRITICAL"
        assert r.score >= 75

    def test_low_severity_no_assets_is_low_priority(self):
        from app.core.prioritization import compute_priority
        f = self._factors(
            vuln_severity="LOW",
            cvss_score=2.0,
            affected_assets=[{"criticality": "LOW", "exposed": False}],
            affected_applications=[{"name": "App"}],
            has_exposed_asset=False,
        )
        r = compute_priority(f)
        assert r.priority_label in ("LOW", "MEDIUM")
        assert r.score < 40

    def test_score_range_never_exceeds_100(self):
        from app.core.prioritization import compute_priority
        f = self._factors()
        r = compute_priority(f)
        assert 0.0 <= r.score <= 100.0

    def test_explanation_is_not_empty(self):
        from app.core.prioritization import compute_priority
        f = self._factors()
        r = compute_priority(f)
        assert len(r.explanation) > 20

    def test_missing_team_reported_in_evidence(self):
        from app.core.prioritization import compute_priority
        f = self._factors(missing_team=True)
        r = compute_priority(f)
        assert any("team" in m.lower() for m in r.missing_evidence)

    def test_reach_score_scales_with_app_count(self):
        from app.core.prioritization import compute_priority
        f1 = self._factors(affected_applications=[{"name": "A"}])
        f5 = self._factors(
            affected_applications=[{"name": str(i)} for i in range(5)]
        )
        r1 = compute_priority(f1)
        r5 = compute_priority(f5)
        assert r5.reach_contribution > r1.reach_contribution

    def test_medium_severity_medium_asset_medium_priority(self):
        from app.core.prioritization import compute_priority
        f = self._factors(
            vuln_severity="MEDIUM",
            cvss_score=5.3,
            affected_assets=[{"criticality": "MEDIUM", "exposed": False}],
            has_exposed_asset=False,
        )
        r = compute_priority(f)
        assert r.priority_label in ("MEDIUM", "HIGH")


# ---------------------------------------------------------------------------
# Integration tests — require FalkorDB
# ---------------------------------------------------------------------------

def _db_available() -> bool:
    try:
        from app.db.connection import ping, reset_connections
        reset_connections()
        return ping()
    except Exception:
        return False


db_skip = pytest.mark.skipif(
    not _db_available(),
    reason="FalkorDB is not available — skipping integration tests",
)


@db_skip
class TestGraphSeeding:
    def setup_method(self):
        from app.db.connection import reset_connections
        reset_connections()

    def test_seed_returns_counts(self):
        from app.graph.queries import seed_graph
        counts = seed_graph(clear_first=True)
        assert counts["vulnerabilities"] == 4
        assert counts["packages"] == 10
        assert counts["assets"] == 5
        assert counts["teams"] == 4
        assert counts["applications"] == 5
        assert counts["findings"] == 4

    def test_vulnerability_exists_after_seed(self):
        from app.graph.queries import get_vulnerability_by_id, seed_graph
        seed_graph(clear_first=False)
        v = get_vulnerability_by_id("VULN-2024-001")
        assert v is not None
        assert v["title"] == "Remote Code Execution in xml-parser"
        assert v["severity"] == "CRITICAL"
        assert v["cvss_score"] == 9.8

    def test_invalid_vuln_returns_none(self):
        from app.graph.queries import get_vulnerability_by_id
        v = get_vulnerability_by_id("NONEXISTENT-9999")
        assert v is None

    def test_seed_is_idempotent(self):
        from app.graph.queries import get_all_vulnerabilities, seed_graph
        seed_graph(clear_first=False)
        seed_graph(clear_first=False)
        vulns = get_all_vulnerabilities()
        ids = [v["id"] for v in vulns]
        assert len(ids) == len(set(ids)), "Duplicate vulnerabilities after double seed"


@db_skip
class TestDependencyTraversal:
    @pytest.fixture(autouse=True)
    def seed(self):
        from app.db.connection import reset_connections
        from app.graph.queries import seed_graph
        reset_connections()
        seed_graph(clear_first=True)

    def test_direct_dependency_detected(self):
        """xml-parser is directly used by auth-middleware; trace_affected_packages should include auth-middleware."""
        from app.graph.queries import trace_affected_packages
        pkgs = trace_affected_packages("VULN-2024-001")
        names = [p["name"] for p in pkgs]
        assert "auth-middleware" in names, f"auth-middleware not found in {names}"

    def test_transitive_dependency_detected(self):
        """
        xml-parser → http-client → data-processor → report-engine.
        VULN-2024-001 affects xml-parser, so report-engine should be reachable transitively.
        """
        from app.graph.queries import trace_affected_packages
        pkgs = trace_affected_packages("VULN-2024-001")
        names = [p["name"] for p in pkgs]
        assert "http-client" in names, f"http-client not found in {names}"
        assert "data-processor" in names, f"data-processor not found in {names}"
        assert "report-engine" in names, f"report-engine not found in {names}"

    def test_direct_vulnerable_package_in_results(self):
        from app.graph.queries import trace_affected_packages
        pkgs = trace_affected_packages("VULN-2024-001")
        direct = [p for p in pkgs if p["is_direct_vulnerable"]]
        assert any(p["name"] == "xml-parser" for p in direct)

    def test_unrelated_package_not_in_results(self):
        from app.graph.queries import trace_affected_packages
        # VULN-2024-003 affects log-rotator — orm-core should NOT be included
        pkgs = trace_affected_packages("VULN-2024-003")
        names = [p["name"] for p in pkgs]
        assert "orm-core" not in names
        assert "query-builder" not in names


@db_skip
class TestAffectedApplications:
    @pytest.fixture(autouse=True)
    def seed(self):
        from app.db.connection import reset_connections
        from app.graph.queries import seed_graph
        reset_connections()
        seed_graph(clear_first=True)

    def test_multiple_apps_affected_by_xml_parser(self):
        """
        VULN-2024-001 → xml-parser.
        Payment Gateway uses auth-middleware (direct dep on xml-parser).
        User Portal uses http-client (direct dep on xml-parser) and data-processor.
        Report Generator uses report-engine (transitive 3-hop).
        """
        from app.graph.queries import trace_affected_applications
        apps = trace_affected_applications("VULN-2024-001")
        names = [a["name"] for a in apps]
        assert "Payment Gateway" in names, f"Payment Gateway not found in {names}"
        assert "User Portal" in names, f"User Portal not found in {names}"
        # Report Generator has 3-hop transitive path
        assert "Report Generator" in names, f"Report Generator not found in {names}"

    def test_analytics_service_affected_by_query_builder(self):
        """VULN-2024-002 → query-builder → orm-core → Analytics Service."""
        from app.graph.queries import trace_affected_applications
        apps = trace_affected_applications("VULN-2024-002")
        names = [a["name"] for a in apps]
        assert "Analytics Service" in names, f"Analytics Service not found in {names}"

    def test_unaffected_app_not_returned(self):
        """Internal Tools uses cache-layer→log-rotator; should not appear for query-builder vuln."""
        from app.graph.queries import trace_affected_applications
        apps = trace_affected_applications("VULN-2024-002")
        names = [a["name"] for a in apps]
        assert "Internal Tools" not in names


@db_skip
class TestAssetImpact:
    @pytest.fixture(autouse=True)
    def seed(self):
        from app.db.connection import reset_connections
        from app.graph.queries import seed_graph
        reset_connections()
        seed_graph(clear_first=True)

    def test_critical_assets_returned_first(self):
        from app.graph.queries import analyze_asset_impact
        assets = analyze_asset_impact("VULN-2024-001")
        criticalities = [a["criticality"] for a in assets]
        assert criticalities, "No assets returned"
        assert criticalities[0] in ("CRITICAL",), f"First asset is not CRITICAL: {criticalities}"

    def test_production_k8s_affected_by_xml_parser(self):
        from app.graph.queries import analyze_asset_impact
        assets = analyze_asset_impact("VULN-2024-001")
        names = [a["name"] for a in assets]
        assert "Production Kubernetes Cluster" in names

    def test_staging_only_for_internal_tools_vuln(self):
        from app.graph.queries import analyze_asset_impact
        assets = analyze_asset_impact("VULN-2024-003")
        names = [a["name"] for a in assets]
        assert "Staging Environment" in names
        assert "Production Kubernetes Cluster" not in names


@db_skip
class TestOwnershipLookup:
    @pytest.fixture(autouse=True)
    def seed(self):
        from app.db.connection import reset_connections
        from app.graph.queries import seed_graph
        reset_connections()
        seed_graph(clear_first=True)

    def test_payments_team_returned_for_vuln_001(self):
        from app.graph.queries import get_responsible_teams
        teams = get_responsible_teams("VULN-2024-001")
        names = [t["name"] for t in teams]
        assert "Payments Team" in names

    def test_missing_ownership_scenario(self):
        """Report Generator has no team — teams list for VULN-2024-001 should not error."""
        from app.graph.queries import trace_affected_applications
        apps = trace_affected_applications("VULN-2024-001")
        rg = next((a for a in apps if a["name"] == "Report Generator"), None)
        assert rg is not None
        assert rg["teams"] == []  # No team assigned


@db_skip
class TestEvidencePaths:
    @pytest.fixture(autouse=True)
    def seed(self):
        from app.db.connection import reset_connections
        from app.graph.queries import seed_graph
        reset_connections()
        seed_graph(clear_first=True)

    def test_evidence_paths_returned(self):
        from app.graph.queries import retrieve_evidence_paths
        paths = retrieve_evidence_paths("VULN-2024-001")
        assert len(paths) > 0

    def test_path_nodes_form_chain(self):
        from app.graph.queries import retrieve_evidence_paths
        paths = retrieve_evidence_paths("VULN-2024-001")
        for path in paths:
            assert len(path["path_nodes"]) >= 2


@db_skip
class TestInvestigationPersistence:
    @pytest.fixture(autouse=True)
    def seed(self):
        from app.db.connection import reset_connections
        from app.graph.queries import seed_graph
        reset_connections()
        seed_graph(clear_first=True)

    def test_create_and_retrieve_investigation(self):
        from app.graph.queries import create_investigation, get_investigation_by_id
        inv = create_investigation("VULN-2024-001", '{"priority":"HIGH"}')
        assert inv["id"].startswith("inv-")
        retrieved = get_investigation_by_id(inv["id"])
        assert retrieved is not None
        assert retrieved["vuln_id"] == "VULN-2024-001"

    def test_investigation_listed(self):
        from app.graph.queries import create_investigation, get_all_investigations
        inv = create_investigation("VULN-2024-002", '{"test":true}')
        invs = get_all_investigations()
        ids = [i["id"] for i in invs]
        assert inv["id"] in ids


@db_skip
class TestRemediationPersistence:
    @pytest.fixture(autouse=True)
    def seed(self):
        from app.db.connection import reset_connections
        from app.graph.queries import seed_graph, create_investigation
        reset_connections()
        seed_graph(clear_first=True)
        inv = create_investigation("VULN-2024-001", "{}")
        self.inv_id = inv["id"]

    def test_create_and_retrieve_remediation(self):
        from app.graph.queries import create_remediation, get_remediation_by_id
        rem = create_remediation(
            finding_id="finding-001",
            investigation_id=self.inv_id,
            action_type="upgrade_package",
            description="Upgrade xml-parser to 2.4.2",
            team_id="team-payments",
        )
        assert rem["id"].startswith("rem-")
        assert rem["status"] == "approved"
        retrieved = get_remediation_by_id(rem["id"])
        assert retrieved is not None
        assert retrieved["action_type"] == "upgrade_package"

    def test_remediation_listed(self):
        from app.graph.queries import create_remediation, get_all_remediations
        rem = create_remediation(
            finding_id="finding-001",
            investigation_id=self.inv_id,
            action_type="apply_waf_rule",
            description="Apply WAF rule to mitigate exposure",
            team_id=None,
        )
        rems = get_all_remediations()
        ids = [r["id"] for r in rems]
        assert rem["id"] in ids


@db_skip
class TestAPIEndpoints:
    @pytest.fixture(autouse=True)
    def setup(self):
        from app.db.connection import reset_connections
        from app.graph.queries import seed_graph
        reset_connections()
        seed_graph(clear_first=True)

        from fastapi.testclient import TestClient
        from app.main import app
        self.client = TestClient(app)

    def test_health_endpoint(self):
        r = self.client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["backend"] == "ok"

    def test_list_vulnerabilities(self):
        r = self.client.get("/api/vulnerabilities")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 4

    def test_get_vulnerability_by_id(self):
        r = self.client.get("/api/vulnerabilities/VULN-2024-001")
        assert r.status_code == 200
        assert r.json()["severity"] == "CRITICAL"

    def test_get_nonexistent_vulnerability(self):
        r = self.client.get("/api/vulnerabilities/NONEXISTENT")
        assert r.status_code == 404

    def test_investigate_endpoint(self):
        r = self.client.post("/api/investigate", json={"vuln_id": "VULN-2024-001"})
        assert r.status_code == 200
        data = r.json()
        assert "priority" in data
        assert "affected_applications" in data
        assert len(data["affected_applications"]) > 0

    def test_investigate_nonexistent_vuln(self):
        r = self.client.post("/api/investigate", json={"vuln_id": "FAKE-9999"})
        assert r.status_code == 404

    def test_list_investigations(self):
        self.client.post("/api/investigate", json={"vuln_id": "VULN-2024-001"})
        r = self.client.get("/api/investigations")
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_create_remediation(self):
        inv_r = self.client.post("/api/investigate", json={"vuln_id": "VULN-2024-001"})
        inv_id = inv_r.json()["investigation_id"]
        r = self.client.post("/api/remediations", json={
            "finding_id": "finding-001",
            "investigation_id": inv_id,
            "action_type": "upgrade_package",
            "description": "Upgrade xml-parser to fixed version",
            "team_id": "team-payments",
        })
        assert r.status_code == 201
        data = r.json()
        assert data["status"] == "approved"
        assert data["id"].startswith("rem-")

    def test_remediation_for_nonexistent_investigation(self):
        r = self.client.post("/api/remediations", json={
            "finding_id": "finding-001",
            "investigation_id": "inv-nonexistent",
            "action_type": "patch",
            "description": "Patch it",
        })
        assert r.status_code == 404

    def test_graph_endpoint(self):
        r = self.client.get("/api/graph/vulnerability/VULN-2024-001")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert len(data["nodes"]) > 0
