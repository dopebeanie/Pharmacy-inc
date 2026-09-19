/* Pharmacy INC. — главный модуль: каталог, списки треков, текст песни, очередь, поиск, шорткаты. */
import { ALBUMS as EMBED_ALBUMS, TRACKS as EMBED_TRACKS } from "./data.js?v=3";
import { Player, RepeatMode } from "./player.js?v=4";
import { Icons } from "./icons.js?v=2";
import { formatTime, esc, toast, parseLyrics, fetchText, enhance, parallaxCovers, riseIn } from "./ui.js?v=2";

const ARTIST_NAME = "ЛОСТЕНСОУЛ";
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let ALBUMS = EMBED_ALBUMS;
let TRACKS = EMBED_TRACKS;
try {
  const [a, t] = await Promise.all([
    fetch("data/albums.json?v=3").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch("data/tracks.json?v=3").then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  if (Array.isArray(a) && a.length) ALBUMS = a;
  if (Array.isArray(t) && t.length) TRACKS = t;
} catch { /* работаем со встроенными данными */ }

const albumById = new Map(ALBUMS.map((a) => [a.id, a]));
for (const t of TRACKS) t.albumTitle = albumById.get(t.albumId)?.title || "";
const byId = new Map(TRACKS.map((t) => [t.id, t]));

/* ---------- DOM ---------- */
const els = {
  albumGrid: $("#albumGrid"),
  trackList: $("#trackList"),
  trackCount: $("#trackCount"),
  search: $("#search"),
  albumFilter: $("#albumFilter"),
  audio: null,
  cover: $("#npCover"),
  title: $("#npTitle"),
  artist: $("#npArtist"),
  play: $("#btnPlay"),
  prev: $("#btnPrev"),
  next: $("#btnNext"),
  seek: $("#seek"),
  cur: $("#tCur"),
  dur: $("#tDur"),
  vol: $("#vol"),
  mute: $("#btnMute"),
  shuffle: $("#btnShuffle"),
  repeat: $("#btnRepeat"),
  queueBtn: $("#btnQueue"),
  lyricsBtn: $("#btnLyrics"),
  dl: $("#btnDownload"),
  queuePanel: $("#queuePanel"),
  queueList: $("#queueList"),
  queueClose: $("#queueClose"),
  queueClear: $("#queueClear"),
  lyricsPanel: $("#lyricsPanel"),
  lyricsBody: $("#lyricsBody"),
  lyricsTitle: $("#lyricsTitle"),
  lyricsClose: $("#lyricsClose"),
  backdrop: $("#backdrop"),
  artistImg: $("#artistImg"),
  statTracks: $("#statTracks"),
  statAlbums: $("#statAlbums"),
  statTime: $("#statTime"),
  year: $("#year"),
  dbg: $("#dbg"),
};

const DBG = new URLSearchParams(location.search).has("debug");
if (DBG && els.dbg) els.dbg.hidden = false;

function updDbg() {
  if (!els.dbg || els.dbg.hidden) return;
  const a = player.audio;
  let ranges = "none";
  try {
    const s = [];
    for (let i = 0; i < a.seekable.length; i++) s.push(`${a.seekable.start(i).toFixed(0)}-${a.seekable.end(i).toFixed(0)}`);
    if (s.length) ranges = s.join(",");
  } catch { ranges = "n/a"; }
  els.dbg.textContent =
    `t=${a.currentTime.toFixed(1)}/${isFinite(a.duration) ? a.duration.toFixed(1) : "?"} ` +
    `rs=${a.readyState} net=${a.networkState} err=${a.error ? a.error.code : "-"} ` +
    `playing=${player.playing} seeking=${a.seeking} ` +
    `seekable=[${ranges}] lastSeek=${player.lastSeekTarget ?? "-"} ` +
    `src=${(a.currentSrc || a.src).split("/").pop()}`;
}

/* ---------- Player ---------- */
const player = new Player({ onEvent: onPlayer });
player.setCatalog(TRACKS);
els.audio = player.audio;
document.getElementById("playerAudioSlot").appendChild(els.audio);

let activeAlbum = "pharmacy-1";
let query = "";
let lastFocus = null;
let lastNpId = null;
let scrubbing = false;

function visibleTracks() {
  const q = query.trim().toLowerCase();
  return TRACKS.filter((t) => {
    if (activeAlbum !== "all" && t.albumId !== activeAlbum) return false;
    if (!q) return true;
    const hay = `${t.title} ${t.artist} ${t.feat || ""} ${t.producer || ""} ${t.albumTitle}`.toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
}

/* ---------- Рендер: альбомы ---------- */
function renderAlbums() {
  els.albumGrid.innerHTML = ALBUMS.map((a) => {
    const n = a.trackIds.length;
    const total = a.trackIds.reduce((s, id) => s + (byId.get(id)?.duration || 0), 0);
    return `
    <article class="album-card" data-spot data-tilt data-album="${a.id}" style="--acc:${a.accent}" tabindex="0" role="button" aria-label="Открыть альбом ${esc(a.title)}">
      <div class="album-card__glow"></div>
      <div class="album-card__cover"><img data-plx src="${a.cover}" alt="Обложка альбома ${esc(a.title)}" loading="lazy"></div>
      <div class="album-card__body">
        <div class="album-card__kicker">Альбом · ${a.year || "TODO: год"}</div>
        <h3 class="album-card__title">${esc(a.title)}</h3>
        <p class="album-card__sub">${esc(a.subtitle || "")}</p>
        ${a.about ? `<p class="album-card__desc">${esc(a.about)}</p>` : ""}
        <div class="album-card__meta"><span>${n} треков</span><span class="dot"></span><span>${formatTime(total)}</span></div>
        <div class="album-card__actions">
          <button class="btn btn--primary" data-play-album="${a.id}" data-magnet aria-label="Слушать альбом ${esc(a.title)}">${Icons.play}<span>Слушать</span></button>
          <button class="btn btn--ghost" data-open-album="${a.id}" data-magnet aria-label="Список треков">Треки ${Icons.chevron}</button>
        </div>
      </div>
    </article>`;
  }).join("");
  enhance(els.albumGrid);
  riseIn(els.albumGrid, ".album-card", { limit: 6, step: 80, dur: 420, dy: 18 });
}

/* ---------- Рендер: треки ---------- */
function rowHTML(t) {
  const cur = player.current();
  const active = cur?.id === t.id;
  return `
  <div class="track${active ? " is-active" : ""}${active && player.playing ? " is-playing" : ""}" data-track="${t.id}" data-spot tabindex="0" role="button" aria-label="Играть ${esc(t.title)}">
    <button class="track__num" data-act="play" aria-label="${active && player.playing ? "Пауза" : "Играть"}">
      <span class="track__idx">${String(t.trackNumber).padStart(2, "0")}</span>
      <span class="track__ic">${active && player.playing ? Icons.pause : Icons.play}</span>
      ${active && player.playing ? `<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>` : ""}
    </button>
    <img class="track__cover" src="${t.cover}" alt="" loading="lazy">
    <div class="track__main">
      <div class="track__title"><span>${esc(t.title)}</span>${t.producer ? `<span class="track__prod">prod. by ${esc(t.producer)}</span>` : ""} ${active && player.playing ? `<span class="badge">играет</span>` : ""}</div>
      <div class="track__sub">${esc(t.artist)}${t.feat ? ` · feat. ${esc(t.feat)}` : ""}</div>
    </div>
    <div class="track__dur">${formatTime(t.duration)}</div>
    <div class="track__menu">
      <button class="icon-btn" data-act="queue" data-magnet aria-label="В очередь: ${esc(t.title)}" title="В очередь (Q)">${Icons.queue}</button>
      <button class="icon-btn" data-act="lyrics" data-magnet aria-label="Текст песни ${esc(t.title)}" title="Текст (L)">${Icons.lyrics}</button>
      <button class="icon-btn" data-act="dl" data-magnet aria-label="Скачать ${esc(t.title)}" title="Скачать">${Icons.download}</button>
    </div>
  </div>`;
}

function renderTracks(animate = false) {
  const list = visibleTracks();
  els.trackCount.textContent = `${list.length} из ${TRACKS.length}`;
  els.trackList.innerHTML = list.length
    ? list.map(rowHTML).join("")
    : `<div class="empty">${Icons.search}<p>Ничего не найдено.<br><span>Попробуйте другой запрос или альбом.</span></p></div>`;
  enhance(els.trackList);
  if (animate) riseIn(els.trackList, ".track", { limit: 24, step: 30, dur: 360 });
}

let lastActiveId = null;
function refreshActiveRow() {
  const cur = player.current();
  $$("#trackList .track").forEach((row) => {
    const on = row.dataset.track === cur?.id;
    row.classList.toggle("is-active", on);
    row.classList.toggle("is-playing", on && player.playing);
  });
  // перерисовываем текущий и предыдущий треки, чтобы убрать старый бейдж
  const ids = new Set();
  if (cur) ids.add(cur.id);
  if (lastActiveId) ids.add(lastActiveId);
  $$("#trackList .track.is-active").forEach((r) => ids.add(r.dataset.track));
  ids.forEach((id) => {
    const row = $(`#trackList .track[data-track="${CSS.escape(id)}"]`);
    const t = byId.get(id);
    if (row && t) row.outerHTML = rowHTML(t);
  });
  lastActiveId = cur?.id || null;
  enhance(els.trackList);
}

/* ---------- Now playing ---------- */
function renderNP() {
  const t = player.current();
  if (!t) return;
  els.cover.src = t.cover;
  els.cover.alt = `Обложка: ${t.title}`;
  els.title.textContent = t.title;
  els.artist.textContent = `${t.artist}${t.feat ? ` · feat. ${t.feat}` : ""}`;
  document.title = `${t.title} — ${t.artist} · Pharmacy INC.`;
  if (lastNpId !== t.id) {
    lastNpId = t.id;
    try {
      [els.cover, els.title, els.artist].forEach((el, i) => {
        el.animate(
          [{ opacity: "0", transform: "translateY(6px)" }, { opacity: "1", transform: "translateY(0px)" }],
          { duration: 300, delay: i * 40, easing: "ease-out", fill: "backwards" }
        );
      });
    } catch { /* без анимации */ }
  }
  els.dur.textContent = formatTime(player.audio.duration || t.duration);
  els.play.innerHTML = player.playing ? Icons.pause : Icons.play;
  els.play.setAttribute("aria-label", player.playing ? "Пауза (Space)" : "Играть (Space)");
  els.play.classList.toggle("is-playing", player.playing);
  syncModeButtons();
  syncSeek();
}

function syncSeek() {
  const a = player.audio;
  const t = player.current();
  const dur = a.duration || t?.duration || 0;
  if (!scrubbing) els.cur.textContent = formatTime(a.currentTime);
  els.dur.textContent = formatTime(dur);
  if (dur > 0 && !scrubbing) {
    els.seek.value = String((a.currentTime / dur) * 1000);
    els.seek.style.setProperty("--fill", `${(a.currentTime / dur) * 100}%`);
    els.seek.setAttribute("aria-valuetext", `${formatTime(a.currentTime)} из ${formatTime(dur)}`);
  }
  highlightLyric(a.currentTime);
  updDbg();
}

function syncVolume() {
  els.vol.value = String(Math.round(player.volume * 100));
  els.vol.style.setProperty("--fill", `${Math.round(player.volume * 100)}%`);
  els.mute.innerHTML = player.muted || player.volume === 0 ? Icons.mute : Icons.volume;
  els.mute.setAttribute("aria-label", player.muted ? "Включить звук (M)" : "Выключить звук (M)");
  els.mute.classList.toggle("is-off", player.muted);
}

function syncModeButtons() {
  els.shuffle.classList.toggle("is-on", player.shuffle);
  els.shuffle.setAttribute("aria-pressed", String(player.shuffle));
  els.shuffle.setAttribute("aria-label", `Перемешать: ${player.shuffle ? "вкл" : "выкл"} (S)`);
  const r = player.repeat;
  els.repeat.classList.toggle("is-on", r !== RepeatMode.OFF);
  els.repeat.innerHTML = r === RepeatMode.ONE ? Icons.repeatOne : Icons.repeat;
  els.repeat.setAttribute("aria-label", `Повтор: ${r === RepeatMode.OFF ? "выкл" : r === RepeatMode.ALL ? "все" : "один"} (R)`);
}

/* ---------- Очередь ---------- */
function renderQueue() {
  const cur = player.current();
  const queued = player.queue.map((id) => byId.get(id)).filter(Boolean);
  const up = player.upcoming().filter((u) => !u.queued);
  els.queueList.innerHTML =
    (cur ? `<div class="q-now"><span>Сейчас играет</span><strong>${esc(cur.title)}</strong></div>` : "") +
    `<div class="q-sec">Моя очередь · ${queued.length}</div>` +
    (queued.length
      ? queued.map((t) => `
      <div class="q-row" data-q="${esc(t.id)}">
        <span class="q-row__n">Q</span>
        <div class="q-row__main"><strong>${esc(t.title)}</strong><span>${esc(t.artist)}</span></div>
        <span class="q-row__d">${formatTime(t.duration)}</span>
        <button class="icon-btn q-row__x" data-unq="${esc(t.id)}" aria-label="Убрать из очереди: ${esc(t.title)}" title="Убрать">${Icons.close}</button>
      </div>`).join("")
      : `<div class="q-empty">Пусто — наведите на трек и нажмите «В очередь»</div>`) +
    `<div class="q-sec">Далее по альбому</div>` +
    (up.length
      ? up.map((u, i) => `
      <div class="q-row" data-q="${esc(u.track.id)}">
        <span class="q-row__n">${String(i + 1).padStart(2, "0")}</span>
        <div class="q-row__main"><strong>${esc(u.track.title)}</strong><span>${esc(u.track.artist)}</span></div>
        <span class="q-row__d">${formatTime(u.track.duration)}</span>
      </div>`).join("")
      : `<div class="q-empty">Дальше треков нет</div>`);
}

function syncBackdrop() {
  if (!els.backdrop) return;
  const any = els.queuePanel.classList.contains("is-open") || els.lyricsPanel.classList.contains("is-open");
  const was = els.backdrop.classList.contains("is-on");
  els.backdrop.classList.toggle("is-on", any);
  if (was === any) return;
  try {
    if (els.backdrop.__fade) els.backdrop.__fade.cancel();
    const an = els.backdrop.animate(
      any ? [{ opacity: "0" }, { opacity: "1" }] : [{ opacity: "1" }, { opacity: "0" }],
      { duration: 350, easing: "ease", fill: "both" }
    );
    els.backdrop.__fade = an;
    an.onfinish = () => { if (els.backdrop.__fade === an) { an.cancel(); els.backdrop.__fade = null; } };
  } catch { /* нет WAAPI — остаётся CSS */ }
}

/* Плавные Fade In / Fade Out через WAAPI — не зависят от CSS-переходов */
function playPanelAnim(panel, opening) {
  try {
    if (panel.__anim) panel.__anim.cancel();
    const pop = panel.classList.contains("lyrics-pop");
    const side = panel.classList.contains("sheet--right") ? 1 : -1;
    const from = opening
      ? (pop ? "translate(-50%, 18px) scale(0.96)" : `translateX(${side * 56}px)`)
      : (pop ? "translate(-50%, 0px) scale(1)" : "translateX(0px)");
    const to = opening
      ? (pop ? "translate(-50%, 0px) scale(1)" : "translateX(0px)")
      : (pop ? "translate(-50%, 12px) scale(0.97)" : `translateX(${side * 36}px)`);
    const an = panel.animate(
      [{ opacity: opening ? "0" : "1", transform: from }, { opacity: opening ? "1" : "0", transform: to }],
      { duration: opening ? 380 : 260, easing: opening ? "cubic-bezier(0.22,0.9,0.3,1.05)" : "ease-in", fill: "both" }
    );
    panel.__anim = an;
    const done = an.finished.catch(() => {}).then(() => {
      if (panel.__anim === an) { an.cancel(); panel.__anim = null; }
    });
    return done;
  } catch { return Promise.resolve(); }
}

function cascadeLines() {
  try {
    lyricLineEls.slice(0, 14).forEach((el, i) => {
      el.animate(
        [{ opacity: "0", transform: "translateY(10px)" }, { opacity: "1", transform: "translateY(0px)" }],
        { duration: 350, delay: Math.min(i * 30, 390), easing: "ease-out", fill: "backwards" }
      );
    });
  } catch { /* нет WAAPI — текст просто появится */ }
}

function openPanel(panel) {
  lastFocus = document.activeElement;
  panel.__token = (panel.__token || 0) + 1;
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  syncBackdrop();
  playPanelAnim(panel, true);
  const f = panel.querySelector("button");
  if (f) f.focus({ preventScroll: true });
}
function closePanel(panel) {
  if (!panel.classList.contains("is-open") && !panel.__anim) return;
  const token = (panel.__token = (panel.__token || 0) + 1);
  playPanelAnim(panel, false).then(() => {
    if (panel.__token !== token) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    syncBackdrop();
  });
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

/* ---------- Текст песни ---------- */
let lyricTimes = null;
let lyricLineEls = [];
let lyricTrackId = null;

async function openLyrics(id) {
  const t = byId.get(id) || player.current();
  if (!t) { toast("Нет активного трека", "info"); return; }
  lyricTrackId = t.id;
  els.lyricsTitle.textContent = `${t.title} — текст`;
  els.lyricsBody.innerHTML = `<div class="lyr-load"><span class="spinner"></span>Загрузка текста…</div>`;
  openPanel(els.lyricsPanel);
  try {
    const raw = await fetchText(t.lyrics);
    const parsed = parseLyrics(raw);
    lyricTimes = parsed.synced ? parsed.times : null;
    if (!parsed.lines.length) throw new Error("empty");
    els.lyricsBody.innerHTML = parsed.lines.map((l) =>
      l.trim() === "" ? `<div class="lyr-empty"></div>` : `<p class="lyr-line">${esc(l)}</p>`).join("");
    lyricLineEls = [...els.lyricsBody.querySelectorAll(".lyr-line")];
    cascadeLines();
    highlightLyric(player.audio.currentTime);
  } catch {
    lyricTimes = null;
    els.lyricsBody.innerHTML = `<div class="lyr-missing">${Icons.lyrics}<p>Текст недоступен</p><span>TODO: добавьте файл ${esc(t.lyrics)}</span></div>`;
  }
}

function highlightLyric(time) {
  if (!lyricTimes || !lyricLineEls.length || !els.lyricsPanel.classList.contains("is-open")) return;
  let active = -1;
  for (let i = 0; i < lyricTimes.length; i++) if (time >= lyricTimes[i]) active = i;
  lyricLineEls.forEach((el, i) => el.classList.toggle("is-on", i === active));
  const on = lyricLineEls[active];
  if (on) on.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* ---------- Приветствие ---------- */
const WELCOME_KEY = "pharmacy-inc-welcomeSeen";
function welcomeSeen() {
  try { return localStorage.getItem(WELCOME_KEY) === "1"; } catch { return true; }
}
function persistWelcome() {
  try {
    if (document.getElementById("welcomeHide")?.checked) localStorage.setItem(WELCOME_KEY, "1");
  } catch { /* ignore */ }
}
function showWelcome() {
  const w = document.getElementById("welcome");
  if (!w || w.classList.contains("is-open")) return;
  w.classList.add("is-open");
  w.setAttribute("aria-hidden", "false");
  try {
    w.querySelector(".welcome__card").animate(
      [{ opacity: "0", transform: "translateY(16px) scale(0.95)" }, { opacity: "1", transform: "translateY(0px) scale(1)" }],
      { duration: 420, easing: "cubic-bezier(0.22,0.9,0.3,1.1)", fill: "backwards" }
    );
  } catch { /* без анимации */ }
  document.getElementById("welcomeGo")?.focus({ preventScroll: true });
}
function hideWelcome(target) {
  const w = document.getElementById("welcome");
  if (!w || !w.classList.contains("is-open")) {
    if (target) $(target)?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  persistWelcome();
  const done = () => {
    w.classList.remove("is-open");
    w.setAttribute("aria-hidden", "true");
    if (target) $(target)?.scrollIntoView({ behavior: "smooth" });
  };
  try {
    const an = w.animate([{ opacity: "1" }, { opacity: "0" }], { duration: 240, easing: "ease-in", fill: "both" });
    an.onfinish = () => { an.cancel(); done(); };
    setTimeout(done, 450);
  } catch { done(); }
}

/* ---------- Обложки + лайтбокс ---------- */
function renderCovers() {
  const grid = document.getElementById("coverGrid");
  if (!grid) return;
  const items = [
    ...ALBUMS.map((a) => ({ src: a.cover, title: a.title, sub: `Альбом · ${a.year || ""}`.trim() })),
    { src: "assets/covers/artist.jpg", title: ARTIST_NAME, sub: "Исполнитель" },
  ];
  grid.innerHTML = items.map((c) => `
    <figure class="cover-card" data-spot data-tilt tabindex="0" role="button" data-cover="${c.src}" data-cap="${esc(c.title)}" aria-label="Открыть обложку: ${esc(c.title)}">
      <img src="${c.src}" alt="Обложка: ${esc(c.title)}" loading="lazy">
      <figcaption><strong>${esc(c.title)}</strong><span>${esc(c.sub)}</span></figcaption>
    </figure>`).join("");
  enhance(grid);
  try {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { riseIn(grid, ".cover-card", { limit: 6, step: 80, dur: 420 }); io.disconnect(); }
    }), { threshold: 0.12 });
    io.observe(grid);
  } catch { /* без анимации */ }
}

function openLightbox(src, cap) {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  const img = document.getElementById("lightboxImg");
  img.src = src;
  img.alt = `Обложка крупно: ${cap}`;
  document.getElementById("lightboxCap").textContent = cap;
  lb.classList.add("is-open");
  lb.setAttribute("aria-hidden", "false");
  try {
    lb.querySelector(".lightbox__frame").animate(
      [{ opacity: "0", transform: "scale(0.94) translateY(10px)" }, { opacity: "1", transform: "scale(1) translateY(0px)" }],
      { duration: 340, easing: "cubic-bezier(0.22,0.9,0.3,1.1)", fill: "backwards" }
    );
  } catch { /* без анимации */ }
  document.getElementById("lightboxClose")?.focus({ preventScroll: true });
}
function closeLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb || !lb.classList.contains("is-open")) return;
  lb.classList.remove("is-open");
  lb.setAttribute("aria-hidden", "true");
}

/* ---------- События плеера ---------- */
function onPlayer(kind) {
  if (kind === "track") { renderNP(); refreshActiveRow(); renderQueue(); if (els.lyricsPanel.classList.contains("is-open") && lyricTrackId !== player.current()?.id) openLyrics(player.current().id); }
  else if (kind === "state") { renderNP(); refreshActiveRow(); }
  else if (kind === "time") syncSeek();
  else if (kind === "seeked") syncSeek();
  else if (kind === "meta") renderNP();
  else if (kind === "volume") syncVolume();
  else if (kind === "mode") syncModeButtons();
  else if (kind === "queue") renderQueue();
  else if (kind === "error" || kind === "error-nofile") {
    const t = player.current();
    const code = player.audio.error ? player.audio.error.code : 0;
    toast(t ? `Файл не найден: ${t.src}${code ? ` (err ${code})` : ""}. Скопируйте аудио через tools/copy-audio.` : "Аудиофайл недоступен", "error", 5000);
  }
  else if (kind === "ended-queue") toast("Очередь завершена", "info");
}

/* ---------- Скачивание ---------- */
async function downloadTrack(id) {
  const t = byId.get(id) || player.current();
  if (!t) return;
  toast(`Скачивание: ${t.title}`, "download");
  try {
    const res = await fetch(t.src);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t.src.split("/").pop() || `${t.id}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    toast("Файл сохранён", "success");
  } catch {
    // fallback: прямое скачивание ссылкой
    const a = document.createElement("a");
    a.href = t.src;
    a.download = t.src.split("/").pop() || `${t.id}.mp3`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Если файл не скачался — добавьте аудио в assets/audio", "info", 4500);
  }
}

/* ---------- Слушатели ---------- */
els.play.addEventListener("click", () => player.toggle());
els.prev.addEventListener("click", () => player.prev());
els.next.addEventListener("click", () => player.next());
els.seek.addEventListener("pointerdown", () => { scrubbing = true; });
window.addEventListener("pointerup", () => { scrubbing = false; });
els.seek.addEventListener("input", () => {
  const t = player.current();
  const dur = player.audio.duration || t?.duration || 0;
  if (!dur) return;
  const target = (+els.seek.value / 1000) * dur;
  els.seek.style.setProperty("--fill", `${+els.seek.value / 10}%`);
  els.cur.textContent = formatTime(target);
  if (player.audio.readyState > 0) player.seekTo(target);
});
els.seek.addEventListener("change", () => {
  scrubbing = false;
  const t = player.current();
  const dur = player.audio.duration || t?.duration || 0;
  if (!dur) { syncSeek(); return; }
  if (player.audio.readyState === 0) {
    toast("Файл ещё загружается — подождите секунду и мотайте снова", "info");
    syncSeek();
    return;
  }
  player.seekTo((+els.seek.value / 1000) * dur);
  // syncSeek() здесь НЕ вызываем: currentTime обновится асинхронно,
  // правду покажет событие seeked. Ползунок уже стоит на цели.
  els.dur.textContent = formatTime(dur);
  setTimeout(() => { if (!player.audio.seeking) syncSeek(); }, 1200);
});
els.vol.addEventListener("input", () => {
  player.setVolume(+els.vol.value / 100);
  els.vol.style.setProperty("--fill", `${els.vol.value}%`);
});
els.mute.addEventListener("click", () => { player.toggleMute(); toast(player.muted ? "Звук выключен" : "Звук включён", "info"); });
els.shuffle.addEventListener("click", () => toast(player.toggleShuffle() ? "Перемешивание включено" : "Перемешивание выключено", "info"));
els.repeat.addEventListener("click", () => {
  const r = player.cycleRepeat();
  toast(r === RepeatMode.OFF ? "Повтор выключен" : r === RepeatMode.ALL ? "Повтор: все" : "Повтор: один", "info");
});
els.dl.addEventListener("click", () => downloadTrack(player.current()?.id));
els.lyricsBtn.addEventListener("click", () => {
  els.lyricsPanel.classList.contains("is-open") ? closePanel(els.lyricsPanel) : openLyrics(player.current()?.id);
});
els.queueBtn.addEventListener("click", () => {
  renderQueue();
  els.queuePanel.classList.contains("is-open") ? closePanel(els.queuePanel) : openPanel(els.queuePanel);
});
els.queueClose.addEventListener("click", () => closePanel(els.queuePanel));
els.queueClear.addEventListener("click", () => { player.clearQueue(); toast("Очередь очищена", "info"); });
els.lyricsClose.addEventListener("click", () => closePanel(els.lyricsPanel));
addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closePanel(els.queuePanel); closePanel(els.lyricsPanel); closeLightbox(); hideWelcome(null); }
});
if (els.backdrop) els.backdrop.addEventListener("click", () => { closePanel(els.queuePanel); closePanel(els.lyricsPanel); });

els.search.addEventListener("input", () => { query = els.search.value; renderTracks(false); });
els.albumFilter.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-filter]");
  if (!btn) return;
  activeAlbum = btn.dataset.filter;
  $$("#albumFilter [data-filter]").forEach((b) => b.classList.toggle("is-on", b === btn));
  renderTracks(true);
});

document.addEventListener("click", async (e) => {
  const playAlbum = e.target.closest("[data-play-album]");
  if (playAlbum) {
    e.stopPropagation();
    const a = albumById.get(playAlbum.dataset.playAlbum);
    if (a?.trackIds.length) {
      await player.playTrack(a.trackIds[0]);
      toast(`Играет: ${a.title}`, "success");
      $("#tracks").scrollIntoView({ behavior: "smooth" });
    }
    return;
  }
  const openAlbum = e.target.closest("[data-open-album]");
  if (openAlbum) {
    e.stopPropagation();
    activeAlbum = openAlbum.dataset.openAlbum;
    $$("#albumFilter [data-filter]").forEach((b) => b.classList.toggle("is-on", b.dataset.filter === activeAlbum));
    query = ""; els.search.value = "";
    renderTracks(true);
    $("#tracks").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const card = e.target.closest("[data-album]");
  if (card && !e.target.closest("button")) {
    activeAlbum = card.dataset.album;
    $$("#albumFilter [data-filter]").forEach((b) => b.classList.toggle("is-on", b.dataset.filter === activeAlbum));
    renderTracks(true);
    $("#tracks").scrollIntoView({ behavior: "smooth" });
    return;
  }
  const cov = e.target.closest("[data-cover]");
  if (cov) { openLightbox(cov.dataset.cover, cov.dataset.cap || ""); return; }
  const row = e.target.closest("[data-track]");
  if (row) {
    const id = row.dataset.track;
    const actBtn = e.target.closest("[data-act]");
    const act = actBtn?.dataset.act || "play";
    if (act === "play") {
      if (player.current()?.id === id) player.toggle();
      else { await player.playTrack(id); }
    }
    else if (act === "queue") { player.addToQueue(id); toast(`В очереди: ${byId.get(id)?.title}`, "queue"); }
    else if (act === "lyrics") openLyrics(id);
    else if (act === "dl") downloadTrack(id);
    return;
  }
  const unq = e.target.closest("[data-unq]");
  if (unq) { player.dropFromQueue(unq.dataset.unq); toast("Убран из очереди", "info"); return; }
  const qrow = e.target.closest("[data-q]");
  if (qrow) { await player.playTrack(qrow.dataset.q); }
});

document.addEventListener("keydown", (e) => {
  const row = e.target.closest?.("[data-track]");
  if (e.key === "Enter" && row) { player.playTrack(row.dataset.track); }
  const cov = e.target.closest?.("[data-cover]");
  if (e.key === "Enter" && cov) { openLightbox(cov.dataset.cover, cov.dataset.cap || ""); }
});

/* ---------- Клавиатура ---------- */
addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" && e.target.type === "text") {
    if (e.key === "Escape") e.target.blur();
    return;
  }
  if (tag === "input" && (e.target.type === "range")) return;
  const k = e.key;
  const cur = player.current();
  if (k === " ") { e.preventDefault(); player.toggle(); }
  else if (k === "ArrowRight") player.seekBy(10);
  else if (k === "ArrowLeft") player.seekBy(-10);
  else if (k === "ArrowUp") { e.preventDefault(); player.setVolume(player.volume + 0.05); }
  else if (k === "ArrowDown") { e.preventDefault(); player.setVolume(player.volume - 0.05); }
  else if (k === "m" || k === "M" || k === "ь" || k === "Ь") player.toggleMute();
  else if (k === "s" || k === "S" || k === "ы" || k === "Ы") player.toggleShuffle();
  else if (k === "r" || k === "R" || k === "к" || k === "К") player.cycleRepeat();
  else if (k === "l" || k === "L" || k === "д" || k === "Д") openLyrics(cur?.id);
  else if (k === "q" || k === "Q" || k === "й" || k === "Й") {
    if (cur) { player.addToQueue(cur.id); toast(`В очереди: ${cur.title}`, "queue"); }
    renderQueue();
    els.queuePanel.classList.contains("is-open") ? closePanel(els.queuePanel) : openPanel(els.queuePanel);
  }
  else if (k === "d" || k === "D" || k === "в" || k === "В") { if (els.dbg) { els.dbg.hidden = !els.dbg.hidden; updDbg(); } }
});

/* ---------- Старт: иконки кнопок ---------- */
function hydrateButtons() {
  const map = {
    btnShuffle: Icons.shuffle, btnPrev: Icons.prev, btnNext: Icons.next,
    btnRepeat: Icons.repeat, btnMute: Icons.volume, btnQueue: Icons.queue,
    btnLyrics: Icons.lyrics, btnDownload: Icons.download,
  };
  for (const [id, svg] of Object.entries(map)) {
    const b = document.getElementById(id);
    if (b) b.innerHTML = svg;
  }
  els.play.innerHTML = Icons.play;
}

function renderStats() {
  const total = TRACKS.reduce((s, t) => s + (t.duration || 0), 0);
  els.statTracks.textContent = TRACKS.length;
  els.statAlbums.textContent = ALBUMS.length;
  els.statTime.textContent = formatTime(total);
  if (els.year) els.year.textContent = new Date().getFullYear();
}

hydrateButtons();
renderAlbums();
riseIn(document, ".hero__card", { limit: 1, dy: 18, dur: 450 });
riseIn(document, ".sec-head", { limit: 4, step: 60, dur: 400 });
renderTracks(true);
renderCovers();
document.getElementById("welcomeGo")?.addEventListener("click", () => hideWelcome("#tracks"));
document.getElementById("welcomeAlbums")?.addEventListener("click", () => hideWelcome("#albums"));
document.getElementById("welcomeClose")?.addEventListener("click", () => hideWelcome(null));
document.getElementById("lightboxClose")?.addEventListener("click", closeLightbox);
document.getElementById("lightbox")?.addEventListener("click", (e) => { if (e.target.id === "lightbox") closeLightbox(); });
if (!welcomeSeen()) setTimeout(showWelcome, 600);
renderQueue();
syncVolume();
syncModeButtons();
renderStats();
parallaxCovers();
enhance(document);

// восстановить последний трек (без автоплея — того требуют браузеры)
if (player.lastTrackId && byId.has(player.lastTrackId)) {
  await player.playTrack(player.lastTrackId, { autoplay: false });
  renderNP(); refreshActiveRow();
} else if (TRACKS.length) {
  await player.playTrack(TRACKS[0].id, { autoplay: false });
  renderNP(); refreshActiveRow();
}
syncSeek();
