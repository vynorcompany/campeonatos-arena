export const agentScopes = {
  "agents:read": "Consultar agentes conectados",
  "schedule:read": "Consultar agenda e reservas",
  "finance:read": "Consultar lançamentos financeiros",
  "finance:write": "Criar lançamentos financeiros",
  "reports:read": "Consultar relatórios financeiros",
  "clients:read": "Consultar clientes",
  "teachers:read": "Consultar professores",
} as const;
export type AgentScope = keyof typeof agentScopes;
export const resourceScopes: Record<string, AgentScope> = {
  agents: "agents:read", reservations: "schedule:read", finance: "finance:read",
  reports: "reports:read", clients: "clients:read", teachers: "teachers:read",
};
