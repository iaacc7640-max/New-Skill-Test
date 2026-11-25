"""Quality checks on a rendered master.
- motion: every 2-second window must contain visible change other than grain
  (frames are blurred and downscaled so grain averages out)
- grain: two frames 1/15 s apart must differ
- frames every 2 s for review, contact sheet every 3 s
Usage: python3 qc.py renders/master.mp4 out/
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)


def probe_dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True)
    return float(r.stdout.strip())


DUR = probe_dur(src)
W, H = 160, 90
# 10 fps, small and blurred: grain is gone, real motion remains
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps=10,gblur=sigma=6,scale={W}:{H}:flags=area,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
win = []
t = 0.0
while t < DUR - 0.05:
    a, b = int(t * 10), min(len(frames), int((t + 2.0) * 10) + 1)
    seg = frames[a:b]
    diffs = [float(np.mean(np.abs(seg[i + 1] - seg[i]))) for i in range(len(seg) - 1)]
    span = float(np.max(np.abs(seg - seg[0]).mean(axis=(1, 2)))) if len(seg) > 1 else 0.0
    win.append({"t0": round(t, 2), "t1": round(min(DUR, t + 2), 2), "max_step": round(max(diffs) if diffs else 0, 3), "span": round(span, 3), "moves": span > 0.35})
    t += 2.0
still = [w for w in win if not w["moves"]]

# grain: full-res frames 1/15 s apart in a flat sky/paper area
def grab(ts, name):
    p = os.path.join(out, name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{ts:.4f}", "-i", src, "-frames:v", "1", p], check=True)
    return np.asarray(Image.open(p).convert("L"), dtype=np.float32)

grain = []
for ts in [2.0, 33.0, 63.0, 90.0]:
    f1 = grab(ts, "_g1.png")
    f2 = grab(ts + 1 / 15, "_g2.png")
    grain.append({"t": ts, "mean_abs_diff": round(float(np.mean(np.abs(f1 - f2))), 3), "differs": bool(np.mean(np.abs(f1 - f2)) > 0.2)})
for n in ["_g1.png", "_g2.png"]:
    os.remove(os.path.join(out, n))

# frames every 2 s (for review) and contact sheet every 3 s
fdir = os.path.join(out, "frames-2s")
os.makedirs(fdir, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", "fps=1/2,scale=640:-2", os.path.join(fdir, "f%03d.jpg")], check=True)


def sheet(every, name, cols=6, tw=480):
    tdir = os.path.join(out, "_sheet")
    os.makedirs(tdir, exist_ok=True)
    times = list(np.arange(0, DUR - 0.01, every))
    ims = []
    for i, ts in enumerate(times):
        p = os.path.join(tdir, f"{i:03d}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{ts + 0.001:.3f}", "-i", src, "-frames:v", "1", "-vf", f"scale={tw}:-2", p], check=True)
        ims.append((ts, Image.open(p).convert("RGB")))
    th = ims[0][1].height
    rows = (len(ims) + cols - 1) // cols
    pad, lab = 10, 30
    S = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + lab + pad) + pad + 60), (24, 22, 20))
    d = ImageDraw.Draw(S)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
        big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    except OSError:
        font = big = ImageFont.load_default()
    d.text((pad, 16), f"The Deal at Plassey - pilot - one frame every {every:g} s ({len(ims)} frames, {DUR:.1f} s)", fill=(233, 220, 192), font=big)
    for i, (ts, im) in enumerate(ims):
        x = pad + (i % cols) * (tw + pad)
        y = 60 + pad + (i // cols) * (th + lab + pad)
        d.text((x, y), f"{int(ts // 60)}:{ts % 60:04.1f}", fill=(233, 220, 192), font=font)
        S.paste(im, (x, y + lab))
    S.save(os.path.join(out, name), quality=88)
    for f in os.listdir(tdir):
        os.remove(os.path.join(tdir, f))
    os.rmdir(tdir)

sheet(3.0, "contact-sheet-3s.jpg")
rep = {"duration": DUR, "windows": len(win), "still_windows": still, "grain": grain, "motion": win}
json.dump(rep, open(os.path.join(out, "qc.json"), "w"), indent=1)
print(f"duration {DUR:.2f}s, {len(win)} two-second windows, still windows: {len(still)}")
for s in still:
    print("  STILL", s)
print("grain:", grain)
print("min span:", min(w["span"] for w in win), "at", min(win, key=lambda w: w["span"])["t0"])
