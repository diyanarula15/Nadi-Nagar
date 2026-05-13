import { BatteryCharging, Bus, Cpu, Gauge } from "lucide-react";
import type { Snapshot, VehicleReading } from "../types";
import { StatusPill } from "./StatusPill";

function fleetTone(vehicle: VehicleReading) {
  const risk = Math.max(vehicle.predictions.surface.score, vehicle.predictions.traffic.score);
  if (risk >= 0.72) return "red";
  if (risk >= 0.52) return "amber";
  return "green";
}

export function FleetTable({ snapshot }: { snapshot: Snapshot }) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <Bus size={15} />
            Smart fleet AI
          </span>
          <h2>Sensor Vehicles</h2>
        </div>
        <StatusPill tone="green">{snapshot.system.bandwidthMode}</StatusPill>
      </div>

      <div className="data-table" role="table" aria-label="Sensor vehicle readings">
        <div className="table-head" role="row">
          <span>Fleet</span>
          <span>GPS</span>
          <span>Speed</span>
          <span>Road Dip</span>
          <span>Risk</span>
          <span>Health</span>
        </div>
        {snapshot.vehicles.map((vehicle) => (
          <div className="table-row" role="row" key={vehicle.vehicleId}>
            <span>
              <Bus size={16} />
              <strong>{vehicle.vehicleId}</strong>
              <small>{vehicle.type}</small>
            </span>
            <span>
              {vehicle.lat.toFixed(4)}, {vehicle.lon.toFixed(4)}
              <small>{vehicle.ward}</small>
            </span>
            <span>
              <Gauge size={15} />
              {vehicle.speedKmph.toFixed(1)} km/h
            </span>
            <span>{vehicle.sensors.road_dip_mm.toFixed(1)} mm</span>
            <span>
              <StatusPill tone={fleetTone(vehicle)}>
                {Math.round(Math.max(vehicle.predictions.surface.score, vehicle.predictions.traffic.score) * 100)}%
              </StatusPill>
            </span>
            <span>
              <BatteryCharging size={15} />
              {Math.round(vehicle.health * 100)}%
              <Cpu size={15} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

