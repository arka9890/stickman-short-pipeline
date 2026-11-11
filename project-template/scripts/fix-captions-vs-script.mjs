// Merge whisper-split tokens back into the real words using the VO script as the
// source of truth. Whisper sometimes emits "P" + "to" + "lem" + "ies" for
// "Ptolemies"; whitespace-prefixed fragments defeat the subword merge, so the
// script text decides which fragments belong to the same word.
// Usage: node scripts/fix-captions-vs-script.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const capDir = path.join(root, 'src', 'captions');
const voFile = path.join(root, 'stills', 'vo.txt');

// compare without 'u' so British and American spellings match (harbour/harbor)
const key = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/u/g, '');
const strip = (s) => s.replace(/^\s+/, '');

const segs = {};
for (const line of fs.readFileSync(voFile, 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('::');
  if (i < 0) continue;
  const id = line.slice(0, i).trim().toLowerCase();
  if (!id.startsWith('seg')) continue;
  const text = line.slice(i + 2).trim();
  segs[id] = (segs[id] ? segs[id] + ' ' : '') + text;
}

for (const seg of Object.keys(segs)) {
  const file = path.join(capDir, `captions_${seg}.json`);
  if (!fs.existsSync(file)) continue;
  const caps = JSON.parse(fs.readFileSync(file, 'utf8'));
  const expected = segs[seg].split(/\s+/).map(key).filter(Boolean);

  const result = [];
  let ci = 0;
  let ei = 0;
  while (ci < caps.length) {
    const c = caps[ci];
    let group = [c];
    let chosen = null;
    for (let take = 1; take <= 4 && ci + take <= caps.length; take++) {
      const joined = group.map((g) => strip(g.text)).join('');
      const k = key(joined);
      if (!k) break;
      if (ei < expected.length && expected[ei] === k) {
        chosen = { text: joined, startMs: c.startMs, endMs: caps[ci + take - 1].endMs };
        ci += take - 1;
        break;
      }
      if (ci + take < caps.length) group.push(caps[ci + take]);
      else break;
    }
    if (chosen) {
      result.push(chosen);
      ei++;
    } else {
      const k = key(c.text);
      if (ei < expected.length && expected[ei] === k) {
        ei++;
        result.push(c);
      } else if (ei >= expected.length) {
        // script words are exhausted: anything left is a whisper hallucination
      } else {
        result.push(c);
      }
    }
    ci++;
  }

  // restore the leading space on every word but the first, otherwise the words
  // render glued together on screen ("then"+"the" -> "thenthe")
  for (let i = 1; i < result.length; i++) {
    const c = result[i];
    if (!c.text || c.text.startsWith(' ')) continue;
    const first = c.text[0];
    if (first === ',' || first === '.' || first === '!' || first === '?' || first === "'") continue;
    c.text = ' ' + c.text;
  }

  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  console.log(`aligned ${seg}: ${caps.length} -> ${result.length} captions`);}
console.log('SCRIPT ALIGN DONE');