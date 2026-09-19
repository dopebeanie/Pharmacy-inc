/* Pharmacy INC. — UI-утилиты: тосты, форматирование, тексты песен, эффекты. */
import { Icons } from "./icons.js";

export function formatTime(sec) {
  if (!isFinite(sec) || sec == null || sec < 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ---- Toasts ---- */
let toastRoot = null;
function root() {
  if (!toastRoot) {
    toastRoot = document.getElementById("toasts");
    if (!toastRoot) {
      toastRoot = document.createElement("div");
      toastRoot.id = "toasts";
      toastRoot.setAttribute("aria-live", "polite");
      document.body.appendChild(toastRoot);
    }
  }
  return toastRoot;
}

const KIND_ICON = { success: "check", info: "info", error: "warn", download: "download", queue: "queue" };

export function toast(message, kind = "info", ms = 3200) {
  const el = document.createElement("div");
  el.className = `toast toast--${kind}`;
  el.setAttribute("role", "status");
  const icon = Icons[KIND_ICON[kind] || "info"] || Icons.info;
  el.innerHTML = `<span class="toast__icon">${icon}</span><span class="toast__text">${esc(message)}</span>`;
  root().appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  try {
    el.animate(
      [{ opacity: "0", transform: "translateX(48px)" }, { opacity: "1", transform: "translateX(0px)" }],
      { duration: 320, easing: "cubic-bezier(0.22,0.9,0.3,1)", fill: "backwards" }
    );
  } catch { /* остаётся CSS */ }
  let dead = false;
  const kill = () => {
    if (dead) return;
    dead = true;
    el.classList.remove("is-in");
    try {
      const an = el.animate(
        [{ opacity: "1", transform: "translateX(0px)" }, { opacity: "0", transform: "translateX(40px)" }],
        { duration: 240, easing: "ease-in", fill: "both" }
      );
      an.onfinish = () => el.remove();
      setTimeout(() => el.remove(), 450);
    } catch {
      setTimeout(() => el.remove(), 320);
    }
  };
  setTimeout(kill, ms);
  el.addEventListener("click", kill);
  while (root().children.length > 4) root().firstChild.remove();
}

/* ---- Тексты песен ---- */
export function parseLyrics(raw) {
  const text = String(raw || "").replace(/\r\n?/g, "\n").trim();
  if (!text) return { lines: [], synced: false };
  // LRC: [mm:ss.xx] строка
  const lrc = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/);
    if (m) {
      const ms = m[3] ? (m[3].length === 3 ? +m[3] : +m[3] * 10) : 0;
      lrc.push({ t: (+m[1]) * 60 + (+m[2]) + ms / 1000, text: (m[4] || "").trim() });
    }
  }
  if (lrc.length >= 3) {
    lrc.sort((a, b) => a.t - b.t);
    return { lines: lrc.map((x) => x.text), times: lrc.map((x) => x.t), synced: true };
  }
  // чистим редкие inline-таймкоды вида [01:23]
  const cleaned = text.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return { lines: cleaned.split("\n"), synced: false };
}

export async function fetchText(url) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

/* ---- Эффекты, реагирующие на курсор ---- */
const fine = matchMedia("(pointer: fine)").matches;
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function spotlight(scope = document) {
  if (!fine || calm) return;
  scope.querySelectorAll("[data-spot]").forEach((card) => {
    if (card.__spot) return;
    card.__spot = true;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

export function tilt(scope = document) {
  if (!fine || calm) return;
  scope.querySelectorAll("[data-tilt]").forEach((el) => {
    if (el.__tilt) return;
    el.__tilt = true;
    let raf = 0;
    el.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-2px)`;
      });
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      el.style.transform = "";
    });
  });
}

export function magnetic(scope = document) {
  if (!fine || calm) return;
  scope.querySelectorAll("[data-magnet]").forEach((btn) => {
    if (btn.__mag) return;
    btn.__mag = true;
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      btn.style.translate = `${(x / r.width).toFixed(3) * 5}px ${(y / r.height).toFixed(3) * 5}px`;
    });
    btn.addEventListener("pointerleave", () => { btn.style.translate = ""; });
  });
}

export function enhance(scope = document) {
  spotlight(scope); tilt(scope); magnetic(scope);
}

/* Каскадное появление элементов (WAAPI): карточки, строки, заголовки */
export function riseIn(scope, selector, { limit = 24, step = 35, dur = 380, dy = 14 } = {}) {
  try {
    const list = [...scope.querySelectorAll(selector)].slice(0, limit);
    list.forEach((el, i) => {
      try { if (el.__rise) el.__rise.cancel(); } catch { /* ignore */ }
      el.__rise = el.animate(
        [{ opacity: "0", transform: `translateY(${dy}px)` }, { opacity: "1", transform: "translateY(0px)" }],
        { duration: dur, delay: Math.min(i * step, 600), easing: "cubic-bezier(0.22,0.9,0.3,1)", fill: "backwards" }
      );
    });
  } catch { /* без анимации */ }
}

/* ---- Параллакс обложек от скролла ---- */
export function parallaxCovers() {
  if (calm) return;
  const els = document.querySelectorAll("[data-plx]");
  if (!els.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      const c = (r.top + r.height / 2 - vh / 2) / vh; // -0.5..0.5
      el.style.setProperty("--plx", `${(c * 14).toFixed(1)}px`);
    });
  };
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}
