import Fastify from 'fastify';
import { messageHandler } from './message-handler';

const PORT = process.env.PORT || 3000;
const fastify = Fastify();

fastify.get('/health', async () => {
  return { status: 'ok' };
});

fastify.post('/message', messageHandler);

fastify.setErrorHandler((error, request, reply) => {
  reply.code(500).send({ error: error.message });
});

export async function start(): Promise<void> {
  try {
    await fastify.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(`PAR Server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Message endpoint available at http://localhost:${PORT}/message`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}
