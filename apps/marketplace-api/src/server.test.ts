import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import { createListing, openDatabase } from './db';
import { createMarketplaceServer } from './server';

test('server allows browser clients with cors headers', async (t) => {
  const db = openDatabase(':memory:');
  const server = createMarketplaceServer(db).listen(0);
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.headers.get('access-control-allow-origin'), '*');

  const preflight = await fetch(`${baseUrl}/api/listings/search`, {
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost:5173',
      'access-control-request-method': 'GET',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET,POST,OPTIONS');
});

test('server restricts cors to configured origins', async (t) => {
  const previousCorsOrigin = process.env.MARKETPLACE_CORS_ORIGIN;
  process.env.MARKETPLACE_CORS_ORIGIN = 'https://trusted.example,http://localhost:5173';
  t.after(() => {
    if (previousCorsOrigin === undefined) delete process.env.MARKETPLACE_CORS_ORIGIN;
    else process.env.MARKETPLACE_CORS_ORIGIN = previousCorsOrigin;
  });

  const db = openDatabase(':memory:');
  const server = createMarketplaceServer(db).listen(0);
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  const allowed = await fetch(`${baseUrl}/api/listings/search`, {
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost:5173',
      'access-control-request-method': 'GET',
    },
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(allowed.headers.get('vary'), 'Origin');

  const denied = await fetch(`${baseUrl}/api/listings/search`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://evil.example',
      'access-control-request-method': 'GET',
    },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('admin reset clears marketplace records', async (t) => {
  const previousAdminToken = process.env.MARKETPLACE_ADMIN_TOKEN;
  process.env.MARKETPLACE_ADMIN_TOKEN = 'test-admin-token';
  t.after(() => {
    if (previousAdminToken === undefined) delete process.env.MARKETPLACE_ADMIN_TOKEN;
    else process.env.MARKETPLACE_ADMIN_TOKEN = previousAdminToken;
  });

  const db = openDatabase(':memory:');
  createListing(db, {
    sellerWallet: '0x0000000000000000000000000000000000000001',
    listingType: 'data_pack',
    title: 'Temporary listing',
    description: 'A listing that should be removed by the admin reset endpoint.',
    priceUsd: 1,
    deliveryMode: 'markdown',
    proofSummary: 'Reset endpoint test listing.',
    riskLevel: 'low',
    policyFlags: [],
    deliverable: {
      payload: '# Temporary',
      mimeType: 'text/markdown',
    },
  });

  const server = createMarketplaceServer(db).listen(0);
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  const unauthorized = await fetch(`${baseUrl}/api/admin/reset-marketplace`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ confirm: 'reset-marketplace-data' }),
  });
  assert.equal(unauthorized.status, 401);

  const reset = await fetch(`${baseUrl}/api/admin/reset-marketplace`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-marketplace-admin-token': 'test-admin-token',
    },
    body: JSON.stringify({ confirm: 'reset-marketplace-data' }),
  });
  assert.equal(reset.status, 200);
  const body = (await reset.json()) as { deleted?: { listings?: number; deliverables?: number } };
  assert.equal(body.deleted?.listings, 1);
  assert.equal(body.deleted?.deliverables, 1);

  const search = await fetch(`${baseUrl}/api/listings/search`);
  assert.equal(search.status, 200);
  const searchBody = (await search.json()) as { listings?: unknown[] };
  assert.deepEqual(searchBody.listings, []);
});
