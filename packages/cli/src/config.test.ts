import * as fs from 'fs/promises';

import prompts from 'prompts';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { checkAndConfigureApiKey } from './config';

vi.mock('fs/promises');
vi.mock('prompts');

const originalProcessEnv = process.env;

describe('checkAndConfigureApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalProcessEnv };
    delete process.env.ZAI_API_KEY;
    delete process.env.ZAI_BASE_URL;
    delete process.env.ZAI_MODEL;
  });

  afterEach(() => {
    process.env = originalProcessEnv;
  });

  it('should ask to configure if API key is not configured', async () => {
    const mockFs = fs as any;
    mockFs.access.mockRejectedValue(new Error('File not found'));
    (prompts as any).mockResolvedValueOnce({ configure: false });

    await checkAndConfigureApiKey();

    expect(prompts).toHaveBeenCalledTimes(1);
    expect(prompts).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'confirm',
        message: 'Deseja configurar Z.ai API Key agora?'
      })
    );
  });

  it('should not save configuration if user declines', async () => {
    const mockFs = fs as any;
    mockFs.access.mockRejectedValue(new Error('File not found'));
    (prompts as any).mockResolvedValueOnce({ configure: false });

    await checkAndConfigureApiKey();

    expect(mockFs.writeFile).not.toHaveBeenCalled();
    expect(mockFs.appendFile).not.toHaveBeenCalled();
  });

  describe('placeholder detection', () => {
    it('should detect placeholder "xxxx"', async () => {
      const mockFs = fs as any;
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('ZAI_API_KEY=xxxx\n');
      (prompts as any).mockResolvedValueOnce({ configure: false });

      await checkAndConfigureApiKey();

      expect(prompts).toHaveBeenCalled();
    });

    it('should detect placeholder "your-api-key-here"', async () => {
      const mockFs = fs as any;
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('ZAI_API_KEY=your-api-key-here\n');
      (prompts as any).mockResolvedValueOnce({ configure: false });

      await checkAndConfigureApiKey();

      expect(prompts).toHaveBeenCalled();
    });

    it('should not detect valid key as placeholder', async () => {
      process.env.ZAI_API_KEY = 'valid-key-123456';
      const mockFs = fs as any;
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('ZAI_API_KEY=valid-key-123456\n');

      await checkAndConfigureApiKey();

      expect(prompts).not.toHaveBeenCalled();
    });
  });

  describe('multiple API keys detection', () => {
    it('should ask to clean multiple API keys', async () => {
      const mockFs = fs as any;
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('ZAI_API_KEY=key1\nZAI_API_KEY=key2\n');
      (prompts as any).mockResolvedValueOnce({ clean: true });

      await checkAndConfigureApiKey();

      expect(prompts).toHaveBeenCalled();
    });

    it('should not ask to clean single API key', async () => {
      const mockFs = fs as any;
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.readFile.mockResolvedValue('ZAI_API_KEY=key1\n');
      (prompts as any).mockResolvedValueOnce({ configure: false });

      await checkAndConfigureApiKey();

      const promptsCalls = (prompts as any).mock.calls;
      const cleanCalls = promptsCalls.filter((call: any) => call[0].message?.includes('múltiplas'));
      expect(cleanCalls.length).toBe(0);
    });
  });
});
