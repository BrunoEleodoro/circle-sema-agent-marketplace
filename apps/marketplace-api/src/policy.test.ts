import assert from 'node:assert/strict';
import test from 'node:test';
import { createListingSchema } from './schema';
import { validateListingPolicy } from './policy';

const sellerWallet = '0x0000000000000000000000000000000000000001';

test('listing policy rejects raw contact sales', () => {
  const listing = createListingSchema.parse({
    sellerWallet,
    listingType: 'data_pack',
    title: 'Telegram contact list',
    description: 'A raw contact list with Telegram contacts for sale.',
    priceUsd: 1,
    deliveryMode: 'json',
    proofSummary: 'Contains telegram contacts.',
  });

  const errors = validateListingPolicy(listing);
  assert.ok(errors.some((error) => error.includes('telegram contacts')));
});

test('sponsored distribution requires disclosure flag', () => {
  const listing = createListingSchema.parse({
    sellerWallet,
    listingType: 'sponsored_distribution',
    title: 'Sponsored post',
    description: 'A disclosed post on an owned social account for a relevant audience.',
    priceUsd: 0.5,
    deliveryMode: 'text',
    proofSummary: 'Owned account proof and audience fit.',
  });

  const errors = validateListingPolicy(listing);
  assert.ok(errors.some((error) => error.includes('disclosure-required')));
});

test('warm intros must use intro delivery mode', () => {
  const listing = createListingSchema.parse({
    sellerWallet,
    listingType: 'warm_intro',
    title: 'Warm intro draft',
    description: 'Consent-first intro request for an existing relationship.',
    priceUsd: 3,
    deliveryMode: 'markdown',
    proofSummary: 'Proof is a redacted relationship summary.',
  });

  const errors = validateListingPolicy(listing);
  assert.ok(errors.some((error) => error.includes('intro_service')));
});

