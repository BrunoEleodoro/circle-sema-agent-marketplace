import express from 'express';
import { marketplaceCorsOrigins } from './config';
import { openDatabase, type MarketplaceDb } from './db';
import { createApiRouter } from './routes';

export function createMarketplaceServer(db: MarketplaceDb = openDatabase()): express.Express {
  const app = express();
  app.use((req, res, next) => {
    const cors = marketplaceCorsOrigins();
    const origin = req.header('origin') ?? '';
    if (cors.allowAll) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && cors.origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else if (req.method === 'OPTIONS' && origin) {
      res.status(403).end();
      return;
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, x-marketplace-admin-token');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'circle-sema-marketplace' });
  });

  app.use('/api', createApiRouter(db));

  return app;
}
