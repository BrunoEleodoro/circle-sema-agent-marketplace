# Railway Deployment

Deploy `apps/marketplace-api` as the web service.

## Service Settings

- Root directory: `apps/marketplace-api`
- Install command: `pnpm install --frozen-lockfile`
- Start command: `pnpm start`
- Node version: `22` or newer
- Volume mount: `/data`

## Environment Variables

Recommended variables:

```bash
NODE_ENV=production
MARKETPLACE_DB_PATH=/data/marketplace.sqlite
MARKETPLACE_SESSION_SECRET=<random-secret>
MARKETPLACE_X402_DISABLED=0
CIRCLE_GATEWAY_FACILITATOR_URL=https://gateway-api.circle.com
BASE_RPC_URL=<optional-base-rpc>
SEMA_ROOT=sema:vocab#mh:SHA-256:39ca671a4dcb3075855cb293380d1796105e2eca0de49b0537279b798b675ee6
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
- Payment flows should stay in sandbox or use strict wallet spend caps during the hackathon.
- Sema handle drift should be checked again if another agent updates the vocabulary before demo time.
