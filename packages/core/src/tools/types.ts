export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  type: 'tool_call';
  tool: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool: string;
  output?: string;
  error?: string;
  success: boolean;
  durationMs: number;
}
