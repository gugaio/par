import { join } from 'path';
import { promises as fs } from 'fs';
import prompts from 'prompts';
import { config } from 'dotenv';

const ENV_PATH = join(process.cwd(), '.env');

async function envFileExists(): Promise<boolean> {
  try {
    await fs.access(ENV_PATH);
    return true;
  } catch {
    return false;
  }
}

async function apiKeyConfigured(): Promise<boolean> {
  if (typeof process.env.ZAI_API_KEY !== 'string' || process.env.ZAI_API_KEY.length === 0) {
    return false;
  }

  if (await isApiKeyPlaceholder()) {
    return false;
  }

  return true;
}

async function isApiKeyPlaceholder(): Promise<boolean> {
  if (!await envFileExists()) {
    return false;
  }

  const content = await fs.readFile(ENV_PATH, 'utf-8');
  return content.includes('ZAI_API_KEY=xxxx') ||
         content.includes('ZAI_API_KEY=your-api-key-here');
}

async function cleanEnvFile(): Promise<void> {
  try {
    if (!await envFileExists()) {
      return;
    }

    const content = await fs.readFile(ENV_PATH, 'utf-8');

    const cleaned = content
      .replace(/# Z\.ai GLM-4\.7 API Configuration[\s\S]*?(?=\n#|\n$)/gs, '')
      .trim();

    if (cleaned.length > 0) {
      await fs.writeFile(ENV_PATH, cleaned + '\n');
    } else {
      await fs.unlink(ENV_PATH);
    }
  } catch (error) {
    // Silencioso - se falhar, continua
  }
}

async function writeOrReplaceEnvConfig(newConfig: string): Promise<void> {
  try {
    if (await envFileExists()) {
      const existing = await fs.readFile(ENV_PATH, 'utf-8');

      const cleaned = existing
        .replace(/# Z\.ai GLM-4\.7 API Configuration[\s\S]*?(?=\n#|\n$)/gs, '')
        .trim();

      const finalContent = cleaned + '\n' + newConfig;
      await fs.writeFile(ENV_PATH, finalContent);
    } else {
      await fs.writeFile(ENV_PATH, newConfig);
    }
  } catch (error) {
    throw new Error(`Failed to write .env file: ${error}`);
  }
}

async function hasMultipleApiKeys(): Promise<boolean> {
  if (!await envFileExists()) {
    return false;
  }

  const content = await fs.readFile(ENV_PATH, 'utf-8');
  const matches = content.match(/ZAI_API_KEY=.+/g);
  return (matches || []).length > 1;
}

async function askApiKey(): Promise<string> {
  const { apiKey } = await prompts({
    type: 'password',
    name: 'apiKey',
    message: 'Digite sua Z.ai API Key:',
    validate: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'API Key é obrigatória';
      }
      if (value.trim().length < 10) {
        return 'API Key parece muito curta';
      }
      return true;
    }
  });

  return apiKey?.trim() || '';
}

async function askBaseUrl(): Promise<string> {
  const { baseUrl } = await prompts({
    type: 'text',
    name: 'baseUrl',
    message: 'Custom base URL?',
    initial: 'https://api.z.ai/api/paas/v4'
  });

  return baseUrl?.trim() || 'https://api.z.ai/api/paas/v4';
}

async function askModel(): Promise<string> {
  const { model } = await prompts({
    type: 'text',
    name: 'model',
    message: 'Custom model?',
    initial: 'glm-4.7'
  });

  return model?.trim() || 'glm-4.7';
}

async function askToConfigure(): Promise<boolean> {
  const { configure } = await prompts({
    type: 'confirm',
    name: 'configure',
    message: 'Deseja configurar Z.ai API Key agora?',
    initial: true
  });

  return configure || false;
}

async function askToCleanMultipleKeys(): Promise<boolean> {
  const { clean } = await prompts({
    type: 'confirm',
    name: 'clean',
    message: 'Detectamos múltiplas ZAI_API_KEY no .env. Deseja limpar e reconfigurar?',
    initial: true
  });

  return clean || false;
}

async function configureApiKey(): Promise<void> {
  console.log('\n🔐 Configuração da Z.ai API Key');

  const apiKey = await askApiKey();
  const baseUrl = await askBaseUrl();
  const model = await askModel();

  const envContent = `# Z.ai GLM-4.7 API Configuration
ZAI_API_KEY=${apiKey}
ZAI_BASE_URL=${baseUrl}
ZAI_MODEL=${model}
`;

  await writeOrReplaceEnvConfig(envContent);

  console.log('\n✅ Configuração salva em .env');

  config();

  console.log('✅ Z.ai GLM-4.7 agent estará disponível\n');
}

export async function checkAndConfigureApiKey(): Promise<void> {
  if (await hasMultipleApiKeys()) {
    const wantsToClean = await askToCleanMultipleKeys();
    if (wantsToClean) {
      await cleanEnvFile();
    } else {
      console.log('⚠️  Usando primeira API Key encontrada');
      return;
    }
  }

  const isConfigured = await apiKeyConfigured();

  if (isConfigured) {
    console.log('✅ Z.ai API Key configurada');
    return;
  }

  const wantsToConfigure = await askToConfigure();

  if (!wantsToConfigure) {
    console.log('\n⚠️  PAR iniciará apenas com agente fake');
    console.log('💡 Para configurar depois:');
    console.log('   - Export: export ZAI_API_KEY=your-key');
    console.log('   - Ou crie arquivo .env na raiz do projeto\n');
    return;
  }

  await configureApiKey();
}
