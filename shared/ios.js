// Shared helpers for the Larp apps: storage, haptics, sheets, pages and the Face ID lock.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

if ('switch' in HTMLInputElement.prototype) document.documentElement.classList.add('native-switch');

/* ---------- storage ---------- */
export function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

// Images live in IndexedDB (localStorage is too small) and are mirrored in memory for sync rendering.
export const images = new Map();
let dbPromise;
function db() {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('larp-images', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('img');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function idb(mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction('img', mode);
    fn(tx.objectStore('img'));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  }));
}
export async function loadImages(prefix) {
  try {
    const d = await db();
    await new Promise(resolve => {
      const req = d.transaction('img').objectStore('img').openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return resolve();
        if (String(c.key).startsWith(prefix)) images.set(c.key, c.value);
        c.continue();
      };
      req.onerror = resolve;
    });
  } catch {}
}
export async function setImage(key, data) {
  images.set(key, data);
  try { await idb('readwrite', s => s.put(data, key)); } catch {}
}
export async function deleteImage(key) {
  images.delete(key);
  try { await idb('readwrite', s => s.delete(key)); } catch {}
}
export async function clearImages(prefix) {
  for (const k of [...images.keys()]) if (k.startsWith(prefix)) await deleteImage(k);
}

let picking = false;
export function pickImage({ max = 1200, type = 'image/jpeg', quality = 0.86 } = {}) {
  return new Promise(resolve => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    input.style.cssText = 'position:fixed;left:-999px;top:0;opacity:0';
    document.body.appendChild(input);
    picking = true;
    const done = v => { picking = false; input.remove(); resolve(v); };
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      done(f ? await resizeImage(f, max, type, quality) : null);
    });
    input.addEventListener('cancel', () => done(null));
    input.click();
  });
}
async function resizeImage(file, max, type, quality) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(type, quality);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------- haptics ---------- */
// iOS 18+ Safari plays the system haptic when a native switch toggles, even via label.click().
let hapticEl;
export function haptic() {
  try {
    if (!hapticEl) {
      hapticEl = document.createElement('label');
      hapticEl.setAttribute('aria-hidden', 'true');
      hapticEl.style.cssText = 'position:fixed;left:-100px;top:-100px;opacity:0;pointer-events:none';
      hapticEl.innerHTML = '<input type="checkbox" switch tabindex="-1">';
      document.body.appendChild(hapticEl);
    }
    hapticEl.click();
    navigator.vibrate?.(8);
  } catch {}
}

/* ---------- toast ---------- */
export function toast(msg, icon = '') {
  const t = document.createElement('div');
  t.className = 'ios-toast';
  t.innerHTML = `${icon}<span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  nextFrame().then(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, 1900);
}

export const switchHTML = (attrs = '', on = false) =>
  `<span class="switch"><input type="checkbox" switch ${attrs}${on ? ' checked' : ''}><i></i></span>`;

/* ---------- sheets ---------- */
let sheetDepth = 0;
export function sheet(html, { full = false, onClose, className = '' } = {}) {
  const root = document.createElement('div');
  root.className = 'sheet-root';
  root.style.zIndex = 100 + ++sheetDepth * 2;
  root.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet ${full ? 'full' : ''} ${className}"><div class="sheet-grabber"></div><div class="sheet-body"></div></div>`;
  const panel = root.querySelector('.sheet');
  const body = root.querySelector('.sheet-body');
  body.innerHTML = html;
  document.body.appendChild(root);
  document.body.classList.add('has-sheet');
  let closed = false;
  const api = {
    root,
    el: body,
    set(h) { body.innerHTML = h; },
    close() {
      if (closed) return;
      closed = true;
      panel.style.transform = '';
      root.classList.remove('open');
      if (--sheetDepth === 0) document.body.classList.remove('has-sheet');
      setTimeout(() => root.remove(), 450);
      onClose?.();
    },
    get closed() { return closed; },
  };
  root.querySelector('.sheet-backdrop').addEventListener('click', api.close);
  body.addEventListener('click', e => { if (e.target.closest('[data-close]')) api.close(); });
  dragToDismiss(panel, body, api.close);
  nextFrame().then(() => root.classList.add('open'));
  return api;
}

function dragToDismiss(panel, body, close) {
  let y0 = null, dy = 0, t0 = 0, dragging = false;
  panel.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    if (e.target.closest('input,textarea,.no-drag')) return;
    const inHead = e.target.closest('.sheet-grabber,.sheet-head');
    if (!inHead && body.scrollTop > 0) return;
    y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); dragging = false;
  }, { passive: true });
  panel.addEventListener('touchmove', e => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (!dragging) {
      if (dy > 10) { dragging = true; panel.style.transition = 'none'; }
      else if (dy < -4) { y0 = null; return; }
      else return;
    }
    e.preventDefault();
    panel.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, { passive: false });
  panel.addEventListener('touchend', () => {
    if (y0 == null) return;
    y0 = null;
    if (!dragging) return;
    dragging = false;
    panel.style.transition = '';
    if (dy > 140 || dy / (Date.now() - t0) > 0.6) close();
    else panel.style.transform = '';
  });
}

/* ---------- action sheet ---------- */
export function actionSheet({ title = '', message = '', actions = [], cancel = 'Cancel' } = {}) {
  return new Promise(resolve => {
    const root = document.createElement('div');
    root.className = 'as-root';
    const head = title || message ? `<div class="as-title">${title ? `<b>${esc(title)}</b>` : ''}${message ? `<span>${esc(message)}</span>` : ''}</div>` : '';
    root.innerHTML = `<div class="as-backdrop"></div><div class="as-wrap"><div class="as-group">${head}${actions.map((a, i) => `<button class="as-btn ${a.style || ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div><div class="as-group"><button class="as-btn cancel" data-cancel>${esc(cancel)}</button></div></div>`;
    document.body.appendChild(root);
    const done = v => { root.classList.remove('open'); setTimeout(() => root.remove(), 350); resolve(v); };
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) { const a = actions[+b.dataset.i]; return done(a.value ?? a.label); }
      if (e.target.closest('[data-cancel]') || e.target.classList.contains('as-backdrop')) done(null);
    });
    nextFrame().then(() => root.classList.add('open'));
  });
}

/* ---------- pushed pages (with edge swipe back) ---------- */
export function push(html, { onClose } = {}) {
  const el = document.createElement('section');
  el.className = 'page';
  el.innerHTML = html;
  document.getElementById('app').appendChild(el);
  let closed = false;
  const api = {
    el,
    close() {
      if (closed) return;
      closed = true;
      el.style.transform = '';
      el.classList.remove('in');
      setTimeout(() => el.remove(), 460);
      onClose?.();
    },
  };
  el.addEventListener('click', e => { if (e.target.closest('[data-back]')) api.close(); });
  let x0 = null, dx = 0, t0 = 0;
  el.addEventListener('touchstart', e => {
    const t = e.touches[0];
    if (t.clientX > 28) return;
    x0 = t.clientX; dx = 0; t0 = Date.now();
    el.style.transition = 'none';
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (x0 == null) return;
    dx = Math.max(0, e.touches[0].clientX - x0);
    el.style.transform = `translateX(${dx}px)`;
    e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchend', () => {
    if (x0 == null) return;
    x0 = null;
    el.style.transition = '';
    if (dx > innerWidth * 0.33 || dx / (Date.now() - t0) > 0.5) api.close();
    else el.style.transform = '';
  });
  nextFrame().then(() => el.classList.add('in'));
  return api;
}

/* ---------- passcode keypad ---------- */
export function passcodePad(title, check) {
  return new Promise(resolve => {
    const L = ['', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ'];
    const el = document.createElement('div');
    el.className = 'pc-root';
    el.innerHTML = `<div class="pc-title">${esc(title)}</div><div class="pc-dots">${'<i></i>'.repeat(6)}</div>
      <div class="pc-grid">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="pc-key" data-k="${n}"><b>${n}</b><small>${L[n - 1]}</small></button>`).join('')}<span></span><button class="pc-key" data-k="0"><b>0</b></button><span></span></div>
      <div class="pc-foot"><button data-cancel>Cancel</button><button data-del>Delete</button></div>`;
    document.body.appendChild(el);
    nextFrame().then(() => el.classList.add('open'));
    const dots = el.querySelectorAll('.pc-dots i');
    let code = '', busy = false;
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
    const finish = v => { el.classList.remove('open'); setTimeout(() => el.remove(), 260); resolve(v); };
    const reject = async () => {
      const d = el.querySelector('.pc-dots');
      d.classList.add('shake');
      await sleep(450);
      d.classList.remove('shake');
      code = '';
      paint();
    };
    el.addEventListener('click', async e => {
      if (busy) return;
      const k = e.target.closest('[data-k]');
      if (k) {
        if (code.length >= 6) return;
        code += k.dataset.k;
        paint();
        haptic();
        if (code.length < 6) return;
        if (!check) return finish(code);
        let ok = check(code);
        if (ok instanceof Promise) { busy = true; ok = await ok; busy = false; }
        if (ok) finish(code); else reject();
        return;
      }
      if (e.target.closest('[data-del]')) { code = code.slice(0, -1); paint(); }
      else if (e.target.closest('[data-cancel]')) finish(null);
    });
  });
}

/* ---------- Face ID ---------- */
export const FACE_ID = `<svg class="fid" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><g class="fid-corners"><path d="M4 16V10Q4 4 10 4H16"/><path d="M44 4H50Q56 4 56 10V16"/><path d="M4 44V50Q4 56 10 56H16"/><path d="M44 56H50Q56 56 56 50V44"/></g><g class="fid-face"><path d="M20 21V26"/><path d="M40 21V26"/><path d="M30 21V33Q30 35 28 35H27"/><path d="M21 41Q30 47 39 41"/></g><path class="fid-check" d="M17 31L26 40L44 21"/></svg>`;
const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';

const randBytes = n => crypto.getRandomValues(new Uint8Array(n));
const b64u = {
  enc: buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0)),
};
async function sha(s) {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('larp:' + s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'plain:' + s;
  }
}

function makeHud() {
  const el = document.createElement('div');
  el.className = 'fid-hud';
  el.innerHTML = `<div class="fid-box">${FACE_ID}<div class="fid-label">Face ID</div></div>`;
  document.body.appendChild(el);
  nextFrame().then(() => el.classList.add('in'));
  return el;
}

/**
 * Face ID lock for one app. Modes: 'off', 'sim' (animation only) and 'real'
 * (the device's Face ID through a platform passkey, which also needs a passcode fallback).
 */
export function createLock({ app, name, logo, payLabel = 'Require Face ID to Pay' }) {
  const KEY = `${app}:lock`;
  const cfg = Object.assign({ mode: 'sim', lockOnOpen: true, requireForPay: true, autoLock: 10, credId: null, pass: null }, load(KEY, {}));
  const persist = () => save(KEY, cfg);
  let lockEl = null, hiddenAt = 0, busy = false;

  async function verify({ host, silentFail = false } = {}) {
    const hud = host ? null : makeHud();
    const target = host || hud;
    target.classList.remove('ok', 'fail');
    target.classList.add('scan');
    let ok = false;
    if (cfg.mode === 'real' && cfg.credId) {
      hud?.classList.add('quiet');
      try {
        await navigator.credentials.get({ publicKey: {
          challenge: randBytes(32),
          allowCredentials: [{ type: 'public-key', id: b64u.dec(cfg.credId), transports: ['internal'] }],
          userVerification: 'required',
          timeout: 60000,
        } });
        ok = true;
      } catch {
        ok = false;
      }
      hud?.classList.remove('quiet');
    } else {
      await sleep(1050);
      ok = true;
    }
    target.classList.remove('scan');
    if (ok) { target.classList.add('ok'); haptic(); await sleep(700); }
    else if (!silentFail) { target.classList.add('fail'); await sleep(850); }
    if (hud) { hud.classList.remove('in'); setTimeout(() => hud.remove(), 250); }
    return ok;
  }

  async function createPasskey() {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: randBytes(32),
      rp: { name },
      user: { id: randBytes(16), name: `${name} Lock`, displayName: `${name} Lock` },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
      attestation: 'none',
    } });
    return b64u.enc(cred.rawId);
  }

  const checkPass = async code => (await sha(code)) === cfg.pass;

  async function setPasscode() {
    const first = await passcodePad('Enter a New Passcode');
    if (!first) return false;
    const again = await passcodePad('Verify Your New Passcode', c => c === first);
    if (!again) return false;
    cfg.pass = await sha(first);
    persist();
    toast('Passcode set');
    return true;
  }

  async function setMode(m) {
    const weakening = cfg.mode === 'real' || (cfg.mode !== 'off' && m === 'off');
    if (weakening && !(await verify())) return;
    if (m === 'real') {
      if (!window.PublicKeyCredential) return toast('Face ID isn’t available here');
      let credId;
      try {
        credId = await createPasskey();
      } catch (e) {
        return toast(e?.name === 'NotAllowedError' ? 'Face ID setup cancelled' : 'Face ID setup failed');
      }
      if (!cfg.pass && !(await setPasscode())) return toast('A passcode is required');
      cfg.credId = credId;
    }
    cfg.mode = m;
    persist();
  }

  function showLock() {
    if (lockEl || cfg.mode === 'off') return;
    lockEl = document.createElement('div');
    lockEl.className = 'lock-screen';
    lockEl.innerHTML = `<div class="lock-logo">${logo}</div><div class="lock-title">${esc(name)}</div><div class="lock-sub">Locked</div>
      <button class="lock-fid tap" data-fid aria-label="Unlock with Face ID">${FACE_ID}</button>
      <div class="lock-hint">Tap to unlock with Face ID</div>
      ${cfg.pass ? '<button class="lock-pass" data-pass>Enter Passcode</button>' : ''}`;
    document.body.appendChild(lockEl);
    lockEl.addEventListener('click', async e => {
      if (e.target.closest('[data-fid]')) attempt(false);
      else if (e.target.closest('[data-pass]') && (await passcodePad('Enter Passcode', checkPass))) unlock();
    });
    setTimeout(() => attempt(true), 350);
  }
  async function attempt(auto) {
    if (busy || !lockEl) return;
    busy = true;
    const ok = await verify({ silentFail: auto });
    busy = false;
    if (ok) unlock();
  }
  function unlock() {
    const el = lockEl;
    lockEl = null;
    el?.classList.add('out');
    setTimeout(() => el?.remove(), 420);
  }

  document.addEventListener('visibilitychange', () => {
    if (picking) return;
    if (document.hidden) {
      hiddenAt = Date.now();
      document.documentElement.classList.add('privacy');
    } else {
      document.documentElement.classList.remove('privacy');
      if (cfg.mode !== 'off' && cfg.lockOnOpen && hiddenAt && Date.now() - hiddenAt >= cfg.autoLock * 1000) showLock();
    }
  });

  const autoLabel = v => v === 0 ? 'Immediately' : v < 60 ? `After ${v} seconds` : `After ${v / 60} minute${v > 60 ? 's' : ''}`;

  function openSettings({ onClose } = {}) {
    const s = sheet('', { onClose });
    const render = () => s.set(`
      <div class="sheet-head"><span></span><h2>Face ID &amp; Passcode</h2><button class="link b" data-close>Done</button></div>
      <div class="fid-hero">${FACE_ID}</div>
      <div class="group-title">Face ID</div>
      <div class="group"><div class="row"><div class="seg">${[['off', 'Off'], ['sim', 'Simulated'], ['real', 'Device']].map(([m, l]) => `<button data-mode="${m}" class="${cfg.mode === m ? 'on' : ''}">${l}</button>`).join('')}</div></div></div>
      <div class="group-foot">${cfg.mode === 'real'
        ? 'Using your iPhone’s real Face ID through a passkey. iOS shows its own prompt.'
        : 'Simulated plays the Face ID animation. Device uses your iPhone’s real Face ID.'}</div>
      ${cfg.mode !== 'off' ? `<div class="group">
        <label class="row"><span class="label">Lock on Open</span>${switchHTML('data-k="lockOnOpen"', cfg.lockOnOpen)}</label>
        <label class="row"><span class="label">${esc(payLabel)}</span>${switchHTML('data-k="requireForPay"', cfg.requireForPay)}</label>
        <button class="row" data-autolock><span class="label">Auto-Lock</span><span class="value">${autoLabel(cfg.autoLock)}</span>${CHEV}</button>
      </div>` : ''}
      <div class="group">
        <button class="row" data-setpass><span class="label accent">${cfg.pass ? 'Change Passcode' : 'Turn Passcode On'}</span></button>
        ${cfg.pass ? '<button class="row" data-passoff><span class="label danger">Turn Passcode Off</span></button>' : ''}
      </div>
      <div class="group-foot">The passcode is your backup when Face ID doesn’t work.</div>`);
    render();
    s.el.addEventListener('click', async e => {
      const m = e.target.closest('[data-mode]')?.dataset.mode;
      if (m) {
        if (m !== cfg.mode) { haptic(); await setMode(m); render(); }
      } else if (e.target.closest('[data-autolock]')) {
        const v = await actionSheet({ title: 'Auto-Lock', actions: [0, 10, 60, 300].map(value => ({ label: autoLabel(value), value })) });
        if (v != null) { cfg.autoLock = v; persist(); render(); }
      } else if (e.target.closest('[data-setpass]')) {
        if (cfg.pass && !(await passcodePad('Enter Old Passcode', checkPass))) return;
        if (await setPasscode()) render();
      } else if (e.target.closest('[data-passoff]')) {
        if (cfg.mode === 'real') return toast('Switch Face ID off Device first');
        if (await passcodePad('Enter Passcode', checkPass)) { cfg.pass = null; persist(); render(); }
      }
    });
    s.el.addEventListener('change', e => {
      const k = e.target.dataset.k;
      if (k) { cfg[k] = e.target.checked; persist(); }
    });
    return s;
  }

  return {
    cfg,
    get enabled() { return cfg.mode !== 'off'; },
    get needed() { return cfg.mode !== 'off' && cfg.requireForPay; },
    modeLabel: () => ({ off: 'Off', sim: 'Simulated', real: 'On' })[cfg.mode],
    verify,
    lock: showLock,
    openSettings,
  };
}

export function registerSW(path) {
  if (!('serviceWorker' in navigator) || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
  navigator.serviceWorker.register(path).catch(() => {});
}
