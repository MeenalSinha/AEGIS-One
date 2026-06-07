"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentsApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { Shield, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import toast from "react-hot-toast";

const SEV_STYLE: Record<string,{bg:string;color:string}> = {
  critical:{bg:"rgba(255,68,68,0.12)",  color:"#ff6b6b"},
  high:    {bg:"rgba(255,154,60,0.12)", color:"#ff9a3c"},
  medium:  {bg:"rgba(255,217,61,0.1)",  color:"#ffd93d"},
  low:     {bg:"rgba(0,255,136,0.08)", color:"#00ff88"},
};

export default function IncidentsPage() {
  const qc = useQueryClient();
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => incidentsApi.list().then(r=>r.data),
    refetchInterval: 15_000,
  });
  const { data: stats } = useQuery({
    queryKey: ["incident-stats"],
    queryFn: () => incidentsApi.getStats().then(r=>r.data),
    refetchInterval: 15_000,
  });
  const resolve = useMutation({
    mutationFn: (id:string) => incidentsApi.resolve(id),
    onSuccess: ()=>{ toast.success("Incident resolved"); qc.invalidateQueries({queryKey:["incidents"]}); qc.invalidateQueries({queryKey:["dashboard-overview"]}); },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{background:"linear-gradient(135deg,rgba(10,21,32,0.9) 0%,rgba(5,12,20,0.95) 100%)",border:"1px solid rgba(0,255,136,0.1)"}}>
        <div className="radial-glow" style={{width:400,height:200,top:-60,right:-60,opacity:0.5}}/>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="section-label mb-2">Layer 3</div>
            <h1 className="text-2xl font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Incident Center</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">Incident Responder Agent — Autonomous Mitigation</p>
          </div>
          {stats && (
            <div className="flex items-center gap-3">
              {[{l:"Total",v:stats.total,c:"#94a3b8"},{l:"Open",v:stats.open,c:"#ff9a3c"},{l:"Critical",v:stats.critical,c:"#ff6b6b"},{l:"Resolved",v:stats.resolved,c:"#00ff88"}].map(s=>(
                <div key={s.l} className="text-center px-4 py-2 rounded-lg" style={{background:"rgba(3,8,13,0.6)",border:"1px solid rgba(14,34,53,0.9)"}}>
                  <div className="text-lg font-bold" style={{fontFamily:"'Space Grotesk',sans-serif",color:s.c}}>{s.v}</div>
                  <div className="text-[9px] font-mono text-slate-600">{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incident cards */}
      <div className="space-y-4">
        {isLoading ? [...Array(3)].map((_,i)=>(
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 rounded w-1/3 mb-2" style={{background:"rgba(14,34,53,0.9)"}}/>
            <div className="h-3 rounded w-2/3" style={{background:"rgba(14,34,53,0.9)"}}/>
          </div>
        )) : incidents.length===0 ? (
          <div className="card p-10 text-center text-slate-600 text-sm font-mono">
            No incidents. Run the Rogue Agent demo to generate one.
          </div>
        ) : incidents.map((inc:any)=>{
          const sev = SEV_STYLE[inc.severity]??SEV_STYLE.low;
          return (
            <div key={inc.id} className="card p-6 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="icon-box w-8 h-8 rounded-lg" style={{background:sev.bg,borderColor:`${sev.color}30`}}>
                      <Shield size={14} style={{color:sev.color}}/>
                    </div>
                    <h3 className="text-sm font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{inc.title}</h3>
                    <span className="badge" style={{background:sev.bg,borderColor:`${sev.color}40`,color:sev.color}}>{inc.severity}</span>
                    <span className={`badge ${inc.status==="resolved"?"badge-green":inc.status==="open"?"badge-high":""}`}>{inc.status}</span>
                  </div>
                  {inc.description && <p className="text-xs text-slate-500 font-mono mb-3 leading-relaxed">{inc.description}</p>}

                  {/* Timeline */}
                  {inc.timeline?.length>0 && (
                    <div className="mb-3 space-y-1.5">
                      {inc.timeline.slice(0,3).map((t:any,i:number)=>(
                        <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                          <Clock size={9} className="text-slate-700 flex-shrink-0"/>
                          <span className="text-slate-500">{t.event}</span>
                          <span className="ml-auto text-slate-700">{formatRelativeTime(t.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions taken */}
                  {inc.actions_taken?.length>0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {inc.actions_taken.map((a:string,i:number)=>(
                        <span key={i} className="badge badge-info" style={{fontSize:"9px"}}>{a.replace(/_/g," ")}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-[10px] font-mono text-slate-600">{formatRelativeTime(inc.opened_at)}</span>
                  {inc.status!=="resolved" && (
                    <button onClick={()=>resolve.mutate(inc.id)} disabled={resolve.isPending}
                      className="btn-outline text-[10px] py-1.5 px-3 flex items-center gap-1.5">
                      <CheckCircle size={11}/> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
