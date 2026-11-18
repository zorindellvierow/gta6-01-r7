// Crescent Bay — world (r7 fresh)
// Kota deterministik 2400x1800: teluk di barat, pantai berpasir, jalan grid,
// gedung, dermaga + perahu, palem, pickup. ES module, tanpa dependensi.

import { WORLD_W, WORLD_H, DISTRICTS } from './config.js';
import { hashStringSeed, mulberry32, range, int, pick } from './random.js';

// Garis pantai teluk: x tepi air sebagai fungsi y (lengkung sinus, deterministik).
export function shorelineX(y) {
  return 200 + 40 * Math.sin(y * 0.0035);
}

export const BEACH_WIDTH = 90; // lebar strip pasir di timur garis pantai

// true jika titik berada di air teluk (barat garis pantai).
export function isInWater(x, y) {
  return x < shorelineX(y);
}

// true jika titik berada di strip pasir pantai.
export function isOnBeach(x, y) {
  const s = shorelineX(y);
  return x >= s && x < s + BEACH_WIDTH;
}

// Nama distrik untuk sebuah titik. Selalu salah satu dari 4 distrik.
export function districtAtPoint(x, y) {
  if (isInWater(x, y) || isOnBeach(x, y)) return DISTRICTS.BEACHFRONT;
  if (x < 950 && y >= 450 && y <= 1350) return DISTRICTS.MARINA;
  if (x >= 1750) return DISTRICTS.HILLS;
  return DISTRICTS.DOWNTOWN;
}

// Jalan vertikal & horizontal (rect {x, y, w, h}).
function buildRoads() {
  const roads = [];
  const vxs = [520, 920, 1320, 1720, 2120];
  for (const vx of vxs) {
    roads.push({ x: vx - 24, y: 0, w: 48, h: WORLD_H });
  }
  const hys = [320, 720, 1120, 1520];
  for (const hy of hys) {
    roads.push({ x: 340, y: hy - 24, w: WORLD_W - 340, h: 48 });
  }
  return roads;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Kota terakhir yang digenerate (untuk isBlocked(x, y, r)).
let lastCity = null;

// Generate kota deterministik dari seed string.
// Return { buildings, roads, blocks, docks, boats, palms, pickups }.
export function generateCity(seed) {
  const rng = mulberry32(hashStringSeed(seed));
  const roads = buildRoads();

  const colEdges = [350, 496, 544, 896, 944, 1296, 1344, 1696, 1744, 2096, 2144, WORLD_W];
  const rowEdges = [0, 296, 344, 696, 744, 1096, 1144, 1496, 1544, WORLD_H];
  const blocks = [];
  for (let c = 0; c < colEdges.length; c += 2) {
    for (let r = 0; r < rowEdges.length; r += 2) {
      blocks.push({
        x: colEdges[c], y: rowEdges[r],
        w: colEdges[c + 1] - colEdges[c], h: rowEdges[r + 1] - rowEdges[r],
      });
    }
  }

  // Gedung: 1-3 per blok, di dalam blok, tidak saling tumpang tindih.
  const buildings = [];
  for (const block of blocks) {
    const n = int(rng, 1, 3);
    let tries = 0;
    let placed = 0;
    while (placed < n && tries < 24) {
      tries++;
      const w = range(rng, 60, Math.min(170, block.w - 16));
      const h = range(rng, 60, Math.min(170, block.h - 16));
      const x = range(rng, block.x + 8, block.x + block.w - 8 - w);
      const y = range(rng, block.y + 8, block.y + block.h - 8 - h);
      const b = { x, y, w, h, district: districtAtPoint(x + w / 2, y + h / 2) };
      if (buildings.some((o) => rectsOverlap(o, b))) continue;
      buildings.push(b);
      placed++;
    }
  }

  // Dermaga: 3 dermaga menjorok ke teluk.
  const dockYs = [500, 900, 1300];
  const docks = dockYs.map((y) => ({ x: shorelineX(y), y, angle: 0 }));

  // Perahu: berlabuh di dekat dermaga, di air.
  const boats = [];
  for (const d of docks) {
    const n = int(rng, 1, 2);
    for (let i = 0; i < n; i++) {
      boats.push({
        x: d.x - range(rng, 50, 110),
        y: d.y + range(rng, -70, 70),
        angle: range(rng, -0.4, 0.4),
      });
    }
  }

  // Palem: sepanjang strip pasir + beberapa di taman kota.
  const palms = [];
  for (let i = 0; i < 42; i++) {
    const y = range(rng, 20, WORLD_H - 20);
    const s = shorelineX(y);
    palms.push({ x: s + range(rng, 15, BEACH_WIDTH - 12), y });
  }
  for (let i = 0; i < 10; i++) {
    palms.push({ x: range(rng, 600, WORLD_W - 60), y: range(rng, 60, WORLD_H - 60) });
  }

  // Pickup: tersebar di darat, tidak di dalam gedung / air.
  const kinds = ['health', 'money', 'ammo'];
  const pickups = [];
  let pTries = 0;
  while (pickups.length < 14 && pTries < 300) {
    pTries++;
    const x = range(rng, 360, WORLD_W - 40);
    const y = range(rng, 40, WORLD_H - 40);
    if (isInWater(x, y) || isOnBeach(x, y)) continue;
    if (isBlockedIn({ buildings }, x, y, 26)) continue;
    pickups.push({ x, y, kind: pick(rng, kinds) });
  }

  const city = { buildings, roads, blocks, docks, boats, palms, pickups };
  lastCity = city;
  return city;
}

// Tabrakan lingkaran (x, y, radius r) vs gedung pada kota `city`.
// Return true jika lingkaran menyentuh gedung mana pun.
export function isBlockedIn(city, x, y, r) {
  if (!city || !city.buildings) return false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// Tabrakan lingkaran vs gedung pada kota terakhir hasil generateCity().
// Return false jika generateCity belum pernah dipanggil.
export function isBlocked(x, y, r) {
  return isBlockedIn(lastCity, x, y, r);
}
