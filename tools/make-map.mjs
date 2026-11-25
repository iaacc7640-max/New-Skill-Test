// ClearCut History — Bengal base map.
// Coastline from Natural Earth via world-atlas (land-50m); no modern borders drawn.
// Historical region and rivers are hand-drawn, simplified polygons (always show MAP SIMPLIFIED).
// Run: node tools/make-map.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const P = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/palette.json"), "utf8"));
const W = 1920, H = 1080;
const land = feature(require("world-atlas/land-50m.json"), "land");

const proj = geoMercator().center([88.4, 23.9]).scale(5200).translate([W / 2, H / 2]).clipExtent([[-60, -60], [W + 60, H + 60]]);
const gp = geoPath(proj).digits(1);
const pt = (lon, lat) => proj([lon, lat]).map((v) => +v.toFixed(1));
const line = (pts) => "M" + pts.map(([a, b]) => pt(a, b).join(",")).join(" L");
const smooth = (pts) => {
  const q = pts.map(([a, b]) => pt(a, b));
  let d = `M${q[0].join(",")}`;
  for (let i = 1; i < q.length; i++) {
    const p0 = q[i - 1], p1 = q[i];
    const mx = ((p0[0] + p1[0]) / 2).toFixed(1), my = ((p0[1] + p1[1]) / 2).toFixed(1);
    d += ` Q${p0.join(",")} ${mx},${my}`;
  }
  return d + ` L${q[q.length - 1].join(",")}`;
};

// Clip land to a box around the frame so the path stays small.
const landD = gp(land);

// Bengal subah (Bengal + Bihar), hand-simplified. Southern edge runs into the sea;
// the sea mask drawn above it trims it to the coastline.
const subah = [
  [83.3, 27.3], [84.5, 27.4], [86.0, 26.7], [87.5, 26.5], [88.2, 26.9], [89.0, 26.6], [89.9, 26.3],
  [90.9, 25.9], [91.9, 24.9], [92.4, 24.2], [92.3, 22.8], [92.2, 21.2], [90.5, 20.6], [88.5, 20.6],
  [87.2, 20.9], [86.5, 21.5], [86.0, 22.5], [85.0, 23.2], [84.0, 24.0], [83.3, 24.5], [83.3, 25.3],
  [83.8, 26.2],
];
const ganges = [[80.5, 25.4], [82.0, 25.3], [83.3, 25.6], [85.1, 25.62], [86.0, 25.4], [87.3, 25.25], [87.8, 25.05], [88.15, 24.75], [88.9, 24.1], [89.7, 23.65], [90.4, 23.25], [90.6, 22.6], [90.85, 22.0]];
const hooghly = [[88.15, 24.75], [88.27, 24.18], [88.25, 23.8], [88.36, 23.4], [88.4, 22.9], [88.36, 22.57], [88.15, 22.1], [88.05, 21.65]];
const cities = {
  plassey: { name: "Plassey", lon: 88.25, lat: 23.8 },
  murshidabad: { name: "Murshidabad", lon: 88.27, lat: 24.18 },
  calcutta: { name: "Calcutta", lon: 88.36, lat: 22.57 },
  patna: { name: "Patna", lon: 85.14, lat: 25.59 },
  dhaka: { name: "Dhaka", lon: 90.41, lat: 23.81 },
};
for (const c of Object.values(cities)) [c.x, c.y] = pt(c.lon, c.lat);

const seaMask = `M-200,-200 H${W + 200} V${H + 200} H-200 Z ${landD}`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="cc-map cc-map-bengal" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
  <rect class="map-sea" x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="${P.sea}"/>
  <g class="map-sea-lines" stroke="#77A3A0" stroke-width="2" fill="none" opacity="0.6">
    ${Array.from({ length: 9 }, (_, i) => `<path d="M${300 + i * 90},${760 + (i % 3) * 60} q30,-12 60,0 t60,0"/>`).join("")}
  </g>
  <path class="map-land" d="${landD}" fill="${P.paper}"/>
  <path class="map-region" d="${smooth([...subah, subah[0]])} Z" fill="${P.bengalTeal}" opacity="0.55" stroke="${P.ink}" stroke-width="3" stroke-dasharray="10 8"/>
  <path class="map-seamask" d="${seaMask}" fill="${P.sea}" fill-rule="evenodd"/>
  <path class="map-coast" d="${landD}" fill="none" stroke="${P.ink}" stroke-width="2.5" opacity="0.8"/>
  <g class="map-rivers" fill="none" stroke="#4E7F86" stroke-width="5" stroke-linecap="round">
    <path class="map-river-ganges" d="${smooth(ganges)}"/>
    <path class="map-river-hooghly" d="${smooth(hooghly)}" stroke-width="4"/>
  </g>
</svg>`;
fs.mkdirSync(path.join(ROOT, "assets/maps"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "assets/maps/bengal-1757.svg"), svg + "\n");
fs.writeFileSync(
  path.join(ROOT, "assets/maps/bengal-1757.json"),
  JSON.stringify({ width: W, height: H, projection: { type: "mercator", center: [88.4, 23.9], scale: 5200 }, regionLabel: pt(86.2, 25.0), seaLabel: pt(89.0, 21.0), cities }, null, 1) + "\n",
);
console.log("wrote assets/maps/bengal-1757.svg", (svg.length / 1024).toFixed(0) + " KB");
