import { ChatAnthropic } from '@langchain/anthropic';
import { MemorySaver } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { createDeepAgent } from 'deepagents';

import type { KitConfig } from './config';
import { buildTools } from './tools';

/**
 * Tools the agent must NOT run without human approval. circle_pay_service and
 * circle_gateway_deposit are the two tools that move USDC, so both are gated
 * here. Read-only tools (skill fetch, wallet list/balance, gateway balance,
 * service search/inspect) and circle_deploy_wallet (a zero-value, gas-abstracted
 * SCA bootstrap that spends nothing) are intentionally absent, so the agent runs
 * them without a pause. Keyed by tool name, matching `interruptOn` below.
 */
const INTERRUPT_TOOLS = ['circle_pay_service', 'circle_gateway_deposit'] as const;

export function buildAgent(config: KitConfig) {
  const tools = buildTools();
  const model =
    config.provider === 'anthropic'
      ? new ChatAnthropic({ model: config.model, apiKey: config.providerApiKey })
      : new ChatOpenAI({ model: config.model, apiKey: config.providerApiKey });

  return createDeepAgent({
    model,
    tools,
    // Human-in-the-loop: pause before circle_pay_service instead of spending USDC.
    // interruptOn is per-tool (granular) rather than interrupting every tool
    // call. A checkpointer is required to persist agent state across the
    // pause/resume cycle; src/index.ts drives the resume loop.
    interruptOn: Object.fromEntries(INTERRUPT_TOOLS.map((name) => [name, true])),
    checkpointer: new MemorySaver(),
  });
}
