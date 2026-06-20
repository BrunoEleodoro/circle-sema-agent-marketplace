import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import { privateKeyToAccount } from 'viem/accounts';
import { openDatabase } from './db';
import { createMarketplaceServer } from './server';

async function auth(baseUrl: string, account: ReturnType<typeof privateKeyToAccount>): Promise<string> {
  const challengeRes = await fetch(`${baseUrl}/api/auth/challenge`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ walletAddress: account.address, chain: 'BASE' }),
  });
  assert.equal(challengeRes.status, 200);
  const challenge = (await challengeRes.json()) as { id: string; message: string };
  const signature = await account.signMessage({ message: challenge.message });

  const verifyRes = await fetch(`${baseUrl}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      challengeId: challenge.id,
      walletAddress: account.address,
      signature,
    }),
  });
  assert.equal(verifyRes.status, 200);
  const session = (await verifyRes.json()) as { token: string };
  return session.token;
}

test('publish, search, pay, deliver, review flow', async (t) => {
  process.env.MARKETPLACE_X402_DISABLED = '1';
  const seller = privateKeyToAccount(
    '0x0000000000000000000000000000000000000000000000000000000000000003',
  );
  const buyer = privateKeyToAccount(
    '0x0000000000000000000000000000000000000000000000000000000000000004',
  );
  const db = openDatabase(':memory:');
  const server = createMarketplaceServer(db).listen(0);
  t.after(() => server.close());

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const sellerToken = await auth(baseUrl, seller);
  const buyerToken = await auth(baseUrl, buyer);

  const publishRes = await fetch(`${baseUrl}/api/listings`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${sellerToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sellerWallet: seller.address,
      listingType: 'data_pack',
      title: 'Hackathon research pack',
      description: 'A cited research pack for Circle and Sema marketplace builders.',
      priceUsd: 1,
      deliveryMode: 'markdown',
      proofSummary: 'Redacted contents, source count, and content hash are available.',
      riskLevel: 'low',
      policyFlags: [],
      deliverable: {
        payload: '# Hackathon Pack',
        mimeType: 'text/markdown',
      },
    }),
  });
  assert.equal(publishRes.status, 201);
  const published = (await publishRes.json()) as { listing: { id: string } };

  const searchRes = await fetch(`${baseUrl}/api/listings/search?q=hackathon`);
  assert.equal(searchRes.status, 200);
  const search = (await searchRes.json()) as { listings: Array<{ id: string }> };
  assert.equal(search.listings[0]?.id, published.listing.id);

  const unpaidRes = await fetch(`${baseUrl}/api/deliver/${published.listing.id}`);
  assert.equal(unpaidRes.status, 402);

  const paidRes = await fetch(`${baseUrl}/api/deliver/${published.listing.id}`, {
    headers: { 'x-test-paid-wallet': buyer.address },
  });
  assert.equal(paidRes.status, 200);
  const delivery = (await paidRes.json()) as { purchaseId: string; payload: string };
  assert.equal(delivery.payload, '# Hackathon Pack');

  const reviewRes = await fetch(`${baseUrl}/api/reviews`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${buyerToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      purchaseId: delivery.purchaseId,
      score: 5,
      matchesDescription: true,
      dataVerified: true,
      text: 'Matched the listing and was useful.',
    }),
  });
  assert.equal(reviewRes.status, 201);

  const reputationRes = await fetch(`${baseUrl}/api/reputation/${seller.address}`);
  const reputation = (await reputationRes.json()) as { reputation: { reputationScore: number; reviewCount: number } };
  assert.deepEqual(reputation.reputation, {
    walletAddress: seller.address.toLowerCase(),
    reputationScore: 5,
    reviewCount: 1,
  });
});
