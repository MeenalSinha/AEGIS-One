"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import { Flame } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  prompt_injection:     "#ff4444",
  jailbreak:            "#ff9a3c",
  data_exfiltration:    "#ef4444",
  tool_abuse:           "#f59e0b",
  memory_poisoning:     "#a855f7",
  agent_hijacking:      "#06b6d4",
  privilege_escalation: "#3b82f6",
  role_confusion:       "#8b5cf6",
  unauthorized_access:  "#ff6b6b",
  anomalous_behavior:   "#00ff88",
};

const formatType = (t: string) =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { type, count } = payload[0].payload;
  return (
    <div className="card-bright px-3 py-2 text-xs font-mono">
      <p className="text-slate-300 font-semibold mb-1">{formatType(type)}</p>
      <p style={{ color: TYPE_COLORS[type] ?? "#00ff88" }}>{count} detections (7d)</p>
    </div>
  );
};

export function ThreatHeatmap() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["threat-heatmap"],
    queryFn: () => dashboardApi.getThreatHeatmap().then((r) => r.data),
    refetchInterval: 60_000,
  });

  if (!isLoading && data.length === 0) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="icon-box w-9 h-9"
          style={{ background: "rgba(255,68,68,0.1)", borderColor: "rgba(255,68,68,0.22)" }}
        >
          <Flame size={16} style={{ color: "#ff6b6b" }} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
            Threat Distribution Heatmap
          </h2>
          <p className="text-[10px] font-mono text-slate-600">By attack type — last 7 days</p>
        </div>
      </div>
      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-xs text-slate-700 font-mono animate-pulse">
          Loading heatmap data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 40, left: -24 }}>
            <CartesianGrid strokeDasharray="2 5" stroke="rgba(14,34,53,0.9)" vertical={false} />
            <XAxis
              dataKey="type"
              tickFormatter={formatType}
              tick={{ fontSize: 9, fill: "#475569", fontFamily: "JetBrains Mono,monospace" }}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#475569", fontFamily: "JetBrains Mono,monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,255,136,0.04)" }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry: any, i: number) => (
                <Cell key={i} fill={TYPE_COLORS[entry.type] ?? "#00ff88"} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
