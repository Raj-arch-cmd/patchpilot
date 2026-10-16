"""
FalkorDB connection singleton.
"""
from __future__ import annotations

import logging
from typing import Optional

import falkordb

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Optional[falkordb.FalkorDB] = None
_graph: Optional[falkordb.Graph] = None


def get_client() -> falkordb.FalkorDB:
    global _client
    if _client is None:
        kwargs: dict = {
            "host": settings.falkordb_host,
            "port": settings.falkordb_port,
        }
        if settings.falkordb_password:
            kwargs["password"] = settings.falkordb_password
        logger.info(
            "Connecting to FalkorDB at %s:%s",
            settings.falkordb_host,
            settings.falkordb_port,
        )
        _client = falkordb.FalkorDB(**kwargs)
    return _client


def get_graph() -> falkordb.Graph:
    global _graph
    if _graph is None:
        _graph = get_client().select_graph(settings.falkordb_graph)
    return _graph


def ping() -> bool:
    """Return True if FalkorDB is reachable."""
    try:
        client = get_client()
        client.connection.ping()
        return True
    except Exception as exc:
        logger.warning("FalkorDB ping failed: %s", exc)
        return False


def reset_connections() -> None:
    """Force re-connection on next access (useful for tests)."""
    global _client, _graph
    _client = None
    _graph = None
