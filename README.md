PAR — Personal Agentic Runtime
Project Guide & Engineering Context
🧠 VISÃO DO PROJETO

O PAR (Personal Agentic Runtime) é um runtime local para agentes de IA operarem na máquina do usuário.

Ele não é um bot e não é apenas um wrapper de LLM.
Ele é a infraestrutura que permite agentes usarem ferramentas reais, integrarem com canais externos e executarem tarefas no ambiente do usuário.

O PAR deve:

Rodar localmente via CLI

Manter um servidor sempre ativo

Permitir múltiplos agentes (Claude, Gemini, etc.)

 Expor ferramentas locais (tools) para os agentes

Permitir integração com Web UI, Telegram e outros canais

Ser modular, extensível e testável

Não depender obrigatoriamente de Kubernetes, cloud ou infraestrutura externa

Kubernetes e Docker são opcionais, não requisitos.

🎯 OBJETIVO PRINCIPAL

Criar um runtime onde:

Agentes de IA podem perceber, decidir e agir usando ferramentas reais da máquina do usuário

O PAR é como um "sistema operacional para agentes".

🧱 PRINCÍPIOS DE ARQUITETURA

CLI-First

O PAR deve rodar com algo como:

par start


Tudo deve funcionar localmente sem necessidade de infraestrutura adicional.

Modularidade Total

Agentes são plugáveis

 Tools são plugáveis

Canais (Telegram, Web, etc.) são adaptadores

Separação de Responsabilidades

Server não sabe como o agente funciona

 Agente não sabe como Tool Executors são implementados

 Tool Executors não sabem nada sobre LLMs

LLM é substituível

Claude, Gemini, OpenAI, modelos locais

Nenhum agente deve ser acoplado ao core

Tudo é extensível

Novos agentes sem mudar o core

 Novas tools sem mudar o core

Novos canais sem mudar o core

Infra é opcional

Deve rodar só com Node.js

Docker e Kubernetes são apenas formas de deploy, não partes da arquitetura

🏗️ VISÃO DE ALTO NÍVEL
CLI (par start)
     ↓
PAR Server (Node.js com Fastify)
     ↓
Agent Orchestrator
     ↓
Agents (Claude, Gemini, etc.)
     ↓
 Tool Engine (tools locais)
     ↓
Sistema Operacional / APIs / Arquivos


Canais externos se conectam ao servidor:

Telegram ─┐
Web UI   ─┼──> PAR Server API
CLI Chat ─┘

🧩 COMPONENTES PRINCIPAIS
1️⃣ PAR CLI

Responsável por:

Iniciar o servidor

Gerenciar configuração

 Futuramente instalar tools

2️⃣ PAR Server

Servidor HTTP (Fastify) que:

Recebe mensagens

Mantém sessões

Chama o Orchestrator

3️⃣ Orchestrator (Cérebro)

Responsável por:

Escolher qual agente usar

Passar contexto e tools disponíveis

Executar loop de uso de ferramentas

4️⃣ Agent Providers

Cada agente implementa a mesma interface, por exemplo:

Claude Agent

Gemini Agent

OpenAI Agent

Agente interno da empresa

Eles recebem:

Mensagens

Lista de tools disponíveis

Contexto da sessão

E retornam:

Resposta final

Ou pedido de execução de tool

 5️⃣ Tool Engine

Responsável por executar ferramentas reais da máquina.

Exemplos de Tool Executors:

Ler arquivo

Escrever arquivo

Rodar comando bash

Fazer requisição HTTP

Rodar testes

Operações de git

Tools são contratos declarativos que descrevem capacidades disponíveis para agentes.

Tool Executors são implementações concretas e controladas de Tools, executadas exclusivamente pelo runtime.

Agentes nunca executam Tool Executors diretamente.

6️⃣ Channels (Adapters)

Adaptadores de entrada/saída:

Web UI

Telegram

Futuramente WhatsApp, Slack, etc.

 Eles não sabem nada sobre agentes — apenas enviam e recebem mensagens do PAR Server.

📚 GLOSSÁRIO

Tool

Contrato declarativo que descreve uma capacidade disponível para um agente.

Define o nome, descrição, schema de entrada e comportamento esperado.

Tool Executor

Implementação concreta e controlada de uma Tool, executada exclusivamente pelo runtime.

Agentes nunca executam Tool Executors diretamente.

Agent

Entidade de IA que processa mensagens e toma decisões sobre quais Tools usar.

Orchestrator

Componente que seleciona agentes e gerencia o fluxo de mensagens e execução de Tools.

Channel

Adaptador de protocolo que permite comunicação externa (Telegram, Web UI, etc.).

📌 DECISÃO ARQUITETURAL

Nota: o PAR não utiliza o termo "skill" para evitar conflitos semânticos com conceitos de agentes (Claude Code, LangChain, etc.).

O runtime trabalha exclusivamente com Tools (contratos declarativos expostos ao agente) e Tool Executors (implementações controladas executadas pelo runtime).

Essa separação clara garante:

Agentes conhecem apenas a interface Tool (o que pode ser feito)

Runtime controla a execução via Tool Executor (como é feito)

Segurança e isolamento entre camadas

🧠 COMO OS AGENTES DEVEM FUNCIONAR

Agentes:

Não executam comandos diretamente

Não acessam sistema de arquivos diretamente

 Só podem agir via tools expostas pelo Tool Engine

Eles funcionam assim:

Recebem mensagens do usuário

Recebem lista de tools disponíveis

Decidem:

Responder direto

Ou pedir execução de uma tool

Recebem resultado da tool

Continuam raciocínio

Geram resposta final

 🧰 COMO AS TOOLS DEVEM FUNCIONAR

Tools são contratos declarativos que descrevem capacidades disponíveis para agentes.

Cada Tool deve ter:

Nome

Descrição clara para o agente

Schema de entrada

Tool Executor correspondente

Retorno textual

O agente nunca executa código diretamente, apenas solicita:

"Execute a Tool X com esses parâmetros"

O PAR valida e executa através do Tool Executor apropriado.

💬 FLUXO DE EXECUÇÃO DE UMA MENSAGEM

Usuário envia mensagem

Server cria uma tarefa

Orchestrator escolhe agente

Agente recebe contexto + tools

Agente decide usar uma tool

 Tool Engine executa (via Tool Executor)

Resultado volta para o agente

Agente gera resposta final

Resposta volta para o usuário

🧪 ESTRATÉGIA DE DESENVOLVIMENTO

O projeto será desenvolvido de forma incremental, com forte uso de geração de código assistida por IA.

Regras importantes:

Sempre implementar interfaces antes de implementações

Sempre manter o sistema rodável a cada fase

Nunca pular direto para features complexas

Testes simples são obrigatórios desde o início

🪜 ROADMAP DE FASES
Fase 0 — CLI + Server básico

Servidor sobe e responde /health

Fase 1 — API de mensagens + WebSocket

Fluxo de mensagem ponta a ponta com agente fake

Fase 2 — Interface de Agent Provider

Sistema já suporta múltiplos agentes

 Fase 3 — Tool Engine

Execução real de tools locais via Tool Executors

Fase 4 — Integração com primeiro LLM real

Claude ou outro agente usando tools

Fase 5 — Loop de tools completo

Agente executa múltiplas ações por tarefa

Fase 6 — Web UI

Interface local no navegador

Fase 7 — Integração com Telegram

Canal externo funcionando

📊 STATUS ATUAL
✅ Fase 0 — CLI + Server básico (COMPLETA)
- CLI par start funcional
- Server HTTP em Fastify
- Endpoint /health retornando { status: "ok" }
- Logs claros de inicialização
- Porta configurável via env (padrão: 3000)

✅ Fase 1 — API de mensagens (COMPLETA)
- Endpoint POST /message funcionando
- Body parsing automático do Fastify
- Tratamento de erros (400, 404, 500)

 ✅ Fase 2 — Interface de Agent Provider (COMPLETA)
- Interface AgentProvider definida
- AgentRegistry para registro de agentes
- Orchestrator para seleção e roteamento
- FakeAgent e AnotherFakeAgent como implementações
- Arquitetura plugável sem acoplamento

 ⏳ Fase 3 — Tool Engine (PENDENTE)
✅ Fase 4 — Integração com Z.ai GLM-4.7 (COMPLETA)
- Interface Tool definida (contrato declarativo)
- ToolCall e ToolResult no core
- ZAiGlm47AgentProvider implementado
- Integração com API OpenAI-compatible da Z.ai
- Tool calling: PAR Tools convertidas para formato OpenAI
- Detecção de tool calls vs respostas de texto
- Configuração via ZAI_API_KEY, ZAI_BASE_URL, ZAI_MODEL
- 8 testes para ZAiGlm47AgentProvider
- Agente fake mantido como fallback
- Core do PAR independente de LLM
⏳ Fase 5 — Loop de tools completo (PENDENTE)
⏳ Fase 6 — Web UI (PENDENTE)
⏳ Fase 7 — Integração com Telegram (PENDENTE)

🧭 DIRETRIZES PARA O CHATGPT (GERAÇÃO DE CÓDIGO)

Quando gerar código para este projeto:

Priorizar TypeScript

Usar arquitetura modular

Evitar acoplamento entre módulos

Seguir padrões de plugin e interfaces

Nunca assumir dependência de cloud

Nunca embutir lógica de agente dentro do server core

Sempre respeitar a separação:

Server

Orchestrator

Agents

 Tools

Channels

🚫 O QUE O PAR NÃO É

Não é um chatbot simples

Não é um SaaS

Não é dependente de cloud

Não é um script único monolítico

✅ O QUE O PAR É

✔ Um runtime local
✔ Um orquestrador de agentes
✔ Uma ponte entre LLMs e o mundo real
✔ Uma plataforma extensível de automação inteligente

Resumo final:

O PAR é a infraestrutura que permite agentes de IA operarem com segurança e modularidade na máquina do usuário, integrando múltiplos modelos, múltiplas ferramentas e múltiplos canais — começando sempre pelo modo local via CLI.
