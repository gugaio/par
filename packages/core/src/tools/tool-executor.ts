import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

import type { ExecutionTracer } from '../observability/tracer';
import type { ExecutionEvent, ToolCallPayload, ToolResultPayload } from '../observability/types';

import type { ToolCall, ToolResult } from './types';

const execAsync = promisify(exec);

export class ToolExecutor {
  private static readonly MAX_EXECUTION_TIME = 30000;

  private tracer: ExecutionTracer | null;

  constructor(tracer: ExecutionTracer | null = null) {
    this.tracer = tracer;
  }

  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    const { tool, input } = toolCall;
    const startTime = Date.now();

    this.emitEvent({
      executionId: 'unknown',
      type: 'tool_call',
      timestamp: startTime,
      payload: {
        step: 0,
        tool,
        input
      } as ToolCallPayload
    });

    let result: Omit<ToolResult, 'success' | 'durationMs'>;

    switch (tool) {
      case 'read_file':
        result = await this.executeReadFile(input);
        break;
      case 'write_file':
        result = await this.executeWriteFile(input);
        break;
      case 'execute_command':
        result = await this.executeCommand(input);
        break;
      default:
        result = {
          tool,
          error: `Unknown tool: ${tool}`
        };
    }

    const durationMs = Date.now() - startTime;
    const success = !result.error;

    this.emitEvent({
      executionId: 'unknown',
      type: 'tool_result',
      timestamp: Date.now(),
      payload: {
        step: 0,
        tool,
        success,
        durationMs,
        output: result.output,
        error: result.error
      } as ToolResultPayload
    });

    return {
      ...result,
      success,
      durationMs
    };
  }

  private emitEvent(event: ExecutionEvent): void {
    if (this.tracer) {
      this.tracer.onEvent(event);
    }
  }

  private async executeReadFile(input: Record<string, unknown>): Promise<Omit<ToolResult, 'success' | 'durationMs'>> {
    const path = input.path as string;

    if (!path || typeof path !== 'string') {
      return {
        tool: 'read_file',
        error: 'Invalid path: must be a non-empty string'
      };
    }

    try {
      const normalizedPath = this.sanitizePath(path);
      const content = await fs.readFile(normalizedPath, 'utf-8');
      return {
        tool: 'read_file',
        output: content
      };
    } catch (error) {
      return {
        tool: 'read_file',
        error: error instanceof Error ? error.message : 'Failed to read file'
      };
    }
  }

  private async executeWriteFile(input: Record<string, unknown>): Promise<Omit<ToolResult, 'success' | 'durationMs'>> {
    const path = input.path as string;
    const content = input.content as string;

    if (!path || typeof path !== 'string') {
      return {
        tool: 'write_file',
        error: 'Invalid path: must be a non-empty string'
      };
    }

    if (content === undefined || typeof content !== 'string') {
      return {
        tool: 'write_file',
        error: 'Invalid content: must be a string'
      };
    }

    try {
      const normalizedPath = this.sanitizePath(path);
      await fs.writeFile(normalizedPath, content, 'utf-8');
      return {
        tool: 'write_file',
        output: `File written successfully to ${normalizedPath}`
      };
    } catch (error) {
      return {
        tool: 'write_file',
        error: error instanceof Error ? error.message : 'Failed to write file'
      };
    }
  }

  private async executeCommand(input: Record<string, unknown>): Promise<Omit<ToolResult, 'success' | 'durationMs'>> {
    const command = input.command as string;

    if (!command || typeof command !== 'string') {
      return {
        tool: 'execute_command',
        error: 'Invalid command: must be a non-empty string'
      };
    }

    try {
      const sanitizedCommand = this.sanitizeCommand(command);
      const { stdout, stderr } = await execAsync(sanitizedCommand, {
        timeout: ToolExecutor.MAX_EXECUTION_TIME,
        maxBuffer: 1024 * 1024 * 10
      });

      let output = stdout;
      if (stderr) {
        output += `\n[STDERR]\n${stderr}`;
      }

      return {
        tool: 'execute_command',
        output
      };
    } catch (error) {
      return {
        tool: 'execute_command',
        error: error instanceof Error ? error.message : 'Failed to execute command'
      };
    }
  }

  private sanitizePath(inputPath: string): string {
    let normalized = inputPath.trim();

    if (normalized.startsWith('~')) {
      normalized = normalized.replace('~', process.env.HOME || '');
    }

    const resolvedPath = path.resolve(normalized);

    if (!resolvedPath.startsWith(process.cwd()) && !resolvedPath.startsWith(process.env.HOME || '/')) {
      throw new Error('Path traversal detected');
    }

    return resolvedPath;
  }

  private sanitizeCommand(command: string): string {
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      /dd\s+if=.*of=\/dev\/.*/i,
      /mkfs\./,
      /format\s+c:/i,
      /:(){ :\|:& };:/,
      />\s*\/dev\/.*/,
      /wget\s+.*\|\s*sh/,
      /curl\s+.*\|\s*bash/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error(`Dangerous command detected and blocked: ${command}`);
      }
    }

    return command;
  }
}
