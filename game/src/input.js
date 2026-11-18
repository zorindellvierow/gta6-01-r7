// Crescent Bay — input (r7 fresh)
// Pelacak keyboard: state tombol + edge detection per frame.
// Aksi: gerak WASD/panah, lari Shift, interact E, masuk/keluar mobil F,
// reload R, pause Escape/P. ES module, tanpa dependensi.

const downKeys = new Set();
const pressedKeys = new Set();
let attached = false;

function onKeyDown(e) {
  // Edge: hanya catat pressed sekali per penekanan fisik (abaikan auto-repeat).
  if (!e.repeat) pressedKeys.add(e.code);
  downKeys.add(e.code);
  // Cegah scroll halaman untuk tombol game.
  if (
    e.code === 'ArrowUp' || e.code === 'ArrowDown' ||
    e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
    e.code === 'Space'
  ) {
    e.preventDefault();
  }
}

function onKeyUp(e) {
  downKeys.delete(e.code);
}

function onBlur() {
  downKeys.clear();
}

// Pasang listener keydown/keyup pada window. Aman dipanggil berulang.
export function attach() {
  if (attached || typeof window === 'undefined') return;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  attached = true;
}

// Lepas listener. Aman dipanggil berulang.
export function detach() {
  if (!attached || typeof window === 'undefined') return;
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('blur', onBlur);
  attached = false;
}

// true selama tombol dengan `code` (KeyboardEvent.code) sedang ditekan.
export function isDown(code) {
  return downKeys.has(code);
}

// true hanya pada frame saat tombol pertama kali ditekan (edge).
// Panggil update() sekali di akhir tiap frame untuk mereset edge.
export function pressed(code) {
  return pressedKeys.has(code);
}

// Reset semua edge pressed. Dipanggil sekali per frame oleh game loop.
export function update() {
  pressedKeys.clear();
}

// Vektor gerak ternormalisasi dari WASD + panah. {x, y}, panjang 0 atau 1.
// y positif = ke bawah (koordinat canvas).
export function moveVector() {
  let x = 0;
  let y = 0;
  if (isDown('KeyA') || isDown('ArrowLeft')) x -= 1;
  if (isDown('KeyD') || isDown('ArrowRight')) x += 1;
  if (isDown('KeyW') || isDown('ArrowUp')) y -= 1;
  if (isDown('KeyS') || isDown('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.SQRT2;
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

// true selama Shift kiri/kanan ditekan (lari).
export function isRunning() {
  return isDown('ShiftLeft') || isDown('ShiftRight');
}
