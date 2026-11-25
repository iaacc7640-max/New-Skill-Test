## Choices I made (no questions asked)

1. **Length ~96 s, not 90.** Twelve shots, each sized to its narration line plus a breath (shots run 6–11 s). Narration at Kokoro speed 1.1 is 82 s; the rest is the cold-open lead-in, 0.4 s crossfades and a 3 s end card.
2. **Beat 3 corrected.** The brief said Clive bribed Mir Jafar. The sources say the money went the other way: the Company promised Mir Jafar the throne, and Mir Jafar promised the Company huge payments (22 million rupees in the treaty; Clive personally took £160,000). The narration says "In return, Mir Jafar promises the Company a fortune." See sources.md.
3. **Mir Jafar's title.** Sources call him commander-in-chief, paymaster (*bakhshi*) and commander of the army. I used "a commander of his army" / "Commander in the Nawab's army".
4. **Casualties.** Shown as 22 with "Some records: 27" and a SOURCES DIFFER · SEE SOURCES tag, as asked.
5. **Army sizes.** Both numbers on the versus card carry an ESTIMATE tag (Nawab totals range from ~50,000 to ~68,000 in the sources read).
6. **The map.** Bengal + Bihar hand-simplified (Odisha left out). The red spread from Calcutta stands for 1757–1765 Company power, tied on screen to "1765: the Company collects Bengal's taxes (the diwani)". MAP SIMPLIFIED shown for the whole shot.
7. **Uniforms.** Tricorne hats, not the shako named in the style guide (the shako is c. 1800). Two in three Company soldiers are drawn as Indian sepoys (2,100 of ~3,100 troops).
8. **Voice.** Kokoro `bm_george` (British male), recorded in `assets/characters/characters.md` as the channel voice.
9. **Score.** Original, made in code in D minor: drone + low strings + a light dhol-like pulse for the field, a pad with a plucked-string motif for the court and the deal, a final low D chord. About 9 dB under the voice, ducked a further 6 dB while the narrator speaks (measured 14.5 dB under the voice during narration).
10. **Archival images.** None used. The archive sites were blocked and the skill caps them at 1 in 8 shots anyway; the pilot is all ClearCut artwork.
11. **Thumbnails** were not made: not in the pilot's deliverable list. `packaging.md` (title, description with chapters and sources, pinned comment) is included.
12. **No Studio preview session.** This ran in a cloud container with no screen the owner can reach. To edit in the HyperFrames desktop app or Studio, open `episodes/plassey-pilot/` and run `npx hyperframes preview` after `node build.mjs && python3 mix.py`.
13. **Telemetry.** Disabled with `npx hyperframes telemetry disable`, as the ClearCut skill asks; no HyperFrames usage note was sent.
