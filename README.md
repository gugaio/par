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

Expor ferramentas locais (skills) para os agentes

Permitir integração com Web UI, Telegram e outros canais

Ser modular, extensível e testável

Não depender obrigatoriamente de Kubernetes, cloud ou infraestrutura externa

Kubernetes e Docker são opcionais, não requisitos.

🎯 OBJETIVO PRINCIPAL

Criar um runtime onde:

Agentes de IA podem perceber, decidir e agir usando ferramentas reais da máquina do usuário

O PAR é como um “sistema operacional para agentes”.

🧱 PRINCÍPIOS DE ARQUITETURA

CLI-First

O PAR deve rodar com algo como:

par start


Tudo deve funcionar localmente sem necessidade de infraestrutura adicional.

Modularidade Total

Agentes são plugáveis

Skills são plugáveis

Canais (Telegram, Web, etc.) são adaptadores

Separação de Responsabilidades

Server não sabe como o agente funciona

Agente não sabe como skills são implementadas

Skills não sabem nada sobre LLMs

LLM é substituível

Claude, Gemini, OpenAI, modelos locais

Nenhum agente deve ser acoplado ao core

Tudo é extensível

Novos agentes sem mudar o core

Novas skills sem mudar o core

Novos canais sem mudar o core

Infra é opcional

Deve rodar só com Node.js

Docker e Kubernetes são apenas formas de deploy, não partes da arquitetura

🏗️ VISÃO DE ALTO NÍVEL
CLI (par start)
     ↓
PAR Server (Node.js)
     ↓
Agent Orchestrator
     ↓
Agents (Claude, Gemini, etc.)
     ↓
Skill Engine (tools locais)
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

Futuramente instalar plugins/skills

2️⃣ PAR Server

Servidor HTTP + WebSocket que:

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

5️⃣ Skill Engine

Responsável por executar ferramentas reais da máquina.

Exemplos de skills:

Ler arquivo

Escrever arquivo

Rodar comando bash

Fazer requisição HTTP

Rodar testes

Operações de git

Skills são controladas e padronizadas, nunca chamadas diretamente pelo agente.

6️⃣ Channels (Adapters)

Adaptadores de entrada/saída:

Web UI

Telegram

Futuramente WhatsApp, Slack, etc.

Eles não sabem nada sobre agentes — apenas enviam e recebem mensagens do PAR Server.

🧠 COMO OS AGENTES DEVEM FUNCIONAR

Agentes:

Não executam comandos diretamente

Não acessam sistema de arquivos diretamente

Só podem agir via tools expostas pelo Skill Engine

Eles funcionam assim:

Recebem mensagens do usuário

Recebem lista de tools disponíveis

Decidem:

Responder direto

Ou pedir execução de uma tool

Recebem resultado da tool

Continuam raciocínio

Geram resposta final

🧰 COMO AS SKILLS DEVEM FUNCIONAR

Skills são funções controladas que executam ações no mundo real.

Cada skill deve ter:

Nome

Descrição clara para o agente

Schema de entrada

Execução segura

Retorno textual

O agente nunca executa código diretamente, apenas solicita:

“Execute a skill X com esses parâmetros”

O PAR valida e executa.

💬 FLUXO DE EXECUÇÃO DE UMA MENSAGEM

Usuário envia mensagem

Server cria uma tarefa

Orchestrator escolhe agente

Agente recebe contexto + tools

Agente decide usar uma tool

Skill Engine executa

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

Fase 3 — Skill Engine

Execução real de tools locais

Fase 4 — Integração com primeiro LLM real

Claude ou outro agente usando tools

Fase 5 — Loop de tools completo

Agente executa múltiplas ações por tarefa

Fase 6 — Web UI

Interface local no navegador

Fase 7 — Integração com Telegram

Canal externo funcionando

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

Skills

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
