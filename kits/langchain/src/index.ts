import { buildAgent } from './agent';
import { loadConfig } from './config';
import { fetchSetupSkill, SETUP_SKILL_URL } from './skill';

async function main(): Promise<void> {
  console.log('[langchain-kit] starting Autonomous Payment Agent demo');

  const config = loadConfig();
  console.log(`[langchain-kit] chain=${config.chain}`);

  const skill = await fetchSetupSkill();
  console.log(`[langchain-kit] bootstrapped from ${SETUP_SKILL_URL} (${skill.length} bytes)`);

  const agent = buildAgent();
  void agent;
  // TODO: run agent against the Autonomous Payment Agent scenario.
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
