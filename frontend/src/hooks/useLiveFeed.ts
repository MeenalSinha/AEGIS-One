"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAegisStore, ThreatEvent } from "@/lib/store";

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000").replace(/\/$/, "");
const MAX_RETRY_DELAY = 16_000;

export function useLiveFeed() {
  const wsRef = useRef<WebSocket | null>(null);
  const retryDelay = useRef(1_000);
  const mountedRef = useRef(true);
  const { addLiveEvent, incrementBlocked, incrementDetected, setWsConnected } = useAegisStore();

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = new WebSocket(`${WS_URL}/api/v1/ws/live-feed`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryDelay.current = 1_000;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ThreatEvent;
          if (data && data.id && data.threat_type) {
            addLiveEvent(data);
            incrementDetected();
            if (data.blocked) incrementBlocked();
          }
        } catch {
          // malformed frame — ignore
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (mountedRef.current) {
          setTimeout(() => {
            retryDelay.current = Math.min(retryDelay.current * 2, MAX_RETRY_DELAY);
            connect();
          }, retryDelay.current);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available (SSR or network error)
    }
  }, [addLiveEvent, incrementBlocked, incrementDetected, setWsConnected]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
      setWsConnected(false);
    };
  }, [connect, setWsConnected]);
}
