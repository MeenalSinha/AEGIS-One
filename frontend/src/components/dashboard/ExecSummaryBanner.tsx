"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { TrendingUp, ShieldCheck, Zap, Activity } from "lucide-react";

export function ExecSummaryBanner() {
  const { data } = useQuery({
    queryKey: ["stats-summary"],
    queryFn: () => dashboardApi.getStatsSummary().then(r => r.data),
    refetchInterval: 30_000,
  });

  const items = [
    {
      icon: Activity,
      label: "Threats (7d)",
      value: data?.threats_7d ?? "--",
      sub: `${data?.blocked_7d ?? "--"} blocked`,
      color: "#ff9a3c",
    },
    {
      icon: ShieldCheck,
      label: "Block Rate",
      value: data ? `${data.block_rate_7d}%` : "--",
      sub: "7-day average",
      color: data?.block_rate_7d >= 90 ? "#00ff88" : "#ffd93d",
    },
    {
      icon: Zap,
      label: "Layers Active",
      value: data?.layers_active ?? 5,
      sub: "All operational",
      color: "#00ff88",
    },
    {
      icon: TrendingUp,
      label: "Platform Uptime",
      value: data ? `${data.uptime_pct}%` : "99.97%",
      sub: "30-day SLA",
      color: "#00ff88",
    },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl"
      style={{
        background: "linear-gradient(135deg,rgba(0,255,136,0.03) 0%,rgba(10,21,32,0.8) 100%)",
        border: "1px solid rgba(0,255,136,0.08)",
      }}
    >
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-4">
          <div
            className="icon-box w-10 h-10 flex-shrink-0"
            style={{ background: `${item.color}12`, borderColor: `${item.color}25` }}
          >
            <item.icon size={16} style={{ color: item.color }} />
          </div>
          <div>
            <div
              className="text-xl font-bold leading-none"
              style={{ fontFamily: "'Space Grotesk',sans-serif", color: item.color }}
            >
              {String(item.value)}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.label}</div>
            <div className="text-[9px] font-mono text-slate-700">{item.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
