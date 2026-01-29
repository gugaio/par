import { describe, it, expect, beforeEach } from 'vitest';
import { Orchestrator } from './orchestrator';
import { AgentRegistry } from '../agents/AgentRegistry';
import type { AgentProvider } from '../agents/AgentProvider';
import type { AgentInput } from '../agents/types';

class MockAgent implements AgentProvider {
  constructor(public id: string, public name: string, private response: string) {}

  async handleMessage(input: AgentInput): Promise<{ response: string }> {
    return { response: this.response };
  }
}

describe('Orchestrator', () => {
  let registry: AgentRegistry;
  let orchestrator: Orchestrator;
  let mockAgent: MockAgent;
  let mockAgent2: MockAgent;

  beforeEach(() => {
    registry = AgentRegistry.getInstance();
    registry.reset();

    mockAgent = new MockAgent('agent1', 'Agent 1', 'Response 1');
    mockAgent2 = new MockAgent('agent2', 'Agent 2', 'Response 2');

    registry.registerAgent(mockAgent);
    registry.registerAgent(mockAgent2);

    orchestrator = new Orchestrator(registry);
  });

  describe('processMessage', () => {
    it('should process message with default agent', async () => {
      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      const output = await orchestrator.processMessage(input);

      expect(output.response).toBe('Response 1');
    });

    it('should process message with specific agent', async () => {
      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      const output = await orchestrator.processMessage(input, 'agent2');

      expect(output.response).toBe('Response 2');
    });

    it('should throw error for empty message', async () => {
      const input: AgentInput = {
        message: '',
        sessionId: 'session-1'
      };

      await expect(orchestrator.processMessage(input)).rejects.toThrow('Message cannot be empty');
    });

    it('should throw error for whitespace-only message', async () => {
      const input: AgentInput = {
        message: '   ',
        sessionId: 'session-1'
      };

      await expect(orchestrator.processMessage(input)).rejects.toThrow('Message cannot be empty');
    });

    it('should throw error when no default agent is available', async () => {
      const emptyRegistry = AgentRegistry.getInstance();
      emptyRegistry.reset();
      const emptyOrchestrator = new Orchestrator(emptyRegistry);

      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      await expect(emptyOrchestrator.processMessage(input)).rejects.toThrow('No agent available');
    });

    it('should throw error when specific agent does not exist', async () => {
      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      await expect(orchestrator.processMessage(input, 'non-existent')).rejects.toThrow('No agent available');
    });

    it('should pass input to agent correctly', async () => {
      let receivedInput: AgentInput | undefined;

      const spyAgent: AgentProvider = {
        id: 'spy',
        name: 'Spy Agent',
        async handleMessage(input: AgentInput) {
          receivedInput = input;
          return { response: 'Response' };
        }
      };

      registry.registerAgent(spyAgent);

      const input: AgentInput = {
        message: 'Test message',
        sessionId: 'test-session',
        context: { metadata: { key: 'value' } },
        history: [
          { role: 'user', content: 'Hello', timestamp: 1234567890 }
        ]
      };

      await orchestrator.processMessage(input, 'spy');

      expect(receivedInput).toEqual(input);
    });
  });
});
