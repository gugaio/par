import type { AgentInput, AgentOutput, SessionContext, Message } from '@par/core';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { messageHandler } from './message-handler';

vi.mock('@par/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@par/core')>();
  return {
    ...actual,
    Orchestrator: class {
      async processMessageWithToolLoop() {
        return { response: 'Mock response' };
      }
    }
  };
});

interface MessageRequestBody {
  message: string;
  sessionId?: string;
  context?: SessionContext;
  history?: Message[];
}

describe('messageHandler', () => {
  let mockReq: Partial<FastifyRequest<{ Body: MessageRequestBody }>>;
  let mockReply: Partial<FastifyReply>;
  let statusCode: number = 200;
  let sentBody: unknown = undefined;

  beforeEach(() => {
    statusCode = 200;
    sentBody = undefined;

    mockReq = {
      body: {} as MessageRequestBody
    };

    mockReply = {
      code: vi.fn().mockImplementation((code: number) => {
        statusCode = code;
        return mockReply as FastifyReply;
      }),
      send: vi.fn().mockImplementation((body: unknown) => {
        sentBody = body;
        return mockReply as FastifyReply;
      })
    };
  });

  it('should send 400 when message is missing', async () => {
    mockReq.body = { message: '', sessionId: '123' };

    await messageHandler(
      mockReq as FastifyRequest<{ Body: MessageRequestBody }>,
      mockReply as FastifyReply
    );

    expect(statusCode).toBe(400);
    expect(sentBody).toEqual({ error: 'Message is required' });
  });

  it('should send 400 when message is empty string', async () => {
    mockReq.body = { message: '', sessionId: '123' };

    await messageHandler(
      mockReq as FastifyRequest<{ Body: MessageRequestBody }>,
      mockReply as FastifyReply
    );

    expect(statusCode).toBe(400);
    expect(sentBody).toEqual({ error: 'Message is required' });
  });

  it('should send 400 when message is whitespace only', async () => {
    mockReq.body = { message: '   ', sessionId: '123' };

    await messageHandler(
      mockReq as FastifyRequest<{ Body: MessageRequestBody }>,
      mockReply as FastifyReply
    );

    expect(statusCode).toBe(400);
    expect(sentBody).toEqual({ error: 'Message is required' });
  });

  it('should process valid message', async () => {
    mockReq.body = {
      message: 'Hello world',
      sessionId: 'session-123'
    };

    await messageHandler(
      mockReq as FastifyRequest<{ Body: MessageRequestBody }>,
      mockReply as FastifyReply
    );

    expect(statusCode).toBe(200);
    expect(sentBody).toEqual({ response: 'Mock response' });
  });

  it('should use default sessionId when not provided', async () => {
    mockReq.body = {
      message: 'Hello'
    };

    await messageHandler(
      mockReq as FastifyRequest<{ Body: MessageRequestBody }>,
      mockReply as FastifyReply
    );

    expect(statusCode).toBe(200);
    expect(sentBody).toEqual({ response: 'Mock response' });
  });

  it('should handle message with context', async () => {
    mockReq.body = {
      message: 'Test',
      sessionId: 'session-123',
      context: { metadata: { key: 'value' } }
    };

    await messageHandler(
      mockReq as FastifyRequest<{ Body: MessageRequestBody }>,
      mockReply as FastifyReply
    );

    expect(statusCode).toBe(200);
    expect(sentBody).toEqual({ response: 'Mock response' });
  });

  it('should handle message with history', async () => {
    mockReq.body = {
      message: 'Test',
      sessionId: 'session-123',
      history: [
        { role: 'user', content: 'Hello', timestamp: 1234567890 }
      ]
    };

    await messageHandler(
      mockReq as FastifyRequest<{ Body: MessageRequestBody }>,
      mockReply as FastifyReply
    );

    expect(statusCode).toBe(200);
    expect(sentBody).toEqual({ response: 'Mock response' });
  });

  it('should handle complete request with all fields', async () => {
    mockReq.body = {
      message: 'Complete test',
      sessionId: 'session-123',
      context: { metadata: { key: 'value' } },
      history: [
        { role: 'user', content: 'Hello', timestamp: 1234567890 },
        { role: 'agent', content: 'Hi', timestamp: 1234567891 }
      ]
    };

    await messageHandler(
      mockReq as FastifyRequest<{ Body: MessageRequestBody }>,
      mockReply as FastifyReply
    );

    expect(statusCode).toBe(200);
    expect(sentBody).toEqual({ response: 'Mock response' });
  });
});
