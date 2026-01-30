import type { ToolCall, ToolResult } from '../tools/types';

export interface ExecutionContext {
  executionId: string;
  stepCount: number;
  toolCallCount: number;
  toolHistory: ToolCallRecord[];
  startTime: number;
  endTime?: number;
}

export interface ToolCallRecord {
  toolCall: ToolCall;
  toolResult: ToolResult;
  step: number;
  timestamp: number;
}

export interface ExecutionPolicy {
  maxSteps: number;
  maxToolCalls: number;
  timeoutMs: number;
}
