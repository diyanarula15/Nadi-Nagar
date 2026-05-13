export type Severity = "critical" | "high" | "moderate" | "nominal";
export type ViewKey = "dashboard" | "map" | "alerts" | "fleet" | "flood" | "public" | "work-orders" | "citizen" | "photos" | "analytics";

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Route {
  id: string;
  name: string;
  color: string;
  points: GeoPoint[];
}

export interface ModelPrediction {
  model: string;
  score: number;
  severity: Severity;
  confidence: number;
  explanation: string[];
}

export interface VehicleReading {
  vehicleId: string;
  callSign: string;
  type: string;
  routeId: string;
  routeName: string;
  lat: number;
  lon: number;
  heading: number;
  ward: string;
  speedKmph: number;
  health: number;
  battery: number;
  status: string;
  trail: GeoPoint[];
  sensors: {
    road_dip_mm: number;
    crack_score: number;
    vibration_g: number;
    surface_moisture: number;
    traffic_entropy: number;
    hard_brake_rate: number;
    lane_cut_score: number;
    speed_variance: number;
    crowd_context: number;
  };
  predictions: {
    surface: ModelPrediction;
    traffic: ModelPrediction;
  };
}

export interface PipeSensorReading {
  sensorId: string;
  lat: number;
  lon: number;
  ward: string;
  line: string;
  lastSeen: string;
  health: number;
  sensors: {
    hiss_db: number;
    knock_rate: number;
    pressure_drop: number;
    flow_variance: number;
  };
  prediction: ModelPrediction;
}

export interface Incident {
  id: string;
  kind: "road_stress" | "pipe_leak" | "flood_risk" | "traffic_entropy";
  title: string;
  description: string;
  lat: number;
  lon: number;
  ward: string;
  severity: Severity;
  confidence: number;
  score: number;
  source: string;
  evidence: string[];
  status: string;
  operatorAck: boolean;
  createdAt: string;
  updatedAt: string;
  slaHours: number;
  ageHours: number;
  slaState: "green" | "amber" | "red";
}

export interface DispatchUnit {
  unitId: string;
  name: string;
  lat: number;
  lon: number;
  skill: string;
  status: "available" | "en-route" | "on-site";
  targetIncidentId: string | null;
  targetIncident?: string | null;
  etaMinutes: number | null;
}

export interface FloodForecastPoint {
  minute: number;
  risk: number;
  waterLevel: number;
}

export interface WeatherCell {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radius_m: number;
  intensity: number;
  rainfall_mm_hr: number;
  speedKmph: number;
  heading: number;
  trend: "intensifying" | "weakening" | "tracking";
}

export interface FloodZone {
  id: string;
  name: string;
  ward: string;
  lat: number;
  lon: number;
  radius_m: number;
  risk: number;
  predictedWaterCm: number;
  rainfallMmHr: number;
  etaMinutes: number;
  trend: "rising" | "watch";
  cause: string;
}

export interface TrafficZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radius_m: number;
  congestion: number;
  predictedSpeedKmph: number;
  jamEtaMinutes: number;
  jamLengthKm: number;
  vehicleCount: number;
  reason: string;
}

export interface Snapshot {
  timestamp: string;
  tick: number;
  mapBounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  system: {
    online: boolean;
    activeEdgeFleets: number;
    criticalPreemptions: number;
    floodRisk: string;
    sensorHealth: number;
    bandwidthMode: string;
    fleetSensorCount: number;
    pipeSensorCount: number;
    cameraJunctionCount: number;
    weatherCellCount: number;
    activeTelemetryCount: number;
  };
  cityContext: {
    rainfall_mm_hr: number;
    drain_level_cm: number;
    blockage_score: number;
    upstream_velocity: number;
    surface_moisture: number;
    crowd_context: number;
  };
  routes: Route[];
  vehicles: VehicleReading[];
  pipeSensors: PipeSensorReading[];
  weatherCells: WeatherCell[];
  floodZones: FloodZone[];
  trafficZones: TrafficZone[];
  incidents: Incident[];
  dispatchUnits: DispatchUnit[];
  floodForecast: FloodForecastPoint[];
  floodPrediction: ModelPrediction;
  modelHealth: {
    surfaceMeanRisk: number;
    pipeMeanRisk: number;
    floodMemory: number;
    recentFloodTrend: number;
  };
  publicBoard: Incident[];
}
