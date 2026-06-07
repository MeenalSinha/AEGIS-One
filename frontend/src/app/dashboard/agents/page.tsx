"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/lib/api";
import { scoreToColor } from "@/lib/utils";
import { Bot, Plus, Lock, Unlock, X, Key, Shield } from "lucide-react";
import toast from "react-hot-toast";

const ROLES = ["assistant","analyst","executor","orchestrator","monitor","auditor"];
const PERM_COLORS: Record<string,string> = {
  read:"#3b82f6", write:"#f59e0b", execute:"#ef4444",
  admin:"#a855f7", audit:"#00ff88", network:"#f97316",
};
const STATUS_COLOR: Record<string,string> = {
  active:"#00ff88", quarantined:"#ff4444", suspended:"#ff9a3c", inactive:"#475569",
};

export default function AgentsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({name:"",role:"assistant",description:"",permissions:[] as string[]});

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.list().then(r=>r.data),
    refetchInterval: 15_000,
  });

  const create = useMutation({
    mutationFn: (d:any) => agentsApi.create(d),
    onSuccess: () => { toast.success("Agent registered"); qc.invalidateQueries({queryKey:["agents"]}); setShowCreate(false); setForm({name:"",role:"assistant",description:"",permissions:[]}); },
    onError: (e:any) => toast.error(e.response?.data?.detail ?? "Failed"),
  });
  const quarantine = useMutation({
    mutationFn: (id:string) => agentsApi.quarantine(id),
    onSuccess: () => { toast.success("Agent quarantined"); qc.invalidateQueries({queryKey:["agents"]}); },
  });
  const restore = useMutation({
    mutationFn: (id:string) => agentsApi.restore(id),
    onSuccess: () => { toast.success("Agent restored"); qc.invalidateQueries({queryKey:["agents"]}); },
  });

  const togglePerm = (p:string) =>
    setForm(f => ({...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x=>x!==p) : [...f.permissions,p]}));

  const active  = agents.filter((a:any)=>a.status==="active").length;
  const qd      = agents.filter((a:any)=>a.status==="quarantined").length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{background:"linear-gradient(135deg,rgba(10,21,32,0.9) 0%,rgba(5,12,20,0.95) 100%)",border:"1px solid rgba(0,255,136,0.1)"}}>
        <div className="radial-glow" style={{width:400,height:200,top:-60,right:-60,opacity:0.5}}/>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="section-label mb-2">Layer 4</div>
            <h1 className="text-2xl font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Agent Center</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">Identity & Trust Registry — RBAC — Cryptographic Identity</p>
          </div>
          <div className="flex items-center gap-3">
            {[{l:"Registered",v:agents.length,c:"#94a3b8"},{l:"Active",v:active,c:"#00ff88"},{l:"Quarantined",v:qd,c:"#ff6b6b"}].map(s=>(
              <div key={s.l} className="text-center px-4 py-2 rounded-lg" style={{background:"rgba(3,8,13,0.6)",border:"1px solid rgba(14,34,53,0.9)"}}>
                <div className="text-lg font-bold" style={{fontFamily:"'Space Grotesk',sans-serif",color:s.c}}>{s.v}</div>
                <div className="text-[9px] font-mono text-slate-600">{s.l}</div>
              </div>
            ))}
            <button onClick={()=>setShowCreate(!showCreate)}
              className="btn-outline text-xs flex items-center gap-1.5">
              <Plus size={13}/> Register Agent
            </button>
          </div>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card-glow p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Register New Agent</h3>
            <button onClick={()=>setShowCreate(false)} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={15}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Name</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Agent name" className="input-dark" />
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Role</label>
              <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="select-dark w-full">
                {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">Description</label>
              <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Optional" className="input-dark" />
            </div>
          </div>
          <div className="mb-5">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">Permissions</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PERM_COLORS).map(p=>{
                const active = form.permissions.includes(p);
                const c = PERM_COLORS[p];
                return (
                  <button key={p} onClick={()=>togglePerm(p)}
                    className="text-[10px] font-mono px-2.5 py-1 rounded border transition-all"
                    style={{
                      background: active?`${c}15`:"rgba(3,8,13,0.5)",
                      borderColor: active?`${c}40`:"rgba(14,34,53,0.9)",
                      color: active?c:"#64748b",
                    }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={()=>create.mutate(form)}
            disabled={!form.name.trim()||create.isPending}
            className="btn-primary disabled:opacity-40"
          >
            {create.isPending ? "Registering..." : "Register Agent"}
          </button>
        </div>
      )}

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {isLoading ? [...Array(6)].map((_,i)=>(
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 rounded w-1/2 mb-3" style={{background:"rgba(14,34,53,0.9)"}}/>
            <div className="h-3 rounded w-3/4 mb-2" style={{background:"rgba(14,34,53,0.9)"}}/>
            <div className="h-1.5 rounded" style={{background:"rgba(14,34,53,0.9)"}}/>
          </div>
        )) : agents.length===0 ? (
          <div className="col-span-3 card p-10 text-center text-slate-600 text-sm font-mono">
            No agents registered. Click "Register Agent" or run a demo scenario.
          </div>
        ) : agents.map((a:any)=>(
          <div key={a.id} className="card p-5 hover:border-[rgba(0,255,136,0.18)] transition-colors">
            {/* Top */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="icon-box w-10 h-10" style={{background:"rgba(0,255,136,0.08)",borderColor:"rgba(0,255,136,0.18)"}}>
                  <Bot size={17} style={{color:"#00ff88"}}/>
                </div>
                <div>
                  <p className="text-sm font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{a.name}</p>
                  <p className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">{a.role}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono capitalize" style={{color:STATUS_COLOR[a.status]??"#94a3b8"}}>{a.status}</span>
            </div>

            {/* Scores */}
            <div className="space-y-2.5 mb-4">
              {[{l:"Trust",v:a.trust_score},{l:"Health",v:a.health_score}].map(s=>(
                <div key={s.l} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-600 w-12 flex-shrink-0">{s.l}</span>
                  <div className="flex-1 score-bar">
                    <div className="score-bar-fill" style={{width:`${s.v}%`,background:scoreToColor(s.v)}}/>
                  </div>
                  <span className="text-[10px] font-mono w-8 text-right flex-shrink-0" style={{color:scoreToColor(s.v)}}>
                    {s.v.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Permissions */}
            {a.permissions?.length>0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {a.permissions.map((p:string,i:number)=>{
                  const c = PERM_COLORS[p]??"#94a3b8";
                  return <span key={i} className="badge" style={{background:`${c}12`,borderColor:`${c}30`,color:c}}>{p}</span>;
                })}
              </div>
            )}

            {/* Crypto ID */}
            <div className="text-[9px] font-mono text-slate-700 truncate mb-3 flex items-center gap-1.5">
              <Key size={9} className="text-slate-700 flex-shrink-0"/>
              {a.cryptographic_identity?.slice(0,34)}...
            </div>

            {/* Action */}
            <div>
              {a.status==="quarantined" ? (
                <button onClick={()=>restore.mutate(a.id)} disabled={restore.isPending}
                  className="btn-ghost text-[10px] py-1.5" style={{color:"#00ff88",borderColor:"rgba(0,255,136,0.2)"}}>
                  <Unlock size={10}/> Restore Agent
                </button>
              ) : (
                <button onClick={()=>quarantine.mutate(a.id)} disabled={quarantine.isPending}
                  className="btn-ghost text-[10px] py-1.5" style={{color:"#ff6b6b",borderColor:"rgba(255,68,68,0.2)"}}>
                  <Lock size={10}/> Quarantine
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
