"""Mix for "The Deal at Plassey": narration + score (from kit stems) + sound effects.
Reads build/timeline.json (written by build.mjs). Writes assets/audio/mix.wav normalised to -14 LUFS.
Run: python3 mix.py
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

EP = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(EP, "..", "..", "tools"))
import audio_kit as K  # noqa: E402

SR = K.SR
TL = json.load(open(os.path.join(EP, "build/timeline.json")))
SH = TL["shots"]
TOTAL = TL["total"]
N = int(TOTAL * SR) + SR


def load(path):
    x, sr = sf.read(path, always_2d=False)
    if x.ndim > 1:
        x = x.mean(axis=1)
    if sr != SR:
        tmp = os.path.join(EP, "build", "_rs.wav")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-ar", str(SR), "-ac", "1", tmp], check=True)
        x, _ = sf.read(tmp)
    return x.astype(np.float64)


KIT = os.path.join(EP, "..", "..", "assets", "audio")
SFX = {n: load(os.path.join(KIT, "sfx", n + ".wav")) for n in ["paper-slide", "page-turn", "whoosh", "stamp-thud", "cannon-boom", "musket-crackle", "crowd-murmur", "rain", "thunder", "ship-bell", "camel-steps"]}
STEM = {n: load(os.path.join(KIT, "stems", n + ".wav")) for n in ["drone-d", "pad-dm-bb-f-a", "low-strings-d", "battle-pulse-92", "pluck-motif"]}

voice = np.zeros(N)
music = np.zeros(N)
fx = np.zeros(N)


def add(buf, clip, at, gain=1.0):
    i = int(max(0, at) * SR)
    j = min(len(buf), i + len(clip))
    if j > i:
        buf[i:j] += clip[: j - i] * gain


def loop(clip, dur):
    n = int(dur * SR)
    reps = int(np.ceil(n / len(clip))) + 1
    return np.tile(clip, reps)[:n]


def section(stems, t0, t1, fade=1.2):
    """stems: list of (name, gain). Adds a looped bed between t0 and t1 with fades."""
    d = t1 - t0
    bed = sum(loop(STEM[nm], d) * g for nm, g in stems)
    n = len(bed)
    f = min(n // 2, int(fade * SR))
    env = np.ones(n)
    env[:f] = np.linspace(0, 1, f)
    env[-f:] = np.linspace(1, 0, f)
    add(music, bed * env, t0)


def sh(i):
    return SH[i]


def V(i):
    return SH[i]["voice"]


def P(i, k):
    return SH[i]["voice"] + SH[i]["ph"][k]


# ---------------------------------------------------------------- narration
for sid, s in SH.items():
    add(voice, load(os.path.join(EP, "build/voice", sid + ".wav")), s["voice"])

# ---------------------------------------------------------------- score
end = lambda i: SH[i]["start"] + SH[i]["dur"]  # noqa: E731
section([("drone-d", 0.55), ("low-strings-d", 0.45), ("battle-pulse-92", 0.25)], 0, end("s02") + 0.2, fade=0.6)
section([("pad-dm-bb-f-a", 0.6), ("pluck-motif", 0.5), ("drone-d", 0.2)], SH["s03"]["start"] - 0.3, end("s05b") + 0.3)
section([("drone-d", 0.5), ("low-strings-d", 0.5), ("battle-pulse-92", 0.55)], SH["s06"]["start"] - 0.3, SH["s07"]["start"] + 0.6)
section([("drone-d", 0.6), ("low-strings-d", 0.4)], SH["s07"]["start"], end("s07"))
section([("drone-d", 0.5), ("low-strings-d", 0.45), ("battle-pulse-92", 0.35)], SH["s08"]["start"] - 0.3, end("s08") + 0.3)
section([("pad-dm-bb-f-a", 0.55), ("low-strings-d", 0.35)], SH["s09"]["start"] - 0.3, end("s10") + 0.3)
section([("pad-dm-bb-f-a", 0.5), ("pluck-motif", 0.45)], SH["s11"]["start"] - 0.3, TOTAL, fade=1.5)
# final low chord under the end card
fin = K.pad_chord(["D2", "A2", "D3", "F#3"], 4.5, 99, 900)
add(music, K.norm(fin, 0.6), TOTAL - 4.6)

# ---------------------------------------------------------------- sound effects
add(fx, loop(SFX["crowd-murmur"], sh("s01")["dur"]), 0, 0.22)
add(fx, SFX["whoosh"], V("s01") + 0.0, 0.35)
add(fx, SFX["paper-slide"], P("s01", 3) - 0.1, 0.5)
add(fx, SFX["paper-slide"], P("s01", 4), 0.5)
add(fx, SFX["whoosh"], sh("s02")["start"] + 0.1, 0.3)
add(fx, SFX["paper-slide"], P("s02", 1), 0.4)
add(fx, SFX["paper-slide"], P("s02", 3) - 0.15, 0.35)
add(fx, loop(SFX["crowd-murmur"], sh("s03")["dur"]), sh("s03")["start"], 0.08)
add(fx, SFX["whoosh"], sh("s03")["start"] + 0.25, 0.25)
add(fx, SFX["paper-slide"], V("s03") + 0.2, 0.5)
add(fx, SFX["paper-slide"], V("s04") + 0.2, 0.5)
add(fx, SFX["camel-steps"][: int(2.3 * SR)], sh("s05a")["start"], 0.35)
add(fx, SFX["paper-slide"], V("s05a") + 0.2, 0.5)
add(fx, SFX["whoosh"], P("s05a", 3), 0.45)
add(fx, SFX["paper-slide"], sh("s05b")["start"] + 0.15, 0.55)
add(fx, SFX["page-turn"], sh("s05b")["start"] + 0.7, 0.4)
for k in range(12):
    add(fx, SFX["ship-bell"][: int(0.4 * SR)] * np.exp(-np.arange(int(0.4 * SR)) / (0.08 * SR)), P("s05b", 1) + 1.5 + k * 0.09 + 0.45, 0.12)
add(fx, SFX["stamp-thud"], P("s05b", 1) + 2.6, 0.55)
add(fx, loop(SFX["crowd-murmur"], sh("s06")["dur"]), sh("s06")["start"], 0.15)
for f, g in [(1.75, 0.8), (2.05, 0.9), (2.35, 0.75), (3.4, 0.8), (3.9, 0.9), (4.7, 0.7), (5.5, 0.85), (6.1, 0.7)]:
    add(fx, SFX["cannon-boom"], V("s06") + f, g * 0.75)
add(fx, SFX["musket-crackle"], V("s06") + 3.3, 0.4)
add(fx, SFX["musket-crackle"], V("s06") + 5.2, 0.35)
add(fx, SFX["whoosh"], V("s06") + 0.05, 0.25)
add(fx, loop(SFX["rain"], sh("s07")["dur"] + 0.5), sh("s07")["start"], 0.42)
add(fx, SFX["thunder"], V("s07") + 0.2, 0.75)
add(fx, SFX["whoosh"], P("s07", 1), 0.5)
add(fx, SFX["paper-slide"], P("s07", 1) + 1.0, 0.35)
add(fx, SFX["paper-slide"], P("s07", 2), 0.35)
add(fx, K.sfx_whoosh(31, 0.9), P("s07", 3) + 0.2, 0.15)
add(fx, loop(SFX["crowd-murmur"], sh("s08")["dur"]), sh("s08")["start"], 0.15)
add(fx, SFX["musket-crackle"], sh("s08")["start"] + 0.5, 0.2)
add(fx, SFX["cannon-boom"], sh("s08")["start"] + 2.0, 0.3)
add(fx, SFX["whoosh"], V("s08") + 1.0, 0.25)
add(fx, SFX["stamp-thud"], P("s08", 2) + 0.95, 1.0)
add(fx, loop(SFX["camel-steps"], sh("s09")["dur"]), sh("s09")["start"], 0.35)
add(fx, SFX["paper-slide"], P("s09", 2), 0.45)
for k in range(12):
    add(fx, SFX["paper-slide"][: int(0.05 * SR)], P("s09", 3) + k * 0.045, 0.25)
add(fx, SFX["whoosh"], P("s09", 4) + 1.2, 0.25)
add(fx, SFX["page-turn"], sh("s10")["start"] + 0.05, 0.4)
for k in range(3):
    add(fx, SFX["stamp-thud"][: int(0.25 * SR)], V("s10") + 0.1 + k * 0.35 + 0.15, 0.25)
add(fx, K.sfx_whoosh(41, 2.4), P("s10", 1) + 0.3, 0.3)
for k in range(8):
    add(fx, SFX["paper-slide"][: int(0.05 * SR)], P("s10", 2) + 0.1 + k * 0.13, 0.3)
add(fx, SFX["paper-slide"], P("s10", 3), 0.4)
add(fx, SFX["page-turn"], sh("s11")["start"] + 0.05, 0.35)
add(fx, SFX["whoosh"], P("s11", 3) - 0.15, 0.4)

# ---------------------------------------------------------------- ducking and balance
win = int(0.05 * SR)
v_env = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode="same"))
active = (v_env > 0.01).astype(float)
# smooth the gate: 120 ms attack, 400 ms release
gate = np.zeros_like(active)
a_att, a_rel = np.exp(-1 / (0.12 * SR)), np.exp(-1 / (0.4 * SR))
acc = 0.0
for i in range(0, len(active), 48):  # 1 ms steps, then hold
    target = active[i]
    coef = a_att if target > acc else a_rel
    acc = target + (acc - target) * coef ** 48
    gate[i : i + 48] = acc


def rms(x, mask=None):
    if mask is not None:
        x = x[mask]
    return np.sqrt(np.mean(x ** 2) + 1e-12)


vmask = active > 0.5
v_rms = rms(voice, vmask)
bed = music + 0.8 * fx
# music under narration sits about 9 dB below the voice before ducking (about 15 dB with the duck) the voice; between lines it rises 6 dB
m_rms = rms(music, vmask)
music_gain = (v_rms * 10 ** (-9 / 20)) / m_rms
duck = 10 ** (-6 / 20) + (1 - 10 ** (-6 / 20)) * (1 - gate)
music_out = music * music_gain * duck
fx_rms = rms(fx, fx != 0)
fx_gain = (v_rms * 10 ** (-6 / 20)) / max(fx_rms, 1e-9)
fx_out = fx * min(fx_gain, 3.0) * (0.75 + 0.25 * (1 - gate))
mixm = voice + music_out + fx_out

# stereo: voice centre, music slightly wide, effects a little wide
L = voice + music_out * 1.0 + fx_out * 1.05
R = voice + music_out * 0.95 + fx_out * 0.95
st = np.stack([L, R], axis=1)[: int(TOTAL * SR)]
raw = os.path.join(EP, "build", "mix_raw.wav")
sf.write(raw, (st / max(1.0, np.max(np.abs(st)) * 1.05)).astype(np.float32), SR)
print("voice vs music under narration: %.1f dB" % (20 * np.log10(v_rms / rms(music_out, vmask))))

# ---------------------------------------------------------------- loudness, two passes
out = os.path.join(EP, "assets", "audio", "mix.wav")
p1 = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
j = json.loads(p1.stderr[p1.stderr.rfind("{") :])
af = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000"
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-af", af, "-ar", "48000", "-c:a", "pcm_s16le", out], check=True)
p3 = subprocess.run(["ffmpeg", "-hide_banner", "-i", out, "-af", "loudnorm=I=-14:TP=-1.5:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
j3 = json.loads(p3.stderr[p3.stderr.rfind("{") :])
print("final: integrated %s LUFS, true peak %s dBTP" % (j3["input_i"], j3["input_tp"]))
json.dump({"integrated_lufs": float(j3["input_i"]), "true_peak_dbtp": float(j3["input_tp"]), "voice_over_music_db": round(float(20 * np.log10(v_rms / rms(music_out, vmask))), 1)}, open(os.path.join(EP, "build", "mix_stats.json"), "w"))
