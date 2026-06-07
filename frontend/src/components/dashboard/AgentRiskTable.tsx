"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/lib/api";
import { scoreToColor } from "@/lib/utils";
import { Bot, Lock, Unlock, ArrowUp, ArrowDown, Search } from "lucide-react";
import toast from "react-hot-toast";

type SK = "name" | "trust_score" | "threat_score" | "health_score";

function Bar({ value, inv = false }: { value: number; inv?: boolean }) {
  const color = inv
    ? value > 70 ? "#ff4444" : value > 40 ? "#ffd93d" : "#00ff88"
    : scoreToColor(value);
  return (
    <div className="flex items-center gap-2">
      <div className="score-bar w-14">
        <div className="score-bar-fill" style={{ width:`${value}%`, background:color }} />
      </div>
      <span className="text-[10px] font-mono w-7 text-right" style={{ color }}>{Math.round(value)}</span>
    </div>
  );
}

export function AgentRiskTable() {
  const qc = useQueryClient();
  const [sk, setSk] = useState<SK>("trust_score");
  const [sd, setSd] = useState<"asc"|"desc">("asc");
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.list().then((r) => r.data),
    refetchInterval: 15_000,
  });

  const quarantine = useMutation({
    mutationFn: (id: string) => agentsApi.quarantine(id),
    onSuccess: () => { toast.success("Agent quarantined"); qc.invalidateQueries({ queryKey:["agents"] }); qc.invalidateQueries({ queryKey:["dashboard-overview"] }); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Failed"),
  });
  const restore = useMutation({
    mutationFn: (id: string) => agentsApi.restore(id),
    onSuccess: () => { toast.success("Agent restored"); qc.invalidateQueries({ queryKey:["agents"] }); qc.invalidateQueries({ queryKey:["dashboard-overview"] }); },
    onError: (e: any) => toast.error(e.response?.data?.detail ?? "Failed"),
  });

  const handleSort = (key: SK) => {
    if (sk === key) setSd(d => d === "asc" ? "desc" : "asc");
    else { setSk(key); setSd("asc"); }
  };

  const filtered = data.filter((a: any) =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );
  const sorted = [...filtered].sort((a: any, b: any) => {
    const av = a[sk], bv = b[sk];
    const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
    return sd === "asc" ? cmp : -cmp;
  });

  const SI = ({ col }: { col: SK }) => sk === col
    ? sd === "asc" ? <ArrowUp size={9} className="inline ml-0.5" /> : <ArrowDown size={9} className="inline ml-0.5" />
    : null;

  const TH = ({ col, children }: { col: SK; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(col)}
      className="cursor-pointer hover:opacity-80 transition-opacity select-none"
    >
      {children}<SI col={col} />
    </th>
  );

  const STATUS_COLOR: Record<string, string> = {
    active:"#00ff88", quarantined:"#ff4444", suspended:"#ff9a3c", inactive:"#475569",
  };

  return (
    <div className="card">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom:"1px solid rgba(14,34,53,0.9)" }}
      >
        <div className="flex items-center gap-3">
          <div className="icon-box w-9 h-9" style={{ background:"rgba(0,255,136,0.1)", borderColor:"rgba(0,255,136,0.22)" }}>
            <Bot size={15} style={{ color:"#00ff88" }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
              Agent Risk Rankings
            </h2>
            <p className="text-[10px] font-mono text-slate-600">{sorted.length} agents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
            style={{ background:"var(--dark-3)", border:"1px solid var(--border-c)" }}
          >
            <Search size={11} className="text-slate-600" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter..." className="bg-transparent text-xs text-slate-400 placeholder-slate-700 outline-none font-mono w-28"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="dtable">
          <thead>
            <tr>
              <TH col="name">Agent</TH>
              <th>Role</th>
              <th>Status</th>
              <TH col="trust_score">Trust</TH>
              <TH col="threat_score">Threat</TH>
              <TH col="health_score">Health</TH>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(4)].map((_,i) => (
                <tr key={i}>{[...Array(7)].map((_,j) => (
                  <td key={j}><div className="h-3 rounded animate-pulse w-16" style={{ background:"rgba(14,34,53,0.9)" }} /></td>
                ))}</tr>
              ))
            ) : sorted.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-600 text-xs font-mono">
                {search ? "No agents match filter." : "No agents registered. Run a demo scenario to seed data."}
              </td></tr>
            ) : sorted.map((a: any) => (
              <tr key={a.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="icon-box w-6 h-6 rounded-md" style={{ background:"rgba(14,34,53,0.9)", borderColor:"var(--border-c)" }}>
                      <Bot size={10} className="text-slate-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">{a.name}</span>
                  </div>
                </td>
                <td><span className="text-[10px] font-mono text-slate-500 uppercase">{a.role}</span></td>
                <td>
                  <span className="text-[10px] font-mono capitalize" style={{ color: STATUS_COLOR[a.status] ?? "#94a3b8" }}>
                    {a.status}
                  </span>
                </td>
                <td><Bar value={a.trust_score} /></td>
                <td><Bar value={a.threat_score} inv /></td>
                <td><Bar value={a.health_score} /></td>
                <td>
                  {a.status === "quarantined" ? (
                    <button
                      onClick={() => restore.mutate(a.id)}
                      disabled={restore.isPending}
                      className="btn-ghost text-[10px] py-1 px-2"
                      style={{ color:"#00ff88", borderColor:"rgba(0,255,136,0.2)" }}
                    >
                      <Unlock size={9} /> Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => quarantine.mutate(a.id)}
                      disabled={quarantine.isPending}
                      className="btn-ghost text-[10px] py-1 px-2"
                      style={{ color:"#ff6b6b", borderColor:"rgba(255,68,68,0.2)" }}
                    >
                      <Lock size={9} /> Quarantine
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
