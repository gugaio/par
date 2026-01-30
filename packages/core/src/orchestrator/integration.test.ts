import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { AgentProvider } from '../agents/AgentProvider';
import { AgentRegistry } from '../agents/AgentRegistry';
import type { AgentInput } from '../agents/types';
import type { ToolCall, ToolResult } from '../tools/types';
import { Orchestrator } from './orchestrator';
import type { ExecutionContext, ExecutionPolicy } from './types';

describe('Orchestrator Integration Tests', () => {
  let registry: AgentRegistry;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    registry = AgentRegistry.getInstance();
    registry.reset();
    orchestrator = new Orchestrator(registry);
  });

  describe('ExecutionContext', () => {
    it('should track execution state through multiple tool calls', async () => {
      const multiToolAgent: AgentProvider = {
        id: 'multi-tool-agent',
        name: 'Multi Tool Agent',
        async handleMessage(input: AgentInput) {
          const historyLength = input.history?.length || 0;
          if (historyLength === 0) {
            return {
              toolCall: {
                type: 'tool_call',
                tool: 'execute_command',
                input: { command: 'echo first' }
              } as ToolCall
            };
          } else if (historyLength === 1) {
            return {
              toolCall: {
                type: 'tool_call',
                tool: 'execute_command',
                input: { command: 'echo second' }
              } as ToolCall
            };
          }
          return { response: 'All tools executed' };
        }
      };

      registry.registerAgent(multiToolAgent);

      const input: AgentInput = {
        message: 'Execute multiple commands',
        sessionId: 'session-1',
        tools: [
          {
            name: 'execute_command',
            description: 'Execute command',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string' }
              },
              required: ['command']
            }
          }
        ]
      };

      const output = await orchestrator.processMessageWithToolLoop(input, 'multi-tool-agent');

      expect(output.response).toBe('All tools executed');
    });

    it('should create unique execution ids for each run', async () => {
      const simpleAgent: AgentProvider = {
        id: 'simple-agent',
        name: 'Simple Agent',
        async handleMessage(input: AgentInput) {
          return { response: 'Response' };
        }
      };

      registry.registerAgent(simpleAgent);

      const context1 = (orchestrator as any).createExecutionContext();
      const context2 = (orchestrator as any).createExecutionContext();

      expect(context1.executionId).not.toBe(context2.executionId);
    });

    it('should initialize context with correct defaults', async () => {
      const context = (orchestrator as any).createExecutionContext();

      expect(context.stepCount).toBe(0);
      expect(context.toolCallCount).toBe(0);
      expect(context.toolHistory).toEqual([]);
      expect(context.startTime).toBeGreaterThan(0);
      expect(context.endTime).toBeUndefined();
      expect(context.executionId).toMatch(/^exec-\d+-[a-z0-9]{7}$/);
    });
  });

  describe('ExecutionPolicy', () => {
    it('should use default execution policy', () => {
      const policy: ExecutionPolicy = (Orchestrator as any).DEFAULT_EXECUTION_POLICY;

      expect(policy.maxSteps).toBe(10);
      expect(policy.maxToolCalls).toBe(10);
      expect(policy.timeoutMs).toBe(300000);
    });

    it('should enforce max steps limit', async () => {
      const infiniteAgent: AgentProvider = {
        id: 'infinite-agent',
        name: 'Infinite Agent',
        async handleMessage(input: AgentInput) {
          return {
            toolCall: {
              type: 'tool_call',
              tool: 'execute_command',
              input: { command: 'echo test' }
            } as ToolCall
          };
        }
      };

      registry.registerAgent(infiniteAgent);

      const input: AgentInput = {
        message: 'Execute forever',
        sessionId: 'session-1',
        tools: [
          {
            name: 'execute_command',
            description: 'Execute command',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string' }
              },
              required: ['command']
            }
          }
        ]
      };

      const output = await orchestrator.processMessageWithToolLoop(input, 'infinite-agent');

      expect(output.response).toContain('Maximum steps');
      expect(output.response).toContain('10');
    });

    it('should enforce max tool calls limit', async () => {
      let callCount = 0;
      const infiniteToolAgent: AgentProvider = {
        id: 'infinite-tool-agent',
        name: 'Infinite Tool Agent',
        async handleMessage(input: AgentInput) {
          return {
            toolCall: {
              type: 'tool_call',
              tool: 'execute_command',
              input: { command: 'echo test' }
            } as ToolCall
          };
        }
      };

      registry.registerAgent(infiniteToolAgent);

      const input: AgentInput = {
        message: 'Execute forever',
        sessionId: 'session-1',
        tools: [
          {
            name: 'execute_command',
            description: 'Execute command',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string' }
              },
              required: ['command']
            }
          }
        ]
      };

      const output = await orchestrator.processMessageWithToolLoop(input, 'infinite-tool-agent');

      expect(output.response).toContain('Maximum steps');
      expect(output.response).toContain('10');
    });
  });

  describe('ToolResult Metadata', () => {
    it('should include success and duration in successful tool execution', async () => {
      const capturedToolResult: ToolResult[] = [];

      const toolAgent: AgentProvider = {
        id: 'tool-agent',
        name: 'Tool Agent',
        async handleMessage(input: AgentInput) {
          if (input.history && input.history.length > 0) {
            capturedToolResult.push(input.history[0].toolResult!);
          }

          if (input.history?.length === 0) {
            return {
              toolCall: {
                type: 'tool_call',
                tool: 'execute_command',
                input: { command: 'echo test' }
              } as ToolCall
            };
          }
          return { response: 'Done' };
        }
      };

      registry.registerAgent(toolAgent);

      const input: AgentInput = {
        message: 'Execute command',
        sessionId: 'session-1',
        tools: [
          {
            name: 'execute_command',
            description: 'Execute command',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string' }
              },
              required: ['command']
            }
          }
        ]
      };

      await orchestrator.processMessageWithToolLoop(input, 'tool-agent');

      expect(capturedToolResult[0].success).toBe(true);
      expect(capturedToolResult[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should stop execution when tool fails', async () => {
      const failingAgent: AgentProvider = {
        id: 'failing-agent',
        name: 'Failing Agent',
        async handleMessage(input: AgentInput) {
          return {
            toolCall: {
              type: 'tool_call',
              tool: 'execute_command',
              input: { command: 'rm -rf /' }
            } as ToolCall
          };
        }
      };

      registry.registerAgent(failingAgent);

      const input: AgentInput = {
        message: 'Execute dangerous command',
        sessionId: 'session-1',
        history: [],
        tools: [
          {
            name: 'execute_command',
            description: 'Execute command',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string' }
              },
              required: ['command']
            }
          }
        ]
      };

      const output = await orchestrator.processMessageWithToolLoop(input, 'failing-agent');

      expect(output.response).toContain('Tool execution failed');
    });
  });
});
