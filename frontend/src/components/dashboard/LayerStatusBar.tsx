"use client";

import { useQuery } from "@tanstack/react-query";
import { firewallApi } from "@/lib/api";
import { Shield, Brain, Users, Key, Swords } from "lucide-react";

const LAYERS = [
  { id: 1, name: "Sentinel Mesh",   label: "Firewall",         icon: Shield,  color: "#00ff88" },
  { id: 2, name: "AgentGuard",      label: "Behavioral",       icon: Brain,   color: "#3b82f6" },
  { id: 3, name: "AgentShield SOC", label: "Operations",       icon: Users,   color: "#a855f7" },
  { id: 4, name: "Identity & Trust",label: "Identity",         icon: Key,     color: "#f59e0b" },
  { id: 5, name: "Red Team",        label: "Offensive",        icon: Swords,  color: "#ef4444" },
];

export function LayerStatusBar() {
  const { data: fwStatus } = useQuery({
    queryKey: ["firewall-status"],
    queryFn: () => firewallApi.getStatus().then((r) => r.data),
    refetchInterval: 60_000,
  });

  return (
    <div className="grid grid-cols-5 gap-3">
      {LAYERS.map((layer, i) => (
        <div
          key={layer.id}
          className="card px-4 py-3 flex items-center gap-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div
            className="icon-box flex-shrink-0"
            style={{
              background: `${layer.color}12`,
              borderColor: `${layer.color}28`,
            }}
          >
            <layer.icon size={15} style={{ color: layer.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-slate-500 truncate">{layer.label}</p>
            <p className="text-xs font-semibold text-slate-200 truncate" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
              {layer.name}
            </p>
          </div>
          <div className="ml-auto flex-shrink-0">
            <div className="dot-live" style={{
              background: i === 0 && fwStatus?.status === "active" ? "#00ff88" : "#00ff88",
              boxShadow: `0 0 6px ${layer.color}`,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}
