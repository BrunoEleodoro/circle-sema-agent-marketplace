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
import { toolLine } from './theme';

function log(line: string): void {
  console.log(toolLine(line));
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

export function buildTools() {
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
      log(`circle_list_wallets`);
      try {
        const result = await circle.listWallets();
        log(`circle_list_wallets ← ${result.length} wallet(s)`);
        return ok(result);
      } catch (e) {
        log(`circle_list_wallets ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'circle_list_wallets',
      description: `List existing Circle agent wallets on Base. Returns an array of { address }.`,
      schema: z.object({}),
    },
  );

  const createAgentWallet = tool(
    async () => {
      log(`circle_create_wallet`);
      try {
        const result = await circle.createWallet();
        log(`circle_create_wallet ← ${result.address}`);
        return ok(result);
      } catch (e) {
        log(`circle_create_wallet ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'circle_create_wallet',
      description: `Create a new Circle agent wallet on Base. Returns { address }.`,
      schema: z.object({}),
    },
  );

  const getWalletBalance = tool(
    async ({ address }) => {
      log(`circle_get_balance address=${address}`);
      try {
        const result = await circle.getBalance({ address });
        const usdc = result.tokens.find((t) => t.symbol?.toUpperCase() === 'USDC');
        log(`circle_get_balance ← USDC=${usdc?.amount ?? '0'} (${result.tokens.length} token(s))`);
        return ok(result);
      } catch (e) {
        log(`circle_get_balance ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'circle_get_balance',
      description: `Check USDC and token balances for a wallet address on Base.`,
      schema: z.object({
        address: z.string().describe('EVM wallet address (0x...).'),
      }),
    },
  );

  const deployWalletTool = tool(
    async ({ address }) => {
      log(`circle_deploy_wallet address=${address}`);
      try {
        const result = await circle.deployWallet({ address });
        if (result.alreadyDeployed) {
          log(`circle_deploy_wallet ← already deployed`);
        } else if (result.deployed) {
          log(`circle_deploy_wallet ← deployed tx=${result.txId ?? 'n/a'}`);
        } else {
          log(`circle_deploy_wallet ← submitted, on-chain confirmation pending tx=${result.txId ?? 'n/a'}`);
        }
        return ok(result);
      } catch (e) {
        log(`circle_deploy_wallet ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'circle_deploy_wallet',
      description:
        `Deploy a Base agent wallet's Smart Contract Account on-chain via a one-time, ` +
        'zero-value self-transfer. A freshly created wallet is counterfactual: it can receive ' +
        'USDC but cannot sign x402 payments until deployed. Idempotent and gas-abstracted ' +
        '(spends nothing), and safe to call on an already-deployed wallet, where it sends no ' +
        'transaction. Call this before circle_pay_service for any wallet that has never sent a transaction.',
      schema: z.object({
        address: z.string().describe('Agent wallet address to deploy (0x...).'),
      }),
    },
  );

  const searchServices = tool(
    async ({ keyword }) => {
      log(`circle_search_services keyword="${keyword}"`);
      try {
        const result = await circle.searchServices({ keyword });
        log(`circle_search_services ← ${result.length} hit(s)`);
        return ok(result);
      } catch (e) {
        log(`circle_search_services ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'circle_search_services',
      description:
        'Discover x402-compatible services on the Circle Agent Marketplace matching a keyword.',
      schema: z.object({
        keyword: z.string().describe('Search keyword, e.g. "weather", "image", "geocode".'),
      }),
    },
  );

  const inspectService = tool(
    async ({ url }) => {
      log(`circle_inspect_service url=${url}`);
      try {
        const result = await circle.inspectService({ url });
        log(`circle_inspect_service ← ${preview(JSON.stringify(result))}`);
        return ok(result);
      } catch (e) {
        log(`circle_inspect_service ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'circle_inspect_service',
      description:
        'Inspect an x402 service. Returns pricing, input schema, HTTP method, and health. Always ' +
        'call this before circle_pay_service so both the payload matches the schema and the ' +
        "`method` is passed through (a GET service's input goes in the query string, not a body).",
      schema: z.object({
        url: z.string().describe('The service URL returned by circle_search_services.'),
      }),
    },
  );

  const fetchServiceTool = tool(
    async ({ url }) => {
      log(`fetch_service url=${url}`);
      try {
        const result = await circle.fetchService({ url });
        if (result.paymentRequired) {
          log(`fetch_service ← HTTP 402, payment required`);
        } else {
          log(`fetch_service ← HTTP ${result.status} ${result.body.length} bytes`);
        }
        return ok(result);
      } catch (e) {
        log(`fetch_service ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'fetch_service',
      description:
        'GET a service endpoint with no payment: the free-tier path. Try this FIRST ' +
        'for any endpoint a user names. A free endpoint (e.g. a catalog or index) ' +
        'returns its data directly with HTTP 200; use that body as the answer. If the ' +
        'result has paymentRequired=true (HTTP 402), the endpoint is paid: call ' +
        'circle_inspect_service then circle_pay_service instead. Free endpoints publish no x402 ' +
        'payment options, so circle_pay_service can never be used on them.',
      schema: z.object({
        url: z.string().describe('The service endpoint URL to GET.'),
      }),
    },
  );

  const payService = tool(
    async ({ url, address, dataJson, method }) => {
      const httpMethod = (method ?? 'GET').toUpperCase();
      log(
        `circle_pay_service url=${url} from=${address} method=${httpMethod} data=${preview(dataJson, 80)}`,
      );
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataJson) as Record<string, unknown>;
      } catch (e) {
        log(`circle_pay_service ✗ invalid dataJson`);
        return err(
          new Error(
            `dataJson is not valid JSON: ${(e as Error).message}. Re-check the service schema from circle_inspect_service.`,
          ),
        );
      }

      // Confirm the seller publishes a Base payment option before paying. The
      // kit pays on Base only, so a Polygon- or Solana-only service is rejected
      // here with the networks it actually offers.
      try {
        const accepts = await circle.getServiceAccepts(url, httpMethod);
        if (accepts.options.length === 0) {
          const offered = accepts.unsupportedNetworks.join(', ') || 'none';
          log(`circle_pay_service ✗ no Base pay option (seller offers: ${offered})`);
          return err(
            new Error(
              `This service offers no Base payment option, the only chain the kit supports. ` +
                `Seller networks: ${offered}.`,
            ),
          );
        }
      } catch (e) {
        log(`circle_pay_service ✗ ${(e as Error).message}`);
        return err(e);
      }

      // Pre-flight: a counterfactual (undeployed) SCA cannot sign an x402
      // payment. Catch it here with an actionable message instead of the CLI's
      // opaque "Could not sign payment authorization" failure.
      try {
        if (!(await circle.isWalletDeployed({ address }))) {
          log(`circle_pay_service ✗ wallet not deployed`);
          return err(
            new Error(
              `Wallet ${address} is not deployed on-chain yet, so it cannot sign x402 ` +
                'payments. Call circle_deploy_wallet with this address first, then retry circle_pay_service.',
            ),
          );
        }
      } catch (e) {
        // Detection is best-effort: a flaky RPC must not block a real payment.
        log(`circle_pay_service: deployment check skipped (${(e as Error).message})`);
      }

      try {
        const result = await circle.payService({ url, address, data, method: httpMethod });
        const tx = result.txHash ? ` txHash=${result.txHash}` : '';
        log(`circle_pay_service ← paid${tx} ${result.response.length} bytes`);
        return ok(result);
      } catch (e) {
        log(`circle_pay_service ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'circle_pay_service',
      description:
        'Pay for an x402 service with a Circle USDC payment on Base. The kit reads the ' +
        "service's published payment options and pays under the right scheme automatically: " +
        'vanilla x402, or Circle Gateway when the seller requires it. If the seller requires ' +
        'Gateway and the wallet has no Gateway balance, this fails with an actionable ' +
        'message: call circle_gateway_deposit for the same URL, then retry circle_pay_service. ' +
        'Pass the `method` from circle_inspect_service: a GET service reads dataJson as URL ' +
        'query parameters, a POST/PUT/PATCH service reads it as a JSON body. Sending the wrong ' +
        'one makes the server see no input and still spends USDC, so always copy the inspected method.',
      schema: z.object({
        url: z.string().describe('Service URL.'),
        address: z.string().describe('Paying agent wallet address (0x...).'),
        method: z
          .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
          .optional()
          .describe(
            "HTTP method the service expects, copied from circle_inspect_service's `method` " +
              'field. Defaults to GET if omitted.',
          ),
        dataJson: z
          .string()
          .describe(
            'JSON-encoded payload object matching the service input schema, e.g. \'{"city":"NYC"}\'. ' +
              'For a GET service these become query parameters (arrays repeat the key, e.g. ' +
              'symbols=ETH&symbols=BTC); for POST/PUT/PATCH they become the JSON request body.',
          ),
      }),
    },
  );

  const getGatewayBalance = tool(
    async ({ address }) => {
      log(`circle_get_gateway_balance address=${address}`);
      try {
        const result = await circle.gatewayBalance({ address });
        log(`circle_get_gateway_balance ← total=${result.total} USDC`);
        return ok(result);
      } catch (e) {
        log(`circle_get_gateway_balance ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'circle_get_gateway_balance',
      description:
        "Check the wallet's Base Circle Gateway balance: the off-chain batched-payment pool, " +
        'separate from the on-chain wallet balance reported by circle_get_balance.',
      schema: z.object({
        address: z.string().describe('EVM wallet address (0x...).'),
      }),
    },
  );

  const gatewayDepositTool = tool(
    async ({ url, address, amount, method }) => {
      const httpMethod = (method ?? 'GET').toUpperCase();
      log(`circle_gateway_deposit url=${url} address=${address} amount=${amount}`);
      // Only deposit when the seller actually requires a Gateway payment; for a
      // vanilla-x402 seller a deposit would not help.
      try {
        const accepts = await circle.getServiceAccepts(url, httpMethod);
        if (!circle.sellerRequiresGateway(accepts)) {
          log(`circle_gateway_deposit ✗ seller offers no Base Gateway option`);
          return err(
            new Error(
              `${url} does not require a Base Gateway payment, so a Gateway deposit would not ` +
                'help. Pay it with circle_pay_service directly.',
            ),
          );
        }
      } catch (e) {
        log(`circle_gateway_deposit ✗ ${(e as Error).message}`);
        return err(e);
      }

      try {
        const result = await circle.gatewayDeposit({ address, amount });
        log(`circle_gateway_deposit ← ${result.amount} USDC tx=${result.txId ?? 'n/a'}`);
        return ok(result);
      } catch (e) {
        log(`circle_gateway_deposit ✗ ${(e as Error).message}`);
        return err(e);
      }
    },
    {
      name: 'circle_gateway_deposit',
      description:
        "Fund the wallet's Base Circle Gateway balance so it can pay a seller that requires " +
        'Gateway (batched) x402 payments. Pass the service URL; the kit confirms the seller ' +
        'requires Gateway, then makes a direct Base deposit (slower, 13-19 min, and it ' +
        'consumes gas on Base). Spends USDC (the deposit amount plus fee) and pauses for ' +
        'human approval. After it succeeds, retry circle_pay_service for the same URL.',
      schema: z.object({
        url: z.string().describe('The service URL this deposit is for.'),
        address: z.string().describe('Agent wallet address to deposit from (0x...).'),
        method: z
          .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
          .optional()
          .describe(
            "HTTP method the service expects, copied from circle_inspect_service's `method` " +
              'field. Needed so the seller\'s Gateway requirement is read with the right ' +
              'method (a POST-only endpoint answers 405 to a GET probe). Defaults to GET.',
          ),
        amount: z
          .number()
          .positive()
          .describe(
            'USDC amount to move into Gateway. Size it to cover the expected paid calls ' +
              'plus the ~$0.03 fee; a Gateway minimum deposit may apply.',
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
    getGatewayBalance,
    deployWalletTool,
    searchServices,
    inspectService,
    fetchServiceTool,
    payService,
    gatewayDepositTool,
  ];
}
