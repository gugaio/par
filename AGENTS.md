# AGENTS.md

This file contains guidelines for agentic coding assistants working on the PAR (Personal Agentic Runtime) project.

## Build, Lint, and Test Commands

### Build Commands
```bash
# Build all packages
npm run build

# Build specific package
npm run build -w packages/server
npm run build -w packages/cli
```

### Start Commands
```bash
# Start PAR server via root
npm start

# Start specific package directly
npm run start -w packages/server
npm run start -w packages/cli
```

### Test Commands
```bash
# Run all tests (when tests are added)
npm test

# Run specific test file (pattern-based)
npm test -- --grep "TestName"

# Run tests in specific package
npm test -w packages/server -- --grep "ServerHealth"
```

### Development Workflow
```bash
# Install dependencies
npm install

# Watch mode (when added)
npm run dev

# Type checking
tsc --noEmit
```

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Module: CommonJS
- Strict mode: enabled
- All packages extend root `tsconfig.json`

### Import Style
- Use ES module syntax: `import { x } from 'module'`
- Internal packages use workspace names: `@par/cli`, `@par/server`
- Node.js built-ins: `import http from 'http'`
- Absolute imports for local files: `import { start } from './server'`
- Order: 1) Node.js built-ins, 2) External deps, 3) Internal packages, 4) Local files

### Formatting (Manual - No Auto-formatter)
- Use 2 spaces for indentation
- No trailing whitespace
- Max line length: 100 characters
- Use single quotes for strings
- Add semicolons at end of statements

### Naming Conventions
- Files: `kebab-case.ts` (e.g., `message-handler.ts`)
- Functions: `camelCase` (e.g., `startServer()`)
- Classes: `PascalCase` (e.g., `AgentProvider`)
- Interfaces: `PascalCase` with `I` prefix (e.g., `IMessage`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PORT`)
- Private members: Prefix with underscore `_privateMethod`

### Type Safety
- Always use TypeScript strict mode
- Avoid `any` type - use `unknown` if necessary
- Explicit return types for exported functions
- Use `interface` for object shapes, `type` for unions/primitives
- Function parameters must have explicit types

### Error Handling
- Use async/await with try/catch for async operations
- Promise-based flows must handle `.catch()` at caller level
- CLI entry points must catch errors and call `process.exit(1)`
- Errors should be logged with clear messages
- Use descriptive error messages, not generic ones

### Module Structure
- Each package has: `src/`, `dist/`, `package.json`, `tsconfig.json`
- Entry point: `src/index.ts` (re-exports main exports)
- CLI entry: `src/index.ts` with shebang `#!/usr/bin/env node`
- Separate concerns: CLI doesn't contain server logic, server doesn't contain agent logic

### Environment Variables
- Use `process.env.VAR` for configuration
- Provide defaults: `const PORT = process.env.PORT || 3000`
- Document required env vars in package READMEs

### Logging
- Use `console.log()` for startup/informational messages
- Use `console.error()` for errors
- Include context in log messages (e.g., port numbers, file paths)
- Avoid logging in loops or hot code paths

### Code Organization
- Export main functionality from `index.ts`
- Keep functions focused and under 50 lines
- Use early returns to reduce nesting
- Group related functions together
- Add blank lines between logical sections

### Monorepo Guidelines
- Use workspace syntax for internal deps: `"@par/server": "*"`
- Run commands with `-w package-name` flag
- Build order matters: build dependencies first
- Each package must have `main` and `types` fields in package.json

### HTTP Server Guidelines
- Use Fastify for HTTP server
- Define routes with declarative syntax: `fastify.get('/path', handler)`
- Use Fastify's automatic JSON body parsing
- Return appropriate status codes via `reply.code(status)`
- Handle errors with Fastify's error handler or try/catch
- Use TypeScript for route handlers: `FastifyRequest<{ Body: BodyType }>, FastifyReply`

### CLI Guidelines
- Always start with shebang: `#!/usr/bin/env node`
- Make binary executable via `bin` field in package.json
- Handle errors and exit with code 1 on failure
- Provide clear startup messages
- Don't mix CLI logic with business logic

### Git Commit Guidelines
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
- Write clear, descriptive commit messages
- Reference issues when applicable

## Architecture Principles

### Separation of Concerns
- CLI: Configuration, startup, process management
- Server: HTTP handling, session management
- Orchestrator: Agent selection, coordination
- Agents: LLM interaction, tool selection
- Skill Engine: Tool execution, safety
- Channels: Protocol adapters (Telegram, Web, etc.)

### Plugin Pattern
- Agents are plugable via common interface
- Skills are plugable via registration system
- Channels are plugable adapters
- No core changes needed for new plugins

### No Cloud Dependencies
- Everything runs locally with Node.js
- Docker/K8s are deployment options, not requirements
- No mandatory cloud services

## Testing Guidelines (Future)
- Write tests for all exported functions
- Use test frameworks compatible with Node.js
- Mock external dependencies (HTTP, file system)
- Test error paths, not just happy paths
- Run single test: `npm test -- --grep "testName"`

## Performance Considerations
- Avoid blocking I/O in hot paths
- Use streams for large data
- Cache repeated computations
- Monitor memory usage

## Security Considerations
- Never log secrets or tokens
- Validate all user inputs
- Sanitize file paths
- Use environment variables for sensitive config
- Never execute user commands directly without validation
