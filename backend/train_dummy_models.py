from __future__ import annotations

import json
import random
from pathlib import Path


OUTPUT = Path(__file__).parent / "models" / "model_weights.json"


def jitter(weights: dict[str, float], scale: float) -> dict[str, float]:
    return {key: round(value + random.uniform(-scale, scale), 4) for key, value in weights.items()}


def main() -> None:
    random.seed(42)
    calibrated = {
        "surface": jitter(
            {
                "bias": -2.25,
                "road_dip_mm": 0.31,
                "crack_score": 2.15,
                "vibration_g": 1.55,
                "surface_moisture": 1.2,
                "traffic_entropy": 0.72,
            },
            0.04,
        ),
        "acoustic": jitter(
            {
                "bias": -2.0,
                "hiss_db": 0.065,
                "knock_rate": 0.28,
                "pressure_drop": 1.85,
                "flow_variance": 1.15,
            },
            0.035,
        ),
        "flood": jitter(
            {
                "bias": -1.55,
                "rainfall_mm_hr": 0.11,
                "drain_level_cm": 0.055,
                "blockage_score": 1.7,
                "upstream_velocity": 0.65,
                "surface_moisture": 1.05,
            },
            0.03,
        ),
        "traffic": jitter(
            {
                "bias": -1.35,
                "hard_brake_rate": 1.8,
                "lane_cut_score": 1.6,
                "speed_variance": 0.75,
                "crowd_context": -0.9,
            },
            0.04,
        ),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(calibrated, indent=2), encoding="utf-8")
    print(f"wrote calibrated demo weights to {OUTPUT}")


if __name__ == "__main__":
    main()

