"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { threatsApi } from "@/lib/api";
import { cn, formatThreatType, formatRelativeTime } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Search, ChevronDown, ChevronUp, Shield } from "lucide-react";
import toast from "react-hot-toast";

const SEV_STYLE: Record<string,{bg:string;color:string}> = {
  critical: {bg:"rgba(255,68,68,0.12)",   color:"#ff6b6b"},
  high:     {bg:"rgba(255,154,60,0.12)",  color:"#ff9a3c"},
  medium:   {bg:"rgba(255,217,61,0.1)",   color:"#ffd93d"},
  low:      {bg:"rgba(0,255,136,0.08)",   color:"#00ff88"},
  info:     {bg:"rgba(59,130,246,0.1)",   color:"#60a5fa"},
};
const SEVERITIES = ["","critical","high","medium","low"];
const STATUSES   = ["","active","blocked","investigating","resolved"];

export default function ThreatsPage() {
  const qc = useQueryClient();
  const [severity, setSeverity] = useState("");
  const [status,   setStatus]   = useState("");
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState<string|null>(null);

  const { data: threats = [], isLoading } = useQuery({
    queryKey: ["threats", severity, status, search],
    queryFn: () => threatsApi.list({ severity:severity||undefined, status:status||undefined, search:search||undefined, limit:100 }).then(r=>r.data),
    refetchInterval: 15_000,
  });
  const { data: stats } = useQuery({
    queryKey: ["threat-stats"],
    queryFn: () => threatsApi.getStats().then(r=>r.data),
    refetchInterval: 15_000,
  });
  const resolve = useMutation({
    mutationFn: (id:string) => threatsApi.resolve(id),
    onSuccess: () => { toast.success("Threat resolved"); qc.invalidateQueries({queryKey:["threats"]}); qc.invalidateQueries({queryKey:["threat-stats"]}); qc.invalidateQueries({queryKey:["dashboard-overview"]}); },
    onError: (e:any) => toast.error(e.response?.data?.detail || "Failed"),
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{ background:"linear-gradient(135deg,rgba(10,21,32,0.9) 0%,rgba(5,12,20,0.95) 100%)", border:"1px solid rgba(0,255,136,0.1)" }}
      >
        <div className="radial-glow" style={{width:400,height:200,top:-60,right:-60,opacity:0.5}} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="section-label mb-2">Layer 1</div>
            <h1 className="text-2xl font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Threat Center</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">Sentinel Mesh Firewall detections</p>
          </div>
          <div className="flex items-center gap-3">
            {stats && [
              {l:"Total",    v:stats.total,    c:"#94a3b8"},
              {l:"Active",   v:stats.active,   c:"#ff9a3c"},
              {l:"Blocked",  v:stats.blocked,  c:"#00ff88"},
              {l:"Critical", v:stats.critical, c:"#ff6b6b"},
            ].map(s=>(
              <div key={s.l} className="text-center px-4 py-2 rounded-lg" style={{background:"rgba(3,8,13,0.6)",border:"1px solid rgba(14,34,53,0.9)"}}>
                <div className="text-lg font-bold" style={{fontFamily:"'Space Grotesk',sans-serif",color:s.c}}>{s.v}</div>
                <div className="text-[9px] font-mono text-slate-600">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Type chips */}
      {stats?.by_type?.length > 0 && (
        <div className="card p-4">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">Attack Types (7d)</p>
          <div className="flex flex-wrap gap-2">
            {stats.by_type.map((t:any) => {
              const s = SEV_STYLE.high;
              return (
                <button key={t.type} onClick={()=>setSearch(formatThreatType(t.type))}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono transition-all hover:scale-105"
                  style={{background:"rgba(14,34,53,0.6)",border:"1px solid rgba(21,53,90,0.9)",color:"#94a3b8"}}
                >
                  <span style={{color:"#00ff88",fontWeight:700}}>{t.count}</span>
                  {formatThreatType(t.type)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{background:"var(--dark-3)",border:"1px solid var(--border-c)"}}>
          <Search size={12} className="text-slate-600" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search threats..." className="bg-transparent text-xs text-slate-400 placeholder-slate-700 outline-none font-mono w-40" />
        </div>
        <select value={severity} onChange={e=>setSeverity(e.target.value)} className="select-dark text-xs py-2">
          {SEVERITIES.map(s=><option key={s} value={s}>{s||"All severities"}</option>)}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="select-dark text-xs py-2">
          {STATUSES.map(s=><option key={s} value={s}>{s||"All statuses"}</option>)}
        </select>
        {(severity||status||search) && (
          <button onClick={()=>{setSeverity("");setStatus("");setSearch("");}} className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors">
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[10px] font-mono text-slate-600">{threats.length} results</span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="dtable">
            <thead>
              <tr>
                <th>Title</th><th>Type</th><th>Severity</th><th>Status</th><th>Risk</th><th>Detected</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? [...Array(5)].map((_,i)=>(
                <tr key={i}>{[...Array(7)].map((_,j)=>(
                  <td key={j}><div className="h-3 rounded animate-pulse w-20" style={{background:"rgba(14,34,53,0.9)"}} /></td>
                ))}</tr>
              )) : threats.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-600 text-xs font-mono">
                  No threats match filters. Run a demo scenario to generate data.
                </td></tr>
              ) : threats.map((t:any) => {
                const sev = SEV_STYLE[t.severity] ?? SEV_STYLE.info;
                return (
                  <>
                    <tr key={t.id} className="cursor-pointer" onClick={()=>setExpanded(expanded===t.id?null:t.id)}>
                      <td className="max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {expanded===t.id ? <ChevronUp size={10} className="text-slate-600 flex-shrink-0"/> : <ChevronDown size={10} className="text-slate-600 flex-shrink-0"/>}
                          <span className="text-xs text-slate-200 truncate">{t.title}</span>
                        </div>
                      </td>
                      <td><span className="text-[10px] font-mono text-slate-500">{formatThreatType(t.threat_type)}</span></td>
                      <td>
                        <span className="badge" style={{background:sev.bg,borderColor:`${sev.color}40`,color:sev.color}}>
                          {t.severity}
                        </span>
                      </td>
                      <td>
                        <span className="text-[10px] font-mono capitalize" style={{color:t.status==="blocked"||t.status==="resolved"?"#00ff88":"#ff9a3c"}}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="score-bar w-12">
                            <div className="score-bar-fill" style={{width:`${(t.risk_score*100).toFixed(0)}%`,background:t.risk_score>=0.7?"#ff4444":t.risk_score>=0.4?"#ff9a3c":"#ffd93d"}} />
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{(t.risk_score*100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td><span className="text-[10px] font-mono text-slate-600">{formatRelativeTime(t.detected_at)}</span></td>
                      <td>
                        {t.status!=="resolved" && (
                          <button onClick={e=>{e.stopPropagation();resolve.mutate(t.id);}} disabled={resolve.isPending}
                            className="flex items-center gap-1 text-[10px] font-mono text-[#00ff88] hover:opacity-70 transition-opacity disabled:opacity-40">
                            <CheckCircle size={10}/> Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded===t.id && (
                      <tr key={`${t.id}-exp`}>
                        <td colSpan={7} style={{background:"rgba(3,8,13,0.6)",padding:"16px 24px"}}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                            {t.explanation && (
                              <div>
                                <p className="text-slate-600 uppercase text-[9px] tracking-widest mb-1.5">Explanation</p>
                                <p className="text-slate-300 leading-relaxed">{t.explanation}</p>
                              </div>
                            )}
                            {t.recommended_action && (
                              <div>
                                <p className="text-slate-600 uppercase text-[9px] tracking-widest mb-1.5">Recommended Action</p>
                                <p style={{color:"#00ff88"}}>{t.recommended_action}</p>
                              </div>
                            )}
                            {t.evidence && Object.keys(t.evidence).length>0 && (
                              <div className="md:col-span-2">
                                <p className="text-slate-600 uppercase text-[9px] tracking-widest mb-1.5">Evidence</p>
                                <pre className="text-slate-400 text-[10px] rounded-lg p-3 overflow-x-auto" style={{background:"rgba(3,8,13,0.8)",border:"1px solid rgba(14,34,53,0.9)"}}>
                                  {JSON.stringify(t.evidence,null,2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
