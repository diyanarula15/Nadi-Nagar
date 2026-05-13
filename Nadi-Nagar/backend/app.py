from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from simulator import CitySimulator


ROOT_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
FRONTEND_ENV = ROOT_DIR / "frontend" / ".env.local"


class RuntimeState:
    def __init__(self) -> None:
        self.simulator = CitySimulator()
        self.lock = asyncio.Lock()
        self.task: asyncio.Task[None] | None = None


state = RuntimeState()


def read_frontend_env(name: str) -> str:
    if not FRONTEND_ENV.exists():
        return ""
    for line in FRONTEND_ENV.read_text().splitlines():
        key, _, value = line.partition("=")
        if key.strip() == name:
            return value.strip().strip("\"'")
    return ""


def google_maps_api_key() -> str:
    return (
        os.environ.get("VITE_GOOGLE_MAPS_API_KEY")
        or os.environ.get("GOOGLE_MAPS_API_KEY")
        or read_frontend_env("VITE_GOOGLE_MAPS_API_KEY")
        or ""
    )


async def simulation_loop() -> None:
    while True:
        async with state.lock:
            state.simulator.tick()
        await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(_: FastAPI):
    state.task = asyncio.create_task(simulation_loop())
    try:
        yield
    finally:
        if state.task:
            state.task.cancel()
            try:
                await state.task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title="Nadi-Nagar Urban Resilience Grid",
    description="Real-time dummy sensor grid, ML inference, and dispatch APIs for the Nadi-Nagar prototype.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "service": "nadi-nagar-backend"}


@app.get("/runtime-config.js")
async def runtime_config() -> Response:
    payload = {"googleMapsApiKey": google_maps_api_key()}
    script = f"window.__NADI_CONFIG__ = {json.dumps(payload)};"
    return Response(content=script, media_type="application/javascript")


@app.get("/api/snapshot")
async def snapshot() -> dict[str, Any]:
    async with state.lock:
        return state.simulator.snapshot()


@app.get("/api/vehicles")
async def vehicles() -> list[dict[str, Any]]:
    async with state.lock:
        return state.simulator.snapshot()["vehicles"]


@app.get("/api/incidents")
async def incidents() -> list[dict[str, Any]]:
    async with state.lock:
        return state.simulator.snapshot()["incidents"]


@app.get("/api/public-board")
async def public_board() -> list[dict[str, Any]]:
    async with state.lock:
        return state.simulator.snapshot()["publicBoard"]


@app.post("/api/incidents/{incident_id}/ack")
async def acknowledge(incident_id: str) -> dict[str, Any]:
    async with state.lock:
        incident = state.simulator.acknowledge_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.post("/api/work-orders/create")
async def create_work_order(payload: dict[str, Any]) -> dict[str, Any]:
    """Create a work order by assigning a crew to an incident."""
    async with state.lock:
        result = state.simulator.dispatch_crew_to_incident(
            payload.get("incidentId"),
            payload.get("crewId"),
        )
    if not result:
        raise HTTPException(status_code=404, detail="Incident or crew not found")
    return result


@app.get("/api/work-orders")
async def get_work_orders(status: str | None = None) -> list[dict[str, Any]]:
    """Get all work orders, optionally filtered by payment status."""
    async with state.lock:
        return state.simulator.get_work_orders(status)


@app.post("/api/work-orders/{work_order_id}/verify")
async def verify_repair(work_order_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Post-repair verification: confirm the repair was successful."""
    incident_id = payload.get("incidentId")
    async with state.lock:
        result = state.simulator.verify_repair(incident_id, work_order_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Work order not found")
    return result


@app.get("/api/sla-status")
async def sla_status() -> dict[str, Any]:
    """Get SLA enforcement status: breaches and approaching timeouts."""
    async with state.lock:
        return state.simulator.get_sla_status()


@app.get("/api/crews")
async def get_crews() -> list[dict[str, Any]]:
    """Get all dispatch crews with current status."""
    async with state.lock:
        snapshot = state.simulator.snapshot()
    return snapshot.get("dispatchUnits", [])


@app.get("/api/analytics")
async def get_analytics() -> dict[str, Any]:
    """Get cost savings and incident prevention analytics."""
    async with state.lock:
        return state.simulator.get_analytics()


@app.post("/api/photos/upload")
async def upload_photo(payload: dict[str, Any]) -> dict[str, Any]:
    """Upload verification photo for incident."""
    async with state.lock:
        result = state.simulator.upload_verification_photo(
            payload.get("workOrderId"),
            payload.get("photoUrl"),
            payload.get("photoData", {}),
        )
    if not result:
        raise HTTPException(status_code=404, detail="Work order not found")
    return result


@app.get("/api/citizen/incidents")
async def get_citizen_incidents(ward: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
    """Get public incidents for citizen portal."""
    async with state.lock:
        return state.simulator.get_citizen_incidents(ward, status)


@app.post("/api/citizen/report")
async def citizen_report_issue(payload: dict[str, Any]) -> dict[str, Any]:
    """Create a citizen-reported issue."""
    async with state.lock:
        return state.simulator.citizen_report_issue(payload)


@app.websocket("/ws/stream")
async def stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            async with state.lock:
                payload = state.simulator.snapshot()
            await websocket.send_json(payload)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        return


if FRONTEND_DIST.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="frontend-assets",
    )


    @app.get("/")
    async def serve_frontend() -> FileResponse:
        return FileResponse(FRONTEND_DIST / "index.html")


    @app.get("/{_:path}")
    async def serve_frontend_route(_: str) -> FileResponse:
        return FileResponse(FRONTEND_DIST / "index.html")
