"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { scoreToColor } from "@/lib/utils";
import { Shield, Bot, AlertTriangle, Activity, TrendingUp, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ to }: { to: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    if (to === ref.current) return;
    const diff = to - ref.current;
    const start = ref.current;
    let step = 0;
    const steps = 24;
    const id = setInterval(() => {
      step++;
      setVal(Math.round(start + (diff * step) / steps));
      if (step >= steps) { clearInterval(id); setVal(to); ref.current = to; }
    }, 25);
    return () => clearInterval(id);
  }, [to]);
  return <>{val.toLocaleString()}</>;
}

export function OverviewCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => dashboardApi.getOverview().then((r) => r.data),
    refetchInterval: 15_000,
  });

  const cards = [
    {
      label: "Total Agents",
      value: data?.total_agents ?? 0,
      sub: `${data?.protected_agents ?? 0} protected`,
      icon: Bot,
      color: "#00ff88",
      suffix: "",
    },
    {
      label: "Threats Today",
      value: data?.threats_today ?? 0,
      sub: `${data?.blocked_threats ?? 0} blocked`,
      icon: AlertTriangle,
      color: (data?.threats_today ?? 0) > 10 ? "#ff4444" : "#ff9a3c",
      suffix: "",
    },
    {
      label: "Active Incidents",
      value: data?.active_incidents ?? 0,
      sub: (data?.active_incidents ?? 0) === 0 ? "All clear" : "Requires action",
      icon: Shield,
      color: (data?.active_incidents ?? 0) > 0 ? "#ff9a3c" : "#00ff88",
      suffix: "",
    },
    {
      label: "Trust Score",
      value: Math.round(data?.trust_score ?? 0),
      sub: "Avg active agents",
      icon: TrendingUp,
      color: scoreToColor(data?.trust_score ?? 0),
      suffix: "%",
    },
    {
      label: "Compliance",
      value: Math.round(data?.compliance_score ?? 0),
      sub: "4 frameworks",
      icon: Lock,
      color: scoreToColor(data?.compliance_score ?? 0),
      suffix: "%",
    },
    {
      label: "Security Health",
      value: Math.round(data?.security_health ?? 0),
      sub: "All layers active",
      icon: Activity,
      color: scoreToColor(data?.security_health ?? 0),
      suffix: "%",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
          className="card p-5 flex flex-col gap-4 relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(ellipse at top right, ${card.color}08 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          <div className="relative flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-tight">
              {card.label}
            </span>
            <div
              className="icon-box w-8 h-8 rounded-lg"
              style={{ background: `${card.color}14`, borderColor: `${card.color}25` }}
            >
              <card.icon size={13} style={{ color: card.color }} />
            </div>
          </div>
          <div className="relative">
            <div
              className="text-3xl font-bold leading-none"
              style={{
                fontFamily: "'Space Grotesk',sans-serif",
                color: isLoading ? "rgba(255,255,255,0.2)" : card.color,
              }}
            >
              {isLoading ? "—" : <><AnimatedNumber to={card.value} />{card.suffix}</>}
            </div>
            <div className="text-[10px] text-slate-600 mt-1.5" style={{ fontFamily:"'JetBrains Mono',monospace" }}>
              {card.sub}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
