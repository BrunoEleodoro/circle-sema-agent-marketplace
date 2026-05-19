import 'dotenv/config';

export interface KitConfig {
  circleApiKey: string;
  chain: 'BASE';
  llmProviderKey: string;
}

export function loadConfig(): KitConfig {
  throw new Error('loadConfig not implemented yet');
}
