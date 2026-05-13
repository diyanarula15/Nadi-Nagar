import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Zap, CheckCircle, AlertTriangle, Calendar } from "lucide-react";

interface Analytics {
  costSavings: {
    estimatedEmergencyRepairsPrevented: number;
    estimatedFloodEventsPrevented: number;
    costPerEmergencyRepair: number;
    costPerFlooding: number;
    totalSpentOnPrevention: number;
    totalSavings: number;
    netSavings: number;
    currencySavings: string;
  };
  incidentsRepaired: number;
  incidentsPrevented: number;
  incidentsByType: Record<string, number>;
  slaComplianceRate: number;
  slaBreaches: number;
  averageRepairTime: string;
  timestamp: string;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <Zap className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div style={{ padding: "24px" }}>
        <div style={{ backgroundColor: "#fee", borderRadius: "8px", padding: "12px", color: "#c00" }}>
          Failed to load analytics
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const incidentTypes = Object.entries(analytics.incidentsByType).map(([type, count]) => ({
    type: type.replace(/_/g, " ").toUpperCase(),
    count,
  }));

  return (
    <div style={{ height: "100%", overflow: "auto", backgroundColor: "#f9fafb", padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "700", color: "#111" }}>
          📊 Cost Savings & Impact Analytics
        </h1>
        <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
          Real-time data on infrastructure prevention & financial impact
        </p>
      </div>

      {/* Main KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {/* Net Savings */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div style={{ backgroundColor: "#10b981", borderRadius: "8px", padding: "8px", color: "white" }}>
              <DollarSign size={20} />
            </div>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#666" }}>NET SAVINGS</p>
          </div>
          <p style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "#10b981", marginBottom: "4px" }}>
            {analytics.costSavings.currencySavings}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            {analytics.costSavings.totalSavings > 0 ? "✓ Positive ROI" : "Investment phase"}
          </p>
        </div>

        {/* Emergency Repairs Prevented */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div style={{ backgroundColor: "#3b82f6", borderRadius: "8px", padding: "8px", color: "white" }}>
              <CheckCircle size={20} />
            </div>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#666" }}>REPAIRS PREVENTED</p>
          </div>
          <p style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "#3b82f6", marginBottom: "4px" }}>
            {analytics.costSavings.estimatedEmergencyRepairsPrevented}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            Emergency repairs averted
          </p>
        </div>

        {/* Flood Events Prevented */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div style={{ backgroundColor: "#8b5cf6", borderRadius: "8px", padding: "8px", color: "white" }}>
              <AlertTriangle size={20} />
            </div>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#666" }}>FLOODS PREVENTED</p>
          </div>
          <p style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "#8b5cf6", marginBottom: "4px" }}>
            {analytics.costSavings.estimatedFloodEventsPrevented}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            Major flooding events prevented
          </p>
        </div>

        {/* SLA Compliance */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div style={{ backgroundColor: "#f59e0b", borderRadius: "8px", padding: "8px", color: "white" }}>
              <TrendingUp size={20} />
            </div>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#666" }}>SLA COMPLIANCE</p>
          </div>
          <p style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "#f59e0b", marginBottom: "4px" }}>
            {analytics.slaComplianceRate}%
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            {analytics.slaBreaches} breaches so far
          </p>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "24px" }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: "#111" }}>
          💰 Financial Breakdown
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
          <div style={{ padding: "12px", backgroundColor: "#f0f9ff", borderRadius: "8px", borderLeft: "4px solid #3b82f6" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "600", color: "#666" }}>
              Total Spending (Prevention)
            </p>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#3b82f6" }}>
              {formatCurrency(analytics.costSavings.totalSpentOnPrevention)}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#666" }}>
              {analytics.incidentsRepaired} incidents repaired
            </p>
          </div>

          <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "8px", borderLeft: "4px solid #f59e0b" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "600", color: "#666" }}>
              Emergency Repairs Saved
            </p>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#f59e0b" }}>
              {formatCurrency(
                analytics.costSavings.estimatedEmergencyRepairsPrevented *
                  analytics.costSavings.costPerEmergencyRepair
              )}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#666" }}>
              At ₹10 L per repair
            </p>
          </div>

          <div style={{ padding: "12px", backgroundColor: "#f3f0ff", borderRadius: "8px", borderLeft: "4px solid #8b5cf6" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "600", color: "#666" }}>
              Flood Damage Prevented
            </p>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#8b5cf6" }}>
              {formatCurrency(
                analytics.costSavings.estimatedFloodEventsPrevented *
                  analytics.costSavings.costPerFlooding
              )}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#666" }}>
              At ₹2.25 Cr per event
            </p>
          </div>

          <div style={{ padding: "12px", backgroundColor: "#f0fdf4", borderRadius: "8px", borderLeft: "4px solid #10b981" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "600", color: "#666" }}>
              NET SAVINGS
            </p>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#10b981" }}>
              {formatCurrency(analytics.costSavings.netSavings)}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#666" }}>
              Total savings to city
            </p>
          </div>
        </div>
      </div>

      {/* Incident Statistics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700", color: "#111" }}>
            📈 Incident Statistics
          </h3>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: "600", color: "#666" }}>
              Incidents Repaired
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  flex: 1,
                  height: "24px",
                  backgroundColor: "#dbeafe",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    backgroundColor: "#3b82f6",
                    width: `${Math.min(100, (analytics.incidentsRepaired / 50) * 100)}%`,
                  }}
                />
              </div>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#111", minWidth: "40px" }}>
                {analytics.incidentsRepaired}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: "600", color: "#666" }}>
              Incidents Prevented
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  flex: 1,
                  height: "24px",
                  backgroundColor: "#d1fae5",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    backgroundColor: "#10b981",
                    width: `${Math.min(100, (analytics.incidentsPrevented / 50) * 100)}%`,
                  }}
                />
              </div>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#111", minWidth: "40px" }}>
                {analytics.incidentsPrevented}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: "600", color: "#666" }}>
              Average Repair Time
            </p>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111" }}>
              {analytics.averageRepairTime}
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "700", color: "#111" }}>
            🏷️ Incidents by Type
          </h3>

          {incidentTypes.length === 0 ? (
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>No incident data yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {incidentTypes.map((item) => (
                <div key={item.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#666" }}>{item.type}</span>
                  <span
                    style={{
                      padding: "4px 12px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#111",
                    }}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div style={{ textAlign: "center", marginTop: "32px", color: "#666", fontSize: "12px" }}>
        <p style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <Calendar size={14} />
          Last updated: {new Date(analytics.timestamp).toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}
