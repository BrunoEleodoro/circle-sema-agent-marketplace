export type Chain =
  | 'BASE'
  | 'BASE-SEPOLIA'
  | 'ETH'
  | 'ETH-SEPOLIA'
  | 'ARB'
  | 'ARB-SEPOLIA'
  | 'OP'
  | 'OP-SEPOLIA'
  | 'ARC-TESTNET';

export interface AgentWallet {
  address: string;
  chain: Chain;
}

export interface TokenBalance {
  symbol: string;
  amount: string;
}

export interface WalletBalance {
  address: string;
  chain: Chain;
  tokens: TokenBalance[];
}

export interface Service {
  url: string;
  name: string;
  description?: string;
  price?: string;
}

export interface ServiceInspection extends Service {
  schema?: unknown;
  health?: 'healthy' | 'degraded' | 'down' | string;
}

export interface PaymentResult {
  txHash: string;
  serviceUrl: string;
  amount: string;
}
