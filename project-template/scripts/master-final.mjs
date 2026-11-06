// Master the rendered video's audio to -14 LUFS / TP <= -1 dBTP (YouTube target
// from skill editing-videos), measured not estimated. Video stream is copied
// untouched; only audio is re-encoded (AAC 384k 48 kHz). Run: node scripts/master-final.mjs
import path from 'node:path';
import fs from 'node:fs';
import {spawnSync, execFileSync} from 'node:child_process';

const src = path.join(process.cwd(), 'out', 'fall-of-rome.mp4');
const tmp = src.replace(/\.mp4$/, '.master.mp4');

function pass(file) {
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file,
    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-',
  ], {encoding: 'utf8'});
  const m = (r.stderr || '').match(/\{[^{}]*"input_i"[\s\S]*?\}/);
  return m ? JSON.parse(m[0]) : null;
}

const m1 = pass(src);
if (!m1 || !m1.input_i) { console.error('measure failed', m1); process.exit(1); }
console.log(`pass1: input_i=${m1.input_i} input_tp=${m1.input_tp}`);

const chain = `loudnorm=I=-14:TP=-1.5:LRA=11` +
  `:measured_I=${m1.input_i}:measured_TP=${m1.input_tp}:measured_LRA=${m1.input_lra}` +
  `:measured_thresh=${m1.input_thresh}:offset=${m1.target_offset}:linear=true` +
  `,alimiter=limit=0.841:level=disabled`;
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', chain,
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '384k', '-ar', '48000', tmp], {encoding: 'utf8'});
fs.renameSync(tmp, src);

// verify with ebur128 (independent measurement)
const v = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', src,
  '-af', 'ebur128=peak=true', '-f', 'null', '-', '-v', 'error'], {encoding: 'utf8'});
const tail = (v.stderr || '').trim().split(/\r?\n/).filter((l) => /I:.*LUFS/.test(l)).pop();
console.log('final mix:', tail);
console.log('MASTER DONE');
