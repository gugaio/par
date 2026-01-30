# Arquitetura do PAR (Personal Agentic Runtime)

Este documento descreve a arquitetura do sistema PAR, um runtime local para agentes de IA operarem com ferramentas reais na máquina do usuário.

## Visão Geral

O PAR é um sistema monorepo que permite agentes de IA executarem comandos e operarem com o sistema local de forma controlada e segura através de uma arquitetura baseada em plugins.

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────────┐
│                           PAR Runtime                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐       ┌──────────────┐                         │
│  │     CLI     │──────▶│    Server    │                         │
│  └─────────────┘       └──────┬───────┘                         │
│                              │                                   │
│                              │ HTTP                              │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  Message Handler│                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│                             ▼                                    │
│                    ┌─────────────────┐                          │
│                    │   Orchestrator  │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│               ┌─────────────┴─────────────┐                      │
│               ▼                           ▼                      │
│    ┌───────────────────┐       ┌───────────────────┐           │
│    │  AgentRegistry    │       │  SkillRegistry    │           │
│    │  (Core)           │       │  (Core/Future)    │           │
│    └─────────┬─────────┘       └─────────┬─────────┘           │
│              │                           │                      │
│     ┌────────┴────────┐        ┌────────┴────────┐              │
│     ▼                 ▼        ▼                 ▼              │
│ ┌────────┐      ┌────────┐  ┌────────┐      ┌────────┐         │
│ │Agent A │      │Agent B │  │Skill A │      │Skill B │         │
│ │(Plugin)│      │(Plugin)│  │(Plugin)│      │(Plugin)│         │
│ └────────┘      └────────┘  └────────┘      └────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura de Pacotes

```
par/
├─ packages/
│  ├─ core/              # @par/core - Interfaces e contratos centrais
│  │  ├─ agents/
│  │  │  ├─ AgentProvider.ts       # Interface principal de agentes
│  │  │  ├─ AgentRegistry.ts       # Registro e gerenciamento de agentes
│  │  │  └─ types.ts               # Tipos compartilhados
│  │  └─ orchestrator/
│  │     └─ orchestrator.ts        # Roteamento de mensagens
│  ├─ agents/            # Implementações concretas de agentes
│  │  ├─ fake/                    # par-agents-fake
│  │  └─ another/                 # par-agents-another
│  ├─ server/            # @par/server - Servidor HTTP
│  │  ├─ src/
│  │  │  ├─ server.ts
│  │  │  └─ message-handler.ts
│  └─ cli/               # @par/cli - Interface de linha de comando
│     └─ src/
│        └─ index.ts
├─ AGENTS.md            # Guidelines de desenvolvimento
└─ ARCHITECTURE.md      # Este arquivo
```

## Componentes em Detalhe

### 1. CLI (@par/cli)

**Responsabilidade:**
- Ponto de entrada da aplicação
- Gerenciamento de configuração
- Inicialização do servidor
- Gerenciamento de processo

**Princípios:**
- Mínima lógica de negócio
- Delega para outros pacotes
- Tratamento de erros e saída graceful

### 2. Server (@par/server)

**Responsabilidade:**
- Servidor HTTP usando Fastify
- Roteamento de requisições
- Parse automático de JSON
- Tratamento de erros HTTP

**Endpoints:**
- `GET /health` - Health check do servidor
- `POST /message` - Envia mensagem para um agente

**Fluxo POST /message:**
```
Request JSON
   │
   ▼
Fastify body parser
   │
   ▼
message-handler.ts
   │
   ├─ Valida body (agentId, sessionId, message)
   │
   ├─ Busca agente no AgentRegistry
   │
   ├─ Cria SessionContext
   │
   ├─ Chama Orchestrator.route()
   │
   └─ Retorna AgentOutput
```

### 3. Core (@par/core)

#### AgentProvider Interface

Contrato principal que todos os agentes devem implementar:

```typescript
interface AgentProvider {
  id: string;
  name: string;
  version: string;

  process(input: AgentInput): Promise<AgentOutput>;
  
  canHandle(message: string): boolean;
  getCapabilities(): string[];
}
```

#### AgentRegistry

Gerencia o registro e recuperação de agentes:
- Padrão Singleton
- `register(agent: AgentProvider)` - Registra um agente
- `get(id: string)` - Retorna agente por ID
- `getAll()` - Retorna todos os agentes registrados
- `reset()` - Limpa o registro (útil para testes)

#### Orchestrator

Responsável pelo roteamento de mensagens para o agente apropriado:
- Seleciona agente baseado em critérios
- Gerencia contexto de sessão
- Fornece metadados ao agente

#### Types

Tipos compartilhados:
- `Message` - Estrutura de mensagem
- `AgentInput` - Input para processamento do agente
- `AgentOutput` - Output do processamento do agente
- `SessionContext` - Contexto da sessão

### 4. Agents (Implementações)

Agentes são plugins que implementam `AgentProvider`:

#### FakeAgent
- Simplesmente ecoa a mensagem recebida
- Usado para testes e desenvolvimento

#### AnotherFakeAgent
- Converte a mensagem para maiúsculas
- Exemplo de agente alternativo

**Padrão de Implementação:**
```typescript
class MyAgent implements AgentProvider {
  id = 'my-agent';
  name = 'My Agent';
  version = '1.0.0';

  async process(input: AgentInput): Promise<AgentOutput> {
    // Lógica do agente
    return { message: 'response', metadata: {} };
  }

  canHandle(message: string): boolean {
    // Determina se pode processar a mensagem
    return true;
  }

  getCapabilities(): string[] {
    return ['capability1', 'capability2'];
  }
}
```

## Padrões Arquiteturais

### 1. Plugin Pattern

Todos os agentes e (futuramente) skills são plugins que implementam interfaces definidas no core.

**Benefícios:**
- Extensibilidade sem modificar código core
- Desacoplamento completo
- Fácil adição de novas implementações

### 2. Interface-Based Design

Interfaces definem contratos claros entre componentes:
- `AgentProvider` - Contrato de agente
- `SkillProvider` (futuro) - Contrato de skill
- Tipos TypeScript estritos para comunicação

**Benefícios:**
- Compile-time type safety
- Contratos explícitos
- Facilita testes com mocks

### 3. Separation of Concerns

Cada pacote tem responsabilidade clara:
- `cli` - Configuração e startup
- `server` - HTTP e rotas
- `core` - Contratos e orquestração
- `agents/*` - Implementações de agentes
- `skills/*` (futuro) - Implementações de skills

**Benefícios:**
- Código mais organizado
- Fácil manutenção
- Testabilidade melhorada

### 4. Registry Pattern

Agentes e skills são registrados centralmente:
- `AgentRegistry` - Gerencia agentes
- `SkillRegistry` (futuro) - Gerenciará skills

**Benefícios:**
- Centralização do gerenciamento
- Fácil descoberta de plugins
- Injeção de dependências simplificada

## Fluxos de Dados

### Fluxo de Processamento de Mensagem

```
┌────────────┐
│   Client   │
└─────┬──────┘
      │
      │ POST /message
      │ { agentId, sessionId, message }
      ▼
┌────────────┐
│   Fastify  │  HTTP Server
└─────┬──────┘
      │
      │ Parsed body
      ▼
┌──────────────────┐
│ message-handler   │
└─────┬────────────┘
      │
      │ AgentInput
      ▼
┌──────────────────┐
│  Orchestrator    │  Seleciona agente
└─────┬────────────┘
      │
      │ AgentInput + Context
      ▼
┌──────────────────┐
│   AgentProvider  │  Processa mensagem
└─────┬────────────┘
      │
      │ AgentOutput
      ▼
┌──────────────────┐
│  Orchestrator    │
└─────┬────────────┘
      │
      │ AgentOutput
      ▼
┌──────────────────┐
│ message-handler  │
└─────┬────────────┘
      │
      │ Response JSON
      ▼
┌────────────┐
│   Client   │
└────────────┘
```

### Fluxo de Execução de Skill (Fase 3 - Futuro)

```
┌────────────┐
│   Agent    │
└─────┬──────┘
      │
      │ Solicita skill
      │ { skillName, params }
      ▼
┌──────────────────┐
│ SkillRegistry    │  Busca skill
└─────┬────────────┘
      │
      │ SkillProvider
      ▼
┌──────────────────┐
│  SkillExecutor   │  Valida e executa
└─────┬────────────┘
      │
      │ Result
      ▼
┌────────────┐
│   Agent    │
└────────────┘
```

## Decisões Arquiteturais Importantes

### 1. Fastify vs Express vs Native HTTP

**Decisão:** Fastify

**Razões:**
- Parse automático de JSON (reduz boilerplate)
- Performance superior
- TypeScript-first
- Schema validation embutida

**Impacto:**
- Redução de ~30% de código boilerplate
- Type safety em requisições
- Mais fácil testar

### 2. Vitest vs Jest

**Decisão:** Vitest

**Razões:**
- API similar ao Jest (curva de aprendizado baixa)
- Integração nativa com TypeScript
- Execução mais rápida
- Watch mode melhor

**Impacto:**
- 56 testes implementados rapidamente
- Feedback rápido durante desenvolvimento
- Melhor experiência DX

### 3. Monorepo com Workspaces

**Decisão:** npm workspaces

**Razões:**
- Dependências internas versionadas automaticamente
- Builds ordenados
- Instalação de dependências centralizada

**Impacto:**
- Gestão simplificada de múltiplos pacotes
- Compartilhamento de tipos TypeScript
- CI/CD mais simples

### 4. Subdirectory Structure para Plugins

**Decisão:** `packages/agents/fake/` em vez de `packages/agent-fake/`

**Razões:**
- Agrupamento lógico por tipo
- Escalabilidade para muitos plugins
- Fácil navegação

**Impacto:**
- Estrutura organizada
- Fácil adicionar novos agentes
- Padrão consistente para skills

### 5. Scoped Packages

**Decisão:** `par-agents-fake` em vez de `@par/agents/fake`

**Razões:**
- npm não permite `/` em nomes de pacotes
- Nomes mais simples
- Evita problemas de publicação

**Impacto:**
- Nomes de pacotes previsíveis
- Fácil referenciar no codebase

## Princípios de Design

### 1. Desacoplamento

**Regra:** Core nunca conhece implementações concretas

**Implementação:**
- Interfaces em `@par/core`
- Implementações em pacotes separados
- Injeção de dependências via Registry

### 2. Type Safety

**Regra:** TypeScript strict mode sempre

**Implementação:**
- Tipos explícitos para tudo
- Sem `any`, usar `unknown` se necessário
- Interfaces para contratos

### 3. Isolamento de Responsabilidades

**Regra:** Cada pacote tem uma responsabilidade clara

**Implementação:**
- CLI não tem lógica de servidor
- Server não tem lógica de agente
- Agentes não executam comandos diretamente

### 4. Segurança

**Regra:** Agentes nunca executam comandos diretamente

**Implementação:**
- Skills como única forma de interação
- Validação de inputs em skills
- Sanitização de comandos

## Pontos de Extensão

### 1. Novos Agentes

**Como adicionar:**
1. Criar novo pacote em `packages/agents/nome-do-agente/`
2. Implementar `AgentProvider`
3. Importar e registrar em `message-handler.ts`

**Exemplo:**
```typescript
// packages/agents/meu-agente/src/MeuAgente.ts
import { AgentProvider, AgentInput, AgentOutput } from '@par/core';

class MeuAgente implements AgentProvider {
  id = 'meu-agente';
  name = 'Meu Agente';
  version = '1.0.0';

  async process(input: AgentInput): Promise<AgentOutput> {
    return { message: 'Hello!', metadata: {} };
  }

  canHandle(message: string): boolean {
    return message.startsWith('hello');
  }

  getCapabilities(): string[] {
    return ['greeting'];
  }
}
```

### 2. Novos Skills (Fase 3)

**Como adicionar:**
1. Criar pacote em `packages/skills/nome-da-skill/`
2. Implementar `SkillProvider` (interface futura)
3. Registrar no `SkillRegistry`

### 3. Novos Canais (Fase Futura)

**Como adicionar:**
1. Criar pacote em `packages/channels/nome-do-canal/`
2. Implementar adapter para protocolo (Telegram, Slack, etc.)
3. Conectar ao Orchestrator

## Estado Atual e Roadmap

### Implementado

✅ **Fase 0:** CLI + Servidor HTTP básico
✅ **Fase 1:** API de Mensagens com Fastify
✅ **Fase 2:** Interface de Agentes + Registry + Orchestrator
- 56 testes unitários
- 2 agentes implementados
- Arquitetura de plugins funcional

### Em Progresso

⏳ **Fase 3:** Skill Engine
- Interface `SkillProvider`
- `SkillRegistry`
- Skills básicas (ReadFile, WriteFile, ExecuteCommand, HttpRequest)
- Validação de segurança

### Futuro

⏳ **Fase 4:** Integração com LLM real
⏳ **Fase 5:** Loop completo de ferramentas
⏳ **Fase 6:** Canais adicionais (Telegram, Slack, etc.)
⏳ **Fase 7:** UI Web

## Considerações de Performance

### 1. Concorrência

**Status:** Ainda não implementado

**Plano:**
- Processamento paralelo de mensagens
- Pool de conexões HTTP
- Cache de contexto de sessão

### 2. Memória

**Status:** Baixo impacto atual

**Considerações:**
- Limite de tamanho de mensagem
- Limite de sessões ativas
- Cleanup de contexto expirado

### 3. I/O

**Status:** Fastify já otimizado

**Melhorias futuras:**
- Streaming para grandes respostas
- Conexões persistentes
- Compression de resposta

## Considerações de Segurança

### 1. Validação de Input

**Atual:**
- Validação de tipos TypeScript
- Validção básica no message-handler

**Futuro:**
- Schema validation com Fastify
- Sanitização de comandos
- Rate limiting

### 2. Isolamento de Agentes

**Atual:**
- Agentes não executam comandos diretamente

**Futuro:**
- Sandbox para execução de skills
- Limites de recursos por agente
- Audit logging

### 3. Controle de Acesso

**Atual:**
- Nenhum (roda localmente)

**Futuro:**
- Autenticação (se exposto externamente)
- Autorização por agente
- Criptografia de comunicação

## Melhores Práticas

### 1. Implementando um Novo Agente

```typescript
import { AgentProvider, AgentInput, AgentOutput } from '@par/core';

class MyAgent implements AgentProvider {
  id = 'my-agent';
  name = 'My Agent';
  version = '1.0.0';

  async process(input: AgentInput): Promise<AgentOutput> {
    try {
      const response = await this.doSomething(input);
      return {
        message: response,
        metadata: { success: true }
      };
    } catch (error) {
      return {
        message: 'Error occurred',
        metadata: { error: String(error), success: false }
      };
    }
  }

  canHandle(message: string): boolean {
    return message.includes('keyword');
  }

  getCapabilities(): string[] {
    return ['capability1', 'capability2'];
  }
}
```

### 2. Registrando Agentes

```typescript
import { AgentRegistry } from '@par/core';
import { MyAgent } from 'par-agents-myagent';

const registry = AgentRegistry.getInstance();
registry.register(new MyAgent());
```

### 3. Testando Agentes

```typescript
import { describe, it, expect } from 'vitest';
import { MyAgent } from './MyAgent';

describe('MyAgent', () => {
  it('should process messages correctly', async () => {
    const agent = new MyAgent();
    const input = {
      sessionId: 'test',
      message: 'Hello',
      metadata: {}
    };

    const output = await agent.process(input);

    expect(output.message).toBe('Hello!');
    expect(output.metadata.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const agent = new MyAgent();
    const input = {
      sessionId: 'test',
      message: 'error',
      metadata: {}
    };

    const output = await agent.process(input);

    expect(output.metadata.success).toBe(false);
    expect(output.metadata.error).toBeDefined();
  });
});
```

## Referências

### Arquivos Importantes

- `AGENTS.md` - Guidelines de desenvolvimento
- `packages/core/src/agents/AgentProvider.ts` - Interface de agente
- `packages/core/src/agents/AgentRegistry.ts` - Implementação de registry
- `packages/core/src/orchestrator/orchestrator.ts` - Orquestrador
- `packages/server/src/message-handler.ts` - Handler de mensagens

### Dependências Principais

- `fastify` - Servidor HTTP
- `vitest` - Framework de testes
- `typescript` - Type system

### Scripts Disponíveis

```bash
# Build
npm run build
npm run build -w packages/server

# Test
npm test
npm test -w packages/server

# Start
npm start
npm start -w packages/server

# Type check
tsc --noEmit
```

## Glossário

- **AgentProvider** - Interface que define o contrato de um agente
- **AgentRegistry** - Singleton que gerencia todos os agentes registrados
- **Orchestrator** - Componente que roteia mensagens para agentes apropriados
- **SkillProvider** - Interface futura para habilidades/tools que agentes podem usar
- **Plugin** - Implementação concreta de uma interface (agente, skill, canal)
- **SessionContext** - Metadados e contexto associados a uma sessão de usuário
- **Monorepo** - Repositório contendo múltiplos pacotes relacionados
- **Workspace** - Unidade organizacional no monorepo (pacote)
- **Scoped Package** - Pacote com namespace (`@par/core`, `par-agents-fake`)

## Manutenção

### Adicionando Novas Features

1. Definir interfaces em `@par/core`
2. Criar pacote de implementação
3. Implementar conforme interface
4. Adicionar testes
5. Integrar em handlers existentes
6. Atualizar documentação

### Debugando

1. Habilitar logs no código
2. Usar Vitest debugging
3. Verificar registro no AgentRegistry
4. Validar tipos TypeScript
5. Checar mensagens de erro do Fastify

### Troubleshooting Comum

**Problema:** Agente não é encontrado
- Verifique se foi registrado no AgentRegistry
- Verifique se o ID está correto

**Problema:** Tipo TypeScript não é encontrado
- Verifique import em package.json do pacote
- Verifique se o export está em index.ts

**Problema:** Teste falha
- Verifique se AgentRegistry.reset() está sendo chamado no before/afterEach
- Verifique mocks de dependências

---

**Última Atualização:** 29 de Janeiro de 2026
**Versão Atual:** Fase 2 completa, Fase 3 em progresso
**Status:** 56 testes passando, build funcional