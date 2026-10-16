"""
PatchPilot Investigation Agent.

Implements a bounded tool-using workflow:
1. Retrieve vulnerability details from graph.
2. Trace affected packages.
3. Trace affected applications.
4. Analyze asset impact.
5. Get responsible teams.
6. Retrieve evidence paths.
7. Compute deterministic priority.
8. (Optional) Enrich explanation with LLM.
9. Persist investigation record.
10. Return structured result.

The LLM is an optional layer — if not configured, deterministic mode
produces a complete, honest result without AI assistance.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import settings
from app.core.prioritization import PriorityFactors, compute_priority
from app.graph import queries

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tool catalogue — each tool wraps a graph query
# ---------------------------------------------------------------------------

class GraphTools:
    """Controlled set of graph-backed tools available to the agent."""

    @staticmethod
    def get_vulnerability_details(vuln_id: str) -> dict:
        result = queries.get_vulnerability_by_id(vuln_id)
        if result is None:
            raise ValueError(f"Vulnerability '{vuln_id}' not found in graph.")
        return result

    @staticmethod
    def trace_affected_packages(vuln_id: str) -> list[dict]:
        return queries.trace_affected_packages(vuln_id)

    @staticmethod
    def trace_affected_applications(vuln_id: str) -> list[dict]:
        return queries.trace_affected_applications(vuln_id)

    @staticmethod
    def analyze_asset_impact(vuln_id: str) -> list[dict]:
        return queries.analyze_asset_impact(vuln_id)

    @staticmethod
    def get_responsible_team(vuln_id: str) -> list[dict]:
        return queries.get_responsible_teams(vuln_id)

    @staticmethod
    def retrieve_evidence_paths(vuln_id: str) -> list[dict]:
        return queries.retrieve_evidence_paths(vuln_id)

    @staticmethod
    def get_graph_data(vuln_id: str) -> dict:
        return queries.get_graph_data_for_vuln(vuln_id)


tools = GraphTools()


# ---------------------------------------------------------------------------
# LLM adapter (optional)
# ---------------------------------------------------------------------------

def _call_llm(prompt: str) -> str | None:
    """
    Call the configured LLM provider to enrich an explanation.
    Returns None if no provider is configured or the call fails.
    Never raises — the agent degrades gracefully.
    """
    provider = settings.llm_provider.lower()

    if provider == "openai" and settings.openai_api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key)
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a security analyst assistant. "
                            "Explain vulnerability investigation results in clear, concise language. "
                            "Only reference facts provided in the evidence. "
                            "Never invent relationships, exploitability claims, or credentials. "
                            "Respond in 3–5 sentences."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=300,
                temperature=0.2,
            )
            return resp.choices[0].message.content
        except Exception as exc:
            logger.warning("OpenAI call failed: %s", exc)
            return None

    if provider == "anthropic" and settings.anthropic_api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            resp = client.messages.create(
                model=settings.anthropic_model,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )
            return resp.content[0].text
        except Exception as exc:
            logger.warning("Anthropic call failed: %s", exc)
            return None

    return None  # deterministic mode


# ---------------------------------------------------------------------------
# Main investigation workflow
# ---------------------------------------------------------------------------

def run_investigation(vuln_id: str) -> dict[str, Any]:
    """
    Execute the full graph-based investigation workflow for a vulnerability.
    Returns a structured result dict.
    """
    logger.info("Starting investigation for vuln_id=%s", vuln_id)

    # Step 1: Retrieve vulnerability
    vuln = tools.get_vulnerability_details(vuln_id)

    # Step 2: Trace affected packages
    packages = tools.trace_affected_packages(vuln_id)

    # Step 3: Trace affected applications
    applications = tools.trace_affected_applications(vuln_id)

    # Step 4: Asset impact
    assets = tools.analyze_asset_impact(vuln_id)

    # Step 5: Responsible teams
    teams = tools.get_responsible_team(vuln_id)

    # Step 6: Evidence paths
    evidence_paths = tools.retrieve_evidence_paths(vuln_id)

    # Step 7: Graph visualization data
    graph_data = tools.get_graph_data(vuln_id)

    # Step 8: Determine missing evidence flags
    missing_team = any(
        not app.get("teams") for app in applications
    )
    missing_assets_flag = any(
        not app.get("asset_ids") for app in applications
    )
    has_exposed = any(a.get("exposed") for a in assets)

    factors = PriorityFactors(
        vuln_id=vuln_id,
        vuln_severity=vuln.get("severity", "UNKNOWN"),
        cvss_score=float(vuln.get("cvss_score") or 0.0),
        affected_assets=assets,
        affected_applications=applications,
        dependency_depth=max((p.get("hops", 0) for p in evidence_paths), default=0),
        has_exposed_asset=has_exposed,
        incomplete_evidence=bool(vuln.get("incomplete_evidence")),
        missing_team=missing_team,
        missing_assets=missing_assets_flag,
    )

    priority = compute_priority(factors)

    # Step 9: Optional LLM enrichment
    llm_summary: str | None = None
    llm_used = False

    if settings.llm_provider.lower() != "deterministic":
        prompt = (
            f"Vulnerability: {vuln['title']} (ID: {vuln_id}, CVSS: {vuln.get('cvss_score')})\n"
            f"Description: {vuln.get('description')}\n"
            f"Affected applications: {[a['name'] for a in applications]}\n"
            f"Affected assets: {[a['name'] + ' [' + a['criticality'] + ']' for a in assets]}\n"
            f"Priority: {priority.priority_label} (score {priority.score}/100)\n"
            f"Missing evidence: {priority.missing_evidence}\n\n"
            "Provide a concise security analyst summary of this investigation result."
        )
        llm_summary = _call_llm(prompt)
        llm_used = llm_summary is not None

    # Step 10: Assemble result
    result = {
        "vuln_id": vuln_id,
        "vulnerability": vuln,
        "affected_packages": packages,
        "affected_applications": applications,
        "affected_assets": assets,
        "responsible_teams": teams,
        "evidence_paths": evidence_paths,
        "graph_data": graph_data,
        "priority": {
            "score": priority.score,
            "label": priority.priority_label,
            "severity_contribution": priority.severity_contribution,
            "asset_criticality_contribution": priority.asset_criticality_contribution,
            "reach_contribution": priority.reach_contribution,
            "exposure_contribution": priority.exposure_contribution,
            "confidence_penalty": priority.confidence_penalty,
            "top_asset_criticality": priority.top_asset_criticality,
            "affected_application_count": priority.affected_application_count,
            "affected_asset_count": priority.affected_asset_count,
        },
        "evidence_complete": priority.evidence_complete,
        "missing_evidence": priority.missing_evidence,
        "explanation": priority.explanation,
        "recommended_action": priority.recommended_action,
        "factors_detail": priority.factors_detail,
        "llm_summary": llm_summary,
        "llm_used": llm_used,
        "mode": settings.llm_provider,
    }

    # Step 11: Persist investigation
    inv = queries.create_investigation(vuln_id, json.dumps({
        "priority_label": priority.priority_label,
        "score": priority.score,
        "explanation": priority.explanation,
    }))
    result["investigation_id"] = inv["id"]
    result["investigation_created_at"] = inv["created_at"]

    logger.info(
        "Investigation complete: vuln=%s priority=%s score=%.1f",
        vuln_id, priority.priority_label, priority.score,
    )
    return result
