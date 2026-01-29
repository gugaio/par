import { Orchestrator } from '@par/core';
import { AgentRegistry } from '@par/core';
import type { AgentInput, AgentOutput, SessionContext, Message } from '@par/core';
import { FakeAgent } from 'par-agents-fake';
import { AnotherFakeAgent } from 'par-agents-another';
import type { FastifyRequest, FastifyReply } from 'fastify';

const registry = AgentRegistry.getInstance();
registry.registerAgent(new FakeAgent());
registry.registerAgent(new AnotherFakeAgent());

const orchestrator = new Orchestrator(registry);

interface MessageRequestBody {
  message: string;
  sessionId?: string;
  context?: SessionContext;
  history?: Message[];
}

export async function messageHandler(req: FastifyRequest<{ Body: MessageRequestBody }>, reply: FastifyReply): Promise<void> {
  const { message, sessionId, context, history } = req.body;

  if (!message || message.trim() === '') {
    reply.code(400).send({ error: 'Message is required' });
    return;
  }

  try {
    const output: AgentOutput = await orchestrator.processMessage({
      message,
      sessionId: sessionId || 'default',
      context,
      history
    });

    reply.send(output);
  } catch (error) {
    reply.code(500).send({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
