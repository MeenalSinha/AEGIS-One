"use client";

import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/lib/api";
import { scoreToColor } from "@/lib/utils";
import { Key, Shield, User, Lock, CheckCircle } from "lucide-react";

const PERM_COLORS: Record<string,string> = {
  read:"#3b82f6", write:"#f59e0b", execute:"#ef4444",
  admin:"#a855f7", audit:"#00ff88", network:"#f97316",
};
const STATUS_COLOR: Record<string,string> = {
  active:"#00ff88", quarantined:"#ff4444", suspended:"#ff9a3c", inactive:"#475569",
};

export default function IdentityPage() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.list().then(r=>r.data),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{background:"linear-gradient(135deg,rgba(10,21,32,0.9) 0%,rgba(5,12,20,0.95) 100%)",border:"1px solid rgba(245,158,11,0.12)"}}>
        <div className="radial-glow" style={{width:400,height:200,top:-60,right:-60,opacity:0.4,background:"radial-gradient(ellipse,rgba(245,158,11,0.18) 0%,transparent 70%)"}}/>
        <div className="relative z-10">
          <div className="section-label mb-2" style={{color:"#f59e0b"}}>Layer 4</div>
          <h1 className="text-2xl font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Agent Identity & Trust</h1>
          <p className="text-sm text-slate-500 mt-1 font-mono">Cryptographic identity · RBAC · Least-privilege enforcement · Trust graph</p>
        </div>
      </div>

      {/* Identity cards */}
      <div className="space-y-4">
        {isLoading ? [...Array(3)].map((_,i)=>(
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 rounded w-1/4 mb-3" style={{background:"rgba(14,34,53,0.9)"}}/>
            <div className="h-3 rounded w-3/4" style={{background:"rgba(14,34,53,0.9)"}}/>
          </div>
        )) : agents.length===0 ? (
          <div className="card p-10 text-center text-slate-600 text-sm font-mono">
            No agent identities. Register agents in the Agent Center.
          </div>
        ) : agents.map((a:any)=>(
          <div key={a.id} className="card p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="icon-box w-12 h-12 rounded-xl flex-shrink-0"
                style={{background:"rgba(0,255,136,0.06)",borderColor:"rgba(0,255,136,0.15)"}}>
                <User size={20} style={{color:"#00ff88"}}/>
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="text-sm font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{a.name}</h3>
                  <span className="tag">{a.role}</span>
                  <span className="text-[10px] font-mono" style={{color:STATUS_COLOR[a.status]??"#94a3b8"}}>{a.status}</span>
                </div>

                {/* Crypto ID */}
                <div className="flex items-center gap-1.5 mb-3">
                  <Key size={10} className="text-slate-600 flex-shrink-0"/>
                  <span className="text-[9px] font-mono text-slate-600 truncate">{a.cryptographic_identity}</span>
                </div>

                {/* Score bars */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  {[{l:"Trust Score",v:a.trust_score},{l:"Health Score",v:a.health_score}].map(s=>(
                    <div key={s.l}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono text-slate-600">{s.l}</span>
                        <span className="text-[10px] font-bold font-mono" style={{color:scoreToColor(s.v)}}>
                          {s.v.toFixed(0)}
                        </span>
                      </div>
                      <div className="score-bar">
                        <div className="score-bar-fill" style={{width:`${s.v}%`,background:scoreToColor(s.v)}}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Permissions */}
                <div>
                  <p className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-1.5">Permissions</p>
                  {a.permissions?.length>0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {a.permissions.map((p:string,i:number)=>{
                        const c = PERM_COLORS[p]??"#94a3b8";
                        return <span key={i} className="badge" style={{background:`${c}12`,borderColor:`${c}30`,color:c}}>{p}</span>;
                      })}
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-700">No explicit permissions (least privilege)</span>
                  )}
                </div>
              </div>

              {/* Right col */}
              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5">
                  <Shield size={11} style={{color:"#00ff88"}}/>
                  <span className="text-[10px] font-mono" style={{color:"#00ff88"}}>Protected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={11} style={{color:"#00ff88"}}/>
                  <span className="text-[10px] font-mono" style={{color:"#00ff88"}}>Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock size={11} className="text-slate-600"/>
                  <span className="text-[10px] font-mono text-slate-600">RBAC Active</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
