import { tool } from '@openai/agents';
import { z } from 'zod';
import {
  createWallet,
  listWallets,
  getBalance,
  searchServices,
  inspectService,
  payService,
  runCircle,
} from '@circle-agent-stack-examples/circle-tools';
import type { Chain } from '@circle-agent-stack-examples/circle-tools';

import { toolLine } from './theme';

const CHAIN = (process.env['CIRCLE_CHAIN'] ?? 'BASE') as Chain;

function log(line: string): void {
  console.log(toolLine(line));
}

function preview(value: string, max = 120): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

export const fetchSkill = tool({
  name: 'fetch_skill',
  description:
    'Fetch a Circle Agent Skill markdown document from a URL to read its setup instructions.',
  parameters: z.object({
    url: z.string().describe('The HTTPS URL of the skill to fetch'),
  }),
  execute: async ({ url }) => {
    log(`fetch_skill url=${url}`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch skill from ${url}: ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      log(`fetch_skill ← ${text.length} bytes`);
      return text;
    } catch (e) {
      log(`fetch_skill ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleCreateWallet = tool({
  name: 'circle_create_wallet',
  description: 'Create a new agent-controlled wallet on BASE via the Circle CLI.',
  parameters: z.object({}),
  execute: async () => {
    log(`circle_create_wallet`);
    try {
      const result = await createWallet({ chain: CHAIN });
      log(`circle_create_wallet ← ${(result as { address: string }).address}`);
      return JSON.stringify(result);
    } catch (e) {
      log(`circle_create_wallet ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleListWallets = tool({
  name: 'circle_list_wallets',
  description: 'List existing agent wallets on BASE.',
  parameters: z.object({}),
  execute: async () => {
    log(`circle_list_wallets`);
    try {
      const result = await listWallets({ chain: CHAIN });
      log(`circle_list_wallets ← ${(result as unknown[]).length} wallet(s)`);
      return JSON.stringify(result);
    } catch (e) {
      log(`circle_list_wallets ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleGetBalance = tool({
  name: 'circle_get_balance',
  description: 'Check USDC and token balances for an agent wallet on BASE.',
  parameters: z.object({
    address: z.string().describe('The wallet address to check'),
  }),
  execute: async ({ address }) => {
    log(`circle_get_balance address=${address}`);
    try {
      const result = await getBalance({ address, chain: CHAIN });
      const tokens = (result as { tokens: Array<{ symbol?: string; amount?: string }> }).tokens;
      const usdc = tokens.find((t) => t.symbol?.toUpperCase() === 'USDC');
      log(`circle_get_balance ← USDC=${usdc?.amount ?? '0'} (${tokens.length} token(s))`);
      return JSON.stringify(result);
    } catch (e) {
      log(`circle_get_balance ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleWalletFund = tool({
  name: 'circle_wallet_fund',
  description:
    'Fund an agent wallet with testnet USDC using the Circle faucet (BASE only).',
  parameters: z.object({
    address: z.string().describe('The wallet address to fund'),
  }),
  execute: async ({ address }) => {
    log(`circle_wallet_fund address=${address}`);
    try {
      const out = runCircle(['wallet', 'fund', '--address', address, '--chain', CHAIN, '--output', 'json']);
      log(`circle_wallet_fund ← done`);
      return out;
    } catch (e) {
      log(`circle_wallet_fund ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const callFreeService = tool({
  name: 'call_free_service',
  description:
    'Call a free (no-payment) service endpoint directly via HTTP. Use this when circle_inspect_service returns status "free". Supports GET and POST.',
  parameters: z.object({
    url: z.string().describe('The endpoint URL to call'),
    method: z.enum(['GET', 'POST']).default('GET').describe('HTTP method'),
    params: z.string().nullable().describe('JSON-encoded query params (GET) or request body (POST), or null if none'),
  }),
  execute: async ({ url, method = 'GET', params }) => {
    log(`call_free_service url=${url} method=${method}`);
    try {
      let finalUrl = url;
      const init: RequestInit = { method };
      const parsed: Record<string, unknown> | null = params ? JSON.parse(params) : null;

      if (method === 'GET' && parsed) {
        const qs = new URLSearchParams(
          Object.entries(parsed).map(([k, v]) => [k, String(v)] as [string, string]),
        ).toString();
        finalUrl = `${url}?${qs}`;
      } else if (method === 'POST' && parsed) {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify(parsed);
      }

      const res = await fetch(finalUrl, init);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
      log(`call_free_service ← HTTP ${res.status} ${text.length} bytes`);
      return text;
    } catch (e) {
      log(`call_free_service ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleSearchServices = tool({
  name: 'circle_search_services',
  description: 'Discover x402-compatible services on the Circle Agent Marketplace.',
  parameters: z.object({
    keyword: z.string().describe('Search keyword for service discovery'),
  }),
  execute: async ({ keyword }) => {
    log(`circle_search_services keyword="${keyword}"`);
    try {
      const result = await searchServices({ keyword });
      log(`circle_search_services ← ${(result as unknown[]).length} hit(s)`);
      return JSON.stringify(result);
    } catch (e) {
      log(`circle_search_services ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleInspectService = tool({
  name: 'circle_inspect_service',
  description: 'Inspect a service URL for pricing, schema, and health.',
  parameters: z.object({
    url: z.string().describe('The service URL to inspect'),
  }),
  execute: async ({ url }) => {
    log(`circle_inspect_service url=${url}`);
    try {
      const result = await inspectService({ url });
      log(`circle_inspect_service ← ${preview(JSON.stringify(result))}`);
      return JSON.stringify(result);
    } catch (e) {
      log(`circle_inspect_service ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circlePayService = tool({
  name: 'circle_pay_service',
  description: 'Pay for a service via x402 USDC nanopayment.',
  needsApproval: true,
  parameters: z.object({
    url: z.string().describe('The service URL to pay'),
    address: z.string().describe('The wallet address to pay from'),
    data: z.looseObject({}).describe('JSON payload to send to the service'),
  }),
  execute: async ({ url, address, data }) => {
    log(`circle_pay_service url=${url} from=${address}`);
    try {
      const result = await payService({ url, address, chain: CHAIN, data });
      const tx = (result as { txHash?: string }).txHash
        ? ` txHash=${(result as { txHash?: string }).txHash}`
        : '';
      log(`circle_pay_service ← paid${tx}`);
      return JSON.stringify(result);
    } catch (e) {
      log(`circle_pay_service ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});
