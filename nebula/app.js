// Nebula — a crypto wallet simulator. Every balance, price and transaction is local and made up.
import {
  $, $$, esc, uid, sleep, clamp, load, save, images, loadImages, setImage, deleteImage, clearImages,
  pickImage, haptic, toast, sheet, actionSheet, push, createLock, switchHTML, hashStr, rng, registerSW, FACE_ID,
} from '../shared/ios.js';

const KEY = 'nebula:state';

const LOGO = `<svg viewBox="0 0 100 100"><defs><linearGradient id="nb-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b6cff"/><stop offset="1" stop-color="#3b1d9e"/></linearGradient><radialGradient id="nb-pl" cx=".38" cy=".35" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cdbfff"/></radialGradient></defs><rect width="100" height="100" fill="url(#nb-bg)"/><g transform="rotate(-24 50 50)"><path d="M13 50a37 10 0 0 1 74 0" fill="none" stroke="#fff" stroke-width="4.4"/></g><circle cx="50" cy="50" r="20" fill="url(#nb-pl)"/><g transform="rotate(-24 50 50)"><path d="M87 50a37 10 0 0 1-74 0" fill="none" stroke="#5a3fd0" stroke-width="7.4"/><path d="M87 50a37 10 0 0 1-74 0" fill="none" stroke="#fff" stroke-width="4.4"/></g></svg>`;

const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  home: ic('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
  collect: ic('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>'),
  swap: ic('<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>'),
  activity: ic('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  explore: ic('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  qr: ic('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
  send: ic('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  recv: ic('<path d="M12 5v14M5 12l7 7 7-7"/>'),
  buy: ic('<path d="M12 2v20M17 6.5c-1-1.5-3-2-5-2-2.8 0-4.5 1.4-4.5 3.4 0 4.6 10 2.5 10 7.4 0 2-2 3.6-5 3.6-2.3 0-4.3-.8-5.5-2.4"/>'),
  scan: ic('<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3M7 12h10"/>'),
  copy: ic('<rect x="8" y="8" width="13" height="13" rx="3"/><path d="M16 8V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h2"/>'),
  share: ic('<path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>'),
  back: ic('<path d="M15 5l-7 7 7 7"/>'),
  chev: ic('<path d="M9 5l7 7-7 7"/>'),
  down: ic('<path d="M6 9l6 6 6-6"/>'),
  edit: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  close: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  arrows: ic('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),
  eye: ic('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
};
const BADGE = { send: I.send, receive: I.recv, swap: I.arrows, buy: I.buy };

/* ---------- formatting ---------- */
const nf = (min, max) => new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
const NF2 = nf(2, 2);
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const usd = n => (n < 0 ? '-$' : '$') + NF2.format(Math.abs(n));
const signedUsd = n => (n >= 0 ? '+$' : '-$') + NF2.format(Math.abs(n));
const pct = p => (p >= 0 ? '+' : '-') + Math.abs(p).toFixed(2) + '%';
const compactUsd = n => '$' + COMPACT.format(n);
const sign = d => (d > 0 ? 'up' : d < 0 ? 'down' : 'flat');
const num = s => { const n = parseFloat(String(s).replace(/[,\s$]/g, '')); return Number.isFinite(n) ? n : 0; };
function fmtPrice(p) {
  if (p >= 1 || p === 0) return usd(p);
  const d = clamp(-Math.floor(Math.log10(p)) + 3, 4, 10);
  return '$' + p.toFixed(d);
}
const signedPrice = d => (d >= 0 ? '+' : '-') + fmtPrice(Math.abs(d));
function fmtAmt(n) {
  const a = Math.abs(n);
  return nf(0, a >= 1000 ? 2 : a >= 1 ? 4 : 6).format(n);
}
const short = a => (a && a.length > 12 ? a.slice(0, 4) + '…' + a.slice(-4) : a || '');

/* ---------- addresses ---------- */
const randFrom = (chars, n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => chars[b % chars.length]).join('');
const solAddr = () => randFrom('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 44);
const evmAddr = () => '0x' + randFrom('0123456789abcdef', 40);
const btcAddr = () => 'bc1q' + randFrom('023456789acdefghjklmnpqrstuvwxyz', 38);
const newAddrs = () => ({ sol: solAddr(), eth: evmAddr(), btc: btcAddr() });

/* ---------- token art ---------- */
const GLYPHS = {
  sol: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#101014"/><path fill="url(#nb-sol)" d="M14 12H30L26.5 15.5H10.5ZM10.5 18.25H26.5L30 21.75H14ZM14 24.5H30L26.5 28H10.5Z"/></svg>`,
  eth: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627EEA"/><g fill="#fff"><path fill-opacity=".6" d="M16.5 4v8.87l7.5 3.35z"/><path d="M16.5 4L9 16.22l7.5-3.35z"/><path fill-opacity=".6" d="M16.5 21.97V28L24 17.62z"/><path d="M16.5 28v-6.03L9 17.62z"/><path fill-opacity=".2" d="M16.5 20.57l7.5-4.35-7.5-3.35z"/><path fill-opacity=".6" d="M9 16.22l7.5 4.35v-7.7z"/></g></svg>`,
  btc: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#F7931A"/><text x="20" y="27.5" text-anchor="middle" font-size="21" font-weight="700" fill="#fff" font-family="-apple-system,system-ui,sans-serif" transform="rotate(12 20 20)">₿</text></svg>`,
  usdc: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#2775CA"/><circle cx="20" cy="20" r="12.5" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="14 5.6" transform="rotate(-50 20 20)"/><text x="20" y="25.5" text-anchor="middle" font-size="15" font-weight="700" fill="#fff" font-family="-apple-system,system-ui,sans-serif">$</text></svg>`,
};
const letterIcon = (letter, color, emoji) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${esc(color)}"/>${emoji
  ? `<text x="20" y="27" text-anchor="middle" font-size="20">${emoji}</text>`
  : `<text x="20" y="26.5" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" font-family="-apple-system,system-ui,sans-serif">${esc(letter)}</text>`}</svg>`;
function tokIcon(t) {
  if (!t) return letterIcon('?', '#555');
  if (t.img && images.get(t.img)) return `<img src="${images.get(t.img)}" alt="">`;
  return GLYPHS[t.id] || letterIcon((t.symbol || '?')[0], t.color || '#666', t.emoji);
}

const CATALOG = [
  { id: 'sol', name: 'Solana', symbol: 'SOL', price: 168.42, chg: 3.12, amount: 1284.36, color: '#9945FF', supply: 589e6, about: 'Solana is a high-performance blockchain built for fast, low-cost apps and payments.' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', price: 3421.77, chg: 1.84, amount: 12.4031, color: '#627EEA', supply: 120.4e6, chain: 'Ethereum', about: 'Ethereum is a programmable blockchain powering smart contracts and decentralized apps.' },
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', price: 97214.5, chg: 0.92, amount: 0.8512, color: '#F7931A', supply: 19.8e6, chain: 'Bitcoin', about: 'Bitcoin is the first decentralized digital currency, with a fixed supply of 21 million.' },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', price: 1, chg: 0, amount: 25000, color: '#2775CA', supply: 34e9, stable: true, about: 'USDC is a fully reserved digital dollar, redeemable 1:1 for US dollars.' },
  { id: 'wif', name: 'dogwifhat', symbol: 'WIF', price: 2.14, chg: 12.8, amount: 15000, color: '#C8A27A', emoji: '🐶', supply: 999e6, about: 'Literally just a dog wif a hat.' },
  { id: 'jup', name: 'Jupiter', symbol: 'JUP', price: 0.9241, chg: 6.4, amount: 8250, color: '#1fb894', supply: 1.35e9, about: 'Jupiter is a liquidity aggregator and trading platform on Solana.' },
  { id: 'bonk', name: 'Bonk', symbol: 'BONK', price: 0.00002311, chg: -4.2, amount: 48210000, color: '#F8A12E', emoji: '🐕', supply: 77e12, about: 'The community dog coin of Solana.' },
  { id: 'ray', name: 'Raydium', symbol: 'RAY', price: 4.87, chg: 2.2, amount: 0, color: '#5a3fe0', supply: 290e6, about: 'Raydium is an automated market maker on Solana.' },
  { id: 'jto', name: 'Jito', symbol: 'JTO', price: 3.21, chg: 4.9, amount: 0, color: '#2bb673', supply: 300e6, about: 'Jito powers liquid staking and MEV on Solana.' },
  { id: 'pyth', name: 'Pyth Network', symbol: 'PYTH', price: 0.412, chg: -1.6, amount: 0, color: '#7342b9', supply: 3.6e9, about: 'Pyth delivers real-time market data to blockchains.' },
  { id: 'popcat', name: 'Popcat', symbol: 'POPCAT', price: 1.18, chg: 18.3, amount: 0, color: '#d9a92b', emoji: '🐱', supply: 980e6, about: 'Pop.' },
  { id: 'render', name: 'Render', symbol: 'RENDER', price: 7.42, chg: -2.7, amount: 0, color: '#e8384f', supply: 517e6, about: 'Render is a decentralized GPU rendering network.' },
];

function orbArt(seed) {
  const r = rng(seed);
  const hue = Math.floor(r() * 360);
  const blobs = Array.from({ length: 6 }, () => `<circle cx="${(r() * 100).toFixed(1)}" cy="${(r() * 100).toFixed(1)}" r="${(14 + r() * 30).toFixed(1)}" fill="hsl(${(hue + r() * 140) | 0} 90% ${(52 + r() * 22) | 0}%)" opacity=".85"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter><radialGradient id="o" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="hsl(${(hue + 190) % 360} 90% 70%)"/></radialGradient></defs><rect width="100" height="100" fill="hsl(${hue} 55% 12%)"/><g filter="url(#b)">${blobs}</g><circle cx="50" cy="52" r="20" fill="url(#o)"/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function seed() {
  const now = Date.now(), H = 36e5;
  const tokens = CATALOG.map(c => ({ ...c, open: c.price / (1 + c.chg / 100), hidden: false }));
  const nfts = [421, 1337, 88, 2048].map(n => ({ id: uid(), name: `Nebula Orb #${String(n).padStart(4, '0')}`, collection: 'Nebula Orbs', floor: +(8 + (n % 17)).toFixed(1), art: orbArt(n) }));
  return {
    v: 1,
    account: { name: 'Account 1', handle: '', avatar: '🪐', addrs: newAddrs() },
    tokens,
    nfts,
    activity: [
      { id: uid(), type: 'receive', tok: 'sol', amount: 250, addr: solAddr(), ts: now - 5 * H },
      { id: uid(), type: 'swap', tok: 'usdc', amount: 5000, tok2: 'sol', amount2: 29.71, ts: now - 26 * H },
      { id: uid(), type: 'send', tok: 'sol', amount: 12.5, addr: solAddr(), ts: now - 50 * H },
      { id: uid(), type: 'buy', tok: 'wif', amount: 4200, usd: 8900, ts: now - 75 * H },
      { id: uid(), type: 'receive', tok: 'usdc', amount: 12000, addr: solAddr(), ts: now - 120 * H },
    ],
    settings: { hideBalance: false, live: true },
  };
}

/* ---------- state ---------- */
let S = load(KEY, null);
if (!S || S.v !== 1) S = seed();
let saveTimer;
const persist = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => save(KEY, S), 150); };
document.addEventListener('visibilitychange', () => { if (document.hidden) save(KEY, S); });

const tok = id => S.tokens.find(t => t.id === id);
const valueOf = t => t.amount * t.price;
const heldTokens = () => S.tokens.filter(t => t.amount > 0 && !t.hidden).sort((a, b) => valueOf(b) - valueOf(a));
const chainOf = t => t?.chain || 'Solana';
const addrFor = t => S.account.addrs[{ Ethereum: 'eth', Bitcoin: 'btc' }[chainOf(t)] || 'sol'];
const feeOf = t => ({ Ethereum: '0.00042 ETH', Bitcoin: '0.000021 BTC' })[chainOf(t)] || '0.000005 SOL';
function totals() {
  let now = 0, open = 0;
  for (const t of heldTokens()) { now += t.amount * t.price; open += t.amount * t.open; }
  return { now, open };
}
const sortActivity = () => S.activity.sort((a, b) => b.ts - a.ts);

const lock = createLock({ app: 'nebula', name: 'Nebula', logo: LOGO, payLabel: 'Require Face ID to Send', purpose: 'sends' });
const refreshers = new Set();
const pages = new Set();

/* ---------- live values ---------- */
function liveVal(key) {
  const [k, id] = key.split(':');
  const hide = S.settings.hideBalance;
  if (k === 'total') return [hide ? '$••••••' : usd(totals().now)];
  if (k === 'total-chg') { const { now, open } = totals(); return [hide ? '••••' : signedUsd(now - open), sign(now - open)]; }
  if (k === 'total-pct') { const { now, open } = totals(); const p = open ? (now / open - 1) * 100 : 0; return [pct(p), sign(p)]; }
  const t = tok(id);
  if (!t) return [''];
  if (k === 'val') return [hide ? '••••' : usd(valueOf(t))];
  if (k === 'pnl') { const d = t.amount * (t.price - t.open); return [hide ? '••••' : signedUsd(d), sign(d)]; }
  if (k === 'price') return [fmtPrice(t.price)];
  if (k === 'chg') { const d = t.price - t.open; return [signedPrice(d), sign(d)]; }
  if (k === 'pct') { const p = (t.price / t.open - 1) * 100; return [pct(p), sign(p)]; }
  return [''];
}
function updateLive(root = document) {
  for (const el of root.querySelectorAll('[data-live]')) {
    if (el.closest('.frozen')) continue;
    const [text, s] = liveVal(el.dataset.live);
    if (el.textContent !== text) el.textContent = text;
    if (s) el.dataset.sign = s; else delete el.dataset.sign;
  }
}

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function tick(scale = 1) {
  for (const t of S.tokens) if (!t.stable) t.price = Math.max(t.price * (1 + gauss() * 0.0007 * scale), 1e-12);
  persist();
  updateLive();
}

/* ---------- shell ---------- */
const TABS = [['home', 'home', 'Home'], ['collect', 'collect', 'Collectibles'], ['swap', 'swap', 'Swap'], ['activity', 'activity', 'Activity'], ['explore', 'explore', 'Explore']];
let tab = 'home';
const view = id => $(`[data-view="${id}"]`);

// Gradients referenced from many places live here, outside any view that can be display:none.
const DEFS = `<svg class="defs" aria-hidden="true"><defs>
  <linearGradient id="nb-sol" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9945FF"/><stop offset="1" stop-color="#14F195"/></linearGradient>
</defs></svg>`;

function buildShell() {
  $('#app').innerHTML = `${DEFS}<div class="status-cover"></div>
    <div class="views">${TABS.map(([id]) => `<section class="view ${id === tab ? 'active' : ''}" data-view="${id}"></section>`).join('')}</div>
    <nav class="tabbar">${TABS.map(([id, icon, label]) => `<button class="tab ${id === tab ? 'on' : ''}" data-act="tab" data-id="${id}" aria-label="${label}">${I[icon]}</button>`).join('')}</nav>`;
  setupPullToRefresh(view('home'));
}
function setTab(id) {
  if (id === tab) { view(id).scrollTo({ top: 0, behavior: 'smooth' }); return; }
  tab = id;
  $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === id));
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  haptic();
}
function closePages() { for (const p of [...pages]) p.close(); }
function refreshAll() {
  renderHome(); renderCollect(); renderSwap(); renderActivity(); renderExplore();
  refreshers.forEach(f => f());
}

/* ---------- home ---------- */
function avatarHTML() {
  const img = S.account.photo && images.get('nebula:avatar');
  return img ? `<img src="${img}" alt="">` : `<span>${esc(S.account.avatar || '🪐')}</span>`;
}
function tokRow(t) {
  const hide = S.settings.hideBalance;
  return `<button class="tok tap" data-act="token" data-id="${t.id}"><span class="tok-ic">${tokIcon(t)}</span>
    <span class="tok-mid"><b>${esc(t.name)}</b><small>${hide ? '••••' : fmtAmt(t.amount)} ${esc(t.symbol)}</small></span>
    <span class="tok-end"><b data-live="val:${t.id}"></b><small data-live="pnl:${t.id}"></small></span></button>`;
}
function renderHome() {
  const a = S.account;
  const held = heldTokens();
  view('home').innerHTML = `
    <header class="topbar">
      <button class="avatar tap" data-act="settings" aria-label="Settings">${avatarHTML()}</button>
      <button class="acct" data-act="settings"><b>${esc(a.name)}</b><small>${a.handle ? '@' + esc(a.handle) : esc(short(a.addrs.sol))}</small></button>
      <span class="sp"></span>
      <button class="icon-btn tap" data-act="scan" aria-label="Scan QR code">${I.scan}</button>
      <button class="icon-btn tap" data-act="tab" data-id="explore" aria-label="Search">${I.explore}</button>
    </header>
    <div class="ptr"><div class="spinner"></div></div>
    <div class="balance">
      <button class="total" data-act="toggle-hide" data-live="total" aria-label="Total balance"></button>
      <div class="chg"><span data-live="total-chg"></span><span class="pill" data-live="total-pct"></span></div>
    </div>
    <div class="actions">${[['receive', 'qr', 'Receive'], ['send', 'send', 'Send'], ['swap', 'swap', 'Swap'], ['buy', 'buy', 'Buy']]
      .map(([act, icon, label]) => `<button class="action tap" data-act="${act}">${I[icon]}<span>${label}</span></button>`).join('')}</div>
    <div class="tokens">${held.map(tokRow).join('') || '<div class="empty"><b>No tokens yet</b><span>Tap Buy to add some.</span></div>'}</div>
    <button class="manage" data-act="manage">Manage token list</button>`;
  updateLive(view('home'));
}

function setupPullToRefresh(v) {
  let y0 = null, pull = 0, busy = false;
  v.addEventListener('touchstart', e => {
    if (busy || v.scrollTop > 0) return;
    y0 = e.touches[0].clientY; pull = 0;
    $('.ptr', v).style.transition = 'none';
  }, { passive: true });
  v.addEventListener('touchmove', e => {
    if (y0 == null) return;
    pull = clamp((e.touches[0].clientY - y0) * 0.45, 0, 110);
    const p = $('.ptr', v);
    p.style.height = pull + 'px';
    if (pull > 64 && !p.classList.contains('ready')) haptic();
    p.classList.toggle('ready', pull > 64);
  }, { passive: true });
  v.addEventListener('touchend', async () => {
    if (y0 == null) return;
    y0 = null;
    const p = $('.ptr', v);
    p.style.transition = '';
    if (p.classList.contains('ready')) {
      busy = true;
      p.classList.add('loading');
      p.style.height = '56px';
      await sleep(900);
      tick(6);
      busy = false;
    }
    p.style.height = '0';
    p.classList.remove('ready', 'loading');
  });
}

/* ---------- token page ---------- */
const TFS = ['1H', '1D', '1W', '1M', 'YTD', 'ALL'];
const TF_LABEL = { '1H': 'Past hour', '1D': 'Today', '1W': 'Past week', '1M': 'Past month', YTD: 'Year to date', ALL: 'All time' };
const TF_SPAN = { '1H': 36e5, '1D': 864e5, '1W': 6048e5, '1M': 2592e6, ALL: 1.6e11 };
const TF_VOL = { '1H': 0.004, '1D': 0.012, '1W': 0.03, '1M': 0.05, YTD: 0.1, ALL: 0.25 };

function series(t, tf) {
  const N = 90;
  const r = rng(hashStr(t.id + tf + Math.floor(Date.now() / 36e5)));
  const change = { '1H': (r() - 0.45) * 0.03, '1D': t.price / t.open - 1, '1W': (r() - 0.4) * 0.25, '1M': (r() - 0.35) * 0.5, YTD: (r() - 0.3) * 1.2, ALL: 2 + r() * 20 }[tf];
  const c = t.stable ? (r() - 0.5) * 0.002 : change;
  const lEnd = Math.log(t.price), lStart = Math.log(t.price / (1 + c));
  const w = [0];
  for (let i = 1; i < N; i++) w.push(w[i - 1] + (r() - 0.5));
  const sd = Math.sqrt(w.reduce((s, x) => s + x * x, 0) / N) || 1;
  const sigma = Math.abs(lEnd - lStart) * 0.25 + (t.stable ? 0.0005 : TF_VOL[tf]);
  const now = Date.now();
  const span = tf === 'YTD' ? now - new Date(new Date().getFullYear(), 0, 1).getTime() : TF_SPAN[tf];
  return Array.from({ length: N }, (_, i) => {
    const f = i / (N - 1);
    const bridge = w[i] - f * w[N - 1];
    return { t: now - span * (1 - f), p: Math.exp(lStart + (lEnd - lStart) * f + (bridge / sd) * sigma) };
  });
}
function fmtWhen(ts, tf) {
  const d = new Date(ts);
  if (tf === '1H' || tf === '1D') return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (tf === '1W') return d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function drawChart(host, ser) {
  const ps = ser.map(x => x.p);
  const min = Math.min(...ps), max = Math.max(...ps);
  const pts = ser.map((x, i) => [(i / (ser.length - 1)) * 100, 92 - ((x.p - min) / (max - min || 1)) * 84]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('');
  host.dataset.sign = ps[ps.length - 1] >= ps[0] ? 'up' : 'down';
  host.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="nb-cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".26"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path d="${d}L100 100L0 100Z" fill="url(#nb-cg)"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg><i class="cursor"></i><i class="dot"></i>`;
  host._pts = pts;
}

function openToken(id) {
  if (!tok(id)) return;
  let t = tok(id), tf = '1D', ser = [], scrubbing = false, lastI = -1;
  const page = push(`<header class="nav"><button class="icon-btn" data-back aria-label="Back">${I.back}</button><div class="nav-title"></div><button class="icon-btn" data-edit aria-label="Edit token">${I.edit}</button></header><div class="page-body"></div>`, {
    onClose: () => { refreshers.delete(refresh); pages.delete(page); },
  });
  pages.add(page);
  const body = $('.page-body', page.el);
  $('[data-edit]', page.el).onclick = () => editToken(id);

  function render() {
    const r = rng(hashStr(t.id));
    const mcap = t.price * (t.supply || 1e9);
    body.innerHTML = `
      <div class="tp-head"><div class="tp-price" data-live="price:${id}"></div>
        <div class="tp-chg"><span data-live="chg:${id}"></span><span class="pill" data-live="pct:${id}"></span></div>
        <div class="tp-when">Today</div></div>
      <div class="chart" data-chart></div>
      <div class="tfs">${TFS.map(x => `<button data-tf="${x}" class="${x === tf ? 'on' : ''}">${x}</button>`).join('')}</div>
      <div class="actions">${[['receive', 'qr', 'Receive'], ['send', 'send', 'Send'], ['swap', 'swap', 'Swap'], ['buy', 'buy', 'Buy']]
        .map(([act, icon, label]) => `<button class="action tap" data-act="${act}" data-id="${id}">${I[icon]}<span>${label}</span></button>`).join('')}</div>
      <div class="section-title">Your Balance</div>
      <div class="card-box bal-box">
        <div><small>Value</small><b data-live="val:${id}"></b></div>
        <div><small>Balance</small><b>${S.settings.hideBalance ? '••••' : fmtAmt(t.amount)} ${esc(t.symbol)}</b></div>
        <div><small>Today’s PnL</small><b data-live="pnl:${id}"></b></div>
      </div>
      <div class="section-title">Info</div>
      <div class="card-box info">
        <div><span>Symbol</span><b>${esc(t.symbol)}</b></div>
        <div><span>Network</span><b>${chainOf(t)}</b></div>
        <div><span>Market Cap</span><b>${compactUsd(mcap)}</b></div>
        <div><span>24h Volume</span><b>${compactUsd(mcap * (0.02 + r() * 0.1))}</b></div>
        <div><span>Circulating Supply</span><b>${COMPACT.format(t.supply || 1e9)}</b></div>
      </div>
      ${t.about ? `<div class="section-title">About</div><p class="about">${esc(t.about)}</p>` : ''}`;
    draw();
    updateLive(body);
  }
  function draw() {
    ser = series(t, tf);
    drawChart($('[data-chart]', body), ser);
    setHead(null);
  }
  function setHead(i) {
    const head = $('.tp-head', body);
    const [priceEl, when] = [$('.tp-price', head), $('.tp-when', head)];
    const [chgEl, pctEl] = $$('.tp-chg > *', head);
    if (i == null && tf === '1D') {
      head.classList.remove('frozen');
      updateLive(head);
      when.textContent = 'Today';
      return;
    }
    head.classList.add('frozen');
    const p = i == null ? t.price : ser[i].p, base = ser[0].p, d = p - base;
    priceEl.textContent = fmtPrice(p);
    chgEl.textContent = signedPrice(d);
    pctEl.textContent = pct((p / base - 1) * 100);
    chgEl.dataset.sign = pctEl.dataset.sign = sign(d);
    when.textContent = i == null ? TF_LABEL[tf] : fmtWhen(ser[i].t, tf);
  }
  function scrub(e) {
    const chart = $('[data-chart]', body);
    const r = chart.getBoundingClientRect();
    const i = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * (ser.length - 1));
    if (i === lastI) return;
    lastI = i;
    const [x, y] = chart._pts[i];
    chart.style.setProperty('--x', x + '%');
    chart.style.setProperty('--y', y + '%');
    setHead(i);
  }
  body.addEventListener('pointerdown', e => {
    const chart = e.target.closest('[data-chart]');
    if (!chart) return;
    scrubbing = true; lastI = -1;
    chart.classList.add('active');
    chart.setPointerCapture?.(e.pointerId);
    haptic();
    scrub(e);
  });
  body.addEventListener('pointermove', e => { if (scrubbing) scrub(e); });
  const endScrub = () => {
    if (!scrubbing) return;
    scrubbing = false;
    $('[data-chart]', body)?.classList.remove('active');
    setHead(null);
  };
  body.addEventListener('pointerup', endScrub);
  body.addEventListener('pointercancel', endScrub);
  body.addEventListener('click', e => {
    const b = e.target.closest('[data-tf]');
    if (!b || b.dataset.tf === tf) return;
    tf = b.dataset.tf;
    $$('[data-tf]', body).forEach(x => x.classList.toggle('on', x === b));
    haptic();
    draw();
  });
  function refresh() {
    t = tok(id);
    if (!t) return page.close();
    $('.nav-title', page.el).innerHTML = `<span class="tok-ic xs">${tokIcon(t)}</span>${esc(t.name)}`;
    render();
  }
  refreshers.add(refresh);
  refresh();
}

/* ---------- edit / manage tokens ---------- */
function editToken(id, after) {
  const isNew = !id;
  const src = isNew
    ? { id: 'c' + uid(), name: '', symbol: '', price: 1, open: 1, amount: 0, color: `hsl(${(Math.random() * 360) | 0} 65% 52%)`, custom: true, hidden: false, supply: 1e9 }
    : tok(id);
  const t = { ...src };
  let img = t.img ? images.get(t.img) : null;
  let imgChanged = false;
  const s = sheet(`
    <div class="sheet-head"><button class="link" data-close>Cancel</button><h2>${isNew ? 'Add Token' : 'Edit ' + esc(t.symbol)}</h2><button class="link b" data-save>Save</button></div>
    <div class="edit-icon"><button class="tok-ic xl tap" data-pick></button><button class="link sm" data-pick>Change Icon</button></div>
    <div class="group-title">Holdings</div>
    <div class="group">
      <label class="row"><span class="label">Amount</span><input data-f="amount" inputmode="decimal" value="${+t.amount.toFixed(8)}"></label>
      <label class="row"><span class="label">Price (USD)</span><input data-f="price" inputmode="decimal" value="${+t.price.toPrecision(8)}"></label>
      <label class="row"><span class="label">24h Change %</span><input data-f="chg" inputmode="text" value="${((t.price / t.open - 1) * 100).toFixed(2)}"></label>
    </div>
    <div class="group-foot" data-preview></div>
    <div class="group-title">Token</div>
    <div class="group">
      <label class="row"><span class="label">Name</span><input data-f="name" value="${esc(t.name)}" placeholder="My Token" maxlength="28"></label>
      <label class="row"><span class="label">Symbol</span><input data-f="symbol" value="${esc(t.symbol)}" placeholder="TICKER" maxlength="10" autocapitalize="characters"></label>
      <label class="row"><span class="label">Show on Home</span>${switchHTML('data-f="visible"', !t.hidden)}</label>
    </div>
    ${!isNew && t.custom ? '<div class="group"><button class="row danger-row" data-del>Delete Token</button></div>' : ''}`);
  const f = k => $(`[data-f="${k}"]`, s.el);
  const paintIcon = () => { $('.edit-icon .tok-ic', s.el).innerHTML = img ? `<img src="${img}" alt="">` : tokIcon({ ...t, img: null, symbol: f('symbol').value || '?' }); };
  const preview = () => {
    const v = num(f('amount').value) * num(f('price').value);
    $('[data-preview]', s.el).textContent = `Worth ${usd(v)}`;
  };
  paintIcon();
  preview();
  s.el.addEventListener('input', e => { if (e.target.dataset.f === 'symbol') paintIcon(); preview(); });
  s.el.addEventListener('click', async e => {
    if (e.target.closest('[data-pick]')) {
      const choice = img ? await actionSheet({ actions: [{ label: 'Choose Photo', value: 'pick' }, { label: 'Remove Icon', value: 'rm', style: 'destructive' }] }) : 'pick';
      if (choice === 'pick') { const d = await pickImage({ max: 256, type: 'image/png' }); if (d) { img = d; imgChanged = true; } }
      if (choice === 'rm') { img = null; imgChanged = true; }
      paintIcon();
    } else if (e.target.closest('[data-del]')) {
      const ok = await actionSheet({ message: `Delete ${t.symbol} from your wallet?`, actions: [{ label: 'Delete Token', style: 'destructive', value: 1 }] });
      if (!ok) return;
      S.tokens = S.tokens.filter(x => x.id !== id);
      S.activity = S.activity.filter(a => a.tok !== id && a.tok2 !== id);
      deleteImage(`nebula:tok:${id}`);
      persist(); s.close(); refreshAll(); after?.();
    } else if (e.target.closest('[data-save]')) {
      const name = f('name').value.trim(), symbol = f('symbol').value.trim().toUpperCase();
      if (!name || !symbol) return toast('Add a name and symbol');
      const price = num(f('price').value);
      if (!(price > 0)) return toast('Price must be above 0');
      const chg = clamp(num(f('chg').value), -99, 100000);
      Object.assign(t, { name, symbol, price, open: price / (1 + chg / 100), amount: Math.max(0, num(f('amount').value)), hidden: !f('visible').checked });
      if (imgChanged) {
        const key = `nebula:tok:${t.id}`;
        if (img) { await setImage(key, img); t.img = key; } else { await deleteImage(key); t.img = null; }
      }
      if (isNew) S.tokens.push(t); else Object.assign(src, t);
      persist(); s.close(); haptic(); refreshAll(); after?.();
      toast(isNew ? 'Token added' : 'Saved');
    }
  });
}

function manageTokens() {
  const s = sheet('', { full: true });
  const render = () => s.set(`
    <div class="sheet-head"><span></span><h2>Manage Tokens</h2><button class="link b" data-close>Done</button></div>
    <div class="group">${S.tokens.map(t => `<div class="row"><button class="manage-main" data-edit="${t.id}"><span class="tok-ic sm">${tokIcon(t)}</span><span class="tok-mid"><b>${esc(t.name)}</b><small>${fmtAmt(t.amount)} ${esc(t.symbol)}</small></span></button>${switchHTML(`data-vis="${t.id}"`, !t.hidden)}</div>`).join('')}</div>
    <div class="group"><button class="row" data-new><span class="label accent">Add Custom Token</span></button></div>
    <div class="group-foot">Tap a token to change its amount, price, 24h change or icon.</div>`);
  render();
  s.el.addEventListener('change', e => {
    const id = e.target.dataset.vis;
    if (id) { tok(id).hidden = !e.target.checked; persist(); refreshAll(); }
  });
  s.el.addEventListener('click', e => {
    const id = e.target.closest('[data-edit]')?.dataset.edit;
    if (id) editToken(id, render);
    else if (e.target.closest('[data-new]')) editToken(null, render);
  });
}

function pickToken({ title = 'Select Token', heldOnly = false, exclude } = {}) {
  return new Promise(resolve => {
    let picked = null;
    const s = sheet('', { full: true, onClose: () => resolve(picked) });
    const list = q => {
      q = q.trim().toLowerCase();
      const all = S.tokens.filter(t => (!heldOnly || t.amount > 0) && t.id !== exclude && (!q || t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q)))
        .sort((a, b) => valueOf(b) - valueOf(a) || a.name.localeCompare(b.name));
      return all.map(t => `<button class="row pick-row" data-id="${t.id}"><span class="tok-ic sm">${tokIcon(t)}</span><span class="tok-mid"><b>${esc(t.name)}</b><small>${fmtAmt(t.amount)} ${esc(t.symbol)}</small></span><span class="value fg">${t.amount ? usd(valueOf(t)) : ''}</span></button>`).join('')
        || '<div class="row"><span class="label dim">No tokens found</span></div>';
    };
    s.set(`<div class="sheet-head"><button class="link" data-close>Cancel</button><h2>${esc(title)}</h2><span></span></div>
      <div class="search">${I.explore}<input data-q placeholder="Search" autocomplete="off"></div>
      <div class="group" data-list>${list('')}</div>`);
    $('[data-q]', s.el).addEventListener('input', e => { $('[data-list]', s.el).innerHTML = list(e.target.value); });
    s.el.addEventListener('click', e => {
      const b = e.target.closest('[data-id]');
      if (b) { picked = b.dataset.id; haptic(); s.close(); }
    });
  });
}

/* ---------- confirm → process → success ---------- */
const CHECK_SVG = '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" stroke-width="3" class="ck-ring"/><path d="M15 27l7.5 7.5L38 19" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="ck-mark"/></svg>';
const heroHTML = (t, big, small) => `<span class="tok-ic xl">${tokIcon(t)}</span><div class="rv-amt">${esc(big)}</div><div class="rv-usd">${esc(small)}</div>`;

function reviewSheet({ title, hero, rows, cta, busy, run, doneTitle, doneSub }) {
  const s = sheet(`
    <div class="sheet-head"><span></span><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${I.close}</button></div>
    <div class="review-hero">${hero}</div>
    <div class="group">${rows.map(([k, v]) => `<div class="row"><span class="label dim">${esc(k)}</span><span class="value fg">${v}</span></div>`).join('')}</div>
    <div class="sheet-foot two"><button class="btn secondary" data-close>Cancel</button><button class="btn" data-go>${esc(cta)}</button></div>`);
  $('[data-go]', s.el).onclick = async () => {
    if (lock.needed && !(await lock.verify())) return;
    s.set(`<div class="processing"><div class="spinner lg"></div><div>${esc(busy)}</div></div>`);
    await sleep(1300 + Math.random() * 700);
    run();
    s.set(`<div class="success"><div class="done-check">${CHECK_SVG}</div><h3>${esc(doneTitle)}</h3><p>${esc(doneSub)}</p></div>
      <div class="sheet-foot"><button class="btn" data-close>Done</button></div>`);
  };
}

/* ---------- send ---------- */
async function sendFlow(preId) {
  const id = preId && tok(preId)?.amount > 0 ? preId : await pickToken({ title: 'Send', heldOnly: true });
  if (!id) return;
  const t = tok(id);
  const s = sheet(`
    <div class="sheet-head"><button class="link" data-close>Cancel</button><h2>Send ${esc(t.symbol)}</h2><span></span></div>
    <div class="send-ic"><span class="tok-ic xl">${tokIcon(t)}</span></div>
    <div class="field"><input data-to placeholder="Recipient’s ${chainOf(t)} address" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="field-btn" data-paste>Paste</button></div>
    <div class="field"><input data-amt inputmode="decimal" placeholder="Amount" autocomplete="off"><span class="field-sym">${esc(t.symbol)}</span><button class="field-btn" data-max>Max</button></div>
    <div class="send-meta"><span data-usd>$0.00</span><span>Available ${fmtAmt(t.amount)} ${esc(t.symbol)}</span></div>
    <div class="sheet-foot"><button class="btn" data-next disabled>Next</button></div>`, { full: true });
  const to = $('[data-to]', s.el), amt = $('[data-amt]', s.el), next = $('[data-next]', s.el);
  const check = () => {
    const a = num(amt.value);
    $('[data-usd]', s.el).textContent = usd(a * t.price);
    const over = a > t.amount + 1e-12;
    next.textContent = over ? `Insufficient ${t.symbol}` : 'Next';
    next.disabled = over || !(a > 0) || to.value.trim().length < 3;
  };
  s.el.addEventListener('input', check);
  $('[data-max]', s.el).onclick = () => { amt.value = String(+t.amount.toFixed(8)); check(); haptic(); };
  $('[data-paste]', s.el).onclick = async () => {
    try { to.value = (await navigator.clipboard.readText()).trim(); check(); } catch { toast('Nothing to paste'); }
  };
  next.onclick = () => {
    const a = num(amt.value), dest = to.value.trim();
    s.close();
    reviewSheet({
      title: 'Confirm Send', cta: 'Send', busy: 'Sending…',
      hero: heroHTML(t, `-${fmtAmt(a)} ${t.symbol}`, usd(a * t.price)),
      rows: [['To', `<span class="mono">${esc(short(dest))}</span>`], ['Network', chainOf(t)], ['Network Fee', feeOf(t)]],
      run() {
        t.amount = Math.max(0, t.amount - a);
        S.activity.unshift({ id: uid(), type: 'send', tok: t.id, amount: a, addr: dest, ts: Date.now() });
        persist(); refreshAll();
      },
      doneTitle: 'Sent!',
      doneSub: `${fmtAmt(a)} ${t.symbol} was successfully sent to ${short(dest)}`,
    });
  };
}

/* ---------- buy ---------- */
function buyFlow(preId) {
  const go = id => {
    const t = tok(id);
    const s = sheet(`
      <div class="sheet-head"><button class="link" data-close>Cancel</button><h2>Buy ${esc(t.symbol)}</h2><span></span></div>
      <div class="buy-amt"><span>$</span><input data-usd inputmode="decimal" placeholder="0" autocomplete="off"></div>
      <div class="buy-est" data-est>≈ 0 ${esc(t.symbol)}</div>
      <div class="chips">${[100, 500, 1000, 5000, 25000].map(v => `<button class="chip tap" data-v="${v}">$${v.toLocaleString('en-US')}</button>`).join('')}</div>
      <div class="group">
        <div class="row"><span class="label dim">Pay with</span><span class="value fg">Debit card</span></div>
        <div class="row"><span class="label dim">Price</span><span class="value fg">${fmtPrice(t.price)}</span></div>
        <div class="row"><span class="label dim">Fees</span><span class="value fg">$0.00</span></div>
      </div>
      <div class="sheet-foot"><button class="btn" data-next disabled>Continue</button></div>`);
    const inp = $('[data-usd]', s.el), next = $('[data-next]', s.el);
    const upd = () => {
      const v = num(inp.value);
      $('[data-est]', s.el).textContent = `≈ ${fmtAmt(v / t.price)} ${t.symbol}`;
      next.disabled = !(v > 0);
    };
    inp.addEventListener('input', upd);
    s.el.addEventListener('click', e => {
      const c = e.target.closest('[data-v]');
      if (c) { inp.value = c.dataset.v; upd(); haptic(); }
    });
    next.onclick = () => {
      const v = num(inp.value), a = v / t.price;
      s.close();
      reviewSheet({
        title: `Buy ${t.symbol}`, cta: 'Buy', busy: 'Processing…',
        hero: heroHTML(t, `+${fmtAmt(a)} ${t.symbol}`, usd(v)),
        rows: [['Price', fmtPrice(t.price)], ['Pay with', 'Debit card'], ['Fees', '$0.00'], ['Total', usd(v)]],
        run() {
          t.amount += a;
          t.hidden = false;
          S.activity.unshift({ id: uid(), type: 'buy', tok: t.id, amount: a, usd: v, ts: Date.now() });
          persist(); refreshAll();
        },
        doneTitle: 'Purchase Complete',
        doneSub: `${fmtAmt(a)} ${t.symbol} was added to your wallet`,
      });
    };
  };
  if (preId && tok(preId)) go(preId);
  else pickToken({ title: 'Buy' }).then(id => id && go(id));
}

/* ---------- receive + QR ---------- */
function qrSVG(text) {
  const N = 29, r = rng(hashStr(text));
  const finders = [[0, 0], [N - 7, 0], [0, N - 7]];
  const reserved = (x, y) => finders.some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7) || (x >= 11 && x <= 17 && y >= 11 && y <= 17);
  let d = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!reserved(x, y) && r() > 0.52) d += `M${x} ${y}h1v1h-1z`;
  const f = finders.map(([x, y]) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`).join('');
  return `<svg viewBox="-2 -2 ${N + 4} ${N + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${N + 4}" height="${N + 4}" fill="#fff"/><path d="${d}" fill="#111"/><path d="${f}" fill="#111" fill-rule="evenodd"/></svg>`;
}
const copy = text => navigator.clipboard?.writeText(text).then(() => { haptic(); toast('Copied', I.check); }, () => toast('Couldn’t copy'));
const NETS = [
  { key: 'sol', name: 'Solana', icon: () => GLYPHS.sol },
  { key: 'eth', name: 'Ethereum', icon: () => GLYPHS.eth },
  { key: 'eth', name: 'Base', icon: () => letterIcon('B', '#0052FF') },
  { key: 'eth', name: 'Polygon', icon: () => letterIcon('P', '#8247E5') },
  { key: 'btc', name: 'Bitcoin', icon: () => GLYPHS.btc },
];

function receiveFlow(preId) {
  if (preId && tok(preId)) {
    const t = tok(preId);
    const net = NETS.find(n => n.name === chainOf(t)) || NETS[0];
    return qrSheet(net);
  }
  const s = sheet(`
    <div class="sheet-head"><span></span><h2>Receive</h2><button class="link b" data-close>Done</button></div>
    <div class="group">${NETS.map((n, i) => `<div class="row"><span class="tok-ic sm">${n.icon()}</span><span class="tok-mid"><b>${n.name}</b><small class="mono">${esc(short(S.account.addrs[n.key]))}</small></span>
      <button class="round-btn tap" data-copy="${i}" aria-label="Copy">${I.copy}</button><button class="round-btn tap" data-qr="${i}" aria-label="QR code">${I.qr}</button></div>`).join('')}</div>`);
  s.el.addEventListener('click', e => {
    const c = e.target.closest('[data-copy]'), q = e.target.closest('[data-qr]');
    if (c) copy(S.account.addrs[NETS[+c.dataset.copy].key]);
    if (q) qrSheet(NETS[+q.dataset.qr]);
  });
}
function qrSheet(net) {
  const addr = S.account.addrs[net.key];
  const s = sheet(`
    <div class="sheet-head"><span></span><h2>Your ${net.name} Address</h2><button class="link b" data-close>Done</button></div>
    <div class="qr-card"><div class="qr">${qrSVG(addr)}<span class="qr-logo">${LOGO}</span></div><div class="qr-addr mono">${esc(addr)}</div></div>
    <p class="qr-note">Only send ${net.name} network assets to this address.</p>
    <div class="sheet-foot two"><button class="btn secondary" data-copy>${I.copy} Copy</button><button class="btn" data-share>${I.share} Share</button></div>`);
  $('[data-copy]', s.el).onclick = () => copy(addr);
  $('[data-share]', s.el).onclick = () => {
    if (navigator.share) navigator.share({ title: `My ${net.name} address`, text: addr }).catch(() => {});
    else copy(addr);
  };
}

/* ---------- scanner ---------- */
async function openScanner() {
  const el = document.createElement('div');
  el.className = 'scanner';
  el.innerHTML = `<video playsinline muted autoplay></video><div class="scan-frame"><i></i><i></i><i></i><i></i></div><div class="scan-text">Scan a QR code</div><button class="scan-close" aria-label="Close">${I.close}</button>`;
  document.body.appendChild(el);
  let stream;
  const close = () => { stream?.getTracks().forEach(t => t.stop()); el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
  $('.scan-close', el).onclick = close;
  requestAnimationFrame(() => el.classList.add('in'));
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    $('video', el).srcObject = stream;
  } catch {
    $('.scan-text', el).textContent = 'Camera unavailable';
  }
}

/* ---------- swap ---------- */
const FEE = 0.0085;
const sw = { from: 'sol', to: 'usdc', amt: '' };
function swapQuote() {
  if (!tok(sw.from)) sw.from = S.tokens[0].id;
  if (!tok(sw.to) || sw.to === sw.from) sw.to = S.tokens.find(t => t.id !== sw.from).id;
  const a = tok(sw.from), b = tok(sw.to), amt = num(sw.amt);
  return { a, b, amt, out: (amt * a.price / b.price) * (1 - FEE) };
}
function swapButton({ a, amt }) {
  if (!(amt > 0)) return ['Enter an amount', true];
  if (amt > a.amount + 1e-12) return [`Insufficient ${a.symbol}`, true];
  return ['Review Swap', false];
}
function renderSwap() {
  const q = swapQuote();
  const { a, b, amt, out } = q;
  const [label, disabled] = swapButton(q);
  view('swap').innerHTML = `
    <header class="title-bar"><span></span><h1>Swap</h1><span></span></header>
    <div class="swap">
      <div class="swap-box">
        <div class="swap-lbl">You Pay</div>
        <div class="swap-row"><input class="swap-in" data-swap-amt inputmode="decimal" placeholder="0" value="${esc(sw.amt)}" autocomplete="off">
          <button class="tok-pill tap" data-act="swap-pick" data-id="from"><span class="tok-ic xs">${tokIcon(a)}</span>${esc(a.symbol)}${I.down}</button></div>
        <div class="swap-sub"><span data-swap-usd>${usd(amt * a.price)}</span><button data-act="swap-max">${fmtAmt(a.amount)} ${esc(a.symbol)} <b>Max</b></button></div>
      </div>
      <button class="swap-flip tap" data-act="swap-flip" aria-label="Flip">${I.recv}</button>
      <div class="swap-box">
        <div class="swap-lbl">You Receive</div>
        <div class="swap-row"><div class="swap-in out" data-swap-out>${out ? fmtAmt(out) : '0'}</div>
          <button class="tok-pill tap" data-act="swap-pick" data-id="to"><span class="tok-ic xs">${tokIcon(b)}</span>${esc(b.symbol)}${I.down}</button></div>
        <div class="swap-sub"><span data-swap-usd2>${usd(out * b.price)}</span><span>${fmtAmt(b.amount)} ${esc(b.symbol)}</span></div>
      </div>
      <div class="swap-info">
        <div><span>Rate</span><b>1 ${esc(a.symbol)} ≈ ${fmtAmt(a.price / b.price)} ${esc(b.symbol)}</b></div>
        <div><span>Slippage</span><b>Auto · 0.5%</b></div>
        <div><span>Fee</span><b>0.85%</b></div>
        <div><span>Network Fee</span><b>&lt; $0.01</b></div>
      </div>
      <button class="btn" data-act="swap-go" ${disabled ? 'disabled' : ''}>${label}</button>
    </div>`;
}
function updateSwap() {
  const q = swapQuote();
  const v = view('swap');
  $('[data-swap-out]', v).textContent = q.out ? fmtAmt(q.out) : '0';
  $('[data-swap-usd]', v).textContent = usd(q.amt * q.a.price);
  $('[data-swap-usd2]', v).textContent = usd(q.out * q.b.price);
  const [label, disabled] = swapButton(q);
  const btn = $('[data-act="swap-go"]', v);
  btn.textContent = label;
  btn.disabled = disabled;
}
async function swapPick(side) {
  const id = await pickToken({ title: side === 'from' ? 'You Pay' : 'You Receive', heldOnly: side === 'from' });
  if (!id) return;
  const other = side === 'from' ? 'to' : 'from';
  if (sw[other] === id) sw[other] = sw[side];
  sw[side] = id;
  renderSwap();
}
function swapGo() {
  const { a, b, amt, out } = swapQuote();
  if (swapButton({ a, amt })[1]) return;
  reviewSheet({
    title: 'Confirm Swap', cta: 'Swap', busy: 'Swapping…',
    hero: `<div class="rv-swap"><div><span class="tok-ic lg">${tokIcon(a)}</span><b>-${fmtAmt(amt)} ${esc(a.symbol)}</b><small>${usd(amt * a.price)}</small></div><span class="rv-arrow">${I.recv}</span><div><span class="tok-ic lg">${tokIcon(b)}</span><b data-sign="up">+${fmtAmt(out)} ${esc(b.symbol)}</b><small>${usd(out * b.price)}</small></div></div>`,
    rows: [['Rate', `1 ${esc(a.symbol)} ≈ ${fmtAmt(a.price / b.price)} ${esc(b.symbol)}`], ['Slippage', 'Auto · 0.5%'], ['Fee', '0.85%'], ['Network Fee', feeOf(a)]],
    run() {
      a.amount = Math.max(0, a.amount - amt);
      b.amount += out;
      b.hidden = false;
      S.activity.unshift({ id: uid(), type: 'swap', tok: a.id, amount: amt, tok2: b.id, amount2: out, ts: Date.now() });
      sw.amt = '';
      persist(); refreshAll();
    },
    doneTitle: 'Swapped!',
    doneSub: `You received ${fmtAmt(out)} ${b.symbol}`,
  });
}

/* ---------- activity ---------- */
function dayLabel(ts) {
  const d = new Date(ts), today = new Date();
  const days = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 864e5);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', ...(d.getFullYear() !== today.getFullYear() && { year: 'numeric' }) });
}
const fullDate = ts => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
function actInfo(a) {
  const t = tok(a.tok) || { symbol: '?', name: 'Unknown' }, t2 = a.tok2 && (tok(a.tok2) || { symbol: '?' });
  switch (a.type) {
    case 'send': return { t, title: 'Sent', sub: `To ${short(a.addr)}`, main: `-${fmtAmt(a.amount)} ${t.symbol}`, s: '' };
    case 'receive': return { t, title: 'Received', sub: `From ${short(a.addr)}`, main: `+${fmtAmt(a.amount)} ${t.symbol}`, s: 'up' };
    case 'swap': return { t: t2, title: 'Swapped', sub: `${t.symbol} → ${t2.symbol}`, main: `+${fmtAmt(a.amount2)} ${t2.symbol}`, s: 'up', second: `-${fmtAmt(a.amount)} ${t.symbol}` };
    default: return { t, title: 'Bought', sub: 'With debit card', main: `+${fmtAmt(a.amount)} ${t.symbol}`, s: 'up', second: usd(a.usd || 0) };
  }
}
function renderActivity() {
  const groups = [];
  for (const a of S.activity) {
    const label = dayLabel(a.ts);
    if (groups.at(-1)?.[0] !== label) groups.push([label, []]);
    groups.at(-1)[1].push(a);
  }
  view('activity').innerHTML = `
    <header class="title-bar"><span></span><h1>Activity</h1><button class="icon-btn tap" data-act="act-add" aria-label="Add activity">${I.plus}</button></header>
    ${groups.length ? groups.map(([label, items]) => `<div class="act-day">${label}</div><div class="act-list">${items.map(a => {
      const x = actInfo(a);
      return `<button class="act tap" data-act="act-open" data-id="${a.id}"><span class="tok-ic">${tokIcon(x.t)}<i class="badge">${BADGE[a.type]}</i></span>
        <span class="tok-mid"><b>${x.title}</b><small>${esc(x.sub)}</small></span>
        <span class="tok-end"><b ${x.s ? `data-sign="${x.s}"` : ''}>${esc(x.main)}</b>${x.second ? `<small>${esc(x.second)}</small>` : ''}</span></button>`;
    }).join('')}</div>`).join('') : '<div class="empty"><b>No activity yet</b><span>Your transactions will show up here.</span></div>'}`;
}
function openActivity(id) {
  const a = S.activity.find(x => x.id === id);
  if (!a) return;
  const x = actInfo(a);
  const s = sheet(`
    <div class="sheet-head"><span></span><h2>${x.title}</h2><button class="link b" data-close>Done</button></div>
    <div class="review-hero">${heroHTML(x.t, x.main, x.second || (a.type === 'swap' ? '' : usd(a.amount * (tok(a.tok)?.price || 0))))}</div>
    <div class="group">
      <div class="row"><span class="label dim">Date</span><span class="value fg">${fullDate(a.ts)}</span></div>
      <div class="row"><span class="label dim">Status</span><span class="value" data-sign="up">Succeeded</span></div>
      ${a.addr ? `<div class="row"><span class="label dim">${a.type === 'send' ? 'To' : 'From'}</span><span class="value fg mono">${esc(short(a.addr))}</span></div>` : ''}
      <div class="row"><span class="label dim">Network</span><span class="value fg">${chainOf(tok(a.tok))}</span></div>
      <div class="row"><span class="label dim">Network Fee</span><span class="value fg">${feeOf(tok(a.tok))}</span></div>
    </div>
    <div class="group"><button class="row danger-row" data-del>Remove from History</button></div>`);
  $('[data-del]', s.el).onclick = async () => {
    const ok = await actionSheet({ message: 'This only removes it from the list. Balances stay the same.', actions: [{ label: 'Remove', style: 'destructive', value: 1 }] });
    if (!ok) return;
    S.activity = S.activity.filter(y => y.id !== id);
    persist(); refreshAll(); s.close();
  };
}
const toLocalInput = ts => { const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
function addActivity() {
  const st = { type: 'receive', tok: heldTokens()[0]?.id || 'sol', amount: '', addr: solAddr(), ts: Date.now(), apply: true };
  const s = sheet('');
  const render = () => {
    const t = tok(st.tok);
    s.set(`
      <div class="sheet-head"><button class="link" data-close>Cancel</button><h2>Add Activity</h2><button class="link b" data-save>Add</button></div>
      <div class="group"><div class="row"><div class="seg">${[['receive', 'Received'], ['send', 'Sent'], ['buy', 'Bought']].map(([k, l]) => `<button data-type="${k}" class="${st.type === k ? 'on' : ''}">${l}</button>`).join('')}</div></div></div>
      <div class="group">
        <button class="row" data-pick><span class="label">Token</span><span class="value fg"><span class="tok-ic xs">${tokIcon(t)}</span>${esc(t.symbol)}</span>${I.chev}</button>
        <label class="row"><span class="label">Amount</span><input data-f="amount" inputmode="decimal" placeholder="0" value="${esc(st.amount)}"></label>
        ${st.type !== 'buy' ? `<label class="row"><span class="label">${st.type === 'send' ? 'To' : 'From'}</span><input data-f="addr" class="mono" value="${esc(st.addr)}" autocapitalize="off" spellcheck="false"></label>` : ''}
        <label class="row"><span class="label">Date</span><input data-f="date" type="datetime-local" value="${toLocalInput(st.ts)}"></label>
      </div>
      <div class="group"><label class="row"><span class="label">Update Balance</span>${switchHTML('data-f="apply"', st.apply)}</label></div>
      <div class="group-foot">When on, this ${st.type === 'send' ? 'removes the amount from' : 'adds the amount to'} your ${esc(t.symbol)} balance.</div>`);
  };
  render();
  s.el.addEventListener('input', e => {
    const f = e.target.dataset.f;
    if (f === 'amount') st.amount = e.target.value;
    if (f === 'addr') st.addr = e.target.value;
    if (f === 'date') st.ts = new Date(e.target.value).getTime() || Date.now();
  });
  s.el.addEventListener('change', e => { if (e.target.dataset.f === 'apply') st.apply = e.target.checked; });
  s.el.addEventListener('click', async e => {
    const ty = e.target.closest('[data-type]');
    if (ty) { st.type = ty.dataset.type; haptic(); return render(); }
    if (e.target.closest('[data-pick]')) {
      const id = await pickToken({});
      if (id) { st.tok = id; render(); }
      return;
    }
    if (!e.target.closest('[data-save]')) return;
    const amount = num(st.amount);
    if (!(amount > 0)) return toast('Enter an amount');
    const t = tok(st.tok);
    const entry = { id: uid(), type: st.type, tok: t.id, amount, ts: st.ts };
    if (st.type === 'buy') entry.usd = amount * t.price; else entry.addr = st.addr.trim() || solAddr();
    if (st.apply) {
      t.amount = Math.max(0, t.amount + (st.type === 'send' ? -amount : amount));
      if (st.type !== 'send') t.hidden = false;
    }
    S.activity.push(entry);
    sortActivity();
    persist(); refreshAll(); s.close();
    toast('Activity added', I.check);
  });
}

/* ---------- collectibles ---------- */
const nftSrc = n => (n.img && images.get(n.img)) || n.art || '';
function renderCollect() {
  view('collect').innerHTML = `
    <header class="title-bar"><span></span><h1>Collectibles</h1><button class="icon-btn tap" data-act="nft-add" aria-label="Add collectible">${I.plus}</button></header>
    ${S.nfts.length ? `<div class="nft-grid">${S.nfts.map(n => `<button class="nft tap" data-act="nft-open" data-id="${n.id}"><img src="${nftSrc(n)}" alt=""><b>${esc(n.name)}</b><small>${esc(n.collection)}</small></button>`).join('')}</div>`
      : '<div class="empty"><b>No collectibles</b><span>Tap + to turn any photo into an NFT.</span></div>'}`;
}
async function addNft() {
  const img = await pickImage({ max: 1000 });
  if (img) editNft(null, img);
}
function editNft(id, newImg) {
  const orig = id && S.nfts.find(x => x.id === id);
  const n = orig ? { ...orig } : { id: uid(), name: '', collection: '', floor: '' };
  let img = newImg || null;
  const s = sheet(`
    <div class="sheet-head"><button class="link" data-close>Cancel</button><h2>${orig ? 'Edit Collectible' : 'New Collectible'}</h2><button class="link b" data-save>Save</button></div>
    <button class="nft-prev tap" data-img><img src="${img || nftSrc(n)}" alt=""></button>
    <div class="group">
      <label class="row"><span class="label">Name</span><input data-f="name" value="${esc(n.name)}" placeholder="Cool Thing #1" maxlength="40"></label>
      <label class="row"><span class="label">Collection</span><input data-f="collection" value="${esc(n.collection)}" placeholder="My Collection" maxlength="40"></label>
      <label class="row"><span class="label">Floor (SOL)</span><input data-f="floor" inputmode="decimal" value="${esc(n.floor)}" placeholder="0"></label>
    </div>`);
  s.el.addEventListener('click', async e => {
    if (e.target.closest('[data-img]')) {
      const d = await pickImage({ max: 1000 });
      if (d) { img = d; $('.nft-prev img', s.el).src = d; }
    } else if (e.target.closest('[data-save]')) {
      const f = k => $(`[data-f="${k}"]`, s.el).value.trim();
      Object.assign(n, { name: f('name') || 'Untitled', collection: f('collection') || 'Unknown Collection', floor: num(f('floor')) });
      if (img) { n.img = `nebula:nft:${n.id}`; await setImage(n.img, img); }
      if (orig) Object.assign(orig, n); else S.nfts.unshift(n);
      persist(); refreshAll(); s.close(); haptic();
    }
  });
}
function openNft(id) {
  const n = S.nfts.find(x => x.id === id);
  if (!n) return;
  const sol = tok('sol');
  const s = sheet(`
    <div class="sheet-head"><span></span><h2>${esc(n.collection)}</h2><button class="link b" data-close>Done</button></div>
    <img class="nft-big" src="${nftSrc(n)}" alt="">
    <h3 class="nft-title">${esc(n.name)}</h3>
    <div class="group">
      <div class="row"><span class="label dim">Floor Price</span><span class="value fg">${fmtAmt(n.floor || 0)} SOL</span></div>
      <div class="row"><span class="label dim">Value</span><span class="value fg">${usd((n.floor || 0) * (sol?.price || 0))}</span></div>
      <div class="row"><span class="label dim">Network</span><span class="value fg">Solana</span></div>
    </div>
    <div class="group">
      <button class="row" data-edit><span class="label accent">Edit</span></button>
      <button class="row" data-avatar><span class="label accent">Use as Avatar</span></button>
      <button class="row" data-del><span class="label danger">Remove</span></button>
    </div>`);
  s.el.addEventListener('click', async e => {
    if (e.target.closest('[data-edit]')) { s.close(); editNft(id); }
    else if (e.target.closest('[data-avatar]')) {
      await setImage('nebula:avatar', nftSrc(n));
      S.account.photo = true;
      persist(); refreshAll(); toast('Avatar updated', I.check);
    } else if (e.target.closest('[data-del]')) {
      const ok = await actionSheet({ message: `Remove ${n.name}?`, actions: [{ label: 'Remove', style: 'destructive', value: 1 }] });
      if (!ok) return;
      S.nfts = S.nfts.filter(x => x.id !== id);
      if (n.img) deleteImage(n.img);
      persist(); refreshAll(); s.close();
    }
  });
}

/* ---------- explore ---------- */
let exploreQ = '';
function exploreList() {
  const q = exploreQ.trim().toLowerCase();
  const list = S.tokens.filter(t => !t.stable && (!q || t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q)))
    .sort((a, b) => b.price / b.open - a.price / a.open);
  return list.map((t, i) => `<button class="ex-row tap" data-act="token" data-id="${t.id}"><span class="ex-rank">${i + 1}</span><span class="tok-ic">${tokIcon(t)}</span>
    <span class="tok-mid"><b>${esc(t.name)}</b><small>${compactUsd(t.price * (t.supply || 1e9))} MC</small></span>
    <span class="tok-end"><b data-live="price:${t.id}"></b><small data-live="pct:${t.id}"></small></span></button>`).join('')
    || '<div class="empty"><span>No results</span></div>';
}
function renderExplore() {
  view('explore').innerHTML = `
    <header class="title-bar"><span></span><h1>Explore</h1><span></span></header>
    <div class="search">${I.explore}<input data-explore placeholder="Search tokens" value="${esc(exploreQ)}" autocomplete="off"></div>
    <div class="section-title">Trending Tokens</div>
    <div class="ex-list" data-ex-list>${exploreList()}</div>`;
  updateLive(view('explore'));
}

/* ---------- settings ---------- */
const EMOJI = ['🪐', '🚀', '💎', '🦄', '🐸', '🐳', '🔥', '👑', '🌙', '⚡️', '🍀', '🐉', '🦊', '🐼', '🎯', '🧠', '👽', '🤖', '🌈', '🍕', '🎲', '🏆', '💸', '😎'];
async function editAvatar(after) {
  const actions = [{ label: 'Choose Photo', value: 'photo' }, { label: 'Choose Emoji', value: 'emoji' }];
  if (S.account.photo) actions.push({ label: 'Remove Photo', value: 'rm', style: 'destructive' });
  const v = await actionSheet({ actions });
  if (v === 'photo') {
    const d = await pickImage({ max: 400 });
    if (!d) return;
    await setImage('nebula:avatar', d);
    S.account.photo = true;
  } else if (v === 'rm') {
    await deleteImage('nebula:avatar');
    S.account.photo = false;
  } else if (v === 'emoji') {
    const s = sheet(`<div class="sheet-head"><span></span><h2>Choose Emoji</h2><button class="link b" data-close>Done</button></div>
      <div class="emoji-grid">${EMOJI.map(e => `<button class="tap" data-e="${e}">${e}</button>`).join('')}</div>`);
    s.el.addEventListener('click', e => {
      const b = e.target.closest('[data-e]');
      if (!b) return;
      S.account.avatar = b.dataset.e;
      S.account.photo = false;
      deleteImage('nebula:avatar');
      persist(); refreshAll(); after?.(); s.close(); haptic();
    });
    return;
  } else return;
  persist(); refreshAll(); after?.();
}
function openSettings() {
  const s = sheet('', { full: true });
  const render = () => {
    const a = S.account;
    s.set(`
      <div class="sheet-head"><span></span><h2>Settings</h2><button class="link b" data-close>Done</button></div>
      <div class="profile"><button class="avatar xl tap" data-avatar>${avatarHTML()}</button><button class="link sm" data-avatar>Edit Avatar</button></div>
      <div class="group">
        <label class="row"><span class="label">Account Name</span><input data-f="name" value="${esc(a.name)}" maxlength="24"></label>
        <label class="row"><span class="label">Username</span><input data-f="handle" value="${esc(a.handle)}" placeholder="@username" maxlength="20" autocapitalize="off" spellcheck="false"></label>
      </div>
      <div class="group-title">Security</div>
      <div class="group"><button class="row" data-sec><span class="row-ic" style="background:#30d158">${FACE_ID}</span><span class="label">Face ID</span><span class="value">${lock.modeLabel()}</span>${I.chev}</button></div>
      <div class="group-title">Display</div>
      <div class="group">
        <label class="row"><span class="label">Hide Balances</span>${switchHTML('data-s="hideBalance"', S.settings.hideBalance)}</label>
        <label class="row"><span class="label">Live Prices</span>${switchHTML('data-s="live"', S.settings.live)}</label>
      </div>
      <div class="group-title">Wallet</div>
      <div class="group">
        <button class="row" data-manage><span class="label">Manage Token List</span>${I.chev}</button>
        <button class="row" data-addrs><span class="label">Your Addresses</span>${I.chev}</button>
        <button class="row" data-regen><span class="label accent">Generate New Addresses</span></button>
      </div>
      <div class="group"><button class="row danger-row" data-reset>Reset Wallet</button></div>
      <p class="fine">Nebula is a wallet simulator. Balances, prices and transactions are made up and stay on this device.</p>`);
  };
  render();
  s.el.addEventListener('input', e => {
    const f = e.target.dataset.f;
    if (f === 'name') S.account.name = e.target.value.trim() || 'Account 1';
    if (f === 'handle') S.account.handle = e.target.value.replace(/[@\s]/g, '');
    if (f) { persist(); renderHome(); }
  });
  s.el.addEventListener('change', e => {
    const k = e.target.dataset.s;
    if (k) { S.settings[k] = e.target.checked; persist(); refreshAll(); }
  });
  s.el.addEventListener('click', async e => {
    if (e.target.closest('[data-avatar]')) editAvatar(render);
    else if (e.target.closest('[data-sec]')) lock.openSettings({ onClose: render });
    else if (e.target.closest('[data-manage]')) manageTokens();
    else if (e.target.closest('[data-addrs]')) receiveFlow();
    else if (e.target.closest('[data-regen]')) {
      const ok = await actionSheet({ message: 'Replace all of your addresses with new random ones?', actions: [{ label: 'Generate New Addresses', value: 1 }] });
      if (ok) { S.account.addrs = newAddrs(); persist(); refreshAll(); toast('New addresses ready', I.check); }
    } else if (e.target.closest('[data-reset]')) {
      const ok = await actionSheet({ title: 'Reset Wallet', message: 'This erases every balance, token, collectible and activity in Nebula.', actions: [{ label: 'Reset Wallet', style: 'destructive', value: 1 }] });
      if (!ok) return;
      clearTimeout(saveTimer);
      try { localStorage.removeItem(KEY); } catch {}
      await clearImages('nebula:');
      location.reload();
    }
  });
}

/* ---------- global events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const id = el.dataset.id;
  switch (el.dataset.act) {
    case 'tab': return setTab(id);
    case 'settings': return openSettings();
    case 'scan': return openScanner();
    case 'toggle-hide':
      S.settings.hideBalance = !S.settings.hideBalance;
      haptic(); persist(); return refreshAll();
    case 'receive': return receiveFlow(id);
    case 'send': return sendFlow(id);
    case 'swap':
      if (id) { if (sw.to === id) sw.to = sw.from; sw.from = id; renderSwap(); }
      closePages();
      return setTab('swap');
    case 'buy': return buyFlow(id);
    case 'manage': return manageTokens();
    case 'token': return openToken(id);
    case 'swap-pick': return swapPick(id);
    case 'swap-flip':
      [sw.from, sw.to] = [sw.to, sw.from];
      haptic();
      return renderSwap();
    case 'swap-max':
      sw.amt = String(+tok(sw.from).amount.toFixed(8));
      return renderSwap();
    case 'swap-go': return swapGo();
    case 'act-add': return addActivity();
    case 'act-open': return openActivity(id);
    case 'nft-add': return addNft();
    case 'nft-open': return openNft(id);
  }
});
document.addEventListener('input', e => {
  if (e.target.matches('[data-explore]')) {
    exploreQ = e.target.value;
    $('[data-ex-list]').innerHTML = exploreList();
    updateLive(view('explore'));
  } else if (e.target.matches('[data-swap-amt]')) {
    sw.amt = e.target.value;
    updateSwap();
  }
});

/* ---------- boot ---------- */
if (lock.cfg.lockOnOpen) lock.lock();
await loadImages('nebula:');
buildShell();
refreshAll();
setInterval(() => { if (S.settings.live && !document.hidden) tick(); }, 3000);
lock.offer();
registerSW('../sw.js');
