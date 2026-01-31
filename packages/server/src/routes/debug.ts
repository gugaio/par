import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTracer } from '../tracers/in-memory-tracer';

export async function debugRoutes(fastify: FastifyInstance): Promise<void> {
  const tracer = getTracer();

  fastify.get('/executions', async (request: FastifyRequest, reply: FastifyReply) => {
    const executions = tracer.getExecutions();
    return executions;
  });

  fastify.get<{ Params: { id: string } }>(
    '/executions/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const execution = tracer.getExecution(id);

      if (!execution) {
        reply.code(404).send({ error: 'Execution not found' });
        return;
      }

      return execution;
    }
  );
}
