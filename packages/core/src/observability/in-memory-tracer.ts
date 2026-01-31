import type { ExecutionTracer } from './tracer';
import type { ExecutionEvent } from './types';

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

export class InMemoryExecutionTracer implements ExecutionTracer {
  private executions: Map<string, ExecutionSummary> = new Map();
  private events: Map<string, ExecutionEvent[]> = new Map();
  private readonly MAX_EXECUTIONS = 50;

  onEvent(event: ExecutionEvent): void {
    const { executionId, type, timestamp, payload } = event;

    switch (type) {
      case 'execution_start': {
        const startPayload = payload as { message: string; agentId?: string };
        this.executions.set(executionId, {
          executionId,
          agentId: startPayload.agentId,
          status: 'running',
          startTime: timestamp,
          message: startPayload.message
        });
        this.events.set(executionId, [event]);
        break;
      }

      case 'execution_end': {
        const summary = this.executions.get(executionId);
        if (summary) {
          const endPayload = payload as { reason: string; durationMs: number };
          let status: 'completed' | 'failed' | 'interrupted';

          if (endPayload.reason === 'completed') {
            status = 'completed';
          } else if (endPayload.reason === 'error') {
            status = 'failed';
          } else {
            status = 'interrupted';
          }

          summary.status = status;
          summary.endTime = timestamp;
          summary.durationMs = endPayload.durationMs;

          this.executions.set(executionId, summary);
        }

        const eventList = this.events.get(executionId);
        if (eventList) {
          eventList.push(event);
          this.events.set(executionId, eventList);
        }
        break;
      }

      default: {
        const eventList = this.events.get(executionId);
        if (eventList) {
          eventList.push(event);
          this.events.set(executionId, eventList);
        }
        break;
      }
    }

    this.pruneOldExecutions();
  }

  getExecutions(): ExecutionSummary[] {
    return Array.from(this.executions.values()).sort((a, b) => b.startTime - a.startTime);
  }

  getExecution(id: string): ExecutionDetail | null {
    const summary = this.executions.get(id);
    const eventList = this.events.get(id);

    if (!summary || !eventList) {
      return null;
    }

    return {
      ...summary,
      events: eventList
    };
  }

  private pruneOldExecutions(): void {
    if (this.executions.size <= this.MAX_EXECUTIONS) {
      return;
    }

    const entries = Array.from(this.executions.entries());
    entries.sort((a, b) => a[1].startTime - b[1].startTime);

    const toRemove = entries.slice(0, entries.length - this.MAX_EXECUTIONS);

    for (const [id] of toRemove) {
      this.executions.delete(id);
      this.events.delete(id);
    }
  }

  clear(): void {
    this.executions.clear();
    this.events.clear();
  }
}
