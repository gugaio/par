import type { AgentInput, AgentOutput, Message } from '../agents/types';
import type { AgentProvider } from '../agents/AgentProvider';
import { AgentRegistry } from '../agents/AgentRegistry';
import type { Tool, ToolCall, ToolResult } from '../tools/types';
import { ToolExecutor } from '../tools/tool-executor';

export class Orchestrator {
  private registry: AgentRegistry;
  private executor: ToolExecutor;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
    this.executor = new ToolExecutor();
  }

  async processMessage(input: AgentInput, agentId?: string): Promise<AgentOutput> {
    if (!input.message || input.message.trim() === '') {
      throw new Error('Message cannot be empty');
    }

    let agent: AgentProvider | undefined;

    if (agentId) {
      agent = this.registry.getAgent(agentId);
    } else {
      agent = this.registry.getDefaultAgent();
    }

    if (!agent) {
      throw new Error('No agent available');
    }

    return agent.handleMessage(input);
  }

  async processMessageWithToolLoop(input: AgentInput, agentId?: string): Promise<AgentOutput> {
    if (!input.message || input.message.trim() === '') {
      throw new Error('Message cannot be empty');
    }

    let agent: AgentProvider | undefined;

    if (agentId) {
      agent = this.registry.getAgent(agentId);
    } else {
      agent = this.registry.getDefaultAgent();
    }

    if (!agent) {
      throw new Error('No agent available');
    }

    const maxIterations = ToolExecutor.getMaxIterations();
    let iteration = 0;
    let history = input.history ? [...input.history] : [];

    while (iteration < maxIterations) {
      iteration++;

      const agentInput: AgentInput = {
        message: input.message,
        sessionId: input.sessionId,
        context: input.context,
        history,
        tools: input.tools
      };

      const output = await agent.handleMessage(agentInput);

      if (output.response) {
        return output;
      }

      if (output.toolCall) {
        const toolCall = output.toolCall;
        const toolResult = await this.executor.executeTool(toolCall);

        const toolCallMessage: Message = {
          role: 'agent',
          content: '',
          timestamp: Date.now(),
          toolCall,
          toolResult
        };
        history.push(toolCallMessage);

        if (toolResult.error) {
          return {
            response: `Tool execution failed: ${toolResult.error}`
          };
        }
      } else {
        return {
          response: 'Agent did not return a response or tool call'
        };
      }
    }

    return {
      response: `Maximum iterations (${maxIterations}) reached without a response`
    };
  }

  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    return this.executor.executeTool(toolCall);
  }
}
