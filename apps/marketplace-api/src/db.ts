import { createHash, randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { databasePath, nowMs } from './config';
import { assertListingPolicy } from './policy';
import {
  createListingSchema,
  deliverableSchema,
  reviewSchema,
  type CreateListingInput,
  type DeliverableInput,
  type DeliverableRecord,
  type ListingRecord,
  type ParsedDeliverableInput,
  type PurchaseRecord,
  type ReleasePayoutInput,
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
      kind TEXT NOT NULL DEFAULT 'text',
      payload TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      filename TEXT,
      uri TEXT,
      repository_url TEXT,
      instructions TEXT,
      checksum TEXT,
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
      payment_recipient_wallet TEXT,
      delivery_status TEXT NOT NULL DEFAULT 'delivered',
      delivered_at INTEGER,
      payout_status TEXT NOT NULL DEFAULT 'not_required',
      payout_transaction_hash TEXT,
      payout_receipt TEXT,
      payout_released_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (listing_id) REFERENCES listings(id),
      FOREIGN KEY (buyer_wallet) REFERENCES agents(wallet_address),
      FOREIGN KEY (seller_wallet) REFERENCES agents(wallet_address)
    );

    CREATE TABLE IF NOT EXISTS purchase_deliverables (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL DEFAULT 'text',
      payload TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      filename TEXT,
      uri TEXT,
      repository_url TEXT,
      instructions TEXT,
      checksum TEXT,
      encrypted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL UNIQUE,
      listing_id TEXT NOT NULL,
      buyer_wallet TEXT NOT NULL,
      seller_wallet TEXT NOT NULL,
      score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
      matches_description INTEGER NOT NULL,
      data_verified INTEGER NOT NULL DEFAULT 0,
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
    CREATE INDEX IF NOT EXISTS idx_purchases_seller ON purchases(seller_wallet);
    CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_wallet);
  `);
  addColumnIfMissing(db, 'deliverables', 'kind', "kind TEXT NOT NULL DEFAULT 'text'");
  addColumnIfMissing(db, 'deliverables', 'filename', 'filename TEXT');
  addColumnIfMissing(db, 'deliverables', 'uri', 'uri TEXT');
  addColumnIfMissing(db, 'deliverables', 'repository_url', 'repository_url TEXT');
  addColumnIfMissing(db, 'deliverables', 'instructions', 'instructions TEXT');
  addColumnIfMissing(db, 'deliverables', 'checksum', 'checksum TEXT');
  addColumnIfMissing(db, 'purchases', 'payment_recipient_wallet', 'payment_recipient_wallet TEXT');
  addColumnIfMissing(db, 'purchases', 'delivery_status', "delivery_status TEXT NOT NULL DEFAULT 'delivered'");
  addColumnIfMissing(db, 'purchases', 'delivered_at', 'delivered_at INTEGER');
  addColumnIfMissing(db, 'purchases', 'payout_status', "payout_status TEXT NOT NULL DEFAULT 'not_required'");
  addColumnIfMissing(db, 'purchases', 'payout_transaction_hash', 'payout_transaction_hash TEXT');
  addColumnIfMissing(db, 'purchases', 'payout_receipt', 'payout_receipt TEXT');
  addColumnIfMissing(db, 'purchases', 'payout_released_at', 'payout_released_at INTEGER');
  addColumnIfMissing(db, 'reviews', 'data_verified', 'data_verified INTEGER NOT NULL DEFAULT 0');
  db.exec(`
    UPDATE purchases
    SET payment_recipient_wallet = seller_wallet
    WHERE payment_recipient_wallet IS NULL
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_purchases_payout ON purchases(payout_status)');
}

function addColumnIfMissing(db: MarketplaceDb, table: string, column: string, definition: string): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (rows.some((row) => row.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
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

function deliverableValues(deliverable: ParsedDeliverableInput): [
  string,
  string,
  string,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
] {
  return [
    deliverable.kind,
    deliverable.payload,
    deliverable.mimeType,
    deliverable.filename ?? null,
    deliverable.uri ?? null,
    deliverable.repositoryUrl ?? null,
    deliverable.instructions ?? null,
    deliverable.checksum ?? null,
  ];
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
    const values = deliverableValues(parsed.deliverable);
    db.prepare(`
      INSERT INTO deliverables (
        id, listing_id, kind, payload, mime_type, content_hash, filename, uri,
        repository_url, instructions, checksum, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      id,
      values[0],
      values[1],
      values[2],
      sha256(values[1]),
      values[3],
      values[4],
      values[5],
      values[6],
      values[7],
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
         WHERE status = 'active' AND (
           lower(id) LIKE ?
           OR lower(title) LIKE ?
           OR lower(description) LIKE ?
           OR lower(proof_summary) LIKE ?
           OR lower(policy_flags) LIKE ?
         )
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(q, q, q, q, q, safeLimit) as ListingRecord[];
  }
  return db
    .prepare("SELECT * FROM listings WHERE status = 'active' ORDER BY created_at DESC LIMIT ?")
    .all(safeLimit) as ListingRecord[];
}

export function getDeliverable(db: MarketplaceDb, listingId: string): DeliverableRecord | null {
  return (
    db
      .prepare(
        `SELECT payload, mime_type, content_hash, kind, filename, uri, repository_url, instructions, checksum
         FROM deliverables
         WHERE listing_id = ?`,
      )
      .get(listingId) as DeliverableRecord | undefined
  ) ?? null;
}

export function getPurchaseDeliverable(db: MarketplaceDb, purchaseId: string): DeliverableRecord | null {
  return (
    db
      .prepare(
        `SELECT payload, mime_type, content_hash, kind, filename, uri, repository_url, instructions, checksum
         FROM purchase_deliverables
         WHERE purchase_id = ?`,
      )
      .get(purchaseId) as DeliverableRecord | undefined
  ) ?? null;
}

export function getDeliverableForPurchase(db: MarketplaceDb, purchase: PurchaseRecord): DeliverableRecord | null {
  return getPurchaseDeliverable(db, purchase.id) ?? getDeliverable(db, purchase.listing_id);
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
    paymentRecipientWallet?: string;
    hasImmediateDeliverable: boolean;
  },
): PurchaseRecord {
  upsertAgent(db, input.buyerWallet);
  upsertAgent(db, input.sellerWallet);
  const id = randomUUID();
  const t = nowMs();
  const paymentRecipientWallet = (input.paymentRecipientWallet ?? input.sellerWallet).toLowerCase();
  const sellerWallet = input.sellerWallet.toLowerCase();
  const platformCustody = paymentRecipientWallet !== sellerWallet;
  const deliveryStatus = input.hasImmediateDeliverable ? 'delivered' : 'awaiting_seller';
  let payoutStatus = 'not_required';
  if (platformCustody) {
    payoutStatus = input.hasImmediateDeliverable ? 'pending_release' : 'awaiting_delivery';
  }
  db.prepare(`
    INSERT INTO purchases (
      id, listing_id, buyer_wallet, seller_wallet, amount_usd, network,
      transaction_hash, payment_receipt, payment_recipient_wallet, delivery_status,
      delivered_at, payout_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.listingId,
    input.buyerWallet.toLowerCase(),
    sellerWallet,
    input.amountUsd,
    input.network,
    input.transactionHash ?? null,
    input.paymentReceipt,
    paymentRecipientWallet,
    deliveryStatus,
    input.hasImmediateDeliverable ? t : null,
    payoutStatus,
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

export function listPendingPayouts(db: MarketplaceDb): PurchaseRecord[] {
  return db
    .prepare(
      `SELECT * FROM purchases
       WHERE payout_status IN ('awaiting_delivery', 'pending_release')
       ORDER BY created_at DESC`,
    )
    .all() as PurchaseRecord[];
}

function tableCount(db: MarketplaceDb, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

export function resetMarketplaceData(db: MarketplaceDb): Record<string, number> {
  const deleted = {
    reviews: tableCount(db, 'reviews'),
    purchaseDeliverables: tableCount(db, 'purchase_deliverables'),
    purchases: tableCount(db, 'purchases'),
    deliverables: tableCount(db, 'deliverables'),
    listings: tableCount(db, 'listings'),
  };

  db.transaction(() => {
    db.prepare('DELETE FROM reviews').run();
    db.prepare('DELETE FROM purchase_deliverables').run();
    db.prepare('DELETE FROM purchases').run();
    db.prepare('DELETE FROM deliverables').run();
    db.prepare('DELETE FROM listings').run();
    db.prepare('UPDATE agents SET reputation_score = 0, review_count = 0, updated_at = ?').run(nowMs());
  })();

  return deleted;
}

export function fulfillPurchase(
  db: MarketplaceDb,
  sellerWallet: string,
  purchaseId: string,
  deliverable: DeliverableInput,
): { purchase: PurchaseRecord; deliverable: DeliverableRecord } {
  const purchase = getPurchase(db, purchaseId);
  if (!purchase) throw new Error('Purchase not found.');
  if (purchase.seller_wallet !== sellerWallet.toLowerCase()) {
    throw new Error('Only the seller wallet can fulfill this purchase.');
  }

  const parsed = deliverableSchema.parse(deliverable);
  const values = deliverableValues(parsed);
  const t = nowMs();

  db.prepare(`
    INSERT INTO purchase_deliverables (
      id, purchase_id, kind, payload, mime_type, content_hash, filename, uri,
      repository_url, instructions, checksum, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(purchase_id) DO UPDATE SET
      kind = excluded.kind,
      payload = excluded.payload,
      mime_type = excluded.mime_type,
      content_hash = excluded.content_hash,
      filename = excluded.filename,
      uri = excluded.uri,
      repository_url = excluded.repository_url,
      instructions = excluded.instructions,
      checksum = excluded.checksum
  `).run(
    randomUUID(),
    purchase.id,
    values[0],
    values[1],
    values[2],
    sha256(values[1]),
    values[3],
    values[4],
    values[5],
    values[6],
    values[7],
    t,
  );

  const payoutStatus = purchase.payout_status === 'not_required' ? 'not_required' : 'pending_release';
  db.prepare(`
    UPDATE purchases
    SET delivery_status = 'delivered',
      delivered_at = COALESCE(delivered_at, ?),
      payout_status = ?
    WHERE id = ?
  `).run(t, payoutStatus, purchase.id);

  const updated = getPurchase(db, purchase.id);
  const storedDeliverable = getPurchaseDeliverable(db, purchase.id);
  if (!updated || !storedDeliverable) throw new Error('Purchase fulfillment failed.');
  return { purchase: updated, deliverable: storedDeliverable };
}

export function releasePayout(
  db: MarketplaceDb,
  purchaseId: string,
  input: ReleasePayoutInput,
): PurchaseRecord {
  const purchase = getPurchase(db, purchaseId);
  if (!purchase) throw new Error('Purchase not found.');
  if (purchase.delivery_status !== 'delivered') {
    throw new Error('Purchase must be delivered before seller payout is released.');
  }
  if (purchase.payout_status === 'not_required') {
    throw new Error('Purchase was paid directly to the seller; no marketplace payout is required.');
  }
  if (purchase.payout_status === 'paid') {
    return purchase;
  }
  db.prepare(`
    UPDATE purchases
    SET payout_status = 'paid',
      payout_transaction_hash = ?,
      payout_receipt = ?,
      payout_released_at = ?
    WHERE id = ?
  `).run(input.transactionHash ?? null, input.receipt ?? null, nowMs(), purchase.id);

  const updated = getPurchase(db, purchase.id);
  if (!updated) throw new Error('Payout release failed.');
  return updated;
}

export function createReview(
  db: MarketplaceDb,
  buyerWallet: string,
  input: ReviewInput,
): {
  id: string;
  listingId: string;
  sellerWallet: string;
  score: number;
  matchesDescription: boolean;
  dataVerified: boolean;
  text: string;
} {
  const parsed = reviewSchema.parse(input);
  const purchase = getPurchase(db, parsed.purchaseId);
  if (!purchase) throw new Error('Purchase not found.');
  if (purchase.buyer_wallet !== buyerWallet.toLowerCase()) {
    throw new Error('Only the buyer wallet that completed the purchase can review it.');
  }
  if (purchase.delivery_status !== 'delivered') {
    throw new Error('Purchase has not been delivered yet.');
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO reviews (
      id, purchase_id, listing_id, buyer_wallet, seller_wallet, score,
      matches_description, data_verified, text, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    parsed.purchaseId,
    purchase.listing_id,
    purchase.buyer_wallet,
    purchase.seller_wallet,
    parsed.score,
    parsed.matchesDescription ? 1 : 0,
    parsed.dataVerified ? 1 : 0,
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
    dataVerified: parsed.dataVerified,
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
