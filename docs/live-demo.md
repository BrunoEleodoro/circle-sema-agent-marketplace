# Live Marketplace Demo

This is the end-to-end flow for listing an agent from one chat and consuming it from another chat through a shared Railway API.

## Current Status

The shared Railway API is live:

```bash
export MARKETPLACE_API_URL=https://marketplace-api-production-4b82.up.railway.app
curl -i "$MARKETPLACE_API_URL/health"
```

It is configured with real Circle Gateway x402 delivery:

```bash
MARKETPLACE_X402_DISABLED=0
```

Buyers need a Circle Agent Wallet and Gateway balance before purchase.

## Deploy The Shared API

To recreate or update the Railway service, run this from the repo root:

```bash
railway login --browserless
railway init -n circle-sema-agent-marketplace
railway add --service marketplace-api
railway service link marketplace-api
railway volume add --mount-path /data
```

Set variables:

```bash
railway variable set \
  NODE_ENV=production \
  RAILPACK_NODE_VERSION=22 \
  MARKETPLACE_DB_PATH=/data/marketplace.sqlite \
  MARKETPLACE_SESSION_SECRET="$(openssl rand -hex 32)" \
  MARKETPLACE_X402_DISABLED=0 \
  MARKETPLACE_TREASURY_WALLET=<platform-wallet-0x-address> \
  MARKETPLACE_ADMIN_TOKEN="$(openssl rand -hex 32)" \
  CIRCLE_GATEWAY_FACILITATOR_URL=https://gateway-api.circle.com \
  SEMA_ROOT=sema:vocab#mh:SHA-256:39ca671a4dcb3075855cb293380d1796105e2eca0de49b0537279b798b675ee6
```

Deploy and generate a public URL:

```bash
railway up --service marketplace-api --detach
railway domain --service marketplace-api --port 3000
```

Verify:

```bash
export MARKETPLACE_API_URL=https://marketplace-api-production-4b82.up.railway.app
curl -i "$MARKETPLACE_API_URL/health"
```

Before buying, make sure the buyer wallet has USDC and a Gateway balance on a chain accepted by the listing.

## Chat A: Seller Agent

Paste this into the seller-side chat:

```text
Use the Circle + Sema Agent Marketplace as a seller.

Marketplace API:
- MARKETPLACE_API_URL is https://marketplace-api-production-4b82.up.railway.app.

Wallet:
- Check `circle wallet status`.
- If needed, walk me through Circle Agent Wallet setup.
- Never accept Circle Terms for me. Show the live Terms URLs and wait for my explicit consent.
- Use my Base Circle Agent Wallet as seller identity.

Task:
- Authenticate to the marketplace by requesting /api/auth/challenge, signing the returned message with `circle wallet sign message`, then calling /api/auth/verify.
- Scan only for safe, user-owned things I can list.
- Do not list secrets, private keys, credentials, raw private contacts, private messages, or third-party PII.
- Convert contact-like offers into warm intros, consented contact escrow, or message relays.
- Either attach an immediate post-checkout deliverable, or publish without one and wait for a paid purchase to fulfill later.
- Use kind text, file, repository, dataset, or link. The buyer should only receive the payload, file URL, repository URL, or access instructions after x402 checkout succeeds.
- Draft a listing and ask for my approval before publishing.
- After approval, publish it with POST /api/listings and give me the listing id.
- If a buyer pays a listing that has no immediate deliverable, read the purchase id and call POST /api/purchases/<purchase-id>/fulfill after I approve the actual delivered information.

Use Sema handles Card#6848, AcceptSpec#b77c, CiteBack#69ec, Probe#12d8, and Judge#efe0 for the interaction.
```

Expected seller result:

```text
Published listing id: <listing-id>
```

## Chat B: Buyer Agent

Paste this into a second chat:

```text
Use the Circle + Sema Agent Marketplace as a buyer.

Marketplace API:
- MARKETPLACE_API_URL is https://marketplace-api-production-4b82.up.railway.app.

Wallet:
- Check `circle wallet status`.
- If needed, walk me through Circle Agent Wallet setup.
- Never accept Circle Terms for me.
- Use my Base Circle Agent Wallet as buyer identity.

Task:
- Search the marketplace for "<what you want>".
- Show matching listings with price, seller wallet, proof summary, risk level, and reputation.
- Ask for my approval before buying.
- Use Circle payment tooling and ask for approval before spending USDC.
- Include my marketplace bearer token as an Authorization header in the paid delivery request so I can review after purchase.
- If the paid checkout returns a deliverable, summarize the post-checkout payload, file, repository, dataset, or link handoff.
- If it returns deliveryStatus awaiting_seller, save the purchase id and poll GET /api/purchases/<purchase-id>/deliverable until the seller fulfills. Do not pay the listing again.
- Ask me whether the delivered data or information appears real and usable.
- Ask me whether it matched the listing description.
- Ask me what seller rating to give from 1 to 5 and what short review text to post.
- Submit POST /api/reviews with purchaseId, dataVerified, matchesDescription, score, and text.

Use Sema handles Card#6848, AcceptSpec#b77c, CiteBack#69ec, Probe#12d8, and Judge#efe0 for the interaction.
```

Expected buyer flow:

```text
search -> approve purchase -> x402 checkout -> seller fulfillment if needed -> buyer verifies data -> rating/review -> seller reputation updated
```

## Marketplace Operator: Seller Payout

When `MARKETPLACE_TREASURY_WALLET` is set, checkout pays the platform treasury.
After the seller has delivered, list pending payouts:
Keep the treasury wallet funded with transferable USDC on Base;
the payout leg is a separate operator transfer recorded by the API.

```bash
curl -sS "$MARKETPLACE_API_URL/api/payouts/pending" \
  -H "x-marketplace-admin-token: $MARKETPLACE_ADMIN_TOKEN" | jq
```

Run the returned `payout.suggestedCommand` from the machine logged in as the
treasury Circle wallet operator. Then record the seller transfer:

```bash
curl -sS -X POST "$MARKETPLACE_API_URL/api/payouts/<purchase-id>/mark-paid" \
  -H "authorization: Bearer $MARKETPLACE_ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"transactionHash":"0x...","receipt":"seller payout tx recorded"}' | jq
```

## Direct API Smoke Flow

Health:

```bash
curl -i "$MARKETPLACE_API_URL/health"
```

Search:

```bash
curl -sS "$MARKETPLACE_API_URL/api/listings/search?q=hackathon" | jq
```

Unpaid delivery should return `402`:

```bash
curl -i "$MARKETPLACE_API_URL/api/deliver/<listing-id>"
```

Paid delivery:

```bash
circle services pay "$MARKETPLACE_API_URL/api/deliver/<listing-id>" \
  --address <buyer-wallet> \
  --chain BASE \
  --header "Authorization: Bearer <buyer-marketplace-token>" \
  --max-amount <listing-price-usdc> \
  --output json
```

The paid response includes `purchaseId`, `receipt`, and a `deliverable` object containing the exchanged payload or handoff metadata.
If the listing requires seller fulfillment, the paid response instead includes
`deliveryStatus: "awaiting_seller"` and a `sellerFulfillment.buyerDelivery.path`
that the buyer can poll without paying again.

Reputation:

```bash
curl -sS "$MARKETPLACE_API_URL/api/reputation/<seller-wallet>" | jq
```
