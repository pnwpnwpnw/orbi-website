// Set this to the GitHub repo that hosts Orbi releases, e.g. "your-name/orbi".
const REPO = "pnwpnwpnw/orbi-app";

const url = REPO ? `https://github.com/${REPO}/releases/latest` : "#install";
document.querySelectorAll("#release-link, #download-btn").forEach((a) => {
  a.href = url;
  if (REPO) { a.target = "_blank"; a.rel = "noopener"; }
});

// Pause the autoplaying intro video when it's off-screen.
const intro = document.querySelector("video[autoplay]");
if (intro && matchMedia("(prefers-reduced-motion: reduce)").matches) {
  intro.removeAttribute("autoplay");
  intro.pause();
  intro.controls = true;
} else if (intro && "IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => (e.isIntersecting ? intro.play().catch(() => {}) : intro.pause()), { threshold: 0.25 }).observe(intro);
}

// Dark mode toggle: follows the system until the visitor picks one.
const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");
const isDark = () =>
  root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const paint = () => {
  toggle.textContent = isDark() ? "☀" : "☾";
  toggle.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
};
paint();
toggle.addEventListener("click", () => {
  root.dataset.theme = isDark() ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  paint();
});

// Orbi the mascot: stays put, eyes follow the pointer, blinks, reacts to clicks.
const mascot = document.getElementById("mascot");
const eyes = document.getElementById("eyes");
const bubble = document.getElementById("bubble");
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

function look(x, y) {
  const r = mascot.getBoundingClientRect();
  const dx = x - (r.left + r.width / 2);
  const dy = y - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, d / 220) * 9;
  if (!calm) {
    mascot.style.setProperty("--tilt", `${(dx / Math.max(innerWidth, 1)) * 10}deg`);
    mascot.style.setProperty("--tx", `${(dx / Math.max(innerWidth, 1)) * 14}px`);
  }
  eyes.style.transform = `translate(${(dx / d) * k}px, ${(dy / d) * k * 0.7}px)`;
}
addEventListener("pointermove", (e) => look(e.clientX, e.clientY));
document.documentElement.addEventListener("mouseleave", () => (eyes.style.transform = ""));

function blink() {
  if (calm) return;
  mascot.classList.add("blink");
  setTimeout(() => mascot.classList.remove("blink"), 130);
}
(function loop() {
  setTimeout(() => { blink(); loop(); }, 2500 + Math.random() * 3500);
})();

const lines = ["Hi, I'm Orbi!", "Ask me anything.", "I walk around your screen.", "Eyes on you.", "Try ⌃⌘Space!", "Click me again!"];
let n = 0, hideTimer;
mascot.addEventListener("click", () => {
  bubble.textContent = lines[n++ % lines.length];
  bubble.classList.add("show");
  mascot.classList.add("happy");
  if (!calm) {
    mascot.classList.remove("hop");
    void mascot.offsetWidth;
    mascot.classList.add("hop");
  }
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    bubble.classList.remove("show");
    mascot.classList.remove("happy", "hop");
  }, 1800);
});
// Greet on first view.
setTimeout(() => bubble.classList.add("show"), 600);
setTimeout(() => bubble.classList.remove("show"), 3200);

// When nobody is moving the mouse, Orbi glances around now and then (stays in place).
let lastMove = Date.now();
addEventListener("pointermove", () => (lastMove = Date.now()));
if (!calm) {
  setInterval(() => {
    if (Date.now() - lastMove < 4000) return;
    const x = (Math.random() * 2 - 1) * 9, y = (Math.random() * 2 - 1) * 4;
    eyes.style.transform = `translate(${x}px, ${y}px)`;
    mascot.style.setProperty("--tilt", `${x * 0.4}deg`);
    mascot.style.setProperty("--tx", `${x * 0.5}px`);
    setTimeout(() => { eyes.style.transform = ""; mascot.style.setProperty("--tilt", "0deg"); mascot.style.setProperty("--tx", "0px"); }, 1400);
  }, 3200);
}

/* ---------- Atoms and helpers (same motion as the app: docs/orbiting-dots.md, BlobView.drawDots) ---------- */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("orbi-svg");
  const back = document.getElementById("atoms-back");
  const front = document.getElementById("atoms-front");
  const helperLayer = document.getElementById("helpers");
  const helperBack = document.getElementById("helpers-back");
  if (!svg || !back || !front || !helperLayer || !helperBack) return;

  // The app draws a 46 pt wide body; the site body is 200 units wide.
  const K = 200 / 46;
  const CENTER = { x: 110, y: 100 - 3 * K };         // the app lifts the atom's centre 3 pt
  const R = 34 * K;                                  // orbit radius
  const DOT = 3.1 * K * 0.8;                         // dot radius (app: 3.1 pt)
  const TILT = (68 * Math.PI) / 180;
  const LAP = 2;                                     // seconds per lap while "working"
  const CONNECTIONS = [
    ["Code agent", "#D97757"], ["Chat", "#F2AE6B"], ["ChatGPT", "#59A6FA"], ["Vercel", "#000000"],
    ["Gmail", "#EA4335"], ["Slack", "#2EB67D"], ["Notion", "#FFFFFF"],
  ];
  // Helpers run around Orbi on a flat horizontal loop in 3D: in front of him, out to the side, behind him, and back.
  const RING_RX = 150, RING_RZ = 125, RING_Y = 128, RING_TILT = 0.18;
  const SLOT_ANGLE = [0.85 * Math.PI, 0.15 * Math.PI, 0.65 * Math.PI, 0.35 * Math.PI];   // start points (all in front)
  const SLOT_SIZE = [1, 1.1, 0.92, 1.2];                                                    // slightly different loops so paths do not coincide
  const ring3 = (a, m = 1) => {
    const z = RING_RZ * m * Math.sin(a);                                                    // z > 0 is toward the viewer
    const feet = 190;                                                                       // the bottom edge of Orbi's body
    return { x: 110 + RING_RX * m * Math.cos(a), y: feet - (9.5 * K / 2) * (1 + 0.28 * z / (RING_RZ * m)), z };   // helpers stand on that line
  };
  const EYES = [{ x: 76, y: 92 }, { x: 144, y: 92 }];
  const calmMotion = matchMedia("(prefers-reduced-motion: reduce)").matches || /[?&]still\b/.test(location.search); // ?still previews the reduced-motion layout

  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // One atom per connection. Orbit planes are spread 180/7 degrees apart so they do not bunch.
  const atoms = CONNECTIONS.map(([name, color], i) => {
    const g = el("g", { "data-connection": name }, back);
    const glow = el("circle", { fill: color, filter: "url(#atom-glow)" }, g);
    const dot = el("circle", { fill: color }, g);
    return { g, glow, dot, color, plain: color === "#000000" || color === "#FFFFFF", psi: (i * Math.PI) / CONNECTIONS.length, i, presence: 0, active: false, spd: 1, spdT: 1, rad: 1, radT: 1, next: 0, angle: (i * 2 * Math.PI) / CONNECTIONS.length, front: false };
  });

  function placeAtoms(t) {
    const sway = calmMotion ? 0 : 0.5 * Math.sin((2 * Math.PI * t) / 10);
    for (const a of atoms) {
      if (a.presence <= 0.002) { if (!a.hidden) { a.g.setAttribute("display", "none"); a.hidden = true; } continue; }
      if (a.hidden) { a.g.removeAttribute("display"); a.hidden = false; }
      const e = a.presence * a.presence * (3 - 2 * a.presence);            // a new atom spirals out of his middle, a leaving one shrinks back in
      const r = R * a.rad * (0.35 + 0.65 * e), wob = calmMotion ? 0 : 1;                       // random moves: radius, tilt and plane drift a little
      const tilt = TILT + wob * 0.14 * Math.sin(t * 0.7 + a.i * 1.9), psi = a.psi + wob * 0.18 * Math.sin(t * 0.45 + a.i * 2.7);
      const px = r * Math.cos(a.angle), py = r * Math.sin(a.angle);
      const y1 = py * Math.cos(tilt), z1 = py * Math.sin(tilt);
      const x2 = px * Math.cos(psi) - y1 * Math.sin(psi), y2 = px * Math.sin(psi) + y1 * Math.cos(psi);
      const x = x2 * Math.cos(sway) + z1 * Math.sin(sway), z = -x2 * Math.sin(sway) + z1 * Math.cos(sway);
      const cx = CENTER.x + x, cy = CENTER.y + y2;
      const depth = z / R;
      const size = DOT * (1 + 0.28 * depth) * e;
      let alpha = 0.72 + 0.28 * (depth * 0.5 + 0.5);
      const inFront = z >= 0;
      if (inFront !== a.front) { (inFront ? front : back).appendChild(a.g); a.front = inFront; }
      if (inFront) {                                // keep dots from sitting on his eyes
        let nearest = 9;
        for (const e of EYES) nearest = Math.min(nearest, ((cx - e.x) / (11 + size)) ** 2 + ((cy - e.y) / (17 + size)) ** 2);
        alpha *= 0.3 + 0.7 * Math.min(1, Math.max(0, (nearest - 0.9) / 1.1));
      }
      // White and black atoms get a halo that contrasts with whatever is behind them (page or Orbi's white body).
      if (a.plain) {
        const overBody = inFront && ((cx - 110) / 100) ** 2 + ((cy - 100) / 90) ** 2 < 1;
        a.glow.setAttribute("fill", overBody || !isDark() ? "#000" : "#fff");
      }
      a.glow.setAttribute("cx", cx); a.glow.setAttribute("cy", cy); a.glow.setAttribute("r", size * 1.9);
      a.glow.setAttribute("opacity", (a.plain ? 0.28 : 0.32) * alpha);
      a.dot.setAttribute("cx", cx); a.dot.setAttribute("cy", cy); a.dot.setAttribute("r", size);
      a.dot.setAttribute("opacity", alpha);
    }
  }

  // Only up to 3 atoms are out at a time; which colors, and how many, changes at random.
  const MAX_ATOMS = 3;
  let nextSwap = 0, want = MAX_ATOMS;
  function shuffleActive(t) {
    want = Math.random() < 0.15 ? 1 : Math.random() < 0.6 ? MAX_ATOMS : 2;
    const act = atoms.filter((a) => a.active);
    for (let n = act.length; n > want; n--) act.splice(Math.floor(Math.random() * act.length), 1)[0].active = false;
    if (act.length && Math.random() < 0.5) act[Math.floor(Math.random() * act.length)].active = false;   // sometimes a color is swapped out
    nextSwap = t + 2.2 + Math.random() * 3;
  }
  // A new atom only comes out once there is room, so no more than 3 are ever on screen (leaving ones still count).
  function fillActive() {
    const shown = atoms.filter((a) => a.active || a.presence > 0.02).length;
    const act = atoms.filter((a) => a.active).length;
    if (act >= want || shown >= MAX_ATOMS) return;
    const idle = atoms.filter((a) => !a.active && a.presence <= 0.02);
    if (idle.length) idle[Math.floor(Math.random() * idle.length)].active = true;
  }
  function pickInitial() {
    const order = atoms.slice().sort(() => Math.random() - 0.5);
    order.slice(0, MAX_ATOMS).forEach((a) => (a.active = true));
  }

  // Reduced motion: no orbiting. Park each atom where it is clearly visible (outside his body, apart from the others).
  function restAngles() {
    const placed = [];
    const helperSpots = SLOT_ANGLE.map((a, s) => ring3(a, SLOT_SIZE[s]));
    const spot = (a, th) => {
      const px = R * Math.cos(th), py = R * Math.sin(th);
      const y1 = py * Math.cos(TILT);
      const x2 = px * Math.cos(a.psi) - y1 * Math.sin(a.psi), y2 = px * Math.sin(a.psi) + y1 * Math.cos(a.psi);
      return { x: CENTER.x + x2, y: CENTER.y + y2 };
    };
    for (const a of atoms) {
      let best = a.angle, bestScore = -1;
      for (let k = 0; k < 120; k++) {
        const th = (k / 120) * 2 * Math.PI, p = spot(a, th);
        const outside = ((p.x - 110) / 100) ** 2 + ((p.y - 100) / 90) ** 2;
        const gap = placed.reduce((m, q) => Math.min(m, Math.hypot(p.x - q.x, p.y - q.y)), 99);
        const clear = helperSpots.reduce((m, q) => Math.min(m, Math.hypot(p.x - q.x, p.y - q.y)), 99);
        const score = Math.min(outside, 1.5) + Math.min(gap, 60) / 30 + Math.min(clear, 70) / 25;
        if (score > bestScore) { bestScore = score; best = th; }
      }
      a.angle = best;
      placed.push(spot(a, best));
    }
  }
  pickInitial();
  if (calmMotion) { restAngles(); atoms.forEach((a) => (a.presence = a.active ? 1 : 0)); }

  /* ----- Helpers: at most 4. Each runs around Orbi for about 20 s, then vanishes back inside him. ----- */
  const MAX = 4, LIFE = 20, VANISH = 0.5;
  const HW = 10.5 * K, HH = 9.5 * K;
  const helpers = [];
  const ease = (x) => x * x * (3 - 2 * x);

  function makeHelper(slot, t) {
    const g = el("g", {}, helperLayer);
    const body = el("rect", { fill: "#f8f8f8", stroke: "#cfcfd2", "stroke-width": 1.2 }, g);
    const eyeL = el("ellipse", { fill: "#000" }, g), eyeR = el("ellipse", { fill: "#000" }, g);
    const arcL = el("path", { fill: "none", stroke: "#000", "stroke-width": 0.9 * K * 0.6, "stroke-linecap": "round", display: "none" }, g);
    const arcR = el("path", { fill: "none", stroke: "#000", "stroke-width": 0.9 * K * 0.6, "stroke-linecap": "round", display: "none" }, g);
    return { g, body, eyeL, eyeR, arcL, arcR, slot, dir: slot % 2 ? -1 : 1, front: true, born: t, doneAt: null, phase: Math.random() * 6.28 };
  }

  function drawHelper(h, t) {
    const age = t - h.born;
    const out = calmMotion ? 1 : ease(Math.min(1, Math.max(0, age / 0.28)));          // pops out of his middle
    const grow = calmMotion ? 1 : Math.min(1, Math.max(0, age / 0.28));
    const done = h.doneAt === null ? -1 : t - h.doneAt;
    const q = done < 0 ? 0 : Math.min(1, done / VANISH);                              // 0 = out and about, 1 = back inside Orbi
    const running = !calmMotion && done < 0;
    const angle = SLOT_ANGLE[h.slot] + (calmMotion ? 0 : h.dir * (0.62 * age + 0.4 * Math.sin(0.8 * age + h.phase)));
    const target = ring3(angle, SLOT_SIZE[h.slot]);
    const depth = target.z / (RING_RZ * SLOT_SIZE[h.slot]);
    const inFront = done >= 0 || age < 0.3 || target.z >= 0;                          // behind him only while out and about
    if (inFront !== h.front) { (inFront ? helperLayer : helperBack).appendChild(h.g); h.front = inFront; }
    const travel = out * (1 - ease(q));
    const scale = Math.max(0, 1 + (calmMotion ? 0 : 0.25 * Math.sin(grow * Math.PI) * (grow < 1 ? 1 : 0)) - (1 - grow)) * (1 - q) * (1 + 0.28 * depth * travel);
    const hop = running ? Math.abs(Math.sin(age * 9 + h.phase)) * 0.9 * K : 0;       // little running hops
    const cx = 110 + (target.x - 110) * travel;
    const cy = 100 + (target.y - 100) * travel - hop * travel;
    const w = HW * Math.max(scale, 0.001), hh = HH * Math.max(scale, 0.001);
    h.body.setAttribute("x", cx - w / 2); h.body.setAttribute("y", cy - hh / 2);
    h.body.setAttribute("width", w); h.body.setAttribute("height", hh);
    h.body.setAttribute("rx", w * 0.42); h.body.setAttribute("ry", hh * 0.46);
    const toward = target.x < 110 ? 1 : -1;                                           // eyes look at the big Orbi
    [[h.eyeL, h.arcL, -1], [h.eyeR, h.arcR, 1]].forEach(([eye, arc, side]) => {
      const ex = cx + side * 2.1 * K * scale + toward * 0.5 * K;
      if (done >= 0) {                                                                // happy closed eyes while going in
        const r = 1.1 * K * scale, y = cy + 0.4 * K * scale - r * 0.34;
        eye.setAttribute("display", "none"); arc.removeAttribute("display");
        arc.setAttribute("d", `M ${ex - r * 0.94} ${y} A ${r} ${r} 0 0 1 ${ex + r * 0.94} ${y}`);
      } else {
        arc.setAttribute("display", "none"); eye.removeAttribute("display");
        eye.setAttribute("cx", ex); eye.setAttribute("cy", cy); eye.setAttribute("rx", 0.7 * K * scale); eye.setAttribute("ry", 1.15 * K * scale);
      }
    });
  }

  function retire(h, t) { if (h.doneAt === null) h.doneAt = t; }

  function spawnHelper() {
    const t = performance.now() / 1000;
    const live = helpers.filter((h) => h.doneAt === null);
    let slot;
    if (live.length >= MAX) {                                   // the oldest goes back inside Orbi; the new one takes its place
      const oldest = live.reduce((a, b) => (a.born <= b.born ? a : b));
      slot = oldest.slot;
      retire(oldest, t);
    } else {
      const used = new Set(live.map((h) => h.slot));
      slot = [0, 1, 2, 3].find((s) => !used.has(s));
    }
    cull(t);
    helpers.push(makeHelper(slot, t));
    start();
    renderOnce(t);
    if (calmMotion) setTimeout(() => { cull(performance.now() / 1000); }, LIFE * 1000 + 50);   // no animation: they just disappear
  }

  function cull(t) {
    for (let i = helpers.length - 1; i >= 0; i--) {
      const h = helpers[i];
      if (h.doneAt === null && t - h.born >= LIFE) retire(h, t);
      if (h.doneAt !== null && (calmMotion || t - h.doneAt > VANISH)) { h.g.remove(); helpers.splice(i, 1); }
    }
  }

  function renderOnce(t) {
    now = t;
    placeAtoms(t);
    for (const h of helpers) drawHelper(h, t);
  }

  /* ----- Loop: runs only while the tab is visible and Orbi is on screen. ----- */
  let raf = 0, last = 0, onScreen = true;
  const wanted = () => !calmMotion && onScreen && !document.hidden;
  function frame(ts) {
    raf = 0;
    if (!wanted()) return;
    const t = ts / 1000;
    const dt = Math.min(0.1, last ? t - last : 0);
    last = t;
    if (t > nextSwap) shuffleActive(t);
    fillActive();
    for (const a of atoms) {
      a.presence = Math.min(1, Math.max(0, a.presence + (a.active ? dt : -dt) / 0.7));
      if (t > a.next) {                                                   // every few seconds each atom picks a new pace and reach
        a.spdT = Math.random() < 0.18 ? 1.7 + Math.random() * 0.6 : 0.55 + Math.random() * 0.9;
        a.radT = 0.86 + Math.random() * 0.2;
        a.next = t + 1.2 + Math.random() * 2.8;
      }
      a.spd += (a.spdT - a.spd) * Math.min(1, dt / 0.6);
      a.rad += (a.radT - a.rad) * Math.min(1, dt / 0.8);
      a.angle += ((2 * Math.PI) / LAP) * a.spd * dt;
    }
    cull(t);
    renderOnce(t);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && wanted()) { last = 0; raf = requestAnimationFrame(frame); } }
  document.addEventListener("visibilitychange", () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : start()));
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) start(); else { cancelAnimationFrame(raf); raf = 0; } }, { threshold: 0 }).observe(svg);
  }

  document.getElementById("mascot").addEventListener("click", spawnHelper);
  renderOnce(performance.now() / 1000);
  start();
})();

// Past the hero, Orbi docks into the corner so the atoms keep orbiting while you scroll.
(() => {
  const slot = document.getElementById("mascot-slot"), wrap = document.getElementById("mascot-wrap");
  if (!slot || !wrap || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(([e]) => wrap.classList.toggle("docked", !e.isIntersecting && e.boundingClientRect.bottom < 0)).observe(slot);
})();
