"use client";

import { OverviewCards }       from "@/components/dashboard/OverviewCards";
import { ThreatTimeline }      from "@/components/dashboard/ThreatTimeline";
import { LiveThreatFeed }      from "@/components/dashboard/LiveThreatFeed";
import { AgentRiskTable }      from "@/components/dashboard/AgentRiskTable";
import { ComplianceWidget }    from "@/components/dashboard/ComplianceWidget";
import { SecurityDigitalTwin } from "@/components/dashboard/SecurityDigitalTwin";
import { DemoPanel }           from "@/components/dashboard/DemoPanel";
import { LayerStatusBar }      from "@/components/dashboard/LayerStatusBar";
import { ThreatHeatmap }       from "@/components/dashboard/ThreatHeatmap";
import { ExecSummaryBanner }   from "@/components/dashboard/ExecSummaryBanner";

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ background:"linear-gradient(135deg,rgba(10,21,32,0.95) 0%,rgba(5,12,20,0.98) 100%)", border:"1px solid rgba(0,255,136,0.12)", boxShadow:"0 0 60px rgba(0,255,136,0.04)" }}>
        <div className="radial-glow" style={{width:700,height:350,top:-100,right:-120,opacity:0.65}}/>
        <div className="relative z-10 px-8 py-8 flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="dot-live"/>
              <span className="section-label">Security Operations Center</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight" style={{fontFamily:"'Space Grotesk',sans-serif"}}>
              AEGIS <span className="gradient-text-green">One</span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm max-w-lg leading-relaxed" style={{fontFamily:"'JetBrains Mono',monospace"}}>
              Autonomous Enterprise Governance &amp; Intelligent Security — the AI agent security platform built for the agentic enterprise.
            </p>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="tag"><span style={{color:"var(--g)"}}>5</span> Layers Active</div>
              <div className="tag">16 Attack Vectors</div>
              <div className="tag">6-Agent SOC Swarm</div>
              <div className="tag">Real-time Detection</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Defense Posture</div>
            <div className="text-4xl font-bold gradient-text-green" style={{fontFamily:"'Space Grotesk',sans-serif"}}>ACTIVE</div>
            <div className="text-[10px] font-mono text-slate-600">All systems operational</div>
          </div>
        </div>
      </div>

      {/* 5 Layer status */}
      <LayerStatusBar />

      {/* Exec summary */}
      <ExecSummaryBanner />

      {/* KPI cards */}
      <OverviewCards />

      {/* Timeline + Compliance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2"><ThreatTimeline /></div>
        <div className="xl:col-span-1"><ComplianceWidget /></div>
      </div>

      {/* Digital twin + live feed */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3"><SecurityDigitalTwin /></div>
        <div className="xl:col-span-2"><LiveThreatFeed /></div>
      </div>

      {/* Heatmap */}
      <ThreatHeatmap />

      {/* Agent table + demo */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3"><AgentRiskTable /></div>
        <div className="xl:col-span-2"><DemoPanel /></div>
      </div>
    </div>
  );
}
