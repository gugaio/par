import type { AgentInput } from '@par/core';
import { describe, it, expect, beforeEach } from 'vitest';

import { FakeAgent } from './FakeAgent';

describe('FakeAgent', () => {
  let agent: FakeAgent;

  beforeEach(() => {
    agent = new FakeAgent();
  });

  it('should have correct id', () => {
    expect(agent.id).toBe('fake');
  });

  it('should have correct name', () => {
    expect(agent.name).toBe('Fake Agent');
  });

  describe('handleMessage', () => {
    it('should return fake response with message', async () => {
      const input: AgentInput = {
        message: 'Hello world',
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Fake response: Hello world');
    });

    it('should handle empty message', async () => {
      const input: AgentInput = {
        message: '',
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Fake response: ');
    });

    it('should handle message with special characters', async () => {
      const input: AgentInput = {
        message: 'Hello! @#$%',
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Fake response: Hello! @#$%');
    });

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(1000);
      const input: AgentInput = {
        message: longMessage,
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe(`Fake response: ${longMessage}`);
    });

    it('should work with sessionId', async () => {
      const input: AgentInput = {
        message: 'Test',
        sessionId: 'custom-session-id'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Fake response: Test');
    });

    it('should work with context', async () => {
      const input: AgentInput = {
        message: 'Test',
        sessionId: 'session-1',
        context: { metadata: { key: 'value' } }
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Fake response: Test');
    });

    it('should work with history', async () => {
      const input: AgentInput = {
        message: 'Test',
        sessionId: 'session-1',
        history: [
          { role: 'user', content: 'Hello', timestamp: 1234567890 }
        ]
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Fake response: Test');
    });
  });
});
