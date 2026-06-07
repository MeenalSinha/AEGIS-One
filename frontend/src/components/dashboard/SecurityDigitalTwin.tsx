"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/lib/api";
import { Network, RefreshCw } from "lucide-react";

interface Node {
  id: string; name: string; x: number; y: number;
  trust: number; threat: number; status: string; role: string;
  connections: string[];
}

const STATUS_COLOR: Record<string, string> = {
  active: "#00ff88", inactive: "#475569",
  quarantined: "#ff4444", suspended: "#ff9a3c",
};

function getColor(node: Node): string {
  if (node.status === "quarantined") return "#ff4444";
  if (node.status === "suspended")   return "#ff9a3c";
  if (node.threat > 60)              return "#ff9a3c";
  if (node.trust >= 80)              return "#00ff88";
  if (node.trust >= 50)              return "#ffd93d";
  return "#ff4444";
}

function buildNodes(agents: any[]): Node[] {
  if (!agents?.length) return getFallback();
  const W = 480, H = 300, cx = W / 2, cy = H / 2;
  const hub = agents.find((a) => a.role === "orchestrator") ?? agents[0];
  const rest = agents.filter((a) => a.id !== hub.id).slice(0, 7);
  const nodes: Node[] = [{
    id: hub.id, name: hub.name.slice(0, 13),
    x: cx, y: cy,
    trust: hub.trust_score, threat: hub.threat_score,
    status: hub.status, role: hub.role,
    connections: rest.map((a) => a.id),
  }];
  rest.forEach((a, i) => {
    const angle = (2 * Math.PI * i) / rest.length - Math.PI / 2;
    const r = Math.min(cx, cy) - 52;
    nodes.push({
      id: a.id, name: a.name.slice(0, 12),
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      trust: a.trust_score, threat: a.threat_score,
      status: a.status, role: a.role,
      connections: [hub.id],
    });
  });
  return nodes;
}

function getFallback(): Node[] {
  return [
    { id:"hub", name:"Orchestrator", x:240, y:150, trust:98, threat:2,  status:"active",      role:"orchestrator", connections:["a1","a2","a3","a4","a5"] },
    { id:"a1",  name:"Analyst-01",   x:88,  y:65,  trust:92, threat:5,  status:"active",      role:"analyst",      connections:["hub"] },
    { id:"a2",  name:"DataProc-02",  x:392, y:65,  trust:45, threat:68, status:"suspicious",  role:"executor",     connections:["hub"] },
    { id:"a3",  name:"Writer-03",    x:72,  y:235, trust:95, threat:3,  status:"active",      role:"assistant",    connections:["hub"] },
    { id:"a4",  name:"Executor-04",  x:408, y:235, trust:5,  threat:95, status:"quarantined", role:"executor",     connections:["hub"] },
    { id:"a5",  name:"Email-05",     x:240, y:272, trust:88, threat:12, status:"active",      role:"assistant",    connections:["hub"] },
  ];
}

export function SecurityDigitalTwin() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const nodesRef  = useRef<Node[]>(getFallback());
  const [tooltip, setTooltip] = useState<{ node: Node; px: number; py: number } | null>(null);

  const { data: agents = [], refetch } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.list().then((r) => r.data),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    nodesRef.current = buildNodes(agents.length ? agents : null as any);
  }, [agents]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sy;
    for (const n of nodesRef.current) {
      const r = n.role === "orchestrator" || n.id === "hub" ? 20 : 14;
      if (Math.hypot(mx - n.x, my - n.y) < r) {
        setTooltip({ node: n, px: e.clientX - rect.left, py: e.clientY - rect.top });
        return;
      }
    }
    setTooltip(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const nodes = nodesRef.current;

      // Connections
      nodes.forEach((node) => {
        node.connections.forEach((cid) => {
          const target = nodes.find((n) => n.id === cid);
          if (!target) return;
          const pulse = (Math.sin(t * 0.0012 + node.x * 0.011) + 1) * 0.5;
          const risky = node.status !== "active" || target.status !== "active" || node.threat > 50;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.strokeStyle = risky
            ? `rgba(255,68,68,${0.1 + pulse * 0.22})`
            : `rgba(0,255,136,${0.07 + pulse * 0.1})`;
          ctx.lineWidth = risky ? 1.5 : 1;
          ctx.setLineDash([3, 7]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      });

      // Nodes
      nodes.forEach((node) => {
        const c = getColor(node);
        const isHub = node.role === "orchestrator" || node.id === "hub";
        const rad   = isHub ? 20 : 13;
        const pulse = (Math.sin(t * 0.002 + node.x * 0.009) + 1) * 0.5;

        // Alert halo
        if (node.status !== "active" || node.threat > 50) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, rad + 8 + pulse * 5, 0, Math.PI * 2);
          ctx.fillStyle = `${c}12`;
          ctx.fill();
        }
        // Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = `${c}18`;
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = isHub ? 2.5 : 1.5;
        ctx.stroke();
        // Core dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, isHub ? 7 : 4, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.75 + pulse * 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;
        // Label
        ctx.font = "9px 'JetBrains Mono',monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "center";
        ctx.fillText(node.name, node.x, node.y + rad + 13);
        // Trust
        ctx.font = "bold 8px 'JetBrains Mono',monospace";
        ctx.fillStyle = c;
        ctx.fillText(`${Math.round(node.trust)}%`, node.x, node.y + rad + 23);
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="icon-box w-9 h-9" style={{ background:"rgba(0,255,136,0.1)", borderColor:"rgba(0,255,136,0.22)" }}>
            <Network size={15} style={{ color:"#00ff88" }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white" style={{ fontFamily:"'Space Grotesk',sans-serif" }}>
              Security Digital Twin
            </h2>
            <p className="text-[10px] font-mono text-slate-600">
              {agents.length > 0 ? `${agents.length} live agents` : "Demo mode — register agents"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[9px] font-mono">
            {[["#00ff88","Active"],["#ff9a3c","Suspicious"],["#ff4444","Quarantined"]].map(([c,l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:c }} />
                <span className="text-slate-500">{l}</span>
              </span>
            ))}
          </div>
          <button onClick={() => refetch()} className="text-slate-600 hover:text-slate-400 transition-colors p-1">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div
        className="relative rounded-xl overflow-hidden scan-wrap"
        style={{ background:"var(--dark-2)", border:"1px solid rgba(14,34,53,0.9)" }}
      >
        <canvas
          ref={canvasRef}
          width={480} height={300}
          className="w-full"
          style={{ height: 300 }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
        {tooltip && (
          <div
            className="absolute z-20 card-bright px-3 py-2 text-[10px] font-mono pointer-events-none"
            style={{ left: tooltip.px + 12, top: tooltip.py - 10, minWidth: 140 }}
          >
            <p className="text-white font-semibold mb-1">{tooltip.node.name}</p>
            <p className="text-slate-500 mb-0.5">Role: {tooltip.node.role}</p>
            <p style={{ color: getColor(tooltip.node) }}>
              Trust {Math.round(tooltip.node.trust)}% · Threat {Math.round(tooltip.node.threat)}%
            </p>
            <p className="capitalize mt-0.5" style={{ color: STATUS_COLOR[tooltip.node.status] ?? "#94a3b8" }}>
              {tooltip.node.status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
