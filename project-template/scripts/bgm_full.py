# Builds the full-length BGM bed for the Voynich manuscript short.
# Variant C (harp/lute arpeggio + low drone), stretched to the exact timeline
# duration with a short fade at the tail so it never cuts off mid-note.
# Usage: python scripts/bgm_full.py
import json, os
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100

dur = json.load(open(os.path.join(ROOT, "src", "timeline.json")))["durationSec"]
N = int(dur * SR)
t = np.arange(N) / SR

sig = np.zeros(N)
# low drone bed (D2) with a slow breath
sig += 0.16 * np.sin(2 * np.pi * 73.42 * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.08 * t))
sig += 0.08 * np.sin(2 * np.pi * 110.0 * t) * (0.7 + 0.2 * np.sin(2 * np.pi * 0.05 * t + 1.2))

def pluck(f, at, dur_s=1.6, amp=0.24, decay=0.5):
    s = int(at * SR); ln = min(int(dur_s * SR), N - s)
    if ln <= 0: return
    tt = np.arange(ln) / SR
    env = np.exp(-tt / decay)
    sig[s:s + ln] += amp * np.sin(2 * np.pi * f * tt) * env

notes = [293.66, 349.23, 440.0, 523.25, 440.0, 349.23]
step = 0.75
k = 0
at = 0.25
while at < dur - 0.8:
    f = notes[k % len(notes)]
    pluck(f, at, dur_s=1.7, amp=0.24, decay=0.5)
    pluck(f * 2, at + 0.02, dur_s=1.1, amp=0.10, decay=0.3)
    if k % 2 == 0:
        pluck(notes[(k + 2) % len(notes)] * 0.5, at + 0.38, dur_s=1.9, amp=0.16, decay=0.7)
    k += 1
    at += step

# one-pole lowpass to take the edge off
a = 0.22
lp = 0.0
out = np.empty_like(sig)
for i in range(N):
    lp += a * (sig[i] - lp)
    out[i] = lp

# short tail fade (<= 0.4 s) so the bed stops cleanly under the end card
tail = int(0.4 * SR)
out[N - tail:] *= np.linspace(1, 0, tail)
head = int(0.05 * SR)
out[:head] *= np.linspace(0, 1, head)

peak = np.max(np.abs(out)) + 1e-9
out = 0.8 * out / peak
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)

path = os.path.join(ROOT, "public", "audio", "bgm_mystery.wav")
import wave
with wave.open(path, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", path, round(dur, 3), "s")
