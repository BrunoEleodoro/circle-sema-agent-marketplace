import { createHash, randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { databasePath, nowMs } from './config';
import { assertListingPolicy } from './policy';
import {
  createListingSchema,
  reviewSchema,
  type CreateListingInput,
  type ListingRecord,
  type PurchaseRecord,
  type ReviewInput,
} from './schema';

export type MarketplaceDb = Database.Database;

export function openDatabase(path = databasePath()): MarketplaceDb {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function migrate(db: MarketplaceDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      wallet_address TEXT PRIMARY KEY,
      chain TEXT NOT NULL DEFAULT 'BASE',
      display_name TEXT,
      reputation_score REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_nonces (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      chain TEXT NOT NULL,
      nonce TEXT NOT NULL,
      message TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (wallet_address) REFERENCES agents(wallet_address)
    );

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      seller_wallet TEXT NOT NULL,
      listing_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price_usd REAL NOT NULL,
      delivery_mode TEXT NOT NULL,
      proof_summary TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      policy_flags TEXT NOT NULL,
      sema_context TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (seller_wallet) REFERENCES agents(wallet_address)
    );

    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      encrypted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      buyer_wallet TEXT NOT NULL,
      seller_wallet TEXT NOT NULL,
      amount_usd REAL NOT NULL,
      network TEXT NOT NULL,
      transaction_hash TEXT,
      payment_receipt TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (buyer_wallet) REFERENCES agents(wallet_address),
      FOREIGN KEY (seller_wallet) REFERENCES agents(wallet_address)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL UNIQUE,
      listing_id TEXT NOT NULL,
      buyer_wallet TEXT NOT NULL,
      seller_wallet TEXT NOT NULL,
      score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
      matches_description INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id),
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (buyer_wallet) REFERENCES agents(wallet_address),
      FOREIGN KEY (seller_wallet) REFERENCES agents(wallet_address)
    );

    CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
    CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_wallet);
    CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON purchases(buyer_wallet);
    CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_wallet);
  `);
}

export function upsertAgent(
  db: MarketplaceDb,
  walletAddress: string,
  chain = 'BASE',
  displayName?: string,
): void {
  const t = nowMs();
  db.prepare(`
    INSERT INTO agents (wallet_address, chain, display_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(wallet_address) DO UPDATE SET
      chain = excluded.chain,
      display_name = COALESCE(excluded.display_name, agents.display_name),
      updated_at = excluded.updated_at
  `).run(walletAddress.toLowerCase(), chain, displayName ?? null, t, t);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createListing(db: MarketplaceDb, input: CreateListingInput): ListingRecord {
  const parsed = createListingSchema.parse(input);
  assertListingPolicy(parsed);
  upsertAgent(db, parsed.sellerWallet);
  const t = nowMs();
  const id = parsed.id ?? randomUUID();
  const policyFlags = JSON.stringify(parsed.policyFlags);
  const semaContext = JSON.stringify(parsed.semaContext);

  db.prepare(`
    INSERT INTO listings (
      id, seller_wallet, listing_type, title, description, price_usd, delivery_mode,
      proof_summary, risk_level, policy_flags, sema_context, status, expires_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(
    id,
    parsed.sellerWallet.toLowerCase(),
    parsed.listingType,
    parsed.title,
    parsed.description,
    parsed.priceUsd,
    parsed.deliveryMode,
    parsed.proofSummary,
    parsed.riskLevel,
    policyFlags,
    semaContext,
    parsed.expiresAt ?? null,
    t,
    t,
  );

  if (parsed.deliverable) {
    db.prepare(`
      INSERT INTO deliverables (id, listing_id, payload, mime_type, content_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      id,
      parsed.deliverable.payload,
      parsed.deliverable.mimeType,
      sha256(parsed.deliverable.payload),
      t,
    );
  }

  return getListing(db, id)!;
}

export function getListing(db: MarketplaceDb, id: string): ListingRecord | null {
  return (
    db.prepare('SELECT * FROM listings WHERE id = ?').get(id) as ListingRecord | undefined
  ) ?? null;
}

export function listListings(db: MarketplaceDb, query?: string, limit = 20): ListingRecord[] {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  if (query?.trim()) {
    const q = `%${query.trim().toLowerCase()}%`;
    return db
      .prepare(
        `SELECT * FROM listings
         WHERE status = 'active' AND (lower(title) LIKE ? OR lower(description) LIKE ?)
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(q, q, safeLimit) as ListingRecord[];
  }
  return db
    .prepare("SELECT * FROM listings WHERE status = 'active' ORDER BY created_at DESC LIMIT ?")
    .all(safeLimit) as ListingRecord[];
}

export function getDeliverable(db: MarketplaceDb, listingId: string): { payload: string; mime_type: string; content_hash: string } | null {
  return (
    db.prepare('SELECT payload, mime_type, content_hash FROM deliverables WHERE listing_id = ?').get(listingId) as
      | { payload: string; mime_type: string; content_hash: string }
      | undefined
  ) ?? null;
}

export function getPurchase(db: MarketplaceDb, purchaseId: string): PurchaseRecord | null {
  return (
    db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId) as PurchaseRecord | undefined
  ) ?? null;
}

export function recordPurchase(
  db: MarketplaceDb,
  input: {
    listingId: string;
    buyerWallet: string;
    sellerWallet: string;
    amountUsd: number;
    network: string;
    transactionHash?: string;
    paymentReceipt: string;
  },
): PurchaseRecord {
  upsertAgent(db, input.buyerWallet);
  upsertAgent(db, input.sellerWallet);
  const id = randomUUID();
  const t = nowMs();
  db.prepare(`
    INSERT INTO purchases (
      id, listing_id, buyer_wallet, seller_wallet, amount_usd, network,
      transaction_hash, payment_receipt, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.listingId,
    input.buyerWallet.toLowerCase(),
    input.sellerWallet.toLowerCase(),
    input.amountUsd,
    input.network,
    input.transactionHash ?? null,
    input.paymentReceipt,
    t,
  );
  return db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as PurchaseRecord;
}

export function hasPurchase(db: MarketplaceDb, listingId: string, buyerWallet: string): boolean {
  const row = db
    .prepare('SELECT id FROM purchases WHERE listing_id = ? AND buyer_wallet = ? LIMIT 1')
    .get(listingId, buyerWallet.toLowerCase());
  return Boolean(row);
}

export function createReview(
  db: MarketplaceDb,
  buyerWallet: string,
  input: ReviewInput,
): { id: string; listingId: string; sellerWallet: string; score: number; matchesDescription: boolean; text: string } {
  const parsed = reviewSchema.parse(input);
  const purchase = getPurchase(db, parsed.purchaseId);
  if (!purchase) throw new Error('Purchase not found.');
  if (purchase.buyer_wallet !== buyerWallet.toLowerCase()) {
    throw new Error('Only the buyer wallet that completed the purchase can review it.');
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO reviews (
      id, purchase_id, listing_id, buyer_wallet, seller_wallet, score,
      matches_description, text, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    parsed.purchaseId,
    purchase.listing_id,
    purchase.buyer_wallet,
    purchase.seller_wallet,
    parsed.score,
    parsed.matchesDescription ? 1 : 0,
    parsed.text,
    nowMs(),
  );

  recalculateReputation(db, purchase.seller_wallet);
  return {
    id,
    listingId: purchase.listing_id,
    sellerWallet: purchase.seller_wallet,
    score: parsed.score,
    matchesDescription: parsed.matchesDescription,
    text: parsed.text,
  };
}

export function recalculateReputation(db: MarketplaceDb, sellerWallet: string): void {
  const row = db
    .prepare('SELECT AVG(score) AS avg_score, COUNT(*) AS count FROM reviews WHERE seller_wallet = ?')
    .get(sellerWallet.toLowerCase()) as { avg_score: number | null; count: number };
  db.prepare('UPDATE agents SET reputation_score = ?, review_count = ?, updated_at = ? WHERE wallet_address = ?').run(
    row.avg_score ?? 0,
    row.count,
    nowMs(),
    sellerWallet.toLowerCase(),
  );
}

export function getReputation(
  db: MarketplaceDb,
  sellerWallet: string,
): { walletAddress: string; reputationScore: number; reviewCount: number } {
  const row = db.prepare('SELECT wallet_address, reputation_score, review_count FROM agents WHERE wallet_address = ?').get(
    sellerWallet.toLowerCase(),
  ) as { wallet_address: string; reputation_score: number; review_count: number } | undefined;
  return {
    walletAddress: sellerWallet.toLowerCase(),
    reputationScore: row?.reputation_score ?? 0,
    reviewCount: row?.review_count ?? 0,
  };
}

