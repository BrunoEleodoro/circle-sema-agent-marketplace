import { createInterface } from 'node:readline/promises';

import { HumanMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';

import { buildAgent } from './agent';
import { ensureLoggedIn } from './auth';
import { loadConfig } from './config';
import { SETUP_SKILL_URL } from './skill';
import { bold, colorizeJson, green, heading, kitLine, red, yellow } from './theme';

function log(line: string): void {
  console.log(kitLine(line));
}

/** A tool call the agent paused on, awaiting human review. Shape is loose
 * because deepagents may nest the tool name/args under `action`. */
interface ActionRequest {
  name?: string;
  args?: Record<string, unknown>;
  action?: { name?: string; args?: Record<string, unknown> };
}

interface InterruptEnvelope {
  value?: { actionRequests?: ActionRequest[] };
}

interface AgentResult {
  messages?: Array<{ content: unknown }>;
  __interrupt__?: InterruptEnvelope[];
}

type Decision = { type: 'approve' } | { type: 'reject' };

type Agent = ReturnType<typeof buildAgent>;
type RunConfig = { configurable: { thread_id: string } };

function actionName(req: ActionRequest): string {
  return req.name ?? req.action?.name ?? 'unknown_tool';
}

function actionArgs(req: ActionRequest): Record<string, unknown> {
  return req.args ?? req.action?.args ?? {};
}

/** Prompt the user to approve or reject a single paused tool call. */
async function reviewAction(
  req: ActionRequest,
  ask: (q: string) => Promise<string>,
): Promise<Decision> {
  const name = actionName(req);
  log(yellow(`approval required for tool: ${bold(name)}`));
  console.log(colorizeJson(actionArgs(req)));

  const answer = (await ask(bold('Approve this action? [y/N] '))).trim().toLowerCase();
  const approved = answer === 'y' || answer === 'yes';
  log(approved ? green('approved by user') : red('rejected by user'));
  return { type: approved ? 'approve' : 'reject' };
}

/**
 * Invoke the agent and drive it to completion for one conversation turn.
 * The agent pauses (interruptOn: circle_pay_service) instead of spending USDC;
 * resume it with one decision per pending action until no interrupt remains.
 * Each resume reuses runConfig so the thread_id stays stable.
 */
async function runTurn(
  agent: Agent,
  input: { messages: HumanMessage[] } | Command,
  runConfig: RunConfig,
  ask: (q: string) => Promise<string>,
): Promise<AgentResult> {
  let result = (await agent.invoke(input, runConfig)) as AgentResult;

  while (result.__interrupt__ && result.__interrupt__.length > 0) {
    const requests = result.__interrupt__[0]?.value?.actionRequests ?? [];
    const pending = requests.length > 0 ? requests : [{} as ActionRequest];
    const decisions: Decision[] = [];
    for (const req of pending) {
      decisions.push(await reviewAction(req, ask));
    }
    log('resuming agent ...');
    result = (await agent.invoke(
      new Command({ resume: { decisions } }),
      runConfig,
    )) as AgentResult;
  }

  return result;
}

function printFinal(result: AgentResult): void {
  const messages = result.messages ?? [];
  const last = messages[messages.length - 1];
  // A string reply is markdown, left as-is; a structured reply is highlighted JSON.
  const finalContent =
    typeof last?.content === 'string' ? last.content : colorizeJson(last?.content);

  console.log(`\n${heading('--- agent reply ---')}\n`);
  console.log(finalContent ?? '(no reply)');
  console.log(`\n${heading('-------------------')}`);
}

async function main(): Promise<void> {
  log('Autonomous Payment Agent demo starting');
  const config = loadConfig();
  log(`chain=BASE provider=${config.provider} model=${config.model}`);

  const agent = buildAgent(config);

  // Brief's AGENT BOOTSTRAP PROMPT, verbatim. setup.md drives the first turn.
  const userPrompt =
    `Run curl -sL ${SETUP_SKILL_URL}, ` +
    'and use the returned setup instructions to set up my agent wallet.';

  // The checkpointer-backed agent needs a thread_id. The same config object is
  // reused on every resume AND on every chat turn, so conversation state held
  // by the MemorySaver checkpointer carries across the whole session.
  const runConfig: RunConfig = { configurable: { thread_id: `demo-${Date.now()}` } };

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  // `exit` typed at ANY prompt (chat input or an approval [y/N]) halts the
  // demo immediately, before the answer reaches the caller.
  const ask = async (q: string): Promise<string> => {
    const answer = await rl.question(q);
    if (answer.trim().toLowerCase() === 'exit') {
      log('exit, halting.');
      rl.close();
      process.exit(0);
    }
    return answer;
  };

  try {
    // Inline auth: make sure the CLI has a valid agent session before the agent
    // runs. Logs in with email + OTP if needed; a pending Terms gate is reported
    // as a manual step (the kit never accepts the Terms for the user).
    await ensureLoggedIn(ask, log);

    // Interactive chat loop. The first turn runs the bootstrap prompt; after
    // the agent settles, the user drives follow-up turns. Each turn shares the
    // thread_id above, so the agent keeps full context across turns. Empty
    // input or `exit` / `quit` ends the session.
    log('invoking agent ...');
    let input: { messages: HumanMessage[] } = { messages: [new HumanMessage(userPrompt)] };

    while (true) {
      const result = await runTurn(agent, input, runConfig, ask);
      printFinal(result);

      const next = (await ask(`\n${bold('You:')}\n> `)).trim();
      if (!next || next.toLowerCase() === 'quit') {
        log('done.');
        break;
      }
      input = { messages: [new HumanMessage(next)] };
    }
  } finally {
    rl.close();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  // A 529 means the LLM provider is overloaded after exhausting retries: it is
  // transient and not a kit bug, so say so plainly instead of dumping raw JSON.
  const overloaded = (err as { status?: number })?.status === 529 || message.includes('529');
  if (overloaded) {
    console.error(
      kitLine(red('FATAL: the LLM provider is overloaded (HTTP 529) and retries were exhausted.')),
    );
    console.error(kitLine(yellow('This is transient on the provider side. Re-run in a moment.')));
  } else {
    console.error(kitLine(red(`FATAL: ${message}`)));
  }
  process.exit(1);
});
