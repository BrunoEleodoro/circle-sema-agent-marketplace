import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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
  return process.env.MARKETPLACE_SESSION_SECRET ?? 'marketplace-dev-secret';
}

export function marketplaceTreasuryWallet(): string | null {
  const raw = process.env.MARKETPLACE_TREASURY_WALLET?.trim();
  return raw ? raw.toLowerCase() : null;
}

export function marketplaceAdminToken(): string | null {
  const raw = process.env.MARKETPLACE_ADMIN_TOKEN?.trim();
  return raw || null;
}

export function marketplacePayoutChain(): 'BASE' | 'MATIC' {
  return process.env.MARKETPLACE_PAYOUT_CHAIN?.trim().toUpperCase() === 'MATIC' ? 'MATIC' : 'BASE';
}

export function nowMs(): number {
  return Date.now();
}
