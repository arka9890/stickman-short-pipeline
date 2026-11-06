import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { data } from '../stills/prompts.mjs';

const outDir = path.join(process.cwd(), 'public', 'assets');
fs.mkdirSync(outDir, { recursive: true });
const only = process.argv[2] || null;

for (const shot of data.shots) {
  if (only && !shot.id.startsWith(only)) continue;
  const marker = path.join(outDir, shot.id + '_DONE');
  if (fs.existsSync(marker)) { console.log('skip', shot.id); continue; }
  const cast = shot.cast.map(name => data.cast[name]).join('\n\n');
  const prompt = [data.anchor, data.era, cast, shot.img, data.tail].filter(Boolean).join('\n\n');
  console.log('== generating', shot.id, '(chars:', prompt.length, ')');
  try {
    execFileSync('gflow', ['image', 't2i', prompt, '--aspect', '9:16'], {
      stdio: 'inherit',
      env: { ...process.env, GFLOW_CLI_OUTPUT_DIR: outDir },
    });
    fs.writeFileSync(marker, String(Date.now()));
    console.log('== done', shot.id);
  } catch (e) {
    console.error('== FAILED', shot.id, e.message);
    process.exit(2);
  }
}
console.log('ALL STILLS DONE');