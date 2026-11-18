// Crescent Bay — render (r7 fresh)
// Menggambar dunia + entitas ke canvas 2D. Tanpa network, tanpa Three.js.
// draw(ctx, state) dengan state: { city, player, cars, police, bullets, camera? }.
// player: {x, y, angle, color?}; cars/police: [{x, y, angle, color?}];
// bullets: [{x, y}]; camera: {x, y} opsional (default: ikuti pemain).

import { WORLD_W, WORLD_H, DISTRICTS } from './config.js';
import { shorelineX, BEACH_WIDTH } from './world.js';

const PALETTE = {
  water: '#1e6f9e',
  waterDeep: '#155a82',
  sand: '#e8d29a',
  grass: '#3f7d4a',
  road: '#3a3a40',
  roadLine: '#d8c95a',
  building: '#8a8f98',
  buildingRoof: '#6e7278',
  dock: '#7a5230',
  boat: '#e8e8e8',
  palmTrunk: '#6b4a2f',
  palmLeaf: '#2e8b57',
  health: '#e5484d',
  money: '#37c978',
  ammo: '#f5a623',
  player: '#2f9e44',
  police: '#2563eb',
};

function drawBuilding(ctx, b) {
  ctx.fillStyle = PALETTE.building;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = PALETTE.buildingRoof;
  ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
  // Jendela sederhana.
  ctx.fillStyle = 'rgba(255, 240, 160, 0.55)';
  const cols = Math.max(1, Math.floor(b.w / 26));
  const rows = Math.max(1, Math.floor(b.h / 26));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      ctx.fillRect(b.x + 8 + i * 26, b.y + 8 + j * 26, 10, 12);
    }
  }
}

function drawPalm(ctx, p) {
  ctx.strokeStyle = PALETTE.palmTrunk;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + 3, p.y - 14);
  ctx.stroke();
  ctx.fillStyle = PALETTE.palmLeaf;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(p.x + 3 + Math.cos(a) * 8, p.y - 16 + Math.sin(a) * 5, 10, 4, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPerson(ctx, e, color) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle || 0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  // Arah hadap.
  ctx.fillStyle = '#222';
  ctx.fillRect(8, -2, 8, 4);
  ctx.restore();
}

function drawCar(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle || 0);
  ctx.fillStyle = c.color || '#c0392b';
  ctx.fillRect(-18, -9, 36, 18);
  ctx.fillStyle = 'rgba(180, 220, 255, 0.8)';
  ctx.fillRect(-6, -7, 12, 14);
  ctx.restore();
}

export function draw(ctx, state) {
  if (!ctx || !state || !state.city) return;
  const city = state.city;
  const vw = ctx.canvas ? ctx.canvas.width : WORLD_W;
  const vh = ctx.canvas ? ctx.canvas.height : WORLD_H;

  // Kamera: ikuti pemain, clamp ke batas dunia.
  let camX = 0;
  let camY = 0;
  const focus = state.camera || state.player;
  if (focus) {
    camX = Math.max(0, Math.min(WORLD_W - vw, focus.x - vw / 2));
    camY = Math.max(0, Math.min(WORLD_H - vh, focus.y - vh / 2));
  }

  ctx.save();
  ctx.translate(-camX, -camY);

  // Daratan dasar.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Teluk (air) + strip pasir — digambar per pita horizontal.
  for (let y = 0; y < WORLD_H; y += 24) {
    const s = shorelineX(y + 12);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, y, s, 24);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(s, y, BEACH_WIDTH, 24);
  }
  // Kilau air.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (let y = 60; y < WORLD_H; y += 120) {
    const s = shorelineX(y);
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(Math.max(20, s - 30), y);
    ctx.stroke();
  }

  // Jalan.
  for (const r of city.roads) {
    ctx.fillStyle = PALETTE.road;
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  // Garis tengah jalan.
  ctx.strokeStyle = PALETTE.roadLine;
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 16]);
  for (const r of city.roads) {
    ctx.beginPath();
    if (r.w > r.h) {
      const cy = r.y + r.h / 2;
      ctx.moveTo(r.x, cy);
      ctx.lineTo(r.x + r.w, cy);
    } else {
      const cx = r.x + r.w / 2;
      ctx.moveTo(cx, r.y);
      ctx.lineTo(cx, r.y + r.h);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Gedung.
  for (const b of city.buildings) drawBuilding(ctx, b);

  // Dermaga.
  for (const d of city.docks) {
    ctx.fillStyle = PALETTE.dock;
    ctx.fillRect(d.x - 110, d.y - 7, 110, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 5; i++) ctx.fillRect(d.x - 100 + i * 22, d.y - 7, 3, 14);
  }

  // Perahu.
  for (const b of city.boats) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle || 0);
    ctx.fillStyle = PALETTE.boat;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b03a2e';
    ctx.fillRect(-4, -14, 8, 12);
    ctx.restore();
  }

  // Palem.
  for (const p of city.palms) drawPalm(ctx, p);

  // Pickup.
  for (const p of city.pickups || []) {
    const color = p.kind === 'health' ? PALETTE.health
      : p.kind === 'money' ? PALETTE.money : PALETTE.ammo;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.kind === 'health' ? '+' : p.kind === 'money' ? '$' : 'A', p.x, p.y + 0.5);
  }

  // Mobil.
  for (const c of state.cars || []) drawCar(ctx, c);

  // Polisi.
  for (const p of state.police || []) drawPerson(ctx, p, PALETTE.police);

  // Pemain.
  if (state.player) drawPerson(ctx, state.player, state.player.color || PALETTE.player);

  // Peluru.
  ctx.fillStyle = '#ffe14d';
  for (const b of state.bullets || []) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Label distrik di tengah layar (teks kecil, tanpa DOM).
  if (state.player) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }
}

export { DISTRICTS };
