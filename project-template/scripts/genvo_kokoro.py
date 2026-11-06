"""Generate VO segments with Kokoro-82M (ONNX, CPU) — v6 replacement for make-vo.ps1 / Piper.

Reads stills/vo.txt ("SegN::text"), synthesizes each segment with the selected
voice, runs the same edge-silence trim as v5, and writes public/audio/vo_segN.wav.

Usage:
  python scripts/genvo_kokoro.py --voice af_heart            # all segments
  python scripts/genvo_kokoro.py --voice am_michael --seg 1  # one segment
  python scripts/genvo_kokoro.py --voice af_heart --sample out.wav  # single test line
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXT = ROOT / "stills" / "vo.txt"
MODEL = ROOT / "kokoro" / "kokoro-v1.0.onnx"
VOICES = ROOT / "kokoro" / "voices-v1.0.bin"
OUT_DIR = ROOT / "public" / "audio"


TRIM = (
    "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.08,"
    "areverse,"
    "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.08,"
    "areverse"
)


def load_segments():
    lines = [ln.strip() for ln in TEXT.read_text(encoding="utf-8").splitlines() if ln.strip()]
    segs = {}
    cur = None
    buf = []
    for ln in lines:
        if "::" in ln and ln.split("::", 1)[0].strip().lower().startswith("seg"):
            if cur:
                segs[cur] = " ".join(buf)
            cur, buf = ln.split("::", 1)[0].strip().lower(), [ln.split("::", 1)[1].strip()]
        elif cur:
            buf.append(ln)
    if cur:
        segs[cur] = " ".join(buf)
    return segs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="am_michael")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--seg", type=int, default=0, help="1..6 generate only that segment")
    ap.add_argument("--sample", type=str, default="", help="write one short test line to this wav path")
    args = ap.parse_args()

    import numpy as np
    import soundfile as sf
    from kokoro_onnx import Kokoro

    kokoro = Kokoro(str(MODEL), str(VOICES))

    if args.sample:
        text = "Here is a secret. The paper you touch every day began as garbage."
        audio, sr = kokoro.create(text, voice=args.voice, speed=args.speed, lang="en-us")
        sf.write(args.sample, audio, sr)
        print(f"SAMPLE OK {args.voice} {args.sample} sr={sr} dur={len(audio)/sr:.2f}s")
        return

    segs = load_segments()
    names = sorted(segs)
    want = names if args.seg == 0 else [f"seg{args.seg}"]

    tmp = OUT_DIR / "_genvo_raw.wav"
    for name in want:
        text = segs[name]
        audio, sr = kokoro.create(text, voice=args.voice, speed=args.speed, lang="en-us")
        sf.write(tmp, audio, sr)
        out = OUT_DIR / f"vo_{name}.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-af", TRIM, str(out)], check=True)
        p = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)],
            capture_output=True, text=True, check=True,
        )
        print(f"wrote {out} dur={float(p.stdout.strip()):.2f}s")
        os.remove(tmp)
    print("GENVO DONE")


if __name__ == "__main__":
    sys.exit(main())
