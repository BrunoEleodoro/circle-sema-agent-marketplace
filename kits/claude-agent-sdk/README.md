# Claude Agent SDK × Circle Agent Stack

## What it is

An Autonomous Payment Agent built with the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview). From a single TypeScript entry point, the agent bootstraps via the Circle Agent Skill, creates an agent wallet on BASE, checks balances, discovers an x402-compatible service on the Circle Agent Marketplace, and pays for it using a USDC nanopayment.

## Prerequisites

- Node.js 20+
- Circle CLI: `bun add -g @circle-fin/cli`
- [Bun](https://bun.com) 1.2+
- Circle Agent Skill installed for your agent host (see [Skill install](#skill-install))
- A Circle API key and an `ANTHROPIC_API_KEY`

## Quickstart

```bash
git clone <repo-url> && cd agent-stack-ecosystem-kits
bun install
cp kits/claude-agent-sdk/.env.example kits/claude-agent-sdk/.env   # then fill in keys
bun --filter @agent-stack-ecosystem-kits/kit-claude-agent-sdk demo
```

## Skill reference

The agent boots from the official setup skill:

> Run `curl -sL https://agents.circle.com/skills/setup.md`, and use the returned setup instructions to set up my agent wallet.

See https://agents.circle.com/skills/setup.md.

### Skill install

```bash
bun add -g @circle-fin/cli
circle skill install --tool claude-code

# Universal fallback (any host):
bunx skills add circlefin/skills -g
```

## Architecture

```
┌─────────────────────────────┐
│   Claude Agent SDK loop     │
│   (tool-use + skills)       │
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

- Claude Agent SDK: [docs](https://code.claude.com/docs/en/agent-sdk/overview), [TypeScript SDK](https://github.com/anthropics/claude-agent-sdk-typescript), [demos](https://github.com/anthropics/claude-agent-sdk-demos)
- [Circle Agent Stack](https://developers.circle.com/agent-stack)
- [Circle Agent Marketplace](https://agents.circle.com/services)
