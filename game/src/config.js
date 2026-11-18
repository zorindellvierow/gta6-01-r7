// Crescent Bay — config (r7 fresh)
// Konstanta dunia & gameplay. ES module, tanpa dependensi.

export const WORLD_W = 2400;
export const WORLD_H = 1800;

// Distrik kota (nama kanonis, dipakai world.districtAtPoint)
export const DISTRICTS = {
  MARINA: 'Marina',
  DOWNTOWN: 'Downtown',
  BEACHFRONT: 'Beachfront',
  HILLS: 'Hills',
};

// Kecepatan gerak pemain (pixel/detik)
export const WALK_SPEED = 150;
export const RUN_SPEED = 260;

// Pistol pemain
export const PISTOL = {
  damage: 34,
  range: 320,
  mag: 12,
  reloadMs: 1400,
  cooldownMs: 220,
};

// State awal pemain
export const START_MONEY = 50;
export const START_HEALTH = 100;

// Sistem wanted (polisi)
export const WANTED_MAX = 5;
export const WANTED_DECAY_S = 25; // detik tanpa kejahatan sampai 1 bintang hilang
export const BUSTED_PENALTY = 0.20; // 20% uang hilang saat tertangkap

// Misi
export const MISSION_REWARDS = [250, 600, 1200, 2200];
export const MISSION_TIME_LIMIT_S = 240;

// Save & seed
export const SAVE_KEY = 'crescent-bay-save-v1';
export const SEED = 'crescent-bay-1';
