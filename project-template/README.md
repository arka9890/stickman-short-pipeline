# Video project (copy of project-template)

Start a new video:

```powershell
Copy-Item -Recurse <repo>\project-template <my-video>
cd <my-video>
New-Item -ItemType Junction -Path kokoro -Target $env:USERPROFILE\kokoro-models
node scripts\install-whisper.mjs   # or copy whisper.cpp\ from project-template
npm install
```

## Pipeline order (matches skill/SKILL.md)

| Step | Command | Output |
|---|---|---|
| 1. Research (before script) | `node scripts\keyword_autocomplete.mjs "seed..."` + Wikipedia pageviews + `yt-dlp --dump-json --skip-download "ytsearch8:<topic> history shorts"` | idea numbers for Gate 1 |
| 2. Script | write `stills/vo.txt` (`SegN::text`, 6 segs × 5–8s) | Gate 1 hook pick |
| 3. VO | `python scripts\genvo_kokoro.py --voice am_michael` | `public/audio/vo_segN.wav` (−16 LUFS per seg via `normalize-vo.mjs`) |
| 4. Captions | `node scripts\transcribe.mjs --force` | `src/captions/captions_segN.json` |
| 5. Timeline | `node scripts\make-timeline.mjs` | `src/timeline.json` |
| 6. Still images | per Gate 2, one-by-one approval | `public/assets/` |
| 7. SFX / BGM | `node scripts\make-sfx.mjs`, `python scripts\bgm_final.py` (3 samples → Gate 3) | `public/audio/` |
| 8. Render | `npx remotion render Scene out\my-video.mp4 --overwrite` | video |
| 9. Master + verify | `node scripts\master-final.mjs` then `ffmpeg -i out\my-video.mp4 -af ebur128=peak=true -f null NUL` | −14 LUFS ± 0.5, TP ≤ −1.0 |
| 10. QC | read still frames (hook, transitions, end card) | attach final |

Adjust `src/Root.tsx` + composition to the video (use fall-of-rome-style per-scene
components or the starter `src/Scene.tsx`).
