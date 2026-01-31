import type { ExecutionSummary, ExecutionDetail } from './types';

const API_BASE = '/api';

export async function getExecutions(): Promise<ExecutionSummary[]> {
  const response = await fetch(`${API_BASE}/executions`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<ExecutionSummary[]>;
}

export async function getExecution(id: string): Promise<ExecutionDetail | null> {
  const response = await fetch(`${API_BASE}/executions/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<ExecutionDetail | null>;
}
