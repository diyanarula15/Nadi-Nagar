import { useMemo, useState, useEffect } from "react";
import { Activity, Bell, CloudRain, LogOut, Search, TrafficCone, TriangleAlert, Truck, Waves } from "lucide-react";
import { AlertFeed } from "./components/AlertFeed";
import { DigitalTwinPanel } from "./components/DigitalTwinPanel";
import { DispatchPanel } from "./components/DispatchPanel";
import { FleetTable } from "./components/FleetTable";
import { ForecastPanel } from "./components/ForecastPanel";
import { LiveMap } from "./components/LiveMap";
import { MetricCard } from "./components/MetricCard";
import { PublicSlaBoard } from "./components/PublicSlaBoard";
import { SensorInventory } from "./components/SensorInventory";
import { Sidebar } from "./components/Sidebar";
import { StatusPill } from "./components/StatusPill";
import { TrafficPredictionPanel } from "./components/TrafficPredictionPanel";
import { WeatherPanel } from "./components/WeatherPanel";
import { WorkOrderPanel } from "./components/WorkOrderPanel";
import { CitizenPortal } from "./components/CitizenPortal";
import { PhotoUploadPanel } from "./components/PhotoUploadPanel";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { LandingPage } from "./components/LandingPage";
import { useNadiStream } from "./hooks/useNadiStream";
import type { Snapshot, ViewKey } from "./types";

function timeLabel(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StreamShell() {
  return (
    <div className="loading-shell">
      <Activity size={34} />
      <strong>Nadi-Nagar is booting the city twin</strong>
      <span>Waiting for the Python sensor grid on port 8000.</span>
    </div>
  );
}

function MetricStrip({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="metric-grid">
      <MetricCard
        icon={Truck}
        label="Fleets Under Sensors"
        value={snapshot.system.fleetSensorCount.toLocaleString()}
        detail={`${snapshot.vehicles.filter((vehicle) => vehicle.status !== "edge-processing").length} rerouting or slowed`}
        tone="blue"
      />
      <MetricCard
        icon={TriangleAlert}
        label="Critical Preemptions"
        value={snapshot.system.criticalPreemptions.toString()}
        detail="Cross-validated alerts"
        tone="red"
      />
      <MetricCard
        icon={Waves}
        label="Flood Predictions"
        value={snapshot.floodZones.length.toString()}
        detail={`${snapshot.system.floodRisk} · ${snapshot.cityContext.rainfall_mm_hr.toFixed(1)} mm/hr`}
        tone="amber"
      />
      <MetricCard
        icon={TrafficCone}
        label="Jam Areas Predicted"
        value={snapshot.trafficZones.length.toString()}
        detail={`${snapshot.system.cameraJunctionCount} camera junctions watched`}
        tone="green"
      />
    </div>
  );
}

function Dashboard({ snapshot }: { snapshot: Snapshot }) {
  return (
    <>
      <MetricStrip snapshot={snapshot} />
      <div className="dashboard-grid home-grid">
        <LiveMap snapshot={snapshot} compact />
        <div className="home-rail">
          <WeatherPanel snapshot={snapshot} />
          <TrafficPredictionPanel snapshot={snapshot} />
          <DispatchPanel snapshot={snapshot} />
        </div>
      </div>
    </>
  );
}

function ViewRenderer({ active, snapshot, userType }: { active: ViewKey; snapshot: Snapshot; userType: string }) {
  // Citizens only see citizen portal
  if (userType === "citizen") {
    return <CitizenPortal />;
  }

  if (active === "map") {
    return (
      <>
        <LiveMap snapshot={snapshot} expanded />
        <TrafficPredictionPanel snapshot={snapshot} />
        <FleetTable snapshot={snapshot} />
      </>
    );
  }
  if (active === "alerts") {
    return (
      <div className="two-column">
        <AlertFeed snapshot={snapshot} />
        <DigitalTwinPanel snapshot={snapshot} />
        <PublicSlaBoard snapshot={snapshot} />
      </div>
    );
  }
  if (active === "fleet") {
    return (
      <div className="two-column">
        <FleetTable snapshot={snapshot} />
        <DispatchPanel snapshot={snapshot} />
        <SensorInventory snapshot={snapshot} />
      </div>
    );
  }
  if (active === "flood") {
    return (
      <div className="two-column">
        <ForecastPanel snapshot={snapshot} expanded />
        <WeatherPanel snapshot={snapshot} />
        <TrafficPredictionPanel snapshot={snapshot} />
        <DigitalTwinPanel snapshot={snapshot} />
      </div>
    );
  }
  if (active === "public") {
    return (
      <div className="two-column">
        <PublicSlaBoard snapshot={snapshot} />
        <AlertFeed snapshot={snapshot} />
      </div>
    );
  }
  if (active === "work-orders") {
    return <WorkOrderPanel />;
  }
  if (active === "photos") {
    return <PhotoUploadPanel />;
  }
  if (active === "citizen") {
    return <CitizenPortal />;
  }
  if (active === "analytics") {
    return <AnalyticsDashboard />;
  }
  return <Dashboard snapshot={snapshot} />;
}

export default function App() {
  const [active, setActive] = useState<ViewKey>("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("userType"));
  const [userType, setUserType] = useState(localStorage.getItem("userType") || "operator");
  const { snapshot, streamState } = useNadiStream();

  // Must call all hooks BEFORE any conditional returns
  const topAlert = useMemo(() => snapshot?.incidents[0], [snapshot]);

  const handleLogout = () => {
    localStorage.removeItem("userType");
    setIsLoggedIn(false);
    setUserType("operator");
    setActive("dashboard");
  };

  useEffect(() => {
    // Check if user is logged in
    const savedUserType = localStorage.getItem("userType");
    if (savedUserType) {
      setIsLoggedIn(true);
      setUserType(savedUserType);
      // Navigate to citizen portal if citizen, dashboard if operator
      if (savedUserType === "citizen") {
        setActive("citizen");
      } else {
        setActive("dashboard");
      }
    }
  }, []);

  if (!isLoggedIn) {
    return <LandingPage onNavigate={(view) => {
      const newUserType = localStorage.getItem("userType") || "operator";
      setUserType(newUserType);
      setIsLoggedIn(true);
      setActive(view);
    }} />;
  }

  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActive} userType={userType} />

      <main className="main-shell app-portal">
        <header className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {userType !== "citizen" && (
            <>
              <label className="search-box">
                <Search size={17} />
                <input placeholder="Search coordinates, fleet ID, ward, or alert..." />
              </label>
              <div className="topbar-actions">
                {snapshot && <span className="timestamp">Demo clock {timeLabel(snapshot.timestamp)}</span>}
                <StatusPill tone={streamState === "live" ? "green" : streamState === "offline" ? "red" : "amber"}>
                  {streamState}
                </StatusPill>
                <button type="button" className="icon-button" aria-label="Notifications">
                  <Bell size={18} />
                  {topAlert && <i />}
                </button>
              </div>
            </>
          )}
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={14} />
            Logout
          </button>
        </header>

        {!snapshot ? (
          <StreamShell />
        ) : (
          <div className="content">
            {userType !== "citizen" && (
              <section className="hero-strip">
                <div>
                  <span className="eyebrow">
                    <Activity size={15} />
                    Control Center Overview
                  </span>
                  <h1>Nadi-Nagar Urban Resilience Grid</h1>
                  <p>
                    {topAlert
                      ? `${topAlert.title} in ${topAlert.ward} is the current highest-priority preemption.`
                      : "All active corridors are inside baseline."}
                  </p>
                </div>
                <div className="hero-status">
                  <StatusPill tone={snapshot.cityContext.crowd_context ? "amber" : "green"}>
                    {snapshot.cityContext.crowd_context ? "festival normalization" : "normal context"}
                  </StatusPill>
                  <StatusPill tone={snapshot.cityContext.rainfall_mm_hr > 42 ? "red" : "blue"}>
                    <CloudRain size={13} />
                    live rain
                  </StatusPill>
                <strong>{Math.round(snapshot.floodPrediction.confidence * 100)}%</strong>
                <span>forecast confidence</span>
              </div>
            </section>
            )}
            <ViewRenderer active={active} snapshot={snapshot} userType={userType} />
          </div>
        )}
      </main>
    </div>
  );
}
