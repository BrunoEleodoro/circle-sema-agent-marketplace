import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import test from 'node:test';
import { createSession } from './auth';
import { createListing, openDatabase, upsertAgent } from './db';
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
  const body = (await paid.json()) as {
    purchaseId?: string;
    payload?: string;
    deliverable?: { kind?: string; payload?: string };
    reviewPrompt?: { purchaseId?: string; questions?: Array<{ field?: string }> };
  };
  assert.ok(body.purchaseId);
  assert.equal(body.payload, '# Paid Pack');
  assert.equal(body.deliverable?.kind, 'text');
  assert.equal(body.deliverable?.payload, '# Paid Pack');
  assert.equal(body.reviewPrompt?.purchaseId, body.purchaseId);
  assert.deepEqual(
    body.reviewPrompt?.questions?.map((question) => question.field),
    ['dataVerified', 'matchesDescription', 'score', 'text'],
  );
});

test('delivery records authenticated buyer wallet when payment payer differs', async (t) => {
  process.env.MARKETPLACE_X402_DISABLED = '1';
  const db = openDatabase(':memory:');
  const buyerAgentWallet = '0x0000000000000000000000000000000000000003';
  const gatewayPayer = '0x0000000000000000000000000000000000000004';
  upsertAgent(db, buyerAgentWallet);
  const session = createSession(db, buyerAgentWallet);
  const listing = createListing(db, {
    sellerWallet,
    listingType: 'data_pack',
    title: 'Circle gateway payer pack',
    description: 'A paid delivery pack where Gateway payer and marketplace buyer differ.',
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

  const paid = await fetch(url, {
    headers: {
      authorization: `Bearer ${session.token}`,
      'x-test-paid-wallet': gatewayPayer,
    },
  });
  assert.equal(paid.status, 200);
  const body = (await paid.json()) as {
    receipt?: { buyerWallet?: string; paymentPayer?: string };
  };
  assert.equal(body.receipt?.buyerWallet, buyerAgentWallet);
  assert.equal(body.receipt?.paymentPayer, gatewayPayer);
});

test('delivery exchanges repository handoff only after checkout', async (t) => {
  process.env.MARKETPLACE_X402_DISABLED = '1';
  const db = openDatabase(':memory:');
  const listing = createListing(db, {
    sellerWallet,
    listingType: 'data_pack',
    title: 'Repository handoff pack',
    description: 'A paid delivery pack that returns a repository link after checkout.',
    priceUsd: 1,
    deliveryMode: 'json',
    proofSummary: 'Repository name, checksum, and setup summary are visible before purchase.',
    riskLevel: 'low',
    policyFlags: [],
    deliverable: {
      kind: 'repository',
      payload: JSON.stringify({ branch: 'main', entrypoint: 'README.md' }),
      mimeType: 'application/json',
      repositoryUrl: 'https://github.com/BrunoEleodoro/circle-sema-agent-marketplace',
      instructions: 'Clone the repository and start with README.md.',
      checksum: 'sha256-demo',
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
  const body = (await paid.json()) as {
    deliverable?: {
      kind?: string;
      repositoryUrl?: string;
      instructions?: string;
      checksum?: string;
      payload?: string;
    };
  };
  assert.equal(body.deliverable?.kind, 'repository');
  assert.equal(
    body.deliverable?.repositoryUrl,
    'https://github.com/BrunoEleodoro/circle-sema-agent-marketplace',
  );
  assert.equal(body.deliverable?.instructions, 'Clone the repository and start with README.md.');
  assert.equal(body.deliverable?.checksum, 'sha256-demo');
  assert.equal(body.deliverable?.payload, JSON.stringify({ branch: 'main', entrypoint: 'README.md' }));
});

test('marketplace treasury checkout waits for seller fulfillment before payout and review', async (t) => {
  const previousX402 = process.env.MARKETPLACE_X402_DISABLED;
  const previousTreasury = process.env.MARKETPLACE_TREASURY_WALLET;
  const previousAdminToken = process.env.MARKETPLACE_ADMIN_TOKEN;
  process.env.MARKETPLACE_X402_DISABLED = '1';
  process.env.MARKETPLACE_TREASURY_WALLET = '0x00000000000000000000000000000000000000aa';
  process.env.MARKETPLACE_ADMIN_TOKEN = 'test-admin-token';
  t.after(() => {
    if (previousX402 === undefined) delete process.env.MARKETPLACE_X402_DISABLED;
    else process.env.MARKETPLACE_X402_DISABLED = previousX402;
    if (previousTreasury === undefined) delete process.env.MARKETPLACE_TREASURY_WALLET;
    else process.env.MARKETPLACE_TREASURY_WALLET = previousTreasury;
    if (previousAdminToken === undefined) delete process.env.MARKETPLACE_ADMIN_TOKEN;
    else process.env.MARKETPLACE_ADMIN_TOKEN = previousAdminToken;
  });

  const db = openDatabase(':memory:');
  const listing = createListing(db, {
    sellerWallet,
    listingType: 'expert_answer',
    title: 'Seller fulfilled research answer',
    description: 'A paid answer that the seller delivers after the buyer checks out.',
    priceUsd: 1,
    deliveryMode: 'text',
    proofSummary: 'The seller can show a redacted outline before purchase.',
    riskLevel: 'low',
    policyFlags: [],
  });
  upsertAgent(db, buyerWallet);
  const sellerSession = createSession(db, sellerWallet);
  const buyerSession = createSession(db, buyerWallet);
  const gatewayPayer = '0x00000000000000000000000000000000000000bb';

  const server = createMarketplaceServer(db).listen(0);
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  const unpaid = await fetch(`${baseUrl}/api/deliver/${listing.id}`);
  assert.equal(unpaid.status, 402);
  const unpaidBody = (await unpaid.json()) as { paymentRecipientWallet?: string };
  assert.equal(unpaidBody.paymentRecipientWallet, process.env.MARKETPLACE_TREASURY_WALLET);

  const paid = await fetch(`${baseUrl}/api/deliver/${listing.id}`, {
    headers: {
      authorization: `Bearer ${buyerSession.token}`,
      'x-test-paid-wallet': gatewayPayer,
    },
  });
  assert.equal(paid.status, 200);
  const checkout = (await paid.json()) as {
    purchaseId: string;
    deliveryStatus: string;
    sellerFulfillment?: { submit?: { path?: string }; buyerDelivery?: { path?: string } };
    receipt?: { paymentRecipientWallet?: string; sellerWallet?: string; paymentPayer?: string };
    purchase?: { payout?: { status?: string } };
  };
  assert.equal(checkout.deliveryStatus, 'awaiting_seller');
  assert.equal(checkout.receipt?.paymentRecipientWallet, process.env.MARKETPLACE_TREASURY_WALLET);
  assert.equal(checkout.receipt?.sellerWallet, sellerWallet);
  assert.equal(checkout.receipt?.paymentPayer, gatewayPayer);
  assert.equal(checkout.purchase?.payout?.status, 'awaiting_delivery');
  assert.equal(checkout.sellerFulfillment?.submit?.path, `/api/purchases/${checkout.purchaseId}/fulfill`);

  const pendingDelivery = await fetch(`${baseUrl}${checkout.sellerFulfillment?.buyerDelivery?.path}`, {
    headers: { authorization: `Bearer ${buyerSession.token}` },
  });
  assert.equal(pendingDelivery.status, 202);

  const earlyReview = await fetch(`${baseUrl}/api/reviews`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${buyerSession.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      purchaseId: checkout.purchaseId,
      score: 5,
      matchesDescription: true,
      dataVerified: true,
      text: 'Trying to review before delivery.',
    }),
  });
  assert.equal(earlyReview.status, 400);

  const fulfilled = await fetch(`${baseUrl}/api/purchases/${checkout.purchaseId}/fulfill`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${sellerSession.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      deliverable: {
        kind: 'link',
        payload: 'https://example.com/private-answer',
        mimeType: 'text/plain',
        uri: 'https://example.com/private-answer',
        instructions: 'Open the link with the buyer passphrase sent in payload.',
      },
    }),
  });
  assert.equal(fulfilled.status, 201);
  const fulfillment = (await fulfilled.json()) as {
    purchase?: { deliveryStatus?: string; payout?: { status?: string } };
    deliverable?: { kind?: string; uri?: string };
  };
  assert.equal(fulfillment.purchase?.deliveryStatus, 'delivered');
  assert.equal(fulfillment.purchase?.payout?.status, 'pending_release');
  assert.equal(fulfillment.deliverable?.kind, 'link');
  assert.equal(fulfillment.deliverable?.uri, 'https://example.com/private-answer');

  const delivered = await fetch(`${baseUrl}/api/purchases/${checkout.purchaseId}/deliverable`, {
    headers: { authorization: `Bearer ${buyerSession.token}` },
  });
  assert.equal(delivered.status, 200);
  const deliveredBody = (await delivered.json()) as {
    payload?: string;
    reviewPrompt?: { purchaseId?: string };
  };
  assert.equal(deliveredBody.payload, 'https://example.com/private-answer');
  assert.equal(deliveredBody.reviewPrompt?.purchaseId, checkout.purchaseId);

  const unauthorizedPayouts = await fetch(`${baseUrl}/api/payouts/pending`);
  assert.equal(unauthorizedPayouts.status, 401);

  const pendingPayouts = await fetch(`${baseUrl}/api/payouts/pending`, {
    headers: { 'x-marketplace-admin-token': 'test-admin-token' },
  });
  assert.equal(pendingPayouts.status, 200);
  const pendingPayoutBody = (await pendingPayouts.json()) as {
    payouts?: Array<{ id?: string; payout?: { status?: string; suggestedCommand?: string } }>;
  };
  assert.equal(pendingPayoutBody.payouts?.[0]?.id, checkout.purchaseId);
  assert.equal(pendingPayoutBody.payouts?.[0]?.payout?.status, 'pending_release');
  assert.match(pendingPayoutBody.payouts?.[0]?.payout?.suggestedCommand ?? '', /circle wallet transfer/);

  const payoutTx = `0x${'a'.repeat(64)}`;
  const markedPaid = await fetch(`${baseUrl}/api/payouts/${checkout.purchaseId}/mark-paid`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-admin-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ transactionHash: payoutTx, receipt: 'manual seller payout recorded' }),
  });
  assert.equal(markedPaid.status, 200);
  const paidPayout = (await markedPaid.json()) as {
    purchase?: { payout?: { status?: string; transactionHash?: string } };
  };
  assert.equal(paidPayout.purchase?.payout?.status, 'paid');
  assert.equal(paidPayout.purchase?.payout?.transactionHash, payoutTx);

  const review = await fetch(`${baseUrl}/api/reviews`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${buyerSession.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      purchaseId: checkout.purchaseId,
      score: 5,
      matchesDescription: true,
      dataVerified: true,
      text: 'Seller delivered after checkout and the data was real.',
    }),
  });
  assert.equal(review.status, 201);
});
