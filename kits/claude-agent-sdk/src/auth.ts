import { CircleCliError, runCircle } from '@agent-stack-ecosystem-kits/circle-tools';

import { bold } from './theme';

/**
 * Inline Circle login for the demo's first run.
 *
 * The kit handles ONE auth step itself, email + OTP login, because the human
 * types their own email and OTP and nothing is stored by the kit. It never
 * touches the Terms of Use: per setup.md an agent must not accept the Terms on
 * a user's behalf, so a pending-Terms host is reported as an actionable manual
 * step instead of being auto-accepted.
 */

const TERMS_MESSAGE =
  'Circle Terms of Use are not accepted on this host. Per setup.md, an agent must ' +
  'never accept the Terms on your behalf, so this kit will not do it for you. Run:\n\n' +
  '  circle wallet status\n\n' +
  'yourself, review and accept the Terms of Use when prompted, then re-run the demo.';

/** Flatten a CLI error into the full text the CLI emitted, for substring checks. */
function rawText(e: unknown): string {
  if (e instanceof CircleCliError) {
    return [e.message, e.stdout, e.stderr].filter(Boolean).join('\n');
  }
  return e instanceof Error ? e.message : String(e);
}

/** `circle wallet status` exits non-zero when logged out; capture either way. */
function statusText(): string {
  try {
    return runCircle(['wallet', 'status']);
  } catch (e) {
    return rawText(e);
  }
}

/** An active session prints "Status:   VALID". */
function isLoggedIn(status: string): boolean {
  return /status:\s*valid/i.test(status);
}

/** Detect a pending Terms-of-Use gate in any CLI output. */
function termsPending(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes('terms') && (lower.includes('accept') || lower.includes('required'));
}

/**
 * Pull the login request ID out of `circle wallet login <email> --init` output.
 * Prefers a JSON field; falls back to the `--request <id>` example line the CLI
 * prints, then to a bare UUID.
 */
function parseRequestId(out: string): string | undefined {
  const trimmed = out.trim();
  try {
    const env = JSON.parse(trimmed) as Record<string, unknown> & { data?: Record<string, unknown> };
    const data = (env.data ?? env) as Record<string, unknown>;
    const id = data.requestId ?? data.request_id ?? data.id;
    if (typeof id === 'string' && id) return id;
  } catch {
    // not JSON, so fall through to text extraction
  }
  return (
    trimmed.match(/--request\s+([0-9a-f-]{8,})/i)?.[1] ??
    trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0]
  );
}

/**
 * Ensure the Circle CLI has a valid agent session before the agent runs.
 *
 * - Already logged in -> returns immediately.
 * - Terms not accepted -> throws with the manual step (never auto-accepts).
 * - Logged out -> runs the two-step email OTP login inline, prompting via `ask`.
 *
 * `ask` is the demo's terminal prompt; `log` is its namespaced logger.
 */
export async function ensureLoggedIn(
  ask: (q: string) => Promise<string>,
  log: (line: string) => void,
): Promise<void> {
  const status = statusText();
  if (isLoggedIn(status)) {
    log('Circle session valid, skipping login');
    return;
  }
  if (termsPending(status)) {
    throw new Error(TERMS_MESSAGE);
  }

  log('no active Circle session, starting email OTP login');
  const email = (await ask(`${bold('Circle account email:')}\n> `)).trim();
  if (!email) throw new Error('No email entered, cannot log in.');

  let initOut: string;
  try {
    initOut = runCircle(['wallet', 'login', email, '--type', 'agent', '--init']);
  } catch (e) {
    const text = rawText(e);
    if (termsPending(text)) throw new Error(TERMS_MESSAGE);
    throw new Error(`Login init failed: ${text}`);
  }

  // Show the CLI's own output so the user can match the anti-phishing prefix it
  // prints against the code in the OTP email before entering it.
  console.log(initOut.trim());

  const requestId = parseRequestId(initOut);
  if (!requestId) {
    throw new Error(`Could not parse a login request ID from the CLI output:\n${initOut}`);
  }

  const otp = (
    await ask(`${bold('OTP from the email (6 digits, or full e.g. B1X-123456):')}\n> `)
  ).trim();
  if (!otp) throw new Error('No OTP entered, cannot complete login.');

  try {
    runCircle(['wallet', 'login', '--request', requestId, '--otp', otp]);
  } catch (e) {
    const text = rawText(e);
    if (termsPending(text)) throw new Error(TERMS_MESSAGE);
    throw new Error(`Login failed: ${text}`);
  }

  if (!isLoggedIn(statusText())) {
    throw new Error('Login completed but no valid session was produced. Re-run the demo.');
  }
  log('logged in, Circle session valid');
}
