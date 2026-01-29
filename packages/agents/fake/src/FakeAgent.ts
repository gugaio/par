import type { AgentProvider } from '@par/core';
import type { AgentInput, AgentOutput } from '@par/core';

export class FakeAgent implements AgentProvider {
  id = 'fake';
  name = 'Fake Agent';

  async handleMessage(input: AgentInput): Promise<AgentOutput> {
    const response = `Fake response: ${input.message}`;
    return { response };
  }
}
