// ClearCut History — asset kit generator.
// Writes rigged character SVGs, layered set SVGs and props into assets/.
// Every file uses classes only (no ids), so it can be inlined many times in one page.
// Run: node tools/make-kit.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const P = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/palette.json"), "utf8"));
const out = (rel, s) => {
  const f = path.join(ROOT, "assets", rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, s.trim() + "\n");
  console.log("wrote assets/" + rel);
};

/* ------------------------------------------------------------------ */
/* Characters                                                          */
/* Body: about 3.5 heads tall. Feet at y=0, head centre (0,-262) r=44. */
/* Groups (class rig-*) carry data-pivot "x y" in SVG user units.      */
/* ------------------------------------------------------------------ */
const INK = P.ink;

function face({ fx = 0, skin, brow = INK, browW = 3.2, beard = "", moustache = "", cheeks = true }) {
  const ex = 15;
  return `
    <g class="rig-face" data-pivot="0 -262">
      ${cheeks ? `<ellipse cx="${-24 + fx}" cy="-246" rx="7" ry="4.5" fill="#D9715A" opacity="0.22"/>
      <ellipse cx="${24 + fx}" cy="-246" rx="7" ry="4.5" fill="#D9715A" opacity="0.22"/>` : ""}
      ${beard}
      <path d="M${fx - 2},-258 q4,8 -1,11" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      <g class="rig-eyes" data-pivot="0 -266">
        <circle cx="${-ex + fx}" cy="-266" r="4.6" fill="${INK}"/>
        <circle cx="${ex + fx}" cy="-266" r="4.6" fill="${INK}"/>
        <circle cx="${-ex + fx + 1.4}" cy="-267.6" r="1.3" fill="#fff" opacity="0.8"/>
        <circle cx="${ex + fx + 1.4}" cy="-267.6" r="1.3" fill="#fff" opacity="0.8"/>
      </g>
      <g class="rig-brows" data-pivot="0 -280">
        <path d="M${-ex - 8 + fx},-279 q8,-5 15,-1" fill="none" stroke="${brow}" stroke-width="${browW}" stroke-linecap="round"/>
        <path d="M${ex - 7 + fx},-280 q8,-4 15,1" fill="none" stroke="${brow}" stroke-width="${browW}" stroke-linecap="round"/>
      </g>
      ${moustache}
      <g class="rig-mouth" data-pivot="${fx} -240">
        <path class="m0" d="M${fx - 8},-240 q8,4 16,0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
        <path class="m1" d="M${fx - 7},-241 q7,-3 14,0 q-7,9 -14,0z" fill="#5A2A24" stroke="${INK}" stroke-width="1.5" opacity="0"/>
        <path class="m2" d="M${fx - 10},-242 q10,-4 20,0 q-10,14 -20,0z" fill="#5A2A24" stroke="${INK}" stroke-width="1.5" opacity="0"/>
      </g>
    </g>`;
}

function arm(side, { sleeve, cuff, skin, extraLower = "", extraUpper = "" }) {
  const s = side === "L" ? -1 : 1;
  const sx = 40 * s, ex = 46 * s, wx = 48 * s;
  return `
    <g class="rig-arm${side}-upper" data-pivot="${sx} -205">
      ${extraUpper}
      <path d="M${sx - 11},-210 L${sx + 11},-210 L${ex + 10},-156 L${ex - 10},-156 Z" fill="${sleeve}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
      <g class="rig-arm${side}-lower" data-pivot="${ex} -158">
        <path d="M${ex - 10},-162 L${ex + 10},-162 L${wx + 9},-120 L${wx - 9},-120 Z" fill="${sleeve}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
        <rect x="${wx - 10}" y="-124" width="20" height="8" rx="2" fill="${cuff}" stroke="${INK}" stroke-width="1.2"/>
        <circle class="rig-hand${side}" cx="${wx}" cy="-108" r="9" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>
        ${extraLower}
      </g>
    </g>`;
}

function legs({ trouser, shoe, skin, shoeH = 14, bare = false }) {
  const leg = (side, x) => `
    <g class="rig-leg${side}" data-pivot="${x} -118">
      <path d="M${x - 13},-122 L${x + 13},-122 L${x + 11},-${shoeH} L${x - 11},-${shoeH} Z" fill="${trouser}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
      ${bare ? `<path d="M${x - 9},-${shoeH} h18 v${shoeH - 6} h-18z" fill="${skin}" stroke="${INK}" stroke-width="1.2"/>` : ""}
      <path d="M${x - 13},-${shoeH} h${side === "L" ? 22 : 26} q4,${shoeH / 2} 0,${shoeH} h-${side === "L" ? 22 : 26} z" fill="${shoe}" stroke="${INK}" stroke-width="1.5" transform="translate(${side === "L" ? -4 : 0},0)"/>
    </g>`;
  return leg("L", -17) + leg("R", 17);
}

function headBase({ skin, hairBack = "", hat = "", hairFront = "", ears = true }) {
  return `
      <rect x="-11" y="-226" width="22" height="20" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>
      ${hairBack}
      ${ears ? `<ellipse cx="-43" cy="-260" rx="7" ry="10" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>
      <ellipse cx="43" cy="-260" rx="7" ry="10" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>` : ""}
      <circle cx="0" cy="-262" r="44" fill="${skin}" stroke="${INK}" stroke-width="2"/>
      ${hairFront}`;
}

function character({ name, skin, torso, legsSvg, armL, armR, headParts, faceOpts, behind = "", front = "", hat = "" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="cc-char cc-${name}" viewBox="-130 -350 260 360" data-character="${name}">
  <g class="rig-root" data-pivot="0 0">
    <ellipse class="rig-shadow" cx="0" cy="0" rx="62" ry="9" fill="${INK}" opacity="0.18"/>
    ${behind}
    ${legsSvg}
    ${armL}
    <g class="rig-torso" data-pivot="0 -112">${torso}</g>
    <g class="rig-head" data-pivot="0 -214">
      ${headParts}
      ${face(faceOpts)}
      ${hat}
    </g>
    ${armR}
    ${front}
  </g>
</svg>`;
}

// ---- Robert Clive: Company officer, red coat, buff facings, tricorne, powdered hair
function clive() {
  const skin = P.skin.light;
  const red = P.companyRed;
  const torso = `
    <path d="M-44,-210 L44,-210 L50,-112 L58,-64 L14,-64 L0,-118 L-14,-64 L-58,-64 L-50,-112 Z" fill="${red}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-16,-210 L16,-210 L14,-118 L-14,-118 Z" fill="${P.white}" stroke="${INK}" stroke-width="1.5"/>
    <path d="M-16,-210 L-26,-206 L-20,-120 L-14,-118 Z M16,-210 L26,-206 L20,-120 L14,-118 Z" fill="${P.gold}" stroke="${INK}" stroke-width="1.2"/>
    <g fill="${P.gold}"><circle cx="-6" cy="-190" r="2.2"/><circle cx="-6" cy="-172" r="2.2"/><circle cx="-6" cy="-154" r="2.2"/><circle cx="-6" cy="-136" r="2.2"/></g>
    <path d="M-40,-128 L40,-128" stroke="${P.gold}" stroke-width="5" opacity="0.9"/>
    <path d="M-12,-214 q12,10 24,0 l-4,12 q-8,5 -16,0z" fill="#fff" stroke="${INK}" stroke-width="1.2"/>
    <path d="M-44,-210 l-8,6 l10,4 z M44,-210 l8,6 l-10,4 z" fill="${P.gold}"/>`;
  const legsSvg = legs({ trouser: P.white, shoe: "#1E1A17", skin, shoeH: 52 });
  const sword = `<path d="M-52,-112 l-10,70" stroke="#7A6A55" stroke-width="5" stroke-linecap="round"/><path d="M-50,-118 l-6,8" stroke="${P.gold}" stroke-width="7" stroke-linecap="round"/>`;
  const headParts = headBase({
    skin,
    hairBack: `<path d="M-46,-258 q-10,26 4,40 q10,4 12,-10 z M46,-258 q10,26 -4,40 q-10,4 -12,-10 z" fill="#E8E2D6" stroke="${INK}" stroke-width="1.5"/>`,
    hairFront: `<path d="M-40,-280 q40,-26 80,0 q-38,-10 -80,0z" fill="#E8E2D6" stroke="${INK}" stroke-width="1.2"/>`,
  });
  const hat = `<g class="rig-hat"><path d="M-62,-288 q62,-26 124,0 q-14,-38 -62,-40 q-48,2 -62,40z" fill="#1E1A17" stroke="${INK}" stroke-width="2"/>
    <path d="M-62,-288 q62,-26 124,0" fill="none" stroke="${P.gold}" stroke-width="4"/>
    <circle cx="34" cy="-300" r="6" fill="${INK}" stroke="${P.gold}" stroke-width="2"/></g>`;
  return character({
    name: "clive", skin, torso, legsSvg,
    armL: arm("L", { sleeve: red, cuff: P.gold, skin }),
    armR: arm("R", { sleeve: red, cuff: P.gold, skin }),
    headParts, hat,
    faceOpts: { fx: 4, skin, browW: 4.2 },
    behind: sword,
  });
}

// ---- Siraj ud-Daulah: young Nawab, teal jama with gold, jewelled turban with plume
function siraj() {
  const skin = P.skin.medium;
  const teal = P.bengalTeal;
  const torso = `
    <path d="M-42,-210 L42,-210 L48,-118 L74,-30 L-74,-30 L-48,-118 Z" fill="${teal}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-48,-118 L48,-118 L74,-30 L-74,-30 Z" fill="#356E69" stroke="${INK}" stroke-width="1.5"/>
    <path d="M-60,-74 L60,-74" stroke="${P.gold}" stroke-width="3" opacity="0.8"/>
    <path d="M-68,-46 L68,-46" stroke="${P.gold}" stroke-width="3" opacity="0.8"/>
    <path d="M-48,-124 h96 v14 h-96z" fill="${P.gold}" stroke="${INK}" stroke-width="1.5"/>
    <path d="M14,-110 l8,40 l-14,0z" fill="${P.gold}" stroke="${INK}" stroke-width="1"/>
    <path d="M0,-210 L-30,-150 M0,-210 L22,-160" stroke="${P.gold}" stroke-width="3" fill="none"/>
    <path d="M-22,-212 q22,34 44,0" fill="none" stroke="#F2EEE4" stroke-width="5" stroke-dasharray="0.1 7" stroke-linecap="round"/>
    <path d="M-28,-208 q28,48 56,0" fill="none" stroke="#F2EEE4" stroke-width="5" stroke-dasharray="0.1 7" stroke-linecap="round"/>
    <circle cx="0" cy="-168" r="6" fill="#B8362E" stroke="${P.gold}" stroke-width="2"/>`;
  const legsSvg = legs({ trouser: "#F2EEE4", shoe: P.gold, skin, shoeH: 14 });
  const headParts = headBase({ skin });
  const hat = `<g class="rig-hat">
    <path d="M-48,-276 q0,-48 48,-52 q48,4 48,52 q-48,-10 -96,0z" fill="#F2E6C8" stroke="${INK}" stroke-width="2"/>
    <path d="M-46,-286 q46,-14 92,0 M-40,-302 q40,-12 80,0 M-28,-316 q28,-8 56,0" fill="none" stroke="${P.gold}" stroke-width="3"/>
    <path d="M10,-322 q18,-40 8,-58 q-4,24 -16,46z" fill="#FFFFFF" stroke="${INK}" stroke-width="1.5"/>
    <circle cx="8" cy="-306" r="8" fill="#B8362E" stroke="${P.gold}" stroke-width="3"/>
    <path d="M-2,-300 q-10,10 -2,16 M18,-300 q10,10 2,16" fill="none" stroke="#F2EEE4" stroke-width="3" stroke-dasharray="0.1 5" stroke-linecap="round"/></g>`;
  return character({
    name: "siraj", skin, torso, legsSvg,
    armL: arm("L", { sleeve: teal, cuff: P.gold, skin }),
    armR: arm("R", { sleeve: teal, cuff: P.gold, skin }),
    headParts, hat,
    faceOpts: {
      fx: -3, skin, browW: 3.4,
      moustache: `<path d="M-15,-249 q12,-5 12,2 q0,-7 12,-2" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    },
  });
}

// ---- Mir Jafar: older commander, green jama, white turban, grey beard, sash and sword
function mirJafar() {
  const skin = P.skin.brown;
  const green = P.mughalGreen;
  const torso = `
    <path d="M-44,-210 L44,-210 L50,-118 L72,-28 L-72,-28 L-50,-118 Z" fill="${green}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-50,-118 L50,-118 L72,-28 L-72,-28 Z" fill="#456B33" stroke="${INK}" stroke-width="1.5"/>
    <path d="M-50,-128 h100 v18 h-100z" fill="#B8362E" stroke="${INK}" stroke-width="1.5"/>
    <path d="M30,-110 l6,46 l-12,2z" fill="#B8362E" stroke="${INK}" stroke-width="1"/>
    <path d="M0,-210 L-26,-128" stroke="#2F4A22" stroke-width="3" fill="none"/>
    <path d="M-40,-114 l-30,64" stroke="#7A6A55" stroke-width="6" stroke-linecap="round"/>
    <path d="M-40,-118 l-6,8" stroke="${P.gold}" stroke-width="8" stroke-linecap="round"/>`;
  const legsSvg = legs({ trouser: "#EDE6D6", shoe: "#6B3B22", skin, shoeH: 14 });
  const headParts = headBase({ skin });
  const beard = `<path d="M-38,-262 q-2,40 18,58 q20,14 40,0 q20,-18 18,-58 q-6,18 -18,22 q-20,-10 -40,0 q-12,-4 -18,-22z" fill="#CFCBC2" stroke="${INK}" stroke-width="1.5"/>`;
  const hat = `<g class="rig-hat">
    <path d="M-50,-274 q0,-50 50,-54 q50,4 50,54 q-50,-12 -100,0z" fill="#F4F1EA" stroke="${INK}" stroke-width="2"/>
    <path d="M-48,-284 q48,-16 96,0 M-42,-300 q42,-14 84,0" fill="none" stroke="#B9B2A2" stroke-width="2.5"/>
    <path d="M-50,-276 q50,-14 100,0" fill="none" stroke="${green}" stroke-width="5"/>
    <circle cx="-10" cy="-300" r="6" fill="${green}" stroke="${P.gold}" stroke-width="2"/></g>`;
  return character({
    name: "mir-jafar", skin, torso, legsSvg,
    armL: arm("L", { sleeve: green, cuff: "#EDE6D6", skin }),
    armR: arm("R", { sleeve: green, cuff: "#EDE6D6", skin }),
    headParts, hat,
    faceOpts: {
      fx: 3, skin, brow: "#8E8A82", browW: 4,
      beard,
      moustache: `<path d="M-14,-248 q14,-7 28,0" fill="none" stroke="#CFCBC2" stroke-width="5" stroke-linecap="round"/>`,
    },
  });
}

// ---- Company soldier. Skin, coat and headgear come from CSS variables so one
// <use> symbol can show both European soldiers (tricorne) and sepoys (turban).
function companySoldier() {
  const skin = "var(--skin, #EBC6A0)";
  const red = P.companyRed;
  const torso = `
    <path d="M-42,-210 L42,-210 L48,-112 L54,-76 L12,-76 L0,-118 L-12,-76 L-54,-76 L-48,-112 Z" fill="${red}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-14,-210 L14,-210 L12,-118 L-12,-118 Z" fill="${P.white}" stroke="${INK}" stroke-width="1.2"/>
    <path d="M-38,-208 L34,-122 M38,-208 L-34,-122" stroke="${P.white}" stroke-width="8"/>
    <path d="M-38,-208 L34,-122 M38,-208 L-34,-122" stroke="${INK}" stroke-width="1" opacity="0.4"/>
    <circle cx="0" cy="-165" r="5" fill="${P.gold}"/>`;
  const legsSvg = legs({ trouser: "var(--trouser, #F6F0E2)", shoe: "#1E1A17", skin, shoeH: 40 });
  const musket = `<g class="rig-musket"><path d="M44,-100 L70,-330" stroke="#6B4A2E" stroke-width="7" stroke-linecap="round"/>
    <path d="M66,-300 L72,-350" stroke="#8C8C88" stroke-width="3.5"/><path d="M42,-112 l10,-6" stroke="#4A3422" stroke-width="10" stroke-linecap="round"/></g>`;
  const headParts = headBase({ skin });
  const hat = `<g class="rig-hat">
    <g style="opacity: var(--hatA, 1)"><path d="M-58,-288 q58,-24 116,0 q-14,-36 -58,-38 q-44,2 -58,38z" fill="#1E1A17" stroke="${INK}" stroke-width="2"/>
    <path d="M-58,-288 q58,-24 116,0" fill="none" stroke="${P.white}" stroke-width="3"/></g>
    <g style="opacity: var(--hatB, 0)"><path d="M-46,-276 q0,-44 46,-48 q46,4 46,48 q-46,-10 -92,0z" fill="${P.white}" stroke="${INK}" stroke-width="2"/>
    <path d="M-44,-286 q44,-14 88,0 M-36,-300 q36,-12 72,0" fill="none" stroke="${red}" stroke-width="3"/></g></g>`;
  return character({
    name: "company-soldier", skin, torso, legsSvg,
    armL: arm("L", { sleeve: red, cuff: P.white, skin }),
    armR: arm("R", { sleeve: red, cuff: P.white, skin, extraLower: musket }),
    headParts, hat,
    faceOpts: { fx: 5, skin, cheeks: false },
  });
}

// ---- Nawab's soldier: jama in saffron/white, turban, spear and round shield.
function nawabSoldier() {
  const skin = "var(--skin, #A56F45)";
  const jama = "var(--jama, #E4D3B0)";
  const torso = `
    <path d="M-40,-210 L40,-210 L46,-118 L64,-40 L-64,-40 L-46,-118 Z" fill="${jama}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-46,-126 h92 v14 h-92z" fill="var(--sash, #D9822B)" stroke="${INK}" stroke-width="1.5"/>
    <path d="M0,-210 L-22,-126" stroke="${INK}" stroke-width="1.5" opacity="0.5"/>`;
  const legsSvg = legs({ trouser: "#EDE6D6", shoe: "#6B3B22", skin, shoeH: 14 });
  const spear = `<g class="rig-spear"><path d="M48,-60 L58,-360" stroke="#6B4A2E" stroke-width="6" stroke-linecap="round"/>
    <path d="M58,-360 l-8,-4 l9,-30 l9,30z" fill="#9A9A94" stroke="${INK}" stroke-width="1.5"/>
    <path d="M55,-350 q-10,8 0,14" fill="none" stroke="#B8362E" stroke-width="4"/></g>`;
  const shield = `<g class="rig-shield"><circle cx="-56" cy="-120" r="30" fill="#5A4030" stroke="${INK}" stroke-width="2"/>
    <circle cx="-56" cy="-120" r="20" fill="none" stroke="${P.gold}" stroke-width="2.5"/>
    <g fill="${P.gold}"><circle cx="-63" cy="-127" r="3"/><circle cx="-49" cy="-127" r="3"/><circle cx="-63" cy="-113" r="3"/><circle cx="-49" cy="-113" r="3"/></g></g>`;
  const headParts = headBase({ skin });
  const hat = `<g class="rig-hat"><path d="M-48,-274 q0,-46 48,-50 q48,4 48,50 q-48,-12 -96,0z" fill="var(--turban, #D9822B)" stroke="${INK}" stroke-width="2"/>
    <path d="M-46,-284 q46,-14 92,0 M-38,-300 q38,-12 76,0" fill="none" stroke="${INK}" stroke-width="1.5" opacity="0.35"/></g>`;
  return character({
    name: "nawab-soldier", skin, torso, legsSvg,
    armL: arm("L", { sleeve: jama, cuff: "#EDE6D6", skin, extraLower: shield }),
    armR: arm("R", { sleeve: jama, cuff: "#EDE6D6", skin, extraLower: spear }),
    headParts, hat,
    faceOpts: {
      fx: -5, skin, cheeks: false,
      moustache: `<path d="M-19,-249 q10,-6 14,0 q4,-6 14,0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    },
  });
}

out("characters/clive.svg", clive());
out("characters/siraj.svg", siraj());
out("characters/mir-jafar.svg", mirJafar());
out("characters/company-soldier.svg", companySoldier());
out("characters/nawab-soldier.svg", nawabSoldier());

/* ------------------------------------------------------------------ */
/* Sets — layered flat backgrounds, 2400 x 1080, classes set-*          */
/* ------------------------------------------------------------------ */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bands(x, y, w, h, colors) {
  const bh = h / colors.length;
  return colors.map((c, i) => `<rect x="${x}" y="${(y + i * bh).toFixed(1)}" width="${w}" height="${(bh + 1).toFixed(1)}" fill="${c}"/>`).join("");
}

function tree(x, y, s, c1, c2, r) {
  const blobs = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    blobs.push(`<circle cx="${(x + Math.cos(a) * 34 * s).toFixed(1)}" cy="${(y - 70 * s + Math.sin(a) * 22 * s).toFixed(1)}" r="${(30 + r() * 10) * s}" fill="${i % 2 ? c1 : c2}"/>`);
  }
  return `<g><rect x="${x - 7 * s}" y="${y - 50 * s}" width="${14 * s}" height="${50 * s}" fill="#5B4330"/>
    <circle cx="${x}" cy="${y - 74 * s}" r="${44 * s}" fill="${c1}"/>${blobs.join("")}
    <circle cx="${x - 12 * s}" cy="${y - 90 * s}" r="${14 * s}" fill="#6E9A56" opacity="0.6"/></g>`;
}

function battlefield() {
  const r = rng(1757);
  const W = 2400, H = 1080, HZ = 640;
  const sky = bands(0, 0, W, HZ, ["#BFD5CC", "#C7DACF", "#CFE0D6", "#D8E3D2", "#E2E5CF", "#EAE4C8"]);
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const cx = 120 + i * 270 + r() * 80, cy = 120 + r() * 230, s = 0.7 + r() * 0.8;
    clouds.push(`<g opacity="0.9"><ellipse cx="${cx}" cy="${cy}" rx="${110 * s}" ry="${26 * s}" fill="#F4EEDC"/><ellipse cx="${cx - 30 * s}" cy="${cy - 18 * s}" rx="${50 * s}" ry="${28 * s}" fill="#F4EEDC"/><ellipse cx="${cx + 35 * s}" cy="${cy - 12 * s}" rx="${42 * s}" ry="${22 * s}" fill="#F7F2E4"/></g>`);
  }
  // far: tree line, river, hunting lodge
  const far = [];
  far.push(`<path d="M0,${HZ} ${Array.from({ length: 49 }, (_, i) => `L${i * 50},${HZ - 30 - r() * 30}`).join(" ")} L${W},${HZ} Z" fill="#9DB096"/>`);
  far.push(`<path d="M0,${HZ - 4} ${Array.from({ length: 61 }, (_, i) => `L${i * 40},${HZ - 14 - r() * 18}`).join(" ")} L${W},${HZ} Z" fill="#8AA284"/>`);
  far.push(`<path d="M0,${HZ + 4} C400,${HZ - 6} 700,${HZ + 30} 1100,${HZ + 14} S1800,${HZ - 4} ${W},${HZ + 10} L${W},${HZ + 34} C1800,${HZ + 22} 1500,${HZ + 46} 1100,${HZ + 40} S400,${HZ + 22} 0,${HZ + 32} Z" fill="${P.sea}" opacity="0.85"/>`);
  far.push(`<g transform="translate(1620 ${HZ - 8})"><rect x="0" y="-46" width="90" height="46" fill="#E4D6B8" stroke="${INK}" stroke-width="1.5"/><path d="M-8,-46 L45,-78 L98,-46Z" fill="#A8694A" stroke="${INK}" stroke-width="1.5"/><rect x="38" y="-26" width="14" height="26" fill="${INK}" opacity="0.6"/><rect x="12" y="-36" width="10" height="10" fill="${INK}" opacity="0.4"/><rect x="68" y="-36" width="10" height="10" fill="${INK}" opacity="0.4"/></g>`);
  // mid: mango grove with mud wall, at left
  const mid = [];
  for (let i = 0; i < 16; i++) mid.push(tree(40 + i * 56 + r() * 20, HZ + 70 + (i % 3) * 8, 0.95 + r() * 0.3, "#3E6B3A", "#4F7A3A", r));
  mid.push(`<path d="M0,${HZ + 96} L960,${HZ + 96} L960,${HZ + 112} L0,${HZ + 112} Z" fill="#A0805A" stroke="${INK}" stroke-width="1.5"/>`);
  mid.push(`<ellipse cx="1380" cy="${HZ + 96}" rx="120" ry="16" fill="${P.sea}" opacity="0.8"/><ellipse cx="1380" cy="${HZ + 90}" rx="132" ry="20" fill="none" stroke="#8C7A55" stroke-width="6"/>`);
  mid.push(`<path d="M1880,${HZ + 100} q90,-70 180,0z" fill="#A9A06E"/>`);
  // ground
  const ground = [bands(0, HZ + 34, W, H - HZ - 34, ["#D2C08A", "#CDB982", "#C8B27A", "#C2AB72", "#BCA46B", "#B59D64"])];
  for (let i = 0; i < 140; i++) {
    const x = r() * W, y = HZ + 120 + r() * (H - HZ - 130);
    ground.push(`<path d="M${x.toFixed(0)},${y.toFixed(0)} l4,-14 l3,12 l5,-10 l2,12" fill="none" stroke="#8E8450" stroke-width="2" opacity="0.6"/>`);
  }
  ground.push(`<path d="M600,${H} C900,${HZ + 260} 1300,${HZ + 160} 1700,${HZ + 140}" fill="none" stroke="#D9C99A" stroke-width="40" opacity="0.6"/>`);
  const fg = [];
  for (let i = 0; i < 26; i++) {
    const x = i * 96 + r() * 40, y = H - 10 - r() * 30;
    fg.push(`<path d="M${x},${y} q-6,-40 -18,-60 M${x},${y} q2,-50 4,-70 M${x},${y} q10,-40 24,-54" fill="none" stroke="#6E6A3A" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="cc-set cc-set-battlefield" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" data-horizon="${HZ}">
  <g class="set-sky">${sky}</g>
  <g class="set-clouds">${clouds.join("")}</g>
  <g class="set-far">${far.join("")}</g>
  <g class="set-mid">${mid.join("")}</g>
  <g class="set-ground">${ground.join("")}</g>
  <g class="set-fg">${fg.join("")}</g>
</svg>`;
}

function cuspedArch(x, y, w, h) {
  // multifoil arch outline (Mughal style), returns path d
  const r = w / 2;
  const top = y - h;
  const lobes = 5;
  let d = `M${x - r},${y} L${x - r},${top + r}`;
  for (let i = 0; i < lobes; i++) {
    const a0 = Math.PI + (i / lobes) * Math.PI, a1 = Math.PI + ((i + 1) / lobes) * Math.PI;
    const x1 = x + Math.cos(a1) * r, y1 = top + r + Math.sin(a1) * r;
    const lr = (Math.PI * r) / lobes / 2;
    d += ` A${lr.toFixed(1)},${lr.toFixed(1)} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  d += ` L${x + r},${y} Z`;
  return d;
}

function durbar() {
  const W = 2400, H = 1080, FLOOR = 760;
  const wall = [bands(0, 0, W, FLOOR, ["#E2D2AE", "#E6D7B5", "#E9DCC0", "#E6D8B8"])];
  for (let i = 0; i < 7; i++) {
    const x = 170 + i * 345;
    wall.push(`<path d="${cuspedArch(x, FLOOR - 30, 210, 430)}" fill="#CDB98F" stroke="${INK}" stroke-width="2"/>`);
    wall.push(`<path d="${cuspedArch(x, FLOOR - 30, 170, 390)}" fill="${P.bengalTeal}" opacity="0.55"/>`);
    wall.push(`<path d="M${x - 50},${FLOOR - 140} q50,-60 100,0" fill="none" stroke="${P.gold}" stroke-width="3" opacity="0.7"/>`);
  }
  wall.push(`<rect x="0" y="60" width="${W}" height="26" fill="${P.gold}" opacity="0.65"/><rect x="0" y="${FLOOR - 40}" width="${W}" height="40" fill="#BFA77A"/>`);
  for (let i = 0; i < 48; i++) wall.push(`<circle cx="${25 + i * 50}" cy="73" r="7" fill="#B8362E" opacity="0.6"/>`);
  const mid = [];
  for (let i = 0; i < 8; i++) {
    const x = 0 + i * 345;
    mid.push(`<g><rect x="${x - 26}" y="140" width="52" height="${FLOOR - 140}" fill="#F3EBDA" stroke="${INK}" stroke-width="2"/>
      <path d="M${x - 40},140 h80 l-10,-30 h-60z" fill="${P.gold}" stroke="${INK}" stroke-width="2"/>
      <path d="M${x - 38},${FLOOR} h76 l-8,-34 h-60z" fill="${P.gold}" stroke="${INK}" stroke-width="2"/>
      <path d="M${x - 14},180 v${FLOOR - 240}" stroke="#D9CBB0" stroke-width="6"/></g>`);
  }
  const lamps = [];
  for (let i = 0; i < 4; i++) {
    const x = 360 + i * 560;
    lamps.push(`<g class="set-lamp" data-pivot="${x} 0"><path d="M${x},0 v170" stroke="${INK}" stroke-width="2"/>
      <path d="M${x - 34},170 h68 l-12,34 h-44z" fill="${P.gold}" stroke="${INK}" stroke-width="2"/>
      <circle cx="${x}" cy="214" r="12" fill="#F6D98A" stroke="${INK}" stroke-width="1.5"/>
      <circle cx="${x}" cy="214" r="34" fill="#F6D98A" opacity="0.25"/></g>`);
  }
  const floor = [bands(0, FLOOR, W, H - FLOOR, ["#A33F33", "#9C3A2F", "#96362C", "#8F3329"])];
  floor.push(`<rect x="0" y="${FLOOR + 18}" width="${W}" height="12" fill="${P.gold}" opacity="0.8"/>`);
  for (let i = 0; i < 24; i++) floor.push(`<path d="M${50 + i * 100},${FLOOR + 90} l30,26 l-30,26 l-30,-26z" fill="${P.bengalTeal}" opacity="0.7"/>`);
  for (let i = 0; i < 24; i++) floor.push(`<circle cx="${100 + i * 100}" cy="${FLOOR + 210}" r="14" fill="${P.gold}" opacity="0.5"/>`);
  // throne platform (masnad) with bolster and canopy, centred at x=1200
  const throne = `<g class="set-throne">
    <path d="M900,${FLOOR + 40} h600 v-46 h-600z" fill="#E9DCC0" stroke="${INK}" stroke-width="2"/>
    <path d="M900,${FLOOR - 6} h600" stroke="${P.gold}" stroke-width="6"/>
    <path d="M940,${FLOOR - 6} h520 v-40 h-520z" fill="#B8362E" stroke="${INK}" stroke-width="2"/>
    <rect x="1080" y="${FLOOR - 150}" width="240" height="104" rx="40" fill="#C9A24A" stroke="${INK}" stroke-width="2"/>
    <path d="M1100,${FLOOR - 120} h200 M1100,${FLOOR - 90} h200" stroke="#B8362E" stroke-width="5"/>
    <path d="M930,140 v${FLOOR - 146} M1470,140 v${FLOOR - 146}" stroke="${P.gold}" stroke-width="12"/>
    <path d="M900,150 q300,-90 600,0 z" fill="#B8362E" stroke="${INK}" stroke-width="2"/>
    <path d="M900,150 ${Array.from({ length: 12 }, (_, i) => `q25,30 50,0`).join(" ")}" fill="${P.gold}" stroke="${INK}" stroke-width="1.5"/>
  </g>`;
  const fg = `<path d="M0,0 h170 q-30,300 40,560 q-140,40 -210,0z" fill="#7E2A22" stroke="${INK}" stroke-width="2"/>
    <path d="M150,520 q30,30 70,30" stroke="${P.gold}" stroke-width="10" fill="none"/>
    <path d="M${W},0 h-170 q30,300 -40,560 q140,40 210,0z" fill="#7E2A22" stroke="${INK}" stroke-width="2"/>
    <path d="M${W - 150},520 q-30,30 -70,30" stroke="${P.gold}" stroke-width="10" fill="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="cc-set cc-set-durbar" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" data-floor="${FLOOR}">
  <g class="set-far">${wall.join("")}</g>
  <g class="set-mid">${mid.join("")}${lamps.join("")}</g>
  <g class="set-ground">${floor.join("")}${throne}</g>
  <g class="set-fg">${fg}</g>
</svg>`;
}

out("sets/plassey-battlefield.svg", battlefield());
out("sets/durbar-hall.svg", durbar());

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */
out("sets/props/cannon-company.svg", `<svg xmlns="http://www.w3.org/2000/svg" class="cc-prop cc-cannon" viewBox="-160 -120 320 140">
  <g class="prop-barrel" data-pivot="-20 -60"><path d="M-80,-72 L120,-64 L120,-46 L-80,-40 Z" fill="#3A3633" stroke="${INK}" stroke-width="2"/><rect x="112" y="-70" width="14" height="30" fill="#2B2622"/><circle cx="-86" cy="-56" r="10" fill="#3A3633" stroke="${INK}" stroke-width="2"/></g>
  <path d="M-110,-20 L40,-50 L50,-34 L-100,0 Z" fill="#7A5235" stroke="${INK}" stroke-width="2"/>
  <g class="prop-wheel" data-pivot="-10 -20"><circle cx="-10" cy="-20" r="36" fill="none" stroke="#5B3B25" stroke-width="9"/><path d="M-46,-20 h72 M-10,-56 v72 M-35,-45 l50,50 M15,-45 l-50,50" stroke="#5B3B25" stroke-width="5"/><circle cx="-10" cy="-20" r="7" fill="#3A3633"/></g>
</svg>`);
out("sets/props/gun-platform-nawab.svg", `<svg xmlns="http://www.w3.org/2000/svg" class="cc-prop cc-gunstage" viewBox="-200 -170 400 190">
  <g class="prop-barrel" data-pivot="10 -110"><path d="M-110,-124 L150,-116 L150,-96 L-110,-86 Z" fill="#6E5A3A" stroke="${INK}" stroke-width="2"/><rect x="140" y="-122" width="16" height="32" fill="#4A3C26"/></g>
  <rect x="-170" y="-84" width="340" height="40" fill="#8A5E3A" stroke="${INK}" stroke-width="2"/>
  <path d="M-170,-84 h340" stroke="${P.gold}" stroke-width="4"/>
  <g fill="#5B3B25" stroke="${INK}" stroke-width="2"><circle cx="-120" cy="-30" r="26"/><circle cx="0" cy="-30" r="26"/><circle cx="120" cy="-30" r="26"/></g>
</svg>`);
out("sets/props/powder-keg.svg", `<svg xmlns="http://www.w3.org/2000/svg" class="cc-prop cc-keg" viewBox="-50 -90 100 95">
  <path d="M-34,0 q-10,-42 0,-84 h68 q10,42 0,84z" fill="#8A5E3A" stroke="${INK}" stroke-width="2"/>
  <path d="M-38,-20 h76 M-40,-64 h80" stroke="#3A3633" stroke-width="6"/><path d="M-12,-50 l24,24 M12,-50 l-24,24" stroke="${INK}" stroke-width="4" opacity="0.7"/>
</svg>`);
out("sets/props/tarpaulin.svg", `<svg xmlns="http://www.w3.org/2000/svg" class="cc-prop cc-tarp" viewBox="-160 -110 320 120">
  <path d="M-150,0 q-10,-60 30,-90 q120,-30 240,0 q40,30 30,90 q-150,12 -300,0z" fill="#6F6A45" stroke="${INK}" stroke-width="2"/>
  <path d="M-110,-70 q20,40 10,70 M-20,-96 q10,50 0,96 M70,-90 q-6,50 10,90" fill="none" stroke="#4E4A30" stroke-width="3"/>
</svg>`);
out("sets/props/tent.svg", `<svg xmlns="http://www.w3.org/2000/svg" class="cc-prop cc-tent" viewBox="-260 -300 520 310">
  <path d="M-240,0 L0,-280 L240,0 Z" fill="#E8DCC0" stroke="${INK}" stroke-width="3"/>
  <path d="M0,-280 L-60,0 L60,0 Z" fill="#B8362E" stroke="${INK}" stroke-width="2"/>
  <path d="M0,-280 v-14" stroke="${INK}" stroke-width="4"/><path d="M0,-294 l40,10 l-40,10z" fill="${P.companyRed}"/>
</svg>`);
out("sets/props/treaty.svg", `<svg xmlns="http://www.w3.org/2000/svg" class="cc-prop cc-treaty" viewBox="-170 -220 340 440">
  <path d="M-150,-200 h300 v380 q-150,30 -300,0z" fill="#F4ECD8" stroke="${INK}" stroke-width="2.5"/>
  <g stroke="${INK}" stroke-width="3" opacity="0.45" class="prop-lines">
    <path d="M-110,-140 h220"/><path d="M-110,-110 h200"/><path d="M-110,-80 h220"/><path d="M-110,-50 h170"/><path d="M-110,-20 h210"/><path d="M-110,10 h190"/><path d="M-110,40 h150"/>
  </g>
  <path d="M-100,110 q30,-30 50,0 t60,-6" fill="none" stroke="${INK}" stroke-width="3"/>
  <circle cx="90" cy="120" r="28" fill="#B8362E" stroke="#7E2A22" stroke-width="3"/><circle cx="90" cy="120" r="16" fill="none" stroke="#7E2A22" stroke-width="2"/>
</svg>`);
out("sets/props/camel.svg", `<svg xmlns="http://www.w3.org/2000/svg" class="cc-prop cc-camel" viewBox="-215 -330 440 340">
  <g class="camel-legB1" data-pivot="-70 -150"><path d="M-82,-150 h24 l-4,150 h-16z" fill="#B48A55" stroke="${INK}" stroke-width="2"/></g>
  <g class="camel-legF1" data-pivot="70 -150"><path d="M58,-150 h24 l-4,150 h-16z" fill="#B48A55" stroke="${INK}" stroke-width="2"/></g>
  <path d="M-120,-150 q-10,-60 40,-90 q30,-40 60,0 q30,-40 60,0 q50,20 60,90 q-110,20 -220,0z" fill="#C89B62" stroke="${INK}" stroke-width="2.5"/>
  <path d="M-60,-238 q40,-20 100,0 l-6,40 h-88z" fill="${P.bengalTeal}" stroke="${INK}" stroke-width="2"/>
  <path d="M-60,-200 h88" stroke="${P.gold}" stroke-width="5"/>
  <g class="camel-neck" data-pivot="100 -170"><path d="M90,-180 q60,-30 60,-110 h34 q8,90 -60,130z" fill="#C89B62" stroke="${INK}" stroke-width="2.5"/>
  <path d="M150,-290 q10,-20 40,-14 q18,8 14,24 q-24,10 -54,6z" fill="#C89B62" stroke="${INK}" stroke-width="2.5"/><circle cx="182" cy="-290" r="3.5" fill="${INK}"/></g>
  <path d="M-120,-150 q-24,10 -30,50" fill="none" stroke="#8A6A40" stroke-width="5"/>
  <g class="camel-legB2" data-pivot="-50 -150"><path d="M-62,-150 h24 l-4,150 h-16z" fill="#C89B62" stroke="${INK}" stroke-width="2"/></g>
  <g class="camel-legF2" data-pivot="90 -150"><path d="M78,-150 h24 l-4,150 h-16z" fill="#C89B62" stroke="${INK}" stroke-width="2"/></g>
</svg>`);
console.log("kit done");
