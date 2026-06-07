# AEGIS One — Folder Structure

```
aegis-one/
│
├── README.md                        # Project overview + quick start
├── .env.example                     # Environment variable template
│
├── frontend/                        # Next.js 15 + TypeScript frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── src/
│       ├── app/                     # Next.js App Router pages
│       │   ├── layout.tsx           # Root layout
│       │   ├── page.tsx             # Redirects to /dashboard
│       │   └── dashboard/
│       │       ├── layout.tsx       # Dashboard shell (Sidebar + TopBar)
│       │       ├── page.tsx         # Main SOC overview
│       │       ├── threats/         # Threat Center
│       │       ├── agents/          # Agent Registry
│       │       ├── compliance/      # Compliance status
│       │       ├── incidents/       # Incident management
│       │       ├── redteam/         # Red Team console
│       │       ├── identity/        # Identity & Trust layer
│       │       ├── audit/           # Audit log viewer
│       │       └── settings/        # Platform configuration
│       │
│       ├── components/
│       │   ├── dashboard/
│       │   │   ├── OverviewCards.tsx         # KPI stat cards
│       │   │   ├── ThreatTimeline.tsx         # 24h area chart
│       │   │   ├── LiveThreatFeed.tsx         # WebSocket live feed
│       │   │   ├── AgentRiskTable.tsx         # Agent risk rankings
│       │   │   ├── ComplianceWidget.tsx       # Compliance scores
│       │   │   ├── SecurityDigitalTwin.tsx    # Canvas agent graph
│       │   │   └── DemoPanel.tsx              # One-click demos
│       │   └── shared/
│       │       ├── Sidebar.tsx       # Navigation
│       │       ├── TopBar.tsx        # Header + live counter
│       │       └── Providers.tsx     # React Query + Toast
│       │
│       ├── lib/
│       │   ├── api.ts               # Axios API client
│       │   ├── store.ts             # Zustand global state
│       │   └── utils.ts             # Helpers + color functions
│       │
│       ├── hooks/
│       │   └── useLiveFeed.ts       # WebSocket auto-reconnect hook
│       │
│       └── styles/
│           └── globals.css          # Tailwind + AEGIS design tokens
│
├── backend/                         # FastAPI Python backend
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                  # FastAPI app factory
│       ├── core/
│       │   ├── config.py            # Pydantic settings
│       │   └── database.py          # SQLAlchemy async engine
│       │
│       ├── models/                  # SQLAlchemy ORM models
│       │   ├── agent.py             # Agent model
│       │   ├── threat.py            # Threat model
│       │   ├── incident.py          # Incident model
│       │   └── audit.py             # Audit log model
│       │
│       ├── api/v1/
│       │   ├── router.py            # Main API router
│       │   └── endpoints/
│       │       ├── firewall.py      # Layer 1 — Firewall API
│       │       ├── agents.py        # Layer 4 — Agent registry
│       │       ├── threats.py       # Threat management
│       │       ├── incidents.py     # Incident management
│       │       ├── behavioral.py    # Layer 2 — Behavioral analysis
│       │       ├── redteam.py       # Layer 5 — Red team
│       │       ├── compliance.py    # Layer 3 — Compliance agent
│       │       ├── dashboard.py     # Dashboard aggregates
│       │       ├── audit.py         # Audit logging
│       │       ├── websocket.py     # Live WebSocket feeds
│       │       └── demo.py          # Demo scenario endpoints
│       │
│       ├── services/
│       │   ├── ai_client.py         # OpenAI/Azure client factory
│       │   ├── firewall/
│       │   │   └── inspector.py     # Sentinel Mesh Firewall engine
│       │   ├── behavioral/
│       │   │   └── engine.py        # AgentGuard behavioral engine
│       │   └── redteam/
│       │       └── engine.py        # Autonomous red team engine
│       │
│       └── middleware/
│           ├── logging.py           # Structured request logging
│           └── telemetry.py         # OpenTelemetry + Prometheus
│
├── docker/
│   ├── docker-compose.yml           # Full stack compose
│   └── prometheus.yml               # Prometheus scrape config
│
├── deployment/
│   ├── azure/
│   │   └── main.bicep               # Azure Container Apps IaC
│   └── k8s/
│       └── deployment.yaml          # Kubernetes manifests
│
├── scripts/
│   ├── setup.sh                     # One-command setup
│   ├── seed_demo.py                 # Seed demo data
│   └── init.sql                     # PostgreSQL init (pgvector)
│
└── docs/
    ├── SYSTEM_DESIGN.md             # Architecture + design decisions
    ├── API.md                       # API reference
    └── FOLDER_STRUCTURE.md          # This file
```
