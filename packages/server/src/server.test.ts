import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { messageHandler } from './message-handler';


describe('Server', () => {
  let server: ReturnType<typeof Fastify>;
  let address: string;

  beforeAll(async () => {
    server = Fastify();

    server.get('/health', async () => {
      return { status: 'ok' };
    });

    server.post('/message', messageHandler);

    server.setErrorHandler((error: FastifyError, request: unknown, reply: unknown) => {
      (reply as { code: (code: number) => { send: (body: unknown) => unknown } }).code(500).send({ error: error.message });
    });

    address = await server.listen({ port: 0 });
  });

  afterAll(async () => {
    await server.close();
  });

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });
  });

  describe('POST /message', () => {
    it('should return 400 when message is missing', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/message',
        payload: {
          sessionId: '123'
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'Message is required' });
    });

    it('should return 400 when message is empty string', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/message',
        payload: {
          message: ''
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'Message is required' });
    });

    it('should process valid message', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/message',
        payload: {
          message: 'Hello world'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('response');
      expect(typeof body.response).toBe('string');
    });

    it('should process message with sessionId', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/message',
        payload: {
          message: 'Test',
          sessionId: 'custom-session-123'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('response');
    });

    it('should process message with context', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/message',
        payload: {
          message: 'Test',
          sessionId: 'session-123',
          context: { metadata: { key: 'value' } }
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('response');
    });

    it('should process message with history', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/message',
        payload: {
          message: 'Test',
          sessionId: 'session-123',
          history: [
            { role: 'user', content: 'Hello', timestamp: 1234567890 }
          ]
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('response');
    });

    it('should return 404 for unknown routes', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/unknown'
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
