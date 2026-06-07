"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api";
import { ScrollText, CheckCircle, XCircle, Ban, Search } from "lucide-react";

const ICON: Record<string,any> = { success:CheckCircle, failure:XCircle, blocked:Ban, warning:Ban };
const COLOR: Record<string,string> = { success:"#00ff88", failure:"#ff6b6b", blocked:"#ff9a3c", warning:"#ffd93d" };

export default function AuditPage() {
  const [search,  setSearch]  = useState("");
  const [outcome, setOutcome] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", outcome, search],
    queryFn: () => auditApi.list({action:search||undefined, outcome:outcome||undefined, limit:200}).then(r=>r.data),
    refetchInterval: 15_000,
  });
  const { data: stats } = useQuery({
    queryKey: ["audit-stats"],
    queryFn: () => auditApi.getStats().then(r=>r.data),
    refetchInterval: 30_000,
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
            <h1 className="text-2xl font-bold text-white" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Audit Log</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">Forensic trail — tamper-evident append-only log</p>
          </div>
          {stats && (
            <div className="flex items-center gap-3">
              {[{l:"Total",v:stats.total,c:"#94a3b8"},{l:"Blocked",v:stats.blocked,c:"#ff9a3c"},{l:"Failures",v:stats.failures,c:"#ff6b6b"}].map(s=>(
                <div key={s.l} className="text-center px-4 py-2 rounded-lg" style={{background:"rgba(3,8,13,0.6)",border:"1px solid rgba(14,34,53,0.9)"}}>
                  <div className="text-lg font-bold" style={{fontFamily:"'Space Grotesk',sans-serif",color:s.c}}>{s.v}</div>
                  <div className="text-[9px] font-mono text-slate-600">{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{background:"var(--dark-3)",border:"1px solid var(--border-c)"}}>
          <Search size={12} className="text-slate-600"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter by action..." className="bg-transparent text-xs text-slate-400 placeholder-slate-700 outline-none font-mono w-36"/>
        </div>
        <select value={outcome} onChange={e=>setOutcome(e.target.value)} className="select-dark text-xs py-2">
          <option value="">All outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="blocked">Blocked</option>
          <option value="warning">Warning</option>
        </select>
        {(search||outcome) && (
          <button onClick={()=>{setSearch("");setOutcome("");}} className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors">
            Clear
          </button>
        )}
        <span className="ml-auto text-[10px] font-mono text-slate-600">{logs.length} entries</span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="dtable">
            <thead>
              <tr><th>Timestamp</th><th>Agent</th><th>Action</th><th>Resource</th><th>Outcome</th><th>Details</th></tr>
            </thead>
            <tbody>
              {isLoading ? [...Array(8)].map((_,i)=>(
                <tr key={i}>{[...Array(6)].map((_,j)=>(
                  <td key={j}><div className="h-3 rounded animate-pulse w-24" style={{background:"rgba(14,34,53,0.9)"}}/></td>
                ))}</tr>
              )) : logs.length===0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-600 text-xs font-mono">
                  No audit events. Run demo scenarios to generate logs.
                </td></tr>
              ) : logs.map((l:any)=>{
                const Icon = ICON[l.outcome] ?? CheckCircle;
                const color = COLOR[l.outcome] ?? "#94a3b8";
                return (
                  <tr key={l.id}>
                    <td><span className="text-[10px] font-mono text-slate-600">
                      {l.created_at ? new Date(l.created_at).toLocaleString("en-US",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "--"}
                    </span></td>
                    <td><span className="text-[10px] font-mono text-slate-500 truncate block max-w-[100px]" title={l.agent_id}>
                      {l.agent_id ? l.agent_id.slice(0,16)+"..." : "system"}
                    </span></td>
                    <td><span className="text-[11px] font-mono text-slate-200">{l.action}</span></td>
                    <td><span className="text-[10px] font-mono text-slate-500">{l.resource||"--"}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Icon size={10} style={{color}}/>
                        <span className="text-[10px] font-mono capitalize" style={{color}}>{l.outcome}</span>
                      </div>
                    </td>
                    <td>
                      {l.details && Object.keys(l.details).length>0 && (
                        <span className="text-[9px] font-mono text-slate-700 truncate block max-w-[140px]">
                          {JSON.stringify(l.details).slice(0,60)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
