import { Activity, GitMerge, Network, ShieldCheck } from "lucide-react";
import type { Snapshot } from "../types";
import { StatusPill } from "./StatusPill";

export function DigitalTwinPanel({ snapshot }: { snapshot: Snapshot }) {
  const rows = [
    { label: "Surface CNN mean", value: snapshot.modelHealth.surfaceMeanRisk, icon: Activity },
    { label: "Acoustic mean", value: snapshot.modelHealth.pipeMeanRisk, icon: Network },
    { label: "Flood memory", value: snapshot.modelHealth.floodMemory, icon: GitMerge },
    { label: "Recent trend", value: snapshot.modelHealth.recentFloodTrend, icon: ShieldCheck }
  ];

  return (
    <section className="panel twin-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <GitMerge size={15} />
            Cross-validation
          </span>
          <h2>Digital Twin Correlator</h2>
        </div>
        <StatusPill tone="green">privacy-first</StatusPill>
      </div>

      <div className="twin-grid">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="twin-cell">
              <Icon size={18} />
              <span>{row.label}</span>
              <strong>{Math.round(row.value * 100)}%</strong>
              <div className="bar">
                <i style={{ width: `${Math.round(row.value * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="correlation-strip">
        <span>surface</span>
        <i />
        <span>pipe</span>
        <i />
        <span>weather</span>
        <i />
        <span>dispatch</span>
      </div>
    </section>
  );
}

