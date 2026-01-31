export interface ExecutionSummary {
  executionId: string;
  agentId?: string;
  status: 'running' | 'completed' | 'failed' | 'interrupted';
  startTime: number;
  endTime?: number;
  durationMs?: number;
  message: string;
}

export interface ExecutionDetail extends ExecutionSummary {
  events: ExecutionEvent[];
}

export interface ExecutionEvent {
  executionId: string;
  type: ExecutionEventType;
  timestamp: number;
  payload: unknown;
}

export type ExecutionEventType =
  | 'execution_start'
  | 'execution_step'
  | 'agent_decision'
  | 'tool_call'
  | 'tool_result'
  | 'execution_error'
  | 'execution_end';
