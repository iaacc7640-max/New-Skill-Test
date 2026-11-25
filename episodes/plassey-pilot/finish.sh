#!/usr/bin/env bash
# Join the four rendered acts, lay the final mix on top, make the 720p review copy.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
printf "file '%s'\n" ../renders/act1.mp4 ../renders/act2.mp4 ../renders/act3.mp4 ../renders/act4.mp4 > out/acts.txt
ffmpeg -v error -y -f concat -safe 0 -i out/acts.txt -map 0:v -c:v copy out/video_only.mp4
DUR=$(python3 -c "import json;print(json.load(open('build/timeline.json'))['total'])")
ffmpeg -v error -y -i out/video_only.mp4 -i assets/audio/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a aac -b:a 256k -t "$DUR" -movflags +faststart out/master.mp4
ffmpeg -v error -y -i out/master.mp4 -vf scale=1280:720:flags=lanczos -c:v libx264 -preset medium -crf 25 -c:a aac -b:a 160k -movflags +faststart out/review.mp4
rm out/video_only.mp4 out/acts.txt
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of compact out/master.mp4
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height -of compact out/review.mp4
ls -la out
