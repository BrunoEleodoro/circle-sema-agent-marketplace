import assert from 'node:assert/strict';
import test from 'node:test';
import { createListing, listListings, openDatabase } from './db';

const sellerWallet = '0x0000000000000000000000000000000000000001';

test('creates and searches listings', () => {
  const db = openDatabase(':memory:');
  createListing(db, {
    sellerWallet,
    listingType: 'data_pack',
    title: 'Circle research pack',
    description: 'A cited implementation pack for Circle Agent Stack builders.',
    priceUsd: 1.5,
    deliveryMode: 'markdown',
    proofSummary: 'Redacted table of contents and source count.',
    riskLevel: 'low',
    policyFlags: [],
    deliverable: {
      payload: '# Research Pack\n\nPaid content.',
      mimeType: 'text/markdown',
    },
  });

  const results = listListings(db, 'circle');
  assert.equal(results.length, 1);
  assert.equal(results[0]?.title, 'Circle research pack');
});

