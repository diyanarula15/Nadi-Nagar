import { Camera, Gauge, TrafficCone } from "lucide-react";
import type { Snapshot, TrafficZone } from "../types";
import { StatusPill } from "./StatusPill";

function tone(zone: TrafficZone) {
  if (zone.congestion > 0.74) return "red";
  if (zone.congestion > 0.52) return "amber";
  return "blue";
}

export function TrafficPredictionPanel({ snapshot }: { snapshot: Snapshot }) {
  return (
    <section className="panel traffic-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <TrafficCone size={15} />
            Traffic jam nowcast
          </span>
          <h2>Predicted Jam Areas</h2>
        </div>
        <StatusPill tone={snapshot.trafficZones.length > 3 ? "amber" : "green"}>
          {snapshot.trafficZones.length} zones
        </StatusPill>
      </div>

      <div className="traffic-list">
        {snapshot.trafficZones.slice(0, 6).map((zone) => (
          <article key={zone.id} className="traffic-zone">
            <div className="traffic-zone-top">
              <strong>{zone.name}</strong>
              <StatusPill tone={tone(zone)}>{Math.round(zone.congestion * 100)}%</StatusPill>
            </div>
            <div className="traffic-meter">
              <i style={{ width: `${Math.round(zone.congestion * 100)}%` }} />
            </div>
            <footer>
              <span>
                <Gauge size={14} />
                {zone.predictedSpeedKmph.toFixed(1)} km/h
              </span>
              <span>
                <Camera size={14} />
                {zone.vehicleCount} vehicles
              </span>
              <span>{zone.jamLengthKm.toFixed(1)} km in {zone.jamEtaMinutes}m</span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

