import type { AgentProvider } from '@par/core';
import type { AgentInput, AgentOutput } from '@par/core';

export class AnotherFakeAgent implements AgentProvider {
  id = 'another-fake';
  name = 'Another Fake Agent';

  async handleMessage(input: AgentInput): Promise<AgentOutput> {
    const response = `Another fake response: ${input.message.toUpperCase()}`;
    return { response };
  }
}
