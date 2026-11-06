#!/usr/bin/env node
// Keyword research via Google/YouTube autocomplete — free, no API key.
// Usage: node keyword_autocomplete.mjs "seed 1" "seed 2" ...
// Output: validated suggestions per seed, seed-first = strongest demand.

const SEEDS = process.argv.slice(2);
if (!SEEDS.length) {
  console.error('Usage: node keyword_autocomplete.mjs "seed 1" "seed 2" ...');
  process.exit(1);
}

const parse = (t) => JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1));

async function suggest(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const decoded = new TextDecoder("utf-8").decode(Buffer.from(await r.arrayBuffer()));
  return parse(decoded)[1].map((x) => x[0]);
}

const youtube = (s) =>
  suggest(`https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&hl=en&q=${encodeURIComponent(s)}`);

const google = (s, hl = "en") =>
  suggest(`https://suggestqueries.google.com/complete/search?client=youtube&ds=g&hl=${hl}&q=${encodeURIComponent(s)}`);

for (const seed of SEEDS) {
  console.log(`\n=== YT  "${seed}" ===`);
  try {
    for (const s of await youtube(seed)) console.log("  " + s);
  } catch (e) {
    console.log("  (error: " + e.message + ")");
  }
}
const idSeed = SEEDS[0];
console.log(`\n=== Google ID "${idSeed}" (Bahasa Indonesia) ===`);
try {
  for (const s of await google(idSeed, "id")) console.log("  " + s);
} catch (e) {
  console.log("  (error: " + e.message + ")");
}
