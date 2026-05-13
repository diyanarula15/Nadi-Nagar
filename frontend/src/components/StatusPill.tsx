import { CheckCircle2, CircleAlert, Clock3, Radio } from "lucide-react";
import type { ReactNode } from "react";

interface StatusPillProps {
  tone?: "green" | "amber" | "red" | "blue" | "muted";
  children: ReactNode;
}

const icons = {
  green: CheckCircle2,
  amber: Clock3,
  red: CircleAlert,
  blue: Radio,
  muted: Radio
};

export function StatusPill({ tone = "muted", children }: StatusPillProps) {
  const Icon = icons[tone];
  return (
    <span className={`status-pill ${tone}`}>
      <Icon size={14} aria-hidden="true" />
      {children}
    </span>
  );
}
