"""ClearCut History - audio kit made entirely in code (numpy).

Writes reusable sound effects to assets/audio/sfx/ and score stems to assets/audio/stems/.
Episode mixes import the synth functions from here.
Run: python3 tools/audio_kit.py
"""
import os
import numpy as np
import soundfile as sf

SR = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def rng(seed):
    return np.random.default_rng(seed)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def onepole_lp(x, cutoff):
    """One-pole low-pass; cutoff may be scalar or per-sample array (Hz)."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def fft_filter(x, lo=None, hi=None):
    """Zero-phase band filter in the frequency domain (fast, for static bands)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))


def env_ad(n, a, d, curve=4.0):
    a_n = max(1, int(a * SR))
    e = np.zeros(n)
    e[:a_n] = np.linspace(0, 1, a_n)
    rest = n - a_n
    if rest > 0:
        e[a_n:] = np.exp(-curve * np.linspace(0, 1, rest) * (rest / SR) / max(d, 1e-3))
    return e


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def reverb(x, seconds=1.6, mix=0.25, seed=5):
    r = rng(seed)
    n = int(seconds * SR)
    ir = r.normal(0, 1, n) * np.exp(-6 * np.linspace(0, 1, n))
    ir = fft_filter(ir, hi=5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    nfft = 1 << (L - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:L]
    dry = np.concatenate([x, np.zeros(n)])
    return (1 - mix) * dry + mix * wet * 0.6


# ---------------------------------------------------------------- sfx
def sfx_paper_slide(seed=1):
    d = 0.45
    n = int(d * SR)
    x = rng(seed).normal(0, 1, n)
    x = fft_filter(x, lo=1800, hi=7000)
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return norm(x * e, 0.5)


def sfx_page_turn(seed=2):
    d = 0.6
    n = int(d * SR)
    x = rng(seed).normal(0, 1, n)
    x = fft_filter(x, lo=900, hi=6000)
    flutter = 0.6 + 0.4 * np.sin(2 * np.pi * 22 * t_axis(d)) ** 2
    e = env_ad(n, 0.12, 0.35, 3)
    return norm(x * e * flutter, 0.5)


def sfx_whoosh(seed=3, d=0.7):
    n = int(d * SR)
    x = rng(seed).normal(0, 1, n)
    cut = 300 + 4200 * np.sin(np.linspace(0, np.pi, n)) ** 2
    y = onepole_lp(x, cut)
    y = y - onepole_lp(y, 200)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return norm(y * e, 0.55)


def sfx_stamp_thud(seed=4):
    d = 0.9
    t = t_axis(d)
    n = len(t)
    body = np.sin(2 * np.pi * (70 - 25 * t) * t) * np.exp(-t * 14)
    click = fft_filter(rng(seed).normal(0, 1, n), lo=1500, hi=9000) * np.exp(-t * 90)
    slap = fft_filter(rng(seed + 1).normal(0, 1, n), lo=300, hi=2500) * np.exp(-t * 35)
    return norm(reverb(1.0 * body + 0.35 * click + 0.5 * slap, 0.6, 0.18)[: n + SR // 3], 0.95)


def sfx_cannon_boom(seed=5):
    d = 3.0
    t = t_axis(d)
    n = len(t)
    r = rng(seed)
    thump = np.sin(2 * np.pi * (52 - 20 * t) * t) * np.exp(-t * 5)
    blast = fft_filter(r.normal(0, 1, n), hi=900) * np.exp(-t * 7)
    crack = fft_filter(r.normal(0, 1, n), lo=1200, hi=6000) * np.exp(-t * 60)
    rumble = fft_filter(r.normal(0, 1, n), hi=180) * np.exp(-t * 1.4) * 0.8
    x = 1.0 * thump + 0.9 * blast + 0.25 * crack + rumble
    return norm(reverb(x, 2.2, 0.3)[:n], 0.95)


def sfx_musket_crackle(seed=6, d=2.5):
    n = int(d * SR)
    r = rng(seed)
    x = np.zeros(n)
    for _ in range(int(d * 9)):
        p = int(r.uniform(0, d - 0.2) * SR)
        m = int(0.12 * SR)
        tt = np.arange(m) / SR
        pop = fft_filter(r.normal(0, 1, m), lo=400, hi=5000) * np.exp(-tt * r.uniform(30, 60)) * r.uniform(0.3, 1)
        x[p : p + m] += pop
    return norm(reverb(x, 1.2, 0.3)[:n], 0.8)


def sfx_crowd_murmur(seed=7, d=8.0):
    n = int(d * SR)
    r = rng(seed)
    t = t_axis(d)
    x = np.zeros(n)
    for _ in range(26):
        f = r.uniform(250, 900)
        band = fft_filter(r.normal(0, 1, n), lo=f * 0.8, hi=f * 1.3)
        am = 0.5 + 0.5 * np.sin(2 * np.pi * r.uniform(1.5, 4.5) * t + r.uniform(0, 6.28)) ** 2
        x += band * am
    x = fft_filter(x, lo=150, hi=2200)
    fade = np.minimum(1, np.minimum(t / 0.5, (d - t) / 0.5))
    return norm(x * fade, 0.5)


def sfx_rain(seed=8, d=10.0):
    n = int(d * SR)
    r = rng(seed)
    t = t_axis(d)
    hiss = fft_filter(r.normal(0, 1, n), lo=800, hi=9000) * 0.5
    body = fft_filter(r.normal(0, 1, n), lo=200, hi=1500) * 0.35
    drops = np.zeros(n)
    for _ in range(int(d * 60)):
        p = r.integers(0, n - 800)
        m = 600
        drops[p : p + m] += r.normal(0, 1, m) * np.exp(-np.arange(m) / 80) * r.uniform(0.1, 0.6)
    drops = fft_filter(drops, lo=1500, hi=8000)
    fade = np.minimum(1, np.minimum(t / 1.0, (d - t) / 1.0))
    return norm((hiss + body + drops) * fade, 0.6)


def sfx_thunder(seed=9, d=4.5):
    t = t_axis(d)
    n = len(t)
    r = rng(seed)
    x = fft_filter(r.normal(0, 1, n), hi=260)
    e = np.exp(-((t - 0.5) ** 2) / 0.05) + 0.7 * np.exp(-t * 0.9) * (t > 0.3)
    crack = fft_filter(r.normal(0, 1, n), lo=800, hi=5000) * np.exp(-np.abs(t - 0.35) * 25)
    return norm(reverb(x * e + 0.3 * crack, 2.0, 0.3)[:n], 0.9)


def sfx_ship_bell(seed=10, d=3.0):
    t = t_axis(d)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, a, k in [(620, 1, 1.2), (1240 * 1.02, 0.5, 2), (1680, 0.35, 2.5), (2480, 0.2, 4)])
    return norm(reverb(x, 1.5, 0.25)[: len(t)], 0.7)


def sfx_camel_steps(seed=11, d=2.4, step=0.32):
    n = int(d * SR)
    r = rng(seed)
    x = np.zeros(n)
    k = 0.0
    while k < d - 0.2:
        p = int(k * SR)
        m = int(0.15 * SR)
        tt = np.arange(m) / SR
        x[p : p + m] += fft_filter(r.normal(0, 1, m), lo=80, hi=900) * np.exp(-tt * 40)
        k += step * r.uniform(0.85, 1.15)
    return norm(x, 0.6)


# ---------------------------------------------------------------- score
def note(name):
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    p, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[p] + 12 * (o + 1) - 69) / 12)


def pad_voice(freq, d, seed=0, bright=1200):
    t = t_axis(d)
    r = rng(seed)
    x = np.zeros_like(t)
    for det in (-0.12, 0.0, 0.11):
        f = freq * 2 ** (det / 12)
        ph = r.uniform(0, 1)
        saw = 2 * ((f * t + ph) % 1) - 1
        x += saw
    x = onepole_lp(x / 3, bright)
    return x


def pad_chord(notes, d, seed=0, bright=1100):
    x = sum(pad_voice(note(n), d, seed + i, bright) for i, n in enumerate(notes))
    n = len(x)
    att = min(n, int(1.2 * SR))
    e = np.ones(n)
    e[:att] = np.linspace(0, 1, att) ** 2
    rel = min(n, int(1.2 * SR))
    e[-rel:] *= np.linspace(1, 0, rel) ** 2
    return x * e / len(notes)


def drone(freq, d, seed=0):
    t = t_axis(d)
    x = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2 * t + 0.3) + 0.25 * np.sin(2 * np.pi * freq * 3.01 * t)
    wob = 1 + 0.08 * np.sin(2 * np.pi * 0.13 * t)
    return x * wob / 1.75


def low_strings(freq, d, seed=0):
    """Bowed low-string tone: saw through a slow-moving filter with vibrato."""
    t = t_axis(d)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t)
    ph = np.cumsum(freq * vib) / SR
    saw = 2 * (ph % 1) - 1
    cut = 500 + 300 * np.sin(2 * np.pi * 0.2 * t) ** 2
    y = onepole_lp(saw, cut)
    n = len(t)
    e = np.minimum(1, np.minimum(t / 0.8, (d - t) / 0.8))
    return y * e


def pluck(freq, d=1.6, seed=0, damp=0.996):
    """Karplus-Strong plucked string (an original motif voice)."""
    n = int(d * SR)
    period = int(SR / freq)
    buf = rng(seed).uniform(-1, 1, period)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = damp * 0.5 * (buf[i % period] + buf[(i + 1) % period])
    return out


def drum_hit(kind, seed=0):
    r = rng(seed)
    if kind == "low":  # dhol-like bass side
        d = 0.6
        t = t_axis(d)
        x = np.sin(2 * np.pi * (95 - 40 * t) * t) * np.exp(-t * 9) + 0.2 * fft_filter(r.normal(0, 1, len(t)), hi=600) * np.exp(-t * 30)
    elif kind == "high":  # treble slap
        d = 0.3
        t = t_axis(d)
        x = np.sin(2 * np.pi * 330 * t) * np.exp(-t * 30) + 0.5 * fft_filter(r.normal(0, 1, len(t)), lo=1500, hi=7000) * np.exp(-t * 45)
    else:  # snare-ish tap
        d = 0.25
        t = t_axis(d)
        x = fft_filter(r.normal(0, 1, len(t)), lo=1200, hi=8000) * np.exp(-t * 35) + 0.3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)
    return x


def place(buf, clip, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(clip))
    buf[i:j] += clip[: j - i] * gain


def battle_pulse(d, bpm=92, seed=0):
    """Light percussion pulse: low drum on 1 and 3, slaps on offbeats, taps in 16ths."""
    out = np.zeros(int(d * SR) + SR)
    beat = 60 / bpm
    k = 0
    t = 0.0
    while t < d:
        bar_pos = k % 4
        if bar_pos in (0, 2):
            place(out, drum_hit("low", seed + k), t, 0.9)
        if bar_pos in (1, 3):
            place(out, drum_hit("high", seed + k), t, 0.45)
        place(out, drum_hit("tap", seed + 100 + k), t + beat / 2, 0.22)
        if bar_pos == 3:
            place(out, drum_hit("tap", seed + 200 + k), t + beat * 0.75, 0.18)
        t += beat
        k += 1
    return out[: int(d * SR)]


def write(rel, x, sr=SR):
    path = os.path.join(ROOT, "assets", "audio", rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, x.astype(np.float32), sr)
    print("wrote assets/audio/" + rel, f"{len(x) / sr:.2f}s")


if __name__ == "__main__":
    write("sfx/paper-slide.wav", sfx_paper_slide())
    write("sfx/page-turn.wav", sfx_page_turn())
    write("sfx/whoosh.wav", sfx_whoosh())
    write("sfx/stamp-thud.wav", sfx_stamp_thud())
    write("sfx/cannon-boom.wav", sfx_cannon_boom())
    write("sfx/musket-crackle.wav", sfx_musket_crackle())
    write("sfx/crowd-murmur.wav", sfx_crowd_murmur())
    write("sfx/rain.wav", sfx_rain())
    write("sfx/thunder.wav", sfx_thunder())
    write("sfx/ship-bell.wav", sfx_ship_bell())
    write("sfx/camel-steps.wav", sfx_camel_steps())
    # reusable 16 s stems in D minor
    write("stems/drone-d.wav", norm(drone(note("D2"), 16.0), 0.6))
    write("stems/pad-dm-bb-f-a.wav", norm(np.concatenate([pad_chord(c, 4.0, i) for i, c in enumerate([["D3", "F3", "A3"], ["Bb2", "D3", "F3"], ["F2", "A2", "C3"], ["A2", "C#3", "E3"]])]), 0.6))
    write("stems/low-strings-d.wav", norm(low_strings(note("D2"), 16.0), 0.6))
    write("stems/battle-pulse-92.wav", norm(battle_pulse(16.0), 0.8))
    motif = np.zeros(int(8 * SR))
    for i, (n, at) in enumerate([("D4", 0), ("Eb4", 0.5), ("F#4", 1.0), ("G4", 1.5), ("A4", 2.5), ("G4", 3.25), ("F#4", 3.75), ("Eb4", 4.5), ("D4", 5.25)]):
        place(motif, pluck(note(n), 2.0, i), at, 0.8)
    write("stems/pluck-motif.wav", norm(reverb(motif, 1.4, 0.25)[: len(motif)], 0.6))
