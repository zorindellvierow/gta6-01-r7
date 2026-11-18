// Crescent Bay — vehicles (r7 fresh)
// Mobil parkir + nyetir (masuk/keluar dengan KeyF). ES module.

import { WORLD_W, WORLD_H } from './config.js';
import { hashStringSeed, mulberry32, range, int, pick } from './random.js';
import { isBlockedIn, isInWater } from './world.js';

const CAR_COLORS = ['#c0392b', '#2e86c1', '#f1c40f', '#7d3c98', '#e67e22', '#16a085', '#ecf0f1', '#2c3e50'];
const CAR_COUNT = 10;
const ENTER_DIST = 70;
const DRIVE_MAX_SPEED = 420;
const DRIVE_REVERSE_MAX = 150;
const DRIVE_ACCEL = 320;
const DRIVE_FRICTION = 260;

function carOnRoad(rng, city) {
  // Parkir di tepi jalan vertikal/horizontal, tidak di dalam gedung/air.
  for (let tries = 0; tries < 40; tries++) {
    const vertical = rng() < 0.5;
    let x;
    let y;
    let angle;
    if (vertical) {
      const vx = pick(rng, [520, 920, 1320, 1720, 2120]);
      x = vx + (rng() < 0.5 ? -38 : 38);
      y = range(rng, 60, WORLD_H - 60);
      angle = rng() < 0.5 ? 0 : Math.PI;
    } else {
      const hy = pick(rng, [320, 720, 1120, 1520]);
      x = range(rng, 380, WORLD_W - 60);
      y = hy + (rng() < 0.5 ? -38 : 38);
      angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    if (isInWater(x, y)) continue;
    if (isBlockedIn(city, x, y, 22)) continue;
    return { x, y, angle, speed: 0, color: pick(rng, CAR_COLORS), occupied: false };
  }
  return null;
}

// Buat mobil-mobil parkir tersebar di kota.
// Return { cars: [{x, y, angle, speed, color, occupied}] }.
export function createVehicles(city) {
  const rng = mulberry32(hashStringSeed('crescent-bay-cars'));
  const cars = [];
  let guard = 0;
  while (cars.length < CAR_COUNT && guard < 200) {
    guard++;
    const car = carOnRoad(rng, city);
    if (!car) continue;
    if (cars.some((c) => Math.hypot(c.x - car.x, c.y - car.y) < 90)) continue;
    cars.push(car);
  }
  return { cars };
}

function nearestCar(player, cars, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

// Masuk mobil terdekat (<= 70px). Return mobilnya, atau null bila tidak ada.
export function enterCar(player, cars) {
  if (!player || player.inCar) return null;
  const car = nearestCar(player, cars, ENTER_DIST);
  if (!car || car.occupied) return null;
  car.occupied = true;
  player.inCar = true;
  player.car = car;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  return car;
}

// Keluar dari mobil yang sedang dikendarai. Return true bila berhasil.
export function exitCar(player, cars) {
  if (!player || !player.inCar || !player.car) return false;
  const car = player.car;
  car.occupied = false;
  car.speed = 0;
  player.inCar = false;
  player.car = null;
  // Turun di sisi mobil yang kosong.
  const spots = [
    { x: car.x + 34, y: car.y },
    { x: car.x - 34, y: car.y },
    { x: car.x, y: car.y + 34 },
    { x: car.x, y: car.y - 34 },
  ];
  for (const s of spots) {
    if (!isInWater(s.x, s.y)) {
      player.x = s.x;
      player.y = s.y;
      return true;
    }
  }
  player.x = car.x + 34;
  player.y = car.y;
  return true;
}

// Update mobil tiap frame. Mobil yang dikendarai mengikuti input pemain
// (W/S gas/mundur, A/D setir) dan menabrak gedung; pemain di dalamnya
// mengikuti posisi mobil. Mobil parkir diam.
export function updateVehicles(cars, input, player, city, dt) {
  if (!cars) return;
  for (const car of cars) {
    if (!car.occupied || !player || player.car !== car) {
      car.speed = 0;
      continue;
    }
    const mv = input.moveVector();
    const forward = -mv.y; // W = maju
    const steer = mv.x; // A/D = setir
    if (forward > 0) car.speed += DRIVE_ACCEL * dt;
    else if (forward < 0) car.speed -= DRIVE_ACCEL * 0.7 * dt;
    else {
      // Gesekan: mobil melambat saat tidak ada gas.
      const dec = DRIVE_FRICTION * dt;
      if (Math.abs(car.speed) <= dec) car.speed = 0;
      else car.speed -= Math.sign(car.speed) * dec;
    }
    car.speed = Math.max(-DRIVE_REVERSE_MAX, Math.min(DRIVE_MAX_SPEED, car.speed));
    // Setir sebanding dengan kecepatan; mundur membalik arah setir.
    if (car.speed !== 0) {
      car.angle += steer * Math.sign(car.speed) * Math.min(Math.abs(car.speed) / 140, 1.6) * dt;
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    // Tabrakan gedung / air / batas dunia, per sumbu (geser di dinding).
    let tx = car.x;
    let ty = car.y;
    if (!isBlockedIn(city, nx, car.y, 18) && !isInWater(nx, car.y) && nx > 20 && nx < WORLD_W - 20) tx = nx;
    else car.speed *= 0.4;
    if (!isBlockedIn(city, tx, ny, 18) && !isInWater(tx, ny) && ny > 20 && ny < WORLD_H - 20) ty = ny;
    else car.speed *= 0.4;
    car.x = tx;
    car.y = ty;
    // Pemain mengikuti mobil.
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
  }
}
