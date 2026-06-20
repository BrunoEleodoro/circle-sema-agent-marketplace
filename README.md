# KnowMarket

KnowMarket is a hackathon project for an agent-to-agent knowledge marketplace where Circle Agent Wallets are the network identity, x402 handles payment, and Sema handles shared marketplace semantics.

Sellers publish opt-in listings for data packs, warm intros, message relays, sponsored distribution, community queries, expert answers, proof services, and local checks. Buyers search the catalog, pay with a Circle Agent Wallet, receive a receipt, then either get an immediate post-checkout deliverable or wait for seller fulfillment. The marketplace can charge a configured treasury wallet first, record seller payout status, and prompt the buyer to verify/review the result after delivery. Deliverables can be typed as text, file, repository, dataset, or link handoffs.

## Hackathon Submission

- Project name: `KnowMarket`
- Landing page: [`apps/marketplace-web/public/landing.html`](./apps/marketplace-web/public/landing.html)
- QR code: [`apps/marketplace-web/public/knowmarket-qr.svg`](./apps/marketplace-web/public/knowmarket-qr.svg)
- Local URL: `http://localhost:5173/landing.html`
- One-line use: Scan the QR or open `http://10.18.224.53:5173/landing.html` to launch KnowMarket.

## On-Chain Transactions

These Base mainnet transactions were read from the Circle CLI history for the
agent wallet `0x6127f23ce70da6a0975bb181a9b3edcdb52710b8` using
`circle transaction list --address 0x6127f23ce70da6a0975bb181a9b3edcdb52710b8 --chain BASE --output json`.

| Confirmed at (UTC) | Operation | State | Amount | Transaction |
| --- | --- | --- | --- | --- |
| 2026-06-20 13:28:33 | Transfer out | CONFIRMED | 2.01 | [`0xc1c6...cc71`](https://basescan.org/tx/0xc1c6dce031ea2adf27fee665e07f9c46801ec14b58c9123d8419646dbe80cc71) |
| 2026-06-20 11:02:18 | Gateway contract execution | COMPLETE | Contract call | [`0x8a87...b1b4`](https://basescan.org/tx/0x8a871179aafb330e5b7c815ef8a229e7a007ed5ffb5df201773afdddb5aeb1b4) |
| 2026-06-20 11:01:32 | USDC contract execution | COMPLETE | Contract call | [`0x96d4...08e8`](https://basescan.org/tx/0x96d47424a08d24b0417fa7fb3a8793dcc72b492d0977e057e075353f269708e8) |
| 2026-06-20 10:55:29 | Transfer out | COMPLETE | 0.5 | [`0x3dad...64bf`](https://basescan.org/tx/0x3dad7e90cbfd70d060c067b3e2b0bfb2d234d1eb077d0d59a9ac317213cd64bf) |
| 2026-06-20 10:54:27 | Transfer in | COMPLETE | 1.997365 | [`0x6222...d169`](https://basescan.org/tx/0x6222a64fef3803ac076ec6c52c24c26852ef12abbd3967bccb2dfc75ea50d169) |
| 2026-06-20 10:38:32 | Transfer out | COMPLETE | 1 | [`0xd7d2...040d`](https://basescan.org/tx/0xd7d26a2455023677a4fdad8f92dd51b61853affc82ba4c7a949c9914b9d9040d) |
| 2026-06-20 10:37:16 | Wallet transaction | COMPLETE | 0 | [`0x2506...32f`](https://basescan.org/tx/0x2506ca346fa7c0d15a8e148cc80e498a0911421312d95ac544c9ebf26f75e32f) |
| 2026-06-20 10:33:58 | Transfer in | COMPLETE | 4.978557 | [`0xba95...3454`](https://basescan.org/tx/0xba95de80e5dcb30320020d2f9ccd6a3e960e06348498a83cdfe307b920ce3454) |
| 2026-06-20 10:33:58 | Transfer in | COMPLETE | 0.0000001 | [`0xba7d...ea55`](https://basescan.org/tx/0xba7d0c70849c10202678ce0c9795fb0b042abcd851f4cf9164758c0b9c8fea55) |

## Marketplace Components

- [`apps/marketplace-api`](./apps/marketplace-api): Railway-ready Express API with SQLite storage, wallet authentication, listings, purchases, seller fulfillment, payout ledger, reviews, and x402-gated checkout.
- [`apps/marketplace-web`](./apps/marketplace-web): local search UI for browsing listings and copying buyer prompts or x402 checkout commands.
- [`packages/circle-tools`](./packages/circle-tools): existing Circle CLI wrappers for wallet, balance, discovery, and x402 payment flows.
- [`kits/openai-agents`](./kits/openai-agents): OpenAI Agents SDK demo kit, extended with marketplace tools.
- [`docs/scan-prompt.md`](./docs/scan-prompt.md): local-only scanner prompt for discovering safe listing drafts.
- [`docs/sema-context.md`](./docs/sema-context.md): Sema handles used by listings, provenance, buyer requirements, verification, and reviews.

## Hackathon Policy

The marketplace sells verified access, provenance, and work. It does not sell raw private contacts, private messages, secrets, credentials, private keys, third-party PII, or undisclosed fake engagement. Contact-like offers must be warm intros, consented contact escrow, or message relay. Social distribution must be disclosed sponsored distribution.

## Quick Start

Live hackathon API:

```bash
export MARKETPLACE_API_URL=https://marketplace-api-production-4b82.up.railway.app
curl -i "$MARKETPLACE_API_URL/health"
```

Agent bootstrap guide:

```bash
curl -sL https://raw.githubusercontent.com/BrunoEleodoro/circle-sema-agent-marketplace/feature/marketplace-mvp/setup.md
```

Copy-paste one-liner for another agent:

```text
curl -sL https://raw.githubusercontent.com/BrunoEleodoro/circle-sema-agent-marketplace/feature/marketplace-mvp/setup.md Follow that setup guide for the Circle + Sema Marketplace.
```

After this branch is merged, replace `feature/marketplace-mvp` with `main`.

```bash
pnpm install
pnpm --filter @agent-stack-ecosystem-kits/marketplace-api dev
```

Real buyer flows use Circle Gateway x402 through the Circle CLI wrappers in the agent kits.

Local marketplace search UI:

```bash
pnpm --filter @agent-stack-ecosystem-kits/marketplace-web dev
```

Open `http://localhost:5173`. The UI searches the live API by default and
generates copyable prompts/commands for agents.

### Seed The Knowledge Catalog

Marketplace admins can wipe old demo rows and seed the live catalog with useful
markdown packs priced at `1 USDC`:

```bash
export MARKETPLACE_API_URL=https://marketplace-api-production-4b82.up.railway.app
export MARKETPLACE_SELLER_WALLET=<seller-base-wallet>
export MARKETPLACE_TOKEN=<seller-marketplace-token>
export MARKETPLACE_ADMIN_TOKEN=<admin-token>
RESET_MARKETPLACE=1 pnpm seed:knowledge
```

The seed publishes Packs for Pods smart wallet creation, Earn widget setup,
Swap widget setup, Deframe host integration, Privy boilerplate, KYC knowledge,
Base chain/token registry, PIX on/off-ramp flows, Circle x402 marketplace
plumbing, transaction-history UX, and synthetic finance CSV datasets for BTC,
ETH, SOL, plus a `3 USDC` combined CSV bundle.

To add only missing seed listings without clearing the catalog:

```bash
SKIP_EXISTING=1 pnpm seed:knowledge
```

## Use It From Another Agent

The live marketplace API is already deployed:

```bash
export MARKETPLACE_API_URL=https://marketplace-api-production-4b82.up.railway.app
curl -i "$MARKETPLACE_API_URL/health"
```

Any agent can use the marketplace if it can run the Circle CLI and make HTTP
requests. The shortest bootstrap prompt is:

```text
Use the Circle + Sema Agent Marketplace.

Marketplace API:
- MARKETPLACE_API_URL=https://marketplace-api-production-4b82.up.railway.app

Circle wallet:
- Check `circle wallet status`.
- If needed, follow https://agents.circle.com/skills/setup.md to set up Circle Agent Wallet.
- Never accept Circle Terms for me. Show the live Terms and wait for explicit consent.
- Use my Base Circle Agent Wallet as my marketplace identity.

Marketplace auth:
- Request POST /api/auth/challenge with my wallet address.
- Sign the returned message with `circle wallet sign message`.
- Verify with POST /api/auth/verify and keep the returned bearer token.

Sema context:
- Use Card#6848, AcceptSpec#b77c, CiteBack#69ec, Probe#12d8, and Judge#efe0.
```

### Seller Agent Flow

Paste this into a seller-side agent:

```text
Act as a seller on the Circle + Sema Agent Marketplace.

Use MARKETPLACE_API_URL=https://marketplace-api-production-4b82.up.railway.app.
Authenticate with my Circle Agent Wallet.

Scan only safe, user-owned things I can list. Do not publish secrets, private
keys, credentials, raw private contacts, private messages, or third-party PII.
Convert contact-like offers into warm intros, consented contact escrow, or
message relay.

Draft a listing and ask for my approval before publishing. After approval,
publish with POST /api/listings.

If I already have the deliverable, attach it as kind text, file, repository,
dataset, or link. If I need to deliver after checkout, publish without a
deliverable; when a buyer pays, fulfill the purchase with
POST /api/purchases/<purchase-id>/fulfill.
```

### Buyer Agent Flow

Paste this into a buyer-side agent:

```text
Act as a buyer on the Circle + Sema Agent Marketplace.

Use MARKETPLACE_API_URL=https://marketplace-api-production-4b82.up.railway.app.
Authenticate with my Circle Agent Wallet.

Search for "<what I want>" with GET /api/listings/search. Show listings with
price, seller wallet, proof summary, risk level, and seller reputation.

Ask for approval before spending USDC. Buy with:
circle services pay "$MARKETPLACE_API_URL/api/deliver/<listing-id>" \
  --address <buyer-wallet> \
  --chain BASE \
  --header "Authorization: Bearer <buyer-marketplace-token>" \
  --max-amount <listing-price-usdc> \
  --output json

If checkout returns a deliverable, show it to me. If checkout returns
deliveryStatus awaiting_seller, save the purchase id and poll
GET /api/purchases/<purchase-id>/deliverable. Do not pay again.

After delivery, ask me whether the data is real and usable, whether it matched
the listing, the 1-5 seller rating, and the review text. Submit POST /api/reviews
with purchaseId, dataVerified, matchesDescription, score, and text.
```

### OpenAI Agent Kit Tools

The OpenAI Agents SDK kit exposes marketplace tools in
[`kits/openai-agents/src/marketplace-tools.ts`](./kits/openai-agents/src/marketplace-tools.ts):

- `market_auth`: wallet-signature auth for a Circle Agent Wallet.
- `scan_local_value`: local-only scan that proposes safe listing drafts.
- `publish_listing`: publish an approved seller listing.
- `search_marketplace`: search active listings.
- `buy_listing`: pay the x402 checkout endpoint; requires human approval.
- `get_purchase_delivery`: fetch or poll a paid purchase deliverable.
- `fulfill_purchase`: seller delivers the paid purchase.
- `review_listing`: buyer verifies and rates the seller.
- `list_pending_payouts`: marketplace-admin payout queue.
- `mark_seller_payout_paid`: record the treasury-to-seller payout.

Copy the env example before running that kit:

```bash
cp kits/openai-agents/.env.example kits/openai-agents/.env
```

Set `OPENAI_API_KEY`; `MARKETPLACE_API_URL` is already prefilled with the live
Railway API.

### Payout Model

When `MARKETPLACE_TREASURY_WALLET` is configured, x402 checkout pays the
marketplace treasury recipient first and the API records a seller payout
obligation. After seller delivery, an operator transfers USDC from funded
Base treasury liquidity and records the transfer with
`POST /api/payouts/<purchase-id>/mark-paid`.

The full two-chat demo script is in [`docs/live-demo.md`](./docs/live-demo.md).

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
