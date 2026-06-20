import express from 'express';

export function createMarketplaceServer(): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'circle-sema-marketplace' });
  });

  return app;
}

