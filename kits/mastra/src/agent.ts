import { Agent } from '@mastra/core/agent';
import {
  askUser,
  circleWalletStatus,
  circleTermsAccept,
  circleWalletLoginInit,
  circleWalletLoginComplete,
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

export function buildAgent(): Agent {
  return new Agent({
    id: 'circle-payment-agent',
    name: 'Circle Payment Agent',
    instructions: [
      'You are an onboarding agent for the Circle Agent Stack.',
      'YOU MUST USE YOUR TOOLS to perform every action — never just describe steps.',
      'Follow this exact sequence:',
      '0. Call circle_wallet_status first. If Terms are not accepted: call ask_user presenting the Terms URL (https://agents.circle.com/terms-of-use) and Privacy Policy (https://www.circle.com/legal/privacy-policy) and ask for explicit acceptance — if they confirm, call circle_terms_accept. If not logged in: call ask_user for their email address, call circle_wallet_login_init with that email, call ask_user for the OTP code sent to their email, then call circle_wallet_login_complete.',
      '1. Call fetch_skill with https://agents.circle.com/skills/setup.md and read the instructions.',
      '2. Call circle_list_wallets. If no wallet exists, call circle_create_wallet.',
      '3. Call circle_get_balance on the wallet address.',
      '4. If USDC balance is zero: call fetch_skill with https://agents.circle.com/skills/wallet-fund.md and explain to the developer exactly how to fund their wallet with USDC (include the wallet address and chain). Do NOT stop here — continue to the next steps regardless.',
      '5. Call fetch_skill with https://agents.circle.com/skills/discover-services.md, then call circle_search_services with keyword "crypto" to discover available services.',
      '6. Call circle_inspect_service on each result until you find one with status "free". Show its description and schema.',
      '7. If a free endpoint was found: call call_free_service on it with appropriate params and show the result to the developer. If all endpoints are paid and the wallet has sufficient USDC: call fetch_skill with https://agents.circle.com/skills/wallet-pay.md, then call circle_pay_service. Otherwise, explain that payment requires Gateway funding.',
      'After each tool call, briefly explain what happened and what it means for the developer.',
    ].join(' '),
    model: 'openai/gpt-4.1',
    tools: {
      askUser,
      circleWalletStatus,
      circleTermsAccept,
      circleWalletLoginInit,
      circleWalletLoginComplete,
      fetchSkill,
      circleCreateWallet,
      circleListWallets,
      circleGetBalance,
      circleWalletFund,
      callFreeService,
      circleSearchServices,
      circleInspectService,
      circlePayService,
    },
  });
}

