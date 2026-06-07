import axios, { AxiosError } from "axios";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 45_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.code === "ECONNABORTED") {
      console.error("Request timeout:", err.config?.url);
    } else if (err.response) {
      console.error(`API ${err.response.status}:`, err.config?.url, err.response.data);
    } else {
      console.error("API network error:", err.message);
    }
    return Promise.reject(err);
  }
);

// Dashboard
export const dashboardApi = {
  getOverview: () => api.get("/dashboard/overview"),
  getThreatTimeline: () => api.get("/dashboard/threat-timeline"),
  getAgentRiskDist: () => api.get("/dashboard/agent-risk-distribution"),
  getThreatHeatmap: () => api.get("/dashboard/threat-heatmap"),
  getStatsSummary: () => api.get("/dashboard/stats-summary"),
};

// Firewall
export const firewallApi = {
  inspect: (content: string, agentId?: string, toolCalls?: any[]) =>
    api.post("/firewall/inspect", { content, agent_id: agentId, tool_calls: toolCalls }),
  getStatus: () => api.get("/firewall/status"),
};

// Agents
export const agentsApi = {
  list: (params?: { status?: string; role?: string; search?: string; limit?: number }) =>
    api.get("/agents/", { params }),
  create: (data: { name: string; role?: string; description?: string; permissions?: string[] }) =>
    api.post("/agents/", data),
  get: (id: string) => api.get(`/agents/${id}`),
  quarantine: (id: string) => api.post(`/agents/${id}/quarantine`),
  restore: (id: string) => api.post(`/agents/${id}/restore`),
  updateScores: (id: string, scores: { trust_score?: number; threat_score?: number; health_score?: number }) =>
    api.patch(`/agents/${id}/scores`, scores),
};

// Threats
export const threatsApi = {
  list: (params?: { severity?: string; status?: string; threat_type?: string; search?: string; limit?: number }) =>
    api.get("/threats/", { params }),
  create: (data: any) => api.post("/threats/", data),
  getStats: () => api.get("/threats/stats"),
  resolve: (id: string) => api.post(`/threats/${id}/resolve`),
};

// Incidents
export const incidentsApi = {
  list: (params?: { status?: string; severity?: string; limit?: number }) =>
    api.get("/incidents/", { params }),
  create: (data: any) => api.post("/incidents/", data),
  getStats: () => api.get("/incidents/stats"),
  resolve: (id: string) => api.post(`/incidents/${id}/resolve`),
};

// Compliance
export const complianceApi = {
  getStatus: () => api.get("/compliance/status"),
  getFramework: (id: string) => api.get(`/compliance/framework/${id}`),
};

// Red Team
export const redTeamApi = {
  sweep: (agentId?: string) =>
    api.post("/redteam/sweep", { target_agent_id: agentId || null }),
  generatePayload: (attackType: string, context?: string) =>
    api.post("/redteam/generate-payload", null, { params: { attack_type: attackType, context } }),
};

// Demo
export const demoApi = {
  promptInjection: () => api.post("/demo/prompt-injection"),
  rogueAgent: () => api.post("/demo/rogue-agent"),
  memoryPoisoning: () => api.post("/demo/memory-poisoning"),
  redTeam: () => api.post("/demo/red-team"),
};

// Audit
export const auditApi = {
  list: (params?: { agent_id?: string; action?: string; outcome?: string; limit?: number }) =>
    api.get("/audit/", { params }),
  create: (data: any) => api.post("/audit/", data),
  getStats: () => api.get("/audit/stats"),
};

// Behavioral
export const behavioralApi = {
  analyze: (agentId: string, action: object) =>
    api.post("/behavioral/analyze", { agent_id: agentId, action }),
};

// SOC
export const socApi = {
  run:        (context: string) => api.post("/soc/run", { context }),
  listAgents: () => api.get("/soc/agents"),
  getStatus:  () => api.get("/soc/status"),
};

// Auth
export const authApi = {
  login:   (username: string, password: string) => api.post("/auth/login", { username, password }),
  me:      () => api.get("/auth/me"),
  demoKey: () => api.get("/auth/demo-key"),
};
