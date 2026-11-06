import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { transcribe, toCaptions } from '@remotion/install-whisper-cpp';

const work = process.cwd();
const to = path.join(work, 'whisper.cpp');
const audioDir = path.join(work, 'public', 'audio');
const outSrc = path.join(work, 'src', 'captions');
fs.mkdirSync(outSrc, { recursive: true });

const only = process.argv.find((a) => a.startsWith('--only='));
const forceAll = process.argv.includes('--force');
let segs = ['seg1', 'seg2', 'seg3', 'seg4', 'seg5', 'seg6'];
if (only) segs = only.slice('--only='.length).split(',');

for (const seg of segs) {
  const wav = path.join(audioDir, `vo_${seg}.wav`);
  const wav16 = path.join(audioDir, `vo_${seg}.16k.wav`);
  const outFile = path.join(outSrc, `captions_${seg}.json`);
  if (!forceAll && fs.existsSync(outFile)) {
    console.log('skip (exists):', seg);
    continue;
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-ar', '16000', '-ac', '1', wav16]);
  const out = await transcribe({
    model: 'medium.en',
    whisperPath: to,
    whisperCppVersion: '1.5.5',
    inputPath: wav16,
    tokenLevelTimestamps: true,
  });
  const { captions } = toCaptions({ whisperCppOutput: out, combineTokensWithinMilliseconds: 1200 });
  fs.writeFileSync(outFile, JSON.stringify(captions, null, 2));
  console.log('transcribed', seg, captions.length, 'captions');
}
console.log('TRANSCRIBE DONE');
