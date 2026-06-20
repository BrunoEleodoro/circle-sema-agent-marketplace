import express from 'express';
import { openDatabase, type MarketplaceDb } from './db';
import { createApiRouter } from './routes';

export function createMarketplaceServer(db: MarketplaceDb = openDatabase()): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'circle-sema-marketplace' });
  });

  app.use('/api', createApiRouter(db));

  return app;
}
