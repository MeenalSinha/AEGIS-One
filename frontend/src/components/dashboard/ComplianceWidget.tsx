"use client";

import { useQuery } from "@tanstack/react-query";
import { complianceApi } from "@/lib/api";
import { FileCheck, AlertCircle, CheckCircle } from "lucide-react";
import { scoreToColor } from "@/lib/utils";

const ORDER = ["gdpr", "hipaa", "soc2", "iso27001"];

export function ComplianceWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["compliance"],
    queryFn: () => complianceApi.getStatus().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const fws = data?.frameworks ?? {};

  return (
    <div className="card p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="icon-box w-9 h-9" style={{ background:"rgba(0,255,136,0.1)", borderColor:"rgba(0,255,136,0.22)" }}>
            <FileCheck size={16} style={{ color:"#00ff88" }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
              Compliance Center
            </h2>
            <p className="text-[10px] font-mono text-slate-600">4 frameworks</p>
          </div>
        </div>
        {data?.overall_score !== undefined && (
          <div className="text-right">
            <div
              className="text-2xl font-bold leading-none"
              style={{ fontFamily:"'Space Grotesk',sans-serif", color: scoreToColor(data.overall_score) }}
            >
              {data.overall_score}%
            </div>
            <div className="text-[9px] font-mono text-slate-600 mt-0.5">overall</div>
          </div>
        )}
      </div>

      {/* Overall ring */}
      {data?.overall_score !== undefined && (
        <div className="flex items-center justify-center mb-6">
          <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(14,34,53,0.9)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={scoreToColor(data.overall_score)}
              strokeWidth="8"
              strokeDasharray={`${(data.overall_score / 100) * 251.2} 251.2`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-xl font-bold" style={{ fontFamily:"'Space Grotesk',sans-serif", color: scoreToColor(data.overall_score) }}>
              {data.overall_score}%
            </div>
            <div className="text-[9px] font-mono text-slate-600">compliant</div>
          </div>
        </div>
      )}

      {/* Framework list */}
      <div className="flex-1 space-y-3">
        {error ? (
          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono py-3 justify-center">
            <AlertCircle size={12} /><span>Unable to load compliance data</span>
          </div>
        ) : isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 rounded w-1/3 mb-1.5" style={{ background:"rgba(14,34,53,0.9)" }} />
              <div className="h-1.5 rounded" style={{ background:"rgba(14,34,53,0.9)" }} />
            </div>
          ))
        ) : (
          ORDER.map((key) => {
            const fw = fws[key];
            if (!fw) return null;
            const color = scoreToColor(fw.score);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-200">{fw.name}</span>
                    {fw.status === "compliant" && (
                      <CheckCircle size={10} style={{ color:"#00ff88" }} />
                    )}
                  </div>
                  <span className="text-xs font-bold font-mono" style={{ color }}>{fw.score}%</span>
                </div>
                <div className="score-bar">
                  <div className="score-bar-fill" style={{ width:`${fw.score}%`, background: color }} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-[9px] font-mono">
                  <span style={{ color:"#00ff88" }}>{fw.passed} passed</span>
                  {fw.failed > 0 && <span style={{ color:"#ff6b6b" }}>{fw.failed} failed</span>}
                  {fw.warnings > 0 && <span style={{ color:"#ffd93d" }}>{fw.warnings} warnings</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {data?.computed_at && (
        <div className="mt-4 pt-3 text-[9px] font-mono text-slate-700" style={{ borderTop:"1px solid rgba(14,34,53,0.9)" }}>
          Assessed {new Date(data.computed_at).toLocaleTimeString()} — {data.assessment_period_days}d window
        </div>
      )}
    </div>
  );
}
