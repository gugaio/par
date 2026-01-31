import { config } from 'dotenv';
import path from 'path';

config();

import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';

import { messageHandler } from './message-handler';
import { debugRoutes } from './routes/debug';

const PORT = process.env.PORT || 3000;
const fastify = Fastify();

fastify.get('/health', async () => {
  return { status: 'ok' };
});

fastify.post('/message', messageHandler);

fastify.register(debugRoutes, { prefix: '/api' });

const UI_DIST_PATH = path.resolve(__dirname, '../../ui/dist/client');

fastify.register(fastifyStatic, {
  root: UI_DIST_PATH,
  prefix: '/ui/'
});

fastify.get('/', async (request, reply) => {
  reply.redirect('/ui/');
});

fastify.setErrorHandler((error, request, reply) => {
  reply.code(500).send({ error: error.message });
});

export async function start(): Promise<void> {
  console.log('Starting PAR Server...');
  try {
    await fastify.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(`PAR Server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Message endpoint available at http://localhost:${PORT}/message`);
    console.log(`Debug UI available at http://localhost:${PORT}/ui/`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/executions`);
  } catch (error) {
    console.error('Error starting server:', error);
    fastify.log.error(error);
    process.exit(1);
  }
}
