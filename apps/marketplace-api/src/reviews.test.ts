import assert from 'node:assert/strict';
import test from 'node:test';
import { createListing, createReview, getReputation, openDatabase, recordPurchase } from './db';

const sellerWallet = '0x0000000000000000000000000000000000000001';
const buyerWallet = '0x0000000000000000000000000000000000000002';

test('only a paid buyer can review and reputation updates', () => {
  const db = openDatabase(':memory:');
  const listing = createListing(db, {
    sellerWallet,
    listingType: 'expert_answer',
    title: 'Circle x402 answer',
    description: 'A concise paid answer for Circle x402 integration questions.',
    priceUsd: 2,
    deliveryMode: 'text',
    proofSummary: 'Public expertise summary and sample answer.',
    riskLevel: 'low',
    policyFlags: [],
  });
  const purchase = recordPurchase(db, {
    listingId: listing.id,
    buyerWallet,
    sellerWallet,
    amountUsd: 2,
    network: 'BASE',
    paymentReceipt: 'test-receipt',
    hasImmediateDeliverable: true,
  });

  const review = createReview(db, buyerWallet, {
    purchaseId: purchase.id,
    score: 5,
    matchesDescription: true,
    dataVerified: true,
    text: 'Matched the description and was useful.',
  });

  assert.equal(review.score, 5);
  assert.equal(review.dataVerified, true);
  assert.deepEqual(getReputation(db, sellerWallet), {
    walletAddress: sellerWallet,
    reputationScore: 5,
    reviewCount: 1,
  });
});
