import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { AgentProvider } from '../agents/AgentProvider';
import { AgentRegistry } from '../agents/AgentRegistry';
import type { AgentInput, Message } from '../agents/types';
import type { ToolCall, ToolResult } from '../tools/types';

import { Orchestrator } from './orchestrator';
import type { ExecutionContext, ExecutionPolicy } from './types';

class MockAgent implements AgentProvider {
  constructor(
    public id: string,
    public name: string,
    private response: string
  ) {}

  async handleMessage(input: AgentInput): Promise<{ response: string }> {
    return { response: this.response };
  }
}

describe('Orchestrator', () => {
  let registry: AgentRegistry;
  let orchestrator: Orchestrator;
  let mockAgent: MockAgent;
  let mockAgent2: MockAgent;

  beforeEach(() => {
    registry = AgentRegistry.getInstance();
    registry.reset();

    mockAgent = new MockAgent('agent1', 'Agent 1', 'Response 1');
    mockAgent2 = new MockAgent('agent2', 'Agent 2', 'Response 2');

    registry.registerAgent(mockAgent);
    registry.registerAgent(mockAgent2);

    orchestrator = new Orchestrator(registry);
  });

  describe('createExecutionContext', () => {
    it('should create execution context with required fields', () => {
      const context = (orchestrator as any).createExecutionContext();

      expect(context.executionId).toBeDefined();
      expect(context.executionId).toMatch(/^exec-\d+-[a-z0-9]{7}$/);
      expect(context.stepCount).toBe(0);
      expect(context.toolCallCount).toBe(0);
      expect(context.toolHistory).toEqual([]);
      expect(context.startTime).toBeGreaterThan(0);
      expect(context.endTime).toBeUndefined();
    });

    it('should generate unique execution ids', () => {
      const context1 = (orchestrator as any).createExecutionContext();
      const context2 = (orchestrator as any).createExecutionContext();

      expect(context1.executionId).not.toBe(context2.executionId);
    });
  });

  describe('checkExecutionLimits', () => {
    it('should pass when within limits', () => {
      const context: ExecutionContext = {
        executionId: 'test',
        stepCount: 5,
        toolCallCount: 3,
        toolHistory: [],
        startTime: Date.now()
      };

      const policy: ExecutionPolicy = {
        maxSteps: 10,
        maxToolCalls: 10,
        timeoutMs: 60000
      };

      const result = (orchestrator as any).checkExecutionLimits(context, policy);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should fail when max steps reached', () => {
      const context: ExecutionContext = {
        executionId: 'test',
        stepCount: 10,
        toolCallCount: 5,
        toolHistory: [],
        startTime: Date.now()
      };

      const policy: ExecutionPolicy = {
        maxSteps: 10,
        maxToolCalls: 10,
        timeoutMs: 60000
      };

      const result = (orchestrator as any).checkExecutionLimits(context, policy);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Maximum steps');
      expect(result.reason).toContain('10');
    });

    it('should fail when max tool calls reached', () => {
      const context: ExecutionContext = {
        executionId: 'test',
        stepCount: 5,
        toolCallCount: 10,
        toolHistory: [],
        startTime: Date.now()
      };

      const policy: ExecutionPolicy = {
        maxSteps: 10,
        maxToolCalls: 10,
        timeoutMs: 60000
      };

      const result = (orchestrator as any).checkExecutionLimits(context, policy);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Maximum tool calls');
      expect(result.reason).toContain('10');
    });

    it('should fail when timeout reached', () => {
      const context: ExecutionContext = {
        executionId: 'test',
        stepCount: 5,
        toolCallCount: 3,
        toolHistory: [],
        startTime: Date.now() - 350000
      };

      const policy: ExecutionPolicy = {
        maxSteps: 10,
        maxToolCalls: 10,
        timeoutMs: 300000
      };

      const result = (orchestrator as any).checkExecutionLimits(context, policy);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Execution timeout');
      expect(result.reason).toContain('300000ms');
    });
  });

  describe('processMessage', () => {
    it('should process message with default agent', async () => {
      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      const output = await orchestrator.processMessage(input);

      expect(output.response).toBe('Response 1');
    });

    it('should process message with specific agent', async () => {
      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      const output = await orchestrator.processMessage(input, 'agent2');

      expect(output.response).toBe('Response 2');
    });

    it('should throw error for empty message', async () => {
      const input: AgentInput = {
        message: '',
        sessionId: 'session-1'
      };

      await expect(orchestrator.processMessage(input)).rejects.toThrow('Message cannot be empty');
    });

    it('should throw error for whitespace-only message', async () => {
      const input: AgentInput = {
        message: '   ',
        sessionId: 'session-1'
      };

      await expect(orchestrator.processMessage(input)).rejects.toThrow('Message cannot be empty');
    });

    it('should throw error when no default agent is available', async () => {
      const emptyRegistry = AgentRegistry.getInstance();
      emptyRegistry.reset();
      const emptyOrchestrator = new Orchestrator(emptyRegistry);

      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      await expect(emptyOrchestrator.processMessage(input)).rejects.toThrow('No agent available');
    });

    it('should throw error when specific agent does not exist', async () => {
      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      await expect(orchestrator.processMessage(input, 'non-existent')).rejects.toThrow('No agent available');
    });

    it('should pass input to agent correctly', async () => {
      let receivedInput: AgentInput | undefined;

      const spyAgent: AgentProvider = {
        id: 'spy',
        name: 'Spy Agent',
        async handleMessage(input: AgentInput) {
          receivedInput = input;
          return { response: 'Response' };
        }
      };

      registry.registerAgent(spyAgent);

      const input: AgentInput = {
        message: 'Test message',
        sessionId: 'test-session',
        context: { metadata: { key: 'value' } },
        history: [
          { role: 'user', content: 'Hello', timestamp: 1234567890 }
        ]
      };

      await orchestrator.processMessage(input, 'spy');

      expect(receivedInput).toEqual(input);
    });
  });

  describe('processMessageWithToolLoop', () => {
    it('should return response directly when agent returns text', async () => {
      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      const output = await orchestrator.processMessageWithToolLoop(input);

      expect(output.response).toBe('Response 1');
      expect(output.toolCall).toBeUndefined();
    });

    it('should execute tool and continue when agent requests tool call', async () => {
      const capturedHistory: Message[] = [];

      const toolCallAgent: AgentProvider = {
        id: 'tool-agent',
        name: 'Tool Agent',
        async handleMessage(input: AgentInput) {
          if (input.history && input.history.length > 0) {
            capturedHistory.push(...input.history);
          }

          if (input.history && input.history.length === 0) {
            return {
              toolCall: {
                type: 'tool_call',
                tool: 'execute_command',
                input: { command: 'echo test' }
              } as ToolCall
            };
          }
          return { response: 'Final response after tool' };
        }
      };

      registry.registerAgent(toolCallAgent);

      const input: AgentInput = {
        message: 'Execute a command',
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

      const output = await orchestrator.processMessageWithToolLoop(input, 'tool-agent');

      expect(output.response).toBe('Final response after tool');
      expect(output.toolCall).toBeUndefined();
      expect(capturedHistory[0].toolResult?.success).toBe(true);
      expect(capturedHistory[0].toolResult?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should return error when tool execution fails', async () => {
      const failingToolAgent: AgentProvider = {
        id: 'failing-tool-agent',
        name: 'Failing Tool Agent',
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

      registry.registerAgent(failingToolAgent);

      const input: AgentInput = {
        message: 'Execute dangerous command',
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

      const output = await orchestrator.processMessageWithToolLoop(input, 'failing-tool-agent');

      expect(output.response).toContain('Tool execution failed');
      expect(output.response).toContain('Dangerous command detected');
    });

    it('should handle multiple tool calls in sequence', async () => {
      let callCount = 0;
      const multiToolAgent: AgentProvider = {
        id: 'multi-tool-agent',
        name: 'Multi Tool Agent',
        async handleMessage(input: AgentInput) {
          callCount++;
          if (callCount === 1) {
            return {
              toolCall: {
                type: 'tool_call',
                tool: 'execute_command',
                input: { command: 'echo first' }
              } as ToolCall
            };
          } else if (callCount === 2) {
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
      expect(callCount).toBe(3);
    });

    it('should reach max iterations and return error', async () => {
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

    it('should enforce execution timeout', async () => {
      const slowToolAgent: AgentProvider = {
        id: 'slow-tool-agent',
        name: 'Slow Tool Agent',
        async handleMessage(input: AgentInput) {
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            toolCall: {
              type: 'tool_call',
              tool: 'execute_command',
              input: { command: 'echo test' }
            } as ToolCall
          };
        }
      };

      registry.registerAgent(slowToolAgent);

      const input: AgentInput = {
        message: 'Execute slowly',
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

      const originalTimeout = Orchestrator['DEFAULT_EXECUTION_POLICY'].timeoutMs;
      Orchestrator['DEFAULT_EXECUTION_POLICY'].timeoutMs = 500;

      const output = await orchestrator.processMessageWithToolLoop(input, 'slow-tool-agent');

      Orchestrator['DEFAULT_EXECUTION_POLICY'].timeoutMs = originalTimeout;

      expect(output.response).toContain('Execution timeout');
      expect(output.response).toContain('500ms');
    });

    it('should preserve history across tool calls', async () => {
      const historyTrackingAgent: AgentProvider = {
        id: 'history-agent',
        name: 'History Tracking Agent',
        async handleMessage(input: AgentInput) {
          const historyLength = input.history?.length || 0;
          if (historyLength === 1) {
            return {
              toolCall: {
                type: 'tool_call',
                tool: 'execute_command',
                input: { command: 'echo test' }
              } as ToolCall
            };
          }
          return {
            response: `History contains ${historyLength} messages`
          };
        }
      };

      registry.registerAgent(historyTrackingAgent);

      const input: AgentInput = {
        message: 'Execute with history',
        sessionId: 'session-1',
        history: [
          { role: 'user', content: 'First message', timestamp: 1000 }
        ],
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

      const output = await orchestrator.processMessageWithToolLoop(input, 'history-agent');

      expect(output.response).toBe('History contains 2 messages');
    });

    it('should throw error for empty message', async () => {
      const input: AgentInput = {
        message: '',
        sessionId: 'session-1'
      };

      await expect(orchestrator.processMessageWithToolLoop(input)).rejects.toThrow('Message cannot be empty');
    });

    it('should throw error when no agent is available', async () => {
      const emptyRegistry = AgentRegistry.getInstance();
      emptyRegistry.reset();
      const emptyOrchestrator = new Orchestrator(emptyRegistry);

      const input: AgentInput = {
        message: 'Hello',
        sessionId: 'session-1'
      };

      await expect(emptyOrchestrator.processMessageWithToolLoop(input)).rejects.toThrow('No agent available');
    });
  });

  describe('executeToolCall', () => {
    it('should execute tool via ToolExecutor', async () => {
      const toolCall: ToolCall = {
        type: 'tool_call',
        tool: 'execute_command',
        input: { command: 'echo test' }
      };

      const result = await orchestrator.executeToolCall(toolCall);

      expect(result.tool).toBe('execute_command');
      expect(result.output).toBeDefined();
      expect(result.output).toContain('test');
    });
  });
});
