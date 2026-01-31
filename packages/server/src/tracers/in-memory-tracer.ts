import { InMemoryExecutionTracer } from '@par/core';

let tracer: InMemoryExecutionTracer | null = null;

export function getTracer(): InMemoryExecutionTracer {
  if (!tracer) {
    tracer = new InMemoryExecutionTracer();
  }
  return tracer;
}
