// Crescent Bay — shots (r7 fresh)
// Mode screenshot: baca URL param ?shot=start|play|end&seed=1.
// Menyiapkan scene deterministik lalu menandai siap untuk capture
// (window.__shotsReady = true). ES module.

import { START_MONEY } from './config.js';
import { MISSIONS } from './missions.js';

// Titik deterministik untuk scene play (tengah jalan Downtown).
const PLAY_SPOT = { x: 920, y: 720 };

function params() {
  try {
    return new URLSearchParams(window.location.search);
  } catch (_e) {
    return new URLSearchParams('');
  }
}

function showOverlay(id) {
  const n = document.getElementById(id);
  if (n) n.style.display = 'flex';
}

function hideOverlay(id) {
  const n = document.getElementById(id);
  if (n) n.style.display = 'none';
}

// Siapkan scene sesuai ?shot=. game adalah objek game dari main.js.
// Return nama shot ('start' | 'play' | 'end') atau null bila tidak ada param.
export function setupShots(game) {
  if (typeof window === 'undefined' || !game) return null;
  const shot = params().get('shot');
  if (!shot) return null;
  window.__shotsReady = false;

  const p = game.player;
  const apply = () => {
    if (shot === 'start') {
      // Layar menu: mode menu, pemain di spawn, HUD default.
      game.mode = 'menu';
      p.x = 1200;
      p.y = 900;
      p.money = START_MONEY;
      p.health = 100;
    } else if (shot === 'play') {
      // Gameplay tengah jalan: pemain + mobil + polisi, wanted 1.
      game.mode = 'playing';
      p.x = PLAY_SPOT.x;
      p.y = PLAY_SPOT.y;
      p.angle = 0;
      p.money = 125;
      p.health = 82;
      p.mag = 9;
      p.ammo = 36;
      p.inCar = false;
      p.car = null;
      // Mobil parkir di samping pemain.
      const car = game.cars && game.cars[0];
      if (car) {
        car.x = PLAY_SPOT.x + 60;
        car.y = PLAY_SPOT.y;
        car.angle = 0;
      }
      // Satu polisi mengejar + 1 bintang wanted.
      game.police.wanted = 1;
      game.police.decayTimer = 25;
      game.police.cops = [{ x: PLAY_SPOT.x + 260, y: PLAY_SPOT.y - 60, angle: 0, speed: 0 }];
      // Misi 1 aktif.
      game.missions.index = 0;
      game.missions.status = 'active';
      game.missions.timeLeft = 187;
      game.missions.target = { x: MISSIONS[0].target.x, y: MISSIONS[0].target.y };
      const menu = document.getElementById('menu');
      if (menu) menu.style.display = 'none';
    } else if (shot === 'end') {
      // Layar misi selesai: uang $300, overlay complete tampil.
      game.mode = 'playing';
      p.x = 520;
      p.y = 720;
      p.money = START_MONEY + MISSIONS[0].reward; // 50 + 250 = 300
      p.health = 100;
      game.missions.index = 0;
      game.missions.status = 'done';
      game.missions.completed = [0];
      game.missions.target = null;
      const menu = document.getElementById('menu');
      if (menu) menu.style.display = 'none';
      const n = document.getElementById('complete-text');
      if (n) n.textContent = MISSIONS[0].name + ' SELESAI! +$' + MISSIONS[0].reward + ' — Selin: "Kerja bagus, Rook."';
      showOverlay('complete');
    } else {
      return;
    }
    // Satu frame render lalu tandai siap (main loop jalan terus).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.__shotsReady = true;
      });
    });
  };

  // Tunggu DOM + modul main selesai init (menu sudah tampil).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    setTimeout(apply, 50);
  }
  return shot;
}
