// Crescent Bay — hud (r7 fresh)
// DOM HUD: uang, distrik, bintang wanted, bar health, ammo, objektif,
// toast, dan overlay menu/pause. ES module, tanpa dependensi.

let el = {};
let toastTimer = null;

const IDS = ['hud-money', 'hud-district', 'hud-wanted', 'hud-health', 'hud-ammo', 'hud-toast', 'hud-objective', 'menu', 'pause'];

// Ambil semua elemen HUD by id. Return map elemen (kosong bila belum ada DOM).
export function initHud() {
  el = {};
  if (typeof document === 'undefined') return el;
  for (const id of IDS) {
    el[id] = document.getElementById(id);
  }
  return el;
}

function setText(id, text) {
  if (el[id]) el[id].textContent = text;
}

function stars(n) {
  const filled = '★'.repeat(Math.max(0, Math.min(5, n)));
  const empty = '☆'.repeat(Math.max(0, 5 - Math.min(5, n)));
  return filled + empty;
}

// Update seluruh HUD dari state game.
// state: { money, district, wanted, health, maxHealth?, mag, ammo, objective }
export function updateHud(state) {
  if (!state) return;
  setText('hud-money', '$' + Math.floor(state.money || 0));
  setText('hud-district', state.district || '');
  setText('hud-wanted', stars(state.wanted || 0));
  if (el['hud-health']) {
    const max = state.maxHealth || 100;
    const pct = Math.max(0, Math.min(100, ((state.health || 0) / max) * 100));
    el['hud-health'].style.width = pct + '%';
    el['hud-health'].style.background = pct > 50 ? '#37c978' : pct > 25 ? '#f5a623' : '#e5484d';
  }
  const mag = state.mag !== undefined ? state.mag : 0;
  const ammo = state.ammo !== undefined ? state.ammo : 0;
  setText('hud-ammo', mag + ' / ' + ammo);
  setText('hud-objective', state.objective || '');
}

// Tampilkan pesan toast singkat (otomatis hilang ~2,5 detik).
export function toast(msg) {
  if (!el['hud-toast']) return;
  el['hud-toast'].textContent = msg;
  el['hud-toast'].style.opacity = '1';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (el['hud-toast']) el['hud-toast'].style.opacity = '0';
  }, 2500);
}

export function showMenu() {
  if (el['menu']) el['menu'].style.display = 'flex';
}

export function hideMenu() {
  if (el['menu']) el['menu'].style.display = 'none';
}

export function showPause() {
  if (el['pause']) el['pause'].style.display = 'flex';
}

export function hidePause() {
  if (el['pause']) el['pause'].style.display = 'none';
}
