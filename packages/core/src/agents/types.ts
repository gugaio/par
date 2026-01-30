import type { Tool } from '../tools/types';
import type { ToolCall } from '../tools/types';

export interface AgentInput {
  message: string;
  sessionId: string;
  context?: SessionContext;
  history?: Message[];
  tools?: Tool[];
}

export interface SessionContext {
  metadata?: Record<string, unknown>;
}

export interface Message {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

export interface AgentOutput {
  response?: string;
  toolCall?: ToolCall;
}
