from __future__ import annotations

import math
import random
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any

from ml_models import NadiNagarInferenceEngine, haversine_m


RoutePoint = tuple[float, float]


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()


def _distance_to_effect(distance_m: float, radius_m: float) -> float:
    return math.exp(-((distance_m / radius_m) ** 2))


def _bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    delta_lon = math.radians(lon2 - lon1)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    y = math.sin(delta_lon) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lon)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


ROUTES: list[dict[str, Any]] = [
    {
        "id": "blr-blue",
        "name": "Majestic - Koramangala Loop",
        "color": "#2563eb",
        "points": [
            (12.9767, 77.5713),
            (12.9716, 77.5946),
            (12.9698, 77.6205),
            (12.9592, 77.6413),
            (12.9352, 77.6245),
            (12.9249, 77.6509),
            (12.9332, 77.6176),
            (12.9580, 77.5941),
            (12.9767, 77.5713),
        ],
    },
    {
        "id": "blr-green",
        "name": "Hebbal - Whitefield Corridor",
        "color": "#059669",
        "points": [
            (13.0358, 77.5970),
            (13.0184, 77.6352),
            (12.9941, 77.6612),
            (12.9798, 77.7001),
            (12.9698, 77.7499),
            (12.9561, 77.7342),
            (12.9730, 77.6817),
            (13.0184, 77.6352),
            (13.0358, 77.5970),
        ],
    },
    {
        "id": "blr-amber",
        "name": "Yeshwanthpur - Electronics City",
        "color": "#d97706",
        "points": [
            (13.0250, 77.5340),
            (13.0031, 77.5502),
            (12.9767, 77.5713),
            (12.9492, 77.5857),
            (12.9159, 77.6101),
            (12.8891, 77.6396),
            (12.8499, 77.6627),
            (12.8891, 77.6396),
            (12.9492, 77.5857),
            (13.0250, 77.5340),
        ],
    },
    {
        "id": "blr-rose",
        "name": "Kengeri - Indiranagar Trunk",
        "color": "#e11d48",
        "points": [
            (12.9177, 77.4838),
            (12.9299, 77.5459),
            (12.9446, 77.5727),
            (12.9716, 77.5946),
            (12.9784, 77.6408),
            (12.9719, 77.6412),
            (12.9543, 77.6481),
            (12.9716, 77.5946),
            (12.9177, 77.4838),
        ],
    },
    {
        "id": "blr-purple",
        "name": "Banashankari - KR Puram Arc",
        "color": "#7c3aed",
        "points": [
            (12.9255, 77.5468),
            (12.9446, 77.5727),
            (12.9716, 77.5946),
            (12.9907, 77.6501),
            (13.0076, 77.6956),
            (12.9960, 77.6884),
            (12.9784, 77.6408),
            (12.9255, 77.5468),
        ],
    },
]


HOTSPOTS: list[dict[str, Any]] = [
    {
        "id": "hs-underpass-sector4",
        "kind": "flood_risk",
        "title": "Sector 4 Underpass",
        "ward": "Sector 4 Underpass",
        "lat": 12.9352,
        "lon": 77.6245,
        "radius_m": 900,
        "road_dip": 2.2,
        "moisture": 0.62,
        "acoustic": 0.18,
        "traffic": 0.24,
    },
    {
        "id": "hs-koramangala-road",
        "kind": "road_stress",
        "title": "Koramangala 80ft Road",
        "ward": "Koramangala 80ft Road",
        "lat": 12.9249,
        "lon": 77.6509,
        "radius_m": 640,
        "road_dip": 5.1,
        "moisture": 0.24,
        "acoustic": 0.1,
        "traffic": 0.18,
    },
    {
        "id": "hs-bellandur-pipe",
        "kind": "pipe_leak",
        "title": "Outer Ring Road, Bellandur",
        "ward": "Bellandur ORR",
        "lat": 12.9561,
        "lon": 77.7342,
        "radius_m": 760,
        "road_dip": 1.1,
        "moisture": 0.46,
        "acoustic": 0.92,
        "traffic": 0.22,
    },
    {
        "id": "hs-kr-market",
        "kind": "traffic_entropy",
        "title": "KR Market Junction",
        "ward": "KR Market",
        "lat": 12.9592,
        "lon": 77.5748,
        "radius_m": 850,
        "road_dip": 0.8,
        "moisture": 0.18,
        "acoustic": 0.1,
        "traffic": 0.78,
    },
    {
        "id": "hs-hebbal-drain",
        "kind": "flood_risk",
        "title": "Hebbal Storm Drain",
        "ward": "Hebbal",
        "lat": 13.0358,
        "lon": 77.5970,
        "radius_m": 880,
        "road_dip": 0.9,
        "moisture": 0.5,
        "acoustic": 0.72,
        "traffic": 0.16,
    },
]


PIPE_SENSORS: list[dict[str, Any]] = [
    {"sensorId": "PIPE-041", "lat": 12.9350, "lon": 77.6262, "ward": "Sector 4 Underpass", "line": "Storm Drain A"},
    {"sensorId": "PIPE-117", "lat": 12.9563, "lon": 77.7330, "ward": "Bellandur ORR", "line": "Water Main 12"},
    {"sensorId": "PIPE-203", "lat": 13.0348, "lon": 77.5962, "ward": "Hebbal", "line": "Storm Drain North"},
    {"sensorId": "PIPE-308", "lat": 12.9240, "lon": 77.6494, "ward": "Koramangala 80ft Road", "line": "Sewer Relief 5"},
    {"sensorId": "PIPE-512", "lat": 12.9592, "lon": 77.5757, "ward": "KR Market", "line": "Old City Main"},
]


CREWS: list[dict[str, Any]] = [
    {"unitId": "RRU-Alpha", "name": "Rapid Response Unit Alpha", "lat": 12.9716, "lon": 77.5946, "skill": "flood response"},
    {"unitId": "ENG-Bravo", "name": "Structural Eng Team B", "lat": 12.9299, "lon": 77.5459, "skill": "road + retaining wall"},
    {"unitId": "PIPE-Charlie", "name": "Acoustic Pipe Crew C", "lat": 12.9798, "lon": 77.7001, "skill": "water main repair"},
]


WEATHER_CELLS: list[dict[str, Any]] = [
    {
        "id": "wx-west-monsoon",
        "name": "West Monsoon Band",
        "lat": 12.93,
        "lon": 77.50,
        "radius_m": 6800,
        "intensity": 0.48,
        "speedKmph": 24,
        "heading": 78,
    },
    {
        "id": "wx-hebbal-cell",
        "name": "Hebbal Convective Cell",
        "lat": 13.02,
        "lon": 77.61,
        "radius_m": 5200,
        "intensity": 0.68,
        "speedKmph": 18,
        "heading": 122,
    },
    {
        "id": "wx-orr-squall",
        "name": "ORR Squall Line",
        "lat": 12.96,
        "lon": 77.71,
        "radius_m": 7400,
        "intensity": 0.42,
        "speedKmph": 16,
        "heading": 250,
    },
]


CAMERA_JUNCTIONS: list[dict[str, Any]] = [
    {"id": "CAM-KRM-01", "name": "KR Market", "lat": 12.9592, "lon": 77.5748},
    {"id": "CAM-SILK-02", "name": "Silk Board", "lat": 12.9177, "lon": 77.6238},
    {"id": "CAM-HEB-03", "name": "Hebbal Flyover", "lat": 13.0358, "lon": 77.5970},
    {"id": "CAM-ORR-04", "name": "Bellandur ORR", "lat": 12.9561, "lon": 77.7342},
    {"id": "CAM-MG-05", "name": "MG Road", "lat": 12.9757, "lon": 77.6068},
    {"id": "CAM-EC-06", "name": "Electronics City Toll", "lat": 12.8499, "lon": 77.6627},
]


class CitySimulator:
    def __init__(self) -> None:
        self.random = random.Random(20260512)
        self.engine = NadiNagarInferenceEngine()
        self.started_at = datetime.now(timezone.utc)
        self.sim_time = self.started_at
        self.tick_count = 0
        self.routes = self._prepare_routes()
        self.weather_cells = deepcopy(WEATHER_CELLS)
        self.vehicles = self._seed_vehicles()
        self.pipe_state = deepcopy(PIPE_SENSORS)
        self.crews = self._seed_crews()
        self.incidents: dict[str, dict[str, Any]] = {}
        self.last_snapshot: dict[str, Any] | None = None
        self._seed_public_incidents()

    def tick(self) -> dict[str, Any]:
        self.tick_count += 1
        self.sim_time += timedelta(minutes=2)
        weather_cells = self._update_weather_cells()
        city_context = self._city_context(weather_cells)
        flood_zones = self._predict_flood_zones(city_context, weather_cells)
        traffic_zones = self._predict_traffic_zones(city_context, flood_zones)
        vehicle_samples = self._update_vehicles(city_context, flood_zones, traffic_zones)
        pipe_samples = self._update_pipes(city_context, flood_zones)
        inference = self.engine.infer(vehicle_samples, pipe_samples, city_context)
        self._merge_incidents(inference["candidateIncidents"] + self._zone_incidents(flood_zones, traffic_zones))
        self._update_dispatch()
        self.last_snapshot = self._snapshot(vehicle_samples, pipe_samples, inference, city_context, weather_cells, flood_zones, traffic_zones)
        return deepcopy(self.last_snapshot)

    def snapshot(self) -> dict[str, Any]:
        if self.last_snapshot is None:
            return self.tick()
        return deepcopy(self.last_snapshot)

    def acknowledge_incident(self, incident_id: str) -> dict[str, Any] | None:
        incident = self.incidents.get(incident_id)
        if not incident:
            return None
        incident["operatorAck"] = True
        incident["status"] = "Acknowledged"
        incident["updatedAt"] = _iso(self.sim_time)
        return deepcopy(incident)

    def dispatch_crew_to_incident(self, incident_id: str, crew_id: str) -> dict[str, Any] | None:
        """Manually assign a crew to an incident with work order."""
        incident = self.incidents.get(incident_id)
        crew = next((c for c in self.crews if c["unitId"] == crew_id), None)
        if not incident or not crew:
            return None
        
        # Create work order
        work_order = {
            "workOrderId": f"WO-{incident_id[:20]}-{crew_id}",
            "incidentId": incident_id,
            "crewId": crew_id,
            "createdAt": _iso(self.sim_time),
            "priority": {"critical": 1, "high": 2, "moderate": 3, "nominal": 4}.get(incident.get("severity", "moderate"), 5),
            "estimatedHours": 2 if incident.get("severity") == "critical" else 4,
            "paymentStatus": "pending_dispatch",  # pending_dispatch -> in_progress -> pending_verification -> released
        }
        
        crew["targetIncidentId"] = incident_id
        crew["workOrderId"] = work_order["workOrderId"]
        crew["status"] = "en-route"
        incident["workOrderId"] = work_order["workOrderId"]
        incident["status"] = "Crew Dispatched"
        incident["updatedAt"] = _iso(self.sim_time)
        
        return {"workOrder": work_order, "incident": deepcopy(incident), "crew": deepcopy(crew)}

    def verify_repair(self, incident_id: str, work_order_id: str, verification_data: dict[str, Any]) -> dict[str, Any] | None:
        """Post-repair verification: check if repair was successful."""
        incident = self.incidents.get(incident_id)
        if not incident or incident.get("workOrderId") != work_order_id:
            return None
        
        # Mark as repaired with confidence
        repair_confidence = verification_data.get("confidence", 0.85)
        incident["status"] = "Repaired" if repair_confidence >= 0.78 else "Needs Reinspection"
        incident["verifiedAt"] = _iso(self.sim_time)
        incident["verificationData"] = {
            "confidence": repair_confidence,
            "photoUrl": verification_data.get("photoUrl"),
            "notes": verification_data.get("notes", ""),
        }
        incident["updatedAt"] = _iso(self.sim_time)
        
        # Update crew's work order payment status
        crew = next((c for c in self.crews if c.get("workOrderId") == work_order_id), None)
        if crew:
            crew["status"] = "available"
            crew["targetIncidentId"] = None
            crew["workOrderId"] = None
        
        return deepcopy(incident)

    def get_work_orders(self, status: str | None = None) -> list[dict[str, Any]]:
        """Retrieve all work orders, optionally filtered by status."""
        work_orders = []
        for incident in self.incidents.values():
            if "workOrderId" in incident:
                crew = next((c for c in self.crews if c.get("workOrderId") == incident["workOrderId"]), None)
                if crew:
                    work_order = {
                        "workOrderId": incident["workOrderId"],
                        "incidentId": incident["id"],
                        "crewId": crew["unitId"],
                        "crewName": crew["name"],
                        "incidentTitle": incident.get("title"),
                        "ward": incident.get("ward"),
                        "createdAt": incident.get("createdAt"),
                        "status": incident.get("status"),
                        "paymentStatus": "released" if incident.get("status") == "Repaired" else "pending_dispatch" if crew.get("status") == "available" else "in_progress",
                        "eta": crew.get("etaMinutes"),
                        "lat": crew.get("lat"),
                        "lon": crew.get("lon"),
                    }
                    if status is None or work_order["paymentStatus"] == status:
                        work_orders.append(work_order)
        return work_orders

    def get_sla_status(self) -> dict[str, Any]:
        """Get SLA enforcement status and breaches."""
        breaches = []
        approaching = []
        for incident in self.incidents.values():
            if incident.get("status") in {"Verified", "Closed", "Repaired"}:
                continue
            created = datetime.fromisoformat(incident["createdAt"])
            age_hours = (self.sim_time - created).total_seconds() / 3600
            sla_hours = incident.get("slaHours", 48)
            
            if age_hours >= sla_hours:
                breaches.append({
                    "incidentId": incident["id"],
                    "title": incident.get("title"),
                    "ward": incident.get("ward"),
                    "hoursOverdue": round(age_hours - sla_hours, 1),
                    "status": incident.get("status"),
                })
            elif age_hours >= sla_hours * 0.72:  # 72% of SLA = approaching
                approaching.append({
                    "incidentId": incident["id"],
                    "title": incident.get("title"),
                    "ward": incident.get("ward"),
                    "hoursRemaining": round(sla_hours - age_hours, 1),
                    "status": incident.get("status"),
                })
        
        return {
            "breaches": breaches,
            "approaching": approaching,
            "totalBreaches": len(breaches),
            "totalApproaching": len(approaching),
            "timestamp": _iso(self.sim_time),
        }

    def get_analytics(self) -> dict[str, Any]:
        """Get cost savings and incident prevention analytics."""
        repaired = [incident for incident in self.incidents.values() if incident.get("status") == "Repaired"]
        prevented_crises = [incident for incident in self.incidents.values() if incident.get("status") in {"Crew Dispatched", "On Site"}]
        
        # Cost calculations
        emergency_repair_cost = 1000000  # ₹10 lakhs per emergency
        preventive_patch_cost = 150000   # ₹1.5 lakhs per preventive patch
        flood_damage_cost = 225000000    # ₹2.25 crores per major flood
        
        repairs_count = len(repaired)
        prevented_count = len(prevented_crises)
        
        # Estimate savings
        estimated_emergency_repairs_prevented = prevented_count
        estimated_flood_events_prevented = max(0, prevented_count // 5)  # 1 major flood per 5 incidents
        
        total_savings = (
            estimated_emergency_repairs_prevented * emergency_repair_cost +
            estimated_flood_events_prevented * flood_damage_cost
        )
        total_spent = repairs_count * preventive_patch_cost
        net_savings = total_savings - total_spent
        
        # Incident statistics
        by_kind = {}
        for incident in self.incidents.values():
            kind = incident.get("kind", "unknown")
            by_kind[kind] = by_kind.get(kind, 0) + 1
        
        # SLA compliance
        breaches_data = self.get_sla_status()
        sla_breach_rate = len(breaches_data["breaches"]) / max(1, len(self.incidents)) if self.incidents else 0
        
        return {
            "costSavings": {
                "estimatedEmergencyRepairsPrevented": estimated_emergency_repairs_prevented,
                "estimatedFloodEventsPrevented": estimated_flood_events_prevented,
                "costPerEmergencyRepair": emergency_repair_cost,
                "costPerFlooding": flood_damage_cost,
                "totalSpentOnPrevention": total_spent,
                "totalSavings": total_savings,
                "netSavings": net_savings,
                "currencySavings": f"₹{net_savings / 10000000:.1f} Cr",
            },
            "incidentsRepaired": repairs_count,
            "incidentsPrevented": prevented_count,
            "incidentsByType": by_kind,
            "slaComplianceRate": round((1 - sla_breach_rate) * 100, 1),
            "slaBreaches": len(breaches_data["breaches"]),
            "averageRepairTime": "4.2 hours",
            "timestamp": _iso(self.sim_time),
        }

    def upload_verification_photo(self, work_order_id: str, photo_url: str, photo_data: dict[str, Any]) -> dict[str, Any] | None:
        """Store verification photo metadata."""
        for incident in self.incidents.values():
            if incident.get("workOrderId") == work_order_id:
                if "photos" not in incident:
                    incident["photos"] = []
                incident["photos"].append({
                    "url": photo_url,
                    "timestamp": _iso(self.sim_time),
                    "type": photo_data.get("type", "verification"),
                    "metadata": photo_data.get("metadata", {}),
                })
                return deepcopy(incident)
        return None

    def get_citizen_incidents(self, ward: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        """Get incidents visible to citizens (public incidents only)."""
        incidents = []
        for incident in self.incidents.values():
            # Only show incidents that have been verified/acknowledged (public visibility)
            if incident.get("status") in {"Detected", "Cross Validated", "Crew Dispatched", "On Site", "Repaired"}:
                if ward and incident.get("ward") != ward:
                    continue
                if status and incident.get("status") != status:
                    continue
                incidents.append(self._incident_for_client(incident))
        return sorted(incidents, key=lambda x: x["score"], reverse=True)

    def citizen_report_issue(self, report: dict[str, Any]) -> dict[str, Any]:
        """Create a citizen-reported incident."""
        incident_id = f"citizen-report-{self.tick_count}"
        now = _iso(self.sim_time)
        incident = {
            "id": incident_id,
            "kind": "citizen_report",
            "title": report.get("title", "Citizen Report"),
            "description": report.get("description", ""),
            "lat": report.get("lat"),
            "lon": report.get("lon"),
            "ward": report.get("ward", "Unknown"),
            "severity": "moderate",
            "confidence": 0.65,
            "score": 0.65,
            "source": "citizen-app",
            "createdAt": now,
            "updatedAt": now,
            "status": "Reported",
            "operatorAck": False,
            "slaHours": 48,
            "evidence": [report.get("photoUrl", "user uploaded photo")],
            "reporterEmail": report.get("email"),
            "reporterPhone": report.get("phone"),
        }
        self.incidents[incident_id] = incident
        return deepcopy(incident)

    def _prepare_routes(self) -> dict[str, dict[str, Any]]:
        prepared = {}
        for route in ROUTES:
            points: list[RoutePoint] = route["points"]
            segments = []
            total_km = 0.0
            for start, end in zip(points, points[1:]):
                km = haversine_m(start[0], start[1], end[0], end[1]) / 1000
                segments.append({"start": start, "end": end, "km": km, "at": total_km})
                total_km += km
            prepared[route["id"]] = {**route, "segments": segments, "totalKm": total_km}
        return prepared

    def _seed_vehicles(self) -> list[dict[str, Any]]:
        route_ids = list(self.routes.keys())
        vehicle_types = [
            "bus",
            "garbage-truck",
            "water-tanker",
            "bus",
            "bus",
            "inspection-van",
            "garbage-truck",
            "water-tanker",
            "bus",
            "storm-drain-van",
            "bus",
            "garbage-truck",
            "water-tanker",
            "inspection-van",
        ]
        vehicles = []
        for idx in range(14):
            route_id = route_ids[idx % len(route_ids)]
            route = self.routes[route_id]
            vehicles.append(
                {
                    "vehicleId": f"NN-{idx + 1:03d}",
                    "callSign": f"Edge Fleet {idx + 1}",
                    "type": vehicle_types[idx],
                    "routeId": route_id,
                    "routeName": route["name"],
                    "distanceKm": route["totalKm"] * (idx / 8),
                    "speedKmph": self.random.uniform(22, 38),
                    "health": self.random.uniform(0.94, 0.995),
                    "battery": self.random.uniform(0.62, 0.98),
                    "trail": [],
                    "lastSeen": _iso(self.sim_time),
                    "status": "edge-processing",
                }
            )
        return vehicles

    def _seed_crews(self) -> list[dict[str, Any]]:
        crews = deepcopy(CREWS)
        for crew in crews:
            crew.update({"status": "available", "targetIncidentId": None, "etaMinutes": None, "progress": 0.0})
        return crews

    def _seed_public_incidents(self) -> None:
        seeded = [
            {
                "kind": "road_stress",
                "title": "Retaining Wall Stress",
                "description": "Legacy ticket carried into the demo clock for transparency SLA.",
                "lat": 12.9907,
                "lon": 77.6501,
                "ward": "Indiranagar Flyover",
                "severity": "high",
                "confidence": 0.91,
                "score": 0.77,
                "source": "historic-scan",
                "evidence": ["before/after verification pending"],
                "hoursAgo": 37,
            },
            {
                "kind": "pipe_leak",
                "title": "Public SLA Breach: Pipe Leak",
                "description": "Aged demo incident to show the red public transparency state.",
                "lat": 12.9177,
                "lon": 77.4838,
                "ward": "Kengeri Main",
                "severity": "critical",
                "confidence": 0.94,
                "score": 0.88,
                "source": "historic-pipe",
                "evidence": ["48 hour SLA exceeded"],
                "hoursAgo": 53,
            },
        ]
        for item in seeded:
            created = self.sim_time - timedelta(hours=item.pop("hoursAgo"))
            incident_id = f"seed-{item['kind']}-{item['ward'].lower().replace(' ', '-')}"
            self.incidents[incident_id] = {
                "id": incident_id,
                **item,
                "status": "Crew Dispatched" if item["severity"] == "critical" else "Cross Validated",
                "operatorAck": False,
                "createdAt": _iso(created),
                "updatedAt": _iso(created + timedelta(minutes=32)),
                "lastSeenTick": self.tick_count,
                "slaHours": 48,
            }

    def _update_weather_cells(self) -> list[dict[str, Any]]:
        updated = []
        for idx, cell in enumerate(self.weather_cells):
            heading = math.radians(cell["heading"] + math.sin(self.tick_count / 11 + idx) * 9)
            distance_km = cell["speedKmph"] / 30
            cell["lat"] += math.cos(heading) * distance_km / 111
            cell["lon"] += math.sin(heading) * distance_km / (111 * math.cos(math.radians(max(1, cell["lat"]))))
            if cell["lon"] > 77.79:
                cell["lon"] = 77.47
            if cell["lon"] < 77.46:
                cell["lon"] = 77.78
            if cell["lat"] > 13.07:
                cell["lat"] = 12.85
            if cell["lat"] < 12.83:
                cell["lat"] = 13.06

            pulse = math.sin(self.tick_count / (7 + idx * 2) + idx * 1.7)
            burst = 0.32 if (self.tick_count + idx * 13) % 62 in range(18, 31) else 0.0
            cell["intensity"] = round(_clamp(cell["intensity"] * 0.82 + (0.46 + pulse * 0.26 + burst) * 0.18, 0.08, 0.98), 3)
            cell["rainfall_mm_hr"] = round(8 + cell["intensity"] * 74, 1)
            cell["trend"] = "intensifying" if pulse > 0.22 or burst else "weakening" if pulse < -0.42 else "tracking"
            updated.append(
                {
                    **cell,
                    "lat": round(cell["lat"], 6),
                    "lon": round(cell["lon"], 6),
                    "radius_m": round(cell["radius_m"]),
                }
            )
        return updated

    def _city_context(self, weather_cells: list[dict[str, Any]]) -> dict[str, float]:
        rain_samples = [self._rain_at(hotspot["lat"], hotspot["lon"], weather_cells) for hotspot in HOTSPOTS]
        rainfall = max(0.0, sum(rain_samples) / len(rain_samples))
        rainfall += 4 * (0.5 + 0.5 * math.sin(self.tick_count / 17))
        drain_level = 18 + rainfall * 1.05 + 11 * math.sin(self.tick_count / 13)
        blockage = _clamp(0.27 + 0.18 * math.sin(self.tick_count / 16) + self._hotspot_city_signal("acoustic") * 0.34 + rainfall / 210)
        surface_moisture = _clamp(0.16 + rainfall / 88 + self._hotspot_city_signal("moisture") * 0.25)
        event_context = 1.0 if 18 <= self.tick_count % 70 <= 28 else 0.0
        return {
            "rainfall_mm_hr": round(rainfall, 2),
            "drain_level_cm": round(drain_level, 2),
            "blockage_score": round(blockage, 3),
            "upstream_velocity": round(_clamp(0.25 + rainfall / 95 + blockage * 0.25), 3),
            "surface_moisture": round(surface_moisture, 3),
            "crowd_context": event_context,
        }

    def _rain_at(self, lat: float, lon: float, weather_cells: list[dict[str, Any]]) -> float:
        total = 0.0
        for cell in weather_cells:
            distance = haversine_m(lat, lon, cell["lat"], cell["lon"])
            total += cell["rainfall_mm_hr"] * _distance_to_effect(distance, cell["radius_m"])
        return total

    def _predict_flood_zones(self, city_context: dict[str, float], weather_cells: list[dict[str, Any]]) -> list[dict[str, Any]]:
        zones = []
        for hotspot in HOTSPOTS:
            if hotspot["kind"] != "flood_risk" and hotspot["moisture"] < 0.42:
                continue
            local_rain = self._rain_at(hotspot["lat"], hotspot["lon"], weather_cells)
            drainage_debt = hotspot["moisture"] * 0.38 + hotspot["acoustic"] * 0.22 + city_context["blockage_score"] * 0.28
            pulse = 0.04 * math.sin(self.tick_count / 4 + hotspot["lat"] * 3)
            score = _clamp(local_rain / 105 + city_context["drain_level_cm"] / 210 + drainage_debt * 0.78 - 0.28 + pulse)
            if score < 0.18:
                continue
            water_depth = max(0.0, (score - 0.32) * 58 + local_rain * 0.18)
            eta = max(0, round((1 - score) * 54 - local_rain / 4))
            trend = "rising" if local_rain > city_context["rainfall_mm_hr"] * 0.9 or score > 0.62 else "watch"
            zones.append(
                {
                    "id": f"flood-{hotspot['id']}",
                    "name": hotspot["title"],
                    "ward": hotspot["ward"],
                    "lat": round(hotspot["lat"], 6),
                    "lon": round(hotspot["lon"], 6),
                    "radius_m": round(hotspot["radius_m"] * (0.9 + score * 0.55)),
                    "risk": round(score, 3),
                    "predictedWaterCm": round(water_depth, 1),
                    "rainfallMmHr": round(local_rain, 1),
                    "etaMinutes": eta,
                    "trend": trend,
                    "cause": "rain + blocked drain" if city_context["blockage_score"] > 0.58 else "rainfall accumulation",
                }
            )
        return sorted(zones, key=lambda item: item["risk"], reverse=True)

    def _predict_traffic_zones(self, city_context: dict[str, float], flood_zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
        zones = []
        for junction in CAMERA_JUNCTIONS:
            effects = self._effects_at(junction["lat"], junction["lon"])
            nearest_flood = self._nearest_zone(junction["lat"], junction["lon"], flood_zones)
            flood_pressure = 0.0
            if nearest_flood:
                flood_pressure = nearest_flood["risk"] * _distance_to_effect(
                    haversine_m(junction["lat"], junction["lon"], nearest_flood["lat"], nearest_flood["lon"]),
                    nearest_flood["radius_m"] * 1.4,
                )
            random_wave = 0.11 * (0.5 + 0.5 * math.sin(self.tick_count / 5 + len(junction["id"])))
            congestion = _clamp(effects["traffic"] * 0.72 + flood_pressure * 0.42 + city_context["rainfall_mm_hr"] / 135 + city_context["crowd_context"] * 0.18 + random_wave)
            if congestion < 0.2:
                continue
            zones.append(
                {
                    "id": f"traffic-{junction['id']}",
                    "name": junction["name"],
                    "lat": round(junction["lat"], 6),
                    "lon": round(junction["lon"], 6),
                    "radius_m": round(520 + congestion * 1250),
                    "congestion": round(congestion, 3),
                    "predictedSpeedKmph": round(max(6, 38 - congestion * 31), 1),
                    "jamEtaMinutes": max(0, round((1 - congestion) * 34)),
                    "jamLengthKm": round(0.4 + congestion * 2.8, 2),
                    "vehicleCount": round(38 + congestion * 220),
                    "reason": "flood diversion" if flood_pressure > 0.22 else "rain slowdown" if city_context["rainfall_mm_hr"] > 32 else "lane entropy",
                }
            )
        return sorted(zones, key=lambda item: item["congestion"], reverse=True)

    def _nearest_zone(self, lat: float, lon: float, zones: list[dict[str, Any]]) -> dict[str, Any] | None:
        if not zones:
            return None
        return min(zones, key=lambda item: haversine_m(lat, lon, item["lat"], item["lon"]))

    def _zone_incidents(self, flood_zones: list[dict[str, Any]], traffic_zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
        incidents = []
        for zone in flood_zones:
            if zone["risk"] < 0.62:
                continue
            incidents.append(
                {
                    "kind": "flood_risk",
                    "title": f"Predicted Flood: {zone['name']}",
                    "description": f"Rain radar and drain levels predict {zone['predictedWaterCm']:.1f} cm waterlogging.",
                    "lat": zone["lat"],
                    "lon": zone["lon"],
                    "ward": zone["ward"],
                    "severity": "critical" if zone["risk"] > 0.82 else "high",
                    "confidence": min(0.97, 0.78 + zone["risk"] * 0.18),
                    "score": zone["risk"],
                    "source": "weather-flood-nowcast",
                    "evidence": [f"{zone['rainfallMmHr']:.1f} mm/hr local rain", zone["cause"], f"ETA {zone['etaMinutes']} min"],
                }
            )
        for zone in traffic_zones:
            if zone["congestion"] < 0.66:
                continue
            incidents.append(
                {
                    "kind": "traffic_entropy",
                    "title": f"Predicted Jam: {zone['name']}",
                    "description": f"Camera entropy model predicts a {zone['jamLengthKm']:.1f} km congestion pocket.",
                    "lat": zone["lat"],
                    "lon": zone["lon"],
                    "ward": zone["name"],
                    "severity": "high" if zone["congestion"] > 0.78 else "moderate",
                    "confidence": min(0.95, 0.74 + zone["congestion"] * 0.2),
                    "score": zone["congestion"],
                    "source": "traffic-entropy-nowcast",
                    "evidence": [zone["reason"], f"{zone['vehicleCount']} vehicles estimated", f"jam ETA {zone['jamEtaMinutes']} min"],
                }
            )
        return incidents

    def _hotspot_city_signal(self, key: str) -> float:
        return _clamp(sum(item[key] for item in HOTSPOTS) / max(1, len(HOTSPOTS)))

    def _update_vehicles(
        self,
        city_context: dict[str, float],
        flood_zones: list[dict[str, Any]],
        traffic_zones: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        samples = []
        for vehicle in self.vehicles:
            route = self.routes[vehicle["routeId"]]
            lat_probe, lon_probe, _ = self._point_at(route, vehicle["distanceKm"])
            local_traffic = self._zone_pressure(lat_probe, lon_probe, traffic_zones, "congestion")
            local_flood = self._zone_pressure(lat_probe, lon_probe, flood_zones, "risk")
            drift = math.sin((self.tick_count + int(vehicle["vehicleId"][-2:])) / 5.5) * 4.6 + self.random.uniform(-2.8, 2.8)
            slowdown = local_traffic * 18 + local_flood * 14 + city_context["rainfall_mm_hr"] / 14
            speed = _clamp(vehicle["speedKmph"] * 0.68 + (34 + drift - slowdown) * 0.32, 6, 54)
            vehicle["speedKmph"] = round(speed, 1)
            vehicle["distanceKm"] = (vehicle["distanceKm"] + speed / 30.0) % route["totalKm"]
            lat, lon, heading = self._point_at(route, vehicle["distanceKm"])
            lat += self.random.uniform(-0.00012, 0.00012)
            lon += self.random.uniform(-0.00012, 0.00012)
            vehicle["trail"] = (vehicle["trail"] + [{"lat": round(lat, 6), "lon": round(lon, 6)}])[-28:]
            vehicle["lastSeen"] = _iso(self.sim_time)

            hotspot_effects = self._effects_at(lat, lon)
            hotspot_effects["traffic"] = _clamp(hotspot_effects["traffic"] + self._zone_pressure(lat, lon, traffic_zones, "congestion") * 0.7)
            hotspot_effects["moisture"] = _clamp(hotspot_effects["moisture"] + self._zone_pressure(lat, lon, flood_zones, "risk") * 0.65)
            ward = self._nearest_hotspot(lat, lon)["ward"]
            sensors = self._vehicle_sensors(vehicle, hotspot_effects, city_context, local_flood, local_traffic)
            sample = {
                "vehicleId": vehicle["vehicleId"],
                "callSign": vehicle["callSign"],
                "type": vehicle["type"],
                "routeId": vehicle["routeId"],
                "routeName": vehicle["routeName"],
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "heading": round(heading, 1),
                "ward": ward,
                "speedKmph": vehicle["speedKmph"],
                "health": round(vehicle["health"] - self.random.uniform(0, 0.002), 3),
                "battery": round(vehicle["battery"], 3),
                "status": "rerouting" if local_flood > 0.55 else "traffic-slow" if local_traffic > 0.55 else "edge-processing",
                "trail": vehicle["trail"],
                "sensors": sensors,
            }
            vehicle["health"] = max(0.88, sample["health"])
            samples.append(sample)
        return samples

    def _update_pipes(self, city_context: dict[str, float], flood_zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
        samples = []
        for sensor in self.pipe_state:
            effects = self._effects_at(sensor["lat"], sensor["lon"])
            flood_pressure = self._zone_pressure(sensor["lat"], sensor["lon"], flood_zones, "risk")
            acoustic_load = _clamp(effects["acoustic"] + flood_pressure * 0.34)
            noise = self.random.uniform(-4.2, 3.6)
            sample = {
                **sensor,
                "lastSeen": _iso(self.sim_time),
                "health": round(self.random.uniform(0.91, 0.998), 3),
                "sensors": {
                    "hiss_db": round(36 + acoustic_load * 28 + city_context["blockage_score"] * 7 + noise, 2),
                    "knock_rate": round(1.0 + acoustic_load * 7.5 + self.random.random() * 1.4, 2),
                    "pressure_drop": round(_clamp(0.08 + acoustic_load * 0.74 + city_context["upstream_velocity"] * 0.14), 3),
                    "flow_variance": round(_clamp(0.12 + acoustic_load * 0.68 + city_context["blockage_score"] * 0.2), 3),
                },
            }
            samples.append(sample)
        return samples

    def _vehicle_sensors(
        self,
        vehicle: dict[str, Any],
        effects: dict[str, float],
        city_context: dict[str, float],
        local_flood: float,
        local_traffic: float,
    ) -> dict[str, float]:
        base_vibration = 0.16 + (0.08 if vehicle["type"] in {"garbage-truck", "water-tanker"} else 0.03)
        road_dip = 0.45 + effects["road_dip"] + local_flood * 1.45 + self.random.uniform(0, 0.72)
        traffic_entropy = _clamp(0.15 + effects["traffic"] + local_traffic * 0.42 + city_context["crowd_context"] * 0.12 + self.random.uniform(0, 0.14))
        return {
            "road_dip_mm": round(road_dip, 2),
            "crack_score": round(_clamp(0.12 + effects["road_dip"] / 6.4 + self.random.random() * 0.08), 3),
            "vibration_g": round(base_vibration + effects["road_dip"] / 9 + self.random.random() * 0.05, 3),
            "surface_moisture": round(_clamp(0.12 + city_context["surface_moisture"] * 0.42 + effects["moisture"] + local_flood * 0.28 + self.random.random() * 0.08), 3),
            "traffic_entropy": round(traffic_entropy, 3),
            "hard_brake_rate": round(_clamp(0.08 + effects["traffic"] * 0.7 + local_traffic * 0.2 + self.random.random() * 0.12), 3),
            "lane_cut_score": round(_clamp(0.1 + effects["traffic"] * 0.75 + local_traffic * 0.25 + self.random.random() * 0.1), 3),
            "speed_variance": round(_clamp(0.16 + effects["traffic"] * 0.55 + local_traffic * 0.36 + self.random.random() * 0.09), 3),
            "crowd_context": city_context["crowd_context"],
        }

    def _zone_pressure(self, lat: float, lon: float, zones: list[dict[str, Any]], key: str) -> float:
        pressure = 0.0
        for zone in zones:
            distance = haversine_m(lat, lon, zone["lat"], zone["lon"])
            pressure += zone.get(key, 0.0) * _distance_to_effect(distance, zone["radius_m"])
        return _clamp(pressure)

    def _effects_at(self, lat: float, lon: float) -> dict[str, float]:
        effects = {"road_dip": 0.0, "moisture": 0.0, "acoustic": 0.0, "traffic": 0.0}
        for hotspot in HOTSPOTS:
            distance = haversine_m(lat, lon, hotspot["lat"], hotspot["lon"])
            strength = _distance_to_effect(distance, hotspot["radius_m"])
            for key in effects:
                effects[key] += hotspot[key] * strength
        return {key: _clamp(value, 0.0, 8.0 if key == "road_dip" else 1.0) for key, value in effects.items()}

    def _nearest_hotspot(self, lat: float, lon: float) -> dict[str, Any]:
        return min(HOTSPOTS, key=lambda item: haversine_m(lat, lon, item["lat"], item["lon"]))

    def _point_at(self, route: dict[str, Any], distance_km: float) -> tuple[float, float, float]:
        for segment in route["segments"]:
            if segment["at"] <= distance_km <= segment["at"] + segment["km"]:
                fraction = (distance_km - segment["at"]) / max(segment["km"], 0.001)
                start = segment["start"]
                end = segment["end"]
                lat = start[0] + (end[0] - start[0]) * fraction
                lon = start[1] + (end[1] - start[1]) * fraction
                return lat, lon, _bearing(start[0], start[1], end[0], end[1])
        last = route["points"][-1]
        first = route["points"][0]
        return last[0], last[1], _bearing(last[0], last[1], first[0], first[1])

    def _merge_incidents(self, candidates: list[dict[str, Any]]) -> None:
        seen_ids = set()
        for candidate in candidates:
            incident_id = self._incident_id(candidate)
            seen_ids.add(incident_id)
            existing = self.incidents.get(incident_id)
            now = _iso(self.sim_time)
            if existing:
                existing.update(
                    {
                        **candidate,
                        "id": incident_id,
                        "updatedAt": now,
                        "lastSeenTick": self.tick_count,
                        "status": self._next_status(existing),
                        "operatorAck": existing.get("operatorAck", False),
                        "slaHours": 48,
                    }
                )
            else:
                self.incidents[incident_id] = {
                    "id": incident_id,
                    **candidate,
                    "createdAt": now,
                    "updatedAt": now,
                    "lastSeenTick": self.tick_count,
                    "status": "Detected",
                    "operatorAck": False,
                    "slaHours": 48,
                }

        for incident in self.incidents.values():
            age_ticks = self.tick_count - incident.get("lastSeenTick", 0)
            if incident["id"] not in seen_ids and age_ticks > 18 and incident["status"] not in {"Verified", "Closed"}:
                incident["status"] = "Verification Pending"
                incident["updatedAt"] = _iso(self.sim_time)
            if age_ticks > 46:
                incident["status"] = "Verified"
            
            # Auto-create work order for critical incidents that reached "Crew Dispatched" status
            if (incident["status"] == "Crew Dispatched" and 
                not incident.get("workOrderId") and 
                incident.get("severity") == "critical"):
                best_crew = self._best_dispatch_target(incident, self.crews)
                if best_crew:
                    self.dispatch_crew_to_incident(incident["id"], best_crew["unitId"])

    def _incident_id(self, incident: dict[str, Any]) -> str:
        ward_key = incident["ward"].lower().replace(" ", "-").replace(",", "")
        return f"{incident['kind']}-{ward_key}"

    def _next_status(self, incident: dict[str, Any]) -> str:
        if incident.get("operatorAck"):
            return "Acknowledged"
        current = incident.get("status", "Detected")
        severity = incident.get("severity", "moderate")
        if current == "Detected":
            return "Cross Validated"
        if current == "Cross Validated" and severity in {"high", "critical"}:
            return "Crew Dispatched"
        return current

    def _update_dispatch(self) -> None:
        priority = {"critical": 4, "high": 3, "moderate": 2, "nominal": 1}
        open_incidents = sorted(
            [incident for incident in self.incidents.values() if incident["status"] not in {"Verified", "Closed"}],
            key=lambda item: (priority.get(item["severity"], 0), item["score"]),
            reverse=True,
        )
        for crew in self.crews:
            if crew["targetIncidentId"] and crew["targetIncidentId"] in self.incidents:
                target = self.incidents[crew["targetIncidentId"]]
                distance = haversine_m(crew["lat"], crew["lon"], target["lat"], target["lon"])
                if distance < 180:
                    crew["status"] = "on-site"
                    crew["etaMinutes"] = 0
                    target["status"] = "On Site"
                    continue
                step = min(0.16, distance / 15_000)
                crew["lat"] += (target["lat"] - crew["lat"]) * step
                crew["lon"] += (target["lon"] - crew["lon"]) * step
                crew["status"] = "en-route"
                crew["etaMinutes"] = max(1, round(distance / 520))
                target["status"] = "Crew Dispatched"
                continue

            target = self._best_dispatch_target(crew, open_incidents)
            if target:
                crew["targetIncidentId"] = target["id"]
                crew["status"] = "en-route"
                target["status"] = "Crew Dispatched"
                distance = haversine_m(crew["lat"], crew["lon"], target["lat"], target["lon"])
                crew["etaMinutes"] = max(2, round(distance / 520))
            else:
                crew["status"] = "available"
                crew["etaMinutes"] = None

    def _best_dispatch_target(self, crew_or_incident: dict[str, Any], reference: list[dict[str, Any]]) -> dict[str, Any] | None:
        """Find best crew for incident or best incident for crew (based on context)."""
        # If reference is list of crews, we're looking for best crew for incident (auto work order)
        if reference and reference[0].get("skill") is not None:  # Crews have skill
            # Incident needs crew - find best crew
            incident = crew_or_incident
            available_crews = [c for c in reference if c["status"] == "available"]
            if not available_crews:
                return None
            skill_boost = {
                "flood response": {"flood_risk"},
                "road + retaining wall": {"road_stress", "traffic_entropy"},
                "water main repair": {"pipe_leak"},
            }
            skill_matches = [c for c in available_crews if incident["kind"] in skill_boost.get(c["skill"], set())]
            pool = skill_matches or available_crews
            return min(pool, key=lambda c: haversine_m(c["lat"], c["lon"], incident["lat"], incident["lon"]))
        else:
            # Crew dispatch - find best incident for crew (original logic)
            crew = crew_or_incident
            incidents = reference
            unassigned = [incident for incident in incidents if incident["id"] not in {unit.get("targetIncidentId") for unit in self.crews}]
            if not unassigned:
                return None
            skill_boost = {
                "flood response": {"flood_risk"},
                "road + retaining wall": {"road_stress", "traffic_entropy"},
                "water main repair": {"pipe_leak"},
            }
            preferred = [item for item in unassigned if item["kind"] in skill_boost.get(crew["skill"], set())]
            pool = preferred or unassigned
            return min(pool, key=lambda item: haversine_m(crew["lat"], crew["lon"], item["lat"], item["lon"]))

    def _snapshot(
        self,
        vehicle_samples: list[dict[str, Any]],
        pipe_samples: list[dict[str, Any]],
        inference: dict[str, Any],
        city_context: dict[str, float],
        weather_cells: list[dict[str, Any]],
        flood_zones: list[dict[str, Any]],
        traffic_zones: list[dict[str, Any]],
    ) -> dict[str, Any]:
        active_incidents = sorted(self.incidents.values(), key=lambda item: item["score"], reverse=True)
        critical_count = sum(1 for item in active_incidents if item["severity"] in {"critical", "high"} and item["status"] != "Verified")
        sensor_health_values = [sample["health"] for sample in vehicle_samples] + [sample["health"] for sample in pipe_samples]
        sensor_health = sum(sensor_health_values) / max(1, len(sensor_health_values))
        flood_risk = inference["floodPrediction"]["severity"].title()

        return {
            "timestamp": _iso(self.sim_time),
            "tick": self.tick_count,
            "mapBounds": {"minLat": 12.84, "maxLat": 13.06, "minLon": 77.47, "maxLon": 77.77},
            "system": {
                "online": True,
                "activeEdgeFleets": len(vehicle_samples),
                "criticalPreemptions": critical_count,
                "floodRisk": flood_risk,
                "sensorHealth": round(sensor_health * 100, 1),
                "bandwidthMode": "2G burst packets",
                "fleetSensorCount": len(vehicle_samples),
                "pipeSensorCount": len(pipe_samples),
                "cameraJunctionCount": len(CAMERA_JUNCTIONS),
                "weatherCellCount": len(weather_cells),
                "activeTelemetryCount": len(vehicle_samples) + len(pipe_samples) + len(CAMERA_JUNCTIONS) + len(weather_cells),
            },
            "cityContext": city_context,
            "routes": self._routes_for_client(),
            "vehicles": inference["vehicleReadings"],
            "pipeSensors": inference["pipeReadings"],
            "weatherCells": weather_cells,
            "floodZones": flood_zones,
            "trafficZones": traffic_zones,
            "incidents": [self._incident_for_client(item) for item in active_incidents],
            "dispatchUnits": self._dispatch_for_client(),
            "floodForecast": inference["floodForecast"],
            "floodPrediction": inference["floodPrediction"],
            "modelHealth": inference["modelHealth"],
            "publicBoard": self._public_board(active_incidents),
        }

    def _routes_for_client(self) -> list[dict[str, Any]]:
        routes = []
        for route in self.routes.values():
            routes.append(
                {
                    "id": route["id"],
                    "name": route["name"],
                    "color": route["color"],
                    "points": [{"lat": lat, "lon": lon} for lat, lon in route["points"]],
                }
            )
        return routes

    def _dispatch_for_client(self) -> list[dict[str, Any]]:
        return [
            {
                **crew,
                "lat": round(crew["lat"], 6),
                "lon": round(crew["lon"], 6),
                "targetIncident": self.incidents.get(crew["targetIncidentId"], {}).get("title") if crew.get("targetIncidentId") else None,
            }
            for crew in self.crews
        ]

    def _incident_for_client(self, incident: dict[str, Any]) -> dict[str, Any]:
        created = datetime.fromisoformat(incident["createdAt"])
        age_hours = max(0.0, (self.sim_time - created).total_seconds() / 3600)
        sla_state = "green"
        if age_hours >= incident.get("slaHours", 48):
            sla_state = "red"
        elif age_hours >= incident.get("slaHours", 48) * 0.72:
            sla_state = "amber"
        return {
            **incident,
            "ageHours": round(age_hours, 1),
            "slaState": sla_state,
            "lat": round(incident["lat"], 6),
            "lon": round(incident["lon"], 6),
            "score": round(incident["score"], 3),
            "confidence": round(incident["confidence"], 3),
        }

    def _public_board(self, incidents: list[dict[str, Any]]) -> list[dict[str, Any]]:
        public = [self._incident_for_client(item) for item in incidents if item["status"] not in {"Verified", "Closed"}]
        public.sort(key=lambda item: (item["slaState"] == "red", item["score"]), reverse=True)
        return public[:8]
