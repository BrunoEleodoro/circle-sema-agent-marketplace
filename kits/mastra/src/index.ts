import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { onboardingWorkflow } from './workflow';
import { buildAgent } from './agent';
import { loadConfig } from './config';
import { withRetry } from './retry';

const INITIAL_PROMPT =
  'Run curl -sL https://agents.circle.com/skills/setup.md, and use the returned setup instructions to set up my agent wallet.';

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\n${question}\n> `);
  rl.close();
  return answer.trim();
}

async function main(): Promise<void> {
  console.log('[mastra-kit] starting Circle Agent Stack onboarding demo\n');
  const config = loadConfig();
  console.log(`[mastra-kit] chain=${config.chain} provider=${config.provider} model=${config.model}\n`);

  const run = await onboardingWorkflow.createRun();
  let result = await run.start({ inputData: {} });

  while (result.status === 'suspended') {
    const suspendedEntry = Object.entries(result.steps).find(([, s]) => s.status === 'suspended');
    if (!suspendedEntry) break;
    const [stepId, stepResult] = suspendedEntry;
    const payload = (stepResult as any).suspendPayload as { prompt: string } | undefined;
    if (!payload?.prompt) break;
    const value = await ask(payload.prompt);
    result = await run.resume({ step: stepId, resumeData: { value } });
  }

  if (result.status !== 'success') {
    console.error(`[mastra-kit] workflow ended with status: ${result.status}`);
    return;
  }

  const summary: string =
    (result as any).result?.summary ??
    (result as any).steps?.agent?.output?.summary ??
    '(no output)';
  console.log(summary);

  console.log('\n[mastra-kit] continue the conversation — type "exit" to quit\n');
  const agent = buildAgent(config);
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: INITIAL_PROMPT },
    { role: 'assistant', content: summary },
  ];

  while (true) {
    const input = await ask('You:');
    if (!input || input.toLowerCase() === 'exit') break;
    messages.push({ role: 'user', content: input });
    const response = await withRetry(() => agent.generate(messages, { maxSteps: 30 }), 'agent');
    const text = response.text ?? '(no output)';
    console.log('\n' + text + '\n');
    messages.push({ role: 'assistant', content: text });
  }

  console.log('\n[mastra-kit] onboarding complete');
}

main().catch((err: unknown) => {
  console.error('[mastra-kit] fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
