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

  createListing(db, {
    sellerWallet,
    listingType: 'data_pack',
    title: 'Historical dataset bundle',
    description: 'Synthetic monthly rows for agent CSV delivery tests.',
    priceUsd: 3,
    deliveryMode: 'csv',
    proofSummary: 'Generated deterministic fake monthly rows.',
    riskLevel: 'low',
    policyFlags: ['tag:finance', 'tag:crypto', 'csv-deliverable'],
    deliverable: {
      kind: 'file',
      filename: 'bundle.csv',
      payload: 'date,symbol,close\n2026-01-01,BTC,1\n',
      mimeType: 'text/csv',
    },
  });

  const tagResults = listListings(db, 'crypto');
  assert.equal(tagResults.length, 1);
  assert.equal(tagResults[0]?.title, 'Historical dataset bundle');
});
