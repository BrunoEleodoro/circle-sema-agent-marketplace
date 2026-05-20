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

const CHAIN = 'BASE' as const;

export const fetchSkill = tool({
  name: 'fetch_skill',
  description:
    'Fetch a Circle Agent Skill markdown document from a URL to read its setup instructions.',
  parameters: z.object({
    url: z.string().describe('The HTTPS URL of the skill to fetch'),
  }),
  execute: async ({ url }) => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch skill from ${url}: ${res.status} ${res.statusText}`);
    }
    return res.text();
  },
});

export const circleCreateWallet = tool({
  name: 'circle_create_wallet',
  description: 'Create a new agent-controlled wallet on BASE via the Circle CLI.',
  parameters: z.object({}),
  execute: async () => JSON.stringify(await createWallet({ chain: CHAIN })),
});

export const circleListWallets = tool({
  name: 'circle_list_wallets',
  description: 'List existing agent wallets on BASE.',
  parameters: z.object({}),
  execute: async () => JSON.stringify(await listWallets({ chain: CHAIN })),
});

export const circleGetBalance = tool({
  name: 'circle_get_balance',
  description: 'Check USDC and token balances for an agent wallet on BASE.',
  parameters: z.object({
    address: z.string().describe('The wallet address to check'),
  }),
  execute: async ({ address }) =>
    JSON.stringify(await getBalance({ address, chain: CHAIN })),
});

export const circleWalletFund = tool({
  name: 'circle_wallet_fund',
  description:
    'Fund an agent wallet with testnet USDC using the Circle faucet (BASE only).',
  parameters: z.object({
    address: z.string().describe('The wallet address to fund'),
  }),
  execute: async ({ address }) =>
    runCircle(['wallet', 'fund', '--address', address, '--chain', CHAIN, '--output', 'json']),
});

export const circleSearchServices = tool({
  name: 'circle_search_services',
  description: 'Discover x402-compatible services on the Circle Agent Marketplace.',
  parameters: z.object({
    keyword: z.string().describe('Search keyword for service discovery'),
  }),
  execute: async ({ keyword }) => JSON.stringify(await searchServices({ keyword })),
});

export const circleInspectService = tool({
  name: 'circle_inspect_service',
  description: 'Inspect a service URL for pricing, schema, and health.',
  parameters: z.object({
    url: z.string().describe('The service URL to inspect'),
  }),
  execute: async ({ url }) => JSON.stringify(await inspectService({ url })),
});

export const circlePayService = tool({
  name: 'circle_pay_service',
  description: 'Pay for a service via x402 USDC nanopayment.',
  parameters: z.object({
    url: z.string().describe('The service URL to pay'),
    address: z.string().describe('The wallet address to pay from'),
    data: z.looseObject({}).describe('JSON payload to send to the service'),
  }),
  execute: async ({ url, address, data }) =>
    JSON.stringify(await payService({ url, address, chain: CHAIN, data })),
});
