import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { createDeepAgent } from 'deepagents';

import type { KitConfig } from './config';
import { buildTools } from './tools';

export function buildAgent(config: KitConfig) {
  const tools = buildTools({ chain: config.chain });
  const model =
    config.provider === 'anthropic'
      ? new ChatAnthropic({ model: config.model, apiKey: config.providerApiKey })
      : new ChatOpenAI({ model: config.model, apiKey: config.providerApiKey });

  return createDeepAgent({
    model,
    tools,
  });
}
