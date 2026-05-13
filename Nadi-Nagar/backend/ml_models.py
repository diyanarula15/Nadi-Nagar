from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from statistics import mean
from typing import Any


MODEL_PATH = Path(__file__).parent / "models" / "model_weights.json"


def _sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-60.0, min(60.0, value))))


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _score(weights: dict[str, float], features: dict[str, float]) -> float:
    total = weights.get("bias", 0.0)
    for key, value in features.items():
        total += weights.get(key, 0.0) * value
    return _sigmoid(total)


def _severity(score: float) -> str:
    if score >= 0.82:
        return "critical"
    if score >= 0.64:
        return "high"
    if score >= 0.43:
        return "moderate"
    return "nominal"


def load_weights() -> dict[str, dict[str, float]]:
    with MODEL_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@dataclass
class ModelPrediction:
    model: str
    score: float
    severity: str
    confidence: float
    explanation: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "model": self.model,
            "score": round(self.score, 3),
            "severity": self.severity,
            "confidence": round(self.confidence, 3),
            "explanation": self.explanation,
        }


class SurfaceStressModel:
    """Tiny edge model that mimics road-surface photogrammetry inference."""

    def __init__(self, weights: dict[str, float]):
        self.weights = weights

    def predict(self, sensor: dict[str, float]) -> ModelPrediction:
        features = {
            "road_dip_mm": sensor["road_dip_mm"] / 10.0,
            "crack_score": sensor["crack_score"],
            "vibration_g": sensor["vibration_g"] / 1.4,
            "surface_moisture": sensor["surface_moisture"],
            "traffic_entropy": sensor["traffic_entropy"],
        }
        score = _score(self.weights, features)
        explanation = []
        if sensor["road_dip_mm"] >= 2.0:
            explanation.append(f"{sensor['road_dip_mm']:.1f} mm pavement dip")
        if sensor["crack_score"] >= 0.55:
            explanation.append("micro-crack mesh detected")
        if sensor["surface_moisture"] >= 0.62:
            explanation.append("surface moisture supports subsurface stress")
        if not explanation:
            explanation.append("surface profile within learned baseline")
        return ModelPrediction("Edge Surface CNN", score, _severity(score), 0.88 + score * 0.08, explanation)


class AcousticStressModel:
    """Acoustic classifier for leaks, pipe knock, and drain blockage."""

    def __init__(self, weights: dict[str, float]):
        self.weights = weights

    def predict(self, sensor: dict[str, float]) -> ModelPrediction:
        features = {
            "hiss_db": max(0.0, sensor["hiss_db"] - 34.0),
            "knock_rate": sensor["knock_rate"] / 8.0,
            "pressure_drop": sensor["pressure_drop"],
            "flow_variance": sensor["flow_variance"],
        }
        score = _score(self.weights, features)
        explanation = []
        if sensor["hiss_db"] >= 53:
            explanation.append("pressurized leak hiss signature")
        if sensor["knock_rate"] >= 5:
            explanation.append("erratic pipe knock pattern")
        if sensor["flow_variance"] >= 0.58:
            explanation.append("flow variance suggests blockage")
        if not explanation:
            explanation.append("pipe acoustics match normal city noise")
        return ModelPrediction("Acoustic Stress Transformer", score, _severity(score), 0.84 + score * 0.1, explanation)


class FloodForecaster:
    """Lightweight LSTM-style recurrent forecaster for flood risk.

    This is intentionally small enough to run on a demo laptop while still behaving like a
    stateful model: every tick updates hidden memory, and forecasts use that memory rather
    than only the latest sample.
    """

    def __init__(self, weights: dict[str, float]):
        self.weights = weights
        self.hidden_level = 0.34
        self.hidden_velocity = 0.08
        self.recent_scores: list[float] = []

    def predict(self, city_features: dict[str, float]) -> tuple[ModelPrediction, list[dict[str, float]]]:
        features = {
            "rainfall_mm_hr": city_features["rainfall_mm_hr"],
            "drain_level_cm": city_features["drain_level_cm"],
            "blockage_score": city_features["blockage_score"],
            "upstream_velocity": city_features["upstream_velocity"],
            "surface_moisture": city_features["surface_moisture"],
        }
        instantaneous = _score(self.weights, features)
        self.hidden_level = _clamp(0.72 * self.hidden_level + 0.28 * instantaneous)
        self.hidden_velocity = 0.64 * self.hidden_velocity + 0.36 * (instantaneous - self.hidden_level)
        score = _clamp(self.hidden_level + 0.55 * max(0.0, self.hidden_velocity))
        self.recent_scores = (self.recent_scores + [score])[-30:]

        forecast = []
        base = score
        velocity = self.hidden_velocity
        for idx in range(1, 13):
            storm_pulse = math.sin(idx / 12 * math.pi) * city_features["rainfall_mm_hr"] / 82.0
            base = _clamp(base * 0.93 + velocity * 0.7 + storm_pulse * 0.19 + city_features["blockage_score"] * 0.035)
            forecast.append({"minute": idx * 15, "risk": round(base, 3), "waterLevel": round(24 + base * 92, 1)})

        explanation = [
            f"{city_features['rainfall_mm_hr']:.1f} mm/hr rainfall assimilation",
            f"{city_features['drain_level_cm']:.0f} cm median drain level",
        ]
        if city_features["blockage_score"] >= 0.55:
            explanation.append("upstream blockage pressure rising")
        return (
            ModelPrediction("Flood LSTM Forecaster", score, _severity(score), 0.86 + score * 0.08, explanation),
            forecast,
        )


class TrafficEntropyModel:
    def __init__(self, weights: dict[str, float]):
        self.weights = weights

    def predict(self, features: dict[str, float]) -> ModelPrediction:
        score = _score(self.weights, features)
        explanation = []
        if features["hard_brake_rate"] >= 0.45:
            explanation.append("hard braking cluster detected")
        if features["lane_cut_score"] >= 0.5:
            explanation.append("lane discipline entropy high")
        if features["crowd_context"] > 0:
            explanation.append("context normalized for planned crowding")
        if not explanation:
            explanation.append("junction flow inside baseline")
        return ModelPrediction("Behavioral Traffic Guardrail", score, _severity(score), 0.81 + score * 0.12, explanation)


class DigitalTwinCorrelator:
    """Cross-validates edge and underground signals before a municipal alert is raised."""

    def correlate(
        self,
        vehicle_readings: list[dict[str, Any]],
        pipe_readings: list[dict[str, Any]],
        flood_prediction: ModelPrediction,
    ) -> list[dict[str, Any]]:
        incidents: list[dict[str, Any]] = []

        for reading in vehicle_readings:
            surface = reading["predictions"]["surface"]
            traffic = reading["predictions"]["traffic"]
            if surface.score >= 0.62:
                pipe_match = self._nearest_pipe(reading, pipe_readings)
                cross_signal = pipe_match and pipe_match["prediction"].score >= 0.52 and pipe_match["distance_m"] <= 420
                confidence = min(0.98, surface.confidence + (0.08 if cross_signal else -0.04))
                incidents.append(
                    {
                        "kind": "road_stress",
                        "title": "Subsurface Road Stress",
                        "description": "Photogrammetry saw a sink pattern; underground acoustics are checked before escalation.",
                        "lat": reading["lat"],
                        "lon": reading["lon"],
                        "ward": reading["ward"],
                        "severity": _severity(surface.score + (0.12 if cross_signal else 0.0)),
                        "confidence": confidence,
                        "score": min(0.99, surface.score + (0.1 if cross_signal else 0.0)),
                        "source": reading["vehicleId"],
                        "evidence": surface.explanation + (["acoustic corroboration within 420m"] if cross_signal else []),
                    }
                )
            if traffic.score >= 0.66:
                incidents.append(
                    {
                        "kind": "traffic_entropy",
                        "title": "Entropy Zone Guardrail",
                        "description": "Signal timing and VMS nudges recommended for sudden braking and lane-cutting.",
                        "lat": reading["lat"],
                        "lon": reading["lon"],
                        "ward": reading["ward"],
                        "severity": traffic.severity,
                        "confidence": traffic.confidence,
                        "score": traffic.score,
                        "source": reading["vehicleId"],
                        "evidence": traffic.explanation,
                    }
                )

        for pipe in pipe_readings:
            acoustic = pipe["prediction"]
            if acoustic.score >= 0.68:
                incidents.append(
                    {
                        "kind": "pipe_leak",
                        "title": "Acoustic Pipe Stress",
                        "description": "Underground sensor hears leak or blockage stress frequencies.",
                        "lat": pipe["lat"],
                        "lon": pipe["lon"],
                        "ward": pipe["ward"],
                        "severity": acoustic.severity,
                        "confidence": acoustic.confidence,
                        "score": acoustic.score,
                        "source": pipe["sensorId"],
                        "evidence": acoustic.explanation,
                    }
                )

        if flood_prediction.score >= 0.58:
            flood_vehicle = max(vehicle_readings, key=lambda item: item["sensors"]["surface_moisture"])
            incidents.append(
                {
                    "kind": "flood_risk",
                    "title": "Flash Flood Preemption",
                    "description": "Drain telemetry and surface moisture predict a flood-prone corridor.",
                    "lat": flood_vehicle["lat"],
                    "lon": flood_vehicle["lon"],
                    "ward": flood_vehicle["ward"],
                    "severity": flood_prediction.severity,
                    "confidence": flood_prediction.confidence,
                    "score": flood_prediction.score,
                    "source": "digital-twin",
                    "evidence": flood_prediction.explanation,
                }
            )

        return incidents

    @staticmethod
    def _nearest_pipe(reading: dict[str, Any], pipes: list[dict[str, Any]]) -> dict[str, Any] | None:
        nearest = None
        for pipe in pipes:
            distance_m = haversine_m(reading["lat"], reading["lon"], pipe["lat"], pipe["lon"])
            if nearest is None or distance_m < nearest["distance_m"]:
                nearest = {**pipe, "distance_m": distance_m}
        return nearest


class NadiNagarInferenceEngine:
    def __init__(self) -> None:
        weights = load_weights()
        self.surface_model = SurfaceStressModel(weights["surface"])
        self.acoustic_model = AcousticStressModel(weights["acoustic"])
        self.flood_model = FloodForecaster(weights["flood"])
        self.traffic_model = TrafficEntropyModel(weights["traffic"])
        self.correlator = DigitalTwinCorrelator()

    def infer(
        self,
        vehicle_samples: list[dict[str, Any]],
        pipe_samples: list[dict[str, Any]],
        city_features: dict[str, float],
    ) -> dict[str, Any]:
        vehicle_readings = []
        for sample in vehicle_samples:
            surface = self.surface_model.predict(sample["sensors"])
            traffic_features = {
                "hard_brake_rate": sample["sensors"]["hard_brake_rate"],
                "lane_cut_score": sample["sensors"]["lane_cut_score"],
                "speed_variance": sample["sensors"]["speed_variance"],
                "crowd_context": sample["sensors"]["crowd_context"],
            }
            traffic = self.traffic_model.predict(traffic_features)
            vehicle_readings.append({**sample, "predictions": {"surface": surface, "traffic": traffic}})

        pipe_readings = []
        for sample in pipe_samples:
            pipe_readings.append({**sample, "prediction": self.acoustic_model.predict(sample["sensors"])})

        flood_prediction, forecast = self.flood_model.predict(city_features)
        incidents = self.correlator.correlate(vehicle_readings, pipe_readings, flood_prediction)
        avg_surface = mean([item["predictions"]["surface"].score for item in vehicle_readings]) if vehicle_readings else 0.0
        avg_pipe = mean([item["prediction"].score for item in pipe_readings]) if pipe_readings else 0.0
        return {
            "vehicleReadings": self._serialize_vehicle_readings(vehicle_readings),
            "pipeReadings": self._serialize_pipe_readings(pipe_readings),
            "floodPrediction": flood_prediction.to_dict(),
            "floodForecast": forecast,
            "candidateIncidents": incidents,
            "modelHealth": {
                "surfaceMeanRisk": round(avg_surface, 3),
                "pipeMeanRisk": round(avg_pipe, 3),
                "floodMemory": round(self.flood_model.hidden_level, 3),
                "recentFloodTrend": round(mean(self.flood_model.recent_scores), 3) if self.flood_model.recent_scores else 0.0,
            },
        }

    @staticmethod
    def _serialize_vehicle_readings(readings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        serialized = []
        for reading in readings:
            serialized.append(
                {
                    **{key: value for key, value in reading.items() if key != "predictions"},
                    "predictions": {
                        "surface": reading["predictions"]["surface"].to_dict(),
                        "traffic": reading["predictions"]["traffic"].to_dict(),
                    },
                }
            )
        return serialized

    @staticmethod
    def _serialize_pipe_readings(readings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        serialized = []
        for reading in readings:
            serialized.append({**{key: value for key, value in reading.items() if key != "prediction"}, "prediction": reading["prediction"].to_dict()})
        return serialized


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_m = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    return earth_radius_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

