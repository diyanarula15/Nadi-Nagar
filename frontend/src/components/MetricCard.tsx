import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "red" | "amber" | "green";
}

export function MetricCard({ icon: Icon, label, value, detail, tone }: MetricCardProps) {
  return (
    <section className="metric-card">
      <span className={`metric-icon ${tone}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </section>
  );
}

