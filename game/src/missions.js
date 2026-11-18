// Crescent Bay — missions (r7 fresh)
// 4 misi cerita: Rook bekerja untuk kontaknya, Selin. Capai titik target
// dalam batas waktu untuk hadiah. Plus tugas taksi sampingan. ES module.

import { MISSION_REWARDS, MISSION_TIME_LIMIT_S } from './config.js';

// Misi cerita (target di persimpangan jalan, bisa dicapai jalan/mobil).
export const MISSIONS = [
  {
    name: 'Misi 1 — Jemputan Marina',
    brief: 'Selin: "Rook, jemput paket di Marina. Jangan bikin ribut."',
    target: { x: 520, y: 720 },
    reward: MISSION_REWARDS[0],
  },
  {
    name: 'Misi 2 — Drop Downtown',
    brief: 'Selin: "Antar paket ke Downtown. Polisi lagi patroli, hati-hati."',
    target: { x: 1320, y: 720 },
    reward: MISSION_REWARDS[1],
  },
  {
    name: 'Misi 3 — Bukit Hills',
    brief: 'Selin: "Klien di Hills menunggu. Jangan terlambat, Rook."',
    target: { x: 2120, y: 1120 },
    reward: MISSION_REWARDS[2],
  },
  {
    name: 'Misi 4 — Pelarian Beachfront',
    brief: 'Selin: "Ini yang terakhir. Sampai ke Beachfront dan kita bebas."',
    target: { x: 920, y: 1520 },
    reward: MISSION_REWARDS[3],
  },
];

const ARRIVE_DIST = 48;

// Tujuan taksi (persimpangan jalan).
const TAXI_SPOTS = [
  { x: 520, y: 320 },
  { x: 920, y: 1120 },
  { x: 1720, y: 720 },
  { x: 2120, y: 320 },
  { x: 1320, y: 1520 },
  { x: 920, y: 320 },
];
const TAXI_FARE = 150;
const TAXI_TIME_S = 150;

export function createMissions() {
  return {
    index: 0,
    status: 'idle', // idle | active | complete | failed | done
    timeLeft: 0,
    target: null,
    taxi: null, // { phase, target, timeLeft, fare } | null
    completed: [],
  };
}

// Mulai misi ke-i (0-based). Return true bila misi valid.
export function startMission(state, i) {
  if (!state || i < 0 || i >= MISSIONS.length) return false;
  state.index = i;
  state.status = 'active';
  state.timeLeft = MISSION_TIME_LIMIT_S;
  state.target = { x: MISSIONS[i].target.x, y: MISSIONS[i].target.y };
  return true;
}

function missionText(state) {
  return MISSIONS[state.index];
}

// Update misi + taksi tiap frame.
// Return 'active' | 'complete' | 'failed' (status misi cerita).
export function updateMissions(state, player, dt) {
  if (!state || !player) return 'active';

  // --- Taksi ---
  if (state.taxi) {
    const t = state.taxi;
    t.timeLeft -= dt;
    const d = Math.hypot(player.x - t.target.x, player.y - t.target.y);
    if (d < ARRIVE_DIST) {
      if (t.phase === 'pickup') {
        t.phase = 'dropoff';
        // Tujuan antar: spot taksi berikutnya (bukan titik jemput).
        const next = TAXI_SPOTS[(TAXI_SPOTS.findIndex((s) => s.x === t.target.x && s.y === t.target.y) + 2) % TAXI_SPOTS.length];
        t.target = { x: next.x, y: next.y };
        t.timeLeft = Math.max(t.timeLeft, 90);
      } else {
        player.money += t.fare;
        state.taxi = null;
      }
    } else if (t.timeLeft <= 0) {
      state.taxi = null;
    }
  }

  // --- Misi cerita ---
  if (state.status !== 'active' || !state.target) return state.status === 'complete' ? 'complete' : state.status === 'failed' ? 'failed' : 'active';
  state.timeLeft -= dt;
  const d = Math.hypot(player.x - state.target.x, player.y - state.target.y);
  if (d < ARRIVE_DIST) {
    const m = missionText(state);
    player.money += m.reward;
    state.completed.push(state.index);
    state.status = 'complete';
    state.target = null;
    return 'complete';
  }
  if (state.timeLeft <= 0) {
    state.status = 'failed';
    state.target = null;
    return 'failed';
  }
  return 'active';
}

// Mulai tugas taksi: jemput penumpang di dekat pemain, antar ke tujuan.
// Return objek taksi, atau null bila taksi sedang berjalan.
export function startTaxi(state, player) {
  if (!state || !player || state.taxi) return null;
  // Titik jemput: spot taksi terdekat dari pemain.
  let best = TAXI_SPOTS[0];
  let bestD = Infinity;
  for (const s of TAXI_SPOTS) {
    const d = Math.hypot(s.x - player.x, s.y - player.y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  state.taxi = {
    phase: 'pickup',
    target: { x: best.x, y: best.y },
    timeLeft: TAXI_TIME_S,
    fare: TAXI_FARE,
  };
  return state.taxi;
}

// Batalkan tugas taksi tanpa hadiah.
export function cancelTaxi(state) {
  if (!state) return false;
  if (!state.taxi) return false;
  state.taxi = null;
  return true;
}
