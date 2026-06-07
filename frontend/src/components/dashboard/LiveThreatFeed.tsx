"use client";

import { useAegisStore } from "@/lib/store";
import { cn, formatRelativeTime, formatThreatType } from "@/lib/utils";
import { Radio, ShieldX, ShieldCheck, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SEV_STYLE: Record<string, { bg: string; color: string }> = {
  critical: { bg: "rgba(255,68,68,0.12)",  color: "#ff6b6b" },
  high:     { bg: "rgba(255,154,60,0.12)", color: "#ff9a3c" },
  medium:   { bg: "rgba(255,217,61,0.1)",  color: "#ffd93d" },
  low:      { bg: "rgba(0,255,136,0.08)",  color: "#00ff88" },
  info:     { bg: "rgba(59,130,246,0.1)",  color: "#60a5fa" },
};

export function LiveThreatFeed() {
  const { liveEvents, wsConnected } = useAegisStore();

  return (
    <div className="card flex flex-col" style={{ height: 420 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(14,34,53,0.9)" }}
      >
        <div className="flex items-center gap-3">
          <div className="icon-box w-9 h-9" style={{ background:"rgba(0,255,136,0.1)", borderColor:"rgba(0,255,136,0.22)" }}>
            <Radio size={15} style={{ color:"#00ff88" }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
              Live Attack Feed
            </h2>
            <p className="text-[10px] font-mono text-slate-600">{liveEvents.length} events captured</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("dot-live", !wsConnected && "dot-yellow")} />
          <span className="text-[10px] font-mono" style={{ color: wsConnected ? "#00ff88" : "#ffd93d" }}>
            {wsConnected ? "LIVE" : "CONNECTING"}
          </span>
        </div>
      </div>

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        <AnimatePresence initial={false}>
          {liveEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-700 font-mono">
              Awaiting events...
            </div>
          ) : (
            liveEvents.map((evt) => {
              const sev = SEV_STYLE[evt.severity] ?? SEV_STYLE.info;
              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg"
                  style={{
                    background: evt.blocked
                      ? "rgba(0,255,136,0.025)"
                      : "rgba(255,68,68,0.04)",
                    border: `1px solid ${evt.blocked ? "rgba(0,255,136,0.1)" : "rgba(255,68,68,0.12)"}`,
                  }}
                >
                  {/* Shield icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {evt.blocked
                      ? <ShieldCheck size={13} style={{ color:"#00ff88" }} />
                      : <ShieldX size={13} style={{ color:"#ff6b6b" }} />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-300 truncate font-medium leading-tight">
                      {evt.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="badge"
                        style={{ background: sev.bg, borderColor: `${sev.color}40`, color: sev.color }}
                      >
                        {evt.severity}
                      </span>
                      <span className="text-[9px] font-mono text-slate-600">
                        {formatThreatType(evt.threat_type)}
                      </span>
                      {evt.source === "database" && (
                        <Database size={8} className="text-blue-500 opacity-60" />
                      )}
                    </div>
                  </div>

                  {/* Risk */}
                  <div className="flex-shrink-0 text-right">
                    <div
                      className="text-[11px] font-bold font-mono"
                      style={{ color: evt.blocked ? "#00ff88" : "#ff6b6b" }}
                    >
                      {Math.round((evt.risk_score ?? 0) * 100)}%
                    </div>
                    <div className="text-[8px] text-slate-700 font-mono mt-0.5">
                      {formatRelativeTime(evt.timestamp)}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
