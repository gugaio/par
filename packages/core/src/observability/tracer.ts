import type { ExecutionEvent } from './types';

export interface ExecutionTracer {
  onEvent(event: ExecutionEvent): void;
}
