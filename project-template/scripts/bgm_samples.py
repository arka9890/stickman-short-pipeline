# Generates 3 topic-fit BGM samples for the Voynich manuscript short (Gate 3).
# Variants: A = medieval chamber/organ drone, B = occult dark drone, C = harp-lute mystery.
# Usage: python scripts/bgm_samples.py
import numpy as np, wave, os

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "audio")
os.makedirs(OUT, exist_ok=True)

def write(name, sig):
    sig = np.asarray(sig)
    peak = np.max(np.abs(sig)) + 1e-9
    sig = 0.82 * sig / peak
    pcm = (np.clip(sig, -1, 1) * 32767).astype(np.int16)
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", path, round(len(sig) / SR, 2), "s")

def lowpass(x, fc):
    a = min(0.999, 2 * np.pi * fc / SR)
    y = np.zeros_like(x); lp = 0.0
    for i in range(len(x)):
        lp += a * (x[i] - lp); y[i] = lp
    return y

def organ(x, f, amps, atk=0.25, rel=0.6):
    n = len(x); t = np.arange(n) / SR
    env = np.minimum(1.0, t / atk) * np.exp(-np.maximum(0, t - atk) / rel)
    out = np.zeros(n)
    for k, a in enumerate(amps):
        out += a * np.sin(2 * np.pi * f * (k + 1) * t)
    return out * env

def pluck(x, f, at, dur=1.2, amp=0.2, decay=0.45):
    n = len(x); s = int(at * SR); ln = int(dur * SR)
    tt = np.arange(ln) / SR
    env = np.exp(-tt / decay)
    w = s + ln
    if w > n: ln = max(0, n - s); tt = np.arange(ln) / SR; env = np.exp(-tt / decay); w = n
    x[s:w] += amp * np.sin(2 * np.pi * f * tt) * env

# ---------------- A: medieval chamber drone (sustained organ + choir-ish fifth) ----------------
DUR = 14.0; N = int(DUR * SR); t = np.arange(N) / SR
sig = np.zeros(N)
# D minor drone with a moving fifth
base = 73.42  # D2
sig += 0.30 * np.sin(2 * np.pi * base * t) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t))
sig += 0.22 * np.sin(2 * np.pi * base * 1.5 * t) * (0.6 + 0.2 * np.sin(2 * np.pi * 0.05 * t + 1))
sig += 0.10 * np.sin(2 * np.pi * base * 2 * t)
# slow organ swells
for i, st in enumerate([0.5, 3.6, 6.9, 10.0]):
    n = int(3.0 * SR); s = int(st * SR); e = min(s + n, N)
    tt = np.arange(e - s) / SR
    env = np.minimum(1, tt / 0.9) * np.exp(-np.maximum(0, tt - 1.2) / 0.8)
    sig[s:e] += 0.26 * env * (np.sin(2 * np.pi * 293.66 * tt) + 0.5 * np.sin(2 * np.pi * 349.23 * tt)
                              + 0.35 * np.sin(2 * np.pi * 440.0 * tt))
sig = lowpass(sig, 3200)
write("bgm_sample_a.wav", sig)

# ---------------- B: occult dark drone (low rumble + tritone + metallic shimmer) ----------------
DUR = 14.0; N = int(DUR * SR); t = np.arange(N) / SR
sig = np.zeros(N)
sig += 0.55 * np.sin(2 * np.pi * 55.0 * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t))
sig += 0.30 * np.sin(2 * np.pi * 77.78 * t)   # tritone-ish clash (Eb)
sig += 0.18 * np.sin(2 * np.pi * 58.27 * t)
# metallic shimmer: high partials fading in
for i, st in enumerate([2.0, 5.4, 8.8, 11.2]):
    n = int(3.4 * SR); s = int(st * SR); e = min(s + n, N)
    tt = np.arange(e - s) / SR
    env = np.minimum(1, tt / 1.4) * np.exp(-np.maximum(0, tt - 1.6) / 0.9)
    sig[s:e] += 0.16 * env * np.sin(2 * np.pi * (1046.5 + i * 60) * tt)
# low heartbeat
for i in range(int(DUR / 1.1)):
    s = int(i * 1.1 * SR); e = min(s + int(0.35 * SR), N)
    if e <= s: break
    tt = np.arange(e - s) / SR
    sig[s:e] += 0.30 * np.sin(2 * np.pi * 45 * tt) * np.exp(-tt / 0.09)
sig = lowpass(sig, 2400)
write("bgm_sample_b.wav", sig)

# ---------------- C: medieval harp/lute arpeggio mystery ----------------
DUR = 14.0; N = int(DUR * SR); t = np.arange(N) / SR
sig = np.zeros(N)
sig += 0.16 * np.sin(2 * np.pi * 73.42 * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.08 * t))
notes = [293.66, 349.23, 440.0, 523.25, 440.0, 349.23]
step = 0.75
k = 0
at = 0.2
while at < DUR - 1.0:
    f = notes[k % len(notes)]
    pluck(sig, f, at, dur=1.6, amp=0.24, decay=0.5)
    pluck(sig, f * 2, at + 0.02, dur=1.0, amp=0.10, decay=0.3)
    if k % 2 == 0:
        pluck(sig, notes[(k + 2) % len(notes)] * 0.5, at + 0.38, dur=1.8, amp=0.16, decay=0.7)
    k += 1; at += step
sig = lowpass(sig, 3800)
write("bgm_sample_c.wav", sig)

print("BGM SAMPLES DONE")
