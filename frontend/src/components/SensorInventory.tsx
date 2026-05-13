import { Bus, Camera, CloudRain, Database, RadioTower } from "lucide-react";
import type { Snapshot } from "../types";

export function SensorInventory({ snapshot }: { snapshot: Snapshot }) {
  const items = [
    { label: "Fleet sensor nodes", value: snapshot.system.fleetSensorCount, icon: Bus },
    { label: "Pipe acoustic nodes", value: snapshot.system.pipeSensorCount, icon: RadioTower },
    { label: "Camera junctions", value: snapshot.system.cameraJunctionCount, icon: Camera },
    { label: "Weather cells", value: snapshot.system.weatherCellCount, icon: CloudRain }
  ];

  return (
    <section className="sensor-inventory">
      <div className="inventory-total">
        <Database size={18} />
        <span>Live telemetry packets</span>
        <strong>{snapshot.system.activeTelemetryCount}</strong>
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="inventory-item">
            <Icon size={18} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        );
      })}
    </section>
  );
}

