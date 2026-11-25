// ClearCut History — "The Deal at Plassey" (90-second style pilot)
// Builds the HyperFrames project (index.html + compositions/*.html) from the shared kit in ../../assets.
// Timing follows the narration: every shot is laid out around its measured voice line.
// Run: node build.mjs   (after the voice lines exist in build/voice/)
import fs from "node:fs";
import path from "node:path";

const EP = path.dirname(new URL(import.meta.url).pathname);
const KIT = path.resolve(EP, "../../assets");
const read = (rel) => fs.readFileSync(path.join(KIT, rel), "utf8");
const PAL = JSON.parse(read("palette.json"));

/* ------------------------------------------------------------ copy kit */
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
for (const d of ["fonts", "ui"]) copyDir(path.join(KIT, d), path.join(EP, "assets", d));
fs.mkdirSync(path.join(EP, "assets/vendor"), { recursive: true });
fs.copyFileSync(path.resolve(EP, "../../node_modules/gsap/dist/gsap.min.js"), path.join(EP, "assets/vendor/gsap.min.js"));
fs.mkdirSync(path.join(EP, "compositions"), { recursive: true });
fs.mkdirSync(path.join(EP, "assets/audio"), { recursive: true });

/* ------------------------------------------------------------ timing */
const LINES = JSON.parse(fs.readFileSync(path.join(EP, "lines.json"), "utf8"));
const PH = JSON.parse(fs.readFileSync(path.join(EP, "build/voice/phrases.json"), "utf8"));
const LEAD = { s01: 0.7 }, TAIL = 0.55, XF = 0.4, MIN = 6.0, EXTRA = { s11: 3.0 };
let t = 0;
const SHOT = {};
LINES.forEach((l, i) => {
  const lead = LEAD[l.id] ?? 0.5;
  const dur = +Math.max(MIN, lead + PH[l.id].dur + TAIL + (EXTRA[l.id] || 0)).toFixed(3);
  SHOT[l.id] = { id: l.id, start: +t.toFixed(3), dur, voice: +(t + lead).toFixed(3), lead, vdur: PH[l.id].dur, ph: PH[l.id].phrases, text: l.text, z: i + 1 };
  t += dur - XF;
});
const TOTAL = +(t + XF).toFixed(3);

/* ------------------------------------------------------------ helpers */
const UI_CSS = read("ui/ui.css");
const RIG_JS = read("characters/rig.js");
const svgInner = (s) => s.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const svgOpen = (s) => s.match(/<svg[^>]*>/)[0];
const CHAR = {};
for (const n of ["clive", "siraj", "mir-jafar", "company-soldier", "nawab-soldier"]) CHAR[n] = read(`characters/${n}.svg`);
const SET = { battle: read("sets/plassey-battlefield.svg"), durbar: read("sets/durbar-hall.svg") };
const PROP = {};
for (const n of ["cannon-company", "gun-platform-nawab", "powder-keg", "tarpaulin", "tent", "treaty", "camel"]) PROP[n] = read(`sets/props/${n}.svg`);
const MAP = read("maps/bengal-1757.svg");
const MAPJ = JSON.parse(read("maps/bengal-1757.json"));
const VB_H = 360, VB_W = 260, FEET = 340; // character viewBox geometry

/** A rigged character. x = centre, feet = y of the feet (in the parent's px), h = full height in px. */
function char(id, name, { x, feet, h, flip = false, z = 5, style = "", cls = "" }) {
  const w = (h * VB_W) / VB_H;
  const top = feet - (h * FEET) / VB_H;
  const svg = CHAR[name].replace("<svg ", `<svg id="${id}-svg" `);
  return `<div id="${id}" class="cw ${cls}" style="left:${(x - w / 2).toFixed(1)}px;top:${top.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h}px;z-index:${z};${style}">
  <div class="cw-in" style="${flip ? "transform:scaleX(-1);" : ""}">${svg}</div></div>`;
}
/** A prop: x = centre, bottom = y of its base, w = width px. */
function prop(id, name, { x, bottom, w, z = 4, flip = false, style = "" }) {
  const vb = PROP[name].match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const h = (w * vb[3]) / vb[2];
  const svg = PROP[name].replace("<svg ", `<svg id="${id}-svg" `);
  return `<div id="${id}" class="cw" style="left:${(x - w / 2).toFixed(1)}px;top:${(bottom - h).toFixed(1)}px;width:${w}px;height:${h.toFixed(1)}px;z-index:${z};${style}">
  <div class="cw-in" style="${flip ? "transform:scaleX(-1);" : ""}">${svg}</div></div>`;
}
function rnd(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let q = a;
    q = Math.imul(q ^ (q >>> 15), q | 1);
    q ^= q + Math.imul(q ^ (q >>> 7), q | 61);
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
}
/** An army: one soldier symbol reused with <use>, rows from back to front. */
function army(id, name, rows, { w = 2400, h = 1080, vars = () => "", seed = 1, z = 3 } = {}) {
  const r = rnd(seed);
  const sym = `${id}-sym`;
  const uses = [];
  let count = 0;
  rows.forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const cx = row.x0 + ((row.x1 - row.x0) * (i + 0.5)) / row.n + (r() - 0.5) * (row.jitter ?? 14);
      const hh = row.h * (0.94 + r() * 0.1);
      const ww = (hh * VB_W) / VB_H;
      const y = row.feet + (r() - 0.5) * 8 - (hh * FEET) / VB_H;
      uses.push(`<use href="#${sym}" class="${id}-u" x="${(cx - ww / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" style="${vars(count, ri, r)}"/>`);
      count++;
    }
  });
  return {
    count,
    html: `<svg id="${id}" class="army" viewBox="0 0 ${w} ${h}" style="width:${w}px;height:${h}px;z-index:${z}">
  <defs><symbol id="${sym}" viewBox="-130 -350 260 360" overflow="visible">${svgInner(CHAR[name])}</symbol></defs>
  ${uses.join("\n  ")}</svg>`,
  };
}
const companyVars = (i, ri, r) => {
  // About 2,100 of ~3,000 Company troops were Indian sepoys: two in three wear a turban.
  const sepoy = i % 3 !== 0;
  const skins = sepoy ? [PAL.skin.medium, PAL.skin.brown, PAL.skin.deep] : [PAL.skin.light, PAL.skin.fair];
  return `--skin:${skins[Math.floor(r() * skins.length)]};--hatA:${sepoy ? 0 : 1};--hatB:${sepoy ? 1 : 0}`;
};
const nawabVars = (i, ri, r) => {
  const skins = [PAL.skin.fair, PAL.skin.medium, PAL.skin.brown, PAL.skin.deep];
  const jamas = ["#E4D3B0", "#EDE6D6", "#D8C29A", "#E9D9B4"];
  const turbans = ["#D9822B", "#B8362E", "#EDE6D6", "#C9A24A"];
  return `--skin:${skins[Math.floor(r() * 4)]};--jama:${jamas[Math.floor(r() * 4)]};--turban:${turbans[Math.floor(r() * 4)]}`;
};
const jafarVars = (i, ri, r) => {
  const skins = [PAL.skin.medium, PAL.skin.brown, PAL.skin.deep];
  return `--skin:${skins[Math.floor(r() * 3)]};--jama:#7E9C63;--turban:#EDE6D6;--sash:#4F7A3A`;
};

const chip = (id, text, style = "") => `<div id="${id}" class="cc-chip" style="${style}"><span class="cc-dot"></span>${text}</div>`;
const nameCard = (id, year, name, role, style = "") =>
  `<div id="${id}" class="cc-namecard" style="${style}"><div class="cc-year">${year}</div><div class="cc-who"><div class="cc-name">${name}</div><div class="cc-role">${role}</div></div></div>`;
const trust = (id, text, style) => `<div id="${id}" class="cc-trust" style="${style}">${text}</div>`;

/* common timeline snippets (strings of JS) */
const J = {
  fadeIn: (sid) => `tl.fromTo("#${sid}-stage",{opacity:0},{opacity:1,duration:${XF},ease:"none"},0);`,
  chipIn: (id, at, out) =>
    `tl.fromTo("#${id}",{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:0.55,ease:"power3.out"},${at});` +
    (out ? `tl.to("#${id}",{clipPath:"inset(0 0% 0 100%)",duration:0.4,ease:"power2.in"},${out});` : ""),
  cardIn: (id, at, out) =>
    `tl.fromTo("#${id}",{x:-70,opacity:0},{x:0,opacity:1,duration:0.5,ease:"power3.out"},${at});` +
    (out ? `tl.to("#${id}",{x:-40,opacity:0,duration:0.35,ease:"power2.in"},${out});` : ""),
  popIn: (id, at) => `tl.fromTo("#${id}",{y:30,opacity:0},{y:0,opacity:1,duration:0.45,ease:"back.out(1.7)"},${at});`,
  rig: (id) => `document.querySelector("#${id}-svg")`,
};

/* ------------------------------------------------------------ scenes */
const SCENES = [];
const scene = (id, meta, build) => SCENES.push({ id, meta, build });

// S01 — cold open: two armies on the Plassey plain
scene("s01", {
  type: "Crowd / battle (wide)", chars: "Company army (36 <use> soldiers), Nawab's army (96 <use> soldiers)",
  motion: "Slow pan right with 5-layer parallax; armies sway and advance; versus card builds", text: "Chip: PLASSEY, BENGAL · 23 JUNE 1757; versus card; ESTIMATE tag", sfx: "crowd murmur, distant drums, whoosh (chip), paper slide (versus x2)",
}, (S) => {
  const co = army("s01-co", "company-soldier", [
    { n: 12, x0: 330, x1: 900, feet: 770, h: 150 },
    { n: 12, x0: 300, x1: 880, feet: 800, h: 160 },
    { n: 12, x0: 270, x1: 860, feet: 832, h: 170 },
  ], { vars: companyVars, seed: 11, z: 3 });
  const na = army("s01-na", "nawab-soldier", [
    { n: 22, x0: 1250, x1: 2380, feet: 726, h: 118 },
    { n: 20, x0: 1260, x1: 2360, feet: 748, h: 128 },
    { n: 20, x0: 1280, x1: 2370, feet: 772, h: 140 },
    { n: 18, x0: 1300, x1: 2380, feet: 800, h: 154 },
    { n: 16, x0: 1320, x1: 2390, feet: 830, h: 168 },
  ], { vars: nawabVars, seed: 12, z: 3 });
  const V = S.lead, P = S.ph;
  return {
    html: `<div id="s01-stage" class="stage"><div id="s01-cam" class="cam"><div id="s01-world" class="world">${SET.battle.replace("<svg ", '<svg id="s01-set" ')}${co.html}${na.html}</div></div>
      ${chip("s01-chip", "PLASSEY, BENGAL &middot; 23 JUNE 1757")}
      <div id="s01-vs" class="cc-versus" style="left:960px;top:780px"><div class="cc-a" id="s01-vsa"><div class="cc-side">CLIVE</div><div class="cc-num" id="s01-na1">~3,000</div></div><div class="cc-bar"></div><div class="cc-b" id="s01-vsb"><div class="cc-side">SIRAJ</div><div class="cc-num" id="s01-na2">~50,000</div></div></div>
      ${trust("s01-est", "ESTIMATE", "left:1420px;top:940px")}</div>`,
    css: `#s01-world{width:2400px;height:1080px}`,
    js: `
      tl.fromTo("#s01-world",{x:-60},{x:-480,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s01-cam",{scale:1.1},{scale:1.0,duration:${S.dur},ease:"sine.out"},0);
      tl.fromTo("#s01-set .set-sky",{x:0},{x:330,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s01-set .set-clouds",{x:0},{x:420,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s01-set .set-far",{x:0},{x:220,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s01-set .set-mid",{x:0},{x:90,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s01-set .set-fg",{x:0},{x:-240,duration:${S.dur},ease:"none"},0);
      R.crowd(tl, Array.from(document.querySelectorAll(".s01-co-u")), 0, ${S.dur}, {seed:1,period:0.7,bob:5,sway:3});
      R.crowd(tl, Array.from(document.querySelectorAll(".s01-na-u")), 0, ${S.dur}, {seed:2,period:0.9,bob:4,sway:3});
      tl.fromTo("#s01-co",{x:-30},{x:70,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s01-na",{x:40},{x:-70,duration:${S.dur},ease:"none"},0);
      ${J.chipIn("s01-chip", V + 0.05)}
      tl.fromTo("#s01-vs",{xPercent:-50,y:40,opacity:0},{xPercent:-50,y:0,opacity:1,duration:0.4,ease:"power3.out"},${V + P[3] - 0.1});
      tl.fromTo("#s01-vsb",{opacity:0.15},{opacity:1,duration:0.3},${V + P[3]});
      tl.set("#s01-vsb",{opacity:0.15},${V + P[3]});
      tl.to("#s01-vsb",{opacity:1,duration:0.3},${V + P[4]});
      ${[...Array(9)].map((_, k) => `tl.set("#s01-na1",{textContent:"~${Math.round((3000 * (k + 1)) / 9).toLocaleString("en-US")}"},${(V + P[3] + k * 0.07).toFixed(2)});`).join("")}
      tl.set("#s01-na2",{textContent:"~0"},0);
      ${[...Array(12)].map((_, k) => `tl.set("#s01-na2",{textContent:"~${(Math.round((50000 * (k + 1)) / 12 / 100) * 100).toLocaleString("en-US")}"},${(V + P[4] + k * 0.06).toFixed(2)});`).join("")}
      tl.set("#s01-na2",{textContent:"~50,000"},${(V + P[4] + 0.75).toFixed(2)});
      ${J.popIn("s01-est", V + P[4] + 0.5)}
    `,
  };
});

// S02 — title card at sunset
scene("s02", {
  type: "Title card", chars: "—", motion: "Sun sinks behind an ink grove; title words rise one by one; ink rule draws; red line types on",
  text: "THE DEAL AT PLASSEY; kicker 23 JUNE 1757; DECIDED BEFORE A SHOT WAS FIRED", sfx: "low whoosh, paper slide",
}, (S) => {
  const V = S.lead, P = S.ph;
  const trees = [...Array(14)].map((_, i) => { const x = 60 + i * 62; const s = 0.8 + ((i * 37) % 10) / 25; return `<circle cx="${x}" cy="${742 - 44 * s}" r="${46 * s}"/><circle cx="${x + 26}" cy="${752 - 30 * s}" r="${34 * s}"/>`; }).join("");
  const flags = [1180, 1340, 1500, 1660].map((x) => `<path d="M${x},744 v-70 l36,12 l-36,12" fill="none" stroke="${PAL.ink}" stroke-width="5"/>`).join("");
  return {
    html: `<div id="s02-stage" class="stage" style="background:${PAL.paper}">
      <svg id="s02-sky" class="full" viewBox="0 0 1920 1080">
        <rect x="0" y="0" width="1920" height="760" fill="#EAD2A8"/>
        <rect x="0" y="380" width="1920" height="380" fill="#E8C391" opacity="0.6"/>
        <circle id="s02-sun" cx="1650" cy="560" r="130" fill="${PAL.marathaSaffron}"/>
        <g id="s02-ground" fill="${PAL.ink}">${trees}<rect x="0" y="740" width="1920" height="340"/>${flags}</g>
        <path id="s02-rule" d="M560,600 H1360" stroke="${PAL.red || PAL.companyRed}" stroke-width="6" fill="none"/>
      </svg>
      <div id="s02-kick" class="cc-kicker" style="left:0;right:0;top:300px">23 JUNE 1757</div>
      <div id="s02-title" class="cc-title" style="left:0;right:0;top:400px"><span class="w">The</span> <span class="w">Deal</span> <span class="w">at</span> <span class="w">Plassey</span></div>
      <div id="s02-sub" class="cc-kicker" style="left:0;right:0;top:640px;color:${PAL.ink}">DECIDED <span style="color:${PAL.companyRed}">BEFORE A SHOT WAS FIRED</span></div>
      <div id="s02-wsun" class="cc-kicker" style="left:0;right:0;top:860px;color:${PAL.paper}">BY SUNSET</div>
    </div>`,
    css: `#s02-title .w{display:inline-block} #s02-ground{fill:${PAL.ink}}`,
    js: `
      ${J.fadeIn("s02")}
      tl.fromTo("#s02-sun",{attr:{cy:520,fill:"${PAL.marathaSaffron}"}},{attr:{cy:760,fill:"#B8362E"},duration:${S.dur},ease:"sine.in"},0);
      tl.fromTo("#s02-ground",{x:0},{x:-60,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s02-wsun",{opacity:0,y:20},{opacity:1,y:0,duration:0.4},${V + P[0]});
      tl.to("#s02-wsun",{opacity:0,duration:0.3},${V + P[2]});
      tl.fromTo("#s02-kick",{opacity:0,scaleX:1.25},{opacity:1,scaleX:1,duration:0.8,ease:"power2.out"},${V + P[1] - 0.4});
      tl.fromTo("#s02-title .w",{y:60,opacity:0},{y:0,opacity:1,duration:0.5,ease:"power3.out",stagger:0.16},${V + P[1]});
      tl.fromTo("#s02-rule",{attr:{"stroke-dasharray":"800 800","stroke-dashoffset":800}},{attr:{"stroke-dashoffset":0},duration:0.8,ease:"power2.inOut"},${V + P[2]});
      tl.fromTo("#s02-sub",{opacity:0,y:24},{opacity:1,y:0,duration:0.5,ease:"power3.out"},${V + P[3] - 0.15});
      tl.fromTo("#s02-title",{scale:1},{scale:1.04,duration:${S.dur},ease:"none"},0);
    `,
  };
});

// S03 — durbar: Siraj ud-Daulah
scene("s03", {
  type: "Character scene", chars: "Siraj ud-Daulah (idle, blink, talk, gesture, turn head); two Nawab's guards (idle, blink)",
  motion: "Push-in on the throne; parallax on wall/columns/curtains; hanging lamps sway", text: "Chip: MURSHIDABAD · THE NAWAB'S COURT; name card SIRAJ UD-DAULAH", sfx: "paper slide (card), soft murmur of court",
}, (S) => {
  const V = S.lead, P = S.ph;
  return {
    html: `<div id="s03-stage" class="stage"><div id="s03-cam" class="cam"><div id="s03-world" class="world">${SET.durbar.replace("<svg ", '<svg id="s03-set" ')}
      ${char("s03-siraj", "siraj", { x: 1200, feet: 760, h: 520, z: 6 })}
      ${char("s03-g1", "nawab-soldier", { x: 700, feet: 830, h: 430, flip: true, z: 5, style: "--skin:#A56F45;--turban:#B8362E;--jama:#EDE6D6" })}
      ${char("s03-g2", "nawab-soldier", { x: 1700, feet: 830, h: 430, z: 5, style: "--skin:#7E5233;--turban:#D9822B" })}
      </div></div>
      ${chip("s03-chip", "MURSHIDABAD &middot; THE NAWAB'S COURT")}
      ${nameCard("s03-card", "1756", "SIRAJ UD-DAULAH", "Nawab of Bengal &middot; took the throne at 23")}</div>`,
    css: `#s03-world{width:2400px;height:1080px}`,
    js: `
      ${J.fadeIn("s03")}
      tl.fromTo("#s03-world",{x:-240},{x:-190,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s03-cam",{scale:1.0},{scale:1.12,duration:${S.dur},ease:"sine.inOut",transformOrigin:"52% 42%"},0);
      tl.fromTo("#s03-set .set-far",{x:0},{x:24,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s03-set .set-fg",{x:0},{x:-70,duration:${S.dur},ease:"none"},0);
      document.querySelectorAll("#s03-set .set-lamp").forEach((el,i)=>{ tl.fromTo(el,{rotation:-2.2,svgOrigin:el.getAttribute("data-pivot")},{rotation:2.2,svgOrigin:el.getAttribute("data-pivot"),duration:1.6+i*0.2,ease:"sine.inOut",yoyo:true,repeat:Math.floor(${S.dur}/(1.6+i*0.2))},0); });
      const sj=${J.rig("s03-siraj")}, g1=${J.rig("s03-g1")}, g2=${J.rig("s03-g2")};
      [sj,g1,g2].forEach(r=>R.rest(tl,r,0));
      R.idle(tl,sj,0,${S.dur}); R.blink(tl,sj,0,${S.dur},31);
      R.idle(tl,g1,0.3,${S.dur},{period:3.6}); R.blink(tl,g1,0,${S.dur},32);
      R.idle(tl,g2,0.1,${S.dur},{period:3.4}); R.blink(tl,g2,0,${S.dur},33);
      R.talk(tl,sj,${V + P[0]},1.5,34);
      R.gesture(tl,sj,${V + P[1]},"R",1.8);
      R.turnHead(tl,sj,${V + P[4]},7);
      R.talk(tl,sj,${V + P[4]},1.6,35);
      R.react(tl,sj,${V + P[5]},0.8);
      R.turnHead(tl,g2,${V + 2.0},-6);
      ${J.chipIn("s03-chip", 0.25, S.dur - 0.6)}
      ${J.cardIn("s03-card", V + 0.2, S.dur - 0.55)}
    `,
  };
});

// S04 — Mir Jafar, foreground; the Nawab small behind him
scene("s04", {
  type: "Character scene", chars: "Mir Jafar (idle, blink, talk, turn head, frown); Siraj in the background (idle, blink)",
  motion: "Slow pan across the hall; Mir Jafar glances back at the Nawab, then at the viewer", text: "Name card MIR JAFAR", sfx: "low string swell on 'secret'",
}, (S) => {
  const V = S.lead, P = S.ph;
  return {
    html: `<div id="s04-stage" class="stage"><div id="s04-cam" class="cam"><div id="s04-world" class="world">${SET.durbar.replace("<svg ", '<svg id="s04-set" ')}
      ${char("s04-siraj", "siraj", { x: 1200, feet: 760, h: 520, z: 5 })}
      <div class="dim" style="z-index:6"></div>
      ${char("s04-jafar", "mir-jafar", { x: 1790, feet: 1060, h: 820, z: 7 })}
      </div></div>
      ${nameCard("s04-card", "1757", "MIR JAFAR", "Commander in the Nawab's army")}</div>`,
    css: `#s04-world{width:2400px;height:1080px} #s04-world .dim{position:absolute;left:0;top:0;width:2400px;height:1080px;background:rgba(43,38,34,.18)}`,
    js: `
      ${J.fadeIn("s04")}
      tl.fromTo("#s04-world",{x:-420},{x:-520,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s04-cam",{scale:1.04},{scale:1.0,duration:${S.dur},ease:"sine.out"},0);
      tl.fromTo("#s04-set .set-far",{x:0},{x:40,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s04-set .set-fg",{x:0},{x:-80,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s04-siraj",{x:0},{x:30,duration:${S.dur},ease:"none"},0);
      const mj=${J.rig("s04-jafar")}, sj=${J.rig("s04-siraj")};
      R.rest(tl,mj,0); R.rest(tl,sj,0);
      R.idle(tl,mj,0,${S.dur},{period:3.8}); R.blink(tl,mj,0,${S.dur},41);
      R.idle(tl,sj,0,${S.dur}); R.blink(tl,sj,0,${S.dur},42);
      R.talk(tl,mj,${V + P[0]},1.6,43);
      R.turnHead(tl,mj,${V + P[1] - 0.2},-12,0.5);
      R.frown(tl,mj,${V + P[2] - 0.1});
      R.turnHead(tl,mj,${V + P[2] + 0.2},8,0.4);
      R.pose(tl,mj,${V + P[2] + 0.2},{"armR-upper":-22,"armR-lower":-95},0.45);
      ${J.cardIn("s04-card", V + 0.2, S.dur - 0.55)}
    `,
  };
});

// S05a — split screen: Clive makes the offer, Mir Jafar listens
scene("s05a", {
  type: "Split screen", chars: "Robert Clive (walk, talk, point, gesture, blink); Mir Jafar (idle, blink, turn head, react)",
  motion: "Clive walks in; dashed arc carries the throne from his side to Mir Jafar's", text: "Name card ROBERT CLIVE; tag THE THRONE", sfx: "footsteps, whoosh on the arc",
}, (S) => {
  const V = S.lead, P = S.ph;
  return {
    html: `<div id="s05a-stage" class="stage">
      <div id="s05a-L" class="half" style="clip-path:polygon(0 0,1000px 0,920px 1080px,0 1080px)">
        <div id="s05a-Lw" class="world">${SET.battle.replace("<svg ", '<svg id="s05a-setL" ')}<div class="dusk"></div>
          ${prop("s05a-tent", "tent", { x: 980, bottom: 760, w: 620, z: 2 })}
          ${char("s05a-clive", "clive", { x: 640, feet: 1040, h: 760, z: 6 })}</div></div>
      <div id="s05a-R" class="half" style="clip-path:polygon(1000px 0,1920px 0,1920px 1080px,920px 1080px)">
        <div id="s05a-Rw" class="world">${SET.durbar.replace("<svg ", '<svg id="s05a-setR" ')}
          ${char("s05a-jafar", "mir-jafar", { x: 1840, feet: 1040, h: 760, flip: true, z: 6 })}</div></div>
      <svg class="full" viewBox="0 0 1920 1080" style="z-index:8"><path d="M1000,0 L920,1080" stroke="${PAL.ink}" stroke-width="12"/>
        <path id="s05a-arc" d="M560,250 Q960,40 1400,250" fill="none" stroke="${PAL.gold}" stroke-width="8" stroke-dasharray="22 16" stroke-linecap="round"/></svg>
      <div id="s05a-icon" class="throne-icon" style="z-index:9"><svg viewBox="-60 -50 120 80" width="150" height="100"><rect x="-50" y="-20" width="100" height="44" rx="18" fill="${PAL.gold}" stroke="${PAL.ink}" stroke-width="3"/><path d="M-40,-4 h80 M-40,10 h80" stroke="${PAL.companyRed}" stroke-width="5"/><path d="M-30,-20 l10,-24 l10,16 l10,-22 l10,22 l10,-16 l10,24z" fill="${PAL.gold}" stroke="${PAL.ink}" stroke-width="3"/></svg></div>
      ${trust("s05a-tag", "THE THRONE", "left:1220px;top:300px;background:#C9A24A;z-index:9")}
      ${nameCard("s05a-card", "1757", "ROBERT CLIVE", "Colonel, East India Company", "z-index:10")}</div>`,
    css: `#s05a-stage .half{position:absolute;inset:0;overflow:hidden} #s05a-Lw,#s05a-Rw{width:2400px;height:1080px}
      #s05a-Lw .dusk{position:absolute;left:0;top:0;width:2400px;height:1080px;background:rgba(190,110,60,.28);mix-blend-mode:multiply;z-index:1}
      .throne-icon{position:absolute;left:0;top:0;width:150px;height:100px}`,
    js: `
      ${J.fadeIn("s05a")}
      tl.fromTo("#s05a-Lw",{x:-300},{x:-380,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s05a-Rw",{x:-560},{x:-500,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s05a-setL .set-clouds",{x:0},{x:120,duration:${S.dur},ease:"none"},0);
      const cl=${J.rig("s05a-clive")}, mj=${J.rig("s05a-jafar")};
      R.rest(tl,cl,0); R.rest(tl,mj,0);
      tl.fromTo("#s05a-clive",{x:-520},{x:0,duration:2.3,ease:"power1.out"},0);
      R.walk(tl,cl,0,2.3,{step:0.38,amp:20});
      R.idle(tl,cl,2.4,${S.dur - 2.4}); R.blink(tl,cl,0,${S.dur},51);
      R.idle(tl,mj,0,${S.dur},{period:3.8}); R.blink(tl,mj,0,${S.dur},52);
      R.talk(tl,cl,${V + P[0]},1.9,53);
      R.point(tl,cl,${V + P[1]},"R",0.9);
      R.talk(tl,cl,${V + P[2]},${(P[3] - P[2] + 2.0).toFixed(2)},54);
      R.gesture(tl,cl,${V + P[2] + 0.1},"R",1.5);
      R.turnHead(tl,mj,${V + P[1]},-6);
      R.react(tl,mj,${V + P[3]},1.6);
      tl.fromTo("#s05a-arc",{attr:{"stroke-dashoffset":900},opacity:0},{attr:{"stroke-dashoffset":0},opacity:1,duration:1.6,ease:"none"},${V + P[3]});
      tl.fromTo("#s05a-icon",{x:485,y:190,opacity:0},{opacity:1,duration:0.2},${V + P[3]});
      tl.to("#s05a-icon",{keyframes:[{x:900,y:95,duration:0.8,ease:"sine.out"},{x:1325,y:195,duration:0.8,ease:"sine.in"}]},${V + P[3]});
      ${J.popIn("s05a-tag", V + P[3] + 1.4)}
      ${J.cardIn("s05a-card", V + 0.2, V + P[1] + 1.6)}
    `,
  };
});

// S05b — the deal card
scene("s05b", {
  type: "Stat / document card", chars: "—", motion: "Treaty slides in and writes itself; columns build; gold coins drop; seal stamps",
  text: "Chip: SECRET TREATY · JUNE 1757; MIR JAFAR GETS THE THRONE / THE COMPANY GETS A FORTUNE", sfx: "paper slide, pen scratch (paper), coins (bell partials), seal thud",
}, (S) => {
  const V = S.lead, P = S.ph;
  const coins = [...Array(12)].map((_, i) => `<div class="coin" style="left:${1360 + (i % 6) * 62 + (i > 5 ? 30 : 0)}px;top:${640 + (i > 5 ? -26 : 0)}px"></div>`).join("");
  return {
    html: `<div id="s05b-stage" class="stage" style="background:${PAL.paper}">
      ${chip("s05b-chip", "SECRET TREATY &middot; JUNE 1757")}
      ${prop("s05b-treaty", "treaty", { x: 960, bottom: 900, w: 460, z: 3 })}
      <div id="s05b-L" class="col" style="left:110px"><div class="h">MIR JAFAR GETS</div><div class="big">The throne</div></div>
      <div id="s05b-R" class="col" style="left:1340px"><div class="h">THE COMPANY GETS</div><div class="big" style="color:${PAL.companyRed}">A fortune</div></div>
      <div id="s05b-coins">${coins}</div>
    </div>`,
    css: `#s05b-stage .col{position:absolute;top:330px;width:480px}
      #s05b-stage .col .h{font:400 56px/1 "Bebas Neue",sans-serif;letter-spacing:4px;color:${PAL.ink}}
      #s05b-stage .col .big{font:700 96px/1 "CC Garamond",serif;color:${PAL.mughalGreen};margin-top:12px}
      #s05b-stage .coin{position:absolute;width:54px;height:54px;border-radius:50%;background:${PAL.gold};border:4px solid ${PAL.ink}}`,
    js: `
      ${J.fadeIn("s05b")}
      ${J.chipIn("s05b-chip", 0.2)}
      tl.fromTo("#s05b-treaty",{y:420,rotation:-8},{y:0,rotation:-2,duration:0.7,ease:"power3.out"},0.15);
      tl.to("#s05b-treaty",{rotation:1.5,duration:${S.dur - 0.9},ease:"sine.inOut"},0.85);
      document.querySelectorAll("#s05b-treaty-svg .prop-lines path").forEach((p,i)=>{ tl.fromTo(p,{attr:{"stroke-dasharray":"240 240","stroke-dashoffset":240}},{attr:{"stroke-dashoffset":0},duration:0.35,ease:"none"},0.7+i*0.28); });
      tl.fromTo("#s05b-L",{x:-60,opacity:0},{x:0,opacity:1,duration:0.5,ease:"power3.out"},${V + P[0]});
      tl.fromTo("#s05b-R",{x:60,opacity:0},{x:0,opacity:1,duration:0.5,ease:"power3.out"},${V + P[1]});
      tl.fromTo("#s05b-coins .coin",{y:-700,opacity:1},{y:0,duration:0.55,ease:"bounce.out",stagger:0.09},${V + P[1] + 1.5});
      tl.fromTo("#s05b-treaty-svg circle",{scale:2.2,opacity:0,transformOrigin:"50% 50%"},{scale:1,opacity:1,duration:0.25,ease:"power4.in"},${V + P[1] + 2.4});
      tl.fromTo("#s05b-stage",{x:0},{keyframes:[{x:-6,duration:0.04},{x:5,duration:0.05},{x:0,duration:0.06}]},${V + P[1] + 2.65});
    `,
  };
});

// S06 — the battle opens: cannon fire and smoke
const FIRES06 = [
  { g: "c1", side: "co", at: 1.75 }, { g: "n1", side: "na", at: 2.05 }, { g: "c2", side: "co", at: 2.35 }, { g: "c3", side: "co", at: 3.4 },
  { g: "n2", side: "na", at: 3.9 }, { g: "c1", side: "co", at: 4.7 }, { g: "n1", side: "na", at: 5.5 }, { g: "c2", side: "co", at: 6.1 },
];
const GUNS06 = { c1: { x: 520, y: 880, w: 230 }, c2: { x: 760, y: 900, w: 240 }, c3: { x: 1000, y: 880, w: 230 }, n1: { x: 1650, y: 860, w: 330 }, n2: { x: 2050, y: 870, w: 330 } };
scene("s06", {
  type: "Crowd / battle", chars: "Company army (30), Nawab's army (75), 3 Company guns, 2 Nawab gun platforms",
  motion: "Pan from the grove to the Nawab's line; guns recoil, flash and smoke; smoke drifts over the grove", text: "Chip: PLASSEY &middot; 8 AM", sfx: "cannon booms (8), musket crackle, battle drums",
}, (S) => {
  const V = S.lead;
  const co = army("s06-co", "company-soldier", [
    { n: 15, x0: 300, x1: 1100, feet: 770, h: 140 },
    { n: 15, x0: 280, x1: 1080, feet: 800, h: 150 },
  ], { vars: companyVars, seed: 21, z: 3 });
  const na = army("s06-na", "nawab-soldier", [
    { n: 26, x0: 1380, x1: 2390, feet: 730, h: 116 },
    { n: 25, x0: 1400, x1: 2390, feet: 755, h: 128 },
    { n: 24, x0: 1420, x1: 2390, feet: 780, h: 140 },
  ], { vars: nawabVars, seed: 22, z: 3 });
  const guns = Object.entries(GUNS06).map(([k, g]) => prop(`s06-${k}`, k[0] === "c" ? "cannon-company" : "gun-platform-nawab", { x: g.x, bottom: g.y, w: g.w, flip: k[0] === "n", z: 5 })).join("");
  const smoke = FIRES06.map((f, i) => {
    const g = GUNS06[f.g];
    const mx = f.side === "co" ? g.x + g.w * 0.42 : g.x - g.w * 0.42;
    const my = g.y - (f.side === "co" ? g.w * 0.28 : g.w * 0.33);
    return `<div id="s06-f${i}" class="flash" style="left:${mx - 40}px;top:${my - 40}px"></div>` +
      [0, 1, 2].map((k) => `<div id="s06-p${i}-${k}" class="puff" style="left:${mx - 60 + k * (f.side === "co" ? 30 : -30)}px;top:${my - 60 - k * 12}px"></div>`).join("");
  }).join("");
  return {
    html: `<div id="s06-stage" class="stage"><div id="s06-cam" class="cam"><div id="s06-world" class="world">${SET.battle.replace("<svg ", '<svg id="s06-set" ')}${co.html}${na.html}${guns}<div class="smokes">${smoke}</div></div></div>
      ${chip("s06-chip", "PLASSEY &middot; 8 AM")}</div>`,
    css: `#s06-world{width:2400px;height:1080px} #s06-world .smokes{position:absolute;left:0;top:0;width:2400px;height:1080px;z-index:7}
      #s06-world .puff{position:absolute;width:120px;height:120px;border-radius:50%;background:#EFE9DA;opacity:0}
      #s06-world .flash{position:absolute;width:80px;height:80px;border-radius:50%;background:#FFE08A;opacity:0}`,
    js: `
      ${J.fadeIn("s06")}
      tl.fromTo("#s06-world",{x:-120},{x:-480,duration:${S.dur},ease:"sine.inOut"},0);
      tl.fromTo("#s06-cam",{scale:1.12},{scale:1.0,duration:${S.dur},ease:"sine.out"},0);
      tl.fromTo("#s06-set .set-clouds",{x:0},{x:260,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s06-set .set-far",{x:0},{x:150,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s06-set .set-fg",{x:0},{x:-200,duration:${S.dur},ease:"none"},0);
      R.crowd(tl, Array.from(document.querySelectorAll(".s06-co-u")), 0, ${S.dur}, {seed:5,period:1.2,bob:3,sway:2});
      R.crowd(tl, Array.from(document.querySelectorAll(".s06-na-u")), 0, ${S.dur}, {seed:6,period:1.1,bob:3,sway:2});
      ${FIRES06.map((f, i) => {
        const at = (V + f.at).toFixed(2);
        const dir = f.side === "co" ? 1 : -1;
        return `tl.fromTo("#s06-${f.g}-svg .prop-barrel",{x:0},{x:${-16 * dir},duration:0.06,ease:"power4.out",immediateRender:false},${at});
        tl.to("#s06-${f.g}-svg .prop-barrel",{x:0,duration:0.5,ease:"power2.out"},${at}+0.06);
        tl.fromTo("#s06-f${i}",{scale:0.3,opacity:1},{scale:1.6,opacity:0,duration:0.22,ease:"power2.out"},${at});
        ${[0, 1, 2].map((k) => `tl.fromTo("#s06-p${i}-${k}",{scale:0.3,opacity:0.95,x:0,y:0},{scale:${2.2 + k * 0.6},opacity:0,x:${dir * (90 + k * 60)},y:${-40 - k * 30},duration:${3.0 + k * 0.5},ease:"power1.out"},${at}+${k * 0.05});`).join("")}`;
      }).join("\n")}
      ${J.chipIn("s06-chip", V + 0.05)}
    `,
  };
});

// S07 — the storm: tarpaulins vs soaked powder
scene("s07", {
  type: "Character scene (close-up, split)", chars: "Company soldier (pose, idle, blink, talk); Nawab's soldier (idle, blink, react, gesture)",
  motion: "Lightning, falling rain; tarpaulin pulled over the kegs; puddle grows; the Nawab's gun gives a weak puff", text: "Chips: POWDER KEPT DRY / POWDER SOAKED", sfx: "thunder, rain, cloth swish, weak fizz",
}, (S) => {
  const V = S.lead, P = S.ph;
  const rr = rnd(77);
  const drops = [];
  for (let k = 0; k < 220; k++) {
    const x = rr() * 2000 - 40, y = rr() * 240;
    for (let rep = 0; rep < 6; rep++) drops.push(`M${x.toFixed(0)},${(y + rep * 240 - 240).toFixed(0)} l-10,46`);
  }
  return {
    html: `<div id="s07-stage" class="stage"><div id="s07-cam" class="cam"><div id="s07-world" class="world">${SET.battle.replace("<svg ", '<svg id="s07-set" ')}</div>
      <div class="storm"></div>
      ${prop("s07-k1", "powder-keg", { x: 640, bottom: 1000, w: 150, z: 4 })}${prop("s07-k2", "powder-keg", { x: 790, bottom: 1000, w: 150, z: 4 })}${prop("s07-k3", "powder-keg", { x: 715, bottom: 900, w: 130, z: 3 })}
      ${prop("s07-tarp", "tarpaulin", { x: 715, bottom: 1010, w: 420, z: 6 })}
      ${char("s07-cs", "company-soldier", { x: 360, feet: 1040, h: 640, z: 5, style: "--skin:#A56F45;--hatA:0;--hatB:1" })}
      ${prop("s07-gun", "gun-platform-nawab", { x: 1660, bottom: 890, w: 420, flip: true, z: 3 })}
      ${prop("s07-k4", "powder-keg", { x: 1300, bottom: 1010, w: 150, z: 4 })}${prop("s07-k5", "powder-keg", { x: 1450, bottom: 1010, w: 150, z: 4 })}
      <div id="s07-puddle" class="puddle"></div>
      <div id="s07-fizz" class="fizz"></div>
      ${char("s07-ns", "nawab-soldier", { x: 1700, feet: 1050, h: 600, z: 5, style: "--skin:#7E5233;--turban:#D9822B" })}
      <svg id="s07-rain" class="full" viewBox="0 0 1920 1080" style="z-index:8;overflow:visible"><path d="${drops.join(" ")}" stroke="#DDE6E6" stroke-width="3" opacity="0.55" stroke-linecap="round"/></svg>
      <div id="s07-flash" class="full" style="background:#fff;opacity:0;z-index:9"></div>
      </div>
      ${chip("s07-dry", "POWDER KEPT DRY", "left:260px;top:120px;background:#4F7A3A")}
      ${chip("s07-wet", "POWDER SOAKED", "left:1140px;top:120px;background:#3F5F7A")}</div>`,
    css: `#s07-world{width:2400px;height:1080px;transform-origin:0 0} #s07-stage .storm{position:absolute;inset:0;background:rgba(36,48,58,.48);z-index:2}
      #s07-stage .puddle{position:absolute;left:1220px;top:990px;width:360px;height:44px;border-radius:50%;background:#6F8E96;opacity:0;z-index:3}
      #s07-stage .fizz{position:absolute;left:1350px;top:560px;width:70px;height:70px;border-radius:50%;background:#9AA0A0;opacity:0;z-index:4}`,
    js: `
      ${J.fadeIn("s07")}
      tl.fromTo("#s07-world",{x:-300,y:-120,scale:1.25},{x:-360,y:-120,scale:1.25,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s07-cam",{scale:1.0},{scale:1.06,duration:${S.dur},ease:"sine.inOut"},0);
      tl.fromTo("#s07-rain",{y:-240},{y:0,duration:0.32,ease:"none",repeat:${Math.ceil(S.dur / 0.32)}},0);
      tl.fromTo("#s07-flash",{opacity:0},{keyframes:[{opacity:0.75,duration:0.05},{opacity:0.1,duration:0.12},{opacity:0.5,duration:0.05},{opacity:0,duration:0.35}]},${V + 0.25});
      const cs=${J.rig("s07-cs")}, ns=${J.rig("s07-ns")};
      R.rest(tl,cs,0); R.rest(tl,ns,0);
      R.idle(tl,cs,0,${S.dur}); R.blink(tl,cs,0,${S.dur},71);
      R.idle(tl,ns,0,${S.dur},{period:3.0}); R.blink(tl,ns,0,${S.dur},72);
      R.react(tl,cs,${V + 0.3},0.8); R.react(tl,ns,${V + 0.3},0.8);
      R.pose(tl,cs,${V + P[1] - 0.2},{"armR-upper":-62,"armR-lower":-30,"armL-upper":-40,"armL-lower":-40},0.4);
      tl.fromTo("#s07-tarp",{x:-980,y:-560,rotation:-18,opacity:1},{x:0,y:0,rotation:0,duration:1.1,ease:"power2.out"},${V + P[1]});
      R.pose(tl,cs,${V + P[1] + 1.3},{"armR-upper":0,"armR-lower":0,"armL-upper":0,"armL-lower":0},0.5);
      R.talk(tl,cs,${V + P[1] + 1.5},1.0,73);
      ${J.chipIn("s07-dry", V + P[1] + 1.0)}
      tl.fromTo("#s07-puddle",{scaleX:0.2,opacity:0},{scaleX:1,opacity:0.85,duration:1.6,ease:"power2.out"},${V + P[2] - 0.3});
      ${J.chipIn("s07-wet", V + P[2])}
      R.gesture(tl,ns,${V + P[2] + 0.2},"L",1.6);
      R.turnHead(tl,ns,${V + P[3] - 0.3},10);
      tl.fromTo("#s07-fizz",{scale:0.2,opacity:0.8},{scale:1.1,opacity:0,y:-40,duration:1.2,ease:"power1.out"},${V + P[3] + 0.2});
      tl.fromTo("#s07-gun-svg .prop-barrel",{rotation:0,svgOrigin:"10 -110"},{rotation:5,svgOrigin:"10 -110",duration:1.2,ease:"sine.inOut"},${V + P[3]});
      R.react(tl,ns,${V + P[3] + 0.5},1.2);
    `,
  };
});

// S08 — Mir Jafar's division stands still; BETRAYED stamp
scene("s08", {
  type: "Crowd + stamp moment", chars: "Mir Jafar (idle, blink, turn head, arms folded); his division (40, deliberately still); Nawab's army (54); Company line (24)",
  motion: "Push toward the still division while the rest of the field moves; outline draws; stamp drops with camera shake", text: "Label MIR JAFAR'S DIVISION; stamp BETRAYED", sfx: "drums thin out, stamp thud",
}, (S) => {
  const V = S.lead, P = S.ph;
  const co = army("s08-co", "company-soldier", [
    { n: 12, x0: 260, x1: 900, feet: 760, h: 132 },
    { n: 12, x0: 240, x1: 880, feet: 790, h: 142 },
  ], { vars: companyVars, seed: 31, z: 3 });
  const na = army("s08-na", "nawab-soldier", [
    { n: 28, x0: 1700, x1: 2390, feet: 720, h: 110 },
    { n: 26, x0: 1720, x1: 2390, feet: 744, h: 120 },
  ], { vars: nawabVars, seed: 32, z: 3 });
  const mj = army("s08-mj", "nawab-soldier", [
    { n: 14, x0: 1060, x1: 1620, feet: 760, h: 128, jitter: 4 },
    { n: 13, x0: 1050, x1: 1630, feet: 792, h: 140, jitter: 4 },
    { n: 13, x0: 1040, x1: 1640, feet: 826, h: 152, jitter: 4 },
  ], { vars: jafarVars, seed: 33, z: 4 });
  return {
    html: `<div id="s08-stage" class="stage"><div id="s08-cam" class="cam"><div id="s08-world" class="world">${SET.battle.replace("<svg ", '<svg id="s08-set" ')}${co.html}${na.html}${mj.html}
      <svg class="full2400" viewBox="0 0 2400 1080" style="z-index:5"><rect id="s08-box" x="1010" y="560" width="660" height="290" rx="10" fill="none" stroke="${PAL.gold}" stroke-width="7" stroke-dasharray="26 14"/></svg>
      ${char("s08-jafar", "mir-jafar", { x: 1440, feet: 990, h: 400, z: 6 })}
      <div class="smokes">${[0, 1, 2, 3].map((k) => `<div class="puff" id="s08-s${k}" style="left:${300 + k * 170}px;top:${560 - k * 20}px"></div>`).join("")}</div>
      </div></div>
      ${chip("s08-lbl", "MIR JAFAR'S DIVISION", "left:640px;top:170px")}
      <div id="s08-stamp" class="cc-stamp" style="left:110px;top:830px;z-index:20">BETRAYED</div></div>`,
    css: `#s08-world{width:2400px;height:1080px} #s08-world .full2400{position:absolute;left:0;top:0;width:2400px;height:1080px}
      #s08-world .smokes{position:absolute;left:0;top:0;width:2400px;height:1080px;z-index:5}
      #s08-world .puff{position:absolute;width:200px;height:200px;border-radius:50%;background:#EFE9DA;opacity:.6}`,
    js: `
      ${J.fadeIn("s08")}
      tl.fromTo("#s08-world",{x:-260},{x:-330,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s08-cam",{scale:1.0},{scale:1.1,duration:${S.dur},ease:"sine.inOut",transformOrigin:"58% 62%"},0);
      tl.fromTo("#s08-set .set-clouds",{x:0},{x:160,duration:${S.dur},ease:"none"},0);
      ${[0, 1, 2, 3].map((k) => `tl.fromTo("#s08-s${k}",{x:0,scale:1,opacity:0.55},{x:${180 + k * 40},scale:1.6,opacity:0.15,duration:${S.dur},ease:"none"},0);`).join("")}
      R.crowd(tl, Array.from(document.querySelectorAll(".s08-co-u")), 0, ${S.dur}, {seed:7,period:0.7,bob:5,sway:3});
      tl.fromTo("#s08-co",{x:-40},{x:120,duration:${S.dur},ease:"none"},0);
      R.crowd(tl, Array.from(document.querySelectorAll(".s08-na-u")), 0, ${S.dur}, {seed:8,period:0.8,bob:4,sway:3});
      tl.fromTo("#s08-na",{x:0},{x:140,duration:${S.dur},ease:"sine.in"},0);
      const mj=${J.rig("s08-jafar")};
      R.rest(tl,mj,0);
      R.pose(tl,mj,0,{"armL-upper":-38,"armL-lower":-112,"armR-upper":38,"armR-lower":112},0.01);
      R.idle(tl,mj,0,${S.dur},{period:4.2,amp:0.012}); R.blink(tl,mj,0,${S.dur},81);
      R.turnHead(tl,mj,${V + P[1]},-10,0.6);
      R.frown(tl,mj,${V + P[1] + 0.5});
      tl.fromTo("#s08-box",{attr:{"stroke-dashoffset":1900},opacity:1},{attr:{"stroke-dashoffset":0},duration:1.4,ease:"power1.inOut"},${V + 0.5});
      ${J.chipIn("s08-lbl", V + 1.0)}
      tl.fromTo("#s08-stamp",{scale:2.4,rotation:-14,opacity:0},{scale:1,rotation:-6,opacity:1,duration:0.22,ease:"power4.in"},${V + P[2] + 0.75});
      tl.fromTo("#s08-cam",{x:0,y:0},{keyframes:[{x:-14,y:8,duration:0.04},{x:12,y:-6,duration:0.05},{x:-6,y:3,duration:0.05},{x:0,y:0,duration:0.08}],immediateRender:false},${V + P[2] + 0.97});
    `,
  };
});

// S09 — Siraj flees; the count of the dead
scene("s09", {
  type: "Character scene + stat card", chars: "Siraj ud-Daulah on a camel (camel walk cycle, Siraj idle, blink, turn head, react)",
  motion: "Background streams past (parallax); dust kicks up; Company flag rises; stat card counts up", text: "Stat: COMPANY DEAD AT PLASSEY 22; 'Some records: 27'; trust tag SOURCES DIFFER · SEE SOURCES", sfx: "camel steps, wind, paper slide, tick",
}, (S) => {
  const V = S.lead, P = S.ph;
  const camelW = 760;
  return {
    html: `<div id="s09-stage" class="stage"><div id="s09-cam" class="cam"><div id="s09-world" class="world">${SET.battle.replace("<svg ", '<svg id="s09-set" ')}
      <div id="s09-flag" class="flag"><svg viewBox="0 0 120 260" width="120" height="260"><path d="M10,260 V10" stroke="${PAL.ink}" stroke-width="7"/><path id="s09-cloth" d="M14,14 h96 l-18,30 l18,30 h-96z" fill="${PAL.companyRed}" stroke="${PAL.ink}" stroke-width="3"/></svg></div>
      </div></div>
      <div id="s09-rider" class="rider">
        ${char("s09-siraj", "siraj", { x: 380, feet: 302, h: 400, z: 3, cls: "noLegs" })}
        ${prop("s09-camel", "camel", { x: 380, bottom: 600, w: camelW, z: 4 })}
        ${[0, 1, 2, 3, 4].map((k) => `<div class="dust" id="s09-d${k}" style="left:${80 + k * 30}px;top:${560 - k * 6}px"></div>`).join("")}
      </div>
      <div id="s09-stat" class="cc-stat" style="left:1150px;top:250px;width:640px"><div class="cc-label">COMPANY DEAD AT PLASSEY</div><div class="cc-big" id="s09-num">0</div><div class="cc-sub" id="s09-sub">Some records: <b>27</b></div></div>
      ${trust("s09-trust", "SOURCES DIFFER &middot; SEE SOURCES", "left:1150px;top:770px")}</div>`,
    css: `#s09-world{width:2400px;height:1080px} #s09-stage .rider{position:absolute;left:120px;top:400px;width:760px;height:620px;z-index:5}
      #s09-stage .noLegs .rig-legL,#s09-stage .noLegs .rig-legR,#s09-stage .noLegs .rig-shadow{opacity:0}
      #s09-stage .dust{position:absolute;width:90px;height:90px;border-radius:50%;background:#D9C99A;opacity:0}
      #s09-world .flag{position:absolute;left:1560px;top:410px;width:120px;height:260px;z-index:2}`,
    js: `
      ${J.fadeIn("s09")}
      tl.fromTo("#s09-world",{x:0},{x:-640,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s09-set .set-far",{x:0},{x:420,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s09-set .set-mid",{x:0},{x:200,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s09-set .set-fg",{x:0},{x:-900,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s09-set .set-clouds",{x:0},{x:520,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s09-rider",{x:-120},{x:60,duration:${S.dur},ease:"none"},0);
      const step=0.34, n=Math.floor(${S.dur}/step);
      const legs=[["camel-legF1",1],["camel-legB1",-1],["camel-legF2",-1],["camel-legB2",1]];
      for(let i=0;i<n;i++){ const s=i%2?1:-1; legs.forEach(([c,d])=>{ const el=document.querySelector("#s09-camel-svg ."+c); tl.to(el,{rotation:18*s*d,svgOrigin:el.getAttribute("data-pivot"),duration:step,ease:"sine.inOut"},i*step); }); }
      tl.fromTo("#s09-rider .cw:not(#s09-siraj)",{y:0},{y:-8,duration:step,ease:"sine.inOut",yoyo:true,repeat:n-1},0);
      tl.fromTo("#s09-siraj",{y:0,rotation:0},{y:-12,rotation:-2,duration:step,ease:"sine.inOut",yoyo:true,repeat:n-1},0.06);
      const nk=document.querySelector("#s09-camel-svg .camel-neck"); tl.fromTo(nk,{rotation:-3,svgOrigin:nk.getAttribute("data-pivot")},{rotation:4,svgOrigin:nk.getAttribute("data-pivot"),duration:step*2,ease:"sine.inOut",yoyo:true,repeat:Math.floor(n/2)},0);
      ${[0, 1, 2, 3, 4].map((k) => `tl.fromTo("#s09-d${k}",{scale:0.3,opacity:0.8,x:0},{scale:1.8,opacity:0,x:-140,duration:1.0,ease:"power1.out",repeat:${Math.floor(S.dur / 1.0) - 1}},${(k * 0.2).toFixed(2)});`).join("")}
      const sj=${J.rig("s09-siraj")};
      R.rest(tl,sj,0); R.blink(tl,sj,0,${S.dur},91);
      R.pose(tl,sj,0,{"armL-upper":-50,"armL-lower":-40,"armR-upper":50,"armR-lower":40},0.01);
      R.talk(tl,sj,${V + P[0]},1.4,92);
      R.turnHead(tl,sj,${V + P[0] + 0.6},-14,0.35);
      R.react(tl,sj,${V + P[0] + 0.7},1.4);
      R.turnHead(tl,sj,${V + P[1] + 0.8},6,0.4);
      tl.fromTo("#s09-flag",{y:280},{y:0,duration:0.9,ease:"power3.out"},${V + P[1]});
      tl.fromTo("#s09-cloth",{scaleX:0.85,transformOrigin:"0% 50%"},{scaleX:1.05,transformOrigin:"0% 50%",duration:0.4,ease:"sine.inOut",yoyo:true,repeat:${Math.floor((S.dur - 2) / 0.4)}},${V + P[1] + 0.6});
      tl.fromTo("#s09-stat",{y:40,opacity:0},{y:0,opacity:1,duration:0.45,ease:"power3.out"},${V + P[2]});
      tl.set("#s09-num",{textContent:"?"},${V + P[2]});
      ${[...Array(12)].map((_, k) => `tl.set("#s09-num",{textContent:"${Math.round((22 * (k + 1)) / 12)}"},${(V + P[3] + k * 0.045).toFixed(2)});`).join("")}
      tl.fromTo("#s09-sub",{opacity:0},{opacity:1,duration:0.35},${V + P[4] + 0.2});
      ${J.popIn("s09-trust", V + P[4] + 0.3)}
      tl.fromTo("#s09-stat",{rotation:0},{rotation:-1.2,duration:${S.dur - V - P[2]},ease:"sine.inOut",immediateRender:false},${V + P[2] + 0.45});
    `,
  };
});

// S10 — the map turns Company red
scene("s10", {
  type: "Map", chars: "—", motion: "Slow zoom on Bengal; pins drop; red spreads from Calcutta; year counter 1757 to 1765", text: "BENGAL & BIHAR; pins Plassey, Murshidabad, Calcutta; 1757 to 1765; THE COMPANY COLLECTS BENGAL'S TAXES (DIWANI); MAP SIMPLIFIED", sfx: "pin ticks, low swell, page turn",
}, (S) => {
  const V = S.lead, P = S.ph;
  const regionD = MAP.match(/class="map-region" d="([^"]+)"/)[1];
  let map = MAP.replace("<svg ", '<svg id="s10-map" ');
  map = map.replace(/(<path class="map-region"[^>]*\/>)/, `$1<defs><clipPath id="s10-clip"><circle id="s10-clipc" cx="${MAPJ.cities.calcutta.x}" cy="${MAPJ.cities.calcutta.y}" r="0"/></clipPath></defs><path id="s10-red" d="${regionD}" fill="${PAL.companyRed}" opacity="0.85" clip-path="url(#s10-clip)"/>`);
  const C = MAPJ.cities;
  const pin = (k, label, dx, dy) => `<div id="s10-pin-${k}" class="pin" style="left:${C[k].x - 13}px;top:${C[k].y - 13}px"></div><div id="s10-lab-${k}" class="plab" style="left:${C[k].x + dx}px;top:${C[k].y + dy}px">${label}</div>`;
  return {
    html: `<div id="s10-stage" class="stage" style="background:${PAL.sea}"><div id="s10-cam" class="cam"><div id="s10-world" class="world" style="width:1920px">${map}
      <div id="s10-reg" class="rlab" style="left:${MAPJ.regionLabel[0] - 200}px;top:${MAPJ.regionLabel[1] - 30}px">BENGAL &amp; BIHAR</div>
      ${pin("murshidabad", "Murshidabad", 24, -52)}${pin("plassey", "Plassey 1757", 24, -6)}${pin("calcutta", "Calcutta", 26, -24)}
      </div></div>
      <div id="s10-year" class="cc-stat" style="left:1330px;top:90px;padding:14px 34px 18px"><div class="cc-big" id="s10-yr" style="font-size:150px">1757</div></div>
      <div id="s10-diwani" class="cc-stat" style="left:1250px;top:380px;width:600px"><div class="cc-label">1765: THE COMPANY COLLECTS BENGAL'S TAXES</div><div class="cc-sub">The <i>diwani</i>: the right to raise revenue</div></div>
      <div id="s10-ms" class="cc-mapsimplified">MAP SIMPLIFIED</div></div>`,
    css: `#s10-world{height:1080px} #s10-stage .pin{position:absolute;width:26px;height:26px;border-radius:50%;background:${PAL.ink};border:4px solid ${PAL.paper};z-index:3}
      #s10-stage .plab{position:absolute;font:700 38px/1 "CC Inter",sans-serif;color:${PAL.ink};white-space:nowrap;z-index:3;text-shadow:0 0 6px ${PAL.paper},0 0 12px ${PAL.paper}}
      #s10-stage .rlab{position:absolute;width:400px;text-align:center;font:400 64px/1 "Bebas Neue",sans-serif;letter-spacing:6px;color:${PAL.ink};opacity:.85}`,
    js: `
      ${J.fadeIn("s10")}
      tl.fromTo("#s10-cam",{scale:1.0},{scale:1.14,duration:${S.dur},ease:"sine.inOut",transformOrigin:"${((C.plassey.x / 1920) * 100).toFixed(1)}% ${((C.plassey.y / 1080) * 100).toFixed(1)}%"},0);
      tl.fromTo("#s10-world",{x:30},{x:-20,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s10-map .map-river-ganges",{attr:{"stroke-dasharray":"2600 2600","stroke-dashoffset":2600}},{attr:{"stroke-dashoffset":0},duration:2.2,ease:"power1.inOut"},0.1);
      tl.fromTo("#s10-map .map-river-hooghly",{attr:{"stroke-dasharray":"900 900","stroke-dashoffset":900}},{attr:{"stroke-dashoffset":0},duration:1.6,ease:"power1.inOut"},0.5);
      tl.fromTo("#s10-reg",{opacity:0,scaleX:1.3},{opacity:0.85,scaleX:1,duration:0.8},0.3);
      ${["murshidabad", "plassey", "calcutta"].map((k, i) => `tl.fromTo("#s10-pin-${k}",{y:-60,opacity:0},{y:0,opacity:1,duration:0.35,ease:"bounce.out"},${(V + 0.1 + i * 0.35).toFixed(2)});tl.fromTo("#s10-lab-${k}",{opacity:0,x:-10},{opacity:1,x:0,duration:0.3},${(V + 0.25 + i * 0.35).toFixed(2)});`).join("")}
      tl.fromTo("#s10-pin-plassey",{scale:1},{scale:1.35,duration:0.5,ease:"sine.inOut",yoyo:true,repeat:5},${V + 1.2});
      tl.fromTo("#s10-clipc",{attr:{r:0}},{attr:{r:1500},duration:2.6,ease:"power2.in"},${V + P[1] + 0.2});
      tl.fromTo("#s10-year",{y:-30,opacity:0},{y:0,opacity:1,duration:0.4},${V + P[1]});
      ${[...Array(8)].map((_, k) => `tl.set("#s10-yr",{textContent:"${1758 + k}"},${(V + P[2] + 0.1 + k * 0.13).toFixed(2)});`).join("")}
      tl.fromTo("#s10-year",{scale:1},{scale:1.08,duration:0.2,yoyo:true,repeat:1},${(V + P[2] + 1.05).toFixed(2)});
      tl.fromTo("#s10-diwani",{y:30,opacity:0},{y:0,opacity:1,duration:0.45,ease:"power3.out"},${V + P[3]});
      tl.fromTo("#s10-ms",{opacity:0},{opacity:1,duration:0.3},0.2);
    `,
  };
});

// S11 — closing question and end card
scene("s11", {
  type: "Title card (question) + end card", chars: "Mir Jafar (idle, blink, turn head); Company and Nawab's soldiers (8 + 8)",
  motion: "Two panels light up in turn; ink end card rises; brand tracks in", text: "WHO REALLY WON AT PLASSEY?; THE MEN WHO FOUGHT / THE MAN WHO STOOD STILL; TELL US IN THE COMMENTS; CLEARCUT HISTORY", sfx: "page turn, final low chord",
}, (S) => {
  const V = S.lead, P = S.ph;
  const fA = army("s11-a", "company-soldier", [{ n: 6, x0: 120, x1: 470, feet: 880, h: 220 }], { w: 1920, vars: companyVars, seed: 41, z: 2 });
  const fB = army("s11-b", "nawab-soldier", [{ n: 6, x0: 500, x1: 860, feet: 880, h: 220 }], { w: 1920, vars: nawabVars, seed: 42, z: 2 });
  return {
    html: `<div id="s11-stage" class="stage" style="background:${PAL.paper}">
      <div id="s11-q" data-layout-allow-occlusion class="cc-title" style="left:0;right:0;top:70px;font-size:96px">Who really won at Plassey?</div>
      <div id="s11-pA" class="panel" style="left:80px"></div><div id="s11-pB" class="panel" style="left:1000px"></div>
      ${fA.html}${fB.html}
      ${char("s11-jafar", "mir-jafar", { x: 1460, feet: 900, h: 560, z: 3 })}
      <div id="s11-lA" data-layout-allow-occlusion class="plab2" style="left:80px">THE MEN WHO FOUGHT</div><div id="s11-lB" data-layout-allow-occlusion class="plab2" style="left:1000px">THE MAN WHO STOOD STILL</div>
      <div id="s11-end" class="cc-endcard" style="z-index:20"><div class="cc-q" id="s11-eq">Tell us in the comments.</div><div class="cc-cta" id="s11-src">Sources are listed in the description</div><div class="cc-brand" id="s11-brand">CLEARCUT HISTORY</div>
        <svg class="full" viewBox="0 0 1920 1080"><path id="s11-ul" d="M560,440 H1360" stroke="${PAL.companyRed}" stroke-width="8"/></svg></div>
    </div>`,
    css: `#s11-stage .panel{position:absolute;top:220px;width:840px;height:720px;border:4px solid ${PAL.ink};background:#E2D2AE}
      #s11-stage .plab2{position:absolute;top:950px;width:840px;text-align:center;font:400 56px/1 "Bebas Neue",sans-serif;letter-spacing:5px;color:${PAL.ink}}
      #s11-stage .army{position:absolute;left:0;top:0}`,
    js: `
      ${J.fadeIn("s11")}
      tl.fromTo("#s11-q",{y:-30,opacity:0},{y:0,opacity:1,duration:0.5,ease:"power3.out"},${V + P[0]});
      R.crowd(tl, Array.from(document.querySelectorAll(".s11-a-u,.s11-b-u")), 0, ${S.dur}, {seed:9,period:0.8,bob:5,sway:3});
      const mj=${J.rig("s11-jafar")};
      R.rest(tl,mj,0);
      R.pose(tl,mj,0,{"armL-upper":-38,"armL-lower":-112,"armR-upper":38,"armR-lower":112},0.01);
      R.idle(tl,mj,0,${S.dur},{period:4.0}); R.blink(tl,mj,0,${S.dur},111);
      tl.fromTo(["#s11-pA","#s11-lA"],{opacity:0.45},{opacity:1,duration:0.3},${V + P[1]});
      tl.fromTo(["#s11-pB","#s11-lB"],{opacity:0.45},{opacity:1,duration:0.3},${V + P[2]});
      tl.fromTo("#s11-a",{x:-30},{x:20,duration:${S.dur},ease:"none"},0);
      tl.fromTo("#s11-b",{x:30},{x:-20,duration:${S.dur},ease:"none"},0);
      R.turnHead(tl,mj,${V + P[2]},8,0.4); R.react(tl,mj,${V + P[2] + 0.3},1.0);
      tl.fromTo("#s11-end",{yPercent:100},{yPercent:0,duration:0.55,ease:"power3.inOut"},${V + P[3] - 0.15});
      tl.fromTo("#s11-eq",{opacity:0,y:20},{opacity:1,y:0,duration:0.5},${V + P[3] + 0.3});
      tl.fromTo("#s11-ul",{attr:{"stroke-dasharray":"800 800","stroke-dashoffset":800}},{attr:{"stroke-dashoffset":0},duration:1.6,ease:"power2.inOut"},${V + P[3] + 0.6});
      tl.fromTo("#s11-brand",{scaleX:1.3,opacity:0},{scaleX:1,opacity:1,duration:2.4,ease:"power2.out"},${V + P[3] + 0.5});
      tl.fromTo("#s11-src",{opacity:0},{opacity:1,duration:0.5},${V + P[3] + 1.4});
      tl.fromTo("#s11-eq",{scale:1},{scale:1.04,duration:3,ease:"sine.inOut"},${V + P[3] + 0.8});
    `,
  };
});

/* ------------------------------------------------------------ write compositions */
const BASE_CSS = `
#root{position:absolute;inset:0;overflow:hidden;background:${PAL.paper}}
.stage,.cam{position:absolute;inset:0}
.world{position:absolute;left:0;top:0}
.world > svg.cc-set{position:absolute;left:0;top:0;width:2400px;height:1080px}
.world > svg.cc-map{position:absolute;left:0;top:0;width:1920px;height:1080px}
.cw{position:absolute}
.cw-in{position:absolute;inset:0}
.cw-in > svg{width:100%;height:100%;overflow:visible}
.army{position:absolute;left:0;top:0;overflow:visible}
.full{position:absolute;left:0;top:0;width:1920px;height:1080px}
`;
for (const sc of SCENES) {
  const S = SHOT[sc.id];
  const { html, css, js } = sc.build(S);
  const file = `<template>
<style>
${BASE_CSS}
${UI_CSS}
${css}
</style>
<div id="root" data-composition-id="${sc.id}" data-width="1920" data-height="1080" data-duration="${S.dur}" data-layout-allow-overflow data-layout-allow-overlap>
${html}
</div>
<script>
${RIG_JS}
(function(){
  const R = window.ClearCutRig;
  const tl = gsap.timeline({ paused: true });
  ${js}
  window.__timelines["${sc.id}"] = tl;
})();
</script>
</template>
`;
  fs.writeFileSync(path.join(EP, "compositions", `${sc.id}.html`), file);
}

// grade overlay: warm tint, paper, vignette, grain jittered at 15 fps by timeline sets
{
  const r = rnd(2024);
  const sets = [];
  for (let f = 0; f * (1 / 15) < TOTAL; f++) sets.push(`tl.set("#grade-grain",{x:${Math.floor(r() * 512) - 256},y:${Math.floor(r() * 512) - 256}},${(f / 15).toFixed(4)});`);
  fs.writeFileSync(path.join(EP, "compositions", "grade.html"), `<template>
<style>
#root{position:absolute;inset:0;overflow:hidden;pointer-events:none}
${UI_CSS}
</style>
<div id="root" data-composition-id="grade" data-width="1920" data-height="1080" data-duration="${TOTAL}" data-layout-ignore>
  <div class="cc-grade-paper"></div><div class="cc-grade-tint"></div><div id="grade-grain" class="cc-grade-grain"></div><div class="cc-grade-vignette"></div>
</div>
<script>
(function(){
  const tl = gsap.timeline({ paused: true });
  ${sets.join("\n  ")}
  window.__timelines["grade"] = tl;
})();
</script>
</template>
`);
}

/* ------------------------------------------------------------ index.html */
const hosts = SCENES.map((sc) => {
  const S = SHOT[sc.id];
  return `    <div id="${sc.id}" data-composition-id="${sc.id}" data-composition-src="compositions/${sc.id}.html" data-start="${S.start}" data-duration="${S.dur}" data-track-index="${(S.z % 2) + 1}" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:${S.z}"></div>`;
}).join("\n");
fs.writeFileSync(path.join(EP, "index.html"), `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><link rel="icon" href="data:,"><script src="assets/vendor/gsap.min.js"></script><title>The Deal at Plassey — ClearCut History pilot</title></head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1920" data-height="1080">
${hosts}
    <div id="grade" data-composition-id="grade" data-composition-src="compositions/grade.html" data-start="0" data-duration="${TOTAL}" data-track-index="3" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:50"></div>
    <audio id="mix" class="clip" src="assets/audio/mix.wav" data-start="0" data-duration="${TOTAL}" data-track-index="4" data-volume="1"></audio>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = gsap.timeline({ paused: true });
  </script>
</body>
</html>
`);

/* ------------------------------------------------------------ timeline + storyboard */
fs.writeFileSync(path.join(EP, "build/timeline.json"), JSON.stringify({ total: TOTAL, shots: SHOT }, null, 1));
const sb = [
  "# Storyboard — The Deal at Plassey (style pilot)",
  "",
  `Generated by \`build.mjs\` from the measured narration. Total ${TOTAL.toFixed(1)} s, ${SCENES.length} shots, 0.4 s crossfades.`,
  "",
  "| # | Narration | Start–end (s) | Shot type | Characters and poses | Motion | On-screen text | Sound |",
  "|---|---|---|---|---|---|---|---|",
  ...SCENES.map((sc, i) => {
    const S = SHOT[sc.id];
    return `| ${i + 1} (${sc.id}) | ${S.text} | ${S.start.toFixed(1)}–${(S.start + S.dur).toFixed(1)} (${S.dur.toFixed(1)}) | ${sc.meta.type} | ${sc.meta.chars} | ${sc.meta.motion} | ${sc.meta.text.replace(/&middot;/g, "·").replace(/&amp;/g, "&")} | ${sc.meta.sfx} |`;
  }),
  "",
];
fs.writeFileSync(path.join(EP, "storyboard.md"), sb.join("\n"));
console.log("built", SCENES.length, "scenes; total", TOTAL, "s");
for (const sc of SCENES) console.log(sc.id, SHOT[sc.id].start, SHOT[sc.id].dur);
