import { Router } from 'express';
import { z } from 'zod';
import { createAuthChallenge, requireAuth, verifyAuthChallenge, type AuthedRequest } from './auth';
import {
  createListing,
  createReview,
  getListing,
  getReputation,
  listListings,
  type MarketplaceDb,
} from './db';
import { createListingSchema, reviewSchema, type ListingRecord } from './schema';
import { deliverListing } from './x402';

const challengeSchema = z.object({
  walletAddress: z.string(),
  chain: z.string().default('BASE'),
});

const verifySchema = z.object({
  challengeId: z.string().uuid(),
  walletAddress: z.string(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  displayName: z.string().optional(),
});

const searchSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

function listingJson(row: ListingRecord): Record<string, unknown> {
  return {
    id: row.id,
    sellerWallet: row.seller_wallet,
    listingType: row.listing_type,
    title: row.title,
    description: row.description,
    priceUsd: row.price_usd,
    deliveryMode: row.delivery_mode,
    proofSummary: row.proof_summary,
    riskLevel: row.risk_level,
    policyFlags: JSON.parse(row.policy_flags) as unknown,
    semaContext: JSON.parse(row.sema_context) as unknown,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createApiRouter(db: MarketplaceDb): Router {
  const router = Router();

  router.post('/auth/challenge', (req, res) => {
    try {
      const input = challengeSchema.parse(req.body);
      res.json(createAuthChallenge(db, input.walletAddress, input.chain));
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  router.post('/auth/verify', async (req, res) => {
    try {
      const input = verifySchema.parse(req.body);
      const session = await verifyAuthChallenge(db, input);
      res.json({
        token: session.token,
        walletAddress: session.walletAddress,
        expiresAt: session.expiresAt,
      });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  router.get('/auth/me', requireAuth(db), (req: AuthedRequest, res) => {
    res.json({ walletAddress: req.walletAddress });
  });

  router.post('/listings', requireAuth(db), (req: AuthedRequest, res) => {
    try {
      const input = createListingSchema.parse(req.body);
      if (input.sellerWallet.toLowerCase() !== req.walletAddress) {
        res.status(403).json({ error: 'sellerWallet must match authenticated wallet.' });
        return;
      }
      res.status(201).json({ listing: listingJson(createListing(db, input)) });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  router.get('/listings/search', (req, res) => {
    try {
      const input = searchSchema.parse(req.query);
      res.json({ listings: listListings(db, input.q, input.limit).map(listingJson) });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  router.get('/listings/:id', (req, res) => {
    const listing = getListing(db, req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }
    res.json({ listing: listingJson(listing) });
  });

  router.post('/reviews', requireAuth(db), (req: AuthedRequest, res) => {
    try {
      const input = reviewSchema.parse(req.body);
      res.status(201).json({ review: createReview(db, req.walletAddress!, input) });
    } catch (e) {
      const message = (e as Error).message;
      const status = message.includes('Only the buyer') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  router.get('/reputation/:sellerWallet', (req, res) => {
    res.json({ reputation: getReputation(db, req.params.sellerWallet ?? '') });
  });

  router.get('/deliver/:id', deliverListing(db));

  return router;
}
