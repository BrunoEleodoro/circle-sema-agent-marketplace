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

const CHAIN = (process.env['CIRCLE_CHAIN'] ?? 'BASE') as Chain;

export const fetchSkill = createTool({
  id: 'fetch_skill',
  description:
    'Fetch a Circle Agent Skill markdown document from a URL to read its setup instructions.',
  inputSchema: z.object({
    url: z.string().describe('The HTTPS URL of the skill to fetch'),
  }),
  execute: async (input) => {
    const res = await fetch(input.url);
    if (!res.ok) {
      throw new Error(
        `Failed to fetch skill from ${input.url}: ${res.status} ${res.statusText}`,
      );
    }
    return res.text();
  },
});

export const circleCreateWallet = createTool({
  id: 'circle_create_wallet',
  description: 'Create a new agent-controlled wallet on BASE via the Circle CLI.',
  inputSchema: z.object({}),
  execute: async () => createWallet({ chain: CHAIN }),
});

export const circleListWallets = createTool({
  id: 'circle_list_wallets',
  description: 'List existing agent wallets on BASE.',
  inputSchema: z.object({}),
  execute: async () => listWallets({ chain: CHAIN }),
});

export const circleGetBalance = createTool({
  id: 'circle_get_balance',
  description: 'Check USDC and token balances for an agent wallet on BASE.',
  inputSchema: z.object({
    address: z.string().describe('The wallet address to check'),
  }),
  execute: async (input) => getBalance({ address: input.address, chain: CHAIN }),
});

export const circleWalletFund = createTool({
  id: 'circle_wallet_fund',
  description:
    'Fund an agent wallet with testnet USDC using the Circle faucet (BASE only).',
  inputSchema: z.object({
    address: z.string().describe('The wallet address to fund'),
  }),
  execute: async (input) => {
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
    return out;
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
    let url = input.url;
    const method = input.method ?? 'GET';
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
    return text;
  },
});

export const circleSearchServices = createTool({
  id: 'circle_search_services',
  description: 'Discover x402-compatible services on the Circle Agent Marketplace.',
  inputSchema: z.object({
    keyword: z.string().describe('Search keyword for service discovery'),
  }),
  execute: async (input) => searchServices({ keyword: input.keyword }),
});

export const circleInspectService = createTool({
  id: 'circle_inspect_service',
  description: 'Inspect a service URL for pricing, schema, and health.',
  inputSchema: z.object({
    url: z.string().describe('The service URL to inspect'),
  }),
  execute: async (input) => inspectService({ url: input.url }),
});

export const circlePayService = createTool({
  id: 'circle_pay_service',
  description: 'Pay for a service via x402 USDC nanopayment.',
  inputSchema: z.object({
    url: z.string().describe('The service URL to pay'),
    address: z.string().describe('The wallet address to pay from'),
    data: z.record(z.string(), z.unknown()).describe('JSON payload to send to the service'),
  }),
  execute: async (input) =>
    payService({
      url: input.url,
      address: input.address,
      chain: CHAIN,
      data: input.data,
    }),
});
