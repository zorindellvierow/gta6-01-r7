// Crescent Bay — main (r7 fresh)
// Game loop + state machine (menu / playing / paused / busted / wasted).
// Wiring semua modul: gerak, mobil, tembak, pickup, wanted/polisi, misi,
// HUD, save/load. ES module.

import {
  WORLD_W, WORLD_H, WALK_SPEED, RUN_SPEED, PISTOL,
  START_MONEY, START_HEALTH, BUSTED_PENALTY, SEED,
} from './config.js';
import { generateCity, districtAtPoint, isBlockedIn, isInWater } from './world.js';
import * as input from './input.js';
import { draw } from './render.js';
import * as audio from './audio.js';
import { createVehicles, updateVehicles, enterCar, exitCar } from './vehicles.js';
import { createPolice, addWanted, updatePolice, getWanted, checkBusted } from './police.js';
import { createMissions, startMission, updateMissions, startTaxi, cancelTaxi, MISSIONS } from './missions.js';
import { initHud, updateHud, showMenu, hideMenu, showPause, hidePause, toast } from './hud.js';
import { loadSave, writeSave, clearSave, defaultSave } from './save.js';
import { setupShots } from './shots.js';

const BULLET_SPEED = 700;
const COP_DPS = 10; // damage per detik dari polisi yang dekat (wanted >= 1)
const COP_DAMAGE_RANGE = 240;
const AUTOSAVE_EVERY_S = 15;
const SPAWN = { x: 1200, y: 900 };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const city = generateCity(SEED);
const vehicles = createVehicles(city);

const game = {
  mode: 'menu', // menu | playing | paused | busted | wasted
  city,
  cars: vehicles.cars,
  player: null,
  police: createPolice(),
  missions: createMissions(),
  bullets: [],
  playTimeS: 0,
  autosaveTimer: 0,
};

function newPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2,
    health: START_HEALTH,
    money: START_MONEY,
    mag: PISTOL.mag,
    ammo: 48,
    reloadTimer: 0,
    cooldown: 0,
    inCar: false,
    car: null,
    color: '#2f9e44',
  };
}

game.player = newPlayer(SPAWN.x, SPAWN.y);

function currentSave() {
  const s = defaultSave();
  s.money = Math.floor(game.player.money);
  s.health = Math.floor(game.player.health);
  s.missionIndex = game.missions.index;
  s.completedMissions = [...game.missions.completed];
  s.position = { x: Math.floor(game.player.x), y: Math.floor(game.player.y) };
  s.wanted = getWanted(game.police);
  s.playTimeS = Math.floor(game.playTimeS);
  return s;
}

function autosave() {
  writeSave(currentSave());
}

function applySave(s) {
  game.player.money = s.money;
  game.player.health = s.health;
  game.player.x = s.position.x;
  game.player.y = s.position.y;
  game.missions = createMissions();
  game.missions.completed = [...s.completedMissions];
  game.missions.index = s.missionIndex;
  game.playTimeS = s.playTimeS || 0;
  game.police = createPolice();
  game.police.wanted = s.wanted || 0;
  game.police.decayTimer = 25;
  if (s.missionIndex < MISSIONS.length) startMission(game.missions, s.missionIndex);
}

function startNewGame() {
  clearSave();
  game.player = newPlayer(SPAWN.x, SPAWN.y);
  game.police = createPolice();
  game.missions = createMissions();
  game.bullets = [];
  game.playTimeS = 0;
  startMission(game.missions, 0);
  audio.missionStart();
  game.mode = 'playing';
  hideMenu();
  hidePause();
  hideOverlay('busted');
  hideOverlay('wasted');
  hideOverlay('complete');
  toast(MISSIONS[0].brief);
  autosave();
}

function continueGame() {
  const s = loadSave();
  if (!s) return false;
  game.player = newPlayer(s.position.x, s.position.y);
  applySave(s);
  game.bullets = [];
  game.mode = 'playing';
  hideMenu();
  hidePause();
  toast('Selamat datang kembali, Rook.');
  return true;
}

function showOverlay(id) {
  const n = document.getElementById(id);
  if (n) n.style.display = 'flex';
}

function hideOverlay(id) {
  const n = document.getElementById(id);
  if (n) n.style.display = 'none';
}

function objectiveText() {
  const m = game.missions;
  if (m.taxi) {
    const t = m.taxi;
    const where = t.phase === 'pickup' ? 'Jemput penumpang' : 'Antar ke tujuan';
    return 'TAKSI: ' + where + ' — $' + t.fare + ' (' + Math.ceil(t.timeLeft) + ' dtk)';
  }
  if (m.status === 'active' && m.index < MISSIONS.length) {
    return MISSIONS[m.index].name + ' — ' + Math.ceil(m.timeLeft) + ' dtk';
  }
  if (m.status === 'done' || m.index >= MISSIONS.length) return 'Semua misi selesai. Crescent Bay milikmu, Rook.';
  return '';
}

function doBusted() {
  const penalty = Math.floor(game.player.money * BUSTED_PENALTY);
  game.player.money -= penalty;
  game.police = createPolice();
  game.bullets = [];
  audio.busted();
  game.mode = 'busted';
  const n = document.getElementById('busted-text');
  if (n) n.textContent = 'BUSTED! Polisi menyita $' + penalty + ' (20%).';
  showOverlay('busted');
  autosave();
}

function doWasted() {
  audio.wasted();
  game.mode = 'wasted';
  showOverlay('wasted');
  autosave();
}

function respawn() {
  game.player.health = START_HEALTH;
  game.player.x = SPAWN.x;
  game.player.y = SPAWN.y;
  game.player.angle = -Math.PI / 2;
  game.player.inCar = false;
  game.player.car = null;
  game.police = createPolice();
  game.bullets = [];
  hideOverlay('busted');
  hideOverlay('wasted');
  game.mode = 'playing';
  toast('Rook kembali ke jalanan.');
}

function shoot() {
  const p = game.player;
  if (p.cooldown > 0 || p.reloadTimer > 0 || p.mag <= 0) return;
  p.mag -= 1;
  p.cooldown = PISTOL.cooldownMs / 1000;
  const a = p.angle;
  game.bullets.push({
    x: p.x + Math.cos(a) * 16,
    y: p.y + Math.sin(a) * 16,
    vx: Math.cos(a) * BULLET_SPEED,
    vy: Math.sin(a) * BULLET_SPEED,
    life: PISTOL.range / BULLET_SPEED,
  });
  audio.shoot();
  if (p.mag === 0) startReload();
}

function startReload() {
  const p = game.player;
  if (p.reloadTimer > 0 || p.ammo <= 0 || p.mag >= PISTOL.mag) return;
  p.reloadTimer = PISTOL.reloadMs / 1000;
}

function finishReload() {
  const p = game.player;
  const need = PISTOL.mag - p.mag;
  const take = Math.min(need, p.ammo);
  p.mag += take;
  p.ammo -= take;
  p.reloadTimer = 0;
}

function movePlayer(dt) {
  const p = game.player;
  const mv = input.moveVector();
  if (mv.x === 0 && mv.y === 0) return;
  const speed = input.isRunning() ? RUN_SPEED : WALK_SPEED;
  p.angle = Math.atan2(mv.y, mv.x);
  const nx = p.x + mv.x * speed * dt;
  const ny = p.y + mv.y * speed * dt;
  if (!isBlockedIn(city, nx, p.y, 14) && !isInWater(nx, p.y) && nx > 14 && nx < WORLD_W - 14) p.x = nx;
  if (!isBlockedIn(city, p.x, ny, 14) && !isInWater(p.x, ny) && ny > 14 && ny < WORLD_H - 14) p.y = ny;
}

function checkPickups() {
  const p = game.player;
  const list = city.pickups;
  for (let i = list.length - 1; i >= 0; i--) {
    const pk = list[i];
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 26) {
      if (pk.kind === 'health') {
        p.health = Math.min(100, p.health + 25);
        toast('Health +25');
      } else if (pk.kind === 'money') {
        p.money += 25;
        toast('+$25');
      } else {
        p.ammo += 24;
        toast('Ammo +24');
      }
      audio.pickup();
      list.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H;
    if (!dead && isBlockedIn(city, b.x, b.y, 2)) dead = true;
    if (!dead) {
      for (let j = game.police.cops.length - 1; j >= 0; j--) {
        const cop = game.police.cops[j];
        if (Math.hypot(cop.x - b.x, cop.y - b.y) < 18) {
          game.police.cops.splice(j, 1);
          addWanted(game.police, 1);
          dead = true;
          break;
        }
      }
    }
    if (dead) game.bullets.splice(i, 1);
  }
}

function update(dt) {
  const p = game.player;
  game.playTimeS += dt;
  game.autosaveTimer += dt;
  if (game.autosaveTimer >= AUTOSAVE_EVERY_S) {
    game.autosaveTimer = 0;
    autosave();
  }

  p.cooldown = Math.max(0, p.cooldown - dt);
  if (p.reloadTimer > 0) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) finishReload();
  }

  // Pause.
  if (input.pressed('Escape') || input.pressed('KeyP')) {
    game.mode = 'paused';
    showPause();
    return;
  }

  // Masuk / keluar mobil.
  if (input.pressed('KeyF')) {
    if (p.inCar) exitCar(p, game.cars);
    else if (enterCar(p, game.cars)) toast('Mengemudi — W/S gas, A/D setir, F keluar');
  }

  // Taksi: T mulai / batalkan.
  if (input.pressed('KeyT')) {
    if (game.missions.taxi) {
      cancelTaxi(game.missions);
      toast('Tugas taksi dibatalkan.');
    } else {
      const t = startTaxi(game.missions, p);
      if (t) toast('Taksi: jemput penumpang di titik kuning.');
    }
  }

  if (p.inCar) {
    updateVehicles(game.cars, input, p, city, dt);
  } else {
    movePlayer(dt);
    checkPickups();
  }

  // Tembak (Spasi) & reload (R).
  if (input.pressed('Space') || input.isDown('Space')) shoot();
  if (input.pressed('KeyR')) startReload();

  updateBullets(dt);
  updatePolice(game.police, p, city, dt);

  // Polisi dekat menembak pemain (damage dari jarak jauh).
  if (getWanted(game.police) > 0 && !p.inCar) {
    for (const cop of game.police.cops) {
      if (Math.hypot(cop.x - p.x, cop.y - p.y) < COP_DAMAGE_RANGE) {
        p.health -= COP_DPS * dt;
        break;
      }
    }
  }

  // Misi.
  const res = updateMissions(game.missions, p, dt);
  if (res === 'complete') {
    audio.missionComplete();
    const done = game.missions.completed[game.missions.completed.length - 1];
    toast(MISSIONS[done].name + ' SELESAI! +$' + MISSIONS[done].reward);
    autosave();
    if (game.missions.index + 1 < MISSIONS.length) {
      startMission(game.missions, game.missions.index + 1);
      audio.missionStart();
      toast(MISSIONS[game.missions.index].brief);
    } else {
      game.missions.status = 'done';
      showOverlay('complete');
      autosave();
    }
  } else if (res === 'failed') {
    toast(MISSIONS[game.missions.index].name + ' GAGAL — waktu habis. Coba lagi (Enter).');
    audio.busted();
  }

  // Busted / wasted.
  if (!p.inCar && checkBusted(game.police, p)) {
    doBusted();
    return;
  }
  if (p.health <= 0) {
    p.health = 0;
    doWasted();
  }
}

function frame(t) {
  const dt = Math.min(0.05, (t - (frame.last || t)) / 1000 || 0.016);
  frame.last = t;
  if (game.mode === 'playing') update(dt);
  else if (game.mode === 'paused' && (input.pressed('Escape') || input.pressed('KeyP'))) {
    game.mode = 'playing';
    hidePause();
  } else if ((game.mode === 'busted' || game.mode === 'wasted') && input.pressed('Enter')) {
    respawn();
  } else if (game.mode === 'menu' && input.pressed('Enter')) {
    startNewGame();
  }
  // Misi gagal: Enter untuk mengulang misi yang sama.
  if (game.mode === 'playing' && game.missions.status === 'failed' && input.pressed('Enter')) {
    startMission(game.missions, game.missions.index);
    toast(MISSIONS[game.missions.index].brief);
  }
  draw(ctx, {
    city,
    player: game.player,
    cars: game.cars,
    police: game.police.cops,
    bullets: game.bullets,
  });
  updateHud({
    money: game.player.money,
    district: districtAtPoint(game.player.x, game.player.y),
    wanted: getWanted(game.police),
    health: game.player.health,
    maxHealth: 100,
    mag: game.player.mag,
    ammo: game.player.ammo,
    objective: objectiveText(),
  });
  input.update();
  requestAnimationFrame(frame);
}

// --- UI wiring ---
initHud();
input.attach();

const btnNew = document.getElementById('btn-new');
if (btnNew) btnNew.addEventListener('click', () => { audio.click(); startNewGame(); });
const btnContinue = document.getElementById('btn-continue');
if (btnContinue) {
  if (!loadSave()) btnContinue.style.display = 'none';
  btnContinue.addEventListener('click', () => { audio.click(); continueGame(); });
}
const btnResume = document.getElementById('btn-resume');
if (btnResume) btnResume.addEventListener('click', () => { game.mode = 'playing'; hidePause(); });
const btnBusted = document.getElementById('btn-busted');
if (btnBusted) btnBusted.addEventListener('click', respawn);
const btnWasted = document.getElementById('btn-wasted');
if (btnWasted) btnWasted.addEventListener('click', respawn);
const btnComplete = document.getElementById('btn-complete');
if (btnComplete) btnComplete.addEventListener('click', () => { hideOverlay('complete'); });

// Expose untuk playtest & screenshot mode.
window.__game = game;
window.__gameApi = { startNewGame, continueGame, respawn, doBusted, doWasted, startMission, objectiveText };

// Screenshot mode (?shot=...).
setupShots(game);

showMenu();
requestAnimationFrame(frame);
