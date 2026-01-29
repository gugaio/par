import type { AgentInput, AgentOutput } from '../agents/types';
import type { AgentProvider } from '../agents/AgentProvider';
import { AgentRegistry } from '../agents/AgentRegistry';

export class Orchestrator {
  private registry: AgentRegistry;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  async processMessage(input: AgentInput, agentId?: string): Promise<AgentOutput> {
    if (!input.message || input.message.trim() === '') {
      throw new Error('Message cannot be empty');
    }

    let agent: AgentProvider | undefined;

    if (agentId) {
      agent = this.registry.getAgent(agentId);
    } else {
      agent = this.registry.getDefaultAgent();
    }

    if (!agent) {
      throw new Error('No agent available');
    }

    return agent.handleMessage(input);
  }
}
