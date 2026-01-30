import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIProvider } from './OpenAIProvider';

describe('OpenAIProvider', () => {
  it('should throw error when OPENAI_API_KEY is not set', () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => new OpenAIProvider()).toThrow('OPENAI_API_KEY environment variable is required');
  });

  it('should create instance when OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const provider = new OpenAIProvider();
    expect(provider.id).toBe('openai');
    expect(provider.name).toBe('OpenAI');
  });
});
