"use client";

import { useState, useEffect } from "react";
import { Settings, Shield, Key, Bell, Database, Save, CheckCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const KEY = "aegis_settings_v2";

const DEFAULTS = {
  firewall_mode:       "enforce",
  ai_analysis:         true,
  heuristic_scan:      true,
  risk_threshold:      "0.75",
  model:               "gpt-4o",
  use_azure:           false,
  max_tokens:          "1000",
  critical_alerts:     true,
  incident_alerts:     true,
  compliance_alerts:   true,
  threat_retention:    "90",
  audit_retention:     "365",
  incident_retention:  "365",
};

type Vals = typeof DEFAULTS;

const SECTIONS = [
  {
    key: "firewall",
    label: "Firewall Configuration",
    icon: Shield,
    accent: "#00ff88",
    fields: [
      {k:"firewall_mode",  label:"Enforcement Mode",       type:"select", opts:["enforce","monitor","audit"]},
      {k:"ai_analysis",    label:"AI Deep Analysis",        type:"toggle"},
      {k:"heuristic_scan", label:"Heuristic Pre-scan",      type:"toggle"},
      {k:"risk_threshold", label:"Risk Block Threshold",    type:"number", min:"0", max:"1",    step:"0.05"},
    ],
  },
  {
    key: "ai",
    label: "AI Configuration",
    icon: Key,
    accent: "#3b82f6",
    fields: [
      {k:"model",      label:"AI Model",               type:"select", opts:["gpt-4o","gpt-4-turbo","gpt-3.5-turbo"]},
      {k:"use_azure",  label:"Use Azure OpenAI",        type:"toggle"},
      {k:"max_tokens", label:"Max Tokens per Call",     type:"number", min:"200", max:"4000", step:"100"},
    ],
  },
  {
    key: "notif",
    label: "Notifications",
    icon: Bell,
    accent: "#f59e0b",
    fields: [
      {k:"critical_alerts",   label:"Critical Threat Alerts",  type:"toggle"},
      {k:"incident_alerts",   label:"Incident Notifications",  type:"toggle"},
      {k:"compliance_alerts", label:"Compliance Violations",   type:"toggle"},
    ],
  },
  {
    key: "retention",
    label: "Data Retention",
    icon: Database,
    accent: "#a855f7",
    fields: [
      {k:"threat_retention",   label:"Threat Log Retention (days)",   type:"number", min:"7",  max:"730",  step:"1"},
      {k:"audit_retention",    label:"Audit Log Retention (days)",    type:"number", min:"30", max:"2555", step:"1"},
      {k:"incident_retention", label:"Incident Retention (days)",     type:"number", min:"30", max:"2555", step:"1"},
    ],
  },
];

export default function SettingsPage() {
  const [vals,  setVals]  = useState<Vals>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setVals({ ...DEFAULTS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const set = (k: string, v: any) => {
    setVals(p => ({ ...p, [k]: v }));
    setDirty(true);
    setSaved(false);
  };

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(vals));
      setSaved(true);
      setDirty(false);
      toast.success("Configuration saved");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const reset = () => {
    setVals(DEFAULTS);
    localStorage.removeItem(KEY);
    setDirty(false);
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden px-8 py-7"
        style={{ background: "linear-gradient(135deg,rgba(10,21,32,0.9) 0%,rgba(5,12,20,0.95) 100%)", border: "1px solid rgba(0,255,136,0.1)" }}>
        <div className="radial-glow" style={{ width: 400, height: 200, top: -60, right: -60, opacity: 0.5 }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="section-label mb-2">Platform</div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Settings</h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">Platform configuration, security policies, and data retention</p>
          </div>
          {dirty && (
            <span className="text-[10px] font-mono px-2.5 py-1.5 rounded-md"
              style={{ color: "#ffd93d", background: "rgba(255,217,61,0.1)", border: "1px solid rgba(255,217,61,0.2)" }}>
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl space-y-6">
        {SECTIONS.map((sec) => (
          <div key={sec.key} className="card overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid rgba(14,34,53,0.9)" }}>
              <div className="icon-box w-9 h-9" style={{ background: `${sec.accent}12`, borderColor: `${sec.accent}25` }}>
                <sec.icon size={15} style={{ color: sec.accent }} />
              </div>
              <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {sec.label}
              </h2>
            </div>

            {/* Fields */}
            <div className="p-6 space-y-5">
              {sec.fields.map((f) => {
                const v = (vals as any)[f.k];
                return (
                  <div key={f.k} className="flex items-center justify-between gap-6">
                    <div>
                      <label className="text-sm text-slate-200 font-medium">{f.label}</label>
                    </div>

                    {f.type === "toggle" && (
                      <button
                        onClick={() => set(f.k, !v)}
                        className="toggle-track flex-shrink-0"
                        style={{
                          background:   v ? "rgba(0,255,136,0.18)" : "rgba(14,34,53,0.9)",
                          borderColor:  v ? "rgba(0,255,136,0.4)"  : "rgba(21,53,90,0.9)",
                        }}
                        role="switch"
                        aria-checked={v}
                      >
                        <span className="toggle-thumb" style={{
                          left:       v ? "auto" : "3px",
                          right:      v ? "3px"  : "auto",
                          background: v ? "#00ff88" : "#475569",
                        }} />
                      </button>
                    )}

                    {f.type === "select" && (
                      <select
                        value={v}
                        onChange={(e) => set(f.k, e.target.value)}
                        className="select-dark flex-shrink-0"
                      >
                        {(f.opts ?? []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    )}

                    {f.type === "number" && (
                      <input
                        type="number"
                        value={v}
                        min={(f as any).min}
                        max={(f as any).max}
                        step={(f as any).step}
                        onChange={(e) => set(f.k, e.target.value)}
                        className="input-dark flex-shrink-0 text-right"
                        style={{ width: 110 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={save}
            className={cn("btn-primary flex items-center gap-2", saved && "opacity-70")}
            style={saved ? { background: "#00cc69" } : undefined}
          >
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? "Saved" : "Save Configuration"}
          </button>
          <button onClick={reset} className="btn-ghost flex items-center gap-2">
            <RotateCcw size={13} /> Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
