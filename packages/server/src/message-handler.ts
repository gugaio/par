import { Orchestrator } from '@par/core';
import { AgentRegistry } from '@par/core';
import type { AgentInput, AgentOutput, SessionContext, Message } from '@par/core';
import type { Tool } from '@par/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

const registry = AgentRegistry.getInstance();

let orchestrator: Orchestrator;

function initializeOrchestrator(): void {
  const { OpenAIProvider } = require('par-agents-openai');
  registry.registerAgent(new OpenAIProvider());
  registry.setDefaultAgent('openai');
  console.log('✅ OpenAI agent registered and set as default');

  orchestrator = new Orchestrator(registry);
}

initializeOrchestrator();

const availableTools: Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to read'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to write'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'execute_command',
    description: 'Execute a command in the shell',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute'
        }
      },
      required: ['command']
    }
  }
];

interface MessageRequestBody {
  message: string;
  sessionId?: string;
  agentId?: string;
  context?: SessionContext;
  history?: Message[];
}

export async function messageHandler(req: FastifyRequest<{ Body: MessageRequestBody }>, reply: FastifyReply): Promise<void> {
  const { message, sessionId, agentId, context, history } = req.body;

  if (!message || message.trim() === '') {
    reply.code(400).send({ error: 'Message is required' });
    return;
  }

  try {
    const output: AgentOutput = await orchestrator.processMessageWithToolLoop({
      message,
      sessionId: sessionId || 'default',
      context,
      history,
      tools: availableTools
    }, agentId);

    reply.send(output);
  } catch (error) {
    reply.code(500).send({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
