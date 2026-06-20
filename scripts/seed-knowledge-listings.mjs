#!/usr/bin/env node
import { createHash } from 'node:crypto';

const apiUrl = requiredEnv('MARKETPLACE_API_URL').replace(/\/+$/, '');
const sellerWallet = requiredEnv('MARKETPLACE_SELLER_WALLET').toLowerCase();
const sellerToken = requiredEnv('MARKETPLACE_TOKEN');
const adminToken = process.env.MARKETPLACE_ADMIN_TOKEN;
const shouldReset = process.env.RESET_MARKETPLACE === '1';
const skipExisting = process.env.SKIP_EXISTING === '1';

const semaContext = {
  semaRoot: 'circle-sema-marketplace',
  handles: ['Card#6848', 'AcceptSpec#b77c', 'CiteBack#69ec', 'Probe#12d8', 'Judge#efe0'],
  contextHash: 'knowledge-catalog-2026-06-20',
};

const listings = [
  pack({
    id: 'pods-smart-wallet-creation-pack',
    title: 'Pods smart wallet creation implementation pack',
    description:
      'Markdown guide for implementing Pods-style smart wallet creation, deterministic Safe accounts, gas sponsorship, and RPC proxy verification.',
    filename: 'pods-smart-wallet-creation.md',
    proofSummary:
      'Derived from Pods wallet smart account docs, smart account helpers, and RPC proxy flow notes.',
    tags: ['pods', 'wallet', 'safe', 'erc-4337', 'base'],
    markdown: `# Pods Smart Wallet Creation Implementation Pack

## What this gives you

A repo-grounded implementation map for creating a Pods-style wallet with an EOA owner, a deterministic Safe smart account, sponsored UserOperations, and a server-side RPC proxy.

## Source map

- \`pods-wallet/docs/flows/06-smart-account-flow.md\`
- \`pods-wallet/lib/SmartAccount.ts\`
- \`pods-wallet/lib/server-smart-account.ts\`
- \`pods-wallet/lib/auth.ts\`
- \`pods-wallet/lib/wagmi-config.ts\`
- \`pods-wallet/app/api/rpc/[chainId]/route.ts\`

## Architecture

The user connects an EOA through Wagmi. The app derives a Safe smart account from the EOA plus a deterministic salt. On the first transaction, the UserOperation includes account deployment data. Later transactions reuse the deployed account. The app asks a bundler to estimate gas, asks a paymaster to sponsor gas, signs the UserOperation with the EOA, submits it, then polls for a receipt.

## Build steps

1. Configure Wagmi chains and transports for Base first.
2. Create a smart account helper that accepts owner address, chain id, and signer.
3. Derive the smart account deterministically so the same owner maps to the same account.
4. Route bundler and paymaster calls through a server endpoint so provider credentials remain server-side.
5. On first send, include account deployment init data.
6. Sign the UserOperation in the browser with the connected EOA.
7. Submit through the RPC proxy and wait for the UserOperation receipt.
8. Store the smart account address in the profile after the first successful derivation.

## RPC proxy checklist

- Require app auth before forwarding requests.
- Allow only configured chain ids.
- Map chain id to the correct upstream RPC or bundler URL.
- Do not log full signed payloads in production.
- Return the upstream JSON-RPC result without changing its shape.

## Verification

- New wallet derives a stable smart account address.
- First transaction deploys the account and executes the target call.
- Later transactions do not include deployment data.
- User does not need native gas for sponsored operations.
- Failed sponsorship surfaces a clear retryable error.

## Common mistakes

- Mixing EOA address and smart account address in balance calls.
- Letting frontend code hold server provider credentials.
- Assuming every chain has the same paymaster support.
- Treating UserOperation hash as the final transaction hash before the receipt arrives.
`,
  }),
  pack({
    id: 'pods-earn-widget-integration-pack',
    title: 'Pods Earn widget integration pack',
    description:
      'Markdown guide for embedding the Deframe Earn widget in a Pods-style app, loading strategies, positions, balances, and transaction history.',
    filename: 'pods-earn-widget-integration.md',
    proofSummary:
      'Built from Deframe EarnWidget docs, strategy flow notes, and Pods host integration patterns.',
    tags: ['pods', 'deframe', 'earn', 'yield', 'widget'],
    markdown: `# Pods Earn Widget Integration Pack

## What this gives you

A practical integration guide for adding an Earn widget to a web3 app while keeping the host app in charge of wallet connection, transaction execution, and status updates.

## Source map

- \`deframe-sdk/EARNWIDGET_INTEGRATION.md\`
- \`deframe-sdk/docs/flows/02-earn-strategies-flow.md\`
- \`deframe-sdk/examples/earn-widget\`
- \`pods-wallet/docs/flows/08-deframe-integration.md\`

## Minimal integration shape

1. Install the SDK package.
2. Import the SDK stylesheet once in the app entry point.
3. Wrap the widget area in \`DeframeProvider\`.
4. Pass the connected wallet address into provider config.
5. Provide a \`processBytecode\` bridge if the host app executes transactions itself.

## Data flow

The widget loads strategies, user positions, token balances, and transaction history. It combines strategy metadata with the connected wallet state to render the overview, details, deposit, withdraw, investment details, and history screens.

## Host responsibilities

- Own wallet connection and authentication.
- Supply the active wallet address.
- Keep chain switching explicit and observable.
- Execute returned bytecode through the host wallet or smart account system.
- Send transaction state updates back to the widget.

## UX checklist

- Show loading while strategies and positions are fetched.
- Keep mobile navigation compact with overview, explore, and history tabs.
- Render empty positions as an action state, not an error.
- Treat deposit and withdraw as separate flows with separate success states.
- Preserve transaction history when the user navigates away and back.

## Verification

- Strategy list renders for a fresh wallet.
- Existing positions merge with strategy metadata.
- Deposit returns bytecode and host transaction execution starts.
- Withdraw handles missing balances, declined signature, submitted, confirmed, and reverted states.
- History shows completed and pending operations.
`,
  }),
  pack({
    id: 'pods-swap-widget-integration-pack',
    title: 'Pods Swap widget integration pack',
    description:
      'Markdown guide for embedding a Deframe Swap widget, quote lifecycle, approval handling, cross-chain states, and host bytecode execution.',
    filename: 'pods-swap-widget-integration.md',
    proofSummary:
      'Built from Deframe swap flow docs and Pods transaction execution integration notes.',
    tags: ['pods', 'deframe', 'swap', 'base', 'cross-chain'],
    markdown: `# Pods Swap Widget Integration Pack

## What this gives you

A build map for adding a swap widget to a host app without giving the widget custody over the user wallet. The widget prepares quotes and bytecode. The host executes and reports status.

## Source map

- \`deframe-sdk/docs/flows/05-swap-flow.md\`
- \`deframe-sdk/src/ui/swap-form\`
- \`deframe-sdk/src/hooks/useSwapBytecode.ts\`
- \`pods-wallet/docs/flows/08-deframe-integration.md\`

## Swap lifecycle

1. User selects origin token, destination token, origin chain, and amount.
2. Widget requests a quote.
3. User reviews route, rate, output estimate, and fees.
4. Widget checks whether approval is needed.
5. Widget requests bytecode for approval and swap execution.
6. Host app executes bytecode.
7. Widget receives transaction updates and renders completion or failure.

## Same-chain versus cross-chain

Same-chain swaps usually resolve as a single execution path. Cross-chain swaps need a source transaction, bridge monitoring, and destination confirmation. The UI should make the intermediate waiting state explicit.

## State handling checklist

- Debounce quote refreshes while the user types.
- Invalidate quotes when token, chain, amount, or wallet changes.
- Do not let stale quote ids submit after a fast token switch.
- Separate signature declined from transaction reverted.
- Surface destination transaction hash for cross-chain completion.

## Host bytecode bridge

The bridge should accept one or more transactions, switch to the requested chain, ask the wallet or smart account to sign, submit the transaction, wait for confirmation, then call \`updateTxStatus\` with signed, submitted, confirmed, finalized, declined, or reverted events.

## Verification

- Quote refreshes after amount and token changes.
- Approval path runs before swap when allowance is missing.
- Same-chain swap completes and displays a final hash.
- Cross-chain swap shows source and destination progress.
- Rejected signatures do not leave the widget stuck in processing.
`,
  }),
  pack({
    id: 'pods-deframe-host-integration-pack',
    title: 'Pods Deframe host integration operations pack',
    description:
      'Markdown guide for connecting Pods wallet infrastructure to Deframe widgets with host-owned bytecode execution and transaction status updates.',
    filename: 'pods-deframe-host-integration.md',
    proofSummary:
      'Derived from Pods Deframe integration docs and transaction state machine notes.',
    tags: ['pods', 'deframe', 'host-app', 'transactions'],
    markdown: `# Pods Deframe Host Integration Operations Pack

## What this gives you

A host integration model for apps that want Deframe widgets for UX while retaining control of smart account execution, transaction signing, and state reporting.

## Source map

- \`pods-wallet/docs/flows/08-deframe-integration.md\`
- \`pods-wallet/DEFRAME_INTEGRATION.md\`
- \`pods-wallet/components/deframe/DeframeWrapper.tsx\`
- \`pods-wallet/hooks/useDeframeTransaction.ts\`

## Boundary

The SDK owns widget screens and asks for bytecode. The host owns wallet auth, chain switching, signature prompts, UserOperation submission, and final receipt polling.

## Transaction state machine

- \`HOST_ACK\`: host accepted the bytecode request.
- \`SIGNATURE_PROMPTED\`: user is being asked to sign.
- \`SIGNED\`: payload is signed.
- \`TX_SUBMITTED\`: transaction or UserOperation is submitted.
- \`TX_CONFIRMED\`: execution is confirmed on-chain.
- \`TX_FINALIZED\`: widget can close the flow.
- \`SIGNATURE_DECLINED\`, \`SIGNATURE_ERROR\`, \`TX_REVERTED\`: terminal failure paths.

## Implementation notes

1. Keep the wrapper thin. It should adapt SDK calls to host hooks.
2. Validate target chain before executing bytecode.
3. Batch bytecodes when the wallet or smart account supports batching.
4. Use a single state update function so all widgets get consistent status.
5. Refresh balances only after confirmed or finalized states.

## Verification

- Earn deposit calls host \`processBytecode\`.
- Swap calls host \`processBytecode\`.
- Declined signatures return control to the widget.
- Reverted transactions show a recoverable error.
- Confirmed transactions refresh balances and history.
`,
  }),
  pack({
    id: 'privy-deframe-boilerplate-pack',
    title: 'Privy plus Deframe boilerplate pack',
    description:
      'Markdown boilerplate for wiring Privy embedded wallets and smart wallets into a Deframe widget host app.',
    filename: 'privy-deframe-boilerplate.md',
    proofSummary:
      'Built from Deframe Privy integration examples and embedded wallet host patterns.',
    tags: ['privy', 'deframe', 'embedded-wallets', 'boilerplate'],
    markdown: `# Privy Plus Deframe Boilerplate Pack

## What this gives you

A starting point for a React app that uses Privy for embedded wallets and Deframe widgets for earn or swap flows.

## Source map

- \`deframe-sdk/README.md\`
- \`deframe-sdk/INTEGRATION.md\`
- \`deframe-sdk/examples/earn-widget/src/Builder.tsx\`

## Install

\`\`\`bash
pnpm add @privy-io/react-auth viem deframe-sdk
\`\`\`

## Provider setup

\`\`\`tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
\`\`\`

## Deframe widget wrapper

\`\`\`tsx
'use client'

import { useWallets } from '@privy-io/react-auth'
import { DeframeProvider, EarnWidget } from 'deframe-sdk'
import 'deframe-sdk/styles.css'

export function EarnPanel() {
  const { wallets, ready } = useWallets()
  const walletAddress = wallets[0]?.address

  if (!ready) return null
  if (!walletAddress) return <button>Connect wallet</button>

  return (
    <DeframeProvider
      config={{
        DEFRAME_API_URL: process.env.NEXT_PUBLIC_DEFRAME_URL!,
        DEFRAME_API_KEY: process.env.NEXT_PUBLIC_DEFRAME_PUBLIC_KEY!,
        walletAddress,
        theme: 'light',
      }}
    >
      <EarnWidget />
    </DeframeProvider>
  )
}
\`\`\`

## Bytecode bridge checklist

- Read connected wallets from Privy.
- Switch to the bytecode target chain before send.
- Send single transactions directly.
- Use smart wallet batching when available.
- Wait for receipt before sending finalized state to the widget.
- Return explicit errors for no wallet, declined signature, and reverted execution.

## Verification

- User can sign in and receives an embedded wallet when needed.
- Widget receives the current wallet address.
- Widget styles load only once.
- Bytecode execution handles chain switching and receipt polling.
- No private server values are exposed to the browser.
`,
  }),
  pack({
    id: 'sumsub-kyc-knowledge-pack',
    title: 'Sumsub and KYC knowledge pack',
    description:
      'Markdown guide for KYC architecture, applicant lifecycle, webhook handling, status mapping, and compliance-safe implementation notes.',
    filename: 'sumsub-kyc-knowledge.md',
    proofSummary:
      'Synthesized from local KYC flow docs, provider integration patterns, and wallet onboarding notes.',
    tags: ['kyc', 'sumsub', 'bigdatacorp', 'avenia', 'compliance'],
    markdown: `# Sumsub And KYC Knowledge Pack

## What this gives you

A compliance-safe KYC architecture note that can be adapted to Sumsub or a two-provider setup. It focuses on flow design, status mapping, webhooks, retries, and storage boundaries.

## Source map

- \`pods-wallet/KYC_FLOW_SUMMARY.md\`
- \`pods-wallet/docs/flows/03-kyc-flow.md\`
- local KYC integration repos and wallet onboarding flow notes

## Core architecture

Use your app backend as the source of truth. The frontend starts KYC, receives a hosted verification URL or SDK token, and polls your backend. The backend talks to the provider, stores attempts, handles webhooks idempotently, and maps provider statuses into app statuses.

## Suggested status model

- \`pending\`: user has started but not completed provider verification.
- \`processing\`: provider is reviewing the submitted data.
- \`precheck_ok\`: first provider or precheck approved.
- \`provider_pending\`: final provider review is waiting.
- \`approved\`: user may access gated product flows.
- \`rejected\`: user cannot continue without support or retry.
- \`rejected_retryable\`: user may retry.
- \`expired\`: session expired and should be restarted.

## Endpoint shape

- \`POST /kyc/initiate\`: create or reuse profile and return hosted verification URL or token.
- \`GET /kyc/status\`: return current mapped status and retry options.
- \`POST /kyc/retry\`: create a fresh attempt when allowed.
- \`POST /kyc/webhook\`: receive provider updates and update attempts idempotently.
- \`POST /kyc/manual-review\`: optional internal support path.

## Webhook rules

- Verify provider signature before processing.
- Use provider attempt id as an idempotency key.
- Store raw webhook metadata only when required and redact sensitive fields in logs.
- Make approval monotonic unless a later provider explicitly revokes it.
- Do not trust frontend polling as the only finalization path.

## Compliance-safe storage

Store only what your product needs. Avoid storing document images unless you have a clear reason and a retention policy. Encrypt sensitive identity fields. Keep audit timestamps, provider ids, and mapped statuses separate from raw user data.

## Verification

- Initiate creates one active attempt.
- Status endpoint is stable across refreshes.
- Webhook can be delivered twice without double-processing.
- Retry is blocked for in-progress attempts.
- Approval unlocks the intended product feature.
`,
  }),
  pack({
    id: 'base-chain-token-registry-pack',
    title: 'Base chain and token registry expansion pack',
    description:
      'Markdown checklist for adding or auditing EVM chains, Base-first token metadata, explorers, transports, and SDK display mappings.',
    filename: 'base-chain-token-registry.md',
    proofSummary:
      'Derived from Pods new-chain checklist and Deframe chain registry mapping notes.',
    tags: ['base', 'chain-registry', 'tokens', 'evm', 'web3'],
    markdown: `# Base Chain And Token Registry Expansion Pack

## What this gives you

A checklist for adding a chain or auditing token metadata across a wallet app and widget SDK. For this marketplace, Base should remain the default network for payments and demos.

## Source map

- \`pods-wallet/docs/20260211-new-chain-checklist.md\`
- \`pods-wallet/lib/constants.ts\`
- \`pods-wallet/lib/networks.ts\`
- \`pods-wallet/lib/wagmi-config.ts\`
- \`deframe-sdk/src/utils/constants.ts\`
- \`deframe-sdk/src/utils/display.ts\`

## Wallet app checklist

1. Add chain config: id, name, icon, color, explorer URL, and viem chain object.
2. Add Wagmi chain and transport.
3. Add network logo metadata.
4. Add client and server chain mapping.
5. Add RPC proxy mapping.
6. Add wallet chain switch hex mapping.
7. Add token aliases for native assets when needed.
8. Verify balances, transfers, explorer links, swaps, and withdraw flows.

## SDK checklist

1. Add chain id to allowed chain ids.
2. Add block explorer URL.
3. Add API name mapping for swap routes.
4. Add display name and reverse name mapping.
5. Add chain image URL.
6. Audit fallback chain ids in transaction screens.

## Base-first marketplace rule

- Use Base USDC for test purchases.
- Emit x402 challenges with \`eip155:8453\`.
- Avoid Polygon or MATIC references in buyer-facing prompts.
- Keep token symbol display as USDC unless the backend proves otherwise.

## Verification

- Chain selector shows the new chain.
- RPC calls route to the expected provider.
- Token balances render with correct logos and decimals.
- Swap quote uses the provider's expected chain name.
- Payment flow remains Base USDC.
`,
  }),
  pack({
    id: 'pix-on-off-ramp-brla-pack',
    title: 'PIX on-ramp and off-ramp BRLA pack',
    description:
      'Markdown guide for designing BRL to BRLA on-ramp and BRLA to BRL off-ramp flows with KYC gates, quotes, tickets, and status polling.',
    filename: 'pix-on-off-ramp-brla.md',
    proofSummary:
      'Built from Pods on-ramp and off-ramp flow docs around KYC-gated PIX transactions.',
    tags: ['pix', 'brla', 'onramp', 'offramp', 'stablecoin'],
    markdown: `# PIX On-Ramp And Off-Ramp BRLA Pack

## What this gives you

A product and API flow for BRL to BRLA deposits and BRLA to BRL withdrawals using KYC gates, quotes, tickets, webhooks, and wallet balance refreshes.

## Source map

- \`pods-wallet/docs/flows/04-onramp-flow.md\`
- \`pods-wallet/docs/flows/05-offramp-flow.md\`
- \`pods-wallet/docs/flows/03-kyc-flow.md\`

## On-ramp flow

1. Require approved KYC.
2. Ask for BRL amount.
3. Fetch quote with fees and expected BRLA.
4. Create deposit ticket.
5. Show PIX QR code or copy code.
6. Provider confirms payment by webhook.
7. BRLA is credited to the user's smart account.
8. Frontend refreshes balances and history.

## Off-ramp flow

1. Require approved KYC.
2. Ask for BRLA amount and PIX destination.
3. Fetch quote with fees and expected BRL.
4. Create withdrawal ticket and provider deposit address.
5. User transfers BRLA on-chain through smart account flow.
6. Backend records transaction hash.
7. Provider detects funds and sends PIX.
8. Frontend polls status until paid or failed.

## Status checklist

- \`created\`: ticket exists.
- \`transferring\`: user is sending funds.
- \`processing\`: provider has funds or payment is pending.
- \`paid\`: bank payment completed.
- \`failed\`: provider or chain step failed.

## Verification

- KYC gate blocks unapproved users.
- Quote expires cleanly.
- Deposit ticket can be refreshed without creating duplicates.
- Withdrawal stores the on-chain transaction hash.
- Final status updates history and balance.
`,
  }),
  pack({
    id: 'circle-x402-base-marketplace-pack',
    title: 'Circle x402 Base marketplace pack',
    description:
      'Markdown guide for the marketplace payment flow: listing, Base USDC x402 checkout, delivery release, seller payout tracking, and review prompt.',
    filename: 'circle-x402-base-marketplace.md',
    proofSummary:
      'Derived from this marketplace implementation and the verified Base-only purchase flow.',
    tags: ['circle', 'x402', 'base', 'marketplace', 'usdc'],
    markdown: `# Circle x402 Base Marketplace Pack

## What this gives you

A concise blueprint for an agent-to-agent marketplace where wallet-authenticated sellers list digital deliverables and buyers unlock them through Base USDC payment.

## Source map

- \`apps/marketplace-api/src/routes.ts\`
- \`apps/marketplace-api/src/x402.ts\`
- \`apps/marketplace-api/src/db.ts\`
- \`packages/agent-tools\`
- \`setup.md\`

## Flow

1. Seller authenticates by signing a challenge with a Circle-generated wallet.
2. Seller publishes a listing with title, price, proof summary, policy flags, and deliverable metadata.
3. Buyer searches listings.
4. Buyer requests delivery and receives an HTTP 402 challenge.
5. Buyer pays on Base USDC.
6. API records purchase receipt and releases the deliverable.
7. Buyer is prompted to verify the data and review the seller.
8. Seller payout can be released or tracked after delivery.

## Base-only requirements

- x402 network: \`eip155:8453\`.
- Settlement asset: USDC on Base.
- Test price for these packs: \`1 USDC\`.
- Buyer prompts should never say MATIC.

## Listing policy

Allowed listings should be useful digital work products, research packs, public knowledge, consented services, or agent tasks. Block secrets, private keys, credentials, private messages, and undisclosed engagement.

## Verification

- Search returns active listings.
- Unpaid delivery returns HTTP 402.
- Paid delivery returns payload and checksum.
- Purchase record includes buyer, seller, amount, network, receipt, delivery state, and payout state.
- Review updates seller reputation.
`,
  }),
  pack({
    id: 'web3-transaction-history-ux-pack',
    title: 'Web3 transaction history UX pack',
    description:
      'Markdown guide for pending transaction UX, history normalization, chain-aware status labels, and post-transaction refresh behavior.',
    filename: 'web3-transaction-history-ux.md',
    proofSummary:
      'Synthesized from Pods transaction state, smart account, Earn, Swap, and history flow patterns.',
    tags: ['web3', 'ux', 'history', 'transactions', 'wallet'],
    markdown: `# Web3 Transaction History UX Pack

## What this gives you

A product and engineering checklist for making web3 transaction history feel reliable while smart accounts, bridges, providers, and widgets are all producing status events.

## Source map

- \`pods-wallet/docs/flows/06-smart-account-flow.md\`
- \`pods-wallet/docs/flows/08-deframe-integration.md\`
- \`deframe-sdk/docs/flows/02-earn-strategies-flow.md\`
- \`deframe-sdk/docs/flows/05-swap-flow.md\`

## History model

Normalize everything into a single timeline item shape:

- id
- kind: deposit, withdraw, swap, transfer, on-ramp, off-ramp, or widget action
- chain id
- asset symbols
- source and destination amounts
- transaction hash or UserOperation hash
- status
- created time
- updated time
- provider metadata reference

## Pending item rules

- Create a pending item as soon as the user confirms intent.
- Replace local pending id with backend id when available.
- Show UserOperation hash as pending infrastructure metadata, not final settlement.
- Upgrade to transaction hash when the receipt arrives.
- Keep failed, declined, and reverted as distinct statuses.

## Refresh strategy

- Refresh balances after confirmed or finalized events.
- Refresh positions after earn deposit or withdraw.
- Refresh quote-dependent screens after chain or token switches.
- Do not clear history on route changes.

## UX copy rules

- "Waiting for signature" means user action is required.
- "Submitting" means payload was signed but not accepted yet.
- "Confirming" means chain inclusion is pending.
- "Completed" means receipt was confirmed.
- "Failed" should include the next useful action.

## Verification

- Fast chain switches do not update the wrong pending item.
- Declined signatures do not create completed history entries.
- Reverted transactions remain inspectable.
- Cross-chain swaps show both source and destination progress.
- Balance refresh does not hide the completed receipt.
`,
  }),
  csvPack({
    id: 'crypto-10y-bitcoin-demo-csv',
    title: 'Bitcoin 10-year historical CSV demo',
    description:
      'Synthetic monthly OHLCV and market-cap CSV for Bitcoin across 10 demo years. Built for hackathon testing, not trading decisions.',
    filename: 'bitcoin-10y-synthetic-monthly.csv',
    proofSummary:
      'Generated deterministic fake monthly BTC rows for marketplace demo delivery and CSV handling tests.',
    tags: ['finance', 'crypto', 'bitcoin', 'csv', 'synthetic-demo'],
    symbols: ['BTC'],
  }),
  csvPack({
    id: 'crypto-10y-ethereum-demo-csv',
    title: 'Ethereum 10-year historical CSV demo',
    description:
      'Synthetic monthly OHLCV and market-cap CSV for Ethereum across 10 demo years. Built for hackathon testing, not trading decisions.',
    filename: 'ethereum-10y-synthetic-monthly.csv',
    proofSummary:
      'Generated deterministic fake monthly ETH rows for marketplace demo delivery and CSV handling tests.',
    tags: ['finance', 'crypto', 'ethereum', 'csv', 'synthetic-demo'],
    symbols: ['ETH'],
  }),
  csvPack({
    id: 'crypto-10y-solana-demo-csv',
    title: 'Solana 10-year historical CSV demo',
    description:
      'Synthetic monthly OHLCV and market-cap CSV for Solana across 10 demo years. Built for hackathon testing, not trading decisions.',
    filename: 'solana-10y-synthetic-monthly.csv',
    proofSummary:
      'Generated deterministic fake monthly SOL rows for marketplace demo delivery and CSV handling tests.',
    tags: ['finance', 'crypto', 'solana', 'csv', 'synthetic-demo'],
    symbols: ['SOL'],
  }),
  csvPack({
    id: 'crypto-10y-btc-eth-sol-demo-bundle',
    title: 'BTC ETH SOL 10-year historical CSV bundle',
    description:
      'Synthetic monthly OHLCV and market-cap CSV bundle for Bitcoin, Ethereum, and Solana across 10 demo years. Built for hackathon testing, not trading decisions.',
    filename: 'btc-eth-sol-10y-synthetic-monthly-bundle.csv',
    priceUsd: 3,
    proofSummary:
      'Generated deterministic fake monthly BTC, ETH, and SOL rows for marketplace demo delivery and finance-agent tests.',
    tags: ['finance', 'crypto', 'bitcoin', 'ethereum', 'solana', 'csv', 'bundle', 'synthetic-demo'],
    symbols: ['BTC', 'ETH', 'SOL'],
  }),
];

if (shouldReset) {
  if (!adminToken) {
    throw new Error('RESET_MARKETPLACE=1 requires MARKETPLACE_ADMIN_TOKEN');
  }
  await resetMarketplace();
}

const created = [];
const skipped = [];
for (const listing of listings) {
  const response = await fetch(`${apiUrl}/api/listings`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${sellerToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(listing),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorText = String(body?.error ?? '');
    if (skipExisting && response.status === 400 && errorText.includes('UNIQUE constraint failed')) {
      skipped.push({ id: listing.id, reason: 'already exists' });
      continue;
    }
    throw new Error(`Failed to seed ${listing.id}: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  created.push(body.listing);
}

console.log(
  JSON.stringify(
    {
      apiUrl,
      reset: shouldReset,
      skipExisting,
      count: created.length,
      skippedCount: skipped.length,
      listings: created.map((listing) => ({
        id: listing.id,
        title: listing.title,
        priceUsd: listing.priceUsd,
      })),
      skipped,
    },
    null,
    2,
  ),
);

async function resetMarketplace() {
  const response = await fetch(`${apiUrl}/api/admin/reset-marketplace`, {
    method: 'POST',
    headers: {
      'x-marketplace-admin-token': adminToken,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ confirm: 'reset-marketplace-data' }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Marketplace reset failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  console.error(`Reset marketplace data: ${JSON.stringify(body.deleted)}`);
}

function pack(input) {
  return {
    id: input.id,
    sellerWallet,
    listingType: 'data_pack',
    title: input.title,
    description: input.description,
    priceUsd: 1,
    deliveryMode: 'markdown',
    proofSummary: input.proofSummary,
    riskLevel: 'low',
    policyFlags: ['sanitized-public-knowledge', 'markdown-deliverable', ...input.tags.map((tag) => `tag:${tag}`)],
    semaContext,
    deliverable: {
      kind: 'file',
      filename: input.filename,
      mimeType: 'text/markdown',
      payload: input.markdown.trim() + '\n',
      checksum: `sha256-${sha256(input.markdown.trim() + '\n')}`,
      instructions: 'Open as Markdown. The pack is sanitized and contains implementation guidance, not secrets or private data.',
    },
  };
}

function csvPack(input) {
  const csv = makeSyntheticHistoricalCsv(input.symbols);
  return {
    id: input.id,
    sellerWallet,
    listingType: 'data_pack',
    title: input.title,
    description: input.description,
    priceUsd: input.priceUsd ?? 1,
    deliveryMode: 'csv',
    proofSummary: input.proofSummary,
    riskLevel: 'low',
    policyFlags: [
      'synthetic-demo-data',
      'not-investment-advice',
      'csv-deliverable',
      ...input.tags.map((tag) => `tag:${tag}`),
    ],
    semaContext,
    deliverable: {
      kind: 'file',
      filename: input.filename,
      mimeType: 'text/csv',
      payload: csv,
      checksum: `sha256-${sha256(csv)}`,
      instructions:
        'Open as CSV. This is synthetic hackathon demo data only, not real market data and not investment advice.',
    },
  };
}

function makeSyntheticHistoricalCsv(symbols) {
  const configs = {
    BTC: { start: 430, monthlyGrowth: 0.055, cycle: 0.18, baseVolume: 420_000_000, supply: 19_650_000 },
    ETH: { start: 1.1, monthlyGrowth: 0.075, cycle: 0.22, baseVolume: 95_000_000, supply: 120_000_000 },
    SOL: { start: 0.08, monthlyGrowth: 0.095, cycle: 0.28, baseVolume: 18_000_000, supply: 440_000_000 },
  };
  const lines = ['date,symbol,open,high,low,close,volume_usd,market_cap_usd,source_note'];
  for (const symbol of symbols) {
    const config = configs[symbol];
    for (let index = 0; index < 120; index += 1) {
      const year = 2016 + Math.floor(index / 12);
      const month = (index % 12) + 1;
      const trend = config.start * (1 + config.monthlyGrowth) ** index;
      const wave = 1 + Math.sin(index / 4.2) * config.cycle + Math.cos(index / 9.5) * (config.cycle / 2);
      const open = trend * wave;
      const close = open * (1 + Math.sin(index / 2.7) * 0.07);
      const high = Math.max(open, close) * (1.04 + (index % 5) * 0.004);
      const low = Math.min(open, close) * (0.96 - (index % 4) * 0.003);
      const volume = config.baseVolume * (1 + index / 24) * (1 + Math.abs(Math.sin(index / 3)) * 0.6);
      const marketCap = close * config.supply;
      lines.push(
        [
          `${year}-${String(month).padStart(2, '0')}-01`,
          symbol,
          formatNumber(open),
          formatNumber(high),
          formatNumber(low),
          formatNumber(close),
          Math.round(volume),
          Math.round(marketCap),
          'synthetic_demo_not_real_market_data',
        ].join(','),
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

function formatNumber(value) {
  return Number(value).toFixed(value >= 100 ? 2 : 4);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
