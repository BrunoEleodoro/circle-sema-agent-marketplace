import { HumanMessage } from '@langchain/core/messages';

import { buildAgent } from './agent';
import { loadConfig } from './config';
import { SETUP_SKILL_URL } from './skill';

function log(line: string): void {
  console.log(`[langchain-kit] ${line}`);
}

async function main(): Promise<void> {
  log('Autonomous Payment Agent demo starting');
  const config = loadConfig();
  log(`chain=${config.chain} provider=${config.provider} model=${config.model}`);

  const agent = buildAgent(config);

  // Brief's AGENT BOOTSTRAP PROMPT, verbatim. setup.md drives the rest.
  const userPrompt =
    `Run curl -sL ${SETUP_SKILL_URL}, ` +
    'and use the returned setup instructions to set up my agent wallet.';

  log('invoking agent ...');
  const result = await agent.invoke({
    messages: [new HumanMessage(userPrompt)],
  });

  const messages = (result as { messages?: Array<{ content: unknown }> }).messages ?? [];
  const last = messages[messages.length - 1];
  const finalContent =
    typeof last?.content === 'string' ? last.content : JSON.stringify(last?.content, null, 2);

  console.log('\n--- agent final message ---\n');
  console.log(finalContent ?? '(no final message)');
  console.log('\n---------------------------\n');
  log('done.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[langchain-kit] FATAL: ${message}`);
  process.exit(1);
});
