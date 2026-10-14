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
  if (!svg || !back || !front || !helperLayer) return;

  // The app draws a 46 pt wide body; the site body is 200 units wide.
  const K = 200 / 46;
  const CENTER = { x: 110, y: 100 - 3 * K };         // the app lifts the atom's centre 3 pt
  const R = 30 * K;                                  // orbit radius
  const DOT = 3.1 * K * 0.8;                         // dot radius (app: 3.1 pt)
  const RING = 1.3 * K * 0.5;                        // dark ring around each dot
  const TILT = (68 * Math.PI) / 180;
  const LAP = 2;                                     // seconds per lap while "working"
  const CONNECTIONS = [
    ["Claude Code", "#D97757"], ["Claude Chat", "#F2AE6B"], ["ChatGPT", "#59A6FA"], ["Vercel", "#000000"],
    ["Gmail", "#EA4335"], ["Slack", "#2EB67D"], ["Notion", "#FFFFFF"],
  ];
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
    const ring = el("circle", { fill: "#141416" }, g);
    const dot = el("circle", { fill: color }, g);
    if (color === "#000000") dot.setAttribute("stroke", "#e9e9ec");   // thin light ring so black shows on dark
    return { g, ring, dot, color, psi: (i * Math.PI) / CONNECTIONS.length, angle: (i * 2 * Math.PI) / CONNECTIONS.length, front: false };
  });

  function placeAtoms(t) {
    const sway = calmMotion ? 0 : 0.5 * Math.sin((2 * Math.PI * t) / 10);
    for (const a of atoms) {
      const px = R * Math.cos(a.angle), py = R * Math.sin(a.angle);
      const y1 = py * Math.cos(TILT), z1 = py * Math.sin(TILT);
      const x2 = px * Math.cos(a.psi) - y1 * Math.sin(a.psi), y2 = px * Math.sin(a.psi) + y1 * Math.cos(a.psi);
      const x = x2 * Math.cos(sway) + z1 * Math.sin(sway), z = -x2 * Math.sin(sway) + z1 * Math.cos(sway);
      const cx = CENTER.x + x, cy = CENTER.y + y2;
      const depth = z / R;
      const size = DOT * (1 + 0.28 * depth);
      let alpha = 0.72 + 0.28 * (depth * 0.5 + 0.5);
      const inFront = z >= 0;
      if (inFront !== a.front) { (inFront ? front : back).appendChild(a.g); a.front = inFront; }
      if (inFront) {                                // keep dots from sitting on his eyes
        let nearest = 9;
        for (const e of EYES) nearest = Math.min(nearest, ((cx - e.x) / (11 + size)) ** 2 + ((cy - e.y) / (17 + size)) ** 2);
        alpha *= 0.3 + 0.7 * Math.min(1, Math.max(0, (nearest - 0.9) / 1.1));
      }
      a.ring.setAttribute("cx", cx); a.ring.setAttribute("cy", cy); a.ring.setAttribute("r", size + RING);
      a.ring.setAttribute("opacity", 0.9 * alpha);
      a.dot.setAttribute("cx", cx); a.dot.setAttribute("cy", cy); a.dot.setAttribute("r", size);
      a.dot.setAttribute("opacity", alpha);
      if (a.color === "#000000") a.dot.setAttribute("stroke-width", Math.max(0.8, size * 0.12));
    }
  }

  // Reduced motion: no orbiting. Park each atom where it is clearly visible (outside his body, apart from the others).
  function restAngles() {
    const placed = [];
    const helperSpots = [-1, 1].flatMap((s) => [25, 14].map((r) => ({ x: CENTER.x + s * 30 * K, y: 100 + r * K })));
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
  if (calmMotion) restAngles();

  /* ----- Helpers: at most 4, two on each side (two rows). ----- */
  const MAX = 4, LIFE = 5.5;                        // seconds before a helper leaves by itself
  const HW = 10.5 * K, HH = 9.5 * K;
  const slotPos = (s) => ({
    x: CENTER.x + (s % 2 === 0 ? -30 : 30) * K,
    y: 100 + (25 - Math.floor(s / 2) * 11) * K,
  });
  const helpers = [];
  let now = 0;

  function makeHelper(slot, t) {
    const g = el("g", {}, helperLayer);
    const body = el("rect", { fill: "#f8f8f8", stroke: "#cfcfd2", "stroke-width": 1.2 }, g);
    const eyeL = el("ellipse", { fill: "#000" }, g), eyeR = el("ellipse", { fill: "#000" }, g);
    const arcL = el("path", { fill: "none", stroke: "#000", "stroke-width": 0.9 * K * 0.6, "stroke-linecap": "round", display: "none" }, g);
    const arcR = el("path", { fill: "none", stroke: "#000", "stroke-width": 0.9 * K * 0.6, "stroke-linecap": "round", display: "none" }, g);
    return { g, body, eyeL, eyeR, arcL, arcR, slot, born: t, doneAt: null, phase: Math.random() * 6.28 };
  }

  function drawHelper(h, t) {
    const pos = slotPos(h.slot);
    const age = t - h.born;
    const p = calmMotion ? 1 : Math.min(1, Math.max(0, age / 0.28));        // grows from nothing, with a little overshoot
    const scale = calmMotion ? 1 : Math.max(0, 1 + 0.25 * Math.sin(p * Math.PI) * (p < 1 ? 1 : 0) - (1 - p));
    const travel = calmMotion ? 1 : p;
    const done = h.doneAt === null ? -1 : t - h.doneAt;
    let alpha = 1, hop = 0;
    if (done >= 0 && !calmMotion) {
      hop = 7 * K * Math.sin(Math.min(1, done / 0.5) * Math.PI);
      alpha = Math.max(0, 1 - Math.max(0, done - 0.45) / 0.45);
    }
    const bob = done >= 0 || calmMotion ? 0 : 1.1 * K * Math.sin(t * 4.2 + h.phase);
    const cx = CENTER.x + (pos.x - CENTER.x) * travel;          // pops out of his middle
    const cy = 100 + (pos.y - 100) * travel + bob - hop;
    const w = HW * Math.max(scale, 0.001), hh = HH * Math.max(scale, 0.001);
    h.g.setAttribute("opacity", alpha);
    h.body.setAttribute("x", cx - w / 2); h.body.setAttribute("y", cy - hh / 2);
    h.body.setAttribute("width", w); h.body.setAttribute("height", hh);
    h.body.setAttribute("rx", w * 0.42); h.body.setAttribute("ry", hh * 0.46);
    const toward = pos.x < CENTER.x ? 1 : -1;                   // eyes look at the big Orbi
    [[h.eyeL, h.arcL, -1], [h.eyeR, h.arcR, 1]].forEach(([eye, arc, side]) => {
      const ex = cx + side * 2.1 * K * scale + toward * 0.5 * K;
      if (done >= 0) {                                          // happy closed eyes
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
    if (live.length >= MAX) {                                   // oldest hops, happy, and fades; the new one takes its place
      const oldest = live.reduce((a, b) => (a.born <= b.born ? a : b));
      slot = oldest.slot;
      retire(oldest, t);
    } else {
      const used = new Set(live.map((h) => h.slot));
      slot = [0, 1, 2, 3].find((s) => !used.has(s));
    }
    helpers.push(makeHelper(slot, t));
    start();
    renderOnce(t);
    if (calmMotion) setTimeout(() => cull(performance.now() / 1000 + 100), LIFE * 1000); // no animation: simply disappear
  }

  function cull(t) {
    for (let i = helpers.length - 1; i >= 0; i--) {
      const h = helpers[i];
      if (h.doneAt === null && t - h.born > LIFE) retire(h, t);
      if (h.doneAt !== null && (calmMotion || t - h.doneAt > 0.95)) { h.g.remove(); helpers.splice(i, 1); }
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
    for (const a of atoms) a.angle += ((2 * Math.PI) / LAP) * dt;
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
