import type { NextFunction, Request, Response } from 'express';
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server';
import { walletFromAuthorizationHeader } from './auth';
import { getDeliverable, getListing, recordPurchase, type MarketplaceDb } from './db';

interface PaidRequest extends Request {
  payment?: {
    verified: boolean;
    payer: string;
    amount: string;
    network: string;
    transaction?: string;
    receipt?: string;
  };
}

function priceString(priceUsd: number): string {
  return `$${priceUsd.toFixed(2)}`;
}

function testPaymentsEnabled(): boolean {
  return process.env.MARKETPLACE_X402_DISABLED === '1';
}

function paymentRequired(res: Response, listing: { id: string; price_usd: number; seller_wallet: string }): void {
  res.status(402).json({
    error: 'Payment required.',
    listingId: listing.id,
    priceUsd: listing.price_usd,
    sellerWallet: listing.seller_wallet,
    testPaymentHeader: 'x-test-paid-wallet',
  });
}

function deliverPaidContent(
  db: MarketplaceDb,
  req: PaidRequest,
  res: Response,
  listing: NonNullable<ReturnType<typeof getListing>>,
  buyerWallet: string,
  paymentReceipt: string,
  network: string,
  transactionHash?: string,
  paymentPayer?: string,
): void {
  const deliverable = getDeliverable(db, listing.id);
  if (!deliverable) {
    res.status(404).json({ error: 'Deliverable not found.' });
    return;
  }

  const purchase = recordPurchase(db, {
    listingId: listing.id,
    buyerWallet,
    sellerWallet: listing.seller_wallet,
    amountUsd: listing.price_usd,
    network,
    transactionHash,
    paymentReceipt,
  });

  res.type(deliverable.mime_type).json({
    listingId: listing.id,
    purchaseId: purchase.id,
    contentHash: deliverable.content_hash,
    mimeType: deliverable.mime_type,
    deliverable: {
      kind: deliverable.kind,
      mimeType: deliverable.mime_type,
      contentHash: deliverable.content_hash,
      payload: deliverable.payload,
      filename: deliverable.filename,
      uri: deliverable.uri,
      repositoryUrl: deliverable.repository_url,
      instructions: deliverable.instructions,
      checksum: deliverable.checksum,
    },
    payload: deliverable.payload,
    receipt: {
      buyerWallet,
      paymentPayer,
      sellerWallet: listing.seller_wallet,
      amountUsd: listing.price_usd,
      network,
      transactionHash,
      paymentReceipt,
    },
  });
}

function productionGatewayFor(listing: NonNullable<ReturnType<typeof getListing>>) {
  const facilitatorUrl = process.env.CIRCLE_GATEWAY_FACILITATOR_URL ?? 'https://gateway-api.circle.com';
  return createGatewayMiddleware({
    sellerAddress: listing.seller_wallet,
    facilitatorUrl,
  });
}

export function deliverListing(db: MarketplaceDb) {
  return (req: PaidRequest, res: Response, _next: NextFunction): void => {
    const idParam = req.params.id;
    const listingId = Array.isArray(idParam) ? idParam[0] : idParam;
    const listing = getListing(db, listingId ?? '');
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    if (testPaymentsEnabled()) {
      const paymentPayer = req.header('x-test-paid-wallet');
      const buyerWallet = walletFromAuthorizationHeader(db, req.header('authorization')) ?? paymentPayer;
      if (!buyerWallet || !paymentPayer) {
        paymentRequired(res, listing);
        return;
      }
      deliverPaidContent(db, req, res, listing, buyerWallet, 'test-payment-receipt', 'testnet', undefined, paymentPayer);
      return;
    }

    const gateway = productionGatewayFor(listing);
    const requirePayment = gateway.require(priceString(listing.price_usd));
    requirePayment(req, res, () => {
      const payment = req.payment;
      if (!payment?.payer) {
        paymentRequired(res, listing);
        return;
      }
      deliverPaidContent(
        db,
        req,
        res,
        listing,
        walletFromAuthorizationHeader(db, req.header('authorization')) ?? payment.payer,
        payment.receipt ?? JSON.stringify(payment),
        payment.network ?? 'unknown',
        payment.transaction,
        payment.payer,
      );
    });
  };
}
