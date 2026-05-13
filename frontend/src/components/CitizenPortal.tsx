import { useEffect, useState } from "react";
import { MapPin, Plus, Send, Clock, Eye } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  description: string;
  ward: string;
  lat: number;
  lon: number;
  status: string;
  severity: string;
  ageHours: number;
  slaState: string;
}

interface Report {
  title: string;
  description: string;
  lat: number;
  lon: number;
  ward: string;
  email: string;
  phone: string;
  photoUrl?: string;
}

export function CitizenPortal() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [showReportForm, setShowReportForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<Report>>({
    title: "",
    description: "",
    lat: 12.9716,
    lon: 77.5946,
    ward: "Koramangala",
    email: "",
    phone: "",
    photoUrl: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const wards = [
    "Majestic",
    "Koramangala",
    "Hebbal",
    "Yeshwanthpur",
    "Kengeri",
    "Bellandur",
    "KR Market",
    "Indiranagar",
  ];

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, [selectedWard]);

  const fetchIncidents = async () => {
    try {
      const url = selectedWard
        ? `/api/citizen/incidents?ward=${selectedWard}`
        : "/api/citizen/incidents";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.phone || !formData.title) {
      alert("Please fill in all fields");
      return;
    }

    let photoUrl = formData.photoUrl || "";
    if (photoFile) {
      // Convert image to base64 and upload to a free image host or backend (for demo, just use base64)
      const reader = new FileReader();
      reader.onloadend = async () => {
        photoUrl = reader.result as string;
        try {
          const res = await fetch("/api/citizen/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, photoUrl }),
          });
          if (res.ok) {
            alert("✓ Your report has been submitted! We'll investigate shortly.");
            setFormData({
              title: "",
              description: "",
              lat: 12.9716,
              lon: 77.5946,
              ward: "Koramangala",
              email: "",
              phone: "",
              photoUrl: "",
            });
            setPhotoFile(null);
            setShowReportForm(false);
            fetchIncidents();
          } else {
            alert("❌ Failed to submit report");
          }
        } catch (err) {
          console.error("Error:", err);
          alert("❌ Error submitting report");
        }
      };
      reader.readAsDataURL(photoFile);
      return;
    }

    try {
      const res = await fetch("/api/citizen/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert("✓ Your report has been submitted! We'll investigate shortly.");
        setFormData({
          title: "",
          description: "",
          lat: 12.9716,
          lon: 77.5946,
          ward: "Koramangala",
          email: "",
          phone: "",
          photoUrl: "",
        });
        setPhotoFile(null);
        setShowReportForm(false);
        fetchIncidents();
      } else {
        alert("❌ Failed to submit report");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("❌ Error submitting report");
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "Repaired") return "✓";
    if (status === "On Site") return "🔧";
    if (status === "Crew Dispatched") return "🚚";
    return "⏳";
  };

  return (
    <div className="citizen-shell app-portal">
      <div className="citizen-hero">
        <p className="portal-kicker">Public workspace</p>
        <h1>Citizen portal</h1>
        <p>Report infrastructure issues, track progress, and monitor SLA accountability in your ward.</p>
      </div>

      <div className="citizen-top-actions">
        <button onClick={() => setShowReportForm(!showReportForm)} className="citizen-primary-btn" type="button">
          <Plus size={18} />
          {showReportForm ? "Hide Report Form" : "Report an Issue"}
        </button>
      </div>

      {showReportForm && (
        <div className="citizen-report-wrap">
          <h2 className="portal-section-heading">Report an issue</h2>
          <form onSubmit={handleReportSubmit} className="citizen-form">
            <div className="citizen-field">
              <label htmlFor="issue-title">What is the issue? *</label>
              <input
                id="issue-title"
                type="text"
                placeholder="e.g., Road crater, Pipe leak, Water flooding"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="citizen-field">
              <label htmlFor="issue-detail">Details</label>
              <textarea
                id="issue-detail"
                placeholder="Describe the issue (e.g., location, when it started, impact)"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="citizen-field">
              <label htmlFor="issue-ward">Ward</label>
              <select
                id="issue-ward"
                value={formData.ward || ""}
                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
              >
                {wards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="citizen-form-grid">
              <div className="citizen-field">
                <label htmlFor="issue-email">Email *</label>
                <input
                  id="issue-email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="citizen-field">
                <label htmlFor="issue-phone">Phone *</label>
                <input
                  id="issue-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="citizen-field">
              <label htmlFor="issue-photo">Photo (optional)</label>
              <input
                id="issue-photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  setPhotoFile(file || null);
                }}
                style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 8, background: "var(--panel)" }}
              />
              {photoFile && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={URL.createObjectURL(photoFile)}
                    alt="Preview"
                    style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: "1px solid var(--line)" }}
                  />
                </div>
              )}
            </div>

            <button type="submit" className="citizen-primary-btn">
              <Send size={16} />
              Submit Report
            </button>
          </form>
        </div>
      )}

      <div className="citizen-filter-wrap">
        <span className="portal-kicker">Wards</span>
        <span className="portal-section-sub">Filter incidents</span>
        <div className="citizen-ward-grid">
          <button
            onClick={() => setSelectedWard("")}
            className={`citizen-chip ${selectedWard === "" ? "active" : ""}`}
            type="button"
          >
            All Wards
          </button>
          {wards.map((ward) => (
            <button
              key={ward}
              onClick={() => setSelectedWard(ward)}
              className={`citizen-chip ${selectedWard === ward ? "active" : ""}`}
              type="button"
            >
              {ward}
            </button>
          ))}
        </div>
      </div>

      <div className="citizen-list-wrap">
        <span className="portal-kicker">Incidents</span>
        <span className="portal-section-sub">Near real-time from the city feed</span>
        {loading ? (
          <div className="citizen-empty">
            <Clock size={30} />
            Loading incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div className="citizen-empty">
            <Eye size={32} />
            <p>No reported issues in{selectedWard ? ` ${selectedWard}` : " this area"}.</p>
          </div>
        ) : (
          <div className="citizen-card-grid">
            {incidents.map((incident) => (
              <article
                key={incident.id}
                className={`citizen-card citizen-card--${["critical", "high", "moderate"].includes(incident.severity) ? incident.severity : "default"}`}
              >
                <div className="citizen-card-head">
                  <h4>{incident.title}</h4>
                  <span className={`citizen-sla-pill ${incident.slaState === "red" ? "is-late" : "is-ok"}`}>
                    {incident.slaState === "red" ? "Overdue" : "On Track"}
                  </span>
                </div>

                <p>{incident.description || "No description provided"}</p>

                <div className="citizen-card-meta">
                  <p>
                    <MapPin size={14} /> <strong>{incident.ward}</strong>
                  </p>
                  <p>
                    <strong>Status:</strong> {getStatusIcon(incident.status)} {incident.status}
                  </p>
                  <p>
                    <strong>Age:</strong> {incident.ageHours.toFixed(1)} hours
                  </p>
                  <p>
                    <strong>Severity:</strong> {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
