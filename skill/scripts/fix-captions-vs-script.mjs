// Repairs whisper captions against the VO script (stills/vo.txt) using
// fuzzy word alignment + timestamp interpolation.
//
// Why v2: whisper drops or mangles words on fast TTS ("explained" -> "explain",
// "forgery" -> "for" + "gery", and the last words of a segment can disappear
// entirely). A strict exact-match aligner then leaves the screen showing
// wrong text or missing text.
//
// v2 does a Needleman-Wunsch style alignment between the script words and the
// whisper tokens (a script word may consume up to 4 whisper tokens), scoring
// pairs by normalized string similarity. Script words with no good match keep
// their place and get timestamps interpolated between the nearest matched
// neighbours; leftover whisper tokens (punctuation, hallucinations) are dropped.
//
// Usage: node scripts/fix-captions-vs-script.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const capDir = path.join(root, 'src', 'captions');
const voFile = path.join(root, 'stills', 'vo.txt');

const key = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const strip = (s) => s.replace(/^\s+/, '');

// Levenshtein-based similarity in [0,1]
const similarity = (a, b) => {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const m = a.length;
  const n = b.length;
  const d = Array.from({length: m + 1}, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return 1 - d[m][n] / Math.max(m, n);
};

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

  const words = segs[seg].split(/\s+/).filter(Boolean);
  const wKey = words.map(key);
  const tKey = caps.map((c) => key(strip(c.text)));

  const MATCH_MIN = 0.62;
  const GAP_SCRIPT = 0.72; // unmatched script word (timestamps interpolated)
  const GAP_TOKEN = 0.24; // whisper token dropped

  const W = words.length;
  const T = caps.length;
  const INF = 1e9;
  const dp = Array.from({length: W + 1}, () => new Array(T + 1).fill(INF));
  const bt = Array.from({length: W + 1}, () => new Array(T + 1).fill(null));
  dp[0][0] = 0;

  for (let i = 0; i <= W; i++) {
    for (let j = 0; j <= T; j++) {
      const base = dp[i][j];
      if (base >= INF) continue;
      // match script word i with whisper tokens j..k
      if (i < W) {
        for (let k = j; k < Math.min(T, j + 4); k++) {
          const joined = tKey.slice(j, k + 1).join('');
          const sim = similarity(wKey[i], joined);
          if (sim < MATCH_MIN) continue;
          const cost = base + (1 - sim) * 2;
          if (cost < dp[i + 1][k + 1]) {
            dp[i + 1][k + 1] = cost;
            bt[i + 1][k + 1] = {type: 'M', i, j, k};
          }
        }
        // script word with no whisper match
        if (base + GAP_SCRIPT < dp[i + 1][j]) {
          dp[i + 1][j] = base + GAP_SCRIPT;
          bt[i + 1][j] = {type: 'S', i, j, k: j - 1};
        }
      }
      // drop a whisper token
      if (j < T && base + GAP_TOKEN < dp[i][j + 1]) {
        dp[i][j + 1] = base + GAP_TOKEN;
        bt[i][j + 1] = {type: 'T', i, j, k: j};
      }
    }
  }

  // traceback: list of {wi, tj, tk} for script words (tj null = unmatched)
  const pairs = [];
  let ci = W;
  let cj = T;
  while ((ci > 0 || cj > 0) && bt[ci][cj]) {
    const b = bt[ci][cj];
    if (b.type === 'M') pairs.push({wi: b.i, tj: b.j, tk: b.k});
    else if (b.type === 'S') pairs.push({wi: b.i, tj: null, tk: null});
    ci = b.i;
    cj = b.j;
  }
  pairs.reverse();

  const matchOf = new Array(W).fill(null);
  for (const p of pairs) if (p.tj !== null) matchOf[p.wi] = {from: p.tj, to: p.tk};

  const audioEnd = caps.length ? Math.max(...caps.map((c) => c.endMs)) : 0;

  const span = new Array(W).fill(null);
  for (let i = 0; i < W; i++) {
    const m = matchOf[i];
    if (!m) continue;
    span[i] = {startMs: caps[m.from].startMs, endMs: caps[m.to].endMs};
  }
  // interpolate the unmatched words between their matched neighbours
  for (let i = 0; i < W; i++) {
    if (span[i]) continue;
    let p = -1;
    for (let k = i - 1; k >= 0; k--) if (span[k]) {p = k; break;}
    let n = -1;
    for (let k = i + 1; k < W; k++) if (span[k]) {n = k; break;}
    const prev = p >= 0 ? span[p].endMs : 0;
    const next = n >= 0 ? span[n].startMs : audioEnd + 150;
    const gapIdx = n >= 0 ? n - p : W - p;
    const pos = i - p;
    const step = (next - prev) / Math.max(1, gapIdx);
    span[i] = {
      startMs: Math.round(prev + step * pos),
      endMs: Math.round(prev + step * (pos + 1)),
    };
  }

  const result = words.map((w, i) => ({
    text: i === 0 ? w : ' ' + w,
    startMs: span[i].startMs,
    endMs: span[i].endMs,
  }));

  // strictly increasing ranges
  for (let i = 1; i < result.length; i++) {
    if (result[i].startMs < result[i - 1].endMs) result[i].startMs = result[i - 1].endMs;
    if (result[i].endMs <= result[i].startMs) result[i].endMs = result[i].startMs + 60;
  }

  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  const missing = words.filter((w, i) => !matchOf[i]);
  console.log(
    `aligned ${seg}: ${caps.length} whisper tokens -> ${result.length} script words` +
      (missing.length ? ` (interpolated: ${missing.join(' ')})` : ''),
  );
}
console.log('SCRIPT ALIGN DONE');
