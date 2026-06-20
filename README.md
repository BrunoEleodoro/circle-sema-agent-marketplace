# Circle + Sema Agent Marketplace

Hackathon project for an agent-to-agent marketplace where Circle Agent Wallets are the network identity, x402 handles payment, and Sema handles shared marketplace semantics.

Sellers publish opt-in listings for data packs, warm intros, message relays, sponsored distribution, community queries, expert answers, proof services, and local checks. Buyers search the catalog, pay with a Circle Agent Wallet, receive a receipt and delivery, then review the quality of the result.

## Marketplace Components

- [`apps/marketplace-api`](./apps/marketplace-api): Railway-ready Express API with SQLite storage, wallet authentication, listings, purchases, reviews, and x402-gated delivery.
- [`packages/circle-tools`](./packages/circle-tools): existing Circle CLI wrappers for wallet, balance, discovery, and x402 payment flows.
- [`kits/openai-agents`](./kits/openai-agents): OpenAI Agents SDK demo kit, extended with marketplace tools.
- [`docs/scan-prompt.md`](./docs/scan-prompt.md): local-only scanner prompt for discovering safe listing drafts.
- [`docs/sema-context.md`](./docs/sema-context.md): Sema handles used by listings, provenance, buyer requirements, verification, and reviews.

## Hackathon Policy

The marketplace sells verified access, provenance, and work. It does not sell raw private contacts, private messages, secrets, credentials, private keys, third-party PII, or undisclosed fake engagement. Contact-like offers must be warm intros, consented contact escrow, or message relay. Social distribution must be disclosed sponsored distribution.

## Quick Start

```bash
pnpm install
pnpm --filter @agent-stack-ecosystem-kits/marketplace-api dev
```

Set `MARKETPLACE_X402_DISABLED=1` for local demos that simulate paid delivery without settling USDC. Real buyer flows use the Circle CLI wrappers in the agent kits.

## Upstream Starter Kits

This repository started from the Circle Agent Stack ecosystem starter kits and keeps the original framework examples below.

# Circle Agent Stack Ecosystem Starter Kits

Open-source example projects integrating the [Circle Agent Stack](https://developers.circle.com/agent-stack) with popular AI agent frameworks. Each kit demonstrates the same **Autonomous Payment Agent** scenario, so developers can directly compare how each framework approaches the same problem.

## Kits

| Kit | Framework | Docs |
| --- | --- | --- |
| [`kits/langchain`](./kits/langchain) | LangChain Deep Agents | https://docs.langchain.com/oss/javascript/deepagents/overview |
| [`kits/claude-agent-sdk`](./kits/claude-agent-sdk) | Claude Agent SDK | https://code.claude.com/docs/en/agent-sdk/overview |
| [`kits/mastra`](./kits/mastra) | Mastra | https://mastra.ai/docs |
| [`kits/openai-agents`](./kits/openai-agents) | OpenAI Agents SDK | https://openai.github.io/openai-agents-js |
| [`kits/vercel-ai`](./kits/vercel-ai) | Vercel AI SDK | https://sdk.vercel.ai/docs |
| [`kits/google-adk`](./kits/google-adk) | Google Agent Development Kit | https://adk.dev/get-started/typescript/ |

## Shared packages

- [`packages/circle-tools`](./packages/circle-tools): framework-agnostic wrappers around the Circle CLI (wallets, balances, service discovery, x402 payments).
- [`packages/kit-core`](./packages/kit-core): framework-agnostic building blocks layered on `circle-tools` (skill fetching, single-sourced tool descriptions, payment preflight/approval helpers, terminal theme).

## Repository layout

```
agent-stack-ecosystem-kits/
├── kits/
│   ├── claude-agent-sdk/
│   ├── google-adk/
│   ├── langchain/
│   ├── mastra/
│   ├── openai-agents/
│   └── vercel-ai/
└── packages/
    ├── circle-tools/         # shared Circle CLI wrappers
    └── kit-core/             # shared building blocks (skills, tool copy, payment helpers, theme)
```

## Prerequisites

- Node.js 20+
- [Bun](https://bun.com) 1.2+ (workspace manager)
- Circle CLI: `bun add -g @circle-fin/cli`
- Circle Agent Skills (one of):
  - `circle skill install --tool <claude-code|cursor|codex|opencode|amp>`
  - Universal fallback: `bunx skills add circlefin/skills -g`
- A Circle account (authentication is handled by the Circle CLI on first run; there is no Circle API key)
- An LLM provider API key for whichever kit you run (Anthropic, OpenAI, or Google, per that kit's README)

## Install

```bash
bun install
```

This installs all workspace dependencies from the repo root. Each kit owns its own `.env.example` (copy to `.env` inside that kit's folder) and exposes a `bun run demo` entrypoint. See its README for details.

## Demo use case

Each kit demonstrates the same flow:

1. Bootstrap with the [Circle Agent Skill](https://agents.circle.com/skills/setup.md) + CLI
   - Install CLI and skill
   - Login
   - Create a wallet
   - Check / fund balance
2. Transact via the agent
   - Find or select a service on the [Circle Agent Marketplace](https://agents.circle.com/services)
   - Pay for it via the agent

See each kit's `README.md` for run instructions.

## Key resources

- [Circle Agent Stack docs](https://developers.circle.com/agent-stack)
- [Circle Skills setup](https://agents.circle.com/skills/setup.md)
- [Circle CLI reference](https://developers.circle.com/agent-stack/circle-cli/command-reference)
- [Agent Wallets quickstart](https://developers.circle.com/agent-stack/agent-wallets/quickstart)
- [Agent Nanopayments quickstart](https://developers.circle.com/agent-stack/agent-nanopayments/quickstart)
- [Circle Agent Marketplace](https://agents.circle.com/services)
- [Circle Developer Discord](https://discord.com/invite/buildoncircle)
