// Add a headline to the chosen thumbnail artwork with ffmpeg drawtext.
// The image model cannot render clean type, so the text is composited here.
// Edit the `variants` array, then run:
//   node scripts/add-thumb-text.mjs <artwork.jpg>
// Output: public/thumbnails/thumb_t1.jpg, thumb_t2.jpg, thumb_t3.jpg
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/add-thumb-text.mjs <artwork.jpg>');
  process.exit(1);
}
const outDir = path.join(process.cwd(), 'public', 'thumbnails');
fs.mkdirSync(outDir, { recursive: true });
const font = 'C\\:/Windows/Fonts/ariblk.ttf';
const fontB = 'C\\:/Windows/Fonts/arialbd.ttf';

const variants = [
  { id: 'thumb_t1', l1: 'HEADLINE ONE', l2: 'SECOND LINE', sub: 'TOPIC · YEAR', c1: '#FFE066', c2: '#FFFFFF' },
  { id: 'thumb_t2', l1: 'HEADLINE ONE', l2: 'SECOND LINE', sub: 'TOPIC · YEAR', c1: '#FF5A36', c2: '#FFFFFF' },
  { id: 'thumb_t3', l1: 'HEADLINE ONE', l2: 'SECOND LINE', sub: 'TOPIC · YEAR', c1: '#FF5A36', c2: '#FFE066' },
];

const txt = (name, content) => {
  const p = path.join(outDir, name);
  fs.writeFileSync(p, content);
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
};

for (const v of variants) {
  const f1 = txt(`t_${v.id}_1.txt`, v.l1);
  const f2 = txt(`t_${v.id}_2.txt`, v.l2);
  const f3 = txt(`t_${v.id}_3.txt`, v.sub);
  const out = path.join(outDir, `${v.id}.jpg`);
  const d1 = `drawtext=fontfile='${font}':textfile='${f1}':fontsize=132:fontcolor=${v.c1}:borderw=9:bordercolor=black@0.95:shadowx=4:shadowy=6:shadowcolor=black@0.75:x=(w-text_w)/2:y=110`;
  const d2 = `drawtext=fontfile='${font}':textfile='${f2}':fontsize=132:fontcolor=${v.c2}:borderw=9:bordercolor=black@0.95:shadowx=4:shadowy=6:shadowcolor=black@0.75:x=(w-text_w)/2:y=270`;
  const d3 = `drawtext=fontfile='${fontB}':textfile='${f3}':fontsize=52:fontcolor=white:borderw=7:bordercolor=black@0.9:shadowx=3:shadowy=4:shadowcolor=black@0.7:x=(w-text_w)/2:y=452`;
  console.log('== rendering', v.id);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf', `scale=1080:1920:flags=lanczos,${d1},${d2},${d3}`, '-q:v', '3', out]);
}
console.log('TEXT VARIANTS DONE');