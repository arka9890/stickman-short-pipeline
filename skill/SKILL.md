---
name: stickman-short-pipeline
description: >
  Full local pipeline for producing a vertical (9:16) stickman history Short:
  SEO keyword research via Google/YouTube autocomplete (no API key needed),
  script + VO with local TTS, Remotion render, two-pass loudness mastering
  (-14 LUFS), spot-check QC frames, and upload-ready metadata for YouTube
  Shorts and TikTok. Use when the user asks to make, revise, or finish a
  short history/educational video, or asks for SEO titles/descriptions for
  YouTube Shorts or TikTok.
example-prompt: >
  Bikin video short stickman sejarah tentang X, lalu bikinin judul dan
  deskripsi YouTube Shorts dan TikTok.
---

# Stickman Short Pipeline (local, licensed assets)

Intended outcome: one finished 9:16 MP4 (30–40 s, hard cap 40 s, -14 LUFS, true peak ≤ -1.0
dBFS) plus upload-ready metadata, built entirely locally with licensed/CC0
assets. Read `references/pipeline-playbook.md` for the full step-by-step
commands, pitfalls, and QC checklist before starting a production. Use
`scripts/keyword_autocomplete.mjs` for the SEO phase.

## Hard rules
- Hard rule — FOLLOW THE PIPELINE (NO SKIPPING): every run must execute the steps in order (topic research → Gate 1 idea pick → Gate 2 still approval → Gate 3 BGM pick → final render approval). Never freelance a substitute, shortcut, or skipped gate — not even "temporarily" (no placeholder BGM, no unapproved stills, no render without user approval). If a step fails or is unavailable, stop and tell the user what is needed; any deviation requires explicit user approval before work continues.
- Hook-first: before writing stills/vo.txt, send the USER 3-5 hook options. Each option pairs an opening hook line and a closing line that calls back to that hook (loop). Wait for approval, then write full script + VO.
- Editing style baseline (reference: current Salem video): hard cuts between scenes; kinetic TikTok captions with gold per-word highlight; per-scene keyword overlay at the cut; BGM under VO ~-23 LUFS with ducking (0.4 speaking / 0.55 gap); SFX hits on cuts; end card anchored to scene end.
- Length: final timeline MUST be ≤ 40.0 s (≤ 1200 frames at 30 fps), measured
  from the rendered file, not estimated. Build the timeline with the cap
  enforced in `scripts/make-timeline.mjs`; if it overflows, cut script words —
  never compress the end card below 2.5 s.
- Retention pacing (YouTube Studio data 2026): 0–1s = visual+title hook menonjol agar swipe berkurang; 5–15s = anti-dead-air, sambung poin utama tanpa jeda narasi panjang. Target VO ~90 kata maks (asumsi 130 wpm) untuk 40s, gap LEAD 0.3–0.4s / TAIL 0.5–0.7s.
- Gate 1 (IDEA): before any production work, present a short list of content
  ideas (topic, hook angle, why it fits the channel) and wait for the user to
  pick one. Never pick the topic for them.
- Gate 1 research add-on: verify US-audience demand with real data BEFORE sending
  hook options. Minimum evidence, with numbers in the idea list: (a) Wikipedia
  pageviews REST API (`wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/<Topic>/monthly/...`)
  for the topic and its main cast/facts over the last 2-3 months; (b) existing
  competition via `yt-dlp --dump-json --skip-download "ytsearch8:<topic> dark history shorts"`
  — record top titles and view_count; (c) autocomplete intent from
  `scripts/keyword_autocomplete.mjs`. If web search is unavailable, pageviews +
  yt-dlp still work offline of search APIs. No hunch picks.
- Default VO engine: Kokoro-82M ONNX (voices-v1.0.bin + kokoro-v1.0.onnx) for every pipeline; Piper is fallback only.
- Default image style anchor (FROZEN — copy verbatim as `anchor:` in every project's `stills/prompts.mjs`): CHARACTER: simple stickman figures — thin black stick limbs, round head dot. EVERY character has visible hair (short dark curly, era-appropriate; laurel wreath allowed) and a distinct expressive cartoon face (eyebrows + clear mouth shape: smile, worry, surprise, frown — no blank stares). CLOTHING: medium-detail period-appropriate clothing matched to the video's era/topic (e.g. Roman toga/tunic with a few soft draped folds, sandals, cloth belt for Pompeii), clean solid silhouette, no costume changes between shots. STYLE: warm moody candlelight illustration, colorful (not grayscale), chiaroscuro lighting with warm golden oil-lamp/candle glow against dark moody backgrounds, painterly shading, soft shadows. Proportions: stickman (~7 heads tall). Always append the NEGATIVES: no bald characters, no blank expressions, no photorealistic faces, no 3D CGI, no extra limbs, no fused/duplicate heads, no fingers or finger separations, no white gloves/hands (black hands only), no floaty heads, no background gap between head and neckline, no heavy fabric texture, no extra characters.
HAIR RULE (mandatory): every cast card MUST explicitly describe hairstyle + color (e.g. "short cropped dark hair and trimmed dark beard"). Omit hair only for genuinely bald characters. If a generated still looks bald but the cast card specifies hair, regenerate with an explicit "clearly visible [hairstyle] per cast card, no baldness" reminder. Never accept botak as a default.
DIVERSITY RULE (mandatory): every cast card must be visually distinct (hair + costume/silhouette). Give each character a different hair descriptor (style + color). If roles/costumes are similar, differentiate via helm/crest/cloak color/silhouette; never accept two cast cards whose only difference is pose. Regenerate if gflow collapses distinct characters into identical ones.
- Stills engine: gflow-cli. Every still is generated with gflow-cli text-to-image
  (`gflow image t2i <prompt> --aspect 9:16`, driven by `scripts/generate-stills.mjs`
  via `GFLOW_CLI_OUTPUT_DIR`). Verify `gflow --version` is on PATH before Gate 2;
  if missing, stop and tell the user — never silently fall back to another generator.
- Gate 2 (IMAGES): after generating each still, show it to the user one by one
  with a one-line note of what it should depict; regenerate any the user
  rejects before moving on. After three consecutive approvals, you may continue
  producing the remaining stills without per-image approval, applying the same
  A5 QA checklist yourself. Do not batch-approve all 12 at once before the
  third approval.
- Always get explicit user approval before launching a new full render.
- Never use paid generation APIs unless the user approves; prefer local tools.
- Deliver measured values (LUFS measured AFTER AAC encode), not intentions.
- Caption on screen ≥ 1.5s per caption; SFX 2–4 frames before the visual event.
- Metadata keywords must come from real autocomplete data or say so.
- Hook retention: VO slot gaps (LEAD/TAIL) must be short — LEAD 0.3–0.4s, TAIL
  0.5–0.7s — so the viewer never stares at a static image during dead air.
- Seamless loop: the final frame must flow directly back to frame 0 (no long fade to
  black, no end-card dip beyond ~0.1s). Keep the end-card short and place the
  opening still on the first and last beat; when rendering, verify `ffprobe` duration
  lands on an integer frame count so the loop does not introduce a frame gap.
- Dramatic hook: every short opens with a fresh synthesized "grab" SFX (sub boom + low
  braam + metal ping + eerie tail) and a fast visual punch (zoom-in + flash/impact)
  landing on the first caption, followed by a rising tension swell into the first
  mid-hook cut (~2-3 s). Rebuild per topic; never reuse the previous video's hook
  package.
- Hook bombast - first 1-5 s must be "MORE WAH": frame 0 opens on a wide cinematic
  establishing still (scale, weather/light, silhouettes); frame ~2-3 s tight
  POV/character reaction. Pair with the fresh grab SFX (sub-boom + braam + metal
  ping + riser) and a rising tension swell. No flat/generic opening stills. Iterate
  regens until the user accepts the hook as striking. Optional red overlay title only if
  it serves the hook and passes the size check.
- Effects: use Concat MCP library filters/transitions for special video effects
  when needed; keep transitions <= 0.4s. Prefer these over custom ad hoc CSS.

- Editing preference: use Concat MCP library filters/transitions for special
  video effects when needed; keep transitions <= 0.4s.
- Overlay text (red title): include only when it has a clear hook purpose and
  user approval; no arbitrary overlay.
- Overlay type must never clip: size it from the string length (target usable
  width ~940 px of 1080) and verify with a `remotion still` at every overlay
  frame before the full render. Same rule for end cards and CTA titles.
- Hook audio: every short opens with a fresh synthesized "grab" SFX (sub boom +
  low braam + metal ping + eerie tail) and a rising tension swell that lands on
  the first mid-hook cut (~2-3 s in). Build new ones per topic; never reuse the
  previous video's stinger.
- BGM generation note: MUST generate new topic-fit BGM per video; never copy old BGM without fit check.
- BGM approval gate (mandatory): generate 3 distinct sample BGM beds that each
  match the story's topic and mood (compose them locally, e.g. subtle synth/orchestral
  beds themed to the era — Roman horns for Rome, guzheng for China, etc.), convert
  each to MP3, attach all 3, and ask the user to pick one. Do NOT proceed to the
  final render until the user explicitly approves one. After approval: build the
  full-length BGM in that style (exact video duration, no long outro — end with a
  short ≤0.4 s decay for a clean loop), then render + master.

## BGM and VO balance (mandatory before and after render)
Run this every time the user says the music buries the voice. A duck value alone does not prove the balance, so measure it.
1. Read the target: the bed must sit 4-6 dB BELOW the voice while the voice speaks. The bed may be louder in the gaps; that is the point of the duck.
2. Set the bed level when building the full-length track: normalize to ~0.55 peak in the generator (`scripts/bgm_full.py`), because a bed normalized to 0.8 peak lands near -14 dBFS RMS and reaches the mix louder than the voice.
3. Set the duck in the composition to ~0.24 while speaking and ~0.36 in the gaps (`SPEAK` / `GAP` constants). Keep the duck points strictly monotonically increasing frames.
4. Measure the rendered file on two windows — one inside speech, one inside a gap:
```
ffmpeg -ss <speech start> -t <dur> -i out/<name>.mp4 -af "astats=metadata=1:reset=0,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null -
```
   Read `lavfi.astats.Overall.RMS_level` from the last line of each run.
5. Decide: the gap window must be quieter than the speech window. If the gap is as loud as or louder than the speech, the bed is still too hot — lower the bed peak and re-render. If the speech window reads louder than the voice alone, the voice is buried.
6. Pick the gap window from the timeline, not by guessing seconds: read `src/timeline.json` and pick a range that falls between two segments' `audioFrom`/`audioFrom+audioDur`, because a window that still overlaps a voice segment measures speech, not the bed.
7. Report the before/after numbers to the user so they can ask for more reduction without another blind pass.
- Measure the balance on the rendered file, not on the sources: the mix is what the user hears, and per-source RMS does not reveal a bed that overpowers the voice.
- Write the WAV with Python's `wave` module and probe it before rendering; a hand-assembled RIFF header is rejected by the Remotion bundler with `no 'data' tag found` and the render dies at the first frame.

## Caption and SFX embedding (mandatory before render)
- Embed captions via `@remotion/captions` `createTikTokStyleCaptions` inside the composition: merge whisper subwords into whole words, paginate by `combineTokensWithinMilliseconds` (≤900ms), render each page as a Sequence from its startMs to the next page's startMs or the 900ms cap, with gold per-word highlight on the active token and dimmed inactive tokens.
- Every caption must stay on screen ≥1.5s; if a paginated page is shorter, extend to the next page boundary or merge with the following caption.
- Place the hook SFX (sub-boom + braam + metal ping + riser) at frame 0 and a rising tension swell into the first mid-hook cut (~2–3s).
- Place whoosh/impact SFX 2–4 frames before every visual cut; place an end-card impact at the end-card start.
- BGM volume duck points must be strictly monotonically increasing frames: keep a gap between each segment's audioEnd+ENT and the next segment's audioStart−ENT so interpolate does not crash on overlapping input ranges.
- Schedule images with a `from` that is relative to the parent Sequence. An absolute `from` inside an already-offset parent double-offsets the image and leaves most of that segment black.
- Repair captions against the VO script, not token by token: whisper splits words ("Ptolemies" → "P"+"to"+"lem"+"ies", "500,000" → "500,"+"000", "forgery" → "for"+"gery") and invents lines that were never spoken. Run `scripts/fix-captions-vs-script.mjs`, which matches caption tokens against the words in `stills/vo.txt`, merges fragments into one word, restores the leading space on every token but the first, and drops tokens left over after the script words run out.
- The caption aligner uses fuzzy (Levenshtein) Needleman-Wunsch alignment, not exact matching: fast TTS makes whisper mishear whole words ("explained" → "explain", "worked" → "works") and silently drop the last words of a segment ("You decide." vanished on seg6). A script word with no good transcript match keeps its place and gets timestamps interpolated between the nearest matched neighbours, so the on-screen text always equals the script. A strict exact-match aligner leaves the wrong word on screen.
- Compare British and American spellings when aligning (harbour/harbor), otherwise a correct caption looks broken and gets "repaired" into the wrong word.
- Re-read the caption JSON after aligning and before rendering; words that render glued together or spelled wrong are not caught by the caption count.

## Still verification (mandatory before and after render)
- Before rendering, list every still the timeline references and confirm each file exists on disk with a non-trivial size; a still that was generated but never copied into the public assets folder renders as a missing image.
- After rendering, sample frames across the whole timeline into one contact sheet (`ffmpeg -i out/<name>.mp4 -vf "fps=1/4,scale=270:-1,tile=4x3" -frames:v 1 grid.jpg`) and read that image to confirm every segment shows its artwork; an unexpectedly small output file for a still-heavy render is a fast signal that images are missing.
- If a sampled frame is blank or missing artwork, regenerate only that segment's still, copy it into the public assets folder, and re-render; do not rebuild the parts that already verified clean.
- gflow sometimes renders a shot as a multi-panel comic strip instead of a single scene (seen on the final museum shot of the Voynich cut). Reject it and regenerate with explicit wording: "SINGLE continuous cinematic wide shot, one single scene, NOT a comic strip, NO panels, NO borders, NO frames, NO split layout".
- Check the contact sheet for off-topic frames too: a still can look fine but depict the wrong moment (e.g. a lab bench instead of the dating instrument) and still pass a pure blank-frame check.

## Thumbnail (mandatory deliverable alongside the video)
- Shorts thumbnails are vertical: generate with `gflow image t2i "<prompt>" --aspect 9:16` (never 16:9), and finish at 1080×1920.
- Produce 3 distinct angle variants (e.g. wide blast, lone witness, graphic top-down), attach all 3, and let the user pick the artwork before adding text.
- Write the headline with ffmpeg `drawtext` (Arial Black, thick black border, drop shadow) — the image model cannot render clean type. Render 2–3 wording variants on the chosen artwork and let the user pick the wording.
- Fit the headline to the frame before rendering: measure the real font width (PIL `ImageFont.getbbox`) and shrink the size until the longest line fits inside ~900 px of the 1080 px width, with `scripts/add-thumb-text-fit.mjs`. A fixed font size pushes long words off both sides of the frame.
- After rendering the thumbnail, read the image and confirm every headline line sits inside the frame; a line clipped at the edge is not acceptable even when the file was produced without an error.
- If gflow times out or fails on a thumbnail variant, keep going with the artwork that succeeded and offer 2 artworks x 2 wordings instead of blocking the deliverable.
- Keep the upper third of the artwork dark and empty so the headline has room, and check the rendered thumbnail visually before delivering.
- Deliver as `<project>/thumbnails/<topic>_thumbnail.jpg` next to the final MP4.
- gflow writes thumbnails into `<out>/images/<date>/<uuid>_1.jpg`, not as `thumb_a.jpg`. Rename or copy them to `thumb_a/b/c.jpg` before adding text, otherwise the text script has no input file.
- Writing a WAV by hand (RIFF header assembled from `numpy` byte strings) produces a file the Remotion bundler rejects with `no 'data' tag found` and the render dies at frame 1. Always write audio with Python's `wave` module, and probe the result (`ffprobe -show_entries format=duration`) before rendering.

## Machine defaults
- Default VO: Kokoro-82M ONNX (kokoro-v1.0.onnx + voices-v1.0.bin, voice am_michael).
- Default stills: gflow-cli (`gflow image t2i`, 9:16) via `scripts/generate-stills.mjs`; 12 stills = 6 segments x 2 scenes.
- Default BGM: generate a new topic-fit bed (never reuse old). BGM approval gate:
  3 sample beds themed to the story topic/mood must be attached for the user to
  pick; final render only after explicit approval. Full-length version: exact video
  duration, no long outro (≤0.4 s end decay for clean loop).
- Hook policy: curiosity prompt + fast transitions (<=0.4s), no arbitrary red overlay.
- Hook SFX: new startle stinger at frame 0 + riser into the first mid-hook cut.
- Overlay sizing: auto-shrink by string length; check with `remotion still` first.
- Editing: prefer Concat MCP transitions/effects library.
