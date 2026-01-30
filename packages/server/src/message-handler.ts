import { Orchestrator } from '@par/core';
import { AgentRegistry } from '@par/core';
import type { AgentOutput, SessionContext, Message } from '@par/core';
import type { Tool } from '@par/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

const registry = AgentRegistry.getInstance();

let orchestrator: Orchestrator;

function initializeOrchestrator(): void {
  try {
    const { ZAiGlm47AgentProvider } = require('par-agents-zai-glm-4.7');
    registry.registerAgent(new ZAiGlm47AgentProvider());
    registry.setDefaultAgent('zai-glm-4.7');
    console.log('✅ Z.ai GLM-4.7 agent registered and set as default');
  } catch (error) {
    if (error instanceof Error && error.message.includes('ZAI_API_KEY')) {
      console.log('⚠️  ZAI_API_KEY not configured, trying OpenAI...');
      try {
        const { OpenAIProvider } = require('par-agents-openai');
        registry.registerAgent(new OpenAIProvider());
        registry.setDefaultAgent('openai');
        console.log('✅ OpenAI agent registered and set as default');
      } catch (openaiError) {
        if (openaiError instanceof Error && openaiError.message.includes('OPENAI_API_KEY')) {
          console.log('⚠️  OPENAI_API_KEY not configured, using fake agent');
          const { FakeAgent } = require('par-agents-fake');
          registry.registerAgent(new FakeAgent());
          registry.setDefaultAgent('fake');
          console.log('✅ Fake agent registered as default');
          console.log('💡 To use a real agent, set ZAI_API_KEY or OPENAI_API_KEY environment variable');
        } else {
          console.error('❌ Failed to initialize OpenAI agent:', openaiError);
          const { FakeAgent } = require('par-agents-fake');
          registry.registerAgent(new FakeAgent());
          registry.setDefaultAgent('fake');
          console.log('✅ Fake agent registered as default (fallback)');
        }
      }
    } else {
      console.error('❌ Failed to initialize Z.ai agent:', error);
      const { FakeAgent } = require('par-agents-fake');
      registry.registerAgent(new FakeAgent());
      registry.setDefaultAgent('fake');
      console.log('✅ Fake agent registered as default (fallback)');
    }
  }

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
