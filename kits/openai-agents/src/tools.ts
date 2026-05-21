import { createInterface } from 'node:readline/promises';
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

const CHAIN = (process.env['CIRCLE_CHAIN'] ?? 'BASE') as Chain;

export const askUser = tool({
  name: 'ask_user',
  description:
    'Ask the user a question and wait for their typed response. Use this to collect email addresses, OTP codes, confirmations, or any other input needed to proceed.',
  parameters: z.object({
    question: z.string().describe('The question or prompt to show the user'),
  }),
  execute: async ({ question }) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`\n${question}\n> `);
    rl.close();
    return answer.trim();
  },
});

export const circleWalletStatus = tool({
  name: 'circle_wallet_status',
  description:
    'Check Circle CLI authentication and Terms acceptance status. Always call this before any other Circle tool.',
  parameters: z.object({}),
  execute: async () => {
    try {
      return runCircle(['wallet', 'status']);
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  },
});

export const circleTermsAccept = tool({
  name: 'circle_terms_accept',
  description:
    'Accept Circle Terms of Use and Privacy Policy. Only call this after the user has explicitly confirmed they accept.',
  parameters: z.object({}),
  execute: async () => runCircle(['terms', 'accept']),
});

export const circleWalletLoginInit = tool({
  name: 'circle_wallet_login_init',
  description:
    'Start the Circle wallet login flow by sending an OTP to the given email. Returns the request ID needed for circle_wallet_login_complete.',
  parameters: z.object({
    email: z.string().describe('Email address to send the OTP to'),
  }),
  execute: async ({ email }) => runCircle(['wallet', 'login', email, '--init']),
});

export const circleWalletLoginComplete = tool({
  name: 'circle_wallet_login_complete',
  description:
    'Complete the Circle wallet login using the request ID from circle_wallet_login_init and the OTP provided by the user.',
  parameters: z.object({
    requestId: z.string().describe('Request ID from circle_wallet_login_init'),
    otp: z.string().describe('OTP code entered by the user'),
  }),
  execute: async ({ requestId, otp }) =>
    runCircle(['wallet', 'login', '--request', requestId, '--otp', otp]),
});

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
    return text;
  },
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
