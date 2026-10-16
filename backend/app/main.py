"""
PatchPilot FastAPI Application Entry Point.
"""
from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.db.connection import ping
from app.graph.queries import seed_graph

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: verify DB and auto-seed if empty."""
    logger.info("PatchPilot backend starting…")
    if not ping():
        logger.warning(
            "FalkorDB is NOT reachable at %s:%s — some features will be unavailable.",
            settings.falkordb_host,
            settings.falkordb_port,
        )
    else:
        logger.info("FalkorDB connection OK.")
        # Auto-seed if graph is empty
        try:
            from app.graph.queries import get_all_vulnerabilities
            vulns = get_all_vulnerabilities()
            if not vulns:
                logger.info("Graph is empty — seeding synthetic data…")
                counts = seed_graph(clear_first=False)
                logger.info("Seed complete: %s", counts)
            else:
                logger.info("Graph already has %d vulnerabilities — skipping auto-seed.", len(vulns))
        except Exception as exc:
            logger.error("Auto-seed failed: %s", exc)
    yield
    logger.info("PatchPilot backend shutting down.")


app = FastAPI(
    title="PatchPilot API",
    description=(
        "Graph-Powered Vulnerability Triage and Remediation Agent. "
        "Uses FalkorDB for multi-hop dependency traversal and evidence-backed prioritization."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(router, prefix="/api")


@app.get("/", tags=["system"])
def root():
    return {
        "product": "PatchPilot",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
