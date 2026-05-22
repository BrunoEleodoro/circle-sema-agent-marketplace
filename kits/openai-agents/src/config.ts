import 'dotenv/config';

export interface KitConfig {
  chain: string;
  openaiApiKey: string;
}

export function loadConfig(): KitConfig {
  const chain = process.env['CIRCLE_CHAIN'] ?? 'BASE';
  const openaiApiKey = process.env['OPENAI_API_KEY'];

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required.');
  }

  return { chain, openaiApiKey };
}
