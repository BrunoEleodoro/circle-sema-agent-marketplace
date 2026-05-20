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
  blockchain?: Chain;
  type?: string;
}

interface RawBalance {
  address?: string;
  chain?: Chain;
  tokens?: TokenBalance[];
  balances?: TokenBalance[];
}

/** Strip a `{ data: T }` envelope if present. */
function unwrap<T>(raw: { data?: T } | T): T {
  return (raw as { data?: T }).data ?? (raw as T);
}

/** Creates a new agent-controlled wallet on Base via `circle wallet create`. */
export async function createWallet(input: CreateWalletInput = {}): Promise<AgentWallet> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const out = runCircle(['wallet', 'create', '--chain', chain]);
  const trimmed = out.trim();
  let address: string | undefined;
  try {
    const parsed = unwrap(JSON.parse(trimmed) as { data?: Partial<RawWallet> } | Partial<RawWallet>);
    // wallet create returns one wallet or an array — pick first address found
    if (Array.isArray(parsed)) {
      address = (parsed as RawWallet[]).find((w) => w.blockchain === chain || !w.blockchain)?.address;
    } else {
      address = (parsed as Partial<RawWallet>).address;
    }
  } catch {
    address = trimmed.match(EVM_ADDRESS_REGEX)?.[0];
  }
  if (!address) {
    throw new Error(`circle wallet create returned no address. Raw output:\n${out}`);
  }
  return { address, chain };
}

/** `circle wallet list --chain <chain> --type agent --output json` */
export async function listWallets(input: ListWalletsInput = {}): Promise<AgentWallet[]> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const envelope = runCircleJson<{ data?: { wallets?: RawWallet[] } } | RawWallet[] | { wallets?: RawWallet[] }>([
    'wallet',
    'list',
    '--chain',
    chain,
    '--type',
    'agent',
    '--output',
    'json',
  ]);
  const raw = unwrap(envelope as { data?: RawWallet[] | { wallets?: RawWallet[] } });
  const list: RawWallet[] = Array.isArray(raw)
    ? (raw as RawWallet[])
    : ((raw as { wallets?: RawWallet[] }).wallets ?? []);
  return list.map((w) => ({ address: w.address, chain: w.chain ?? w.blockchain ?? chain }));
}

/** `circle wallet balance --address <addr> --chain <chain> --output json` */
export async function getBalance(input: GetBalanceInput): Promise<WalletBalance> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const envelope = runCircleJson<{ data?: RawBalance } | RawBalance>([
    'wallet',
    'balance',
    '--address',
    input.address,
    '--chain',
    chain,
    '--output',
    'json',
  ]);
  const raw: RawBalance = unwrap(envelope);
  const tokens = raw.tokens ?? raw.balances ?? [];
  return {
    address: raw.address ?? input.address,
    chain: raw.chain ?? chain,
    tokens,
  };
}
