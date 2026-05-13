import { useEffect, useMemo, useRef, useState } from "react";
import { fetchSnapshot, streamUrl } from "../lib/api";
import type { Snapshot } from "../types";

type StreamState = "connecting" | "live" | "reconnecting" | "offline";

export function useNadiStream() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [state, setState] = useState<StreamState>("connecting");
  const reconnectTimer = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchSnapshot()
      .then((initial) => {
        if (!cancelled) {
          setSnapshot(initial);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState("offline");
        }
      });

    const connect = () => {
      if (cancelled) {
        return;
      }
      setState((current) => (current === "connecting" ? "connecting" : "reconnecting"));
      const socket = new WebSocket(streamUrl());
      socketRef.current = socket;

      socket.onopen = () => setState("live");
      socket.onmessage = (event) => {
        const next = JSON.parse(event.data) as Snapshot;
        setSnapshot(next);
      };
      socket.onerror = () => {
        socket.close();
      };
      socket.onclose = () => {
        if (cancelled) {
          return;
        }
        setState("reconnecting");
        reconnectTimer.current = window.setTimeout(connect, 1400);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      socketRef.current?.close();
    };
  }, []);

  return useMemo(() => ({ snapshot, streamState: state }), [snapshot, state]);
}

