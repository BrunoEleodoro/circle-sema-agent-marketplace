import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import {
  createPublicClient,
  hashMessage,
  http,
  isAddress,
  verifyMessage,
  type Hex,
  type PublicClient,
} from 'viem';
import { base } from 'viem/chains';
import { nowMs, sessionSecret } from './config';
import type { MarketplaceDb } from './db';
import { upsertAgent } from './db';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const EIP1271_MAGIC_VALUE = '0x1626ba7e';
const eip1271Abi = [
  {
    name: 'isValidSignature',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'hash', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [{ name: 'magicValue', type: 'bytes4' }],
  },
] as const;

export interface AuthChallenge {
  id: string;
  walletAddress: string;
  chain: string;
  nonce: string;
  message: string;
  expiresAt: number;
}

export interface Session {
  token: string;
  tokenHash: string;
  walletAddress: string;
  expiresAt: number;
}

export interface AuthedRequest extends Request {
  walletAddress?: string;
}

function normalizeWallet(address: string): string {
  if (!isAddress(address)) {
    throw new Error('walletAddress must be a valid EVM address.');
  }
  return address.toLowerCase();
}

function hashToken(token: string): string {
  return createHash('sha256').update(`${sessionSecret()}:${token}`).digest('hex');
}

function authMessage(walletAddress: string, chain: string, nonce: string): string {
  return [
    'Circle Sema Agent Marketplace',
    '',
    'Sign this message to authenticate your agent wallet.',
    '',
    `Wallet: ${walletAddress}`,
    `Chain: ${chain}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}

export function createAuthChallenge(db: MarketplaceDb, walletAddress: string, chain = 'BASE'): AuthChallenge {
  const wallet = normalizeWallet(walletAddress);
  const nonce = randomBytes(24).toString('hex');
  const id = randomUUID();
  const message = authMessage(wallet, chain, nonce);
  const createdAt = nowMs();
  const expiresAt = createdAt + CHALLENGE_TTL_MS;

  db.prepare(`
    INSERT INTO auth_nonces (id, wallet_address, chain, nonce, message, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, wallet, chain, nonce, message, expiresAt, createdAt);

  return { id, walletAddress: wallet, chain, nonce, message, expiresAt };
}

export function createBaseClient(): PublicClient {
  return createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL),
  });
}

export async function verifyWalletSignature(
  walletAddress: string,
  message: string,
  signature: string,
  publicClient = createBaseClient(),
): Promise<boolean> {
  const wallet = normalizeWallet(walletAddress);
  const hexSignature = signature as Hex;
  const eoaVerified = await verifyMessage({
    address: wallet as Hex,
    message,
    signature: hexSignature,
  });
  if (eoaVerified) return true;

  try {
    const magicValue = await publicClient.readContract({
      address: wallet as Hex,
      abi: eip1271Abi,
      functionName: 'isValidSignature',
      args: [hashMessage(message), hexSignature],
    });
    return String(magicValue).toLowerCase() === EIP1271_MAGIC_VALUE;
  } catch {
    return false;
  }
}

export async function verifyAuthChallenge(
  db: MarketplaceDb,
  input: { challengeId: string; walletAddress: string; signature: string; displayName?: string },
): Promise<Session> {
  const wallet = normalizeWallet(input.walletAddress);
  const row = db
    .prepare('SELECT * FROM auth_nonces WHERE id = ? AND wallet_address = ?')
    .get(input.challengeId, wallet) as
    | { id: string; wallet_address: string; chain: string; message: string; expires_at: number; consumed_at: number | null }
    | undefined;

  if (!row) throw new Error('Auth challenge not found.');
  if (row.consumed_at) throw new Error('Auth challenge was already used.');
  if (row.expires_at < nowMs()) throw new Error('Auth challenge expired.');

  const verified = await verifyWalletSignature(wallet, row.message, input.signature);
  if (!verified) throw new Error('Wallet signature could not be verified.');

  upsertAgent(db, wallet, row.chain, input.displayName);
  db.prepare('UPDATE auth_nonces SET consumed_at = ? WHERE id = ?').run(nowMs(), row.id);
  return createSession(db, wallet);
}

export function createSession(db: MarketplaceDb, walletAddress: string): Session {
  const wallet = normalizeWallet(walletAddress);
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const createdAt = nowMs();
  const expiresAt = createdAt + SESSION_TTL_MS;

  db.prepare('INSERT INTO sessions (token_hash, wallet_address, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    tokenHash,
    wallet,
    expiresAt,
    createdAt,
  );

  return { token, tokenHash, walletAddress: wallet, expiresAt };
}

export function walletForToken(db: MarketplaceDb, token: string): string | null {
  const row = db
    .prepare('SELECT wallet_address, expires_at FROM sessions WHERE token_hash = ?')
    .get(hashToken(token)) as { wallet_address: string; expires_at: number } | undefined;
  if (!row || row.expires_at < nowMs()) return null;
  return row.wallet_address;
}

export function requireAuth(db: MarketplaceDb) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Missing bearer token.' });
      return;
    }
    const wallet = walletForToken(db, token);
    if (!wallet) {
      res.status(401).json({ error: 'Invalid or expired bearer token.' });
      return;
    }
    req.walletAddress = wallet;
    next();
  };
}

