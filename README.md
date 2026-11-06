# stickman-short-pipeline

Vertical (9:16) stickman history YouTube Shorts pipeline — 100% local tooling,
licensed/CC0 assets, no paid generation APIs. Built and battle-tested on
~50-second videos like *The First Paper (China, 105 AD)* and *Fall of Rome (476 AD)*.

## What it produces

One finished MP4: 30–60s, 1080×1920, **−14 LUFS** (two-pass loudnorm, measured
AFTER AAC encode), true peak ≤ −1.0 dBFS, seamless loop, plus upload-ready
metadata (3 YouTube titles, description with timestamps, tags, TikTok EN+ID
captions).

## Repo layout

```
skill/                 the agent skill (copy this folder into your agent's
  SKILL.md               skills directory, e.g. .claude/skills/ or .agents/skills/)
  references/            pipeline playbook + US topic bank
  scripts/               keyword research helpers
project-template/      copy this folder per video — Remotion setup + all
                       pipeline scripts (VO, timeline, captions, BGM, QC,
                       mastering)
install/
  install.ps1            Windows one-shot dependency installer
```

## Install (Windows)

```powershell
git clone https://github.com/<you>/stickman-short-pipeline.git
cd stickman-short-pipeline
powershell -ExecutionPolicy Bypass -File install\install.ps1
```

The installer checks and installs:

| Tool | Used for | Source |
|---|---|---|
| Node.js + npm | Remotion render, pipeline scripts | winget |
| Python 3.12 | Kokoro TTS, BGM/SFX synths | winget |
| kokoro-onnx, onnxruntime, numpy, soundfile | VO synthesis | pip |
| Kokoro-82M model + voices (~350 MB) | cached in `%USERPROFILE%\kokoro-models` | GitHub release |
| ffmpeg | trim/mix/master/loudness measure | winget |
| yt-dlp | competitor research (`ytsearch8:`) | winget |
| whisper.cpp + medium.en model | guaranteed-sync captions | @remotion/install-whisper-cpp |
| uv (astral) | installs/updates gflow-cli tool | winget (astral-sh.uv) |
| gflow-cli (>= 0.92) | still image generation (12 stil per video, `gflow image t2i` 9:16) | uv (`uv tool install gflow-cli`) |
| Remotion deps | `project-template/` npm install | npm |

**macOS/Linux:** same components, install with brew/apt instead; the project
scripts are plain Node/Python and work cross-platform.

## Per-video workflow

1. `Copy-Item -Recurse project-template my-video` (or `node scripts\install-whisper.mjs` in the new folder to bundle whisper.cpp)
2. `New-Item -ItemType Junction -Path my-video\kokoro -Target $env:USERPROFILE\kokoro-models`
3. Follow `skill/SKILL.md` — it is written FOR the agent and has mandatory
   user-approval gates:

- **Gate 1 (IDEA):** idea list must include REAL US-audience research numbers
  (Wikipedia pageviews, `yt-dlp` competitor view counts, autocomplete data)
- **Gate 2 (IMAGES):** stills approved one-by-one; batch after 3 consecutive OKs
- **Gate 3 (BGM):** 3 era-themed sample beds attached for user to pick; final
  render only after explicit approval
- explicit approval required before ANY full render

4. Voila: `out/<video>.mp4` → attach to chat, post with the generated metadata.

## License

MIT. Third-party models keep their own licenses (Kokoro-82M/Apache-2.0,
whisper.cpp/MIT, Remotion community — check each) — the pipeline only
orchestrates them locally.
