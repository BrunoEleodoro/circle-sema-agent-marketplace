import 'dotenv/config';
import type { Chain } from '@circle-agent-stack-examples/circle-tools';

export interface KitConfig {
  chain: Chain;
  openaiApiKey: string;
}

export function loadConfig(): KitConfig {
  const chain = (process.env['CIRCLE_CHAIN'] ?? 'BASE') as Chain;
  const openaiApiKey = process.env['OPENAI_API_KEY'];

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required.');
  }

  return { chain, openaiApiKey };
}
