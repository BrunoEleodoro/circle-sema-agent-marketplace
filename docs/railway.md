# Railway Demo Notes

These notes are for deploying a hackathon demo around the Circle + Sema Agent Marketplace artifacts in this repo.

## Current Repo Shape

The root package has build, typecheck, and clean scripts, but no long-running server script. A Railway service can install and validate the workspace today, but a public demo endpoint still needs an app entrypoint in a kit or a separate demo app.

Use these files as the demo seed:

- `sample-data/listings.json`: marketplace listings for `research-pack` and `warm-intro`.
- `docs/sema-context.md`: shared Sema handle contract.
- `docs/scan-prompt.md`: listing intake prompt.

## Suggested Railway Setup

Create one Railway project with separate services as needed:

- `marketplace-demo-api`: the future API or web service that reads `sample-data/listings.json`.
- `agent-worker`: optional background agent runner for probes and purchase flows.
- `docs-static`: optional static docs service if the hackathon needs browsable docs.

For the current repo root, use:

```bash
bun install
bun run typecheck
```

Add a start command only after a demo app exists. Do not point Railway at the root package as a web service until there is a real `start` script.

## Environment Variables

Recommended variables for the future demo service:

```bash
NODE_ENV=production
BUN_VERSION=1.2.0
MARKETPLACE_LISTINGS_PATH=sample-data/listings.json
SEMA_CONTEXT_HANDLES=Card#6848,AcceptSpec#b77c,CiteBack#69ec,Probe#12d8,Judge#efe0
CIRCLE_ENV=sandbox
CIRCLE_DEMO_WALLET_ID=
CIRCLE_DEMO_PAYMENT_ASSET=USDC
```

If the demo service calls an LLM, set the provider key in Railway variables and keep it out of Git. If the Circle CLI is used interactively, persist its auth state in a Railway volume or replace it with a non-interactive sandbox flow.

## Smoke Checks

Run these before the demo:

```bash
bun install
bun run typecheck
jq . sample-data/listings.json
```

Then verify the deployed app can:

- Load both `research-pack` and `warm-intro`.
- Display the five Sema handles.
- Reject raw contact sales.
- Reject undisclosed engagement.
- Show USDC pricing as demo payment metadata without exposing wallet secrets.

## Demo Risks

- There is no root web server yet, so Railway deployment is not one-click public hosting until a startable app is added.
- Circle CLI auth may not survive Railway restarts unless auth state is stored intentionally.
- The policy exclusions are represented in docs and sample data, not enforced by runtime code yet.
- Payment flows should stay in sandbox or use strict wallet spend caps during the hackathon.
- Sema handle drift should be checked again if another agent updates the vocabulary before demo time.
