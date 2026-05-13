import { useEffect, useState } from "react";
import { Upload, X, Check, AlertCircle, Loader, Image } from "lucide-react";

interface WorkOrder {
  id: string;
  incidentId: string;
  crewId: string;
  status: string;
  incident?: {
    title: string;
    ward: string;
  };
  crew?: {
    name: string;
  };
}

export function PhotoUploadPanel() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [uploadConfidence, setUploadConfidence] = useState(90);

  useEffect(() => {
    fetchWorkOrders();
    const interval = setInterval(fetchWorkOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const res = await fetch("/api/work-orders?status=pending_verification");
      if (res.ok) {
        const data = await res.json();
        setWorkOrders(data);
      }
    } catch (err) {
      console.error("Failed to fetch work orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Simulate photo upload (in production, would send to storage service)
      const reader = new FileReader();
      reader.onload = async (event) => {
        const photoUrl = event.target?.result as string;
        setUploadedPhotos([...uploadedPhotos, photoUrl]);

        // Store metadata in backend
        if (selectedOrder) {
          try {
            const res = await fetch("/api/photos/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                workOrderId: selectedOrder.id,
                photoUrl: photoUrl,
                photoData: {
                  type: "verification",
                  metadata: {
                    timestamp: new Date().toISOString(),
                    fileName: file.name,
                    size: file.size,
                  },
                },
              }),
            });

            if (res.ok) {
              alert("✓ Photo uploaded successfully");
            } else {
              alert("❌ Failed to upload photo metadata");
            }
          } catch (err) {
            console.error("Error uploading photo:", err);
          }
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyAndRelease = async () => {
    if (!selectedOrder) return;

    if (uploadedPhotos.length === 0) {
      alert("❌ Please upload at least one verification photo");
      return;
    }

    try {
      const res = await fetch(`/api/work-orders/${selectedOrder.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: selectedOrder.incidentId,
          confidence: uploadConfidence / 100,
          notes: verificationNotes,
          photoUrl: uploadedPhotos[0],
        }),
      });

      if (res.ok) {
        alert("✓ Repair verified! Payment will be released");
        setUploadedPhotos([]);
        setVerificationNotes("");
        setUploadConfidence(90);
        setSelectedOrder(null);
        fetchWorkOrders();
      } else {
        alert("❌ Failed to verify repair");
      }
    } catch (err) {
      console.error("Error verifying repair:", err);
      alert("❌ Error verifying repair");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", backgroundColor: "#f9fafb" }}>
      {/* Left Panel - Work Orders List */}
      <div style={{ width: "35%", borderRight: "1px solid #e5e7eb", overflow: "auto", backgroundColor: "white" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f3f4f6" }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "700", color: "#111" }}>
            📸 Awaiting Photo Verification
          </h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            {workOrders.length} work orders pending
          </p>
        </div>

        {workOrders.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#666" }}>
            <Check size={32} style={{ marginBottom: "8px", opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: "14px" }}>✓ All repairs verified!</p>
          </div>
        ) : (
          <div>
            {workOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #e5e7eb",
                  cursor: "pointer",
                  backgroundColor: selectedOrder?.id === order.id ? "#dbeafe" : "white",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) => {
                  if (selectedOrder?.id !== order.id) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#f9fafb";
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedOrder?.id !== order.id) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "white";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "start", gap: "8px", marginBottom: "4px" }}>
                  <div style={{ backgroundColor: "#fecaca", color: "#991b1b", borderRadius: "4px", padding: "2px 6px", fontSize: "11px", fontWeight: "600" }}>
                    {order.status}
                  </div>
                </div>
                <p style={{ margin: "0 0 2px 0", fontSize: "13px", fontWeight: "600", color: "#111" }}>
                  {order.incident?.title}
                </p>
                <p style={{ margin: "0 0 2px 0", fontSize: "12px", color: "#666" }}>
                  Crew: {order.crew?.name || "Unknown"}
                </p>
                <p style={{ margin: 0, fontSize: "11px", color: "#999" }}>
                  {order.incident?.ward}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel - Upload Form */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        {!selectedOrder ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              color: "#666",
            }}
          >
            <div>
              <Image size={48} style={{ marginBottom: "12px", opacity: 0.5, margin: "0 auto 12px" }} />
              <p style={{ margin: 0, fontSize: "16px" }}>Select a work order to upload photos</p>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "700", color: "#111" }}>
              Photo Verification
            </h2>
            <p style={{ margin: "0 0 24px 0", color: "#666", fontSize: "14px" }}>
              {selectedOrder.incident?.title} - {selectedOrder.incident?.ward}
            </p>

            {/* Photo Upload Area */}
            <div
              style={{
                padding: "32px",
                border: "2px dashed #d1d5db",
                borderRadius: "8px",
                textAlign: "center",
                backgroundColor: "#fafafa",
                marginBottom: "24px",
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#f0f0f0";
                (e.currentTarget as HTMLElement).style.borderColor = "#9ca3af";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#fafafa";
                (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
              }}
              onClick={() => document.getElementById("photo-input")?.click()}
            >
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
              {uploading ? (
                <div>
                  <Loader className="animate-spin mx-auto mb-2" size={32} />
                  <p style={{ margin: 0, color: "#666" }}>Uploading...</p>
                </div>
              ) : (
                <div>
                  <Upload size={32} style={{ margin: "0 auto 8px", color: "#3b82f6" }} />
                  <p style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "600", color: "#111" }}>
                    Click to upload or drag and drop
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                    PNG, JPG up to 10 MB
                  </p>
                </div>
              )}
            </div>

            {/* Uploaded Photos */}
            {uploadedPhotos.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600", color: "#111" }}>
                  ✓ Uploaded Photos ({uploadedPhotos.length})
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px" }}>
                  {uploadedPhotos.map((photo, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: "relative",
                        borderRadius: "8px",
                        overflow: "hidden",
                        aspectRatio: "1",
                        border: "2px solid #10b981",
                      }}
                    >
                      <img
                        src={photo}
                        alt={`Verification ${idx + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <button
                        onClick={() => setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== idx))}
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          backgroundColor: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: "20px",
                          height: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          opacity: 0.8,
                        }}
                        onMouseOver={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = "1";
                        }}
                        onMouseOut={(e) => {
                          (e.currentTarget as HTMLElement).style.opacity = "0.8";
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Slider */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "#666" }}>
                Repair Confidence: {uploadConfidence}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={uploadConfidence}
                onChange={(e) => setUploadConfidence(Number(e.target.value))}
                style={{
                  width: "100%",
                  height: "6px",
                  borderRadius: "3px",
                  backgroundColor: "#e5e7eb",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              />
              <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#666" }}>
                {uploadConfidence > 80 ? "✓ Highly confident" : uploadConfidence > 60 ? "Good confidence" : "Lower confidence"}
              </p>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "8px", color: "#666" }}>
                Verification Notes
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Describe any issues found during repair, actions taken, recommendations..."
                maxLength={300}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  height: "80px",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#999" }}>
                {verificationNotes.length}/300 characters
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleVerifyAndRelease}
              disabled={uploadedPhotos.length === 0}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: uploadedPhotos.length === 0 ? "#d1d5db" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: uploadedPhotos.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                if (uploadedPhotos.length > 0) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#059669";
                }
              }}
              onMouseOut={(e) => {
                if (uploadedPhotos.length > 0) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#10b981";
                }
              }}
            >
              <Check size={16} />
              Verify & Release Payment
            </button>

            {uploadedPhotos.length === 0 && (
              <p style={{ margin: "12px 0 0 0", fontSize: "12px", color: "#dc2626", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={14} />
                Upload at least one photo to verify repair
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
