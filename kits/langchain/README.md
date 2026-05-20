# LangChain Deep Agents × Circle Agent Stack

## What it is

An Autonomous Payment Agent built with [LangChain Deep Agents](https://docs.langchain.com/oss/javascript/deepagents/overview). From a single TypeScript entry point, the agent bootstraps via the Circle Agent Skill, creates an agent wallet on BASE, checks balances, discovers an x402-compatible service on the Circle Agent Marketplace, and pays for it using a USDC nanopayment.

## Prerequisites

- [Bun](https://bun.com) 1.2+
- An LLM provider API key (Anthropic or OpenAI)
- A provisioned agent host: Circle CLI installed, skill installed, logged in, and
  Circle's Terms of Use accepted. This is `setup.md` steps 1-3, a one-time
  per-host operation. See [Host setup](#host-setup).

## Quickstart

```bash
git clone <repo-url> && cd circle-agent-stack-examples
bun install
cp kits/langchain/.env.example kits/langchain/.env   # then fill in keys
bun --filter @circle-agent-stack-examples/kit-langchain demo
```

> Run [Host setup](#host-setup) once before the first demo. After that, the demo
> runs end-to-end with no manual intervention.

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `CIRCLE_CHAIN` | no | Defaults to `BASE` (only chain supported today). |
| `ANTHROPIC_API_KEY` *or* `OPENAI_API_KEY` | one of | Provider auto-selected from whichever key is set. Anthropic wins if both are set. |
| `LLM_MODEL` | no | Overrides the default model (`claude-sonnet-4-6` / `gpt-4o-mini`). |

### What the demo does

The entry point passes the Circle bootstrap prompt to a LangChain Deep Agent and lets [`setup.md`](https://agents.circle.com/skills/setup.md) drive the flow. There is no hand-written system prompt.

1. The agent calls `fetch_setup_skill`, reads the returned 7-step skill, and follows it.
2. Steps 1-3 (CLI install, skill install, login + Terms of Use) are already satisfied by [Host setup](#host-setup), so the agent picks up at wallet provisioning.
3. It lists or creates an agent wallet on BASE, checks the USDC balance, searches the Circle Agent Marketplace, inspects a service, and pays for it with a USDC nanopayment. `fetch_sub_skill` pulls `wallet-fund` / `wallet-pay` guidance when a step needs it.
4. Every tool call logs to stdout (`[tool] ...`); the agent's final summary prints at the end.

## Skill reference

The agent boots from the official setup skill via this prompt:

> Run `curl -sL https://agents.circle.com/skills/setup.md`, and use the returned setup instructions to set up my agent wallet.

See https://agents.circle.com/skills/setup.md.

### Host setup

Run once per agent host. This is `setup.md` steps 1-3:

```bash
bun add -g @circle-fin/cli
circle skill install --tool claude-code   # or: cursor | codex | opencode | amp
# Universal fallback (any host):
bunx skills add circlefin/skills -g

circle wallet status                      # logs in; triggers the Terms-of-Use gate
```

On first run, `circle wallet status` triggers Circle's Terms-of-Use gate. You must review and accept the Terms yourself. Per `setup.md`, an agent must never accept them on a user's behalf, so this kit ships no Terms tool. It is a one-time human step. See [`wallet-login.md`](https://agents.circle.com/skills/wallet-login.md) for the full login flow.

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
│  (execFileSync → circle)    │
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
