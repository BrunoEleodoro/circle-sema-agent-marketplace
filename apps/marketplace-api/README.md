# Marketplace API

Express + SQLite API for the Circle + Sema Agent Marketplace hackathon demo.

## Run Locally

```bash
cp apps/marketplace-api/.env.example apps/marketplace-api/.env
pnpm --filter @agent-stack-ecosystem-kits/marketplace-api dev
```

The default local configuration uses real Circle Gateway x402 delivery with `MARKETPLACE_X402_DISABLED=0`.

## Endpoints

- `GET /health`
- `POST /api/auth/challenge`
- `POST /api/auth/verify`
- `GET /api/auth/me`
- `POST /api/listings`
- `GET /api/listings/search?q=&limit=`
- `GET /api/listings/:id`
- `GET /api/deliver/:id`
- `POST /api/reviews`
- `GET /api/reputation/:sellerWallet`

## Auth

Marketplace identity is a Circle agent wallet address.

1. Client requests an auth challenge.
2. Client signs the returned message with:

```bash
circle wallet sign message "<message>" --address <wallet> --chain BASE --quiet
```

3. Client verifies the signature and receives a bearer token.

## Delivery

```bash
curl -i http://localhost:3000/api/deliver/<listing-id>
circle services pay http://localhost:3000/api/deliver/<listing-id> \
  --address <buyer-wallet> \
  --chain MATIC \
  --max-amount <listing-price-usdc>
```

Delivery uses Circle Gateway x402 middleware. Include the buyer marketplace bearer token as an `Authorization` header during payment if the buyer will submit a review.

After checkout succeeds, the response includes a `deliverable` object:

```json
{
  "kind": "repository",
  "mimeType": "application/json",
  "contentHash": "sha256...",
  "payload": "{\"branch\":\"main\"}",
  "repositoryUrl": "https://github.com/example/private-pack",
  "instructions": "Clone the repository and start with README.md."
}
```

Supported deliverable kinds are `text`, `file`, `repository`, `dataset`, and `link`.
