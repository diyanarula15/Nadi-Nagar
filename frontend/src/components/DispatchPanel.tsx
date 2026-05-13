import { Navigation, Radio, Wrench } from "lucide-react";
import type { Snapshot } from "../types";
import { StatusPill } from "./StatusPill";

interface DispatchPanelProps {
  snapshot: Snapshot;
}

export function DispatchPanel({ snapshot }: DispatchPanelProps) {
  const active = snapshot.dispatchUnits.filter((unit) => unit.status !== "available").length;
  return (
    <section className="panel dispatch-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <Navigation size={15} />
            Algorithmic dispatch
          </span>
          <h2>Nearest Crews</h2>
        </div>
        <StatusPill tone={active > 0 ? "blue" : "green"}>{active} active</StatusPill>
      </div>

      <div className="dispatch-list">
        {snapshot.dispatchUnits.map((unit) => (
          <article key={unit.unitId} className="dispatch-item">
            <div>
              <strong>{unit.name}</strong>
              <span>{unit.skill}</span>
            </div>
            <StatusPill tone={unit.status === "on-site" ? "green" : unit.status === "en-route" ? "blue" : "muted"}>
              {unit.status}
            </StatusPill>
            <p>{unit.targetIncident ?? "Awaiting next cross-validated incident"}</p>
            <div className="dispatch-foot">
              <span>
                <Radio size={14} />
                {unit.lat.toFixed(4)}, {unit.lon.toFixed(4)}
              </span>
              <span>
                <Wrench size={14} />
                {unit.etaMinutes === null ? "Ready" : `${unit.etaMinutes} min ETA`}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

