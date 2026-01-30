import type { AgentProvider } from '../agents/AgentProvider';
import { AgentRegistry } from '../agents/AgentRegistry';
import type { AgentInput, AgentOutput, Message } from '../agents/types';
import { ToolExecutor } from '../tools/tool-executor';
import type { ToolCall, ToolResult } from '../tools/types';
import type { ExecutionContext, ExecutionPolicy, ToolCallRecord } from './types';

export class Orchestrator {
  private static readonly DEFAULT_EXECUTION_POLICY: ExecutionPolicy = {
    maxSteps: 10,
    maxToolCalls: 10,
    timeoutMs: 300000
  };

  private registry: AgentRegistry;
  private executor: ToolExecutor;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
    this.executor = new ToolExecutor();
  }

  private createExecutionContext(): ExecutionContext {
    return {
      executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      stepCount: 0,
      toolCallCount: 0,
      toolHistory: [],
      startTime: Date.now()
    };
  }

  private checkExecutionLimits(context: ExecutionContext, policy: ExecutionPolicy): { valid: boolean; reason?: string } {
    const currentTime = Date.now();
    const elapsedMs = currentTime - context.startTime;

    if (context.stepCount >= policy.maxSteps) {
      return { valid: false, reason: `Maximum steps (${policy.maxSteps}) reached` };
    }

    if (context.toolCallCount >= policy.maxToolCalls) {
      return { valid: false, reason: `Maximum tool calls (${policy.maxToolCalls}) reached` };
    }

    if (elapsedMs >= policy.timeoutMs) {
      return { valid: false, reason: `Execution timeout (${policy.timeoutMs}ms) reached` };
    }

    return { valid: true };
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

    const policy = Orchestrator.DEFAULT_EXECUTION_POLICY;
    const context = this.createExecutionContext();
    const history = input.history ? [...input.history] : [];

    while (true) {
      const limitCheck = this.checkExecutionLimits(context, policy);
      if (!limitCheck.valid) {
        context.endTime = Date.now();
        return {
          response: limitCheck.reason
        };
      }

      context.stepCount++;

      const agentInput: AgentInput = {
        message: input.message,
        sessionId: input.sessionId,
        context: input.context,
        history,
        tools: input.tools
      };

      const output = await agent.handleMessage(agentInput);

      if (output.response) {
        context.endTime = Date.now();
        return output;
      }

      if (output.toolCall) {
        const toolCall = output.toolCall;
        const toolResult = await this.executor.executeTool(toolCall);

        context.toolCallCount++;

        const toolCallRecord: ToolCallRecord = {
          toolCall,
          toolResult,
          step: context.stepCount,
          timestamp: Date.now()
        };
        context.toolHistory.push(toolCallRecord);

        const toolCallMessage: Message = {
          role: 'agent',
          content: '',
          timestamp: toolCallRecord.timestamp,
          toolCall,
          toolResult
        };
        history.push(toolCallMessage);

        if (!toolResult.success) {
          context.endTime = Date.now();
          return {
            response: `Tool execution failed: ${toolResult.error}`
          };
        }
      } else {
        context.endTime = Date.now();
        return {
          response: 'Agent did not return a response or tool call'
        };
      }
    }
  }

  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    return this.executor.executeTool(toolCall);
  }
}
