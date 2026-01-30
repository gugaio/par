import type { ExecutionTracer } from './tracer';
import type { ExecutionEvent } from './types';

export class ConsoleExecutionTracer implements ExecutionTracer {
  onEvent(event: ExecutionEvent): void {
    const timeStr = new Date(event.timestamp).toISOString();
    const prefix = `[${event.executionId}][${event.type}][${timeStr}]`;

    switch (event.type) {
      case 'execution_start': {
        const payload = event.payload as {
          agentId?: string;
          message: string;
          policy: unknown;
        };
        console.log(
          `${prefix} Starting execution`,
          {
            agentId: payload.agentId,
            message: payload.message,
            policy: payload.policy
          }
        );
        break;
      }

      case 'execution_step': {
        const payload = event.payload as {
          step: number;
          stepCount: number;
          toolCallCount: number;
        };
        console.log(`${prefix} Step ${payload.step}`, {
          stepCount: payload.stepCount,
          toolCallCount: payload.toolCallCount
        });
        break;
      }

      case 'agent_decision': {
        const payload = event.payload as {
          agentId: string;
          decision: string;
          response?: string;
          toolCall?: unknown;
        };
        console.log(`${prefix} Agent decided: ${payload.decision}`, {
          agentId: payload.agentId,
          response: payload.response,
          toolCall: payload.toolCall
        });
        break;
      }

      case 'tool_call': {
        const payload = event.payload as {
          step: number;
          tool: string;
          input: Record<string, unknown>;
        };
        console.log(
          `${prefix} Calling tool: ${payload.tool}`,
          {
            step: payload.step,
            input: payload.input
          }
        );
        break;
      }

      case 'tool_result': {
        const payload = event.payload as {
          step: number;
          tool: string;
          success: boolean;
          durationMs: number;
          output?: string;
          error?: string;
        };
        console.log(`${prefix} Tool result: ${payload.tool}`, {
          step: payload.step,
          success: payload.success,
          durationMs: payload.durationMs,
          output: this.truncate(payload.output),
          error: payload.error
        });
        break;
      }

      case 'execution_error': {
        const payload = event.payload as {
          reason: string;
          step?: number;
          error?: string;
        };
        console.error(`${prefix} Execution error`, {
          reason: payload.reason,
          step: payload.step,
          error: payload.error
        });
        break;
      }

      case 'execution_end': {
        const payload = event.payload as {
          reason: string;
          totalSteps: number;
          totalToolCalls: number;
          durationMs: number;
          response?: string;
        };
        console.log(`${prefix} Execution ended: ${payload.reason}`, {
          totalSteps: payload.totalSteps,
          totalToolCalls: payload.totalToolCalls,
          durationMs: payload.durationMs,
          response: this.truncate(payload.response)
        });
        break;
      }
    }
  }

  private truncate(str?: string): string | undefined {
    if (!str) {
      return undefined;
    }

    if (str.length <= 200) {
      return str;
    }

    return str.substring(0, 197) + '...';
  }
}
