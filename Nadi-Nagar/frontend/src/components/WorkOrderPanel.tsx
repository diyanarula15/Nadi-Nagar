import { useEffect, useState } from "react";
import { Wrench, CheckCircle, AlertCircle, Clock, MapPin, Zap } from "lucide-react";

interface WorkOrder {
  workOrderId: string;
  incidentId: string;
  crewId: string;
  crewName: string;
  incidentTitle: string;
  ward: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  eta?: number;
  lat?: number;
  lon?: number;
}

interface Crew {
  unitId: string;
  name: string;
  status: string;
  lat: number;
  lon: number;
  skill: string;
  targetIncident?: string;
  etaMinutes?: number;
}

export function WorkOrderPanel() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workOrderRes, crewRes] = await Promise.all([
          fetch("/api/work-orders"),
          fetch("/api/crews"),
        ]);
        if (workOrderRes.ok && crewRes.ok) {
          const workOrderData = await workOrderRes.json();
          const crewData = await crewRes.json();
          setWorkOrders(workOrderData);
          setCrews(crewData);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleVerifyRepair = async (workOrderId: string, incidentId: string) => {
    try {
      const response = await fetch(`/api/work-orders/${workOrderId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId,
          confidence: 0.92,
          notes: verificationNotes,
          photoUrl: "https://example.com/after-repair.jpg",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert("✓ Repair verified! Payment will be released.");
        setSelectedWorkOrder(null);
        setVerificationNotes("");
        // Refresh data
        const workOrderRes = await fetch("/api/work-orders");
        if (workOrderRes.ok) {
          setWorkOrders(await workOrderRes.json());
        }
      } else {
        alert("❌ Verification failed");
      }
    } catch (err) {
      console.error("Verification error:", err);
      alert("❌ Error verifying repair");
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending_dispatch":
        return "#ef4444"; // red
      case "in_progress":
        return "#f59e0b"; // amber
      case "pending_verification":
        return "#8b5cf6"; // purple
      case "released":
        return "#10b981"; // green
      default:
        return "#6b7280"; // gray
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending_dispatch: "⏳ Pending Dispatch",
      in_progress: "🚚 In Progress",
      pending_verification: "📸 Awaiting Verification",
      released: "💰 Payment Released",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Clock className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
        <p>Loading work orders...</p>
      </div>
    );
  }

  const pendingDispatch = workOrders.filter((wo) => wo.paymentStatus === "pending_dispatch").length;
  const inProgress = workOrders.filter((wo) => wo.paymentStatus === "in_progress").length;
  const pendingVerification = workOrders.filter((wo) => wo.paymentStatus === "pending_verification").length;
  const released = workOrders.filter((wo) => wo.paymentStatus === "released").length;

  return (
    <div style={{ display: "flex", gap: "16px", height: "100%", overflow: "hidden" }}>
      {/* Main List */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Wrench className="w-6 h-6 text-blue-600" />
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0 }}>Work Order Management</h3>
          </div>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            <div style={{ padding: "8px", backgroundColor: "#fef2f2", borderRadius: "6px", borderLeft: "3px solid #ef4444" }}>
              <p style={{ fontSize: "12px", color: "#666", margin: 0, marginBottom: "4px" }}>Pending Dispatch</p>
              <p style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "#ef4444" }}>{pendingDispatch}</p>
            </div>
            <div style={{ padding: "8px", backgroundColor: "#fffbeb", borderRadius: "6px", borderLeft: "3px solid #f59e0b" }}>
              <p style={{ fontSize: "12px", color: "#666", margin: 0, marginBottom: "4px" }}>In Progress</p>
              <p style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "#f59e0b" }}>{inProgress}</p>
            </div>
            <div style={{ padding: "8px", backgroundColor: "#f5f3ff", borderRadius: "6px", borderLeft: "3px solid #8b5cf6" }}>
              <p style={{ fontSize: "12px", color: "#666", margin: 0, marginBottom: "4px" }}>Pending Verification</p>
              <p style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "#8b5cf6" }}>{pendingVerification}</p>
            </div>
            <div style={{ padding: "8px", backgroundColor: "#f0fdf4", borderRadius: "6px", borderLeft: "3px solid #10b981" }}>
              <p style={{ fontSize: "12px", color: "#666", margin: 0, marginBottom: "4px" }}>Payment Released</p>
              <p style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "#10b981" }}>{released}</p>
            </div>
          </div>
        </div>

        {/* Work Orders List */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
          {workOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "#666" }}>
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>✓ No pending work orders</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
              {workOrders.map((workOrder) => (
                <div
                  key={workOrder.workOrderId}
                  onClick={() => setSelectedWorkOrder(workOrder)}
                  style={{
                    padding: "12px",
                    border: `2px solid ${getStatusColor(workOrder.paymentStatus)}`,
                    borderRadius: "8px",
                    backgroundColor: selectedWorkOrder?.workOrderId === workOrder.workOrderId ? "#f3f4f6" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#111" }}>{workOrder.incidentTitle}</h4>
                    <span
                      style={{
                        padding: "4px 8px",
                        backgroundColor: getStatusColor(workOrder.paymentStatus),
                        color: "white",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "600",
                      }}
                    >
                      {getStatusLabel(workOrder.paymentStatus).split(" ")[0]}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.6" }}>
                    <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Wrench size={14} /> <strong>{workOrder.crewName}</strong>
                    </p>
                    <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={14} /> {workOrder.ward}
                    </p>
                    {workOrder.eta && (
                      <p style={{ margin: "4px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={14} /> ETA: <strong>{workOrder.eta} min</strong>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedWorkOrder && (
        <div
          style={{
            width: "340px",
            backgroundColor: "#f9fafb",
            borderLeft: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", backgroundColor: "white" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Work Order Details</h3>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#666", display: "block", marginBottom: "4px" }}>
                Work Order ID
              </label>
              <code style={{ fontSize: "12px", backgroundColor: "white", padding: "8px", borderRadius: "4px", display: "block" }}>
                {selectedWorkOrder.workOrderId}
              </code>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#666", display: "block", marginBottom: "4px" }}>
                Incident
              </label>
              <p style={{ margin: 0, fontSize: "14px", color: "#111", fontWeight: "500" }}>{selectedWorkOrder.incidentTitle}</p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#666", display: "block", marginBottom: "4px" }}>
                Status
              </label>
              <p style={{ margin: 0, fontSize: "14px", color: getStatusColor(selectedWorkOrder.paymentStatus), fontWeight: "600" }}>
                {getStatusLabel(selectedWorkOrder.paymentStatus)}
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#666", display: "block", marginBottom: "4px" }}>
                Assigned Crew
              </label>
              <p style={{ margin: 0, fontSize: "14px", color: "#111" }}>{selectedWorkOrder.crewName}</p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#666", display: "block", marginBottom: "4px" }}>
                Ward
              </label>
              <p style={{ margin: 0, fontSize: "14px", color: "#111" }}>{selectedWorkOrder.ward}</p>
            </div>

            {selectedWorkOrder.paymentStatus === "pending_verification" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#666", display: "block", marginBottom: "8px" }}>
                  Repair Verification Notes
                </label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Enter notes about the repair (max 200 chars)..."
                  style={{
                    width: "100%",
                    height: "80px",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                    fontSize: "12px",
                    fontFamily: "inherit",
                    resize: "none",
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ padding: "16px", borderTop: "1px solid #e5e7eb", backgroundColor: "white" }}>
            {selectedWorkOrder.paymentStatus === "pending_verification" ? (
              <button
                onClick={() => handleVerifyRepair(selectedWorkOrder.workOrderId, selectedWorkOrder.incidentId)}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#059669";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#10b981";
                }}
              >
                <CheckCircle size={16} />
                Verify & Release Payment
              </button>
            ) : selectedWorkOrder.paymentStatus === "released" ? (
              <div style={{ textAlign: "center", padding: "12px", backgroundColor: "#f0fdf4", borderRadius: "6px" }}>
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p style={{ margin: 0, fontSize: "12px", color: "#059669", fontWeight: "600" }}>✓ Payment Released</p>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "12px", color: "#666", textAlign: "center" }}>
                {selectedWorkOrder.paymentStatus === "pending_dispatch"
                  ? "Waiting for crew dispatch..."
                  : "Crew en route to site..."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
