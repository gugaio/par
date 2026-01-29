import type { AgentInput, AgentOutput } from './types';

export interface AgentProvider {
  id: string;
  name: string;
  handleMessage(input: AgentInput): Promise<AgentOutput>;
}
