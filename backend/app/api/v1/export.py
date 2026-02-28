"""Export endpoints — convert BBDSL YAML to various formats."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel

from app.services.bbdsl_service import export

router = APIRouter()

SUPPORTED_FORMATS = {"bml", "bboalert", "svg", "html", "pbn"}


class ExportRequest(BaseModel):
    """Request body for export."""
    yaml_content: str
    locale: str = "en"
    suit_symbols: bool = False
    # PBN-specific
    n_deals: int = 10
    seed: int | None = None


@router.post("/export/{fmt}")
async def export_document(fmt: str, body: ExportRequest):
    """Export BBDSL YAML to the specified format.

    Supported formats: bml, bboalert, svg, html, pbn.
    """
    if fmt not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {fmt}. Use one of {sorted(SUPPORTED_FORMATS)}.",
        )
    try:
        result = export(body.yaml_content, fmt, locale=body.locale)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    content_types = {
        "bml": "text/plain; charset=utf-8",
        "bboalert": "text/plain; charset=utf-8",
        "svg": "image/svg+xml",
        "html": "text/html; charset=utf-8",
        "pbn": "text/plain; charset=utf-8",
    }
    return Response(
        content=result,
        media_type=content_types.get(fmt, "text/plain"),
    )
