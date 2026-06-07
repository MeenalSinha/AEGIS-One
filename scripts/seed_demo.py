#!/usr/bin/env python3
"""
AEGIS One — Demo Data Seed Script
Populates the platform with realistic agents, threats, incidents, and audit events.
Run: python scripts/seed_demo.py [--url http://localhost:8000]
"""
import asyncio
import httpx
import random
import sys
import argparse

def get_url():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000", help="Backend API URL")
    args, _ = parser.parse_known_args()
    return args.url.rstrip("/")

API_URL_BASE = get_url()

DEMO_AGENTS = [
    {"name": "Orchestrator-00",  "role": "orchestrator", "description": "Master orchestration agent",    "permissions": ["read", "write", "execute", "audit"]},
    {"name": "GPT-Analyst-01",   "role": "analyst",      "description": "Primary analysis agent",        "permissions": ["read", "audit"]},
    {"name": "DataProcessor-02", "role": "executor",     "description": "Data processing pipeline",      "permissions": ["read", "write"]},
    {"name": "ReportWriter-03",  "role": "assistant",    "description": "Report generation agent",       "permissions": ["read"]},
    {"name": "CodeExecutor-04",  "role": "executor",     "description": "Code execution sandbox agent",  "permissions": ["execute"]},
    {"name": "EmailAgent-05",    "role": "assistant",    "description": "Email automation agent",        "permissions": ["read", "network"]},
    {"name": "DBQuery-06",       "role": "executor",     "description": "Database query agent",          "permissions": ["read", "write"]},
    {"name": "AuditMonitor-07",  "role": "monitor",      "description": "Compliance monitoring agent",   "permissions": ["read", "audit"]},
]

DEMO_THREATS = [
    {
        "threat_type": "prompt_injection",
        "severity": "critical",
        "title": "System Prompt Override Attempt",
        "description": "Adversary attempted to override system instructions via crafted user input",
        "evidence": {"pattern": "ignore all previous instructions", "vector": "user_input"},
        "risk_score": 0.95,
        "confidence": 0.92,
        "explanation": "Input contained classic instruction override pattern targeting core directives.",
        "recommended_action": "block",
    },
    {
        "threat_type": "data_exfiltration",
        "severity": "high",
        "title": "Customer Database Exfiltration Attempt",
        "description": "Agent requested full customer database dump to external HTTP endpoint",
        "evidence": {"tool": "network_request", "target": "https://attacker.example.com"},
        "risk_score": 0.88,
        "confidence": 0.90,
        "explanation": "Tool call pattern matches data exfiltration signature with external target.",
        "recommended_action": "block",
    },
    {
        "threat_type": "jailbreak",
        "severity": "high",
        "title": "DAN Mode Activation Attempt",
        "description": "User attempted to activate unrestricted DAN persona to bypass safety controls",
        "evidence": {"pattern": "DAN mode", "technique": "persona_override"},
        "risk_score": 0.78,
        "confidence": 0.85,
        "explanation": "Classic DAN jailbreak pattern with persona override detected.",
        "recommended_action": "block",
    },
    {
        "threat_type": "anomalous_behavior",
        "severity": "medium",
        "title": "Off-Hours Sensitive Data Access",
        "description": "Agent accessed HR records at 02:34 UTC, outside normal business hours",
        "evidence": {"resource": "hr_records", "time": "02:34 UTC", "baseline_deviation": "3.2 sigma"},
        "risk_score": 0.62,
        "confidence": 0.75,
        "explanation": "Behavioral baseline deviation: sensitive resource access during off-hours.",
        "recommended_action": "monitor",
    },
    {
        "threat_type": "tool_abuse",
        "severity": "medium",
        "title": "Unauthorized File System Access",
        "description": "Agent attempted write access to restricted system path /etc/passwd",
        "evidence": {"tool": "file_write", "path": "/etc/passwd"},
        "risk_score": 0.71,
        "confidence": 0.88,
        "explanation": "Tool call targeted restricted system path outside agent permission scope.",
        "recommended_action": "block",
    },
    {
        "threat_type": "memory_poisoning",
        "severity": "critical",
        "title": "Persistent Credential Injection Attempt",
        "description": "Attacker attempted to inject false admin credentials into agent persistent memory",
        "evidence": {"content_type": "credential_injection", "persistence": "memory_write"},
        "risk_score": 0.97,
        "confidence": 0.94,
        "explanation": "Memory write contained credential injection with policy bypass instructions.",
        "recommended_action": "block_and_isolate",
    },
]

DEMO_INCIDENTS = [
    {
        "title": "INC-0001: Critical Prompt Injection Campaign",
        "description": "Multiple prompt injection attempts detected from the same session, indicating a targeted attack campaign.",
        "severity": "critical",
        "affected_agents": [],
    },
    {
        "title": "INC-0002: Data Exfiltration Attempt — Customer Database",
        "description": "Agent attempted to export customer records to external endpoint. Data access blocked, agent quarantined.",
        "severity": "high",
        "affected_agents": [],
    },
]

DEMO_AUDIT = [
    {"action": "agent_registered",       "resource": "agent_registry",  "outcome": "success"},
    {"action": "firewall_block",          "resource": "prompt_pipeline", "outcome": "blocked"},
    {"action": "threat_detected",         "resource": "sentinel_mesh",   "outcome": "success"},
    {"action": "agent_quarantined",       "resource": "agent_manager",   "outcome": "success"},
    {"action": "compliance_scan",         "resource": "gdpr_controller", "outcome": "success"},
    {"action": "incident_created",        "resource": "incident_engine", "outcome": "success"},
    {"action": "permission_revoked",      "resource": "identity_store",  "outcome": "success"},
    {"action": "memory_poisoning_blocked","resource": "memory_manager",  "outcome": "blocked"},
    {"action": "behavioral_anomaly",      "resource": "agentguard",      "outcome": "warning"},
    {"action": "red_team_sweep_complete", "resource": "red_team_engine", "outcome": "success"},
]


async def seed(api_url: str):
    async with httpx.AsyncClient(timeout=30, base_url=api_url) as client:
        print(f"\n  AEGIS One — Seed Script")
        print(f"  Backend: {api_url}")
        print(f"  {'─' * 42}")

        # Health check
        try:
            r = await client.get("/health")
            r.raise_for_status()
            print(f"\n  Backend: {r.json()['status'].upper()}")
        except Exception as e:
            print(f"\n  ERROR: Backend unreachable — {e}")
            print(f"  Start backend first: uvicorn app.main:app --reload --port 8000")
            sys.exit(1)

        # Agents
        print(f"\n  Registering {len(DEMO_AGENTS)} agents...")
        agent_ids = []
        for ag in DEMO_AGENTS:
            try:
                r = await client.post("/api/v1/agents/", json=ag)
                if r.status_code == 200:
                    aid = r.json()["id"]
                    agent_ids.append(aid)
                    print(f"    + {ag['name']:<25} [{ag['role']}]")
                else:
                    print(f"    WARN {ag['name']}: {r.status_code} {r.text[:60]}")
            except Exception as e:
                print(f"    ERR  {ag['name']}: {e}")

        # Threats
        print(f"\n  Creating {len(DEMO_THREATS)} threat detections...")
        threat_ids = []
        for td in DEMO_THREATS:
            if agent_ids:
                td["agent_id"] = random.choice(agent_ids)
            try:
                r = await client.post("/api/v1/threats/", json=td)
                if r.status_code == 200:
                    tid = r.json()["id"]
                    threat_ids.append(tid)
                    print(f"    + [{td['severity'].upper():<8}] {td['title'][:50]}")
                else:
                    print(f"    WARN: {r.status_code} {r.text[:60]}")
            except Exception as e:
                print(f"    ERR: {e}")

        # Incidents
        print(f"\n  Creating {len(DEMO_INCIDENTS)} incidents...")
        for i, inc in enumerate(DEMO_INCIDENTS):
            if agent_ids:
                inc["affected_agents"] = [agent_ids[i % len(agent_ids)]]
            if threat_ids and i < len(threat_ids):
                inc["threat_id"] = threat_ids[i]
            try:
                r = await client.post("/api/v1/incidents/", json=inc)
                if r.status_code == 200:
                    print(f"    + [{inc['severity'].upper():<8}] {inc['title'][:55]}")
                else:
                    print(f"    WARN: {r.status_code}")
            except Exception as e:
                print(f"    ERR: {e}")

        # Audit logs
        print(f"\n  Writing {len(DEMO_AUDIT)} audit events...")
        for ev in DEMO_AUDIT:
            ev_copy = dict(ev)
            if agent_ids:
                ev_copy["agent_id"] = random.choice(agent_ids)
            try:
                r = await client.post("/api/v1/audit/", json=ev_copy)
                if r.status_code == 200:
                    print(f"    + {ev['action']:<35} [{ev['outcome']}]")
            except Exception as e:
                print(f"    ERR: {e}")

        # Summary
        print(f"\n  {'─' * 42}")
        print(f"  Seed complete.")
        print(f"\n  Dashboard  http://localhost:3000")
        print(f"  API Docs   {api_url}/docs")
        print(f"  Grafana    http://localhost:3001  (admin / aegis_admin)")
        print()


if __name__ == "__main__":
    API_URL_BASE = get_url()
    asyncio.run(seed(API_URL_BASE))
