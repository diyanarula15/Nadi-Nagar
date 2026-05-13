import {
  Activity,
  AlertTriangle,
  Bus,
  LayoutDashboard,
  Map,
  RadioTower,
  Settings,
  ShieldCheck,
  Waves,
  Wrench,
  Users,
  Camera,
  BarChart3,
} from "lucide-react";
import type { ComponentType } from "react";
import type { ViewKey } from "../types";

const items: { id: ViewKey; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "map", label: "Live Map", icon: Map },
  { id: "alerts", label: "Edge-AI Alerts", icon: AlertTriangle },
  { id: "fleet", label: "Fleet Dispatch", icon: Bus },
  { id: "flood", label: "Flood Analytics", icon: Waves },
  { id: "work-orders", label: "Work Orders", icon: Wrench },
  { id: "photos", label: "Photo Verification", icon: Camera },
  { id: "citizen", label: "Citizen Portal", icon: Users },
  { id: "analytics", label: "Cost Analytics", icon: BarChart3 },
  { id: "public", label: "Public SLA Board", icon: ShieldCheck }
];

interface SidebarProps {
  active: ViewKey;
  onChange: (view: ViewKey) => void;
  userType?: string;
}

export function Sidebar({ active, onChange, userType = "operator" }: SidebarProps) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onChange("dashboard")} aria-label="Open dashboard">
        <span className="brand-mark">
          <Activity size={20} />
        </span>
        <span>
          <strong>Nadi-Nagar</strong>
          <small>Urban Resilience Grid</small>
        </span>
      </button>

      <nav aria-label="Primary navigation">
        {items.map((item) => {
          // Citizens only see Citizen Portal, Operators can't see Citizen Portal
          if ((userType === "citizen" && item.id !== "citizen") || (userType !== "citizen" && item.id === "citizen")) {
            return null;
          }
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={active === item.id ? "active" : ""}
              onClick={() => onChange(item.id)}
              type="button"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {userType === "citizen" ? (
          <>
            <Users size={18} />
            <span>
              <strong>Citizen Portal</strong>
              <small>Report & Track</small>
            </span>
          </>
        ) : (
          <>
            <RadioTower size={18} />
            <span>
              <strong>Municipal Admin</strong>
              <small>Control Center</small>
            </span>
          </>
        )}
      </div>
    </aside>
  );
}
