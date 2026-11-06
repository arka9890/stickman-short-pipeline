import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const work = process.cwd();
const logPath = process.argv[2];
if (!logPath) { console.error('usage: node scripts/organize-stills.mjs <generate-stills log file>'); process.exit(1); }
const log = fs.readFileSync(logPath, 'utf8');

// Parse "== generating <id>" followed by an output_path table cell like
//   | public\assets\images\2026-11-02\<uuid>_1.jpg |
const entries = [...log.matchAll(/== generating (\S+)[\s\S]*?\| (public\\assets\\images\\[^ |]+\.jpg) \|/g)]
  .map(m => ({ id: m[1], path: m[2].replace(/\\/g, '/') }));
if (!entries.length) { console.error('no generation entries found in log'); process.exit(2); }

const seen = new Map();
const outDir = path.join(work, 'public', 'assets');
fs.mkdirSync(outDir, { recursive: true });
for (const { id, path: rel } of entries) {
  const src = path.join(work, rel);
  if (!fs.existsSync(src)) { console.error('MISSING', rel); continue; }
  fs.copyFileSync(src, path.join(outDir, `seg${id}.jpg`));
  seen.set(id, rel);
  console.log('copied', rel, '->', `seg${id}.jpg`);
}
if (seen.size !== 12) console.error('WARNING: only', seen.size, 'of 12 stills mapped; ids:', [...seen.keys()].join(','));
console.log('ORGANIZE DONE');