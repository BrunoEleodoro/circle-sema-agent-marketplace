import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import { openDatabase } from './db';
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
