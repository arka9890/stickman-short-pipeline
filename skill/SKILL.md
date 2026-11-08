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

Intended outcome: one finished 9:16 MP4 (30–60 s, hard cap 60 s, -14 LUFS, true peak ≤ -1.0
dBFS) plus upload-ready metadata, built entirely locally with licensed/CC0
assets. Read `references/pipeline-playbook.md` for the full step-by-step
commands, pitfalls, and QC checklist before starting a production. Use
`scripts/keyword_autocomplete.mjs` for the SEO phase.

## Hard rules
- Hard rule — FOLLOW THE PIPELINE (NO SKIPPING): every run must execute the steps in order (topic research → Gate 1 idea pick → Gate 2 still approval → Gate 3 BGM pick → final render approval). Never freelance a substitute, shortcut, or skipped gate — not even "temporarily" (no placeholder BGM, no unapproved stills, no render without user approval). If a step fails or is unavailable, stop and tell the user what is needed; any deviation requires explicit user approval before work continues.
- Hook-first: before writing stills/vo.txt, send the USER 3-5 hook options. Each option pairs an opening hook line and a closing line that calls back to that hook (loop). Wait for approval, then write full script + VO.
- Editing style baseline (reference: current Salem video): hard cuts between scenes; kinetic TikTok captions with gold per-word highlight; per-scene keyword overlay at the cut; BGM under VO ~-23 LUFS with ducking (0.4 speaking / 0.55 gap); SFX hits on cuts; end card anchored to scene end.
- Length: final timeline MUST be ≤ 60.0 s (≤ 1800 frames at 30 fps), measured
  from the rendered file, not estimated. Build the timeline with the cap
  enforced in `scripts/make-timeline.mjs`; if it overflows, cut script words —
  never compress the end card below 2.5 s.
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
