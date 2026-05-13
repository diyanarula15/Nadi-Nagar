import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock, TrendingUp, MapPin, Eye, ShieldAlert, TimerReset } from "lucide-react";
import type { Snapshot } from "../types";
import { StatusPill } from "./StatusPill";

interface SLAIncident {
  incidentId: string;
  title: string;
  ward: string;
  hoursOverdue?: number;
  hoursRemaining?: number;
  status: string;
}

interface SLAStatus {
  breaches: SLAIncident[];
  approaching: SLAIncident[];
  totalBreaches: number;
  totalApproaching: number;
  timestamp: string;
}

interface WorkOrder {
  workOrderId: string;
  incidentId: string;
  crewId: string;
  crewName: string;
  incidentTitle: string;
  ward: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  eta?: number;
}

export function PublicSlaBoard({ snapshot }: { snapshot: Snapshot }) {
  const [slaStatus, setSlaStatus] = useState<SLAStatus | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedTab, setSelectedTab] = useState<"overview" | "breaches" | "work-orders">("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [slaRes, workOrderRes] = await Promise.all([
          fetch("/api/sla-status"),
          fetch("/api/work-orders"),
        ]);
        if (slaRes.ok && workOrderRes.ok) {
          const slaData = await slaRes.json();
          const workOrderData = await workOrderRes.json();
          setSlaStatus(slaData);
          setWorkOrders(workOrderData);
        }
      } catch (err) {
        console.error("Failed to fetch SLA status:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const slaTone = (incident: any) => {
    if (incident.slaState === "red") return "red";
    if (incident.slaState === "amber") return "amber";
    return "green";
  };

  return (
    <section className="panel public-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <Eye size={15} />
            Public Transparency & SLA Enforcement
          </span>
          <h2>48h Infrastructure SLA Board</h2>
        </div>
        {slaStatus && (
          <div className="flex gap-3">
            {slaStatus.totalBreaches > 0 && (
              <StatusPill tone="red">{slaStatus.totalBreaches} Breached</StatusPill>
            )}
            {slaStatus.totalApproaching > 0 && (
              <StatusPill tone="amber">{slaStatus.totalApproaching} Approaching</StatusPill>
            )}
            <StatusPill tone="blue">{snapshot.publicBoard.length} active</StatusPill>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="public-tabs">
        <button
          onClick={() => setSelectedTab("overview")}
          className={`public-tab ${selectedTab === "overview" ? "active blue" : ""}`}
          type="button"
        >
          <Eye size={14} />
          Overview
        </button>
        <button
          onClick={() => setSelectedTab("breaches")}
          className={`public-tab ${selectedTab === "breaches" ? "active red" : ""}`}
          type="button"
        >
          <AlertCircle size={14} />
          SLA Breaches ({slaStatus?.totalBreaches || 0})
        </button>
        <button
          onClick={() => setSelectedTab("work-orders")}
          className={`public-tab ${selectedTab === "work-orders" ? "active blue" : ""}`}
          type="button"
        >
          <TrendingUp size={14} />
          Work Orders ({workOrders.length})
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === "overview" && (
        <div className="sla-list">
          {snapshot.publicBoard.slice(0, 6).map((incident) => (
            <article key={incident.id} className={`sla-item ${incident.slaState}`}>
              <div>
                <strong>{incident.title}</strong>
                <span>{incident.ward}</span>
              </div>
              <StatusPill tone={slaTone(incident)}>
                {incident.slaState === "red"
                  ? "⚠️ Breach"
                  : incident.slaState === "amber"
                    ? `⏱️ ${Math.max(0, Math.round((incident as any).slaHours - (incident as any).ageHours))}h left`
                    : `✓ ${Math.max(0, Math.round((incident as any).slaHours - (incident as any).ageHours))}h left`}
              </StatusPill>
              <small>
                <TimerReset size={14} />
                {incident.status}
              </small>
            </article>
          ))}
        </div>
      )}

      {/* Breaches Tab */}
      {selectedTab === "breaches" && slaStatus && (
        <div className="sla-list">
          {slaStatus.breaches.length === 0 ? (
            <div className="public-empty green">
              <CheckCircle size={32} />
              <p>All incidents within SLA</p>
            </div>
          ) : (
            slaStatus.breaches.map((incident) => (
              <article key={incident.incidentId} className="sla-item red">
                <div>
                  <strong>⚠️ {incident.title}</strong>
                  <span>{incident.ward}</span>
                </div>
                <StatusPill tone="red">
                  {incident.hoursOverdue?.toFixed(1)} hours overdue
                </StatusPill>
                <small>
                  <TimerReset size={14} />
                  {incident.status}
                </small>
              </article>
            ))
          )}
        </div>
      )}

      {/* Work Orders Tab */}
      {selectedTab === "work-orders" && (
        <div className="sla-list">
          {workOrders.length === 0 ? (
            <div className="public-empty blue">
              <CheckCircle size={32} />
              <p>No active work orders</p>
            </div>
          ) : (
            workOrders.map((workOrder) => (
              <article
                key={workOrder.workOrderId}
                className={`sla-item ${workOrder.paymentStatus === "released" ? "green" : workOrder.paymentStatus === "in_progress" ? "blue" : "muted"}`}
              >
                <div>
                  <strong>{workOrder.incidentTitle}</strong>
                  <span>{workOrder.crewName} • {workOrder.ward}</span>
                </div>
                <StatusPill tone={workOrder.paymentStatus === "released" ? "green" : workOrder.paymentStatus === "in_progress" ? "blue" : "muted"}>
                  {workOrder.paymentStatus === "released"
                    ? "💰 Payment Released"
                    : workOrder.paymentStatus === "in_progress"
                      ? `🚚 ${workOrder.eta || "?"}m ETA`
                      : "⏳ Pending Dispatch"}
                </StatusPill>
                <small>
                  <TimerReset size={14} />
                  {workOrder.status}
                </small>
              </article>
            ))
          )}
        </div>
      )}

      <div className="public-foot">
        <ShieldAlert size={17} />
        <span>💡 Contractor payment auto-releases after AI verifies repair completion</span>
      </div>
    </section>
  );
}

