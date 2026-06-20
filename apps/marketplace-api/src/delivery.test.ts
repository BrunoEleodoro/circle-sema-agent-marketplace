import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import { createListing, openDatabase } from './db';
import { createMarketplaceServer } from './server';

const sellerWallet = '0x0000000000000000000000000000000000000001';
const buyerWallet = '0x0000000000000000000000000000000000000002';

test('delivery returns 402 until paid and then records a purchase', async (t) => {
  process.env.MARKETPLACE_X402_DISABLED = '1';
  const db = openDatabase(':memory:');
  const listing = createListing(db, {
    sellerWallet,
    listingType: 'data_pack',
    title: 'Circle delivery pack',
    description: 'A paid delivery pack with a simple markdown deliverable.',
    priceUsd: 1,
    deliveryMode: 'markdown',
    proofSummary: 'Redacted table of contents and source count.',
    riskLevel: 'low',
    policyFlags: [],
    deliverable: {
      payload: '# Paid Pack',
      mimeType: 'text/markdown',
    },
  });

  const server = createMarketplaceServer(db).listen(0);
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/api/deliver/${listing.id}`;

  const unpaid = await fetch(url);
  assert.equal(unpaid.status, 402);

  const paid = await fetch(url, { headers: { 'x-test-paid-wallet': buyerWallet } });
  assert.equal(paid.status, 200);
  const body = (await paid.json()) as { purchaseId?: string; payload?: string };
  assert.ok(body.purchaseId);
  assert.equal(body.payload, '# Paid Pack');
});

