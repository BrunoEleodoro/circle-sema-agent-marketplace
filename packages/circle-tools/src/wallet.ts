import { runCircle, runCircleJson } from './cli';
import type { AgentWallet, Chain, TokenBalance, WalletBalance } from './types';

const DEFAULT_CHAIN: Chain = 'BASE';
const EVM_ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/;

export interface CreateWalletInput {
  chain?: Chain;
}

export interface ListWalletsInput {
  chain?: Chain;
}

export interface GetBalanceInput {
  address: string;
  chain?: Chain;
}

interface RawWallet {
  address: string;
  chain?: Chain;
  type?: string;
}

interface RawBalance {
  address?: string;
  chain?: Chain;
  tokens?: TokenBalance[];
  balances?: TokenBalance[];
}

/** Creates a new agent-controlled wallet on Base via `circle wallet create`. */
export async function createWallet(input: CreateWalletInput = {}): Promise<AgentWallet> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const out = runCircle(['wallet', 'create']);
  const trimmed = out.trim();
  let address: string | undefined;
  try {
    const parsed = JSON.parse(trimmed) as Partial<RawWallet>;
    address = parsed.address;
  } catch {
    address = trimmed.match(EVM_ADDRESS_REGEX)?.[0];
  }
  if (!address) {
    throw new Error(`circle wallet create returned no address. Raw output:\n${out}`);
  }
  return { address, chain };
}

/** `circle wallet list --chain BASE --type agent --output json` */
export async function listWallets(input: ListWalletsInput = {}): Promise<AgentWallet[]> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const raw = runCircleJson<RawWallet[] | { wallets?: RawWallet[] }>([
    'wallet',
    'list',
    '--chain',
    chain,
    '--type',
    'agent',
    '--output',
    'json',
  ]);
  const list = Array.isArray(raw) ? raw : (raw.wallets ?? []);
  return list.map((w) => ({ address: w.address, chain: w.chain ?? chain }));
}

/** `circle wallet balance --address <addr> --chain BASE --output json` */
export async function getBalance(input: GetBalanceInput): Promise<WalletBalance> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const raw = runCircleJson<RawBalance>([
    'wallet',
    'balance',
    '--address',
    input.address,
    '--chain',
    chain,
    '--output',
    'json',
  ]);
  const tokens = raw.tokens ?? raw.balances ?? [];
  return {
    address: raw.address ?? input.address,
    chain: raw.chain ?? chain,
    tokens,
  };
}
