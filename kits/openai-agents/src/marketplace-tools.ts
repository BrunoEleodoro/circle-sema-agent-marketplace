import { readdirSync, statSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { tool } from '@openai/agents';
import { chainLabel, payService, runCircle } from '@agent-stack-ecosystem-kits/circle-tools';
import { ensureDeployed, preview, selectPayChain } from '@agent-stack-ecosystem-kits/kit-core/tools';
import { z } from 'zod';
import { toolLine } from './theme';

const SEMA_HANDLES = ['Card#6848', 'AcceptSpec#b77c', 'CiteBack#69ec', 'Probe#12d8', 'Judge#efe0'];

function log(line: string): void {
  console.log(toolLine(line));
}

function marketplaceApiUrl(): string {
  const raw = process.env.MARKETPLACE_API_URL?.trim();
  if (!raw) {
    throw new Error('MARKETPLACE_API_URL is required for marketplace tools.');
  }
  return raw.replace(/\/+$/, '');
}

function endpoint(path: string): string {
  return `${marketplaceApiUrl()}/${path.replace(/^\/+/, '')}`;
}

async function readJsonResponse(res: Response): Promise<unknown> {
  const raw = await res.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function apiRequest(
  toolName: string,
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
  token?: string,
): Promise<unknown> {
  const url = endpoint(path);
  log(`${toolName} → ${method} ${url}`);
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(`Could not reach ${url}: ${(e as Error).message}`);
  }

  const payload = await readJsonResponse(res);
  log(`${toolName} ← HTTP ${res.status}`);
  if (!res.ok) {
    throw new Error(`${toolName} failed with HTTP ${res.status}: ${preview(JSON.stringify(payload), 240)}`);
  }
  return payload;
}

function signChallenge(address: string, chain: string, message: string): string {
  return runCircle([
    'wallet',
    'sign',
    'message',
    message,
    '--address',
    address,
    '--chain',
    chain,
    '--quiet',
  ]).trim();
}

const listingTypeEnum = z.enum([
  'data_pack',
  'warm_intro',
  'message_relay',
  'sponsored_distribution',
  'community_query',
  'expert_answer',
  'proof_service',
  'local_check',
]);

const deliveryModeEnum = z.enum(['markdown', 'json', 'csv', 'zip', 'intro_service', 'relay', 'text']);
const deliverableKindEnum = z.enum(['text', 'file', 'repository', 'dataset', 'link']);
const riskEnum = z.enum(['low', 'medium', 'high']);

export const marketAuthTool = tool({
  name: 'market_auth',
  description:
    'Authenticate this agent with the marketplace using its Circle wallet. The tool gets a nonce, signs it with circle wallet sign message, then verifies it.',
  parameters: z.object({
    address: z.string().describe('Circle agent wallet address (0x...).'),
    chain: z.string().optional().describe('Circle chain name. Defaults to BASE.'),
    displayName: z.string().optional().describe('Optional marketplace display name.'),
  }),
  execute: async ({ address, chain, displayName }) => {
    const authChain = chain ?? 'BASE';
    const challenge = (await apiRequest('market_auth', 'POST', '/api/auth/challenge', {
      walletAddress: address,
      chain: authChain,
    })) as { id: string; message: string };
    const signature = signChallenge(address, authChain, challenge.message);
    const session = await apiRequest('market_auth', 'POST', '/api/auth/verify', {
      challengeId: challenge.id,
      walletAddress: address,
      signature,
      displayName,
    });
    return JSON.stringify(session);
  },
});

export const scanLocalValueTool = tool({
  name: 'scan_local_value',
  description:
    'Locally scan an approved folder at a shallow level and return safe marketplace listing drafts. This does not upload or publish anything.',
  parameters: z.object({
    path: z.string().describe('Approved local file or directory path.'),
  }),
  execute: async ({ path }) => {
    const target = resolve(path);
    const stat = statSync(target);
    const entries = stat.isDirectory() ? readdirSync(target).slice(0, 80) : [basename(target)];
    const interesting = entries.filter((entry) => {
      const ext = extname(entry).toLowerCase();
      return ['.md', '.txt', '.csv', '.json', '.ts', '.tsx', '.py'].includes(ext);
    });

    const drafts = interesting.slice(0, 10).map((entry) => ({
      title: `${basename(entry, extname(entry))} knowledge pack`,
      listingType: 'data_pack',
      buyerDescription: `Derived, user-reviewed summary from ${entry}.`,
      suggestedPriceUsd: 1,
      deliveryMode: 'markdown',
      riskLevel: 'low',
      proofSummary: `Found approved local artifact ${entry}. Contents were not uploaded.`,
      consentRequired: false,
      disclosureRequired: false,
      semaHandles: SEMA_HANDLES,
    }));

    return JSON.stringify({ path: target, drafts });
  },
});

export const publishListingTool = tool({
  name: 'publish_listing',
  description: 'Publish an approved listing draft to the marketplace. Requires a marketplace bearer token from market_auth.',
  parameters: z.object({
    authToken: z.string().describe('Marketplace bearer token returned by market_auth.'),
    sellerWallet: z.string().describe('Seller Circle agent wallet address. Must match the authenticated wallet.'),
    listingType: listingTypeEnum,
    title: z.string(),
    description: z.string(),
    priceUsd: z.number().positive(),
    deliveryMode: deliveryModeEnum,
    proofSummary: z.string(),
    riskLevel: riskEnum.optional(),
    policyFlagsCsv: z.string().optional().describe('Comma-separated policy flags, e.g. disclosure-required.'),
    deliverableKind: deliverableKindEnum.optional().describe('Post-checkout deliverable kind. Defaults to text.'),
    deliverablePayload: z.string().optional().describe('Optional demo deliverable payload to store behind x402.'),
    mimeType: z.string().optional().describe('Deliverable MIME type. Defaults to text/plain.'),
    filename: z.string().optional().describe('Filename when the deliverable is a file or dataset.'),
    uri: z.string().optional().describe('Post-checkout URI for a file, dataset, or link deliverable.'),
    repositoryUrl: z.string().optional().describe('Post-checkout repository URL for repository deliverables.'),
    instructions: z.string().optional().describe('Post-checkout access or usage instructions.'),
    checksum: z.string().optional().describe('Optional checksum for file or dataset deliverables.'),
  }),
  execute: async ({
    authToken,
    sellerWallet,
    listingType,
    title,
    description,
    priceUsd,
    deliveryMode,
    proofSummary,
    riskLevel,
    policyFlagsCsv,
    deliverableKind,
    deliverablePayload,
    mimeType,
    filename,
    uri,
    repositoryUrl,
    instructions,
    checksum,
  }) => {
    const policyFlags = policyFlagsCsv
      ? policyFlagsCsv.split(',').map((item) => item.trim()).filter(Boolean)
      : [];
    const deliverable = deliverablePayload
      ? {
          kind: deliverableKind ?? 'text',
          payload: deliverablePayload,
          mimeType: mimeType ?? 'text/plain',
          filename,
          uri,
          repositoryUrl,
          instructions,
          checksum,
        }
      : undefined;
    const result = await apiRequest(
      'publish_listing',
      'POST',
      '/api/listings',
      {
        sellerWallet,
        listingType,
        title,
        description,
        priceUsd,
        deliveryMode,
        proofSummary,
        riskLevel: riskLevel ?? 'low',
        policyFlags,
        semaContext: { handles: SEMA_HANDLES },
        deliverable,
      },
      authToken,
    );
    return JSON.stringify(result);
  },
});

export const searchMarketplaceTool = tool({
  name: 'search_marketplace',
  description: 'Search active marketplace listings.',
  parameters: z.object({
    query: z.string().optional().describe('Search query.'),
    limit: z.number().int().positive().max(50).optional(),
  }),
  execute: async ({ query, limit }) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (limit) params.set('limit', String(limit));
    const suffix = params.toString() ? `?${params}` : '';
    const result = await apiRequest('search_marketplace', 'GET', `/api/listings/search${suffix}`);
    return JSON.stringify(result);
  },
});

export const buyListingTool = tool({
  name: 'buy_listing',
  description:
    'Buy a marketplace listing by paying its x402 delivery endpoint. This moves USDC and must be approved by the human.',
  needsApproval: true,
  parameters: z.object({
    listingId: z.string().describe('Marketplace listing id.'),
    address: z.string().describe('Buyer Circle agent wallet address.'),
    authToken: z.string().optional().describe('Marketplace bearer token returned by market_auth. Enables review after x402 delivery.'),
  }),
  execute: async ({ listingId, address, authToken }) => {
    const url = endpoint(`/api/deliver/${listingId}`);
    const method = 'GET';
    log(`buy_listing url=${url} from=${address}`);
    const picked = await selectPayChain(url, method, log);
    if (!picked.ok) throw new Error(picked.message);
    const deployed = await ensureDeployed(address, picked.chain, log);
    if (!deployed.ok) throw new Error(deployed.message);

    const result = await payService({
      url,
      address,
      data: {},
      method,
      chain: picked.chain,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
    const tx = result.txHash ? ` txHash=${result.txHash}` : '';
    log(`buy_listing ← paid on ${chainLabel(picked.chain)}${tx}`);
    return JSON.stringify(result);
  },
});

export const reviewListingTool = tool({
  name: 'review_listing',
  description: 'Review a purchased listing. Requires marketplace bearer token from market_auth.',
  parameters: z.object({
    authToken: z.string().describe('Marketplace bearer token returned by market_auth.'),
    purchaseId: z.string().describe('Purchase id returned by the delivery receipt.'),
    score: z.number().int().min(1).max(5),
    matchesDescription: z.boolean(),
    text: z.string(),
  }),
  execute: async ({ authToken, purchaseId, score, matchesDescription, text }) => {
    const result = await apiRequest(
      'review_listing',
      'POST',
      '/api/reviews',
      { purchaseId, score, matchesDescription, text },
      authToken,
    );
    return JSON.stringify(result);
  },
});
