import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
});
