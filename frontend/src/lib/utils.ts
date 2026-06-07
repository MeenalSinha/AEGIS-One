import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: "#ff4444",
    high: "#ff8800",
    medium: "#ffcc00",
    low: "#00ff88",
    info: "#4488ff",
  };
  return map[severity?.toLowerCase()] ?? "#888888";
}

export function getSeverityBg(severity: string): string {
  const map: Record<string, string> = {
    critical: "bg-red-500/10 border border-red-500/30 text-red-400",
    high: "bg-orange-500/10 border border-orange-500/30 text-orange-400",
    medium: "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400",
    low: "bg-green-500/10 border border-green-500/20 text-green-400",
    info: "bg-blue-500/10 border border-blue-500/30 text-blue-400",
  };
  return map[severity?.toLowerCase()] ?? "bg-slate-800/50 border border-slate-700 text-slate-400";
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: "text-green-400",
    inactive: "text-slate-500",
    quarantined: "text-red-400",
    suspended: "text-orange-400",
    blocked: "text-red-400",
    resolved: "text-green-400",
    open: "text-orange-400",
    investigating: "text-yellow-400",
    compliant: "text-green-400",
    partial: "text-yellow-400",
    non_compliant: "text-red-400",
  };
  return map[status?.toLowerCase()] ?? "text-slate-400";
}

export function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
  } catch {
    return "--";
  }
}

export function formatRelativeTime(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 0) return "just now";
    const secs = Math.floor(diff / 1000);
    if (secs < 5) return "just now";
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString();
  } catch {
    return "--";
  }
}

export function formatThreatType(t: string): string {
  return (t || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scoreToColor(score: number): string {
  if (score >= 85) return "#00ff88";
  if (score >= 65) return "#ffcc00";
  if (score >= 40) return "#ff8800";
  return "#ff4444";
}

export function riskToColor(riskScore: number): string {
  // risk_score is 0.0–1.0
  if (riskScore >= 0.8) return "#ff4444";
  if (riskScore >= 0.6) return "#ff8800";
  if (riskScore >= 0.4) return "#ffcc00";
  return "#00ff88";
}

export function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "..." : s;
}
