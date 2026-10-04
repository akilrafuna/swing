// Pocket — a card wallet simulator. Cards, balances and transactions are local and made up.
import {
  $, $$, esc, uid, sleep, clamp, nextFrame, load, save, images, loadImages, setImage, deleteImage, clearImages,
  pickImage, haptic, toast, sheet, actionSheet, createLock, switchHTML, registerSW, FACE_ID,
} from '../shared/ios.js';

const KEY = 'pocket:state';

const LOGO = `<svg viewBox="0 0 100 100"><defs><linearGradient id="pk-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2c2e"/><stop offset="1" stop-color="#050505"/></linearGradient><linearGradient id="pk-a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2dd4bf"/><stop offset="1" stop-color="#3b82f6"/></linearGradient><linearGradient id="pk-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9f0a"/><stop offset="1" stop-color="#ff375f"/></linearGradient></defs><rect width="100" height="100" fill="url(#pk-bg)"/><rect x="26" y="22" width="60" height="38" rx="5.5" fill="url(#pk-a)" transform="rotate(11.5 56 41)"/><g transform="rotate(-8 46 58)"><rect x="15" y="38.5" width="62" height="39" rx="5.5" fill="url(#pk-b)"/><rect x="24" y="52.2" width="10" height="7.5" rx="1.6" fill="#ffe4a3"/><rect x="33" y="67.5" width="36" height="3" rx="1.5" fill="#fff" fill-opacity=".55"/></g></svg>`;

const ic = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  more: ic('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
  info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'),
  sparkle: ic('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>'),
  edit: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  chev: ic('<path d="M9 5l7 7-7 7"/>'),
  photo: ic('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
  check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  card: ic('<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/>'),
  nfc: ic('<path d="M7 8.5a5 5 0 0 1 0 7"/><path d="M10.5 6a9 9 0 0 1 0 12"/><path d="M14 3.5a13 13 0 0 1 0 17"/>'),
};
const DEFS = `<svg class="defs" aria-hidden="true"><defs><linearGradient id="pk-chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2a5"/><stop offset=".5" stop-color="#cfa752"/><stop offset="1" stop-color="#f1d88f"/></linearGradient></defs></svg>`;
const CHIP = `<svg class="card-chip" viewBox="0 0 40 30"><rect x=".5" y=".5" width="39" height="29" rx="5" fill="url(#pk-chip)" stroke="rgba(0,0,0,.25)"/><path d="M0 10h13M0 20h13M27 10h13M27 20h13M13 0v30M27 0v30M13 15h14" stroke="rgba(0,0,0,.28)" fill="none"/></svg>`;
const NFC = `<svg class="card-nfc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 8.5a5 5 0 0 1 0 7"/><path d="M10.5 6a9 9 0 0 1 0 12"/><path d="M14 3.5a13 13 0 0 1 0 17"/></svg>`;
const CHECK_CIRCLE = '<svg class="ok-circle" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="currentColor"/><path d="M15 27l7.5 7.5L38 19" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const PRESETS = {
  midnight: { bg: 'linear-gradient(135deg,#48484a,#0b0b0c)', text: 'light' },
  obsidian: { bg: 'repeating-linear-gradient(115deg,rgba(255,255,255,.04) 0 2px,transparent 2px 5px),linear-gradient(135deg,#232325,#000)', text: 'light' },
  titanium: { bg: 'linear-gradient(135deg,#fafafa,#d1d1d6 55%,#f2f2f7)', text: 'dark' },
  platinum: { bg: 'linear-gradient(135deg,#ececf1,#9d9da6 50%,#d6d6dc)', text: 'dark' },
  gold: { bg: 'linear-gradient(135deg,#f7e3a3,#c99a3d 55%,#f0d58a)', text: 'dark' },
  rose: { bg: 'linear-gradient(135deg,#ffd1dc,#ff6b8b)', text: 'dark' },
  ocean: { bg: 'linear-gradient(135deg,#0a84ff,#5e5ce6)', text: 'light' },
  sky: { bg: 'linear-gradient(135deg,#bde0ff,#4dabf7)', text: 'dark' },
  sunset: { bg: 'linear-gradient(135deg,#ff9f0a,#ff375f)', text: 'light' },
  grape: { bg: 'linear-gradient(135deg,#d07bff,#5e5ce6)', text: 'light' },
  mint: { bg: 'linear-gradient(135deg,#63e6be,#0c8a65)', text: 'light' },
  forest: { bg: 'linear-gradient(135deg,#2f9e6a,#0b3d26)', text: 'light' },
};

const CATS = {
  food: { emoji: '🍔', color: '#ff9f0a', label: 'Food' },
  coffee: { emoji: '☕️', color: '#a2845e', label: 'Coffee' },
  shopping: { emoji: '🛍️', color: '#ff375f', label: 'Shopping' },
  groceries: { emoji: '🛒', color: '#30d158', label: 'Groceries' },
  gas: { emoji: '⛽️', color: '#ff453a', label: 'Gas' },
  travel: { emoji: '✈️', color: '#0a84ff', label: 'Travel' },
  transport: { emoji: '🚕', color: '#ffcc00', label: 'Transport' },
  fun: { emoji: '🎬', color: '#bf5af2', label: 'Fun' },
  health: { emoji: '💊', color: '#64d2ff', label: 'Health' },
  bills: { emoji: '💡', color: '#5e5ce6', label: 'Bills' },
  transfer: { emoji: '💸', color: '#34c759', label: 'Transfer' },
  nightlife: { emoji: '🍾', color: '#ff2d55', label: 'Nightlife' },
  hotel: { emoji: '🏨', color: '#32ade6', label: 'Hotels' },
  cars: { emoji: '🏎️', color: '#ff3b30', label: 'Cars' },
  luxury: { emoji: '💎', color: '#5ac8fa', label: 'Luxury' },
  other: { emoji: '🧾', color: '#8e8e93', label: 'Other' },
};
// [merchant, category, lowest price, highest price]; Randomize only picks what the card can afford.
const MERCHANTS = [
  ['Corner Coffee Co.', 'coffee', 4, 11],
  ['Taco Truck', 'food', 9, 24],
  ['Late Night Pizza', 'food', 14, 42],
  ['Night Owl Diner', 'food', 18, 64],
  ['Pharmacy Plus', 'health', 8, 45],
  ['City Rideshare', 'transport', 12, 58],
  ['Movie Palace', 'fun', 16, 48],
  ['Green Grocer', 'groceries', 28, 160],
  ['Gas & Go', 'gas', 35, 95],
  ['Power & Light Co.', 'bills', 80, 240],
  ['Sushi Palace', 'food', 60, 240],
  ['Rooftop Lounge', 'nightlife', 90, 420],
  ['Spa & Sauna', 'health', 120, 450],
  ['Concert Tickets', 'fun', 150, 900],
  ['Sneaker Vault', 'shopping', 160, 480],
  ['Steakhouse 1920', 'food', 180, 640],
  ['Boutique Hotel', 'hotel', 280, 900],
  ['Airline Tickets', 'travel', 380, 1600],
  ['Tech Store', 'shopping', 499, 2400],
  ['Michelin Tasting Menu', 'food', 600, 2400],
  ['Five Star Hotel', 'hotel', 900, 8000],
  ['Designer Atelier', 'shopping', 900, 6400],
  ['Exotic Car Rental', 'cars', 1200, 6000],
  ['VIP Table Service', 'nightlife', 2000, 15000],
  ['Luxury Watch Boutique', 'luxury', 2400, 18500],
  ['Helicopter Tour', 'travel', 2500, 9000],
  ['Fine Jewelry', 'luxury', 3000, 25000],
  ['First Class Flight', 'travel', 6500, 18000],
  ['Private Jet Charter', 'travel', 8500, 65000],
  ['Yacht Club Marina', 'travel', 12000, 90000],
  ['Penthouse Rental', 'hotel', 15000, 80000],
  ['Art Auction House', 'luxury', 25000, 600000],
  ['Diamond Exchange', 'luxury', 40000, 250000],
  ['Supercar Dealership', 'cars', 180000, 420000],
];
const CITIES = ['Miami, FL', 'Los Angeles, CA', 'New York, NY', 'Las Vegas, NV', 'Beverly Hills, CA', 'Aspen, CO', 'Monaco', 'Dubai', 'Bikini Bottom'];
const pick = a => a[Math.floor(Math.random() * a.length)];

const NF2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = n => (n < 0 ? '-$' : '$') + NF2.format(Math.abs(n));
const num = s => { const n = parseFloat(String(s).replace(/[,\s$]/g, '')); return Number.isFinite(n) ? n : 0; };
const round2 = n => Math.round(n * 100) / 100;
const toLocalInput = ts => { const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
function relDay(ts) {
  const diff = Date.now() - ts, d = new Date(ts), today = new Date();
  if (diff < 6e4) return 'Just now';
  if (diff < 36e5) return `${Math.floor(diff / 6e4)} minutes ago`;
  const days = Math.round((new Date(today.toDateString()) - new Date(d.toDateString())) / 864e5);
  if (days === 0) return `${Math.floor(diff / 36e5)} hour${diff >= 72e5 ? 's' : ''} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}

/* ---------- state ---------- */
let S = load(KEY, null);
if (!S || S.v !== 1) S = { v: 1, cards: [], settings: { tilt: false } };
const persist = () => save(KEY, S);
const card = id => S.cards.find(c => c.id === id);
const lock = createLock({ app: 'pocket', name: 'Pocket', logo: LOGO, payLabel: 'Require Face ID to Pay' });

/* ---------- card face ---------- */
const textOf = (c, img) => c.text && c.text !== 'auto' ? c.text : img ? 'light' : (PRESETS[c.preset] || PRESETS.midnight).text;
function cardHTML(c, imgOverride) {
  const img = imgOverride !== undefined ? imgOverride : c.img && images.get(c.img);
  const bg = img ? `url("${img}") center/cover` : (PRESETS[c.preset] || PRESETS.midnight).bg;
  return `<div class="cardbox"><div class="card-face ${textOf(c, img)}" style='background:${bg}'>
    ${img ? '<i class="card-scrim"></i>' : ''}
    <div class="card-top"><span class="card-name">${esc(c.name || 'My Card')}</span><span class="card-net">${esc(c.network)}</span></div>
    ${c.chip ? CHIP + NFC : ''}
    <div class="card-bot"><span class="card-num">•••• ${esc(c.last4 || '0000')}</span><span class="card-holder">${esc(c.holder)}</span></div>
    <i class="card-shine"></i>
  </div></div>`;
}
const cardSig = c => JSON.stringify([c.name, c.network, c.last4, c.holder, c.preset, c.img, c.imgV, c.text, c.chip]);

/* ---------- shell ---------- */
const app = $('#app');
document.body.insertAdjacentHTML('afterbegin', DEFS);
app.innerHTML = `<div class="status-cover"></div>
  <div class="wallet" id="wallet">
    <header class="w-head"><h1>Wallet</h1><div class="w-btns">
      <button class="circle-btn tap" data-act="add" aria-label="Add card">${I.plus}</button>
      <button class="circle-btn tap" data-act="menu" aria-label="Settings">${I.more}</button></div></header>
    <div class="stack" id="stack"></div>
    <div class="empty-wallet hidden">
      <div class="ew-art"><div class="ew-card a"></div><div class="ew-card b"></div><div class="ew-card c"></div></div>
      <h2>Add a Card</h2>
      <p>Put any picture on a card — your dog, a meme, SpongeBob, whatever. Then fill it with fake transactions.</p>
      <button class="btn" data-act="add">Add Card</button>
    </div>
    <div class="details" id="details"></div>
  </div>`;
const wallet = $('#wallet'), stack = $('#stack'), details = $('#details');
const slots = new Map();
let selected = null;

const safe = { top: 0, bottom: 0 };
function measureSafe() {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(p);
  const cs = getComputedStyle(p);
  safe.top = parseFloat(cs.paddingTop) || 0;
  safe.bottom = parseFloat(cs.paddingBottom) || 0;
  p.remove();
}
function dims() {
  const W = Math.min(innerWidth - 32, 420), H = W / 1.586;
  return { W, H, peek: clamp(Math.round(H * 0.28), 48, 66) };
}

function syncCards() {
  const ids = new Set(S.cards.map(c => c.id));
  for (const [id, el] of slots) if (!ids.has(id)) { el.remove(); slots.delete(id); }
  for (const c of S.cards) {
    let el = slots.get(c.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'card-slot';
      el.dataset.card = c.id;
      el.style.setProperty('--y', `${wallet.scrollTop + innerHeight + 40 - stack.offsetTop}px`);
      stack.appendChild(el);
      slots.set(c.id, el);
      void el.offsetHeight;
    }
    const sig = cardSig(c);
    if (el._sig !== sig) { el.innerHTML = cardHTML(c); el._sig = sig; }
  }
}
function setSlot(id, y, scale, z) {
  const el = slots.get(id);
  if (!el) return;
  el.style.setProperty('--y', y + 'px');
  el.style.setProperty('--s', scale);
  el.style.zIndex = z;
  el.classList.toggle('selected', id === selected);
}
function layout() {
  const { W, H, peek } = dims();
  app.style.setProperty('--cw', W + 'px');
  app.style.setProperty('--ch', H + 'px');
  const n = S.cards.length;
  $('.empty-wallet').classList.toggle('hidden', n > 0);
  if (selected && !card(selected)) selected = null;
  app.classList.toggle('sel', !!selected);
  if (!selected) {
    stack.style.height = n ? `${(n - 1) * peek + H + 40}px` : '0';
    S.cards.forEach((c, i) => setSlot(c.id, i * peek, 1, i + 1));
    details.classList.remove('in');
    return;
  }
  const top = stack.offsetTop, s = wallet.scrollTop;
  const vy = y => y + s - top;
  setSlot(selected, vy(safe.top + 12), 1, 300);
  const others = S.cards.filter(c => c.id !== selected);
  const base = innerHeight - safe.bottom - 74;
  others.forEach((c, j) => setSlot(c.id, vy(base + Math.min(j, 3) * 9), 0.94, 100 + j));
  const dTop = safe.top + 12 + H + 14;
  details.style.top = `${s + dTop}px`;
  details.style.height = `${innerHeight - dTop}px`;
  details.style.paddingBottom = `${safe.bottom + (others.length ? 96 : 24)}px`;
}
function refresh() {
  syncCards();
  layout();
  if (selected) renderDetails();
}

function select(id) {
  selected = id;
  renderDetails();
  details.scrollTop = 0;
  haptic();
  layout();
  setTimeout(() => { if (selected === id) details.classList.add('in'); }, 120);
}
function deselect() {
  if (!selected) return;
  selected = null;
  details.classList.remove('in');
  layout();
}

/* ---------- details under the selected card ---------- */
function weekHTML(c) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
  const sums = days.map(d => c.tx.filter(t => t.type === 'purchase' && t.ts >= d.getTime() && t.ts < d.getTime() + 864e5).reduce((a, t) => a + t.amount, 0));
  const max = Math.max(...sums);
  if (!max) return '';
  return `<div class="d-title"><span>Weekly Activity</span><span class="d-count">${usd(sums.reduce((a, b) => a + b, 0))}</span></div>
    <div class="week">${sums.map((v, i) => `<div><span class="bar"><i style="height:${Math.max(4, (v / max) * 100)}%"></i></span><small>${days[i].toLocaleDateString('en-US', { weekday: 'narrow' })}</small></div>`).join('')}</div>`;
}
function txRow(t) {
  const cat = CATS[t.cat] || CATS.other;
  const plus = t.type !== 'purchase';
  return `<button class="row tx" data-act="tx-edit" data-id="${t.id}"><span class="tx-ic" style="background:${cat.color}">${cat.emoji}</span>
    <span class="tx-mid"><b>${esc(t.merchant)}</b>${t.note ? `<small>${esc(t.note)}</small>` : ''}<small>${t.status === 'pending' ? 'Pending' : relDay(t.ts)}</small></span>
    <span class="tx-amt ${plus ? 'pos' : ''}">${plus ? '+' : ''}${usd(t.amount)}</span>${I.chev}</button>`;
}
function renderDetails() {
  const c = card(selected);
  if (!c) return;
  const credit = c.kind === 'credit';
  const txs = [...c.tx].sort((a, b) => b.ts - a.ts);
  details.innerHTML = `
    <div class="d-top">
      <div class="d-bal"><small>${credit ? 'Card Balance' : 'Balance'}</small><b>${usd(c.balance)}</b>${credit ? `<small>${usd(Math.max(0, c.limit - c.balance))} Available</small>` : ''}</div>
      <button class="pay-btn tap" data-act="pay">${I.nfc}<span>Pay</span></button>
    </div>
    <div class="d-actions">
      <button class="d-act tap" data-act="info">${I.info}<span>Details</span></button>
      <button class="d-act tap" data-act="tx-add">${I.plus}<span>Add</span></button>
      <button class="d-act tap" data-act="tx-gen">${I.sparkle}<span>Randomize</span></button>
      <button class="d-act tap" data-act="edit">${I.edit}<span>Edit</span></button>
    </div>
    ${weekHTML(c)}
    <div class="d-title"><span>Latest Transactions</span></div>
    ${txs.length ? `<div class="group tx-list">${txs.map(txRow).join('')}</div>` : '<div class="d-empty">No transactions yet.<br>Tap Add or Randomize to make some.</div>'}`;
}

/* ---------- add / edit card ---------- */
function cardForm(existing) {
  const isNew = !existing;
  const c = existing ? structuredClone(existing) : {
    id: uid(), name: '', network: '', last4: '', holder: '', kind: 'credit', balance: 0, limit: 10000,
    preset: pick(Object.keys(PRESETS)), img: null, imgV: 0, text: 'auto', chip: true, tx: [],
  };
  let img = c.img ? images.get(c.img) || null : null;
  let imgChanged = false;
  const s = sheet('', { full: true });

  const intro = () => s.set(`
    <div class="sheet-head"><button class="link" data-close>Cancel</button><span></span></div>
    <div class="add-hero"><div class="ew-art"><div class="ew-card a"></div><div class="ew-card b"></div><div class="ew-card c"></div></div>
      <h2>Add to Wallet</h2><p>Make a card out of anything. It only lives on this phone.</p></div>
    <div class="group">
      <button class="row" data-go="photo"><span class="row-ic" style="background:#ff9f0a">${I.photo}</span><span class="label">Card From a Photo</span>${I.chev}</button>
      <button class="row" data-go="design"><span class="row-ic" style="background:#0a84ff">${I.card}</span><span class="label">Debit or Credit Card</span>${I.chev}</button>
    </div>`);

  const form = () => {
    s.set(`
      <div class="sheet-head"><button class="link" data-close>Cancel</button><h2>${isNew ? 'Card Details' : 'Edit Card'}</h2><button class="link b" data-save>${isNew ? 'Add' : 'Save'}</button></div>
      <div class="preview" data-preview></div>
      <div class="group-title">Look</div>
      <div class="group">
        <button class="row" data-photo><span class="label accent">${img ? 'Change Photo' : 'Choose Photo'}</span>${I.photo}</button>
        ${img ? '<button class="row" data-rmphoto><span class="label danger">Remove Photo</span></button>' : ''}
        <div class="row swatch-row no-drag"><div class="swatches">${Object.entries(PRESETS).map(([k, p]) => `<button class="swatch ${!img && c.preset === k ? 'on' : ''}" data-preset="${k}" style='background:${p.bg}' aria-label="${k}"></button>`).join('')}</div></div>
        <div class="row"><span class="label">Text</span><div class="seg narrow">${[['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button data-text="${k}" class="${textOf(c, img) === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <label class="row"><span class="label">Chip</span>${switchHTML('data-f="chip"', c.chip)}</label>
      </div>
      <div class="group-title">Card</div>
      <div class="group">
        <label class="row"><span class="label">Card Name</span><input data-f="name" value="${esc(c.name)}" placeholder="Sponge Platinum" maxlength="26"></label>
        <label class="row"><span class="label">Corner Label</span><input data-f="network" value="${esc(c.network)}" placeholder="PLATINUM" maxlength="12"></label>
        <label class="row"><span class="label">Last 4 Digits</span><input data-f="last4" value="${esc(c.last4)}" placeholder="1234" inputmode="numeric" maxlength="4"></label>
        <label class="row"><span class="label">Name on Card</span><input data-f="holder" value="${esc(c.holder)}" placeholder="Your Name" maxlength="26"></label>
        <div class="row"><span class="label">Type</span><div class="seg narrow">${[['credit', 'Credit'], ['debit', 'Debit']].map(([k, l]) => `<button data-kind="${k}" class="${c.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      </div>
      <div class="group-title">Money</div>
      <div class="group">
        <label class="row"><span class="label" data-ballabel>${c.kind === 'credit' ? 'Card Balance' : 'Balance'}</span><input data-f="balance" inputmode="decimal" value="${c.balance || ''}" placeholder="0.00"></label>
        <label class="row ${c.kind === 'credit' ? '' : 'hidden'}" data-limitrow><span class="label">Credit Limit</span><input data-f="limit" inputmode="decimal" value="${c.limit || ''}" placeholder="0.00"></label>
      </div>
      ${isNew ? '' : '<div class="group"><button class="row danger-row" data-remove>Remove Card</button></div>'}`);
    paint();
  };
  const paint = () => { $('[data-preview]', s.el).innerHTML = cardHTML(c, img); };

  async function choosePhoto() {
    const d = await pickImage({ max: 1100 });
    if (!d) return false;
    img = d;
    imgChanged = true;
    c.text = 'auto';
    return true;
  }

  isNew ? intro() : form();

  s.el.addEventListener('input', e => {
    const f = e.target.dataset.f;
    if (!f || f === 'chip') return;
    let v = e.target.value;
    if (f === 'last4') { v = v.replace(/\D/g, '').slice(0, 4); e.target.value = v; }
    c[f] = f === 'balance' || f === 'limit' ? num(v) : v;
    paint();
  });
  s.el.addEventListener('change', e => {
    if (e.target.dataset.f === 'chip') { c.chip = e.target.checked; paint(); }
  });
  s.el.addEventListener('click', async e => {
    const t = e.target;
    const go = t.closest('[data-go]')?.dataset.go;
    if (go === 'photo') { if (await choosePhoto()) form(); return; }
    if (go === 'design') return form();
    if (t.closest('[data-photo]')) { if (await choosePhoto()) form(); return; }
    if (t.closest('[data-rmphoto]')) { img = null; imgChanged = true; return form(); }
    const p = t.closest('[data-preset]');
    if (p) {
      c.preset = p.dataset.preset;
      c.text = 'auto';
      if (img) { img = null; imgChanged = true; return form(); }
      $$('[data-preset]', s.el).forEach(b => b.classList.toggle('on', b === p));
      $$('[data-text]', s.el).forEach(b => b.classList.toggle('on', b.dataset.text === textOf(c, img)));
      haptic();
      return paint();
    }
    const tx = t.closest('[data-text]');
    if (tx) {
      c.text = tx.dataset.text;
      $$('[data-text]', s.el).forEach(b => b.classList.toggle('on', b === tx));
      return paint();
    }
    const k = t.closest('[data-kind]');
    if (k) {
      c.kind = k.dataset.kind;
      $$('[data-kind]', s.el).forEach(b => b.classList.toggle('on', b === k));
      $('[data-limitrow]', s.el).classList.toggle('hidden', c.kind !== 'credit');
      $('[data-ballabel]', s.el).textContent = c.kind === 'credit' ? 'Card Balance' : 'Balance';
      return;
    }
    if (t.closest('[data-remove]')) {
      const ok = await actionSheet({ title: 'Remove Card', message: `Remove ${c.name || 'this card'} and its transactions?`, actions: [{ label: 'Remove Card', style: 'destructive', value: 1 }] });
      if (!ok) return;
      S.cards = S.cards.filter(x => x.id !== c.id);
      deleteImage(`pocket:card:${c.id}`);
      persist();
      selected = null;
      s.close();
      return refresh();
    }
    if (!t.closest('[data-save]')) return;
    c.name = c.name.trim() || 'My Card';
    c.network = c.network.trim();
    c.holder = c.holder.trim();
    if (!c.last4) c.last4 = String(Math.floor(1000 + Math.random() * 9000));
    if (imgChanged) {
      const key = `pocket:card:${c.id}`;
      if (img) { await setImage(key, img); c.img = key; c.imgV = (c.imgV || 0) + 1; }
      else { await deleteImage(key); c.img = null; }
    }
    if (!isNew) {
      Object.assign(existing, c, { tx: existing.tx });
      persist();
      s.close();
      haptic();
      return refresh();
    }
    S.cards.push(c);
    persist();
    s.set(`<div class="activate"><div class="act-card">${cardHTML(c)}</div><div class="act-status"><div class="spinner"></div><span>Activating…</span></div></div>`);
    await sleep(1700);
    if (s.closed) return refresh();
    s.set(`<div class="activate"><div class="act-card">${cardHTML(c)}</div><div class="act-status done">${CHECK_CIRCLE}<b>Card Ready</b><span>${esc(c.name)} is now in your wallet.</span></div></div>
      <div class="sheet-foot"><button class="btn" data-close>Done</button></div>`);
    haptic();
    refresh();
  });
}

/* ---------- card details sheet ---------- */
function cardInfo(c) {
  const s = sheet('');
  const render = () => s.set(`
    <div class="sheet-head"><span></span><h2>Card Details</h2><button class="link b" data-close>Done</button></div>
    <div class="preview">${cardHTML(c)}</div>
    <div class="group">
      <div class="row"><span class="label dim">Card</span><span class="value fg">${esc(c.name)}</span></div>
      <div class="row"><span class="label dim">Card Number</span><span class="value fg">•••• ${esc(c.last4)}</span></div>
      <div class="row"><span class="label dim">Type</span><span class="value fg">${c.kind === 'credit' ? 'Credit' : 'Debit'}</span></div>
      <div class="row"><span class="label dim">${c.kind === 'credit' ? 'Card Balance' : 'Balance'}</span><span class="value fg">${usd(c.balance)}</span></div>
      ${c.kind === 'credit' ? `<div class="row"><span class="label dim">Credit Limit</span><span class="value fg">${usd(c.limit)}</span></div>` : ''}
      <div class="row"><span class="label dim">Transactions</span><span class="value fg">${c.tx.length}</span></div>
    </div>
    <div class="group">
      <button class="row" data-edit><span class="label accent">Edit Card</span></button>
      ${S.cards[0] !== c ? '<button class="row" data-top><span class="label accent">Move to Top</span></button>' : ''}
      ${c.tx.length ? '<button class="row" data-clear><span class="label danger">Clear All Transactions</span></button>' : ''}
    </div>
    <div class="group"><button class="row danger-row" data-remove>Remove Card</button></div>`);
  render();
  s.el.addEventListener('click', async e => {
    if (e.target.closest('[data-edit]')) { s.close(); cardForm(c); }
    else if (e.target.closest('[data-top]')) {
      S.cards = [c, ...S.cards.filter(x => x !== c)];
      persist(); refresh(); render(); toast('Moved to top', I.check);
    } else if (e.target.closest('[data-clear]')) {
      const ok = await actionSheet({ message: 'Delete every transaction on this card?', actions: [{ label: 'Clear Transactions', style: 'destructive', value: 1 }] });
      if (ok) { c.tx = []; persist(); refresh(); render(); }
    } else if (e.target.closest('[data-remove]')) {
      const ok = await actionSheet({ title: 'Remove Card', message: `Remove ${c.name} and its transactions?`, actions: [{ label: 'Remove Card', style: 'destructive', value: 1 }] });
      if (!ok) return;
      S.cards = S.cards.filter(x => x !== c);
      deleteImage(`pocket:card:${c.id}`);
      selected = null;
      persist(); s.close(); refresh();
    }
  });
}

/* ---------- transactions ---------- */
function balanceDelta(c, t) {
  const out = t.type === 'purchase' ? 1 : -1;
  return c.kind === 'credit' ? out * t.amount : -out * t.amount;
}
function txForm(c, existing) {
  const isNew = !existing;
  const t = existing ? { ...existing } : { id: uid(), merchant: '', note: '', amount: '', ts: Date.now(), cat: 'food', status: 'done', type: 'purchase' };
  let adjust = true;
  const segs = (attr, cur, opts) => `<div class="seg">${opts.map(([k, l]) => `<button data-${attr}="${k}" class="${cur === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const s = sheet(`
    <div class="sheet-head"><button class="link" data-close>Cancel</button><h2>${isNew ? 'New Transaction' : 'Transaction'}</h2><button class="link b" data-save>${isNew ? 'Add' : 'Save'}</button></div>
    <div class="tx-hero"><span class="tx-ic xl" data-hero style="background:${CATS[t.cat].color}">${CATS[t.cat].emoji}</span>
      <div class="tx-amt-in"><span>$</span><input data-f="amount" inputmode="decimal" placeholder="0.00" value="${t.amount}" autocomplete="off"></div></div>
    <div class="group">
      <label class="row"><span class="label">Merchant</span><input data-f="merchant" value="${esc(t.merchant)}" placeholder="Krusty Krab" maxlength="40"></label>
      <label class="row"><span class="label">Location</span><input data-f="note" value="${esc(t.note)}" placeholder="Bikini Bottom" maxlength="40"></label>
      <label class="row"><span class="label">Date</span><input data-f="date" type="datetime-local" value="${toLocalInput(t.ts)}"></label>
    </div>
    <div class="group-title">Category</div>
    <div class="cats no-drag">${Object.entries(CATS).map(([k, v]) => `<button class="cat tap ${t.cat === k ? 'on' : ''}" data-cat="${k}"><span style="background:${v.color}">${v.emoji}</span><small>${v.label}</small></button>`).join('')}</div>
    <div class="group">
      <div class="row">${segs('type', t.type, [['purchase', 'Purchase'], ['refund', 'Refund'], ['payment', 'Payment']])}</div>
      <div class="row">${segs('status', t.status, [['done', 'Completed'], ['pending', 'Pending']])}</div>
      ${isNew ? `<label class="row"><span class="label">Update Card Balance</span>${switchHTML('data-adjust', true)}</label>` : ''}
    </div>
    ${isNew ? '' : '<div class="group"><button class="row danger-row" data-del>Delete Transaction</button></div>'}`, { full: true });
  s.el.addEventListener('input', e => {
    const f = e.target.dataset.f;
    if (f === 'date') t.ts = new Date(e.target.value).getTime() || Date.now();
    else if (f) t[f] = e.target.value;
  });
  s.el.addEventListener('change', e => { if (e.target.matches('[data-adjust]')) adjust = e.target.checked; });
  s.el.addEventListener('click', async e => {
    const el = e.target;
    for (const attr of ['cat', 'type', 'status']) {
      const b = el.closest(`[data-${attr}]`);
      if (!b) continue;
      t[attr] = b.dataset[attr];
      $$(`[data-${attr}]`, s.el).forEach(x => x.classList.toggle('on', x === b));
      if (attr === 'cat') { const h = $('[data-hero]', s.el); h.textContent = CATS[t.cat].emoji; h.style.background = CATS[t.cat].color; haptic(); }
      return;
    }
    if (el.closest('[data-del]')) {
      const ok = await actionSheet({ message: 'Delete this transaction?', actions: [{ label: 'Delete Transaction', style: 'destructive', value: 1 }] });
      if (!ok) return;
      c.tx = c.tx.filter(x => x.id !== t.id);
      persist(); s.close(); refresh();
      return;
    }
    if (!el.closest('[data-save]')) return;
    const amount = round2(num(t.amount));
    if (!(amount > 0)) return toast('Enter an amount');
    Object.assign(t, { amount, merchant: String(t.merchant).trim() || 'Purchase', note: String(t.note).trim() });
    if (isNew) {
      c.tx.push(t);
      if (adjust) c.balance = round2(Math.max(0, c.balance + balanceDelta(c, t)));
    } else {
      Object.assign(existing, t);
    }
    persist(); s.close(); haptic(); refresh();
  });
}
/* ---------- randomize purchases ---------- */
const budgetOf = c => (c.kind === 'credit' ? c.limit : c.balance) || 2000;
function tierOf(budget) {
  if (budget < 2000) return ['Everyday', 'Coffee, food, gas and groceries'];
  if (budget < 25000) return ['Comfortable', 'Nice dinners, sneakers, hotels and flights'];
  if (budget < 250000) return ['Big Spender', 'Designer fits, watches, VIP tables and first class'];
  return ['Billionaire', 'Private jets, yachts, supercars and art auctions'];
}
// Picks merchants the card can afford, leaning toward the expensive ones, and keeps the total under the budget.
function randomPurchases(c, count, days) {
  const budget = budgetOf(c);
  let left = budget * 0.9;
  const now = Date.now(), out = [];
  for (let i = 0; i < count; i++) {
    const pool = MERCHANTS.filter(m => m[2] <= Math.min(budget * 0.2, left * 0.5));
    if (!pool.length) break;
    let m = pick(pool);
    if (Math.random() < 0.7) {
      const weights = pool.map(p => Math.sqrt(p[2]));
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      m = pool.find((_, j) => (r -= weights[j]) <= 0) || m;
    }
    const [merchant, cat, lo, hi] = m;
    const top = Math.max(lo, Math.min(hi, budget * 0.35, left * 0.6));
    let amount = lo + Math.random() * (top - lo);
    amount = amount >= 1000 && Math.random() < 0.5 ? Math.round(amount) : round2(amount);
    left -= amount;
    out.push({ id: uid(), merchant, cat, amount, ts: now - Math.random() * days * 864e5 - 6e5, note: pick(CITIES), status: 'done', type: 'purchase' });
  }
  out.sort((a, b) => b.ts - a.ts);
  if (out[0] && now - out[0].ts < 864e5) out[0].status = 'pending';
  return out;
}
function randomizeSheet(c) {
  const st = { count: 10, days: 30, adjust: false };
  const budget = budgetOf(c);
  const [tier, blurb] = tierOf(budget);
  const segs = (attr, cur, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-${attr}="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const s = sheet(`
    <div class="sheet-head"><button class="link" data-close>Cancel</button><h2>Randomize</h2><button class="link b" data-go>Add</button></div>
    <div class="rz-hero"><span class="rz-tier">${tier}</span><b>${usd(budget)}</b><small>${c.kind === 'credit' ? 'credit limit' : 'balance'} · ${blurb}</small></div>
    <div class="group-title">How Many</div>
    <div class="group"><div class="row">${segs('count', st.count, [[5, '5'], [10, '10'], [25, '25'], [50, '50']])}</div></div>
    <div class="group-title">Over the Last</div>
    <div class="group"><div class="row">${segs('days', st.days, [[7, 'Week'], [30, 'Month'], [90, '3 Months']])}</div></div>
    <div class="group"><label class="row"><span class="label">Update Card Balance</span>${switchHTML('data-adjust', st.adjust)}</label></div>
    <div class="group-foot">Picks real-looking purchases that fit this card’s ${c.kind === 'credit' ? 'limit' : 'balance'}. Raise it to unlock fancier stuff.</div>`);
  s.el.addEventListener('change', e => { if (e.target.matches('[data-adjust]')) st.adjust = e.target.checked; });
  s.el.addEventListener('click', e => {
    for (const attr of ['count', 'days']) {
      const b = e.target.closest(`[data-${attr}]`);
      if (!b) continue;
      st[attr] = +b.dataset[attr];
      $$(`[data-${attr}]`, s.el).forEach(x => x.classList.toggle('on', x === b));
      haptic();
      return;
    }
    if (!e.target.closest('[data-go]')) return;
    const batch = randomPurchases(c, st.count, st.days);
    if (!batch.length) return toast('Raise the balance first');
    c.tx.push(...batch);
    if (st.adjust) {
      const spent = batch.reduce((a, t) => a + t.amount, 0);
      c.balance = round2(Math.max(0, c.balance + (c.kind === 'credit' ? spent : -spent)));
    }
    persist();
    s.close();
    haptic();
    refresh();
    toast(`Added ${batch.length} purchases`, I.check);
  });
}

/* ---------- pay ---------- */
async function payFlow(c) {
  const el = document.createElement('div');
  el.className = 'pay';
  el.innerHTML = `<div class="pay-card">${cardHTML(c)}</div>
    <div class="pay-stage">${lock.needed ? `<div class="pay-glyph">${FACE_ID}</div><div class="pay-label">Pay with Face ID</div>` : ''}</div>
    <button class="pay-cancel" data-x>Cancel</button>`;
  document.body.appendChild(el);
  let closed = false;
  const close = () => { if (closed) return; closed = true; el.classList.remove('in'); setTimeout(() => el.remove(), 350); };
  $('[data-x]', el).onclick = close;
  nextFrame().then(() => el.classList.add('in'));
  const stage = $('.pay-stage', el);

  if (lock.needed) {
    // verify() has to start inside the Pay tap for iOS to show Face ID.
    const authorize = () => lock.verify({ host: $('.pay-glyph', el) });
    let ok = await authorize();
    while (!ok && !closed) {
      $('.pay-label', el).innerHTML = 'Face ID Not Recognized<button class="pay-retry">Try Again</button>';
      ok = await new Promise(res => { $('.pay-retry', el).onclick = () => { $('.pay-label', el).textContent = 'Pay with Face ID'; authorize().then(res); }; });
    }
  } else {
    await sleep(350);
  }
  if (closed) return;
  stage.innerHTML = `<div class="nfc-anim">${I.nfc}${I.nfc}</div><div class="pay-label">Hold Near Reader</div><div class="pay-hint">Tap anywhere to simulate the reader</div>`;
  await new Promise(res => {
    const timer = setTimeout(res, 6000);
    el.addEventListener('click', e => { if (!e.target.closest('[data-x]')) { clearTimeout(timer); res(); } }, { once: true });
  });
  if (closed) return;
  stage.innerHTML = `<div class="pay-done">${CHECK_CIRCLE}</div><div class="pay-label">Done</div>`;
  haptic();
  await sleep(1500);
  close();
}

/* ---------- settings ---------- */
let tiltOn = false;
function onTilt(e) {
  const tx = clamp((e.gamma || 0) / 30, -1, 1), ty = clamp(((e.beta || 0) - 45) / 30, -1, 1);
  app.style.setProperty('--tx', tx.toFixed(3));
  app.style.setProperty('--ty', ty.toFixed(3));
}
async function enableTilt() {
  try {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function' && (await DeviceOrientationEvent.requestPermission()) !== 'granted') return false;
  } catch {
    return false;
  }
  if (!tiltOn) window.addEventListener('deviceorientation', onTilt);
  tiltOn = true;
  return true;
}
function disableTilt() {
  window.removeEventListener('deviceorientation', onTilt);
  tiltOn = false;
  app.style.setProperty('--tx', 0);
  app.style.setProperty('--ty', 0);
}
function openSettings() {
  const s = sheet('');
  const render = () => s.set(`
    <div class="sheet-head"><span></span><h2>Settings</h2><button class="link b" data-close>Done</button></div>
    <div class="group"><button class="row" data-sec><span class="row-ic" style="background:#30d158">${FACE_ID}</span><span class="label">Face ID</span><span class="value">${lock.modeLabel()}</span>${I.chev}</button></div>
    <div class="group"><label class="row"><span class="label">Card Shine Follows Tilt</span>${switchHTML('data-tilt', S.settings.tilt)}</label></div>
    <div class="group-foot">Moves the light on your cards as you tilt your iPhone.</div>
    <div class="group"><button class="row danger-row" data-reset>Reset Wallet</button></div>
    <p class="fine">Pocket is a card simulator for fun. Nothing in it is a real payment card.</p>`);
  render();
  s.el.addEventListener('change', async e => {
    if (!e.target.matches('[data-tilt]')) return;
    if (e.target.checked) {
      const ok = await enableTilt();
      if (!ok) { e.target.checked = false; return toast('Motion access was denied'); }
    } else disableTilt();
    S.settings.tilt = e.target.checked;
    persist();
  });
  s.el.addEventListener('click', async e => {
    if (e.target.closest('[data-sec]')) lock.openSettings({ onClose: render });
    else if (e.target.closest('[data-reset]')) {
      const ok = await actionSheet({ title: 'Reset Wallet', message: 'This removes every card and transaction.', actions: [{ label: 'Reset Wallet', style: 'destructive', value: 1 }] });
      if (!ok) return;
      try { localStorage.removeItem(KEY); } catch {}
      await clearImages('pocket:');
      location.reload();
    }
  });
}

/* ---------- events ---------- */
stack.addEventListener('click', e => {
  const slot = e.target.closest('.card-slot');
  if (!slot) return;
  if (!selected) select(slot.dataset.card);
  else deselect();
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const c = card(selected);
  switch (el.dataset.act) {
    case 'add': return cardForm();
    case 'menu': return openSettings();
    case 'pay': return c && payFlow(c);
    case 'info': return c && cardInfo(c);
    case 'edit': return c && cardForm(c);
    case 'tx-add': return c && txForm(c);
    case 'tx-gen': return c && randomizeSheet(c);
    case 'tx-edit': {
      const t = c?.tx.find(x => x.id === el.dataset.id);
      return t && txForm(c, t);
    }
  }
});
// Swipe the selected card down to go back to the stack.
let swipeY = null;
stack.addEventListener('touchstart', e => { if (selected && e.target.closest('.card-slot.selected')) swipeY = e.touches[0].clientY; }, { passive: true });
stack.addEventListener('touchend', e => {
  if (swipeY != null && e.changedTouches[0].clientY - swipeY > 60) deselect();
  swipeY = null;
});
// Without motion access, let the pointer move the card shine.
app.addEventListener('pointermove', e => {
  if (tiltOn) return;
  app.style.setProperty('--tx', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
  app.style.setProperty('--ty', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
});
addEventListener('resize', () => { measureSafe(); layout(); });

/* ---------- boot ---------- */
if (lock.cfg.lockOnOpen) lock.lock();
await loadImages('pocket:');
measureSafe();
refresh();
lock.offer();
// iOS asks for motion permission again each launch; re-request on the first tap.
if (S.settings.tilt) document.addEventListener('click', () => enableTilt(), { once: true });
registerSW('../sw.js');
