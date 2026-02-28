"""System comparison endpoint — structured diff between two bidding systems."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.bbdsl_service import diff

router = APIRouter()


class CompareRequest(BaseModel):
    """Request body for system comparison."""
    yaml_a: str
    yaml_b: str
    n_deals: int = 20
    seed: int = 42


@router.post("/diff")
async def compare_systems(body: CompareRequest):
    """Compare two BBDSL systems and return a structured diff report."""
    try:
        report = diff(
            body.yaml_a,
            body.yaml_b,
            n_deals=body.n_deals,
            seed=body.seed,
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return report
