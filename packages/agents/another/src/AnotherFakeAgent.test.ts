import { describe, it, expect, beforeEach } from 'vitest';
import { AnotherFakeAgent } from './AnotherFakeAgent';
import type { AgentInput } from '@par/core';

describe('AnotherFakeAgent', () => {
  let agent: AnotherFakeAgent;

  beforeEach(() => {
    agent = new AnotherFakeAgent();
  });

  it('should have correct id', () => {
    expect(agent.id).toBe('another-fake');
  });

  it('should have correct name', () => {
    expect(agent.name).toBe('Another Fake Agent');
  });

  describe('handleMessage', () => {
    it('should return uppercase fake response', async () => {
      const input: AgentInput = {
        message: 'hello world',
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Another fake response: HELLO WORLD');
    });

    it('should handle empty message', async () => {
      const input: AgentInput = {
        message: '',
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Another fake response: ');
    });

    it('should convert lowercase to uppercase', async () => {
      const input: AgentInput = {
        message: 'abcdefghijklmnopqrstuvwxyz',
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Another fake response: ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    });

    it('should preserve special characters', async () => {
      const input: AgentInput = {
        message: 'hello! @#$%',
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Another fake response: HELLO! @#$%');
    });

    it('should handle mixed case input', async () => {
      const input: AgentInput = {
        message: 'HeLLo WoRLd',
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Another fake response: HELLO WORLD');
    });

    it('should work with numbers', async () => {
      const input: AgentInput = {
        message: 'test123',
        sessionId: 'session-1'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Another fake response: TEST123');
    });

    it('should work with sessionId', async () => {
      const input: AgentInput = {
        message: 'Test',
        sessionId: 'custom-session-id'
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Another fake response: TEST');
    });

    it('should work with context', async () => {
      const input: AgentInput = {
        message: 'Test',
        sessionId: 'session-1',
        context: { metadata: { key: 'value' } }
      };

      const output = await agent.handleMessage(input);

      expect(output.response).toBe('Another fake response: TEST');
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

      expect(output.response).toBe('Another fake response: TEST');
    });
  });
});
