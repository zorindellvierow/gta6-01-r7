// Crescent Bay — save (r7 fresh)
// Save/load localStorage dengan SAVE_KEY dari config. ES module.

import { SAVE_KEY, START_MONEY, START_HEALTH } from './config.js';

export const SAVE_VERSION = 1;

// Save default untuk permainan baru.
export function defaultSave() {
  return {
    version: SAVE_VERSION,
    money: START_MONEY,
    health: START_HEALTH,
    missionIndex: 0,
    completedMissions: [],
    position: { x: 1200, y: 900 },
    wanted: 0,
    playTimeS: 0,
  };
}

// Validasi struktur save. Return true hanya jika semua field wajib valid.
export function validateSave(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (obj.version !== SAVE_VERSION) return false;
  if (typeof obj.money !== 'number' || !Number.isFinite(obj.money) || obj.money < 0) return false;
  if (typeof obj.health !== 'number' || !Number.isFinite(obj.health) || obj.health < 0 || obj.health > 100) return false;
  if (!Number.isInteger(obj.missionIndex) || obj.missionIndex < 0) return false;
  if (!Array.isArray(obj.completedMissions)) return false;
  if (!obj.completedMissions.every((m) => Number.isInteger(m) && m >= 0)) return false;
  if (!obj.position || typeof obj.position !== 'object') return false;
  if (typeof obj.position.x !== 'number' || !Number.isFinite(obj.position.x)) return false;
  if (typeof obj.position.y !== 'number' || !Number.isFinite(obj.position.y)) return false;
  if (typeof obj.wanted !== 'number' || !Number.isFinite(obj.wanted) || obj.wanted < 0 || obj.wanted > 5) return false;
  if (obj.playTimeS !== undefined && (typeof obj.playTimeS !== 'number' || obj.playTimeS < 0)) return false;
  return true;
}

function storageAvailable() {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch (_e) {
    return false;
  }
}

// Muat save dari localStorage. Return objek save valid, atau null jika
// tidak ada / rusak / tidak valid.
export function loadSave() {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validateSave(parsed) ? parsed : null;
  } catch (_e) {
    return null;
  }
}

// Tulis save ke localStorage. Return true jika berhasil.
export function writeSave(save) {
  if (!storageAvailable() || !validateSave(save)) return false;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (_e) {
    return false;
  }
}

// Hapus save dari localStorage.
export function clearSave() {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (_e) {
    // Abaikan.
  }
}
