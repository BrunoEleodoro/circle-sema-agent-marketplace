const DEFAULT_API_URL = 'https://marketplace-api-production-4b82.up.railway.app';
const SETUP_ONE_LINER =
  'curl -sL https://raw.githubusercontent.com/BrunoEleodoro/circle-sema-agent-marketplace/feature/marketplace-mvp/setup.md Follow that setup guide for the Circle + Sema Marketplace.';
const SEMA_HANDLES = 'Card#6848, AcceptSpec#b77c, CiteBack#69ec, Probe#12d8, Judge#efe0';

const state = {
  listings: [],
  reputationBySeller: new Map(),
  selectedId: null,
  query: '',
};

const elements = {
  apiLine: document.querySelector('#apiLine'),
  searchForm: document.querySelector('#searchForm'),
  searchInput: document.querySelector('#searchInput'),
  resultsBody: document.querySelector('#resultsBody'),
  resultStatus: document.querySelector('#resultStatus'),
  emptyState: document.querySelector('#emptyState'),
  copySetupButton: document.querySelector('#copySetupButton'),
  copyBuyerButton: document.querySelector('#copyBuyerButton'),
  detailEmpty: document.querySelector('#detailEmpty'),
  detailContent: document.querySelector('#detailContent'),
  detailType: document.querySelector('#detailType'),
  detailName: document.querySelector('#detailName'),
  detailPrice: document.querySelector('#detailPrice'),
  detailSeller: document.querySelector('#detailSeller'),
  detailDelivery: document.querySelector('#detailDelivery'),
  detailProof: document.querySelector('#detailProof'),
  agentPrompt: document.querySelector('#agentPrompt'),
  checkoutCommand: document.querySelector('#checkoutCommand'),
  toast: document.querySelector('#toast'),
};

const apiUrl = apiUrlFromLocation();
let searchTimer = 0;
let toastTimer = 0;

function apiUrlFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('api')?.trim();
  const fromStorage = window.localStorage.getItem('marketplaceApiUrl')?.trim();
  const value = fromQuery || fromStorage || DEFAULT_API_URL;
  window.localStorage.setItem('marketplaceApiUrl', value);
  return value.replace(/\/+$/, '');
}

function endpoint(path) {
  return `${apiUrl}/${path.replace(/^\/+/, '')}`;
}

function formatCurrency(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatType(value) {
  return String(value ?? '').replaceAll('_', ' ');
}

function shortWallet(value) {
  const wallet = String(value ?? '');
  return wallet.length > 12 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet;
}

function selectedListing() {
  return state.listings.find((listing) => listing.id === state.selectedId) ?? null;
}

function reputationFor(sellerWallet) {
  const reputation = state.reputationBySeller.get(String(sellerWallet).toLowerCase());
  if (!reputation) return 'New';
  if (!reputation.reviewCount) return 'New';
  return `${Number(reputation.reputationScore).toFixed(1)} / 5 (${reputation.reviewCount})`;
}

function setStatus(text) {
  elements.resultStatus.textContent = text;
}

function showToast(text) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = text;
  elements.toast.classList.add('visible');
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('visible');
  }, 1700);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  showToast('Copied');
}

async function fetchJson(path) {
  const res = await fetch(endpoint(path), { headers: { accept: 'application/json' } });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error ? String(payload.error) : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return payload;
}

async function fetchReputation(sellerWallet) {
  const key = String(sellerWallet).toLowerCase();
  if (state.reputationBySeller.has(key)) return;
  try {
    const payload = await fetchJson(`/api/reputation/${key}`);
    state.reputationBySeller.set(key, payload.reputation);
  } catch {
    state.reputationBySeller.set(key, { reputationScore: 0, reviewCount: 0 });
  }
}

async function loadListings(query = '') {
  state.query = query;
  const params = new URLSearchParams({ limit: '25' });
  if (query.trim()) params.set('q', query.trim());
  setStatus(query.trim() ? `Searching for "${query.trim()}"...` : 'Loading recent listings...');
  try {
    const payload = await fetchJson(`/api/listings/search?${params}`);
    state.listings = Array.isArray(payload.listings) ? payload.listings : [];
    await Promise.all([...new Set(state.listings.map((listing) => listing.sellerWallet))].map(fetchReputation));
    if (!selectedListing()) {
      state.selectedId = state.listings[0]?.id ?? null;
    }
    render();
  } catch (error) {
    state.listings = [];
    state.selectedId = null;
    render();
    setStatus(`Could not load marketplace: ${error.message}`);
  }
}

function render() {
  renderRows();
  renderDetail();
  const count = state.listings.length;
  elements.emptyState.hidden = count > 0;
  setStatus(count === 1 ? '1 listing' : `${count} listings`);
  elements.copyBuyerButton.disabled = !selectedListing();
}

function renderRows() {
  elements.resultsBody.replaceChildren(
    ...state.listings.map((listing) => {
      const row = document.createElement('tr');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-selected', String(listing.id === state.selectedId));
      row.addEventListener('click', () => selectListing(listing.id));
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectListing(listing.id);
        }
      });

      row.append(
        tableCell(titleCell(listing)),
        tableCell(formatType(listing.listingType)),
        tableCell(formatCurrency(listing.priceUsd)),
        tableCell(shortWallet(listing.sellerWallet), 'mono'),
        tableCell(reputationFor(listing.sellerWallet)),
        tableCell(riskPill(listing.riskLevel)),
      );
      return row;
    }),
  );
}

function tableCell(content, className) {
  const td = document.createElement('td');
  if (className) td.className = className;
  if (content instanceof Node) td.append(content);
  else td.textContent = String(content ?? '');
  return td;
}

function titleCell(listing) {
  const wrap = document.createElement('span');
  const title = document.createElement('span');
  const proof = document.createElement('span');
  title.className = 'row-title';
  proof.className = 'row-proof';
  title.textContent = listing.title;
  proof.textContent = listing.proofSummary;
  wrap.append(title, proof);
  return wrap;
}

function riskPill(riskLevel) {
  const pill = document.createElement('span');
  const risk = String(riskLevel ?? 'low');
  pill.className = `pill ${risk}`;
  pill.textContent = risk;
  return pill;
}

function selectListing(id) {
  state.selectedId = id;
  render();
}

function renderDetail() {
  const listing = selectedListing();
  elements.detailEmpty.hidden = Boolean(listing);
  elements.detailContent.hidden = !listing;
  if (!listing) return;

  elements.detailType.textContent = formatType(listing.listingType);
  elements.detailName.textContent = listing.title;
  elements.detailPrice.textContent = formatCurrency(listing.priceUsd);
  elements.detailSeller.textContent = listing.sellerWallet;
  elements.detailDelivery.textContent = formatType(listing.deliveryMode);
  elements.detailProof.textContent = listing.proofSummary;
  elements.agentPrompt.textContent = agentPromptFor(listing);
  elements.checkoutCommand.textContent = checkoutCommandFor(listing);
}

function agentPromptFor(listing) {
  return `Use the Circle + Sema Agent Marketplace as a buyer.

Marketplace API:
- MARKETPLACE_API_URL=${apiUrl}

Selected listing:
- id: ${listing.id}
- title: ${listing.title}
- seller: ${listing.sellerWallet}
- price: ${formatCurrency(listing.priceUsd)}

Authenticate with my Circle Agent Wallet, ask before spending USDC, then buy this listing with x402.
Include my marketplace bearer token as an Authorization header so I can review after purchase.
If checkout returns deliveryStatus awaiting_seller, save the purchase id and poll GET /api/purchases/<purchase-id>/deliverable. Do not pay twice.
After delivery, ask me whether the data is real and usable, whether it matched the listing, the 1-5 seller rating, and the review text.

Use Sema handles ${SEMA_HANDLES}.`;
}

function checkoutCommandFor(listing) {
  return `export MARKETPLACE_API_URL=${apiUrl}

circle services pay "$MARKETPLACE_API_URL/api/deliver/${listing.id}" \\
  --address <buyer-wallet> \\
  --chain MATIC \\
  --header "Authorization: Bearer <buyer-marketplace-token>" \\
  --max-amount ${Number(listing.priceUsd).toFixed(2)} \\
  --output json`;
}

function bindEvents() {
  elements.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    window.clearTimeout(searchTimer);
    loadListings(elements.searchInput.value);
  });

  elements.searchInput.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => loadListings(elements.searchInput.value), 220);
  });

  elements.copySetupButton.addEventListener('click', () => copyText(SETUP_ONE_LINER));
  elements.copyBuyerButton.addEventListener('click', () => {
    const listing = selectedListing();
    if (listing) copyText(agentPromptFor(listing));
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-copy]');
    if (!(button instanceof HTMLButtonElement)) return;
    const kind = button.dataset.copy;
    if (kind === 'agent') copyText(elements.agentPrompt.textContent);
    if (kind === 'checkout') copyText(elements.checkoutCommand.textContent);
  });
}

function init() {
  elements.apiLine.textContent = apiUrl;
  elements.searchInput.focus();
  bindEvents();
  loadListings('');
}

init();
