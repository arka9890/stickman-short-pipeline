// Generates simple synthesized SFX as 16-bit mono WAV files.
// Deterministic, no dependencies, no downloads.
import {writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'audio', 'sfx');
mkdirSync(outDir, {recursive: true});

const SR = 44100;

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(join(outDir, name), buf);
  console.log(`wrote ${name} (${(n / SR).toFixed(2)}s)`);
}

// One-pole lowpass over a signal, fc can be per-sample (Hz).
function lowpass(x, fcAt) {
  const y = new Float32Array(x.length);
  let lp = 0;
  for (let i = 0; i < x.length; i++) {
    const fc = typeof fcAt === 'function' ? fcAt(i / SR) : fcAt;
    const a = Math.min(0.999, 2 * Math.PI * fc / SR);
    lp += a * (x[i] - lp);
    y[i] = lp;
  }
  return y;
}

function noise(len) {
  const x = new Float32Array(len);
  for (let i = 0; i < len; i++) x[i] = Math.random() * 2 - 1;
  return x;
}

// ---------- WHOOSH (scene transition): noise swept through a rising band ----------
{
  const dur = 0.8;
  const x = noise(dur * SR);
  const y = lowpass(x, (t) => 300 + 1400 * 4 * t / dur * (1 - t / dur) * 2);
  const out = new Float32Array(y.length);
  for (let i = 0; i < y.length; i++) {
    const u = i / y.length;
    const env = Math.pow(Math.sin(Math.PI * u), 1.6);
    // brighten: mix in some of the raw noise for an audible "air" hiss
    out[i] = (y[i] * 0.85 + x[i] * 0.15) * env * 1.0;
  }
  writeWav('whoosh.wav', out);
}

// ---------- STAMP (overlay title accent): click + low thud ----------
{
  const dur = 0.16;
  const n = dur * SR | 0;
  const out = new Float32Array(n);
  const click = noise(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const thud = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 28);
    const burst = click[i] * Math.exp(-t * 120) * 0.7;
    out[i] = (thud * 0.8 + burst) * 0.9;
  }
  writeWav('stamp.wav', out);
}

// ---------- RISER (build before the reveal): sweeping tone + swelling noise ----------
{
  const dur = 1.6;
  const n = dur * SR | 0;
  const out = new Float32Array(n);
  const x = noise(n);
  const swept = lowpass(x, (t) => 220 + 2100 * Math.pow(t / dur, 1.6));
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const u = t / dur;
    const tone = (Math.sin(2 * Math.PI * 90 * Math.pow(2, 1.6 * u) * t) +
      0.5 * Math.sin(2 * Math.PI * 180 * Math.pow(2, 1.6 * u) * t)) * 0.22 * Math.pow(u, 1.4);
    const sw = swept[i] * 0.5 * Math.pow(u, 2);
    out[i] = tone + sw;
  }
  writeWav('riser.wav', out);
}

// ---------- IMPACT (the reveal lands): low boom + shimmer head ----------
{
  const dur = 0.6;
  const n = dur * SR | 0;
  const out = new Float32Array(n);
  const click = noise(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const boom = (Math.sin(2 * Math.PI * (110 * Math.exp(-t * 3) + 48) * t) * 0.9 +
      Math.sin(2 * Math.PI * 62 * t) * 0.5 * Math.exp(-t * 4)) * Math.exp(-t * 6);
    const shimmer = click[i] * Math.exp(-t * 70) * 0.55;
    out[i] = boom + shimmer;
  }
  writeWav('impact.wav', out);
}

// ---------- CRASH (cymbal-ish splash at the reveal): bright noise, long decay ----------
{
  const dur = 1.4;
  const n = dur * SR | 0;
  const out = new Float32Array(n);
  const x = noise(n);
  const hp = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += 0.4 * (x[i] - lp);
    hp[i] = x[i] - lp; // crude highpass keeps it bright/cymbal-like
  }
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 3.2);
    out[i] = hp[i] * env * 0.8;
  }
  writeWav('crash.wav', out);
}

// ---------- SPARKLE (end-card shimmer): 5 descending bright plinks ----------
{
  const notes = [1568, 1318.5, 1174.7, 987.77, 1046.5]; // G5, E5, D5, B4, C5
  const dur = 0.9;
  const n = dur * SR | 0;
  const out = new Float32Array(n);
  const offsets = [0.0, 0.11, 0.22, 0.34, 0.47];
  for (let k = 0; k < notes.length; k++) {
    const start = offsets[k] * SR | 0;
    const f = notes[k];
    for (let i = 0; i < n - start; i++) {
      const t = i / SR;
      const env = Math.exp(-t * 9);
      out[start + i] += Math.sin(2 * Math.PI * f * t) * env * 0.22;
      out[start + i] += Math.sin(2 * Math.PI * f * 2 * t) * env * 0.08;
    }
  }
  writeWav('sparkle.wav', out);
}

// ---------- CRINKLE (paper rustle for the closing fade) ----------
{
  const dur = 0.6;
  const x = noise(dur * SR);
  const lp = lowpass(x, 2600);
  const out = new Float32Array(lp.length);
  const bursts = [
    [0.05, 0.35], [0.13, 0.5], [0.2, 0.3], [0.28, 0.55],
    [0.34, 0.4], [0.42, 0.45], [0.5, 0.35],
  ];
  for (let i = 0; i < lp.length; i++) {
    const t = i / SR;
    let env = 0;
    for (const [bt, amp] of bursts) {
      const dt = t - bt;
      if (dt >= 0 && dt < 0.06) env += amp * Math.sin(Math.PI * dt / 0.06);
    }
    out[i] = lp[i] * env;
  }
  writeWav('crinkle.wav', out);
}

console.log('done ->', outDir);
