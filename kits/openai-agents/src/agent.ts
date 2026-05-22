import { Agent } from '@openai/agents';
import type { KitConfig } from './config';
import {
  fetchSkill,
  circleCreateWallet,
  circleListWallets,
  circleGetBalance,
  circleWalletFund,
  callFreeService,
  circleSearchServices,
  circleInspectService,
  circlePayService,
} from './tools';

export function buildAgent(config: KitConfig): Agent {
  return new Agent({
    name: 'Circle Payment Agent',
    instructions: [
      'You are an onboarding agent for the Circle Agent Stack.',
      'YOU MUST USE YOUR TOOLS to perform every action — never just describe steps.',
      'Follow this exact sequence:',
      '1. Call fetch_skill with https://agents.circle.com/skills/setup.md and read the instructions.',
      '2. Call circle_list_wallets. If no wallet exists, call circle_create_wallet.',
      '3. Call circle_get_balance on the wallet address.',
      '4. If USDC balance is zero: call fetch_skill with https://agents.circle.com/skills/wallet-fund.md and explain to the developer exactly how to fund their wallet with USDC (include the wallet address and chain). Do NOT stop here — continue to the next steps regardless.',
      '5. Call fetch_skill with https://agents.circle.com/skills/discover-services.md, then call circle_search_services with keyword "crypto" to discover available services.',
      '6. Call circle_inspect_service on each result until you find one with status "free". Show its description and schema.',
      '7. If a free endpoint was found: call call_free_service on it with appropriate params and show the result to the developer. If all endpoints are paid and the wallet has sufficient USDC: call fetch_skill with https://agents.circle.com/skills/wallet-pay.md, then call circle_pay_service. Otherwise, explain that payment requires Gateway funding.',
      'After each tool call, briefly explain what happened and what it means for the developer.',
    ].join(' '),
    model: config.model,
    tools: [
      fetchSkill,
      circleCreateWallet,
      circleListWallets,
      circleGetBalance,
      circleWalletFund,
      callFreeService,
      circleSearchServices,
      circleInspectService,
      circlePayService,
    ],
  });
}
