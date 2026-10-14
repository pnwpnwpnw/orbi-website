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
