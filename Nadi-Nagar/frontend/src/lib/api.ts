import type { Snapshot } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function fetchSnapshot(): Promise<Snapshot> {
  const response = await fetch(`${API_BASE}/api/snapshot`);
  if (!response.ok) {
    throw new Error(`Snapshot request failed: ${response.status}`);
  }
  return response.json();
}

export async function acknowledgeIncident(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/incidents/${id}/ack`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Acknowledge failed: ${response.status}`);
  }
}

export function streamUrl(): string {
  const envUrl = import.meta.env.VITE_WS_BASE as string | undefined;
  if (envUrl) {
    return `${envUrl}/ws/stream`;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/stream`;
}

