// Generate 3 vertical (9:16) thumbnail candidates for a Short.
// Edit the `prompts` array for the new topic, then run:
//   node scripts/gen-thumbnail.mjs
// Output: public/thumbnails/thumb_a.jpg, thumb_b.jpg, thumb_c.jpg
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'public', 'thumbnails');
fs.mkdirSync(outDir, { recursive: true });

// Keep the upper third of each prompt dark and empty so the headline has room.
const prompts = [
  {
    id: 'thumb_a',
    prompt:
      'YouTube Shorts thumbnail, vertical 9:16. Dramatic cel-shaded 2D illustration, thick black outlines, painterly, high contrast. SCENE: <wide establishing shot of the event>. Extreme scale contrast, the upper third of the frame is dark empty sky kept clear for text, saturated warm and electric blue, no characters, no text, no watermark.',
  },
  {
    id: 'thumb_b',
    prompt:
      'YouTube Shorts thumbnail, vertical 9:16. Dramatic cel-shaded 2D illustration, thick black outlines, painterly, high contrast. SCENE: <a lone small figure in period clothing seen from behind, staring at the event>. The upper half of the frame is empty dark sky kept clear for text, no text, no watermark.',
  },
  {
    id: 'thumb_c',
    prompt:
      'YouTube Shorts thumbnail, vertical 9:16. Dramatic cel-shaded 2D illustration, thick black outlines, painterly, high contrast. SCENE: <graphic top-down or radial composition of the event>. Dark upper area for text, no characters, no text, no watermark.',
  },
];

for (const p of prompts) {
  console.log('== generating', p.id);
  try {
    execFileSync('gflow', ['image', 't2i', p.prompt, '--aspect', '9:16', '--model', 'nano-pro'], {
      stdio: 'inherit',
      env: { ...process.env, GFLOW_CLI_OUTPUT_DIR: outDir },
    });
  } catch (e) {
    console.error('== FAILED', p.id, e.message);
  }
}
console.log('THUMBS DONE');