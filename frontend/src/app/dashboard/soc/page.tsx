"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader, Play, Users, MessageSquare, Zap, Shield, FileText, TrendingUp, Target, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const AGENT_ICONS: Record<string, any> = {
  "crosshair": Target,
  "clipboard-check": FileText,
  "trending-up": TrendingUp,
  "shield": Shield,
  "scroll": ScrollText,
  "zap": Zap,
};

const SEV_STYLE: Record<string, { bg: string; color: string }> = {
  critical: { bg: "rgba(255,68,68,0.12)",  color: "#ff6b6b" },
  high:     { bg: "rgba(255,154,60,0.12)", color: "#ff9a3c" },
  medium:   { bg: "rgba(255,217,61,0.1)",  color: "#ffd93d" },
  low:      { bg: "rgba(0,255,136,0.08)",  color: "#00ff88" },
  info:     { bg: "rgba(59,130,246,0.1)",  color: "#60a5fa" },
};

export default function SOCPage() {
  const [running,    setRunning]    = useState(false);
  const [result,     setResult]     = useState<any>(null);
  const [context,    setContext]    = useState("Analyze the current threat landscape and agent behavior across all active agents.");
  const [activeAgent,setActiveAgent]= useState<number | null>(null);

  const { data: catalog } = useQuery({
    queryKey: ["soc-agents"],
    queryFn: () => api.get("/api/v1/soc/agents").then(r => r.data),
  });

  const runSwarm = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await api.post("/api/v1/soc/run", { context });
      setResult(res.data);
      toast.success(`SOC swarm complete — ${res.data.summary?.messages_exchanged ?? 0} inter-agent messages`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? e.message ?? "Swarm failed");
    } finally {
      setRunning(false);
    }
  };

  const agents = result?.agents ?? [];
  const commGraph = result?.communication_graph ?? [];
  const summary = result?.summary ?? {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{ background:"linear-gradient(135deg,rgba(59,130,246,0.08) 0%,rgba(10,21,32,0.95) 100%)", border:"1px solid rgba(59,130,246,0.15)" }}>
        <div className="radial-glow" style={{ width:500,height:250,top:-80,right:-80,opacity:0.35,background:"radial-gradient(ellipse,rgba(59,130,246,0.2) 0%,transparent 70%)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="section-label mb-2" style={{ color:"#3b82f6" }}>Layer 3</div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>AgentShield SOC</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">6-agent security swarm · Inter-agent communication · Orchestrated response</p>
          </div>
          <button onClick={runSwarm} disabled={running}
            className="btn-outline text-xs disabled:opacity-50"
            style={{ color:"#3b82f6", borderColor:"rgba(59,130,246,0.4)" }}>
            {running ? <Loader size={13} className="animate-spin"/> : <Play size={13}/>}
            {running ? "Swarm running..." : "Launch SOC Swarm"}
          </button>
        </div>
      </div>

      {/* Context input */}
      <div className="card p-5">
        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Security Context for Analysis</p>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          rows={2}
          className="input-dark w-full resize-none"
          placeholder="Describe the security scenario for the SOC swarm to analyze..."
        />
      </div>

      {/* Agent catalog */}
      <div>
        <p className="section-label mb-4">Security Agent Roster</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {catalog
            ? Object.entries(catalog).map(([key, agent]: [string, any], i) => {
                const Icon = AGENT_ICONS[agent.icon] ?? Shield;
                const agentResult = agents[i];
                const sev = agentResult ? SEV_STYLE[agentResult.severity] ?? SEV_STYLE.info : null;
                return (
                  <button key={key}
                    onClick={() => setActiveAgent(activeAgent === i ? null : i)}
                    className={cn(
                      "card p-4 text-left transition-all cursor-pointer",
                      activeAgent === i && "border-[rgba(59,130,246,0.35)]"
                    )}>
                    <div className="icon-box w-9 h-9 mb-2" style={{ background:`${agent.color}12`, borderColor:`${agent.color}28` }}>
                      <Icon size={16} style={{ color:agent.color }} />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-200 leading-tight" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>{agent.name}</p>
                    <p className="text-[9px] font-mono text-slate-600 mt-1 leading-tight">{agent.description}</p>
                    {agentResult && sev && (
                      <div className="mt-2">
                        <span className="badge text-[8px]" style={{ background:sev.bg, borderColor:`${sev.color}40`, color:sev.color }}>
                          {agentResult.severity}
                        </span>
                      </div>
                    )}
                    {running && !result && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full animate-bounce" style={{ background:agent.color, animationDelay:`${i*100}ms` }} />
                        <span className="text-[8px] font-mono text-slate-700">analyzing...</span>
                      </div>
                    )}
                  </button>
                );
              })
            : [...Array(6)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="w-9 h-9 rounded-lg mb-2" style={{ background:"rgba(14,34,53,0.9)" }} />
                  <div className="h-3 rounded w-3/4" style={{ background:"rgba(14,34,53,0.9)" }} />
                </div>
              ))
          }
        </div>
      </div>

      {/* Running animation */}
      {running && (
        <div className="card p-10">
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ border:"1px solid rgba(59,130,246,0.2)" }} />
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ border:"2px solid rgba(59,130,246,0.25)" }}>
                <Users size={28} style={{ color:"#3b82f6" }} className="animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-mono text-sm font-semibold" style={{ color:"#3b82f6" }}>SOC swarm agents analyzing...</p>
              <p className="text-xs text-slate-600 font-mono mt-1">6 AI agents running concurrently · Inter-agent messaging active</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !running && (
        <div className="space-y-6 animate-slide-up">
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { l:"Agents Deployed",  v:summary.total_agents,      c:"#3b82f6" },
              { l:"Critical Findings",v:summary.critical,          c:summary.critical>0?"#ff6b6b":"#00ff88" },
              { l:"High Findings",    v:summary.high,              c:summary.high>0?"#ff9a3c":"#00ff88" },
              { l:"Messages Exchanged",v:summary.messages_exchanged,c:"#a855f7" },
            ].map(s=>(
              <div key={s.l} className="card p-4">
                <div className="text-[9px] font-mono text-slate-600 uppercase mb-2">{s.l}</div>
                <div className="text-2xl font-bold" style={{ fontFamily:"'Space Grotesk',sans-serif", color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Agent findings grid */}
          <div>
            <p className="section-label mb-4">Agent Findings</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {agents.map((agent: any, i: number) => {
                  const sev = SEV_STYLE[agent.severity] ?? SEV_STYLE.info;
                  const Icon = AGENT_ICONS[(Object.values(catalog ?? {})[i] as any)?.icon as string ?? "shield"] ?? Shield;
                  return (
                    <motion.div key={i} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }} className="card p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="icon-box w-8 h-8 rounded-lg flex-shrink-0" style={{ background:sev.bg, borderColor:`${sev.color}30` }}>
                          <Icon size={14} style={{ color:sev.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>{agent.name}</p>
                          <span className="badge mt-0.5" style={{ background:sev.bg, borderColor:`${sev.color}40`, color:sev.color, fontSize:"8px" }}>
                            {agent.severity}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-700">{agent.execution_ms}ms</span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-2">{agent.finding}</p>
                      {agent.recommendation && (
                        <div className="p-2 rounded-lg mt-2" style={{ background:"rgba(0,255,136,0.04)", border:"1px solid rgba(0,255,136,0.1)" }}>
                          <p className="text-[9px] font-mono text-slate-600 mb-0.5">Recommendation</p>
                          <p className="text-[10px] font-mono" style={{ color:"#00ff88" }}>{agent.recommendation}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Communication graph */}
          {commGraph.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom:"1px solid rgba(14,34,53,0.9)" }}>
                <MessageSquare size={14} style={{ color:"#a855f7" }} />
                <h3 className="text-sm font-bold text-white" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>Inter-Agent Communication Log</h3>
                <span className="ml-auto text-[10px] font-mono text-slate-600">{commGraph.length} messages</span>
              </div>
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {commGraph.map((msg: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg" style={{ background:"rgba(3,8,13,0.6)", border:"1px solid rgba(14,34,53,0.9)" }}>
                    <div className="flex-shrink-0 mt-0.5">
                      <span className={cn(
                        "badge text-[8px]",
                        msg.type==="escalate" ? "badge-critical" :
                        msg.type==="alert"    ? "badge-high" :
                        msg.priority==="high" ? "badge-medium" : "badge-info"
                      )}>
                        {msg.type}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 mb-1">
                        <span style={{ color:"#00ff88" }}>{msg.from}</span>
                        <span>→</span>
                        <span style={{ color:"#3b82f6" }}>{msg.to}</span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 truncate">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
