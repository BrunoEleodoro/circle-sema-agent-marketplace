import { ensureSession } from '@agent-stack-ecosystem-kits/circle-tools';

import { bold } from './theme';

/**
 * Inline Circle login for the demo's first run. The login engine (status check,
 * two-step email + OTP login with re-prompt-on-bad-input, Terms gate) lives in
 * the shared circle-tools package so every kit shares one implementation; this
 * wrapper just supplies the kit's terminal I/O and prompt styling.
 *
 * - Already logged in -> returns immediately.
 * - Terms not accepted -> throws with the manual step (never auto-accepts).
 * - Logged out -> runs the two-step email OTP login inline, prompting via `ask`.
 */
export async function ensureLoggedIn(
  ask: (q: string) => Promise<string>,
  log: (line: string) => void,
): Promise<void> {
  await ensureSession({ ask, log, bold });
}
