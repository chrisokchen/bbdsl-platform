"""Diff service — structural comparison of two bidding systems."""

from __future__ import annotations

from app.services.bbdsl_service import diff


def compare_yaml(yaml_a: str, yaml_b: str, **kwargs) -> dict:
    """Thin wrapper calling bbdsl_service.diff."""
    return diff(yaml_a, yaml_b, **kwargs)
