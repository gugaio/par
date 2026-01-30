import type { AgentProvider } from '@par/core';
import type { AgentInput, AgentOutput } from '@par/core';
import type { Tool } from '@par/core';
import OpenAI from 'openai';

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

  private buildMessages(input: AgentInput): OpenAI.Responses.ResponseInputItem[] {
    const items: OpenAI.Responses.ResponseInputItem[] = [];

    if (input.history) {
      for (const msg of input.history) {
        if (msg.toolCall && msg.toolResult) {
          const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          items.push({
            type: 'function_call',
            call_id: callId,
            name: msg.toolCall.tool,
            arguments: JSON.stringify(msg.toolCall.input)
          } as OpenAI.Responses.ResponseFunctionToolCall);

          items.push({
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({
              tool: msg.toolResult.tool,
              output: msg.toolResult.output,
              error: msg.toolResult.error
            })
          } as OpenAI.Responses.ResponseInputItem.FunctionCallOutput);
        } else if (msg.content) {
          items.push({
            type: 'message',
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: [{ type: 'input_text', text: msg.content }]
          } as OpenAI.Responses.ResponseInputItem.Message);
        }
      }
    }

    items.push({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: input.message }]
    } as OpenAI.Responses.ResponseInputItem.Message);

    return items;
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
