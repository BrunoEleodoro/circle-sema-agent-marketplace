import { z } from 'zod';
import { SEMA_HANDLES, SEMA_ROOT } from './config';

export const listingTypes = [
  'data_pack',
  'warm_intro',
  'message_relay',
  'sponsored_distribution',
  'community_query',
  'expert_answer',
  'proof_service',
  'local_check',
] as const;

export const riskLevels = ['low', 'medium', 'high'] as const;

export const deliveryModes = ['markdown', 'json', 'csv', 'zip', 'intro_service', 'relay', 'text'] as const;
export const deliverableKinds = ['text', 'file', 'repository', 'dataset', 'link'] as const;

export const semaContextSchema = z
  .object({
    semaRoot: z.string().min(1).default(SEMA_ROOT),
    handles: z.array(z.string().min(1)).default([...SEMA_HANDLES]),
    contextHash: z.string().optional(),
  })
  .default({ semaRoot: SEMA_ROOT, handles: [...SEMA_HANDLES] });

export const createListingSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,80}$/).optional(),
  sellerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  listingType: z.enum(listingTypes),
  title: z.string().min(4).max(140),
  description: z.string().min(20).max(2000),
  priceUsd: z.number().positive().max(10000),
  deliveryMode: z.enum(deliveryModes),
  proofSummary: z.string().min(8).max(2000),
  riskLevel: z.enum(riskLevels).default('low'),
  policyFlags: z.array(z.string().min(1)).default([]),
  semaContext: semaContextSchema,
  expiresAt: z.number().int().positive().optional(),
  deliverable: z
    .object({
      kind: z.enum(deliverableKinds).default('text'),
      payload: z.string().min(1).max(200_000),
      mimeType: z.string().min(3).max(120).default('text/plain'),
      filename: z.string().min(1).max(180).optional(),
      uri: z.string().url().optional(),
      repositoryUrl: z.string().url().optional(),
      instructions: z.string().min(1).max(2000).optional(),
      checksum: z.string().min(8).max(160).optional(),
    })
    .superRefine((deliverable, ctx) => {
      if (deliverable.kind === 'file' && !deliverable.filename && !deliverable.uri) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'file deliverables require filename or uri.',
          path: ['filename'],
        });
      }
      if (deliverable.kind === 'repository' && !deliverable.repositoryUrl && !deliverable.uri) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'repository deliverables require repositoryUrl or uri.',
          path: ['repositoryUrl'],
        });
      }
    })
    .optional(),
});

export const reviewSchema = z.object({
  purchaseId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  matchesDescription: z.boolean(),
  dataVerified: z.boolean().default(false),
  text: z.string().min(3).max(2000),
});

export type CreateListingInput = z.input<typeof createListingSchema>;
export type ParsedListingInput = z.output<typeof createListingSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ListingType = (typeof listingTypes)[number];
export type DeliverableKind = (typeof deliverableKinds)[number];

export interface ListingRecord {
  id: string;
  seller_wallet: string;
  listing_type: ListingType;
  title: string;
  description: string;
  price_usd: number;
  delivery_mode: string;
  proof_summary: string;
  risk_level: string;
  policy_flags: string;
  sema_context: string;
  status: string;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface PurchaseRecord {
  id: string;
  listing_id: string;
  buyer_wallet: string;
  seller_wallet: string;
  amount_usd: number;
  network: string;
  transaction_hash: string | null;
  payment_receipt: string;
  created_at: number;
}

export interface DeliverableRecord {
  payload: string;
  mime_type: string;
  content_hash: string;
  kind: DeliverableKind;
  filename: string | null;
  uri: string | null;
  repository_url: string | null;
  instructions: string | null;
  checksum: string | null;
}
