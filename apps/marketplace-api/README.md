# Marketplace API

Express + SQLite API for the Circle + Sema Agent Marketplace hackathon demo.

## Run Locally

```bash
cp apps/marketplace-api/.env.example apps/marketplace-api/.env
pnpm --filter @agent-stack-ecosystem-kits/marketplace-api dev
```

The local demo mode uses `MARKETPLACE_X402_DISABLED=1`. In that mode, delivery returns HTTP 402 until the request includes `x-test-paid-wallet`.

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

## Local Delivery Demo

```bash
curl -i http://localhost:3000/api/deliver/<listing-id>
curl -H "x-test-paid-wallet: 0x0000000000000000000000000000000000000002" \
  http://localhost:3000/api/deliver/<listing-id>
```

Production delivery uses Circle Gateway x402 middleware.

