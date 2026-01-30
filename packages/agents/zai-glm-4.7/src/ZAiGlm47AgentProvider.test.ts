import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZAiGlm47AgentProvider } from './ZAiGlm47AgentProvider';
import type { AgentInput, AgentOutput, Tool } from '@par/core';

vi.mock('openai', () => {
  const mockResponses = {
    create: vi.fn()
  };

  return {
    default: vi.fn(() => ({
      responses: mockResponses
    }))
  };
});

describe('ZAiGlm47AgentProvider', () => {
  let agent: ZAiGlm47AgentProvider;

  beforeEach(() => {
    process.env.ZAI_API_KEY = 'test-api-key';
    agent = new ZAiGlm47AgentProvider();
  });

  afterEach(() => {
    delete process.env.ZAI_API_KEY;
    vi.clearAllMocks();
  });

  it('should have correct id and name', () => {
    expect(agent.id).toBe('zai-glm-4.7');
    expect(agent.name).toBe('Z.ai GLM-4.7');
  });

  it('should throw error when ZAI_API_KEY is not set', () => {
    delete process.env.ZAI_API_KEY;
    expect(() => new ZAiGlm47AgentProvider()).toThrow('ZAI_API_KEY environment variable is required');
  });

  it('should return text response when LLM returns text', async () => {
    const OpenAI = (await import('openai')).default;
    const mockClient = new OpenAI();
    (mockClient.responses.create as any).mockResolvedValue({
      output: []
    });

    const input: AgentInput = {
      message: 'Hello',
      sessionId: 'test-session'
    };

    const output: AgentOutput = await agent.handleMessage(input);

    expect(output.response).toBe('');
    expect(output.toolCall).toBeUndefined();
  });

  it('should return tool call when LLM requests tool execution', async () => {
    const OpenAI = (await import('openai')).default;
    const mockClient = new OpenAI();
    (mockClient.responses.create as any).mockResolvedValue({
      output: [
        {
          type: 'function_call',
          name: 'read_file',
          arguments: JSON.stringify({ path: './test.txt' })
        }
      ]
    });

    const tools: Tool[] = [
      {
        name: 'read_file',
        description: 'Read file',
        inputSchema: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path']
        }
      }
    ];

    const input: AgentInput = {
      message: 'Read the file',
      sessionId: 'test-session',
      tools
    };

    const output: AgentOutput = await agent.handleMessage(input);

    expect(output.response).toBeUndefined();
    expect(output.toolCall).toBeDefined();
    expect(output.toolCall?.type).toBe('tool_call');
    expect(output.toolCall?.tool).toBe('read_file');
    expect(output.toolCall?.input).toEqual({ path: './test.txt' });
  });

  it('should build messages correctly with history', async () => {
    const OpenAI = (await import('openai')).default;
    const mockClient = new OpenAI();
    (mockClient.responses.create as any).mockResolvedValue({
      output: []
    });

    const input: AgentInput = {
      message: 'What about this?',
      sessionId: 'test-session',
      history: [
        { role: 'user', content: 'First message', timestamp: 1 },
        { role: 'agent', content: 'First response', timestamp: 2 }
      ]
    };

    await agent.handleMessage(input);

    const createCall = (mockClient.responses.create as any).mock.calls[0];
    const messages = createCall[0].input;

    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({ role: 'user', content: 'First message' });
    expect(messages[1]).toEqual({ role: 'assistant', content: 'First response' });
    expect(messages[2]).toEqual({ role: 'user', content: 'What about this?' });
  });

  it('should convert PAR tools to OpenAI tool format', async () => {
    const OpenAI = (await import('openai')).default;
    const mockClient = new OpenAI();
    (mockClient.responses.create as any).mockResolvedValue({
      output: []
    });

    const tools: Tool[] = [
      {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: { param: { type: 'string' } },
          required: ['param']
        }
      }
    ];

    const input: AgentInput = {
      message: 'Test',
      sessionId: 'test',
      tools
    };

    await agent.handleMessage(input);

    const createCall = (mockClient.responses.create as any).mock.calls[0];
    const openAITools = createCall[0].tools;

    expect(openAITools).toHaveLength(1);
    expect(openAITools[0]).toEqual({
      type: 'function',
      name: 'test_tool',
      description: 'Test tool',
      parameters: {
        type: 'object',
        properties: { param: { type: 'string' } },
        required: ['param']
      },
      strict: false
    });
  });

  it('should use custom base URL when provided', async () => {
    process.env.ZAI_BASE_URL = 'https://custom.api.com';
    const customAgent = new ZAiGlm47AgentProvider();

    const OpenAI = (await import('openai')).default;
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-api-key',
        baseURL: 'https://custom.api.com'
      })
    );

    delete process.env.ZAI_BASE_URL;
  });

  it('should use custom model when provided', async () => {
    process.env.ZAI_MODEL = 'custom-model';
    const customAgent = new ZAiGlm47AgentProvider();

    const OpenAI = (await import('openai')).default;
    const mockClient = new OpenAI();
    (mockClient.responses.create as any).mockResolvedValue({
      output: []
    });

    const input: AgentInput = {
      message: 'Test',
      sessionId: 'test'
    };

    await customAgent.handleMessage(input);

    const createCall = (mockClient.responses.create as any).mock.calls[0];
    expect(createCall[0].model).toBe('custom-model');

    delete process.env.ZAI_MODEL;
  });
});
