# LangChain Deep Agents × Circle Agent Stack

## What it is

An Autonomous Payment Agent built with [LangChain Deep Agents](https://docs.langchain.com/oss/javascript/deepagents/overview). From a single TypeScript entry point, the agent bootstraps via the Circle Agent Skill, creates an agent wallet on BASE, checks balances, discovers an x402-compatible service on the Circle Agent Marketplace, and pays for it using a USDC nanopayment.

## Prerequisites

- Node.js 20+
- Circle CLI: `npm install -g @circle-fin/cli`
- Circle Agent Skill installed for your agent host (see [Skill install](#skill-install))
- A Circle API key and an LLM provider API key

## Quickstart

```bash
git clone <repo-url> && cd circle-agent-stack-examples
bun install
cp kits/langchain/.env.example kits/langchain/.env   # then fill in keys
bun --filter @circle-agent-stack-examples/kit-langchain demo
```

## Skill reference

The agent boots from the official setup skill:

> Run `curl -sL https://agents.circle.com/skills/setup.md`, and use the returned setup instructions to set up my agent wallet.

See https://agents.circle.com/skills/setup.md.

### Skill install

```bash
npm install -g @circle-fin/cli
circle skill install --tool claude-code   # or: cursor | codex | opencode | amp

# Universal fallback (any host):
npx skills add circlefin/skills -g
```

## Architecture

```
┌─────────────────────────────┐
│   LangChain Deep Agent      │
│   (planner + sub-agents)    │
└──────────────┬──────────────┘
               │ tool calls
               ▼
┌─────────────────────────────┐
│  @.../circle-tools          │
│  (execSync → circle CLI)    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Circle Agent Stack         │
│  wallets · services · x402  │
└─────────────────────────────┘
```

## Links

- LangChain Deep Agents: [docs](https://docs.langchain.com/oss/javascript/deepagents/overview), [GitHub](https://github.com/langchain-ai/deepagentsjs)
- [Circle Agent Stack](https://developers.circle.com/agent-stack)
- [Circle Agent Marketplace](https://agents.circle.com/services)
