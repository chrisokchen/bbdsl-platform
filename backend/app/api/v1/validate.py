"""Real-time YAML validation over WebSocket."""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.bbdsl_service import validate_yaml

router = APIRouter()


@router.websocket("/validate")
async def ws_validate(websocket: WebSocket):
    """WebSocket endpoint for real-time BBDSL YAML validation.

    Client sends YAML text; server responds with a validation report JSON.
    Target latency: < 500ms.
    """
    await websocket.accept()
    try:
        while True:
            yaml_text = await websocket.receive_text()
            try:
                report = validate_yaml(yaml_text)
                await websocket.send_json(
                    {"status": "ok", "report": report}
                )
            except Exception as exc:
                await websocket.send_json(
                    {"status": "error", "message": str(exc)}
                )
    except WebSocketDisconnect:
        pass
