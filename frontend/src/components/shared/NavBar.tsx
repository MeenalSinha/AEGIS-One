"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ChevronDown, Menu, X, Bell, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAegisStore } from "@/lib/store";
import { useLiveFeed } from "@/hooks/useLiveFeed";

const NAV_GROUPS = [
  {
    label: "Platform",
    items: [
      { label: "Overview",     href: "/dashboard" },
      { label: "Threat Center",href: "/dashboard/threats" },
      { label: "Incidents",    href: "/dashboard/incidents" },
    ],
  },
  {
    label: "Security",
    items: [
      { label: "Agent Center",  href: "/dashboard/agents" },
      { label: "SOC Swarm",     href: "/dashboard/soc" },
      { label: "Red Team",      href: "/dashboard/redteam" },
      { label: "Identity & Trust",href: "/dashboard/identity" },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Compliance",href: "/dashboard/compliance" },
      { label: "Audit Log", href: "/dashboard/audit" },
      { label: "Settings",  href: "/dashboard/settings" },
    ],
  },
];

export function NavBar() {
  useLiveFeed();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup,  setOpenGroup]  = useState<string | null>(null);
  const { totalThreatsBlocked, wsConnected, liveEvents } = useAegisStore();
  const alerts = liveEvents.filter(e => !e.blocked).length;

  return (
    <nav className="sticky top-0 z-50 w-full"
      style={{ background:"rgba(3,8,13,0.9)", backdropFilter:"blur(24px)", borderBottom:"1px solid rgba(14,34,53,0.9)" }}>
      <div className="container-wide">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background:"rgba(0,255,136,0.1)", border:"1px solid rgba(0,255,136,0.28)" }}>
              <Shield size={15} style={{ color:"#00ff88" }} />
            </div>
            <span className="font-bold text-base tracking-wide" style={{ fontFamily:"'Space Grotesk',sans-serif", color:"#fff" }}>
              AEGIS<span style={{ color:"#00ff88" }}> One</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="relative"
                onMouseEnter={() => setOpenGroup(group.label)}
                onMouseLeave={() => setOpenGroup(null)}>
                <button className={cn(
                  "nav-link flex items-center gap-1",
                  group.items.some(i => pathname === i.href || pathname.startsWith(i.href + "/")) && "active"
                )}>
                  {group.label}
                  <ChevronDown size={11} className={cn("transition-transform", openGroup===group.label && "rotate-180")} />
                </button>
                {openGroup === group.label && (
                  <div className="absolute top-full left-0 mt-1 w-48 rounded-xl overflow-hidden"
                    style={{ background:"rgba(10,21,32,0.98)", border:"1px solid rgba(21,53,90,0.9)", boxShadow:"0 24px 48px rgba(0,0,0,0.6)" }}>
                    {group.items.map(item => (
                      <Link key={item.href} href={item.href}
                        className={cn(
                          "block px-4 py-2.5 text-xs font-medium transition-colors",
                          pathname === item.href
                            ? "text-[#00ff88] bg-[rgba(0,255,136,0.07)]"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                        )}
                        style={{ fontFamily:"'JetBrains Mono',monospace" }}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-md"
              style={{ background:"rgba(10,21,32,0.8)", border:"1px solid rgba(14,34,53,0.9)" }}>
              <div className={cn("dot-live", !wsConnected && "dot-yellow")} />
              <span className="text-[10px] font-mono" style={{ color:wsConnected?"#00ff88":"#ffd93d" }}>
                {wsConnected?"LIVE":"CONN"}
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-[10px] font-mono text-slate-500">
                <span className="font-bold" style={{ color:"#00ff88" }}>{totalThreatsBlocked.toLocaleString()}</span> blocked
              </span>
            </div>

            <button className="relative p-1.5 text-slate-600 hover:text-slate-300 transition-colors">
              <Bell size={15} />
              {alerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {Math.min(alerts, 9)}
                </span>
              )}
            </button>

            <Link href="/dashboard" className="hidden lg:flex btn-outline text-[11px] py-1.5 px-3">
              Open SOC
            </Link>

            <button className="md:hidden p-1.5 text-slate-500" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t" style={{ borderColor:"rgba(14,34,53,0.9)", background:"rgba(3,8,13,0.98)" }}>
          <div className="container-wide py-4 space-y-1">
            {NAV_GROUPS.flatMap(g => g.items).map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href ? "text-[#00ff88] bg-[rgba(0,255,136,0.08)]" : "text-slate-400 hover:text-slate-200"
                )}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
