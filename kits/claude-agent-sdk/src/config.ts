import 'dotenv/config';

export interface KitConfig {
  circleApiKey: string;
  chain: 'BASE';
  anthropicApiKey: string;
}

export function loadConfig(): KitConfig {
  throw new Error('loadConfig not implemented yet');
}
