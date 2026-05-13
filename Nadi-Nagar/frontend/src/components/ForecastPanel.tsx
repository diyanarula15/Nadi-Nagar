import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CloudRain, Droplets, Waves } from "lucide-react";
import type { Snapshot } from "../types";
import { StatusPill } from "./StatusPill";

interface ForecastPanelProps {
  snapshot: Snapshot;
  expanded?: boolean;
}

export function ForecastPanel({ snapshot, expanded = false }: ForecastPanelProps) {
  const risk = snapshot.floodPrediction.score;
  const tone = risk >= 0.72 ? "red" : risk >= 0.52 ? "amber" : "green";
  return (
    <section className={`panel forecast-panel ${expanded ? "expanded" : ""}`}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <Waves size={15} />
            LSTM neural forecast
          </span>
          <h2>Flash Flood Forecast</h2>
        </div>
        <StatusPill tone={tone}>{snapshot.system.floodRisk} risk</StatusPill>
      </div>

      <div className="forecast-grid">
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={expanded ? 310 : 235}>
            <AreaChart data={snapshot.floodForecast} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="floodRisk" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 8" stroke="#dbe7f3" />
              <XAxis dataKey="minute" tickFormatter={(value) => `${value}m`} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} tickLine={false} axisLine={false} domain={[0, 1]} />
              <Tooltip
                formatter={(value: number, name: string) => [name === "risk" ? `${Math.round(value * 100)}%` : `${value} cm`, name]}
                labelFormatter={(value) => `+${value} minutes`}
              />
              <Area type="monotone" dataKey="risk" stroke="#0284c7" strokeWidth={3} fill="url(#floodRisk)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="forecast-readouts">
          <div>
            <CloudRain size={20} />
            <span>Rainfall</span>
            <strong>{snapshot.cityContext.rainfall_mm_hr.toFixed(1)} mm/hr</strong>
          </div>
          <div>
            <Droplets size={20} />
            <span>Drain level</span>
            <strong>{snapshot.cityContext.drain_level_cm.toFixed(0)} cm</strong>
          </div>
          <div>
            <Waves size={20} />
            <span>Blockage</span>
            <strong>{Math.round(snapshot.cityContext.blockage_score * 100)}%</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

