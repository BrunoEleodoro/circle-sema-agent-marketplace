import { Router } from 'express';
import { z } from 'zod';
import { createAuthChallenge, requireAuth, verifyAuthChallenge, type AuthedRequest } from './auth';
import type { MarketplaceDb } from './db';

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

  return router;
}

