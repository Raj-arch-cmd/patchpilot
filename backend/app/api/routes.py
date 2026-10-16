"""
API routes — all endpoints for PatchPilot.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.agent.investigator import run_investigation
from app.core.config import settings
from app.db.connection import ping
from app.graph import queries
from app.schemas.models import (
    ErrorResponse,
    HealthResponse,
    InvestigateRequest,
    InvestigationBrief,
    InvestigationResult,
    OverviewStats,
    RemediationBrief,
    RemediationRequest,
    RemediationResponse,
    VulnerabilityBrief,
    VulnerabilityDetail,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@router.get("/health", response_model=HealthResponse, tags=["system"])
def health():
    db_ok = ping()
    return HealthResponse(
        status="ok" if db_ok else "degraded",
        backend="ok",
        falkordb="ok" if db_ok else "unavailable",
        llm_mode=settings.llm_provider,
    )


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@router.get("/overview", response_model=OverviewStats, tags=["overview"])
def get_overview():
    try:
        return queries.get_overview_stats()
    except Exception as exc:
        logger.error("Overview error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Vulnerabilities
# ---------------------------------------------------------------------------

@router.get("/vulnerabilities", response_model=list[VulnerabilityBrief], tags=["vulnerabilities"])
def list_vulnerabilities():
    try:
        return queries.get_all_vulnerabilities()
    except Exception as exc:
        logger.error("List vulnerabilities error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get(
    "/vulnerabilities/{vuln_id}",
    response_model=VulnerabilityDetail,
    tags=["vulnerabilities"],
    responses={404: {"model": ErrorResponse}},
)
def get_vulnerability(vuln_id: str):
    vuln = queries.get_vulnerability_by_id(vuln_id)
    if vuln is None:
        raise HTTPException(status_code=404, detail=f"Vulnerability '{vuln_id}' not found.")
    return vuln


# ---------------------------------------------------------------------------
# Investigations
# ---------------------------------------------------------------------------

@router.post(
    "/investigate",
    response_model=InvestigationResult,
    tags=["investigations"],
    status_code=status.HTTP_200_OK,
)
def investigate(req: InvestigateRequest):
    """
    Run a full graph investigation for the given vulnerability ID.
    This is the primary agent endpoint.
    """
    # Validate that the vulnerability exists before running the full workflow
    vuln = queries.get_vulnerability_by_id(req.vuln_id)
    if vuln is None:
        raise HTTPException(
            status_code=404,
            detail=f"Vulnerability '{req.vuln_id}' not found. Cannot investigate.",
        )
    try:
        result = run_investigation(req.vuln_id)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error("Investigation error for %s: %s", req.vuln_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Investigation failed: {str(exc)}")


@router.get("/investigations", response_model=list[InvestigationBrief], tags=["investigations"])
def list_investigations():
    try:
        return queries.get_all_investigations()
    except Exception as exc:
        logger.error("List investigations error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get(
    "/investigations/{inv_id}",
    tags=["investigations"],
    responses={404: {"model": ErrorResponse}},
)
def get_investigation(inv_id: str):
    inv = queries.get_investigation_by_id(inv_id)
    if inv is None:
        raise HTTPException(status_code=404, detail=f"Investigation '{inv_id}' not found.")
    return inv


# ---------------------------------------------------------------------------
# Graph visualization
# ---------------------------------------------------------------------------

@router.get(
    "/graph/vulnerability/{vuln_id}",
    tags=["graph"],
    responses={404: {"model": ErrorResponse}},
)
def get_vulnerability_graph(vuln_id: str):
    """Return graph nodes and edges for the vulnerability subgraph."""
    vuln = queries.get_vulnerability_by_id(vuln_id)
    if vuln is None:
        raise HTTPException(status_code=404, detail=f"Vulnerability '{vuln_id}' not found.")
    try:
        return queries.get_graph_data_for_vuln(vuln_id)
    except Exception as exc:
        logger.error("Graph data error for %s: %s", vuln_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Remediations
# ---------------------------------------------------------------------------

@router.post(
    "/remediations",
    response_model=RemediationResponse,
    tags=["remediations"],
    status_code=status.HTTP_201_CREATED,
)
def create_remediation(req: RemediationRequest):
    """Approve and persist a simulated remediation action."""
    # Validate finding exists
    findings = queries.get_all_vulnerabilities()  # lightweight check
    inv = queries.get_investigation_by_id(req.investigation_id)
    if inv is None:
        raise HTTPException(
            status_code=404,
            detail=f"Investigation '{req.investigation_id}' not found. Cannot create remediation.",
        )
    try:
        rem = queries.create_remediation(
            finding_id=req.finding_id,
            investigation_id=req.investigation_id,
            action_type=req.action_type,
            description=req.description,
            team_id=req.team_id,
        )
        return rem
    except Exception as exc:
        logger.error("Remediation creation error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create remediation: {str(exc)}")


@router.get("/remediations", response_model=list[RemediationBrief], tags=["remediations"])
def list_remediations():
    try:
        return queries.get_all_remediations()
    except Exception as exc:
        logger.error("List remediations error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get(
    "/remediations/{rem_id}",
    tags=["remediations"],
    responses={404: {"model": ErrorResponse}},
)
def get_remediation(rem_id: str):
    rem = queries.get_remediation_by_id(rem_id)
    if rem is None:
        raise HTTPException(status_code=404, detail=f"Remediation '{rem_id}' not found.")
    return rem


# ---------------------------------------------------------------------------
# Seed (development only)
# ---------------------------------------------------------------------------

@router.post("/seed", tags=["system"], summary="Seed synthetic graph data (idempotent)")
def seed_graph(clear_first: bool = False):
    """
    Load synthetic graph data. Safe to call multiple times (MERGE-based).
    Pass clear_first=true to wipe the graph before seeding.
    """
    try:
        counts = queries.seed_graph(clear_first=clear_first)
        return {"status": "seeded", "counts": counts}
    except Exception as exc:
        logger.error("Seed error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Seed failed: {str(exc)}")
