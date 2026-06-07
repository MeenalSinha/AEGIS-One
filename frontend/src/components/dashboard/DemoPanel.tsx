"use client";

import { useState } from "react";
import { demoApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useAegisStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Swords, Play, CheckCircle, Loader, ChevronDown, ChevronUp, Zap } from "lucide-react";
import toast from "react-hot-toast";

const SCENARIOS = [
  { id:"prompt-injection",  label:"Prompt Injection",   desc:"Instruction override + DAN jailbreak",     fn:() => demoApi.promptInjection(),  color:"#ff4444", key:"result" },
  { id:"rogue-agent",       label:"Rogue Agent",         desc:"Unauthorized payroll system access",        fn:() => demoApi.rogueAgent(),        color:"#ff9a3c", key:"behavior_analysis" },
  { id:"memory-poisoning",  label:"Memory Poisoning",    desc:"Credential injection via memory write",     fn:() => demoApi.memoryPoisoning(),   color:"#ffd93d", key:"result" },
  { id:"red-team",          label:"Red Team Sweep",      desc:"AI-generated attack vulnerability scan",    fn:() => demoApi.redTeam(),           color:"#a855f7", key:"report" },
];

function ResultBadge({ scenario, data }: { scenario: typeof SCENARIOS[0]; data: any }) {
  const [open, setOpen] = useState(false);
  const r = data[scenario.key] ?? data;
  const getLine = () => {
    if (scenario.id === "red-team") {
      const rp = data.report;
      return rp ? `${rp.total_attacks} attacks · ${rp.vulnerabilities_found} findings` : data.message;
    }
    if (scenario.id === "rogue-agent") {
      const b = data.behavior_analysis;
      return b ? `Trust ${b.trust_score?.toFixed(0)}% · ${b.recommended_action}` : data.message;
    }
    return r?.blocked !== undefined
      ? `${r.blocked ? "BLOCKED" : "EVADED"} · Risk ${((r.risk_score||0)*100).toFixed(0)}%`
      : (data.message || "Complete");
  };

  return (
    <div
      className="mt-1.5 rounded-lg overflow-hidden"
      style={{ background:"rgba(3,8,13,0.7)", border:`1px solid ${scenario.color}20` }}
    >
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[10px] font-mono" style={{ color: scenario.color }}>{getLine()}</span>
        {open ? <ChevronUp size={9} className="text-slate-600" /> : <ChevronDown size={9} className="text-slate-600" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5" style={{ borderTop:`1px solid ${scenario.color}15` }}>
          <p className="text-[10px] font-mono text-slate-500 pt-2">{data.message}</p>
          {r?.explanation && <p className="text-[10px] font-mono text-slate-600 leading-relaxed">{r.explanation}</p>}
          {scenario.id === "rogue-agent" && data.actions_taken?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.actions_taken.map((a: string, i: number) => (
                <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400">
                  {a.replace(/_/g," ")}
                </span>
              ))}
            </div>
          )}
          {scenario.id === "red-team" && data.report?.findings?.slice(0,2).map((f: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5 text-[9px] font-mono">
              <span className={cn(
                "px-1 rounded uppercase",
                f.severity==="critical" ? "bg-red-500/20 text-red-400" :
                f.severity==="high"     ? "bg-orange-500/20 text-orange-400" :
                                          "bg-yellow-500/20 text-yellow-400"
              )}>{f.severity}</span>
              <span className="text-slate-500">{f.attack_type?.replace(/_/g," ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DemoPanel() {
  const [running, setRunning] = useState<string|null>(null);
  const [results, setResults] = useState<Record<string,any>>({});
  const qc = useQueryClient();
  const { setDemoResult } = useAegisStore();

  const run = async (s: typeof SCENARIOS[0]) => {
    setRunning(s.id);
    try {
      const res = await s.fn();
      setResults(p => ({ ...p, [s.id]: res.data }));
      setDemoResult(res.data);
      toast.success(`${s.label} complete`);
      ["agents","threats","incidents","dashboard-overview","audit-logs","threat-timeline","compliance"].forEach(
        k => qc.invalidateQueries({ queryKey:[k] })
      );
    } catch (e: any) {
      toast.error(`${s.label}: ${e.response?.data?.detail ?? e.message ?? "failed"}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="card flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom:"1px solid rgba(14,34,53,0.9)" }}>
        <div className="icon-box w-9 h-9" style={{ background:"rgba(239,68,68,0.1)", borderColor:"rgba(239,68,68,0.22)" }}>
          <Swords size={15} style={{ color:"#ff6b6b" }} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>Live Demo Scenarios</h2>
          <p className="text-[10px] font-mono text-slate-600">4 end-to-end attack simulations</p>
        </div>
        <div className="ml-auto">
          <Zap size={13} className="text-slate-700" />
        </div>
      </div>

      <div className="p-4 space-y-2.5 flex-1">
        {SCENARIOS.map((s) => {
          const isRunning = running === s.id;
          const isDone = !!results[s.id];
          const disabled = running !== null && !isRunning;
          return (
            <div key={s.id}>
              <button
                onClick={() => run(s)}
                disabled={disabled || isRunning}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-150",
                  disabled ? "opacity-35 cursor-not-allowed" : "hover:scale-[1.01]"
                )}
                style={{
                  background:"rgba(3,8,13,0.6)",
                  border:`1px solid ${isDone ? `${s.color}30` : "rgba(14,34,53,0.9)"}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: isRunning ? "#fff" : s.color, boxShadow: isRunning ? "none" : `0 0 6px ${s.color}` }}
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-200" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
                      {s.label}
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono">{s.desc}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {isRunning  ? <Loader size={13} className="text-slate-400 animate-spin" />
                  : isDone    ? <CheckCircle size={13} style={{ color:s.color }} />
                  :             <Play size={11} className="text-slate-600" />}
                </div>
              </button>
              {isDone && results[s.id] && <ResultBadge scenario={s} data={results[s.id]} />}
            </div>
          );
        })}
      </div>

      <div className="px-4 pb-4">
        <div
          className="p-3 rounded-lg text-[9px] font-mono text-slate-700 leading-relaxed"
          style={{ background:"rgba(3,8,13,0.5)", border:"1px solid rgba(14,34,53,0.9)" }}
        >
          All scenarios invoke real AI analysis, persist DB records, and update dashboard metrics automatically.
        </div>
      </div>
    </div>
  );
}
