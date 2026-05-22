import { createTool } from '@mastra/core/tools';
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

export const fetchSkill = createTool({
  id: 'fetch_skill',
  description:
    'Fetch a Circle Agent Skill markdown document from a URL to read its setup instructions.',
  inputSchema: z.object({
    url: z.string().describe('The HTTPS URL of the skill to fetch'),
  }),
  execute: async (input) => {
    log(`fetch_skill url=${input.url}`);
    try {
      const res = await fetch(input.url);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch skill from ${input.url}: ${res.status} ${res.statusText}`,
        );
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

export const circleCreateWallet = createTool({
  id: 'circle_create_wallet',
  description: 'Create a new agent-controlled wallet on BASE via the Circle CLI.',
  inputSchema: z.object({}),
  execute: async () => {
    log(`circle_create_wallet`);
    try {
      const result = await createWallet({ chain: CHAIN });
      log(`circle_create_wallet ← ${(result as { address: string }).address}`);
      return result;
    } catch (e) {
      log(`circle_create_wallet ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleListWallets = createTool({
  id: 'circle_list_wallets',
  description: 'List existing agent wallets on BASE.',
  inputSchema: z.object({}),
  execute: async () => {
    log(`circle_list_wallets`);
    try {
      const result = await listWallets({ chain: CHAIN });
      log(`circle_list_wallets ← ${(result as unknown[]).length} wallet(s)`);
      return result;
    } catch (e) {
      log(`circle_list_wallets ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleGetBalance = createTool({
  id: 'circle_get_balance',
  description: 'Check USDC and token balances for an agent wallet on BASE.',
  inputSchema: z.object({
    address: z.string().describe('The wallet address to check'),
  }),
  execute: async (input) => {
    log(`circle_get_balance address=${input.address}`);
    try {
      const result = await getBalance({ address: input.address, chain: CHAIN });
      const tokens = (result as { tokens: Array<{ symbol?: string; amount?: string }> }).tokens;
      const usdc = tokens.find((t) => t.symbol?.toUpperCase() === 'USDC');
      log(`circle_get_balance ← USDC=${usdc?.amount ?? '0'} (${tokens.length} token(s))`);
      return result;
    } catch (e) {
      log(`circle_get_balance ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleWalletFund = createTool({
  id: 'circle_wallet_fund',
  description:
    'Fund an agent wallet with testnet USDC using the Circle faucet (BASE only).',
  inputSchema: z.object({
    address: z.string().describe('The wallet address to fund'),
  }),
  execute: async (input) => {
    log(`circle_wallet_fund address=${input.address}`);
    try {
      const out = runCircle([
        'wallet',
        'fund',
        '--address',
        input.address,
        '--chain',
        CHAIN,
        '--output',
        'json',
      ]);
      log(`circle_wallet_fund ← done`);
      return out;
    } catch (e) {
      log(`circle_wallet_fund ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const callFreeService = createTool({
  id: 'call_free_service',
  description:
    'Call a free (no-payment) service endpoint directly via HTTP. Use this when circle_inspect_service returns status "free". Supports GET and POST.',
  inputSchema: z.object({
    url: z.string().describe('The endpoint URL to call'),
    method: z.enum(['GET', 'POST']).default('GET').describe('HTTP method'),
    params: z.record(z.string(), z.unknown()).optional().describe('Query params (GET) or JSON body (POST)'),
  }),
  execute: async (input) => {
    const method = input.method ?? 'GET';
    log(`call_free_service url=${input.url} method=${method}`);
    try {
      let url = input.url;
      const init: RequestInit = { method };

      if (method === 'GET' && input.params) {
        const qs = new URLSearchParams(
          Object.entries(input.params).map(([k, v]) => [k, String(v)] as [string, string]),
        ).toString();
        url = `${url}?${qs}`;
      } else if (method === 'POST' && input.params) {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify(input.params);
      }

      const res = await fetch(url, init);
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

export const circleSearchServices = createTool({
  id: 'circle_search_services',
  description: 'Discover x402-compatible services on the Circle Agent Marketplace.',
  inputSchema: z.object({
    keyword: z.string().describe('Search keyword for service discovery'),
  }),
  execute: async (input) => {
    log(`circle_search_services keyword="${input.keyword}"`);
    try {
      const result = await searchServices({ keyword: input.keyword });
      log(`circle_search_services ← ${(result as unknown[]).length} hit(s)`);
      return result;
    } catch (e) {
      log(`circle_search_services ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circleInspectService = createTool({
  id: 'circle_inspect_service',
  description: 'Inspect a service URL for pricing, schema, and health.',
  inputSchema: z.object({
    url: z.string().describe('The service URL to inspect'),
  }),
  execute: async (input) => {
    log(`circle_inspect_service url=${input.url}`);
    try {
      const result = await inspectService({ url: input.url });
      log(`circle_inspect_service ← ${preview(JSON.stringify(result))}`);
      return result;
    } catch (e) {
      log(`circle_inspect_service ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});

export const circlePayService = createTool({
  id: 'circle_pay_service',
  description: 'Pay for a service via x402 USDC nanopayment.',
  inputSchema: z.object({
    url: z.string().describe('The service URL to pay'),
    address: z.string().describe('The wallet address to pay from'),
    data: z.record(z.string(), z.unknown()).describe('JSON payload to send to the service'),
  }),
  execute: async (input) => {
    log(`circle_pay_service url=${input.url} from=${input.address}`);
    try {
      const result = await payService({
        url: input.url,
        address: input.address,
        chain: CHAIN,
        data: input.data,
      });
      const tx = (result as { txHash?: string }).txHash
        ? ` txHash=${(result as { txHash?: string }).txHash}`
        : '';
      log(`circle_pay_service ← paid${tx}`);
      return result;
    } catch (e) {
      log(`circle_pay_service ✗ ${(e as Error).message}`);
      throw e;
    }
  },
});
