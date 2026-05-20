import 'dotenv/config';
import { run } from '@openai/agents';
import { buildAgent } from './agent';
import { loadConfig } from './config';

async function main(): Promise<void> {
  console.log('[openai-agents-kit] starting Circle Agent Stack onboarding demo\n');

  const config = loadConfig();
  console.log(`[openai-agents-kit] chain=${config.chain}`);

  const agent = buildAgent();

  const prompt =
    'Run curl -sL https://agents.circle.com/skills/setup.md, and use the returned setup instructions to set up my agent wallet.';

  console.log(`[openai-agents-kit] prompt: ${prompt}\n`);
  console.log('[openai-agents-kit] running agent...\n');

  const result = await run(agent, prompt);
  console.log(result.finalOutput ?? '(no output)');
  console.log('\n[openai-agents-kit] onboarding complete');
}

main().catch((err: unknown) => {
  console.error('[openai-agents-kit] fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
