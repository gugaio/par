import { describe, it, expect, beforeEach } from 'vitest';

import type { AgentProvider } from './AgentProvider';
import { AgentRegistry } from './AgentRegistry';
import type { AgentInput, AgentOutput } from './types';

class MockAgent implements AgentProvider {
  constructor(public id: string, public name: string) {}

  async handleMessage(input: AgentInput): Promise<AgentOutput> {
    return { response: `Mock response: ${input.message}` };
  }
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = AgentRegistry.getInstance();
    registry.reset();
  });

  describe('registerAgent', () => {
    it('should register an agent', () => {
      const agent = new MockAgent('agent1', 'Agent 1');
      registry.registerAgent(agent);

      expect(registry.getAgent('agent1')).toBe(agent);
    });

    it('should set first registered agent as default', () => {
      const agent1 = new MockAgent('agent1', 'Agent 1');
      registry.registerAgent(agent1);

      expect(registry.getDefaultAgent()).toBe(agent1);
    });

    it('should register multiple agents', () => {
      const agent1 = new MockAgent('agent1', 'Agent 1');
      const agent2 = new MockAgent('agent2', 'Agent 2');

      registry.registerAgent(agent1);
      registry.registerAgent(agent2);

      expect(registry.listAgents()).toHaveLength(2);
      expect(registry.getAgent('agent1')).toBe(agent1);
      expect(registry.getAgent('agent2')).toBe(agent2);
    });

    it('should not change default agent when registering additional agents', () => {
      const agent1 = new MockAgent('agent1', 'Agent 1');
      const agent2 = new MockAgent('agent2', 'Agent 2');

      registry.registerAgent(agent1);
      const firstDefault = registry.getDefaultAgent();

      registry.registerAgent(agent2);

      expect(registry.getDefaultAgent()).toBe(firstDefault);
    });
  });

  describe('getAgent', () => {
    it('should return undefined for non-existent agent', () => {
      expect(registry.getAgent('non-existent')).toBeUndefined();
    });

    it('should return agent by id', () => {
      const agent = new MockAgent('agent1', 'Agent 1');
      registry.registerAgent(agent);

      expect(registry.getAgent('agent1')).toBe(agent);
    });
  });

  describe('listAgents', () => {
    it('should return empty array when no agents registered', () => {
      expect(registry.listAgents()).toHaveLength(0);
    });

    it('should return all registered agents', () => {
      const agent1 = new MockAgent('agent1', 'Agent 1');
      const agent2 = new MockAgent('agent2', 'Agent 2');
      const agent3 = new MockAgent('agent3', 'Agent 3');

      registry.registerAgent(agent1);
      registry.registerAgent(agent2);
      registry.registerAgent(agent3);

      const agents = registry.listAgents();
      expect(agents).toHaveLength(3);
      expect(agents).toContain(agent1);
      expect(agents).toContain(agent2);
      expect(agents).toContain(agent3);
    });
  });

  describe('getDefaultAgent', () => {
    it('should return undefined when no agents registered', () => {
      expect(registry.getDefaultAgent()).toBeUndefined();
    });

    it('should return first registered agent as default', () => {
      const agent1 = new MockAgent('agent1', 'Agent 1');
      registry.registerAgent(agent1);

      expect(registry.getDefaultAgent()).toBe(agent1);
    });
  });

  describe('setDefaultAgent', () => {
    it('should return false when setting default to non-existent agent', () => {
      expect(registry.setDefaultAgent('non-existent')).toBe(false);
    });

    it('should return true when setting default to existing agent', () => {
      const agent1 = new MockAgent('agent1', 'Agent 1');
      registry.registerAgent(agent1);

      expect(registry.setDefaultAgent('agent1')).toBe(true);
    });

    it('should change default agent', () => {
      const agent1 = new MockAgent('agent1', 'Agent 1');
      const agent2 = new MockAgent('agent2', 'Agent 2');

      registry.registerAgent(agent1);
      registry.registerAgent(agent2);
      expect(registry.getDefaultAgent()).toBe(agent1);

      registry.setDefaultAgent('agent2');
      expect(registry.getDefaultAgent()).toBe(agent2);
    });
  });
});
