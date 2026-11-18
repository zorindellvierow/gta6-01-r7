// Crescent Bay — audio (r7 fresh)
// Efek suara WebAudio (synth, tanpa file). AudioContext dibuat malas
// (lazy) saat efek pertama dipanggil — yaitu sesudah gestur user — dan
// semua fungsi aman dipanggil walau AudioContext tidak tersedia.

let audioCtx = null;

function getCtx() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  try {
    const AC = typeof window !== 'undefined'
      ? (window.AudioContext || window.webkitAudioContext)
      : undefined;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  } catch (_e) {
    return null;
  }
}

// Satu nada synth: freq awal -> freq akhir (slide), durasi detik.
function tone(freq, endFreq, dur, type, vol, delay) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
    }
    gain.gain.setValueAtTime(vol || 0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (_e) {
    // Abaikan: audio tidak boleh mematikan game.
  }
}

// Tembakan pistol: bunyi pendek tajam.
export function shoot() {
  tone(900, 120, 0.09, 'square', 0.14);
}

// Ambil pickup: dua nada naik.
export function pickup() {
  tone(660, 660, 0.08, 'sine', 0.12);
  tone(990, 990, 0.12, 'sine', 0.12, 0.07);
}

// Misi dimulai: fanfare pendek 3 nada.
export function missionStart() {
  tone(523, 523, 0.12, 'triangle', 0.14);
  tone(659, 659, 0.12, 'triangle', 0.14, 0.12);
  tone(784, 784, 0.2, 'triangle', 0.14, 0.24);
}

// Misi selesai: arpeggio naik.
export function missionComplete() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone(f, f, 0.16, 'triangle', 0.14, i * 0.1));
}

// Bintang wanted naik: sirene pendek.
export function wantedUp() {
  tone(700, 1100, 0.18, 'sawtooth', 0.1);
  tone(1100, 700, 0.18, 'sawtooth', 0.1, 0.18);
}

// Tertangkap (busted): nada turun.
export function busted() {
  tone(400, 120, 0.5, 'sawtooth', 0.14);
}

// Mati (wasted): nada turun panjang.
export function wasted() {
  tone(330, 55, 0.9, 'sawtooth', 0.16);
}

// Klik UI.
export function click() {
  tone(1200, 1200, 0.04, 'sine', 0.08);
}
