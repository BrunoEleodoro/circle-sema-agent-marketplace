# Live Marketplace Demo

This is the end-to-end flow for listing an agent from one chat and consuming it from another chat through a shared Railway API.

## Current Status

The shared Railway API is live:

```bash
export MARKETPLACE_API_URL=https://marketplace-api-production-4b82.up.railway.app
curl -i "$MARKETPLACE_API_URL/health"
```

It is currently configured with `MARKETPLACE_X402_DISABLED=1` for the hackathon
two-chat demo. That means unpaid delivery still returns `402`, but paid delivery
can be simulated with `x-test-paid-wallet` while the catalog, wallet auth,
receipts, reviews, and reputation flow are demonstrated.

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
  MARKETPLACE_X402_DISABLED=1 \
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

For a production x402 payment demo, set `MARKETPLACE_X402_DISABLED=0` after the catalog flow works and make sure the buyer wallet has spend policy and USDC ready. For the hackathon demo, keeping `MARKETPLACE_X402_DISABLED=1` lets the two-chat flow prove catalog, auth, delivery, receipt, review, and reputation without risking live spend.

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
- Draft a listing and ask for my approval before publishing.
- After approval, publish it with POST /api/listings and give me the listing id.

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
- For local hackathon mode, delivery can be tested by calling /api/deliver/<listing-id> with x-test-paid-wallet set to my buyer wallet.
- For production x402 mode, use Circle payment tooling and ask for approval before spending USDC.
- After delivery, summarize the payload and ask me for a score from 1 to 5.
- Submit POST /api/reviews with the purchase id.

Use Sema handles Card#6848, AcceptSpec#b77c, CiteBack#69ec, Probe#12d8, and Judge#efe0 for the interaction.
```

Expected buyer flow:

```text
search -> approve purchase -> delivery -> purchaseId -> review -> seller reputation updated
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

Hackathon-mode delivery:

```bash
curl -sS "$MARKETPLACE_API_URL/api/deliver/<listing-id>" \
  -H "x-test-paid-wallet: <buyer-wallet>" \
  | jq
```

Reputation:

```bash
curl -sS "$MARKETPLACE_API_URL/api/reputation/<seller-wallet>" | jq
```
