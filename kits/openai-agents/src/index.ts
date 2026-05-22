import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { run, user } from '@openai/agents';
import type { Agent, RunResult } from '@openai/agents';
import { runCircle } from '@agent-stack-ecosystem-kits/circle-tools';
import { buildAgent } from './agent';
import { loadConfig } from './config';

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\n${question}\n> `);
  rl.close();
  return answer.trim();
}

async function preflightAuth(): Promise<void> {
  let statusOut: string;
  try {
    statusOut = runCircle(['wallet', 'status']);
  } catch (err) {
    statusOut = err instanceof Error ? err.message : String(err);
  }

  if (statusOut.includes('Terms acceptance is required')) {
    const answer = await ask(
      'Circle CLI requires Terms of Use acceptance.\n' +
        'Terms: https://agents.circle.com/terms-of-use\n' +
        'Privacy: https://www.circle.com/legal/privacy-policy\n' +
        'Do you accept? [yes/no]',
    );
    if (answer.toLowerCase() !== 'yes') throw new Error('Terms not accepted — cannot continue.');
    runCircle(['terms', 'accept']);
    try { statusOut = runCircle(['wallet', 'status']); } catch (err) { statusOut = err instanceof Error ? err.message : String(err); }
  }

  if (statusOut.includes('Not logged in') || statusOut.includes('AUTH_REQUIRED')) {
    const email = await ask('Enter your Circle account email:');
    const initOut = runCircle(['wallet', 'login', email.trim(), '--init']);
    const requestId = initOut.match(/--request\s+([a-f0-9-]+)/)?.[1];
    if (!requestId) throw new Error(`Could not parse request ID:\n${initOut}`);
    const otp = await ask(`OTP sent to ${email.trim()}. Enter code:`);
    runCircle(['wallet', 'login', '--request', requestId, '--otp', otp.trim()]);
  }
}

async function main(): Promise<void> {
  console.log('[openai-agents-kit] starting Circle Agent Stack onboarding demo\n');
  const config = loadConfig();
  console.log(`[openai-agents-kit] chain=${config.chain}`);

  console.log('[openai-agents-kit] checking authentication...');
  await preflightAuth();
  console.log('[openai-agents-kit] authenticated\n');

  const agent = buildAgent();
  const prompt = 'Run curl -sL https://agents.circle.com/skills/setup.md, and use the returned setup instructions to set up my agent wallet.';
  console.log(`[openai-agents-kit] prompt: ${prompt}\n`);
  console.log('[openai-agents-kit] running agent...\n');

  let result = await run(agent, prompt);
  result = await resolveInterruptions(result, agent);
  console.log(result.finalOutput ?? '(no output)');

  console.log('\n[openai-agents-kit] continue the conversation — type "exit" to quit\n');
  while (true) {
    const input = await ask('You:');
    if (!input || input.toLowerCase() === 'exit') break;
    result = await run(agent, [...result.history, user(input)]);
    result = await resolveInterruptions(result, agent);
    console.log('\n' + (result.finalOutput ?? '(no output)') + '\n');
  }

  console.log('\n[openai-agents-kit] onboarding complete');
}

async function resolveInterruptions(
  result: RunResult<any, any>,
  agent: Agent<any, any>,
): Promise<RunResult<any, any>> {
  while (result.interruptions && result.interruptions.length > 0) {
    for (const interruption of result.interruptions) {
      const rawItem = interruption.rawItem as { name?: string; arguments?: string };
      const toolName = rawItem?.name ?? 'unknown';
      const toolArgs = (() => { try { return JSON.parse(rawItem?.arguments ?? '{}'); } catch { return {}; } })();

      console.log(`\n[approval required] ${toolName}`);
      console.log(JSON.stringify(toolArgs, null, 2));

      const answer = await ask(`Allow ${toolName}? [yes/no]`);
      if (answer.toLowerCase() === 'yes') {
        result.state.approve(interruption);
      } else {
        result.state.reject(interruption, { message: 'User declined.' });
      }
    }
    result = await run(agent, result.state);
  }
  return result;
}

main().catch((err: unknown) => {
  console.error('[openai-agents-kit] fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
