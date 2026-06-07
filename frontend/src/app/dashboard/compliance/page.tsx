"use client";

import { useQuery } from "@tanstack/react-query";
import { complianceApi } from "@/lib/api";
import { scoreToColor } from "@/lib/utils";
import { FileCheck, CheckCircle, XCircle, AlertCircle, Shield } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

const ORDER = ["gdpr","hipaa","soc2","iso27001"];
const FW_DETAIL: Record<string,{desc:string}> = {
  gdpr:     {desc:"EU General Data Protection Regulation"},
  hipaa:    {desc:"Health Insurance Portability and Accountability Act"},
  soc2:     {desc:"Service Organization Control 2 — Trust Service Criteria"},
  iso27001: {desc:"Information Security Management System"},
};

export default function CompliancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance"],
    queryFn: () => complianceApi.getStatus().then(r=>r.data),
    refetchInterval: 60_000,
  });
  const fws = data?.frameworks ?? {};

  const radarData = ORDER.map(k=>({
    fw: fws[k]?.name ?? k.toUpperCase(),
    score: fws[k]?.score ?? 0,
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{background:"linear-gradient(135deg,rgba(10,21,32,0.9) 0%,rgba(5,12,20,0.95) 100%)",border:"1px solid rgba(0,255,136,0.1)"}}>
        <div className="radial-glow" style={{width:400,height:200,top:-60,right:-60,opacity:0.5}}/>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="section-label mb-2">Layer 3</div>
            <h1 className="text-2xl font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Compliance Center</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">Compliance Agent — GDPR · HIPAA · SOC2 · ISO 27001</p>
          </div>
          {data && (
            <div className="text-center px-6 py-3 rounded-xl" style={{background:"rgba(3,8,13,0.7)",border:"1px solid rgba(0,255,136,0.15)"}}>
              <div className="text-3xl font-bold" style={{fontFamily:"'Space Grotesk',sans-serif",color:scoreToColor(data.overall_score)}}>
                {data.overall_score}%
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">Overall Compliance</div>
            </div>
          )}
        </div>
      </div>

      {/* Radar + overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-bold text-white mb-4" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Compliance Radar</h3>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-700 font-mono animate-pulse">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(14,34,53,0.9)" />
                <PolarAngleAxis dataKey="fw" tick={{fontSize:10,fill:"#64748b",fontFamily:"JetBrains Mono,monospace"}} />
                <Radar dataKey="score" stroke="#00ff88" fill="#00ff88" fillOpacity={0.12} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ORDER.map(k=>{
            const fw = fws[k]; if(!fw) return null;
            const color = scoreToColor(fw.score);
            return (
              <div key={k} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{fw.name}</p>
                    <p className="text-[10px] font-mono text-slate-600 mt-0.5">{FW_DETAIL[k]?.desc}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold" style={{fontFamily:"'Space Grotesk',sans-serif",color}}>{fw.score}%</div>
                    <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded border mt-0.5 ${
                      fw.status==="compliant"?"border-green-500/20 bg-green-500/10 text-green-400":
                      fw.status==="partial"  ?"border-yellow-500/20 bg-yellow-500/10 text-yellow-400":
                                              "border-red-500/20 bg-red-500/10 text-red-400"
                    }`}>{fw.status}</div>
                  </div>
                </div>
                <div className="score-bar mb-2">
                  <div className="score-bar-fill" style={{width:`${fw.score}%`,background:color}}/>
                </div>
                <div className="flex gap-3 text-[9px] font-mono">
                  <span style={{color:"#00ff88"}}>{fw.passed} passed</span>
                  {fw.failed>0   && <span style={{color:"#ff6b6b"}}>{fw.failed} failed</span>}
                  {fw.warnings>0 && <span style={{color:"#ffd93d"}}>{fw.warnings} warnings</span>}
                  <span className="ml-auto text-slate-700">{fw.total_controls} controls</span>
                </div>
                {fw.key_controls?.length>0 && (
                  <div className="mt-3 pt-3 space-y-1" style={{borderTop:"1px solid rgba(14,34,53,0.9)"}}>
                    {fw.key_controls.slice(0,3).map((c:string,i:number)=>(
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle size={9} style={{color:"#00ff88",flexShrink:0}}/>
                        <span className="text-[10px] font-mono text-slate-500">{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
