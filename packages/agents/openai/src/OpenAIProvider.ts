import OpenAI from 'openai';
import type { AgentProvider } from '@par/core';
import type { AgentInput, AgentOutput, ToolCall } from '@par/core';
import type { Tool } from '@par/core';

export class OpenAIProvider implements AgentProvider {
  id = 'openai';
  name = 'OpenAI';

  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const baseURL = process.env.OPENAI_BASE_URL;
    this.model = process.env.OPENAI_MODEL || 'gpt-4.1';

    this.client = new OpenAI({
      apiKey,
      baseURL
    });
  }

  async handleMessage(input: AgentInput): Promise<AgentOutput> {
    const inputMessages = this.buildMessages(input);
    const tools = input.tools ? this.convertToOpenAITools(input.tools) : undefined;

    const response = await this.client.responses.create({
      model: this.model,
      input: inputMessages,
      tools: tools
    });

    const functionCallItem = response.output.find((item) => item.type === 'function_call') as OpenAI.Responses.ResponseFunctionToolCall | undefined;
    if (functionCallItem) {
      return this.parseToolCall(functionCallItem);
    }

    return { response: response.output_text || '' };
  }

  private buildMessages(input: AgentInput): OpenAI.Responses.EasyInputMessage[] {
    const messages: OpenAI.Responses.EasyInputMessage[] = [];

    if (input.history) {
      for (const msg of input.history) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }

    messages.push({
      role: 'user',
      content: input.message
    });

    return messages;
  }

  private convertToOpenAITools(tools: Tool[]): OpenAI.Responses.FunctionTool[] {
    return tools.map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      strict: false
    }));
  }

  private parseToolCall(item: OpenAI.Responses.ResponseFunctionToolCall): AgentOutput {
    const parsedInput = JSON.parse(item.arguments);

    return {
      toolCall: {
        type: 'tool_call',
        tool: item.name,
        input: parsedInput
      }
    };
  }
}
