import {
  Bus,
  CloudRain,
  Layers3,
  MapPinned,
  Navigation,
  RadioTower,
  Satellite,
  TrafficCone,
  Waves,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CircleF, GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { useMemo, useState } from "react";
import type {
  DispatchUnit,
  FloodZone,
  GeoPoint,
  Incident,
  PipeSensorReading,
  Snapshot,
  TrafficZone,
  VehicleReading
} from "../types";
import { StatusPill } from "./StatusPill";

interface LiveMapProps {
  snapshot: Snapshot;
  expanded?: boolean;
  compact?: boolean;
}

type LayerKey = "routes" | "trails" | "pipes" | "crews" | "weather" | "floods" | "traffic";

declare global {
  interface Window {
    __NADI_CONFIG__?: {
      googleMapsApiKey?: string;
    };
  }
}

const VIEWBOX = { width: 1000, height: 640 };
const GOOGLE_KEY = window.__NADI_CONFIG__?.googleMapsApiKey || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined);
const MAP_CENTER = { lat: 12.9716, lng: 77.5946 };
const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  gestureHandling: "greedy",
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ saturation: -40 }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#e8edf5" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#b6e0ef" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#eef3f7" }] }
  ]
};

function toLatLng(point: GeoPoint) {
  return { lat: point.lat, lng: point.lon };
}

function project(point: GeoPoint, bounds: Snapshot["mapBounds"]) {
  const x = ((point.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * VIEWBOX.width;
  const y = ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * VIEWBOX.height;
  return { x, y };
}

function polyline(points: GeoPoint[], bounds: Snapshot["mapBounds"]) {
  return points
    .map((point) => {
      const { x, y } = project(point, bounds);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function severityTone(severity: Incident["severity"]) {
  if (severity === "critical") return "red";
  if (severity === "high") return "amber";
  if (severity === "moderate") return "blue";
  return "green";
}

function riskColor(value: number, mode: "flood" | "traffic" | "vehicle" = "vehicle") {
  if (mode === "flood") return value > 0.74 ? "#0891b2" : value > 0.48 ? "#0ea5e9" : "#38bdf8";
  if (mode === "traffic") return value > 0.74 ? "#dc2626" : value > 0.52 ? "#f97316" : "#f59e0b";
  return value > 0.72 ? "#dc2626" : value > 0.52 ? "#f97316" : "#2563eb";
}

export function LiveMap({ snapshot, expanded = false, compact = false }: LiveMapProps) {
  const [selectedVehicle, setSelectedVehicle] = useState(snapshot.vehicles[0]?.vehicleId ?? "");
  const [selectedZone, setSelectedZone] = useState<string | null>(snapshot.floodZones[0]?.id ?? null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    routes: true,
    trails: true,
    pipes: true,
    crews: true,
    weather: true,
    floods: true,
    traffic: true
  });

  const selected = useMemo(
    () => snapshot.vehicles.find((vehicle) => vehicle.vehicleId === selectedVehicle) ?? snapshot.vehicles[0],
    [snapshot.vehicles, selectedVehicle]
  );
  const topIncident = snapshot.incidents[0];
  const topFlood = snapshot.floodZones[0];
  const topTraffic = snapshot.trafficZones[0];
  const selectedFlood = snapshot.floodZones.find((zone) => zone.id === selectedZone);
  const selectedTraffic = snapshot.trafficZones.find((zone) => zone.id === selectedZone);
  const useGoogle = Boolean(GOOGLE_KEY);

  const toggle = (layer: LayerKey) => setLayers((current) => ({ ...current, [layer]: !current[layer] }));

  return (
    <section className={`panel map-panel ${expanded ? "expanded" : ""} ${compact ? "compact" : ""}`}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            <Satellite size={15} />
            Live geospatial twin
          </span>
          <h2>Bengaluru Resilience Map</h2>
        </div>
        <div className="map-tools">
          {(Object.keys(layers) as LayerKey[]).map((layer) => (
            <button key={layer} className={layers[layer] ? "active" : ""} onClick={() => toggle(layer)} type="button">
              {layer}
            </button>
          ))}
        </div>
      </div>

      <div className="map-layout">
        <div className="map-canvas real-map" aria-label="Live map of sensor vehicles and predicted risk zones">
          {useGoogle ? (
            <GoogleMapSurface
              layers={layers}
              selectedVehicle={selected?.vehicleId}
              snapshot={snapshot}
              onSelectVehicle={setSelectedVehicle}
              onSelectZone={setSelectedZone}
            />
          ) : (
            <FallbackMap layers={layers} snapshot={snapshot} selectedVehicle={selected?.vehicleId} onSelectVehicle={setSelectedVehicle} onSelectZone={setSelectedZone} />
          )}
          {!useGoogle && (
            <div className="map-key-banner">
              <MapPinned size={15} />
              Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to use Google Maps. Fallback map is active.
            </div>
          )}
        </div>

        {!compact && <aside className="map-inspector">
          <div className="map-summary-grid">
            <MapStat icon={Bus} label="Fleet sensors" value={snapshot.system.fleetSensorCount} />
            <MapStat icon={RadioTower} label="Pipe nodes" value={snapshot.system.pipeSensorCount} />
            <MapStat icon={CloudRain} label="Storm cells" value={snapshot.system.weatherCellCount} />
            <MapStat icon={TrafficCone} label="Traffic zones" value={snapshot.trafficZones.length} />
          </div>

          {topIncident && (
            <div className="map-alert">
              <StatusPill tone={severityTone(topIncident.severity)}>{topIncident.severity}</StatusPill>
              <strong>{topIncident.title}</strong>
              <span>{topIncident.ward}</span>
            </div>
          )}

          {(selectedFlood || selectedTraffic || topFlood || topTraffic) && (
            <div className="zone-card">
              <span className="eyebrow">
                <Layers3 size={15} />
                Prediction layer
              </span>
              {selectedFlood ? (
                <FloodZoneReadout zone={selectedFlood} />
              ) : selectedTraffic ? (
                <TrafficZoneReadout zone={selectedTraffic} />
              ) : topFlood ? (
                <FloodZoneReadout zone={topFlood} />
              ) : topTraffic ? (
                <TrafficZoneReadout zone={topTraffic} />
              ) : null}
            </div>
          )}

          {selected && (
            <div className="vehicle-card">
              <div className="vehicle-card-top">
                <span className="vehicle-icon">
                  <Bus size={18} />
                </span>
                <div>
                  <strong>{selected.callSign}</strong>
                  <small>{selected.routeName}</small>
                </div>
              </div>
              <dl>
                <div>
                  <dt>GPS</dt>
                  <dd>
                    {selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                </div>
                <div>
                  <dt>Speed</dt>
                  <dd>{selected.speedKmph.toFixed(1)} km/h</dd>
                </div>
                <div>
                  <dt>Surface risk</dt>
                  <dd>{Math.round(selected.predictions.surface.score * 100)}%</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="fleet-list">
            {snapshot.vehicles.map((vehicle) => (
              <button
                key={vehicle.vehicleId}
                className={vehicle.vehicleId === selected?.vehicleId ? "active" : ""}
                onClick={() => setSelectedVehicle(vehicle.vehicleId)}
                type="button"
              >
                <span>{vehicle.vehicleId}</span>
                <small>{vehicle.speedKmph.toFixed(0)} km/h · {Math.round(vehicle.predictions.traffic.score * 100)}% traffic</small>
              </button>
            ))}
          </div>
        </aside>}
      </div>
    </section>
  );
}

function GoogleMapSurface({
  snapshot,
  layers,
  selectedVehicle,
  onSelectVehicle,
  onSelectZone
}: {
  snapshot: Snapshot;
  layers: Record<LayerKey, boolean>;
  selectedVehicle?: string;
  onSelectVehicle: (id: string) => void;
  onSelectZone: (id: string) => void;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_KEY ?? "",
    id: "nadi-google-map"
  });

  // Suppress Google Maps API error overlay
  // Remove the default error overlay by hiding the div with class 'gm-style-cc' and the error dialog
  if (typeof window !== "undefined") {
    setTimeout(() => {
      const style = document.createElement("style");
      style.innerHTML = `.gm-style-cc, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top, .gm-style .gm-style-cc, .gm-style .gm-style-mtc, .gm-style .gm-style-mtc button, .gm-style .gm-bundled-control-on-bottom, .gm-style .gm-bundled-control-on-top { display: none !important; }`;
      document.head.appendChild(style);
    }, 1000);
  }

  if (loadError) {
    return <FallbackMap layers={layers} snapshot={snapshot} selectedVehicle={selectedVehicle} onSelectVehicle={onSelectVehicle} onSelectZone={onSelectZone} />;
  }

  if (!isLoaded) {
    return (
      <div className="map-loading">
        <Satellite size={24} />
        <strong>Loading Google Maps</strong>
      </div>
    );
  }

  return (
    <GoogleMap center={MAP_CENTER} zoom={12} mapContainerClassName="google-map" options={MAP_OPTIONS}>
      <GoogleMapLayers
        layers={layers}
        selectedVehicle={selectedVehicle}
        snapshot={snapshot}
        onSelectVehicle={onSelectVehicle}
        onSelectZone={onSelectZone}
      />
    </GoogleMap>
  );
}

function GoogleMapLayers({
  snapshot,
  layers,
  selectedVehicle,
  onSelectVehicle,
  onSelectZone
}: {
  snapshot: Snapshot;
  layers: Record<LayerKey, boolean>;
  selectedVehicle?: string;
  onSelectVehicle: (id: string) => void;
  onSelectZone: (id: string) => void;
}) {
  return (
    <>
      {layers.weather &&
        snapshot.weatherCells.map((cell) => (
          <CircleF
            key={cell.id}
            center={{ lat: cell.lat, lng: cell.lon }}
            radius={cell.radius_m}
            options={{
              fillColor: "#2563eb",
              fillOpacity: 0.08 + cell.intensity * 0.13,
              strokeColor: "#1d4ed8",
              strokeOpacity: 0.28,
              strokeWeight: 1.5
            }}
          />
        ))}

      {layers.floods &&
        snapshot.floodZones.map((zone) => (
          <CircleF
            key={zone.id}
            center={{ lat: zone.lat, lng: zone.lon }}
            radius={zone.radius_m}
            onClick={() => onSelectZone(zone.id)}
            options={{
              fillColor: riskColor(zone.risk, "flood"),
              fillOpacity: 0.2,
              strokeColor: riskColor(zone.risk, "flood"),
              strokeOpacity: 0.74,
              strokeWeight: 2
            }}
          />
        ))}

      {layers.traffic &&
        snapshot.trafficZones.map((zone) => (
          <CircleF
            key={zone.id}
            center={{ lat: zone.lat, lng: zone.lon }}
            radius={zone.radius_m}
            onClick={() => onSelectZone(zone.id)}
            options={{
              fillColor: riskColor(zone.congestion, "traffic"),
              fillOpacity: 0.18,
              strokeColor: riskColor(zone.congestion, "traffic"),
              strokeOpacity: 0.74,
              strokeWeight: 2
            }}
          />
        ))}

      {layers.routes &&
        snapshot.routes.map((route) => (
          <PolylineF
            key={route.id}
            path={route.points.map(toLatLng)}
            options={{
              strokeColor: route.color,
              strokeOpacity: 0.48,
              strokeWeight: 4
            }}
          />
        ))}

      {layers.trails &&
        snapshot.vehicles.map((vehicle) => (
          <PolylineF
            key={`${vehicle.vehicleId}-trail`}
            path={vehicle.trail.map(toLatLng)}
            options={{
              strokeColor: vehicle.vehicleId === selectedVehicle ? "#111827" : "#64748b",
              strokeOpacity: vehicle.vehicleId === selectedVehicle ? 0.78 : 0.38,
              strokeWeight: vehicle.vehicleId === selectedVehicle ? 4 : 2
            }}
          />
        ))}

      {layers.pipes &&
        snapshot.pipeSensors.map((pipe) => (
          <MarkerF
            key={pipe.sensorId}
            position={{ lat: pipe.lat, lng: pipe.lon }}
            title={`${pipe.sensorId} · ${pipe.line}`}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: pipe.prediction.score > 0.68 ? "#dc2626" : "#0f766e",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 6
            }}
          />
        ))}

      {layers.crews &&
        snapshot.dispatchUnits.map((crew) => (
          <MarkerF
            key={crew.unitId}
            position={{ lat: crew.lat, lng: crew.lon }}
            title={`${crew.name} · ${crew.status}`}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              fillColor: crew.status === "on-site" ? "#059669" : crew.status === "en-route" ? "#2563eb" : "#64748b",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 5
            }}
          />
        ))}

      {snapshot.incidents.slice(0, 10).map((incident) => (
        <MarkerF
          key={incident.id}
          position={{ lat: incident.lat, lng: incident.lon }}
          title={`${incident.title} · ${Math.round(incident.score * 100)}%`}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: riskColor(incident.score),
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
            scale: incident.severity === "critical" ? 10 : 8
          }}
        />
      ))}

      {snapshot.vehicles.map((vehicle) => (
        <MarkerF
          key={vehicle.vehicleId}
          position={{ lat: vehicle.lat, lng: vehicle.lon }}
          title={`${vehicle.vehicleId} · ${vehicle.lat.toFixed(5)}, ${vehicle.lon.toFixed(5)}`}
          onClick={() => onSelectVehicle(vehicle.vehicleId)}
          icon={{
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            rotation: vehicle.heading,
            fillColor: riskColor(Math.max(vehicle.predictions.surface.score, vehicle.predictions.traffic.score)),
            fillOpacity: 1,
            strokeColor: vehicle.vehicleId === selectedVehicle ? "#111827" : "#ffffff",
            strokeWeight: vehicle.vehicleId === selectedVehicle ? 3 : 2,
            scale: vehicle.vehicleId === selectedVehicle ? 6 : 5
          }}
          label={{
            text: vehicle.vehicleId.replace("NN-", ""),
            color: "#111827",
            fontWeight: "800",
            fontSize: "11px"
          }}
        />
      ))}
    </>
  );
}

function FallbackMap({
  snapshot,
  layers,
  selectedVehicle,
  onSelectVehicle,
  onSelectZone
}: {
  snapshot: Snapshot;
  layers: Record<LayerKey, boolean>;
  selectedVehicle?: string;
  onSelectVehicle: (id: string) => void;
  onSelectZone: (id: string) => void;
}) {
  return (
    <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="img" className="fallback-svg-map">
      <defs>
        <pattern id="minor-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#d9d4c7" strokeWidth="1" opacity="0.7" />
        </pattern>
      </defs>
      <rect width="1000" height="640" rx="8" fill="#eef3f7" />
      <rect width="1000" height="640" fill="url(#minor-grid)" />
      <path d="M70 500 C200 420 250 350 360 330 S520 310 650 210 820 150 950 85" fill="none" stroke="#b6e0ef" strokeWidth="18" opacity="0.55" />
      <path d="M110 120 C245 90 350 118 475 82 S720 50 890 116" fill="none" stroke="#ffffff" strokeWidth="10" opacity="0.95" />
      <path d="M185 580 C250 470 395 425 480 340 S625 220 828 185" fill="none" stroke="#ffffff" strokeWidth="10" opacity="0.95" />

      {layers.weather &&
        snapshot.weatherCells.map((cell) => {
          const p = project(cell, snapshot.mapBounds);
          return <circle key={cell.id} cx={p.x} cy={p.y} r={Math.max(28, cell.radius_m / 42)} fill="#2563eb" opacity={0.08 + cell.intensity * 0.14} stroke="#2563eb" strokeWidth="2" />;
        })}

      {layers.floods &&
        snapshot.floodZones.map((zone) => {
          const p = project(zone, snapshot.mapBounds);
          return (
            <circle
              key={zone.id}
              cx={p.x}
              cy={p.y}
              r={Math.max(20, zone.radius_m / 38)}
              fill={riskColor(zone.risk, "flood")}
              opacity="0.22"
              stroke={riskColor(zone.risk, "flood")}
              strokeWidth="3"
              onClick={() => onSelectZone(zone.id)}
            />
          );
        })}

      {layers.traffic &&
        snapshot.trafficZones.map((zone) => {
          const p = project(zone, snapshot.mapBounds);
          return (
            <circle
              key={zone.id}
              cx={p.x}
              cy={p.y}
              r={Math.max(18, zone.radius_m / 46)}
              fill={riskColor(zone.congestion, "traffic")}
              opacity="0.2"
              stroke={riskColor(zone.congestion, "traffic")}
              strokeWidth="3"
              onClick={() => onSelectZone(zone.id)}
            />
          );
        })}

      {layers.routes &&
        snapshot.routes.map((route) => (
          <polyline key={route.id} points={polyline(route.points, snapshot.mapBounds)} fill="none" stroke={route.color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.42" />
        ))}

      {layers.trails &&
        snapshot.vehicles.map((vehicle) => (
          <polyline
            key={`${vehicle.vehicleId}-trail`}
            points={polyline(vehicle.trail, snapshot.mapBounds)}
            fill="none"
            stroke={vehicle.vehicleId === selectedVehicle ? "#111827" : "#64748b"}
            strokeWidth={vehicle.vehicleId === selectedVehicle ? 4 : 2}
            strokeLinecap="round"
            opacity={vehicle.vehicleId === selectedVehicle ? 0.88 : 0.42}
          />
        ))}

      {layers.pipes && snapshot.pipeSensors.map((pipe) => <PipeMarker key={pipe.sensorId} pipe={pipe} bounds={snapshot.mapBounds} />)}
      {snapshot.incidents.slice(0, 10).map((incident) => <IncidentMarker key={incident.id} incident={incident} bounds={snapshot.mapBounds} />)}
      {layers.crews && snapshot.dispatchUnits.map((crew) => <CrewMarker key={crew.unitId} crew={crew} bounds={snapshot.mapBounds} />)}
      {snapshot.vehicles.map((vehicle) => (
        <VehicleMarker
          key={vehicle.vehicleId}
          vehicle={vehicle}
          bounds={snapshot.mapBounds}
          selected={vehicle.vehicleId === selectedVehicle}
          onSelect={() => onSelectVehicle(vehicle.vehicleId)}
        />
      ))}
    </svg>
  );
}

function VehicleMarker({
  vehicle,
  bounds,
  selected,
  onSelect
}: {
  vehicle: VehicleReading;
  bounds: Snapshot["mapBounds"];
  selected: boolean;
  onSelect: () => void;
}) {
  const { x, y } = project(vehicle, bounds);
  const risk = Math.max(vehicle.predictions.surface.score, vehicle.predictions.traffic.score);
  const fill = riskColor(risk);
  return (
    <g className="vehicle-marker" transform={`translate(${x}, ${y}) rotate(${vehicle.heading})`} onClick={onSelect} tabIndex={0} role="button">
      <title>
        {vehicle.callSign} - {vehicle.lat.toFixed(5)}, {vehicle.lon.toFixed(5)}
      </title>
      <circle r={selected ? 15 : 12} fill="#ffffff" stroke={fill} strokeWidth={selected ? 5 : 4} />
      <path d="M0 -8 L5 8 L0 5 L-5 8 Z" fill={fill} />
    </g>
  );
}

function PipeMarker({ pipe, bounds }: { pipe: PipeSensorReading; bounds: Snapshot["mapBounds"] }) {
  const { x, y } = project(pipe, bounds);
  const color = pipe.prediction.score > 0.68 ? "#dc2626" : pipe.prediction.score > 0.48 ? "#f97316" : "#0f766e";
  return (
    <g transform={`translate(${x}, ${y})`}>
      <title>
        {pipe.sensorId} - {pipe.line} - {Math.round(pipe.prediction.score * 100)}%
      </title>
      <circle r="8" fill="#ffffff" stroke={color} strokeWidth="3" />
      <circle r="3" fill={color} />
    </g>
  );
}

function IncidentMarker({ incident, bounds }: { incident: Incident; bounds: Snapshot["mapBounds"] }) {
  const { x, y } = project(incident, bounds);
  const color = riskColor(incident.score);
  return (
    <g className="incident-marker" transform={`translate(${x}, ${y})`}>
      <title>
        {incident.title} - {Math.round(incident.score * 100)}%
      </title>
      <circle r="24" fill={color} opacity="0.12" />
      <circle r="15" fill={color} opacity="0.18" />
      <path d="M0 -11 L11 0 L0 11 L-11 0 Z" fill="#ffffff" stroke={color} strokeWidth="4" />
    </g>
  );
}

function CrewMarker({ crew, bounds }: { crew: DispatchUnit; bounds: Snapshot["mapBounds"] }) {
  const { x, y } = project(crew, bounds);
  const color = crew.status === "available" ? "#64748b" : crew.status === "on-site" ? "#059669" : "#2563eb";
  return (
    <g transform={`translate(${x}, ${y})`}>
      <title>
        {crew.name} - {crew.status}
      </title>
      <rect x="-11" y="-11" width="22" height="22" rx="6" fill="#ffffff" stroke={color} strokeWidth="3" />
      {crew.status === "available" ? <Navigation size={12} x={-6} y={-6} color={color} /> : <Wrench size={12} x={-6} y={-6} color={color} />}
    </g>
  );
}

function MapStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="map-stat">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FloodZoneReadout({ zone }: { zone: FloodZone }) {
  return (
    <>
      <strong>{zone.name}</strong>
      <p>{zone.cause}</p>
      <dl>
        <div>
          <dt>Flood probability</dt>
          <dd>{Math.round(zone.risk * 100)}%</dd>
        </div>
        <div>
          <dt>Predicted water</dt>
          <dd>{zone.predictedWaterCm.toFixed(1)} cm</dd>
        </div>
        <div>
          <dt>Rainfall</dt>
          <dd>{zone.rainfallMmHr.toFixed(1)} mm/hr</dd>
        </div>
        <div>
          <dt>ETA</dt>
          <dd>{zone.etaMinutes} min</dd>
        </div>
      </dl>
      <StatusPill tone={zone.risk > 0.72 ? "red" : zone.risk > 0.48 ? "amber" : "blue"}>
        <Waves size={13} />
        {zone.trend}
      </StatusPill>
    </>
  );
}

function TrafficZoneReadout({ zone }: { zone: TrafficZone }) {
  return (
    <>
      <strong>{zone.name}</strong>
      <p>{zone.reason}</p>
      <dl>
        <div>
          <dt>Jam probability</dt>
          <dd>{Math.round(zone.congestion * 100)}%</dd>
        </div>
        <div>
          <dt>Predicted speed</dt>
          <dd>{zone.predictedSpeedKmph.toFixed(1)} km/h</dd>
        </div>
        <div>
          <dt>Jam length</dt>
          <dd>{zone.jamLengthKm.toFixed(1)} km</dd>
        </div>
        <div>
          <dt>Vehicles</dt>
          <dd>{zone.vehicleCount}</dd>
        </div>
      </dl>
      <StatusPill tone={zone.congestion > 0.72 ? "red" : zone.congestion > 0.48 ? "amber" : "blue"}>
        <TrafficCone size={13} />
        ETA {zone.jamEtaMinutes} min
      </StatusPill>
    </>
  );
}
