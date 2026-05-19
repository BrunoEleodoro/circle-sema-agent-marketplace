export const SETUP_SKILL_URL = 'https://agents.circle.com/skills/setup.md';

/**
 * Fetches the Circle Agent setup skill markdown so the agent can bootstrap
 * itself (CLI install, login, wallet creation, balance check).
 */
export async function fetchSetupSkill(): Promise<string> {
  throw new Error(`fetchSetupSkill (${SETUP_SKILL_URL}) not implemented yet`);
}
