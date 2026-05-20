import 'dotenv/config';
import type { Chain } from '@circle-agent-stack-examples/circle-tools';

export interface KitConfig {
  circleApiKey: string;
  chain: Chain;
  openaiApiKey: string;
}

export function loadConfig(): KitConfig {
  const circleApiKey = process.env['CIRCLE_API_KEY'];
  const chain = (process.env['CIRCLE_CHAIN'] ?? 'BASE') as Chain;
  const openaiApiKey = process.env['OPENAI_API_KEY'];

  if (!circleApiKey) {
    throw new Error('CIRCLE_API_KEY is required. Get one at https://developers.circle.com');
  }
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required.');
  }

  return { circleApiKey, chain, openaiApiKey };
}
