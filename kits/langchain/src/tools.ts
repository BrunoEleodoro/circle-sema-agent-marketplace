import { tool } from '@langchain/core/tools';
import * as circle from '@agent-stack-ecosystem-kits/circle-tools';
import { z } from 'zod';

import {
  fetchSetupSkill,
  fetchSubSkill,
  SETUP_SKILL_URL,
  SUB_SKILLS,
  SUB_SKILL_NAMES,
  type SubSkillName,
} from './skill';

export interface ToolFactoryOptions {
  chain: 'BASE';
}

function log(line: string): void {
  console.log(`[tool] ${line}`);
}

function ok(value: unknown): string {
  return JSON.stringify(value);
}

function err(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  return JSON.stringify({ error: message });
}

function preview(value: string, max = 120): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

export function buildTools(opts: ToolFactoryOptions) {
  const { chain } = opts;

  const fetchSetupSkillTool = tool(
    async () => {
      log(`fetch_setup_skill → ${SETUP_SKILL_URL}`);
      try {
        const body = await fetchSetupSkill();
        log(`fetch_setup_skill ← ${body.length} bytes`);
        return body;
      } catch (e) {
        log(`fetch_setup_skill ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'fetch_setup_skill',
      description: `Fetch the Circle Agent setup skill from ${SETUP_SKILL_URL}. Equivalent to "curl -sL ${SETUP_SKILL_URL}". Returns the raw markdown setup instructions to follow.`,
      schema: z.object({}),
    },
  );

  const subSkillEnum = z.enum(SUB_SKILL_NAMES as [SubSkillName, ...SubSkillName[]]);
  const subSkillCatalog = SUB_SKILL_NAMES.map((n) => `- ${n} → ${SUB_SKILLS[n]}`).join('\n');

  const fetchSubSkillTool = tool(
    async ({ name }) => {
      log(`fetch_sub_skill name=${name}`);
      try {
        const body = await fetchSubSkill(name);
        log(`fetch_sub_skill ← ${body.length} bytes`);
        return body;
      } catch (e) {
        log(`fetch_sub_skill ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'fetch_sub_skill',
      description: `Fetch a Circle Agent sub-skill markdown by name. Call this when setup.md (or a tool error) references one of these sub-skills:\n${subSkillCatalog}`,
      schema: z.object({
        name: subSkillEnum.describe('Sub-skill name, without the .md extension.'),
      }),
    },
  );

  const listAgentWallets = tool(
    async () => {
      log(`list_agent_wallets chain=${chain}`);
      try {
        const result = await circle.listWallets({ chain });
        log(`list_agent_wallets ← ${result.length} wallet(s)`);
        return ok(result);
      } catch (e) {
        log(`list_agent_wallets ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'list_agent_wallets',
      description: `List existing Circle agent wallets on ${chain}. Returns an array of { address, chain }.`,
      schema: z.object({}),
    },
  );

  const createAgentWallet = tool(
    async () => {
      log(`create_agent_wallet chain=${chain}`);
      try {
        const result = await circle.createWallet({ chain });
        log(`create_agent_wallet ← ${result.address}`);
        return ok(result);
      } catch (e) {
        log(`create_agent_wallet ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'create_agent_wallet',
      description: `Create a new Circle agent wallet on ${chain}. Returns { address, chain }.`,
      schema: z.object({}),
    },
  );

  const getWalletBalance = tool(
    async ({ address }) => {
      log(`get_wallet_balance address=${address}`);
      try {
        const result = await circle.getBalance({ address, chain });
        const usdc = result.tokens.find((t) => t.symbol?.toUpperCase() === 'USDC');
        log(`get_wallet_balance ← USDC=${usdc?.amount ?? '0'} (${result.tokens.length} token(s))`);
        return ok(result);
      } catch (e) {
        log(`get_wallet_balance ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'get_wallet_balance',
      description: `Check USDC and token balances for a wallet address on ${chain}.`,
      schema: z.object({
        address: z.string().describe('EVM wallet address (0x...).'),
      }),
    },
  );

  const searchServices = tool(
    async ({ keyword }) => {
      log(`search_services keyword="${keyword}"`);
      try {
        const result = await circle.searchServices({ keyword });
        log(`search_services ← ${result.length} hit(s)`);
        return ok(result);
      } catch (e) {
        log(`search_services ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'search_services',
      description:
        'Discover x402-compatible services on the Circle Agent Marketplace matching a keyword.',
      schema: z.object({
        keyword: z.string().describe('Search keyword, e.g. "weather", "image", "geocode".'),
      }),
    },
  );

  const inspectService = tool(
    async ({ url }) => {
      log(`inspect_service url=${url}`);
      try {
        const result = await circle.inspectService({ url });
        log(`inspect_service ← ${preview(JSON.stringify(result))}`);
        return ok(result);
      } catch (e) {
        log(`inspect_service ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'inspect_service',
      description:
        'Inspect an x402 service. Returns pricing, input schema, and health. Always call this before pay_service so the payload matches the schema.',
      schema: z.object({
        url: z.string().describe('The service URL returned by search_services.'),
      }),
    },
  );

  const payService = tool(
    async ({ url, address, dataJson }) => {
      log(`pay_service url=${url} from=${address} data=${preview(dataJson, 80)}`);
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataJson) as Record<string, unknown>;
      } catch (e) {
        log(`pay_service ✗ invalid dataJson`);
        return err(
          new Error(
            `dataJson is not valid JSON: ${(e as Error).message}. Re-check the service schema from inspect_service.`,
          ),
        );
      }
      try {
        const result = await circle.payService({ url, address, chain, data });
        log(`pay_service ← txHash=${result.txHash}`);
        return ok(result);
      } catch (e) {
        log(`pay_service ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'pay_service',
      description: `Pay for an x402 service via a Circle USDC nanopayment on ${chain}.`,
      schema: z.object({
        url: z.string().describe('Service URL.'),
        address: z.string().describe('Paying agent wallet address (0x...).'),
        dataJson: z
          .string()
          .describe(
            'JSON-encoded payload object matching the service input schema, e.g. \'{"city":"NYC"}\'.',
          ),
      }),
    },
  );

  return [
    fetchSetupSkillTool,
    fetchSubSkillTool,
    listAgentWallets,
    createAgentWallet,
    getWalletBalance,
    searchServices,
    inspectService,
    payService,
  ];
}
