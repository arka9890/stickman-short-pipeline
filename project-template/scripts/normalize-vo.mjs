// Normalize each VO segment to -16 LUFS / TP <= -1.5 dB (skill editing-videos target:
// "Voice alone during the edit: -16 LUFS"). Two-pass loudnorm + true-peak limiter.
// Then re-measure and print the final levels. Run: node scripts/normalize-vo.mjs
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';

const work = process.cwd();
const audioDir = path.join(work, 'public', 'audio');

function measureAll(file) {
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-',
  ], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/\{[^{}]*"input_i"[\s\S]*?\}/);
  return m ? JSON.parse(m[0]) : null;
}

const TARGET = { I: -16, TP: -1.5, LRA: 11 };
for (let i = 1; i <= 6; i++) {
  const f = path.join(audioDir, `vo_seg${i}.wav`);
  const m1 = measureAll(f);
  if (!m1) { console.log(`seg${i}: measure failed`); continue; }
  const chain = `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}` +
    `:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}` +
    `:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true` +
    `,alimiter=limit=0.84:level=disabled`;
  const tmp = f.replace(/\.wav$/, '.norm.wav');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', f, '-af', chain, '-ar', '48000', '-ac', '1', tmp]);
  fs.renameSync(tmp, f);
  const m2 = measureAll(f);
  console.log(`seg${i}: after -> input_i=${m2.input_i} LUFS, input_tp=${m2.input_tp} dBTP`);
}
console.log('VO NORMALIZE DONE');
