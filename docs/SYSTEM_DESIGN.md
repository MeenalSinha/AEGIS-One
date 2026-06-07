# AEGIS One — System Design Document

## 1. Overview

AEGIS One is a five-layer AI Agent Security Operating System. It operates as an inline
security proxy and behavioral monitoring platform for enterprises deploying autonomous AI agents.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AEGIS One Platform                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Next.js 15  │  │   FastAPI    │  │   AI Engine          │  │
│  │  Frontend    │◄─►   Backend   │◄─►  (OpenAI/Azure)      │  │
│  │  (Port 3000) │  │  (Port 8000) │  └──────────────────────┘  │
│  └──────────────┘  └──────┬───────┘                            │
│                            │                                    │
│          ┌─────────────────┼──────────────┐                    │
│          ▼                 ▼              ▼                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐             │
│  │  PostgreSQL  │  │    Redis     │  │ pgvector │             │
│  │  (Port 5432) │  │  (Port 6379) │  │  Store   │             │
│  └──────────────┘  └──────────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Security Layers

### Layer 1: Sentinel Mesh Firewall
- **Location:** `backend/app/services/firewall/inspector.py`
- **Mechanism:** Two-phase detection: fast heuristic regex pre-scan followed by deep GPT-4o analysis
- **Threat categories:** prompt_injection, jailbreak, data_exfiltration, tool_abuse, hidden_instructions, system_prompt_overwrite
- **Performance:** Heuristic scan < 1ms; AI analysis 300-800ms
- **Fallback:** Pure heuristic if AI unavailable

### Layer 2: AgentGuard Behavioral Defense
- **Location:** `backend/app/services/behavioral/engine.py`
- **Mechanism:** Sliding window action history with statistical and AI-powered anomaly detection
- **Metrics:** Trust Score (0-100), Threat Score (0-100), Health Score (0-100)
- **Detection:** High-frequency tool use, sensitive resource access, new tool discovery, privilege escalation

### Layer 3: AgentShield Security Operations Center
- **Location:** `backend/app/api/v1/endpoints/`
- **Agents:** Threat Hunter, Compliance Agent, Risk Analyst, Policy Agent, Audit Agent, Incident Responder
- **Compliance:** GDPR, HIPAA, SOC 2, ISO 27001
- **Forensics:** Tamper-evident audit log with full timeline reconstruction

### Layer 4: Agent Identity & Trust
- **Location:** `backend/app/api/v1/endpoints/agents.py`
- **Identity:** SHA-256 cryptographic identity per agent
- **RBAC:** Role-based permissions (read, write, execute, admin, audit, network)
- **Trust Graph:** Real-time trust score recalculation based on behavioral signals

### Layer 5: Autonomous Red Team
- **Location:** `backend/app/services/redteam/engine.py`
- **Attacks:** 5 categories × 2 payloads = 10 attacks per sweep (AI-generated novel variants)
- **Evaluation:** GPT-4o judges defense effectiveness and bypass potential
- **Output:** CVSS-scored findings with remediation recommendations

---

## 4. API Design

### Base URL: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/firewall/inspect` | Inspect content through firewall |
| GET | `/agents/` | List all agents |
| POST | `/agents/` | Register new agent |
| POST | `/agents/{id}/quarantine` | Quarantine agent |
| GET | `/threats/` | List threats |
| GET | `/threats/stats` | Threat statistics |
| GET | `/incidents/` | List incidents |
| GET | `/compliance/status` | Compliance scores |
| GET | `/dashboard/overview` | Dashboard metrics |
| GET | `/dashboard/threat-timeline` | 24h timeline |
| POST | `/redteam/sweep` | Launch red team |
| POST | `/demo/prompt-injection` | Demo scenario 1 |
| POST | `/demo/rogue-agent` | Demo scenario 2 |
| POST | `/demo/memory-poisoning` | Demo scenario 3 |
| POST | `/demo/red-team` | Demo scenario 4 |
| WS | `/ws/live-feed` | Real-time threat events |
| WS | `/ws/agent-status` | Agent status updates |

---

## 5. Data Models

### Agent
```
id: UUID
name: String
role: Enum(assistant|analyst|executor|orchestrator|monitor|auditor)
status: Enum(active|inactive|quarantined|suspended)
trust_score: Float [0-100]
threat_score: Float [0-100]
health_score: Float [0-100]
permissions: JSON[]
cryptographic_identity: String(512) SHA-256
security_profile: JSON
```

### Threat
```
id: UUID
agent_id: UUID (FK)
threat_type: Enum(prompt_injection|jailbreak|memory_poisoning|...)
severity: Enum(critical|high|medium|low|info)
status: Enum(active|blocked|investigating|resolved|false_positive)
risk_score: Float [0-1]
confidence: Float [0-1]
explanation: Text
evidence: JSON
recommended_action: Text
```

### Incident
```
id: UUID
title: String
severity: Enum
status: Enum
timeline: JSON[]
actions_taken: JSON[]
affected_agents: JSON[]
forensic_data: JSON
```

---

## 6. Frontend Architecture

```
src/
├── app/
│   └── dashboard/
│       ├── page.tsx              # Main overview
│       ├── threats/page.tsx      # Threat center
│       ├── agents/page.tsx       # Agent registry
│       ├── compliance/page.tsx   # Compliance status
│       ├── incidents/page.tsx    # Incident management
│       ├── redteam/page.tsx      # Red team console
│       ├── identity/page.tsx     # Identity & trust
│       ├── audit/page.tsx        # Audit log
│       └── settings/page.tsx     # Configuration
├── components/
│   ├── dashboard/                # Dashboard widgets
│   └── shared/                   # Layout components
├── lib/
│   ├── api.ts                    # Axios API client
│   ├── store.ts                  # Zustand global state
│   └── utils.ts                  # Utilities
└── hooks/
    └── useLiveFeed.ts            # WebSocket hook
```

---

## 7. Performance Considerations

- Firewall inspection: < 1s (P95) with AI analysis
- WebSocket: Server-sent events every 1.5-4s for live feed
- React Query: 10s stale time, 15s refetch interval for most queries
- Database: Async SQLAlchemy with connection pooling (10 base, 20 overflow)
- Redis: Used for Celery task queue and behavioral action history cache

---

## 8. Security Considerations

- All API endpoints are ready for JWT authentication middleware
- Cryptographic agent identity prevents spoofing
- Audit log is append-only with timestamps
- Firewall operates inline — all agent traffic passes through Layer 1
- Red team uses authorized testing only within the platform boundary
- Secrets managed via Azure Key Vault in production

---

## 9. Scalability

- Stateless FastAPI backend scales horizontally behind a load balancer
- Celery workers handle async AI analysis tasks
- Redis pub/sub for WebSocket event broadcasting across replicas
- Azure Container Apps auto-scaling based on HTTP load (1-10 replicas)
- pgvector for semantic similarity search on threat embeddings
