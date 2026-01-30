# Como Usar o Sistema de Tracing do PAR

## Visão Geral

O PAR possui um sistema de observabilidade integrado que permite rastrear cada execução do agente, incluindo decisões, chamadas de ferramentas, erros e muito mais.

## Habilitar Tracing

### Opção 1: Via Variável de Ambiente (Recomendado)

Edite o arquivo `.env` na raiz do projeto:

```bash
ENABLE_TRACING=true
```

Ou use via linha de comando:

```bash
ENABLE_TRACING=true npm start
```

### Opção 2: Exportar Variável de Ambiente

```bash
export ENABLE_TRACING=true
npm start
```

### Opção 3: Tracing Desabilitado (Padrão)

Por padrão, o tracing está desabilitado para não impactar performance:

```bash
npm start
```

## Ver os Logs de Tracing

Quando o tracing está habilitado, cada requisição ao endpoint `/message` gera logs estruturados no console.

### Exemplo de Saída

```bash
[exec-1738230000123-abc4def][execution_start][2026-01-30T00:53:20.123Z] Starting execution {
  agentId: 'openai',
  message: 'List files in current directory',
  policy: { maxSteps: 10, maxToolCalls: 10, timeoutMs: 300000 }
}

[exec-1738230000123-abc4def][execution_step][2026-01-30T00:53:20.200Z] Step 1 {
  stepCount: 1,
  toolCallCount: 0
}

[exec-1738230000123-abc4def][agent_decision][2026-01-30T00:53:20.500Z] Agent decided: tool_call {
  agentId: 'openai',
  toolCall: {
    type: 'tool_call',
    tool: 'execute_command',
    input: { command: 'ls -la' }
  }
}

[exec-1738230000123-abc4def][tool_call][2026-01-30T00:53:20.510Z] Calling tool: execute_command {
  step: 1,
  input: { command: 'ls -la' }
}

[exec-1738230000123-abc4def][tool_result][2026-01-30T00:53:21.050Z] Tool result: execute_command {
  step: 1,
  tool: 'execute_command',
  success: true,
  durationMs: 540,
  output: 'total 120...'
}

[exec-1738230000123-abc4def][execution_step][2026-01-30T00:53:21.060Z] Step 2 {
  stepCount: 2,
  toolCallCount: 1
}

[exec-1738230000123-abc4def][agent_decision][2026-01-30T00:53:21.500Z] Agent decided: response {
  agentId: 'openai',
  response: 'Here are the files...'
}

[exec-1738230000123-abc4def][execution_end][2026-01-30T00:53:21.510Z] Execution ended: completed {
  totalSteps: 2,
  totalToolCalls: 1,
  durationMs: 1387,
  response: 'Here are the files...'
}
```

## Estrutura dos Logs

Cada log de tracing contém:

1. **Execution ID**: Identificador único da execução (formato: `exec-{timestamp}-{random}`)
2. **Event Type**: Tipo do evento (ex: `execution_start`, `tool_call`, `agent_decision`)
3. **Timestamp**: Quando o evento ocorreu (ISO 8601)
4. **Payload**: Dados específicos do evento

## Tipos de Eventos

| Evento | Quando Ocorre | Informações |
|---------|---------------|-------------|
| `execution_start` | Início da execução | agentId, message, policy |
| `execution_step` | Cada iteração do loop | step, stepCount, toolCallCount |
| `agent_decision` | Agente toma decisão | agentId, decision, response/toolCall |
| `tool_call` | Antes de executar tool | step, tool, input |
| `tool_result` | Após executar tool | step, tool, success, durationMs, output/error |
| `execution_error` | Erro fatal | reason, step, error |
| `execution_end` | Término da execução | reason, totalSteps, totalToolCalls, durationMs, response |

## Testar com Tracing

1. **Inicie o servidor com tracing:**

```bash
ENABLE_TRACING=true npm start
```

2. **Envie uma requisição em outro terminal:**

```bash
curl -X POST http://localhost:3000/message \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "List files in current directory",
    "sessionId": "test-session"
  }'
```

3. **Observe os logs de tracing no console do servidor**

## Benefícios

✅ **Debugging Fácil** - Veja exatamente o que está acontecendo em tempo real
✅ **Performance** - Desabilite tracing em produção para zero overhead
✅ **Auditoria** - Rastreie cada decisão do agente
✅ **Identificação de Erros** - Localize rapidamente onde ocorreram falhas
✅ **Análise de Fluxo** - Entenda a sequência de decisões e tool calls

## Desabilitar Tracing

Edite `.env`:

```bash
ENABLE_TRACING=false
```

Ou execute sem a variável:

```bash
npm start
```

## Notas

- Quando tracing está desabilitado, não há impacto em performance
- Tracing usa `console.log` para eventos normais e `console.error` para erros
- Outputs longos são truncados a 200 caracteres
- Execution ID é único por requisição e consistente em todos os eventos
