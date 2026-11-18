// Crescent Bay — police (r7 fresh)
// Sistem wanted: bintang naik saat kejahatan, polisi spawn & kejar,
// bintang hilang satu per satu tiap WANTED_DECAY_S detik. ES module.

import { WORLD_W, WORLD_H, WANTED_MAX, WANTED_DECAY_S } from './config.js';
import { isBlockedIn, isInWater } from './world.js';
import { wantedUp } from './audio.js';

const SPAWN_MIN_DIST = 420;
const SPAWN_MAX_DIST = 560;
const BUST_DIST = 26;

// State awal polisi.
export function createPolice() {
  return { wanted: 0, decayTimer: 0, cops: [] };
}

// Naikkan bintang wanted (maks WANTED_MAX), reset timer decay.
export function addWanted(state, n) {
  if (!state) return;
  const before = state.wanted;
  state.wanted = Math.max(0, Math.min(WANTED_MAX, state.wanted + n));
  if (state.wanted > before) {
    state.decayTimer = WANTED_DECAY_S;
    wantedUp();
  }
}

// Bintang wanted saat ini.
export function getWanted(state) {
  return state ? state.wanted : 0;
}

function spawnCop(state, player, city) {
  for (let tries = 0; tries < 12; tries++) {
    const a = Math.random() * Math.PI * 2;
    const d = SPAWN_MIN_DIST + Math.random() * (SPAWN_MAX_DIST - SPAWN_MIN_DIST);
    const x = Math.max(30, Math.min(WORLD_W - 30, player.x + Math.cos(a) * d));
    const y = Math.max(30, Math.min(WORLD_H - 30, player.y + Math.sin(a) * d));
    if (isInWater(x, y)) continue;
    if (isBlockedIn(city, x, y, 16)) continue;
    state.cops.push({ x, y, angle: 0, speed: 0 });
    return;
  }
  // Fallback: spawn di posisi pemain (akan dikejar dari dekat).
  state.cops.push({ x: player.x + 300, y: player.y, angle: 0, speed: 0 });
}

// Update polisi tiap frame: decay bintang, spawn/kejar pemain.
export function updatePolice(state, player, city, dt) {
  if (!state || !player) return;
  if (state.wanted > 0) {
    state.decayTimer -= dt;
    if (state.decayTimer <= 0) {
      state.wanted -= 1;
      state.decayTimer = state.wanted > 0 ? WANTED_DECAY_S : 0;
    }
  }
  // Jumlah polisi target = jumlah bintang.
  while (state.cops.length < state.wanted) spawnCop(state, player, city);
  while (state.cops.length > state.wanted) state.cops.pop();

  const speed = 215 + state.wanted * 15;
  for (const cop of state.cops) {
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    cop.angle = Math.atan2(dy, dx);
    const step = speed * dt;
    // Kejar per sumbu agar bisa geser di dinding gedung.
    const nx = cop.x + (dx / dist) * step;
    const ny = cop.y + (dy / dist) * step;
    if (!isBlockedIn(city, nx, cop.y, 14) && !isInWater(nx, cop.y)) cop.x = nx;
    if (!isBlockedIn(city, cop.x, ny, 14) && !isInWater(cop.x, ny)) cop.y = ny;
    cop.speed = speed;
  }
}

// true bila ada polisi yang menyentuh pemain (BUSTED).
export function checkBusted(state, player) {
  if (!state || !player) return false;
  for (const cop of state.cops) {
    if (Math.hypot(cop.x - player.x, cop.y - player.y) < BUST_DIST) return true;
  }
  return false;
}
