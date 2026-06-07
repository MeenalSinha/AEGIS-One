"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { dashboardApi } from "@/lib/api";
import { Activity, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const threats = payload[0]?.value ?? 0;
  const blocked = payload[1]?.value ?? 0;
  const rate = threats > 0 ? Math.round((blocked / threats) * 100) : 0;
  return (
    <div className="card-bright px-3 py-2.5 text-xs font-mono" style={{ minWidth: 140 }}>
      <p className="text-slate-400 mb-2 font-semibold">{label}</p>
      <p style={{ color: "#00ff88" }}>Detected: {threats}</p>
      <p style={{ color: "#3b82f6" }}>Blocked: {blocked}</p>
      <p className="text-slate-600 mt-1 border-t border-[#0e2235] pt-1">Block rate: {rate}%</p>
    </div>
  );
};

export function ThreatTimeline() {
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["threat-timeline"],
    queryFn: () => dashboardApi.getThreatTimeline().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const totalThreats = data.reduce((s: number, d: any) => s + (d.threats || 0), 0);
  const totalBlocked = data.reduce((s: number, d: any) => s + (d.blocked || 0), 0);
  const blockRate = totalThreats > 0 ? Math.round((totalBlocked / totalThreats) * 100) : 0;

  // Compare last 12h vs prior 12h
  const half = Math.floor(data.length / 2);
  const recent = data.slice(half).reduce((s: number, d: any) => s + d.threats, 0);
  const prior  = data.slice(0, half).reduce((s: number, d: any) => s + d.threats, 0);
  const trend  = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : 0;

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="icon-box w-9 h-9" style={{ background:"rgba(0,255,136,0.1)", borderColor:"rgba(0,255,136,0.22)" }}>
            <Activity size={16} style={{ color:"#00ff88" }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
              Threat Activity
            </h2>
            <p className="text-[10px] font-mono text-slate-600">24-hour window</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Mini stats */}
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div className="text-center">
              <div className="text-[#00ff88] font-bold text-base" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
                {totalThreats}
              </div>
              <div className="text-slate-600">detected</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 font-bold text-base" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
                {totalBlocked}
              </div>
              <div className="text-slate-600">blocked</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-base" style={{
                fontFamily:"'Space Grotesk',sans-serif",
                color: blockRate >= 90 ? "#00ff88" : blockRate >= 70 ? "#ffd93d" : "#ff6b6b",
              }}>
                {blockRate}%
              </div>
              <div className="text-slate-600">rate</div>
            </div>
            {trend !== 0 && (
              <div className="flex items-center gap-1" style={{ color: trend > 0 ? "#ff6b6b" : "#00ff88" }}>
                {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="text-xs font-mono">{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="text-slate-600 hover:text-slate-400 transition-colors p-1"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-4 text-[10px] font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 rounded inline-block" style={{ background:"#00ff88" }} />
          <span className="text-slate-500">Detected</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 rounded inline-block" style={{ background:"#3b82f6" }} />
          <span className="text-slate-500">Blocked</span>
        </span>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-xs text-slate-700 font-mono animate-pulse">
          Loading timeline data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top:4, right:4, bottom:0, left:-24 }}>
            <defs>
              <linearGradient id="gThreats" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="gBlocked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 5" stroke="rgba(14,34,53,0.9)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize:9, fill:"#475569", fontFamily:"JetBrains Mono,monospace" }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize:9, fill:"#475569", fontFamily:"JetBrains Mono,monospace" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="threats" stroke="#00ff88" strokeWidth={1.5} fill="url(#gThreats)" dot={false} activeDot={{ r:4, fill:"#00ff88", strokeWidth:0 }} />
            <Area type="monotone" dataKey="blocked" stroke="#3b82f6" strokeWidth={1.5} fill="url(#gBlocked)" dot={false} activeDot={{ r:4, fill:"#3b82f6", strokeWidth:0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
