import type { ExecutionPolicy } from '../orchestrator/types';
import type { ToolCall } from '../tools/types';

export type ExecutionEventType =
  | 'execution_start'
  | 'execution_step'
  | 'agent_decision'
  | 'tool_call'
  | 'tool_result'
  | 'execution_error'
  | 'execution_end';

export interface ExecutionEvent {
  executionId: string;
  type: ExecutionEventType;
  timestamp: number;
  payload: unknown;
}

export interface ExecutionStartPayload {
  sessionId?: string;
  agentId?: string;
  message: string;
  policy: ExecutionPolicy;
}

export interface ExecutionStepPayload {
  step: number;
  stepCount: number;
  toolCallCount: number;
}

export interface AgentDecisionPayload {
  agentId: string;
  decision: 'response' | 'tool_call';
  response?: string;
  toolCall?: ToolCall;
}

export interface ToolCallPayload {
  step: number;
  tool: string;
  input: Record<string, unknown>;
}

export interface ToolResultPayload {
  step: number;
  tool: string;
  success: boolean;
  durationMs: number;
  output?: string;
  error?: string;
}

export interface ExecutionErrorPayload {
  reason: string;
  step?: number;
  error?: string;
}

export interface ExecutionEndPayload {
  reason: 'completed' | 'error' | 'limit_reached' | 'timeout';
  totalSteps: number;
  totalToolCalls: number;
  durationMs: number;
  response?: string;
}
