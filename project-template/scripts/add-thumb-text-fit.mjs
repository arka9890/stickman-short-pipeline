// Render a thumbnail headline with the font size auto-fitted to the frame width,
// so a long line never runs off the sides. The width is measured with the real
// font via local Python + PIL, then ffmpeg drawtext renders it.
// Usage: node scripts/add-thumb-text-fit.mjs <artwork.jpg> <outPrefix> <l1> <l2> <sub>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [src, outPrefix, l1, l2, sub] = process.argv.slice(2);
if (!src || !outPrefix || !l1 || !l2) {
  console.error('usage: node add-thumb-text-fit.mjs <artwork> <prefix> <l1> <l2> <sub>');
  process.exit(1);
}

// measure the real font width, so the headline shrinks until it fits the frame
function fitSize(text, fontFile, maxW, maxSize) {
  const py = `from PIL import ImageFont\nf=ImageFont.truetype(r'${fontFile}', ${maxSize})\nprint(f.getbbox(${JSON.stringify(text)})[2])\n`;
  const w = parseInt(execFileSync('python', ['-c', py], { encoding: 'utf8' }).trim(), 10);
  if (w <= maxW) return maxSize;
  return Math.max(40, Math.floor(maxSize * (maxW / w)));
}

const W = 1080;
const MAX_W = 900;
const fontPath = 'C\\:/Windows/Fonts/ariblk.ttf';
const fontBPath = 'C\\:/Windows/Fonts/arialbd.ttf';

const size1 = fitSize(l1, 'C:/Windows/Fonts/ariblk.ttf', MAX_W, 124);
const size2 = fitSize(l2, 'C:/Windows/Fonts/ariblk.ttf', MAX_W, 124);
const size3 = fitSize(sub || ' ', 'C:/Windows/Fonts/arialbd.ttf', MAX_W, 50);

const dir = path.dirname(outPrefix);
fs.mkdirSync(dir, { recursive: true });
const txt = (name, content) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
};
const base = path.basename(outPrefix);
const f1 = txt(`${base}_1.txt`, l1);
const f2 = txt(`${base}_2.txt`, l2);
const f3 = txt(`${base}_3.txt`, sub || ' ');

const y2 = 110 + Math.round(size1 * 1.12);
const y3 = y2 + Math.round(size2 * 1.12);
const out = `${outPrefix}.jpg`;
const d1 = `drawtext=fontfile='${fontPath}':textfile='${f1}':fontsize=${size1}:fontcolor=#FFE066:borderw=9:bordercolor=black@0.95:shadowx=4:shadowy=6:shadowcolor=black@0.75:x=(w-text_w)/2:y=110`;
const d2 = `drawtext=fontfile='${fontPath}':textfile='${f2}':fontsize=${size2}:fontcolor=#FFFFFF:borderw=9:bordercolor=black@0.95:shadowx=4:shadowy=6:shadowcolor=black@0.75:x=(w-text_w)/2:y=${y2}`;
const d3 = `drawtext=fontfile='${fontBPath}':textfile='${f3}':fontsize=${size3}:fontcolor=white:borderw=7:bordercolor=black@0.9:shadowx=3:shadowy=4:shadowcolor=black@0.7:x=(w-text_w)/2:y=${y3}`;

execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf', `scale=${W}:1920:flags=lanczos,${d1},${d2},${d3}`, '-q:v', '3', out]);
console.log(`wrote ${out} (sizes ${size1}/${size2}/${size3})`);