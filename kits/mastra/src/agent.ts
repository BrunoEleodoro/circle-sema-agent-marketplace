import { Agent } from '@mastra/core/agent';
import {
  fetchSkill,
  circleCreateWallet,
  circleListWallets,
  circleGetBalance,
  circleWalletFund,
  circleSearchServices,
  circleInspectService,
  circlePayService,
} from './tools';

export function buildAgent(): Agent {
  return new Agent({
    id: 'circle-payment-agent',
    name: 'Circle Payment Agent',
    instructions: [
      'You are an onboarding agent for the Circle Agent Stack.',
      'YOU MUST USE YOUR TOOLS to perform every action — never just describe steps.',
      'Follow this exact sequence:',
      '1. Call fetch_skill with https://agents.circle.com/skills/setup.md and read the instructions.',
      '2. Call circle_list_wallets. If no wallet exists, call fetch_skill with https://agents.circle.com/skills/wallet-login.md, then call circle_create_wallet.',
      '3. Call circle_get_balance on the wallet address.',
      '4. If USDC balance is zero: call fetch_skill with https://agents.circle.com/skills/wallet-fund.md and explain to the developer exactly how to fund their wallet with USDC on BASE (include the wallet address). Do NOT stop here — continue to the next steps regardless.',
      '5. Call fetch_skill with https://agents.circle.com/skills/discover-services.md, then call circle_search_services with keyword "perplexity" to discover available AI services.',
      '6. Call circle_inspect_service on the first result to show its pricing and schema.',
      '7. If the wallet had sufficient USDC: call fetch_skill with https://agents.circle.com/skills/wallet-pay.md, then call circle_pay_service. Otherwise, explain that payment is skipped until the wallet is funded.',
      'After each tool call, briefly explain what happened and what it means for the developer.',
    ].join(' '),
    model: 'openai/gpt-4.1',
    tools: {
      fetchSkill,
      circleCreateWallet,
      circleListWallets,
      circleGetBalance,
      circleWalletFund,
      circleSearchServices,
      circleInspectService,
      circlePayService,
    },
  });
}

