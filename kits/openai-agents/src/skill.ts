export const SETUP_SKILL_URL = 'https://agents.circle.com/skills/setup.md';

export async function fetchSetupSkill(): Promise<string> {
  const res = await fetch(SETUP_SKILL_URL);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch setup skill from ${SETUP_SKILL_URL}: ${res.status} ${res.statusText}`,
    );
  }
  return res.text();
}
