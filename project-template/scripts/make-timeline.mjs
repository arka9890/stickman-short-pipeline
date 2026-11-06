import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const work = process.cwd();
const audioDir = path.join(work, 'public', 'audio');

function probe(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseFloat(out.trim());
}

const segs = ['seg1', 'seg2', 'seg3', 'seg4', 'seg5', 'seg6'];

// v6 dynamic slots (skill editing-videos): a scene lasts exactly as long as
// its VO needs — speech starts shortly after the scene appears and the scene
// holds a short breath after the last word before the next cut. This replaces
// the fixed 10 s slots of v5 that left several seconds of dead air per scene.
const LEAD = 0.35; // silence before the first word of a segment
const TAIL = 0.95; // breath after the last word before the scene switch
const END_HOLD = 3.2; // end card + fade out
const LEADS = { seg1: 0.3, seg6: 0.45 };

const slots = [];
let cursor = 0;
const starts = [];
for (let i = 0; i < segs.length; i++) {
  const dur = probe(path.join(audioDir, `vo_${segs[i]}.wav`));
  const lead = LEADS[segs[i]] ?? LEAD;
  const slotDur = dur + lead + TAIL;
  slots.push({sec: cursor, dur: slotDur});
  starts.push({seg: segs[i], start: cursor + lead, dur});
  cursor += slotDur;
}
const durationSec = cursor + END_HOLD;

const timeline = {
  fps: 30,
  durationSec,
  width: 1080,
  height: 1920,
  voice: 'kokoro-82M (Kokoro TTS ONNX, model lokal)',
  segments: [],
};
for (let i = 0; i < segs.length; i++) {
  timeline.segments.push({
    seg: segs[i],
    audioFrom: Math.round(starts[i].start * timeline.fps),
    audioDur: Math.round(starts[i].dur * timeline.fps),
    visualFrom: slots[i].sec * timeline.fps,
    visualDur: Math.round(slots[i].dur * timeline.fps),
    images: [`${segs[i]}a.jpg`, `${segs[i]}b.jpg`],
  });
}
fs.writeFileSync(path.join(work, 'src', 'timeline.json'), JSON.stringify(timeline, null, 2));
console.log(JSON.stringify(starts, null, 1));
console.log('TIMELINE DONE (audio offsets fixed; image filenames filled by organize-stills.mjs)');