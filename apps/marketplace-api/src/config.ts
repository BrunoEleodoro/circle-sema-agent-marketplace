import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DEV_SESSION_SECRET = 'marketplace-dev-secret';

export const SEMA_HANDLES = [
  'Card#6848',
  'AcceptSpec#b77c',
  'CiteBack#69ec',
  'Probe#12d8',
  'Judge#efe0',
] as const;

export const SEMA_ROOT =
  process.env.SEMA_ROOT ??
  'sema:vocab#mh:SHA-256:39ca671a4dcb3075855cb293380d1796105e2eca0de49b0537279b798b675ee6';

export function databasePath(): string {
  const raw = process.env.MARKETPLACE_DB_PATH ?? '.data/marketplace.sqlite';
  if (raw === ':memory:') return raw;
  const path = resolve(raw);
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

export function sessionSecret(): string {
  const configured = process.env.MARKETPLACE_SESSION_SECRET?.trim();
  if (configured) {
    if (process.env.NODE_ENV === 'production' && configured.length < 32) {
      throw new Error('MARKETPLACE_SESSION_SECRET must be at least 32 characters in production.');
    }
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MARKETPLACE_SESSION_SECRET must be set in production.');
  }
  return DEV_SESSION_SECRET;
}

export function marketplaceCorsOrigins(): { allowAll: boolean; origins: string[] } {
  const raw = process.env.MARKETPLACE_CORS_ORIGIN ?? process.env.MARKETPLACE_CORS_ORIGINS ?? '*';
  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0 || origins.includes('*')) return { allowAll: true, origins: [] };
  return { allowAll: false, origins };
}

export function marketplaceTreasuryWallet(): string | null {
  const raw = process.env.MARKETPLACE_TREASURY_WALLET?.trim();
  return raw ? raw.toLowerCase() : null;
}

export function marketplaceAdminToken(): string | null {
  const raw = process.env.MARKETPLACE_ADMIN_TOKEN?.trim();
  return raw || null;
}

export function marketplacePayoutChain(): 'BASE' {
  return 'BASE';
}

export function nowMs(): number {
  return Date.now();
}
