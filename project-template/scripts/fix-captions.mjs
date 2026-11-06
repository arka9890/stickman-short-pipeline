// Postprocess whisper captions against the true VO script (stills/vo.txt).
// Two-stage: 1) word-level replacements, 2) sequence rewrites where whisper
// splits or mishears a phrase into several tokens (timings are preserved).
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'src', 'captions');

// word-level: single token exact match (after trim)
const wordMap = {
  'needed': 'kneaded',
  'needed,': 'kneaded,',
  'raw': 'rotten',
  'Fighters': 'Fibers',
  'Not': 'not',
  'page ?': 'page?',
};

// tail rewrites: whisper drops trailing words on some segments (verified the
// speech IS there by RMS energy). Append tokens spread across the tail gap.
const tailFixes = {
  'captions_seg1.json': [
    {text: ' Garbage.', startMs: 4670, endMs: 5189},
  ],
  'captions_seg3.json': [
    {text: ' Light', startMs: 4680, endMs: 4900},
    {text: ' as', startMs: 4900, endMs: 5120},
    {text: ' a', startMs: 5120, endMs: 5280},
    {text: ' leaf.', startMs: 5280, endMs: 5433},
  ],
  'captions_seg4.json': [
    {text: ' Paper', startMs: 5400, endMs: 5560},
    {text: ' leveled', startMs: 5560, endMs: 5700},
    {text: ' the', startMs: 5700, endMs: 5800},
    {text: ' field.', startMs: 5800, endMs: 5909},
  ],
  'captions_seg5.json': [
    {text: ' Not', startMs: 6400, endMs: 6650},
    {text: ' just', startMs: 6650, endMs: 6850},
    {text: ' the', startMs: 6850, endMs: 7000},
    {text: ' rich.', startMs: 7000, endMs: 7221},
  ],
};

// sequence-level: consecutive token texts -> replacement texts.
// If replacement is shorter, inputs are collapsed left-to-right: each output
// caption spans ceil(rest/max) inputs so timings stay spread evenly.
const seqFixes = [
  [['T', 'iz', 'ai', 'Lun'], ['Tzai', 'Loon']],
  [['T', 'iz', 'ai', 'Lun,'], ['Tzai', 'Loon,']],
  [['Tzai', 'Lun'], ['Tzai', 'Loon']],
  [['Tzai', 'Lun,'], ['Tzai', 'Loon,']],
  [['and', 'water.'], ['in', 'water.']],
  [['drains.'], ['drains,']],
  [['r', 'ags'], ['rags']],
  [['r', 'ags,'], ['rags,']],
];

const norm = (s) => (s || '').trim();

for (const f of fs.readdirSync(dir)) {
  const p = path.join(dir, f);
  if (!f.startsWith('captions_')) continue;
  let caps = JSON.parse(fs.readFileSync(p, 'utf8'));

  // 1) word-level fixes
  for (const c of caps) {
    const k = norm(c.text);
    if (k in wordMap) c.text = c.text.replace(k, wordMap[k]);
  }

  // 2) merge adjacent punctuation fragments
  const merged = [];
  for (const c of caps) {
    const last = merged[merged.length - 1];
    const firstChar = (c.text || '').trim()[0];
    if (last && ",.?!'".includes(firstChar)) {
      last.text = last.text.replace(/\s*$/, '') + c.text.trim();
      last.endMs = c.endMs;
    } else merged.push(c);
  }

  // 3) sequence rewrites (find first occurrence of each pattern anywhere)
  for (const [pattern, replacement] of seqFixes) {
    for (let i = 0; i <= merged.length - pattern.length; i++) {
      const chunk = merged.slice(i, i + pattern.length);
      if (chunk.every((c, k) => norm(c.text).replace(/[,.?!']+$/, '') === pattern[k])) {
        const n = pattern.length, m = replacement.length;
        const startMs = chunk[0].startMs;
        const endMs = chunk[n - 1].endMs;
        const per = Math.ceil(n / m);
        const rebuilt = [];
        for (let r = 0, at = 0; at < n && r < m; r++) {
          const take = Math.min(per, n - at);
          const text = replacement[r].startsWith(' ') ? replacement[r] : ' ' + replacement[r];
          rebuilt.push({
            text,
            startMs: chunk[at].startMs,
            endMs: chunk[at + take - 1].endMs,
          });
          at += take;
        }
        merged.splice(i, n, ...rebuilt);
        break;
      }
    }
  }

  // 4) tail rewrites (only when whisper clearly stopped early)
  const tail = tailFixes[f];
  if (tail && merged.length) {
    const lastEnd = merged[merged.length - 1].endMs;
    const spanMs = tail[0].startMs - lastEnd;
    if (spanMs > 30) {
      merged.push(...tail);
    }
  }

  // 5) global spacing: every word token gets a leading space unless it is
  // punctuation attached to the previous token
  for (let i = 1; i < merged.length; i++) {
    const c = merged[i];
    if (!c.text || c.text.startsWith(' ')) continue;
    const first = c.text[0];
    if (first === ',' || first === '.' || first === "'") continue;
    const prev = merged[i - 1];
    if (!prev.text.endsWith(' ')) c.text = ' ' + c.text;
  }

  fs.writeFileSync(p, JSON.stringify(merged, null, 2));
  console.log('fixed', f, merged.length, 'captions');
}
