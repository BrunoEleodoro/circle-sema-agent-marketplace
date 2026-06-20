import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { createAuthChallenge, requireAuth, verifyAuthChallenge, type AuthedRequest } from './auth';
import { marketplaceAdminToken } from './config';
import {
  createListing,
  createReview,
  fulfillPurchase,
  getDeliverableForPurchase,
  getListing,
  getPurchase,
  getReputation,
  listPendingPayouts,
  listListings,
  releasePayout,
  resetMarketplaceData,
  type MarketplaceDb,
} from './db';
import {
  createListingSchema,
  fulfillPurchaseSchema,
  releasePayoutSchema,
  reviewSchema,
  type ListingRecord,
  type PurchaseRecord,
} from './schema';
import { deliverableJson, purchaseJson, reviewPromptJson } from './presenters';
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

const adminResetSchema = z.object({
  confirm: z.literal('reset-marketplace-data'),
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

function canReadPurchase(row: PurchaseRecord, walletAddress: string | undefined): boolean {
  const wallet = walletAddress?.toLowerCase();
  return Boolean(wallet && (row.buyer_wallet === wallet || row.seller_wallet === wallet));
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function tokenMatches(actual: string, expected: string): boolean {
  if (!actual || !expected) return false;
  const actualHash = createHash('sha256').update(actual).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

function adminAuthorized(req: AuthedRequest): boolean {
  const expected = marketplaceAdminToken();
  if (!expected) return false;
  const bearer = req.header('authorization')?.startsWith('Bearer ')
    ? req.header('authorization')!.slice('Bearer '.length).trim()
    : '';
  const header = req.header('x-marketplace-admin-token') ?? '';
  return tokenMatches(bearer, expected) || tokenMatches(header, expected);
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

  router.get('/purchases/:id', requireAuth(db), (req: AuthedRequest, res) => {
    const purchase = getPurchase(db, routeParam(req.params.id));
    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found.' });
      return;
    }
    if (!canReadPurchase(purchase, req.walletAddress)) {
      res.status(403).json({ error: 'Only the buyer or seller can read this purchase.' });
      return;
    }
    res.json({ purchase: purchaseJson(purchase) });
  });

  router.get('/purchases/:id/deliverable', requireAuth(db), (req: AuthedRequest, res) => {
    const purchase = getPurchase(db, routeParam(req.params.id));
    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found.' });
      return;
    }
    if (!canReadPurchase(purchase, req.walletAddress)) {
      res.status(403).json({ error: 'Only the buyer or seller can read this purchase.' });
      return;
    }
    const deliverable = getDeliverableForPurchase(db, purchase);
    if (!deliverable) {
      res.status(202).json({
        purchase: purchaseJson(purchase),
        deliveryStatus: purchase.delivery_status,
        sellerFulfillmentPending: true,
      });
      return;
    }
    res.type(deliverable.mime_type).json({
      purchase: purchaseJson(purchase),
      deliverable: deliverableJson(deliverable),
      payload: deliverable.payload,
      reviewPrompt: purchase.buyer_wallet === req.walletAddress ? reviewPromptJson(purchase) : null,
    });
  });

  router.post('/purchases/:id/fulfill', requireAuth(db), (req: AuthedRequest, res) => {
    try {
      const input = fulfillPurchaseSchema.parse(req.body);
      const result = fulfillPurchase(db, req.walletAddress!, routeParam(req.params.id), input.deliverable);
      res.status(201).json({
        purchase: purchaseJson(result.purchase),
        deliverable: deliverableJson(result.deliverable),
        buyerDelivery: {
          method: 'GET',
          path: `/api/purchases/${result.purchase.id}/deliverable`,
          requiresBuyerBearerToken: true,
        },
      });
    } catch (e) {
      const message = (e as Error).message;
      const status = message.includes('Only the seller') ? 403 : 400;
      res.status(status).json({ error: message });
    }
  });

  router.get('/payouts/pending', (req: AuthedRequest, res) => {
    if (!adminAuthorized(req)) {
      res.status(401).json({ error: 'Missing or invalid marketplace admin token.' });
      return;
    }
    res.json({ payouts: listPendingPayouts(db).map(purchaseJson) });
  });

  router.post('/admin/reset-marketplace', (req: AuthedRequest, res) => {
    if (!adminAuthorized(req)) {
      res.status(401).json({ error: 'Missing or invalid marketplace admin token.' });
      return;
    }
    try {
      adminResetSchema.parse(req.body);
      res.json({ deleted: resetMarketplaceData(db) });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  router.post('/payouts/:purchaseId/mark-paid', (req: AuthedRequest, res) => {
    if (!adminAuthorized(req)) {
      res.status(401).json({ error: 'Missing or invalid marketplace admin token.' });
      return;
    }
    try {
      const input = releasePayoutSchema.parse(req.body);
      res.json({ purchase: purchaseJson(releasePayout(db, routeParam(req.params.purchaseId), input)) });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  router.get('/deliver/:id', deliverListing(db));

  return router;
}
