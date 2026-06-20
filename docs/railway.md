# Railway Deployment

Deploy the marketplace API as the shared catalog service. The repo includes
[`railway.json`](../railway.json) so Railway can build from the monorepo root
and start the API service.

## Live Service

```bash
https://marketplace-api-production-4b82.up.railway.app
```

Smoke check:

```bash
curl -i https://marketplace-api-production-4b82.up.railway.app/health
```

Railway project:

- Project: `circle-sema-agent-marketplace`
- Service: `marketplace-api`
- Environment: `production`
- Volume: `/data`

## CLI Setup

To recreate the service from scratch:

```bash
railway login --browserless
railway init -n circle-sema-agent-marketplace
railway add --service marketplace-api
railway service link marketplace-api
railway volume add --mount-path /data
```

## Service Settings

- Config file: `/railway.json`
- Build command: `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm --filter @agent-stack-ecosystem-kits/marketplace-api build`
- Start command: `corepack enable && pnpm --filter @agent-stack-ecosystem-kits/marketplace-api start`
- Node version: `22` or newer
- Volume mount: `/data`

## Environment Variables

Recommended variables:

```bash
NODE_ENV=production
RAILPACK_NODE_VERSION=22
MARKETPLACE_DB_PATH=/data/marketplace.sqlite
MARKETPLACE_SESSION_SECRET=<random-secret>
MARKETPLACE_X402_DISABLED=0
MARKETPLACE_TREASURY_WALLET=<platform-wallet-0x-address>
MARKETPLACE_ADMIN_TOKEN=<random-admin-secret>
CIRCLE_GATEWAY_FACILITATOR_URL=https://gateway-api.circle.com
BASE_RPC_URL=<optional-base-rpc>
SEMA_ROOT=sema:vocab#mh:SHA-256:39ca671a4dcb3075855cb293380d1796105e2eca0de49b0537279b798b675ee6
```

The live Railway service uses real x402 payment settlement. Buyers need a Circle
Agent Wallet with a Gateway balance on Base.
When `MARKETPLACE_TREASURY_WALLET` is set, x402 pays the marketplace treasury
first. The API records the seller wallet, delivery status, and payout status so
the operator can transfer USDC to the seller after delivery.
Seller-transfer commands are fixed to Base. Keep the Base treasury wallet funded
with transferable USDC; Gateway/x402 settlement may not appear instantly as
normal wallet balance.

Deploy and expose the API:

```bash
railway up --service marketplace-api --detach
railway domain --service marketplace-api --port 3000
```

## Smoke Checks

Run these before the demo:

```bash
pnpm --filter @agent-stack-ecosystem-kits/marketplace-api typecheck
pnpm --filter @agent-stack-ecosystem-kits/marketplace-api test
```

Then verify the deployed app can:

- Load both `research-pack` and `warm-intro`.
- Display the five Sema handles.
- Reject raw contact sales.
- Reject undisclosed engagement.
- Return HTTP 402 for unpaid delivery.
- Store a receipt after paid delivery.
- Return `deliveryStatus: "awaiting_seller"` for listings without a preloaded deliverable.
- Let the seller fulfill `/api/purchases/:id/fulfill`.
- Show pending seller payouts through `/api/payouts/pending`.
- Mark a seller payout paid through `/api/payouts/:purchaseId/mark-paid` after the treasury transfer is complete.

## Demo Risks

- Circle CLI auth should stay on the local buyer/seller machines. Railway only verifies signatures and serves the catalog.
- The current payout ledger records the marketplace operator's seller-transfer result. It does not hold server-side Circle credentials or automatically send USDC from Railway.
- Payment flows should use strict wallet spend caps during the hackathon.
- Sema handle drift should be checked again if another agent updates the vocabulary before demo time.
