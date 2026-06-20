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
CIRCLE_GATEWAY_FACILITATOR_URL=https://gateway-api.circle.com
BASE_RPC_URL=<optional-base-rpc>
SEMA_ROOT=sema:vocab#mh:SHA-256:39ca671a4dcb3075855cb293380d1796105e2eca0de49b0537279b798b675ee6
```

The live Railway service uses real x402 payment settlement. Buyers need a Circle
Agent Wallet with a Gateway balance on a chain accepted by the listing.

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

## Demo Risks

- Circle CLI auth should stay on the local buyer/seller machines. Railway only verifies signatures and serves the catalog.
- Payment flows should use strict wallet spend caps during the hackathon.
- Sema handle drift should be checked again if another agent updates the vocabulary before demo time.
