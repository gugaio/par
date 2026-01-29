import type { AgentProvider } from './AgentProvider';

class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentProvider> = new Map();
  private defaultAgentId?: string;

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  reset(): void {
    this.agents.clear();
    this.defaultAgentId = undefined;
  }

  registerAgent(agent: AgentProvider): void {
    this.agents.set(agent.id, agent);
    if (!this.defaultAgentId) {
      this.defaultAgentId = agent.id;
    }
  }

  getAgent(id: string): AgentProvider | undefined {
    return this.agents.get(id);
  }

  listAgents(): AgentProvider[] {
    return Array.from(this.agents.values());
  }

  getDefaultAgent(): AgentProvider | undefined {
    if (this.defaultAgentId) {
      return this.agents.get(this.defaultAgentId);
    }
    return undefined;
  }

  setDefaultAgent(id: string): boolean {
    if (this.agents.has(id)) {
      this.defaultAgentId = id;
      return true;
    }
    return false;
  }
}

export { AgentRegistry };
