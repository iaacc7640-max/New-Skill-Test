/* ClearCut History — character rig motions for GSAP timelines (HyperFrames).
 * Every motion is added to a paused timeline at an explicit time, with finite repeats,
 * so any frame is a pure function of timeline time. Randomness is seeded.
 * Usage: ClearCutRig.idle(tl, rootEl, t0, dur); rootEl = the character's <svg> element.
 */
(function () {
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const part = (root, name) => root && root.querySelector(".rig-" + name);
  const pv = (el) => (el && el.getAttribute("data-pivot")) || "0 0";
  function to(tl, el, vars, t) {
    if (!el) return;
    vars.svgOrigin = pv(el);
    tl.to(el, vars, t);
  }
  function set(tl, el, vars, t) {
    if (!el) return;
    vars.svgOrigin = pv(el);
    tl.set(el, vars, t);
  }
  const R = { rng };

  /* Reset every rig part to rest at time t (call once at the start of a scene). */
  R.rest = function (tl, root, t) {
    root.querySelectorAll("[data-pivot]").forEach((el) => set(tl, el, { rotation: 0, scaleX: 1, scaleY: 1, x: 0, y: 0 }, t || 0));
    ["m1", "m2"].forEach((m) => { const el = root.querySelector(".rig-mouth ." + m); if (el) tl.set(el, { opacity: 0 }, t || 0); });
    const m0 = root.querySelector(".rig-mouth .m0"); if (m0) tl.set(m0, { opacity: 1 }, t || 0);
  };

  /* Idle: breathing 1-2% on the torso, head rides along, arms sway a little. */
  R.idle = function (tl, root, t0, dur, opt) {
    opt = opt || {};
    const amp = opt.amp || 0.018, period = opt.period || 3.2;
    const n = Math.max(1, Math.floor(dur / (period / 2)));
    const torso = part(root, "torso"), head = part(root, "head");
    if (torso) tl.fromTo(torso, { scaleY: 1, svgOrigin: pv(torso) }, { scaleY: 1 + amp, svgOrigin: pv(torso), duration: period / 2, ease: "sine.inOut", repeat: n - 1, yoyo: true }, t0);
    if (head) tl.fromTo(head, { y: 0 }, { y: -amp * 110, duration: period / 2, ease: "sine.inOut", repeat: n - 1, yoyo: true }, t0);
  };

  /* Blink every 3-5 s. */
  R.blink = function (tl, root, t0, dur, seed) {
    const eyes = part(root, "eyes");
    if (!eyes) return;
    const r = rng(seed || 7);
    let t = t0 + 0.5 + r() * 1.2;
    while (t < t0 + dur - 0.25) {
      tl.fromTo(eyes, { scaleY: 1, svgOrigin: pv(eyes) }, { scaleY: 0.08, svgOrigin: pv(eyes), duration: 0.06, ease: "none", immediateRender: false }, t);
      to(tl, eyes, { scaleY: 1, duration: 0.09, ease: "none" }, t + 0.07);
      t += 3 + r() * 2;
    }
  };

  /* Talk: cycle 3 mouth shapes (closed, open, wide) on a seeded pattern. */
  R.talk = function (tl, root, t0, dur, seed) {
    const m = [0, 1, 2].map((i) => root.querySelector(".rig-mouth .m" + i));
    if (!m[0]) return;
    const r = rng(seed || 11);
    let t = t0, prev = 0;
    while (t < t0 + dur) {
      let k = Math.floor(r() * 3);
      if (k === prev) k = (k + 1) % 3;
      m.forEach((el, i) => tl.set(el, { opacity: i === k ? 1 : 0 }, t));
      prev = k;
      t += 0.08 + r() * 0.07;
    }
    m.forEach((el, i) => tl.set(el, { opacity: i === 0 ? 1 : 0 }, t0 + dur));
  };

  /* Pose arms: rotations in degrees. side R = viewer's right arm. */
  R.pose = function (tl, root, t, rot, dur, ease) {
    Object.keys(rot).forEach((k) => to(tl, part(root, k), { rotation: rot[k], duration: dur || 0.4, ease: ease || "power2.inOut" }, t));
  };
  R.armsRest = function (tl, root, t, dur) {
    R.pose(tl, root, t, { "armL-upper": 0, "armL-lower": 0, "armR-upper": 0, "armR-lower": 0 }, dur || 0.45);
  };

  /* Point: arm out toward the side, held, then back (hold 0 = keep). */
  R.point = function (tl, root, t, side, hold) {
    side = side || "R";
    const s = side === "R" ? -1 : 1;
    const p = {};
    p["arm" + side + "-upper"] = 78 * s;
    p["arm" + side + "-lower"] = 8 * s;
    R.pose(tl, root, t, p, 0.35, "back.out(1.6)");
    if (hold) {
      const back = {};
      back["arm" + side + "-upper"] = 0;
      back["arm" + side + "-lower"] = 0;
      R.pose(tl, root, t + 0.35 + hold, back, 0.45);
    }
  };

  /* Gesture: forearm raised, open-hand beats, then rest. */
  R.gesture = function (tl, root, t, side, dur) {
    side = side || "R";
    dur = dur || 1.6;
    const s = side === "R" ? -1 : 1;
    const up = part(root, "arm" + side + "-upper"), lo = part(root, "arm" + side + "-lower");
    to(tl, up, { rotation: 28 * s, duration: 0.3, ease: "power2.out" }, t);
    to(tl, lo, { rotation: 70 * s, duration: 0.3, ease: "power2.out" }, t);
    const beats = Math.max(1, Math.floor((dur - 0.7) / 0.3));
    for (let i = 0; i < beats; i++) to(tl, lo, { rotation: (i % 2 ? 70 : 52) * s, duration: 0.3, ease: "sine.inOut" }, t + 0.3 + i * 0.3);
    to(tl, up, { rotation: 0, duration: 0.4, ease: "power2.inOut" }, t + dur - 0.4);
    to(tl, lo, { rotation: 0, duration: 0.4, ease: "power2.inOut" }, t + dur - 0.4);
  };

  /* Walk cycle, 4 keys per stride: contact, down, passing, up. */
  R.walk = function (tl, root, t0, dur, opt) {
    opt = opt || {};
    const step = opt.step || 0.45, amp = opt.amp || 22, arm = opt.arm == null ? 14 : opt.arm;
    const L = part(root, "legL"), Rr = part(root, "legR"), aL = part(root, "armL-upper"), aR = part(root, "armR-upper"), body = part(root, "root");
    const n = Math.max(1, Math.floor(dur / step));
    for (let i = 0; i < n; i++) {
      const t = t0 + i * step, sgn = i % 2 ? 1 : -1;
      to(tl, L, { rotation: amp * sgn, duration: step, ease: "sine.inOut" }, t);
      to(tl, Rr, { rotation: -amp * sgn, duration: step, ease: "sine.inOut" }, t);
      if (arm) {
        to(tl, aL, { rotation: -arm * sgn, duration: step, ease: "sine.inOut" }, t);
        to(tl, aR, { rotation: arm * sgn, duration: step, ease: "sine.inOut" }, t);
      }
      if (body) {
        tl.to(body, { y: -7, duration: step / 2, ease: "sine.out" }, t);
        tl.to(body, { y: 0, duration: step / 2, ease: "sine.in" }, t + step / 2);
      }
    }
    const te = t0 + n * step;
    [L, Rr].forEach((el) => to(tl, el, { rotation: 0, duration: 0.25 }, te));
    if (arm) [aL, aR].forEach((el) => to(tl, el, { rotation: 0, duration: 0.25 }, te));
  };

  /* Turn head: shift the face sideways (dx in SVG units) with a slight tilt. */
  R.turnHead = function (tl, root, t, dx, dur) {
    const face = part(root, "face"), head = part(root, "head");
    if (face) tl.to(face, { x: dx, duration: dur || 0.35, ease: "power2.inOut" }, t);
    to(tl, head, { rotation: dx * 0.12, duration: dur || 0.35, ease: "power2.inOut" }, t);
  };

  /* React: eyebrows up, eyes widen, then settle. */
  R.react = function (tl, root, t, hold) {
    const brows = part(root, "brows"), eyes = part(root, "eyes");
    if (brows) tl.to(brows, { y: -8, duration: 0.15, ease: "back.out(3)" }, t);
    to(tl, eyes, { scaleX: 1.18, scaleY: 1.18, duration: 0.15, ease: "back.out(3)" }, t);
    if (hold != null) {
      if (brows) tl.to(brows, { y: 0, duration: 0.3 }, t + 0.15 + hold);
      to(tl, eyes, { scaleX: 1, scaleY: 1, duration: 0.3 }, t + 0.15 + hold);
    }
  };
  /* Frown: brows down and in (suspicion). */
  R.frown = function (tl, root, t, hold) {
    const brows = part(root, "brows");
    if (!brows) return;
    tl.to(brows, { y: 5, duration: 0.2, ease: "power2.out" }, t);
    if (hold != null) tl.to(brows, { y: 0, duration: 0.3 }, t + 0.2 + hold);
  };

  /* Crowd life for <use> soldiers: seeded bob and sway, finite repeats. */
  R.crowd = function (tl, uses, t0, dur, opt) {
    opt = opt || {};
    const r = rng(opt.seed || 3);
    const period = opt.period || 0.9, bob = opt.bob == null ? 6 : opt.bob, sway = opt.sway == null ? 2.5 : opt.sway;
    uses.forEach((u) => {
      const off = r() * period;
      const n = Math.max(1, Math.floor((dur - off) / (period / 2)));
      tl.fromTo(u, { y: 0, rotation: -sway * 0.5, transformOrigin: "50% 100%" }, { y: -bob, rotation: sway * 0.5, transformOrigin: "50% 100%", duration: period / 2, ease: "sine.inOut", repeat: n - 1, yoyo: true }, t0 + off);
    });
  };

  window.ClearCutRig = R;
})();
