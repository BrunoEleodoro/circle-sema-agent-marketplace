import 'dotenv/config';
import { buildAgent } from './agent';
import { loadConfig } from './config';

async function main(): Promise<void> {
  console.log('[mastra-kit] starting Circle Agent Stack onboarding demo\n');

  const config = loadConfig();
  console.log(`[mastra-kit] chain=${config.chain}`);

  const agent = buildAgent();

  const prompt =
    'Run curl -sL https://agents.circle.com/skills/setup.md, and use the returned setup instructions to set up my agent wallet.';

  console.log(`[mastra-kit] prompt: ${prompt}\n`);
  console.log('[mastra-kit] running agent...\n');

  const result = await agent.generate(prompt, { maxSteps: 30 });
  console.log(result.text ?? '(no output)');
  console.log('\n[mastra-kit] onboarding complete');
}

main().catch((err: unknown) => {
  console.error('[mastra-kit] fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
