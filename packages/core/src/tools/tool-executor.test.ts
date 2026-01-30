import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { ExecutionTracer } from '../observability/tracer';
import type { ExecutionEvent } from '../observability/types';

import { ToolExecutor } from './tool-executor';

vi.mock('fs/promises');

describe('ToolExecutor', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = new ToolExecutor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeTool', () => {
    it('should execute read_file tool', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockResolvedValue('file content');

      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: 'file.txt' }
      });

      expect(result.tool).toBe('read_file');
      expect(result.output).toBe('file content');
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should execute write_file tool', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.writeFile as any).mockResolvedValue(undefined);

      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'write_file',
        input: { path: 'file.txt', content: 'content' }
      });

      expect(result.tool).toBe('write_file');
      expect(result.output).toContain('written successfully');
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should return error for unknown tool', async () => {
      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'unknown_tool',
        input: {}
      });

      expect(result.tool).toBe('unknown_tool');
      expect(result.error).toBe('Unknown tool: unknown_tool');
      expect(result.success).toBe(false);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executeReadFile', () => {
    it('should read file successfully', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockResolvedValue('file content');

      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: 'file.txt' }
      });

      expect(result.output).toBe('file content');
      expect(result.success).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalled();
    });

    it('should return error for invalid path', async () => {
      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: {}
      });

      expect(result.error).toBe('Invalid path: must be a non-empty string');
      expect(result.success).toBe(false);
    });

    it('should return error when read fails', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockRejectedValue(new Error('File not found'));

      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: 'nonexistent/file.txt' }
      });

      expect(result.error).toBe('File not found');
      expect(result.success).toBe(false);
    });
  });

  describe('executeWriteFile', () => {
    it('should write file successfully', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.writeFile as any).mockResolvedValue(undefined);

      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'write_file',
        input: { path: 'file.txt', content: 'content' }
      });

      expect(result.output).toContain('written successfully');
      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should return error for invalid path', async () => {
      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'write_file',
        input: { content: 'content' }
      });

      expect(result.error).toBe('Invalid path: must be a non-empty string');
      expect(result.success).toBe(false);
    });

    it('should return error for invalid content', async () => {
      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'write_file',
        input: { path: 'file.txt' }
      });

      expect(result.error).toBe('Invalid content: must be a string');
      expect(result.success).toBe(false);
    });

    it('should return error when write fails', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.writeFile as any).mockRejectedValue(new Error('Permission denied'));

      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'write_file',
        input: { path: 'file.txt', content: 'content' }
      });

      expect(result.error).toBe('Permission denied');
      expect(result.success).toBe(false);
    });
  });

  describe('executeCommand', () => {
    it('should return error for invalid command', async () => {
      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'execute_command',
        input: {}
      });

      expect(result.error).toBe('Invalid command: must be a non-empty string');
      expect(result.success).toBe(false);
    });
  });

  describe('sanitizePath', () => {
    it('should block path traversal attempts', async () => {
      const result = await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: '../../../etc/passwd' }
      });

      expect(result.error).toBe('Path traversal detected');
      expect(result.success).toBe(false);
    });

    it('should handle tilde expansion', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockResolvedValue('content');

      process.env.HOME = '/home/user';
      await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: '~/file.txt' }
      });

      expect(mockFs.readFile).toHaveBeenCalledWith('/home/user/file.txt', 'utf-8');
    });
  });

  describe('observability', () => {
    let mockTracer: ExecutionTracer;
    let capturedEvents: ExecutionEvent[];

    beforeEach(() => {
      capturedEvents = [];
      mockTracer = {
        onEvent: (event: ExecutionEvent) => {
          capturedEvents.push(event);
        }
      };

      executor = new ToolExecutor(mockTracer);
      vi.clearAllMocks();
    });

    it('should emit tool_call event before execution', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockResolvedValue('file content');

      await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: 'file.txt' }
      });

      expect(capturedEvents.length).toBe(2);
      const callEvent = capturedEvents[0];
      expect(callEvent.type).toBe('tool_call');
      const payload = callEvent.payload as any;
      expect(payload.tool).toBe('read_file');
      expect(payload.input).toEqual({ path: 'file.txt' });
      expect(payload.step).toBe(0);
    });

    it('should emit tool_result event after successful execution', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockResolvedValue('file content');

      await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: 'file.txt' }
      });

      expect(capturedEvents.length).toBe(2);
      const resultEvent = capturedEvents[1];
      expect(resultEvent.type).toBe('tool_result');
      const payload = resultEvent.payload as any;
      expect(payload.tool).toBe('read_file');
      expect(payload.success).toBe(true);
      expect(payload.durationMs).toBeGreaterThanOrEqual(0);
      expect(payload.output).toBe('file content');
      expect(payload.error).toBeUndefined();
    });

    it('should emit tool_result event after failed execution', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockRejectedValue(new Error('File not found'));

      await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: 'nonexistent.txt' }
      });

      expect(capturedEvents.length).toBe(2);
      const resultEvent = capturedEvents[1];
      expect(resultEvent.type).toBe('tool_result');
      const payload = resultEvent.payload as any;
      expect(payload.tool).toBe('read_file');
      expect(payload.success).toBe(false);
      expect(payload.durationMs).toBeGreaterThanOrEqual(0);
      expect(payload.output).toBeUndefined();
      expect(payload.error).toBe('File not found');
    });

    it('should emit events in correct order', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockResolvedValue('content');

      await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: 'file.txt' }
      });

      const eventTypes = capturedEvents.map(e => e.type);
      expect(eventTypes).toEqual(['tool_call', 'tool_result']);
    });

    it('should emit events with chronological timestamps', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockResolvedValue('content');

      await executor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: 'file.txt' }
      });

      expect(capturedEvents[1].timestamp).toBeGreaterThanOrEqual(capturedEvents[0].timestamp);
    });

    it('should work correctly without tracer', async () => {
      const noTracerExecutor = new ToolExecutor(null);

      const mockFs = await import('fs/promises');
      (mockFs.readFile as any).mockResolvedValue('content');

      const result = await noTracerExecutor.executeTool({
        type: 'tool_call',
        tool: 'read_file',
        input: { path: 'file.txt' }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe('content');
    });

    it('should emit tool_result with correct payload for write_file', async () => {
      const mockFs = await import('fs/promises');
      (mockFs.writeFile as any).mockResolvedValue(undefined);

      await executor.executeTool({
        type: 'tool_call',
        tool: 'write_file',
        input: { path: 'file.txt', content: 'content' }
      });

      const callEvent = capturedEvents[0];
      expect((callEvent.payload as any).tool).toBe('write_file');

      const resultEvent = capturedEvents[1];
      const payload = resultEvent.payload as any;
      expect(payload.tool).toBe('write_file');
      expect(payload.success).toBe(true);
      expect(payload.output).toContain('written successfully');
    });

    it('should emit tool_result with correct payload for unknown tool', async () => {
      await executor.executeTool({
        type: 'tool_call',
        tool: 'unknown_tool',
        input: {}
      });

      const callEvent = capturedEvents[0];
      expect((callEvent.payload as any).tool).toBe('unknown_tool');

      const resultEvent = capturedEvents[1];
      const payload = resultEvent.payload as any;
      expect(payload.tool).toBe('unknown_tool');
      expect(payload.success).toBe(false);
      expect(payload.error).toBe('Unknown tool: unknown_tool');
    });
  });
});
