import { runCircle, runCircleJson } from './cli';
import type { GatewayBalance, GatewayDepositResult } from './types';

/** The kit operates on Base mainnet only. */
const CHAIN = 'BASE';
/** Extra attempts for idempotent read commands when the network blips. */
const READ_RETRIES = 3;
const TX_HASH_REGEX = /0x[a-fA-F0-9]{64}/;
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export interface GatewayBalanceInput {
  address: string;
}

export interface GatewayDepositInput {
  address: string;
  /** USDC amount to move into the Base Gateway balance. */
  amount: number;
}

/** Loose shape of one per-chain row in `circle gateway balance` JSON output. */
interface RawGatewayRow {
  network?: string;
  domain?: number;
  balance?: string | number;
}

/** Loose shape of the `circle gateway balance` JSON `data` object (CLI 0.0.3). */
interface RawGatewayData {
  address?: string;
  total?: string | number;
  balances?: RawGatewayRow[];
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Unwrap the `{ data: ... }` envelope the CLI puts around JSON output. */
function unwrap(raw: unknown): RawGatewayData {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  if (o.data && typeof o.data === 'object') return o.data as RawGatewayData;
  return o as RawGatewayData;
}

/**
 * Read the wallet's Base Circle Gateway balance: the off-chain, batched-payment
 * pool, separate from the on-chain wallet balance.
 *
 * `circle gateway balance --address <addr> --chain BASE --output json`
 */
export async function gatewayBalance(input: GatewayBalanceInput): Promise<GatewayBalance> {
  const raw = runCircleJson<unknown>(
    ['gateway', 'balance', '--address', input.address, '--chain', CHAIN, '--output', 'json'],
    { retries: READ_RETRIES },
  );
  const data = unwrap(raw);
  const total =
    data.total !== undefined
      ? String(data.total)
      : String((data.balances ?? []).reduce((sum, r) => sum + toNumber(r.balance), 0));
  return { address: data.address ?? input.address, total };
}

/** Pull a transaction id / hash out of `circle gateway deposit` output. */
function extractDepositId(out: string): string | undefined {
  return out.match(TX_HASH_REGEX)?.[0] ?? out.match(UUID_REGEX)?.[0];
}

/**
 * Make a direct Base Gateway deposit so the wallet can pay a seller that
 * requires a Gateway (batched) payment. The USDC is sourced from and lands on
 * Base. Slower than an on-chain transfer (13-19 min finality) and consumes gas
 * on Base.
 *
 * Mutating: `runCircle` keeps retries at 0 so a dropped connection never
 * double-deposits.
 */
export async function gatewayDeposit(input: GatewayDepositInput): Promise<GatewayDepositResult> {
  const out = runCircle([
    'gateway',
    'deposit',
    '--amount',
    String(input.amount),
    '--address',
    input.address,
    '--chain',
    CHAIN,
    '--method',
    'direct',
    '--output',
    'json',
  ]);
  return {
    amount: String(input.amount),
    txId: extractDepositId(out.trim()),
  };
}
