import type { AgentProvider } from '../agents/AgentProvider';
import { AgentRegistry } from '../agents/AgentRegistry';
import type { AgentInput, AgentOutput, Message } from '../agents/types';

import type { ExecutionTracer } from '../observability/tracer';
import type {
  AgentDecisionPayload,
  ExecutionEndPayload,
  ExecutionErrorPayload,
  ExecutionEvent,
  ExecutionStartPayload,
  ExecutionStepPayload
} from '../observability/types';

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
  private tracer: ExecutionTracer | null;

  constructor(registry: AgentRegistry, tracer: ExecutionTracer | null = null) {
    this.registry = registry;
    this.tracer = tracer;
    this.executor = new ToolExecutor(tracer);
  }

  private emitEvent(event: ExecutionEvent): void {
    if (this.tracer) {
      this.tracer.onEvent(event);
    }
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

  private checkExecutionLimits(
    context: ExecutionContext,
    policy: ExecutionPolicy
  ): { valid: boolean; reason?: string } {
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

    this.emitEvent({
      executionId: context.executionId,
      type: 'execution_start',
      timestamp: context.startTime,
      payload: {
        sessionId: input.sessionId,
        agentId: agentId,
        message: input.message,
        policy
      } as ExecutionStartPayload
    });

    while (true) {
      const limitCheck = this.checkExecutionLimits(context, policy);
      if (!limitCheck.valid) {
        context.endTime = Date.now();

        this.emitEvent({
          executionId: context.executionId,
          type: 'execution_end',
          timestamp: context.endTime,
          payload: {
            reason: 'limit_reached',
            totalSteps: context.stepCount,
            totalToolCalls: context.toolCallCount,
            durationMs: context.endTime - context.startTime,
            response: limitCheck.reason
          } as ExecutionEndPayload
        });

        return {
          response: limitCheck.reason
        };
      }

      context.stepCount++;

      this.emitEvent({
        executionId: context.executionId,
        type: 'execution_step',
        timestamp: Date.now(),
        payload: {
          step: context.stepCount,
          stepCount: context.stepCount,
          toolCallCount: context.toolCallCount
        } as ExecutionStepPayload
      });

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

        this.emitEvent({
          executionId: context.executionId,
          type: 'agent_decision',
          timestamp: context.endTime,
          payload: {
            agentId: agent.id,
            decision: 'response',
            response: output.response
          } as AgentDecisionPayload
        });

        this.emitEvent({
          executionId: context.executionId,
          type: 'execution_end',
          timestamp: context.endTime,
          payload: {
            reason: 'completed',
            totalSteps: context.stepCount,
            totalToolCalls: context.toolCallCount,
            durationMs: context.endTime - context.startTime,
            response: output.response
          } as ExecutionEndPayload
        });

        return output;
      }

      if (output.toolCall) {
        const toolCall = output.toolCall;

        this.emitEvent({
          executionId: context.executionId,
          type: 'agent_decision',
          timestamp: Date.now(),
          payload: {
            agentId: agent.id,
            decision: 'tool_call',
            toolCall
          } as AgentDecisionPayload
        });

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

          this.emitEvent({
            executionId: context.executionId,
            type: 'execution_error',
            timestamp: context.endTime,
            payload: {
              reason: `Tool execution failed: ${toolResult.error}`,
              step: context.stepCount,
              error: toolResult.error
            } as ExecutionErrorPayload
          });

          this.emitEvent({
            executionId: context.executionId,
            type: 'execution_end',
            timestamp: context.endTime,
            payload: {
              reason: 'error',
              totalSteps: context.stepCount,
              totalToolCalls: context.toolCallCount,
              durationMs: context.endTime - context.startTime,
              response: `Tool execution failed: ${toolResult.error}`
            } as ExecutionEndPayload
          });

          return {
            response: `Tool execution failed: ${toolResult.error}`
          };
        }
      } else {
        context.endTime = Date.now();

        this.emitEvent({
          executionId: context.executionId,
          type: 'execution_error',
          timestamp: context.endTime,
          payload: {
            reason: 'Agent did not return a response or tool call',
            step: context.stepCount
          } as ExecutionErrorPayload
        });

        this.emitEvent({
          executionId: context.executionId,
          type: 'execution_end',
          timestamp: context.endTime,
          payload: {
            reason: 'error',
            totalSteps: context.stepCount,
            totalToolCalls: context.toolCallCount,
            durationMs: context.endTime - context.startTime,
            response: 'Agent did not return a response or tool call'
          } as ExecutionEndPayload
        });

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
