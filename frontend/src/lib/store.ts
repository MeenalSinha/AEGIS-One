import { create } from "zustand";

export interface ThreatEvent {
  id: string;
  type: string;
  threat_type: string;
  severity: string;
  agent: string;
  blocked: boolean;
  risk_score: number;
  confidence?: number;
  timestamp: string;
  message: string;
  source?: "database" | "simulated";
}

interface AegisStore {
  liveEvents: ThreatEvent[];
  addLiveEvent: (evt: ThreatEvent) => void;
  clearEvents: () => void;

  demoRunning: boolean;
  demoResult: any | null;
  setDemoRunning: (v: boolean) => void;
  setDemoResult: (r: any) => void;

  totalThreatsBlocked: number;
  totalThreatsDetected: number;
  incrementBlocked: () => void;
  incrementDetected: () => void;

  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;
}

export const useAegisStore = create<AegisStore>((set) => ({
  liveEvents: [],
  addLiveEvent: (evt) =>
    set((s) => ({
      liveEvents: [evt, ...s.liveEvents].slice(0, 60),
    })),
  clearEvents: () => set({ liveEvents: [] }),

  demoRunning: false,
  demoResult: null,
  setDemoRunning: (v) => set({ demoRunning: v }),
  setDemoResult: (r) => set({ demoResult: r }),

  totalThreatsBlocked: 0,
  totalThreatsDetected: 0,
  incrementBlocked: () => set((s) => ({ totalThreatsBlocked: s.totalThreatsBlocked + 1 })),
  incrementDetected: () => set((s) => ({ totalThreatsDetected: s.totalThreatsDetected + 1 })),

  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),
}));
