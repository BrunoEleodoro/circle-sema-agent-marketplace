import type { NextFunction, Request, Response } from 'express';
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server';
import { walletFromAuthorizationHeader } from './auth';
import { marketplaceTreasuryWallet } from './config';
import { getDeliverable, getListing, recordPurchase, type MarketplaceDb } from './db';
import { deliverableJson, purchaseJson, reviewPromptJson } from './presenters';

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

const BASE_GATEWAY_NETWORK = 'eip155:8453';

function priceString(priceUsd: number): string {
  return `$${priceUsd.toFixed(2)}`;
}

function testPaymentsEnabled(): boolean {
  return process.env.MARKETPLACE_X402_DISABLED === '1';
}

function paymentRecipientFor(listing: { seller_wallet: string }): string {
  return marketplaceTreasuryWallet() ?? listing.seller_wallet;
}

function paymentRequired(res: Response, listing: { id: string; price_usd: number; seller_wallet: string }): void {
  const body: Record<string, unknown> = {
    error: 'Payment required.',
    listingId: listing.id,
    priceUsd: listing.price_usd,
    sellerWallet: listing.seller_wallet,
    paymentRecipientWallet: paymentRecipientFor(listing),
  };
  if (testPaymentsEnabled()) {
    body.testPaymentHeader = 'x-test-paid-wallet';
  }
  res.status(402).json(body);
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
  const purchase = recordPurchase(db, {
    listingId: listing.id,
    buyerWallet,
    sellerWallet: listing.seller_wallet,
    amountUsd: listing.price_usd,
    network,
    transactionHash,
    paymentReceipt,
    paymentRecipientWallet: paymentRecipientFor(listing),
    hasImmediateDeliverable: Boolean(deliverable),
  });
  const baseResponse = {
    listingId: listing.id,
    purchaseId: purchase.id,
    purchase: purchaseJson(purchase),
    deliveryStatus: purchase.delivery_status,
    sellerFulfillment:
      purchase.delivery_status === 'awaiting_seller'
        ? {
            status: 'awaiting_seller',
            submit: {
              method: 'POST',
              path: `/api/purchases/${purchase.id}/fulfill`,
              requiresSellerBearerToken: true,
            },
            buyerDelivery: {
              method: 'GET',
              path: `/api/purchases/${purchase.id}/deliverable`,
              requiresBuyerBearerToken: true,
            },
          }
        : null,
    receipt: {
      buyerWallet,
      paymentPayer,
      sellerWallet: listing.seller_wallet,
      paymentRecipientWallet: paymentRecipientFor(listing),
      amountUsd: listing.price_usd,
      network,
      transactionHash,
      paymentReceipt,
    },
  };

  if (!deliverable) {
    res.json(baseResponse);
    return;
  }

  res.type(deliverable.mime_type).json({
    ...baseResponse,
    contentHash: deliverable.content_hash,
    mimeType: deliverable.mime_type,
    deliverable: deliverableJson(deliverable),
    payload: deliverable.payload,
    reviewPrompt: reviewPromptJson(purchase),
  });
}

function productionGatewayFor(listing: NonNullable<ReturnType<typeof getListing>>) {
  const facilitatorUrl = process.env.CIRCLE_GATEWAY_FACILITATOR_URL ?? 'https://gateway-api.circle.com';
  return createGatewayMiddleware({
    sellerAddress: paymentRecipientFor(listing),
    networks: BASE_GATEWAY_NETWORK,
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
