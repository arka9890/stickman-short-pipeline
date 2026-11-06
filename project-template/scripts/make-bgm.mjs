// Generates a gentle guzheng-style BGM bed using Karplus-Strong plucked strings.
// Deterministic, dependency-free. Output: public/audio/bgm_guzheng.wav (~58s, mono).
import {writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'audio');

const SR = 44100;
const DUR = 58; // slightly under video length so it fades before the outro
const N = DUR * SR | 0;

// D minor pentatonic (gong-yocket flavor): D, F, G, A, C over 2+ octaves
const SCALE = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0, 523.25, 587.33];

// deterministic PRNG so the loop is consistent between renders
let seed = 20261102;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

function pluck(freq, dur, decay = 0.996) {
  const n = dur * SR | 0;
  const out = new Float32Array(n);
  const p = Math.max(2, Math.round(SR / freq));
  const buf = new Float32Array(p);
  for (let i = 0; i < p; i++) buf[i] = Math.random() * 2 - 1;
  // slight pick-position comb: emphasize alternate sample trips
  buf[Math.floor(p / 4)] = (buf[Math.floor(p / 4)] + 0.6) * 0.8;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const nxt = (idx + 1) % p;
    buf[idx] = decay * 0.5 * (buf[idx] + buf[nxt]);
    out[i] = buf[idx];
    idx = nxt;
  }
  return out;
}

const mix = new Float32Array(N);
function addSample(samples, atSec, level) {
  const start = Math.round(atSec * SR);
  for (let i = 0; i < samples.length; i++) {
    const j = start + i;
    if (j >= N) break;
    mix[j] += samples[i] * level;
  }
}

// arrangement: one phrase every 2 bars (3.2s), arpeggios wandering the scale
const barLen = 1.6; // seconds per "instrument line" step
const phrases = Math.floor((DUR - 6) / 3.2);
let pos = 0; // index into scale
let t = 0.3;
for (let ph = 0; ph < phrases; ph++) {
  // bass anchor
  const bass = ph % 2 === 0 ? SCALE[0] : SCALE[3]; // D or A
  addSample(pluck(bass / 2, 3.0, 0.9965), t, 0.16);
  // melodic arch, 4-6 rising then 3-4 falling plucks
  const up = 4 + (rnd() * 3 | 0);
  const step = [1, 2, 2, 3][ph % 4];
  for (let k = 0; k < up; k++) {
    pos = Math.min(SCALE.length - 1, pos + (rnd() < 0.7 ? 1 : 2));
    const f = SCALE[pos];
    addSample(pluck(f, 2.2, 0.9960), t + k * 0.28, 0.12);
    addSample(pluck(f, 1.2, 0.9970), t + k * 0.28 + 0.14, 0.06); // sparkle echo
  }
  for (let k = 0; k < 3; k++) {
    pos = Math.max(0, pos - 1);
    addSample(pluck(SCALE[pos], 2.0, 0.9960), t + (up + k) * 0.28, 0.1);
  }
  t += 3.2;
}

// soft lowpass to take the edge off the plucks
let lp = 0;
const a = 0.35;
for (let i = 0; i < N; i++) {
  lp += a * (mix[i] - lp);
  mix[i] = lp;
}
// gentle fades in/out
const fade = Math.round(1.2 * SR);
for (let i = 0; i < fade; i++) {
  const g = i / fade;
  mix[i] *= g;
  mix[N - 1 - i] *= g;
}
// normalize to a low bed level
let peak = 1e-9;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(mix[i]));
const gain = 0.8 / peak;
for (let i = 0; i < N; i++) mix[i] *= gain;

// write 16-bit mono WAV
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 2, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  const v = Math.max(-1, Math.min(1, mix[i]));
  buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}
writeFileSync(join(outDir, 'bgm_guzheng.wav'), buf);
console.log('wrote bgm_guzheng.wav', DUR + 's');
