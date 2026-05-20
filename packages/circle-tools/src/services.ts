import { runCircle, runCircleJson } from './cli';
import type { Chain, PaymentResult, Service, ServiceInspection } from './types';

const DEFAULT_CHAIN: Chain = 'BASE';
const TX_HASH_REGEX = /0x[a-fA-F0-9]{64}/;

export interface SearchServicesInput {
  keyword: string;
}

export interface InspectServiceInput {
  url: string;
}

export interface PayServiceInput {
  url: string;
  address: string;
  chain?: Chain;
  data: Record<string, unknown>;
}

interface RawSearchItem {
  resource?: string;
  accepts?: Array<{ amount?: string; network?: string }>;
  metadata?: {
    description?: string;
    provider?: { name?: string };
  };
}

interface RawSearchEnvelope {
  data?: { items?: RawSearchItem[] };
  items?: RawSearchItem[];
}

/** `circle services search "<keyword>" --output json` */
export async function searchServices(input: SearchServicesInput): Promise<Service[]> {
  const envelope = runCircleJson<RawSearchEnvelope>([
    'services',
    'search',
    input.keyword,
    '--output',
    'json',
  ]);
  const items = (envelope.data?.items ?? envelope.items) ?? [];
  return items.map((item) => ({
    url: item.resource ?? '',
    name: item.metadata?.provider?.name ?? item.resource ?? '',
    description: item.metadata?.description,
    price: item.accepts?.[0]?.amount,
  }));
}

/** `circle services inspect "<url>" --output json` */
export async function inspectService(input: InspectServiceInput): Promise<ServiceInspection> {
  const envelope = runCircleJson<{ data?: ServiceInspection } | ServiceInspection>([
    'services',
    'inspect',
    input.url,
    '--output',
    'json',
  ]);
  return (envelope as { data?: ServiceInspection }).data ?? (envelope as ServiceInspection);
}

/** `circle services pay "<url>" --address <addr> --chain BASE --data '{"key":"value"}'` */
export async function payService(input: PayServiceInput): Promise<PaymentResult> {
  const chain = input.chain ?? DEFAULT_CHAIN;
  const out = runCircle([
    'services',
    'pay',
    input.url,
    '--address',
    input.address,
    '--chain',
    chain,
    '--data',
    JSON.stringify(input.data),
  ]);
  const trimmed = out.trim();
  try {
    const parsed = JSON.parse(trimmed) as Partial<PaymentResult>;
    if (parsed.txHash) {
      return {
        txHash: parsed.txHash,
        serviceUrl: parsed.serviceUrl ?? input.url,
        amount: parsed.amount ?? '',
      };
    }
  } catch {
    // fall through to regex extraction
  }
  const txHash = trimmed.match(TX_HASH_REGEX)?.[0];
  if (!txHash) {
    throw new Error(`circle services pay returned no transaction hash. Raw output:\n${out}`);
  }
  return { txHash, serviceUrl: input.url, amount: '' };
}
