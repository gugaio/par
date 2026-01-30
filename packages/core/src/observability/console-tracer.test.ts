import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ConsoleExecutionTracer } from './console-tracer';
import type { ExecutionEvent } from './types';

describe('ConsoleExecutionTracer', () => {
  let tracer: ConsoleExecutionTracer;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    tracer = new ConsoleExecutionTracer();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('execution_start event', () => {
    it('should log start event with correct format', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-123',
        type: 'execution_start',
        timestamp: 1234567890000,
        payload: {
          sessionId: 'session-abc',
          agentId: 'zai',
          message: 'test message',
          policy: {
            maxSteps: 10,
            maxToolCalls: 10,
            timeoutMs: 300000
          }
        }
      };

      tracer.onEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[exec-123][execution_start]');
      expect(logCall[0]).toContain('2009-02-13');
      expect(logCall[1]).toEqual({
        agentId: 'zai',
        message: 'test message',
        policy: {
          maxSteps: 10,
          maxToolCalls: 10,
          timeoutMs: 300000
        }
      });
    });
  });

  describe('execution_step event', () => {
    it('should log step event with correct format', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-456',
        type: 'execution_step',
        timestamp: 1234567890000,
        payload: {
          step: 3,
          stepCount: 3,
          toolCallCount: 2
        }
      };

      tracer.onEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[exec-456][execution_step]');
      expect(logCall[0]).toContain('Step 3');
      expect(logCall[1]).toEqual({
        stepCount: 3,
        toolCallCount: 2
      });
    });
  });

  describe('agent_decision event', () => {
    it('should log agent decision for tool_call', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-789',
        type: 'agent_decision',
        timestamp: 1234567890000,
        payload: {
          agentId: 'zai',
          decision: 'tool_call',
          toolCall: {
            type: 'tool_call',
            tool: 'read_file',
            input: { path: '/home/test.txt' }
          }
        }
      };

      tracer.onEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[exec-789][agent_decision]');
      expect(logCall[0]).toContain('Agent decided: tool_call');
      expect(logCall[1]).toEqual({
        agentId: 'zai',
        toolCall: {
          type: 'tool_call',
          tool: 'read_file',
          input: { path: '/home/test.txt' }
        }
      });
    });

    it('should log agent decision for response', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-789',
        type: 'agent_decision',
        timestamp: 1234567890000,
        payload: {
          agentId: 'zai',
          decision: 'response',
          response: 'This is a response'
        }
      };

      tracer.onEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[exec-789][agent_decision]');
      expect(logCall[0]).toContain('Agent decided: response');
      expect(logCall[1]).toEqual({
        agentId: 'zai',
        response: 'This is a response'
      });
    });
  });

  describe('tool_call event', () => {
    it('should log tool call with correct format', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-999',
        type: 'tool_call',
        timestamp: 1234567890000,
        payload: {
          step: 1,
          tool: 'read_file',
          input: { path: '/home/test.txt' }
        }
      };

      tracer.onEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[exec-999][tool_call]');
      expect(logCall[0]).toContain('Calling tool: read_file');
      expect(logCall[1]).toEqual({
        step: 1,
        input: { path: '/home/test.txt' }
      });
    });
  });

  describe('tool_result event', () => {
    it('should log successful tool result', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-999',
        type: 'tool_result',
        timestamp: 1234567890000,
        payload: {
          step: 1,
          tool: 'read_file',
          success: true,
          durationMs: 100,
          output: 'file content here'
        }
      };

      tracer.onEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[exec-999][tool_result]');
      expect(logCall[0]).toContain('Tool result: read_file');
      expect(logCall[1]).toEqual({
        step: 1,
        success: true,
        durationMs: 100,
        output: 'file content here'
      });
    });

    it('should log failed tool result', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-999',
        type: 'tool_result',
        timestamp: 1234567890000,
        payload: {
          step: 1,
          tool: 'read_file',
          success: false,
          durationMs: 5,
          error: 'File not found'
        }
      };

      tracer.onEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[exec-999][tool_result]');
      expect(logCall[1]).toEqual({
        step: 1,
        success: false,
        durationMs: 5,
        error: 'File not found'
      });
    });
  });

  describe('execution_error event', () => {
    it('should log error using console.error', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-error',
        type: 'execution_error',
        timestamp: 1234567890000,
        payload: {
          reason: 'Something went wrong',
          step: 5,
          error: 'Detailed error message'
        }
      };

      tracer.onEvent(event);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      const errorCall = consoleErrorSpy.mock.calls[0];
      expect(errorCall[0]).toContain('[exec-error][execution_error]');
      expect(errorCall[0]).toContain('Execution error');
      expect(errorCall[1]).toEqual({
        reason: 'Something went wrong',
        step: 5,
        error: 'Detailed error message'
      });
    });
  });

  describe('execution_end event', () => {
    it('should log end event with completed reason', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-end',
        type: 'execution_end',
        timestamp: 1234567890000,
        payload: {
          reason: 'completed',
          totalSteps: 5,
          totalToolCalls: 3,
          durationMs: 5000,
          response: 'Task completed successfully'
        }
      };

      tracer.onEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[exec-end][execution_end]');
      expect(logCall[0]).toContain('Execution ended: completed');
      expect(logCall[1]).toEqual({
        totalSteps: 5,
        totalToolCalls: 3,
        durationMs: 5000,
        response: 'Task completed successfully'
      });
    });

    it('should log end event with error reason', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-end',
        type: 'execution_end',
        timestamp: 1234567890000,
        payload: {
          reason: 'error',
          totalSteps: 2,
          totalToolCalls: 0,
          durationMs: 1000,
          response: 'Something failed'
        }
      };

      tracer.onEvent(event);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[0]).toContain('[exec-end][execution_end]');
      expect(logCall[0]).toContain('Execution ended: error');
      expect(logCall[1]).toEqual({
        totalSteps: 2,
        totalToolCalls: 0,
        durationMs: 1000,
        response: 'Something failed'
      });
    });
  });

  describe('output truncation', () => {
    it('should truncate long outputs in tool_result', () => {
      const longOutput = 'a'.repeat(300);
      const event: ExecutionEvent = {
        executionId: 'exec-trunc',
        type: 'tool_result',
        timestamp: 1234567890000,
        payload: {
          step: 1,
          tool: 'read_file',
          success: true,
          durationMs: 100,
          output: longOutput
        }
      };

      tracer.onEvent(event);

      const logCall = consoleLogSpy.mock.calls[0];
      const truncatedOutput = logCall[1].output;
      expect(truncatedOutput).toHaveLength(200);
      expect(truncatedOutput).toBe('a'.repeat(197) + '...');
    });

    it('should truncate long responses in execution_end', () => {
      const longResponse = 'b'.repeat(400);
      const event: ExecutionEvent = {
        executionId: 'exec-trunc',
        type: 'execution_end',
        timestamp: 1234567890000,
        payload: {
          reason: 'completed',
          totalSteps: 1,
          totalToolCalls: 0,
          durationMs: 100,
          response: longResponse
        }
      };

      tracer.onEvent(event);

      const logCall = consoleLogSpy.mock.calls[0];
      const truncatedResponse = logCall[1].response;
      expect(truncatedResponse).toHaveLength(200);
      expect(truncatedResponse).toBe('b'.repeat(197) + '...');
    });

    it('should not truncate short outputs', () => {
      const shortOutput = 'short';
      const event: ExecutionEvent = {
        executionId: 'exec-trunc',
        type: 'tool_result',
        timestamp: 1234567890000,
        payload: {
          step: 1,
          tool: 'read_file',
          success: true,
          durationMs: 100,
          output: shortOutput
        }
      };

      tracer.onEvent(event);

      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[1].output).toBe('short');
    });

    it('should handle undefined output without truncation', () => {
      const event: ExecutionEvent = {
        executionId: 'exec-trunc',
        type: 'tool_result',
        timestamp: 1234567890000,
        payload: {
          step: 1,
          tool: 'read_file',
          success: false,
          durationMs: 5,
          error: 'error'
        }
      };

      tracer.onEvent(event);

      const logCall = consoleLogSpy.mock.calls[0];
      expect(logCall[1].output).toBeUndefined();
    });
  });
});
