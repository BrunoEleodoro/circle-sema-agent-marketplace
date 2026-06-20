import type { DeliverableRecord, PurchaseRecord } from './schema';

const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export function deliverableJson(deliverable: DeliverableRecord): Record<string, unknown> {
  return {
    kind: deliverable.kind,
    mimeType: deliverable.mime_type,
    contentHash: deliverable.content_hash,
    payload: deliverable.payload,
    filename: deliverable.filename,
    uri: deliverable.uri,
    repositoryUrl: deliverable.repository_url,
    instructions: deliverable.instructions,
    checksum: deliverable.checksum,
  };
}

export function reviewPromptJson(purchase: PurchaseRecord): Record<string, unknown> {
  return {
    purchaseId: purchase.id,
    sellerWallet: purchase.seller_wallet,
    questions: [
      {
        field: 'dataVerified',
        type: 'boolean',
        prompt: 'Does the delivered data, file, repository, dataset, or information appear real and usable?',
      },
      {
        field: 'matchesDescription',
        type: 'boolean',
        prompt: 'Does the delivered item match the listing description and proof summary?',
      },
      {
        field: 'score',
        type: 'integer',
        min: 1,
        max: 5,
        prompt: 'Rate the seller from 1 to 5.',
      },
      {
        field: 'text',
        type: 'string',
        prompt: 'Write a short review explaining the data quality and seller rating.',
      },
    ],
    submit: {
      method: 'POST',
      path: '/api/reviews',
      requiresBuyerBearerToken: true,
    },
  };
}

export function suggestedPayoutCommand(purchase: PurchaseRecord): string | null {
  if (purchase.payout_status !== 'pending_release' || !purchase.payment_recipient_wallet) {
    return null;
  }
  return [
    'circle wallet transfer',
    purchase.seller_wallet,
    `--amount ${purchase.amount_usd}`,
    `--token ${BASE_USDC_ADDRESS}`,
    `--address ${purchase.payment_recipient_wallet}`,
    '--chain BASE',
    '--output json',
  ].join(' ');
}

export function purchaseJson(purchase: PurchaseRecord): Record<string, unknown> {
  return {
    id: purchase.id,
    listingId: purchase.listing_id,
    buyerWallet: purchase.buyer_wallet,
    sellerWallet: purchase.seller_wallet,
    amountUsd: purchase.amount_usd,
    network: purchase.network,
    transactionHash: purchase.transaction_hash,
    paymentRecipientWallet: purchase.payment_recipient_wallet,
    deliveryStatus: purchase.delivery_status,
    deliveredAt: purchase.delivered_at,
    payout: {
      status: purchase.payout_status,
      transactionHash: purchase.payout_transaction_hash,
      receipt: purchase.payout_receipt,
      releasedAt: purchase.payout_released_at,
      suggestedCommand: suggestedPayoutCommand(purchase),
    },
    createdAt: purchase.created_at,
  };
}
