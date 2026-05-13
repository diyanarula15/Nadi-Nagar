import { AlertTriangle, CheckCircle2, Clock, Cpu, MapPin } from "lucide-react";
import { acknowledgeIncident } from "../lib/api";
import type { Incident, Snapshot } from "../types";
import { StatusPill } from "./StatusPill";

interface AlertFeedProps {
  snapshot: Snapshot;
}

function toneFor(incident: Incident) {
  if (incident.severity === "critical") return "red";
  if (incident.severity === "high") return "amber";
  if (incident.status === "Verified") return "green";
  return "blue";
}

function iconFor(kind: Incident["kind"]) {
  if (kind === "flood_risk") return "Flash flood";
  if (kind === "pipe_leak") return "Acoustic";
  if (kind === "traffic_entropy") return "Traffic";
  return "Surface";
}

export function AlertFeed({ snapshot }: AlertFeedProps) {
  return (
    <section className="panel alert-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <Cpu size={15} />
            Edge-AI triage
          </span>
          <h2>Preemption Queue</h2>
        </div>
        <StatusPill tone="blue">{snapshot.incidents.length} active</StatusPill>
      </div>

      <div className="alert-list">
        {snapshot.incidents.slice(0, 7).map((incident) => (
          <article key={incident.id} className={`alert-card ${incident.severity}`}>
            <div className="alert-main">
              <span className="alert-icon">
                {incident.status === "Verified" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              </span>
              <div>
                <div className="alert-title-row">
                  <strong>{incident.title}</strong>
                  <StatusPill tone={toneFor(incident)}>{incident.severity}</StatusPill>
                </div>
                <p>{incident.description}</p>
                <div className="alert-meta">
                  <span>
                    <MapPin size={14} />
                    {incident.ward}
                  </span>
                  <span>
                    <Clock size={14} />
                    {incident.ageHours}h open
                  </span>
                  <span>{iconFor(incident.kind)}</span>
                </div>
              </div>
            </div>
            <div className="alert-score">
              <strong>{Math.round(incident.score * 100)}%</strong>
              <small>{incident.status}</small>
              {!incident.operatorAck && (
                <button type="button" onClick={() => acknowledgeIncident(incident.id)}>
                  Ack
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

