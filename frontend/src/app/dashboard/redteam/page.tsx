"use client";

import { useState } from "react";
import { redTeamApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Swords, Play, Loader, RefreshCw, ShieldCheck, ShieldX, BarChart3, Target, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const SEV_BADGE: Record<string,string> = {
  critical:"bg-red-500/20 text-red-400 border-red-500/30",
  high:"bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium:"bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low:"bg-green-500/20 text-green-400 border-green-500/30",
};
const ATTACK_TYPES = [
  {id:"prompt_injection", label:"Prompt Injection", color:"#ff4444", icon:Target,      desc:"Instruction override attacks"},
  {id:"jailbreak",        label:"Jailbreak",         color:"#ff9a3c", icon:Swords,      desc:"Constraint bypass attempts"},
  {id:"memory_poisoning", label:"Memory Poisoning",  color:"#ffd93d", icon:AlertTriangle,desc:"Persistent context attacks"},
  {id:"role_confusion",   label:"Role Confusion",    color:"#a855f7", icon:ShieldX,     desc:"Identity impersonation"},
  {id:"tool_abuse",       label:"Tool Abuse",        color:"#3b82f6", icon:ShieldCheck, desc:"Unauthorized tool use"},
];

export default function RedTeamPage() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [report,  setReport]  = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);

  const launch = async () => {
    setRunning(true); setReport(null); setElapsed(0);
    const t = setInterval(()=>setElapsed(s=>s+1), 1000);
    try {
      const res = await redTeamApi.sweep();
      setReport(res.data);
      toast.success(`Sweep complete — ${res.data.vulnerabilities_found} findings`);
      ["threats","audit-logs","dashboard-overview"].forEach(k=>qc.invalidateQueries({queryKey:[k]}));
    } catch(e:any) {
      toast.error(`Sweep failed: ${e.response?.data?.detail ?? e.message}`);
    } finally { clearInterval(t); setRunning(false); }
  };

  const posture = !report ? null
    : report.vulnerabilities_found===0 ? {label:"STRONG",  color:"#00ff88"}
    : report.critical_count>0          ? {label:"CRITICAL", color:"#ff4444"}
    : report.high_count>0              ? {label:"WEAK",     color:"#ff9a3c"}
    :                                    {label:"FAIR",      color:"#ffd93d"};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{background:"linear-gradient(135deg,rgba(20,10,32,0.95) 0%,rgba(10,5,20,0.98) 100%)",border:"1px solid rgba(168,85,247,0.15)"}}>
        <div className="radial-glow" style={{width:400,height:200,top:-60,right:-60,opacity:0.4,background:"radial-gradient(ellipse,rgba(168,85,247,0.2) 0%,transparent 70%)"}}/>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="section-label mb-2" style={{color:"#a855f7"}}>Layer 5</div>
            <h1 className="text-2xl font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Autonomous Red Team</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">AI-powered concurrent offensive security — 10 attacks in parallel</p>
          </div>
          <div className="flex items-center gap-3">
            {report && (
              <button onClick={()=>setReport(null)} className="btn-ghost text-xs flex items-center gap-1.5">
                <RefreshCw size={11}/> Clear
              </button>
            )}
            <button onClick={launch} disabled={running}
              className="btn-outline text-xs disabled:opacity-50"
              style={{color:"#a855f7",borderColor:"rgba(168,85,247,0.4)"}}>
              {running ? <Loader size={13} className="animate-spin"/> : <Swords size={13}/>}
              {running ? `Attacking... ${elapsed}s` : "Launch Red Team Sweep"}
            </button>
          </div>
        </div>
      </div>

      {/* Attack type grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ATTACK_TYPES.map(t=>(
          <div key={t.id} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="icon-box w-8 h-8 rounded-lg" style={{background:`${t.color}12`,borderColor:`${t.color}25`}}>
                <t.icon size={14} style={{color:t.color}}/>
              </div>
              <span className="text-xs font-semibold text-slate-300" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{t.label}</span>
            </div>
            <p className="text-[10px] text-slate-600 font-mono">{t.desc}</p>
            <p className="text-[9px] text-slate-700 font-mono mt-1">2 variants / sweep</p>
          </div>
        ))}
      </div>

      {/* Running state */}
      {running && (
        <div className="card p-10">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{border:"2px solid rgba(168,85,247,0.2)"}}>
                <Loader size={32} className="animate-spin" style={{color:"#a855f7"}}/>
              </div>
              <div className="absolute inset-0 rounded-full animate-ping" style={{border:"1px solid rgba(168,85,247,0.1)"}}/>
            </div>
            <div className="text-center">
              <p className="font-mono text-sm font-semibold" style={{color:"#a855f7"}}>Red team agents attacking...</p>
              <p className="text-xs text-slate-600 font-mono mt-1">{elapsed}s — 10 concurrent AI attack vectors</p>
            </div>
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-6 animate-slide-up">
          {/* Posture */}
          <div className="card p-6 flex items-center gap-6">
            {posture && (
              <div className="flex-shrink-0 text-center px-5">
                <div className="text-3xl font-bold" style={{fontFamily:"'Space Grotesk',sans-serif",color:posture.color}}>
                  {posture.label}
                </div>
                <div className="text-[10px] font-mono text-slate-600 mt-1">Defense Posture</div>
              </div>
            )}
            <div className="w-px h-14 bg-[rgba(14,34,53,0.9)]"/>
            <p className="text-sm text-slate-400 font-mono flex-1 leading-relaxed">{report.executive_summary}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {l:"Total Attacks",      v:report.total_attacks,         c:"#94a3b8"},
              {l:"Vulnerabilities",    v:report.vulnerabilities_found, c:report.vulnerabilities_found>0?"#ff4444":"#00ff88"},
              {l:"Critical / High",   v:`${report.critical_count}/${report.high_count}`, c:(report.critical_count+report.high_count)>0?"#ff4444":"#00ff88"},
              {l:"Medium / Low",      v:`${report.medium_count}/${report.low_count}`,    c:(report.medium_count+report.low_count)>0?"#ffd93d":"#00ff88"},
            ].map(s=>(
              <div key={s.l} className="card p-4">
                <div className="text-[9px] font-mono text-slate-600 uppercase mb-2">{s.l}</div>
                <div className="text-2xl font-bold" style={{fontFamily:"'Space Grotesk',sans-serif",color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Findings */}
          {report.findings?.length>0 ? (
            <div className="card">
              <div className="flex items-center gap-3 px-5 py-4" style={{borderBottom:"1px solid rgba(14,34,53,0.9)"}}>
                <BarChart3 size={14} style={{color:"#00ff88"}}/>
                <h3 className="text-sm font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Vulnerability Findings</h3>
                <span className="ml-auto text-[10px] font-mono text-slate-600">{report.findings.length} total</span>
              </div>
              <div className="divide-y" style={{borderColor:"rgba(14,34,53,0.9)"}}>
                {report.findings.map((f:any,i:number)=>(
                  <div key={i} className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`badge border ${SEV_BADGE[f.severity]??""}`}>{f.severity}</span>
                          <span className="text-xs font-mono text-slate-400">{(f.attack_type??"").replace(/_/g," ")}</span>
                          <span className="text-[10px] font-mono text-slate-600 ml-auto">CVSS {f.cvss_score?.toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-slate-200">{f.vulnerability_description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="p-3 rounded-lg" style={{background:"rgba(3,8,13,0.6)",border:"1px solid rgba(14,34,53,0.9)"}}>
                        <p className="text-[9px] font-mono text-slate-600 uppercase mb-1.5">Proof of Concept</p>
                        <p className="text-[11px] text-slate-400 font-mono leading-relaxed">{f.proof_of_concept}</p>
                      </div>
                      <div className="p-3 rounded-lg" style={{background:"rgba(0,255,136,0.03)",border:"1px solid rgba(0,255,136,0.12)"}}>
                        <p className="text-[9px] font-mono text-slate-600 uppercase mb-1.5">Remediation</p>
                        <p className="text-[11px] font-mono leading-relaxed" style={{color:"#00ff88"}}>{f.remediation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center">
              <ShieldCheck size={36} style={{color:"#00ff88"}} className="mx-auto mb-3"/>
              <p className="font-bold font-mono" style={{color:"#00ff88"}}>All defenses held — no vulnerabilities found</p>
              <p className="text-xs text-slate-600 font-mono mt-1">AEGIS One blocked all {report.total_attacks} attack attempts</p>
            </div>
          )}

          {/* Remediation plan */}
          {report.remediation_plan?.length>0 && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-white mb-4" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Remediation Plan</h3>
              <ol className="space-y-3">
                {report.remediation_plan.map((s:string,i:number)=>(
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                      style={{color:"#00ff88",background:"rgba(0,255,136,0.1)",border:"1px solid rgba(0,255,136,0.2)"}}>
                      {String(i+1).padStart(2,"0")}
                    </span>
                    <span className="text-xs text-slate-400 font-mono leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
