import { CloudRain, Wind } from "lucide-react";
import type { Snapshot, WeatherCell } from "../types";
import { StatusPill } from "./StatusPill";

function tone(cell: WeatherCell) {
  if (cell.intensity > 0.72) return "red";
  if (cell.intensity > 0.48) return "amber";
  return "blue";
}

export function WeatherPanel({ snapshot }: { snapshot: Snapshot }) {
  const maxRain = Math.max(...snapshot.weatherCells.map((cell) => cell.rainfall_mm_hr), 1);
  return (
    <section className="panel weather-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <CloudRain size={15} />
            Rain radar simulator
          </span>
          <h2>Moving Storm Cells</h2>
        </div>
        <StatusPill tone={snapshot.cityContext.rainfall_mm_hr > 42 ? "red" : "blue"}>
          {snapshot.cityContext.rainfall_mm_hr.toFixed(1)} mm/hr
        </StatusPill>
      </div>

      <div className="weather-list">
        {snapshot.weatherCells.map((cell) => (
          <article key={cell.id} className="weather-cell">
            <div>
              <strong>{cell.name}</strong>
              <StatusPill tone={tone(cell)}>{cell.trend}</StatusPill>
            </div>
            <div className="rain-bar">
              <i style={{ width: `${Math.max(8, (cell.rainfall_mm_hr / maxRain) * 100)}%` }} />
            </div>
            <footer>
              <span>{cell.rainfall_mm_hr.toFixed(1)} mm/hr</span>
              <span>
                <Wind size={14} />
                {cell.speedKmph} km/h
              </span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

