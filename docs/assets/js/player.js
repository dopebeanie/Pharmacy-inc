/* Pharmacy INC. — аудиоядро: очередь, shuffle, repeat, автопереход, Media Session, localStorage. */
export const RepeatMode = { OFF: "off", ALL: "all", ONE: "one" };
const LS_KEY = "pharmacy-inc-state-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch { return {}; }
}

export class Player {
  constructor({ onEvent }) {
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.tracks = [];
    this.byId = new Map();
    this.order = [];      // порядок воспроизведения (индексы в tracks)
    this.pos = -1;        // позиция в order
    this.queue = [];      // явная очередь (массив trackId, играет первой)
    this.shuffle = false;
    this.repeat = RepeatMode.OFF;
    this.onEvent = onEvent || (() => {});
    const saved = loadState();
    this.volume = typeof saved.volume === "number" ? Math.min(1, Math.max(0, saved.volume)) : 0.85;
    this.muted = !!saved.muted;
    this.shuffle = !!saved.shuffle;
    this.repeat = [RepeatMode.OFF, RepeatMode.ALL, RepeatMode.ONE].includes(saved.repeat) ? saved.repeat : RepeatMode.OFF;
    this.lastTrackId = saved.lastTrackId || null;
    this.lastSeekTarget = null;
    this.audio.volume = this.muted ? 0 : this.volume;

    this.audio.addEventListener("timeupdate", () => this.emit("time"));
    this.audio.addEventListener("loadedmetadata", () => this.emit("meta"));
    this.audio.addEventListener("play", () => this.emit("state"));
    this.audio.addEventListener("pause", () => this.emit("state"));
    this.audio.addEventListener("ended", () => this.onEnded());
    this.audio.addEventListener("seeked", () => this.emit("seeked"));
    this.audio.addEventListener("error", () => this.emit("error"));
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", () => this.play());
        navigator.mediaSession.setActionHandler("pause", () => this.pause());
        navigator.mediaSession.setActionHandler("previoustrack", () => this.prev());
        navigator.mediaSession.setActionHandler("nexttrack", () => this.next(true));
      } catch { /* старые браузеры */ }
    }
  }

  save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        volume: this.volume, muted: this.muted, shuffle: this.shuffle,
        repeat: this.repeat, lastTrackId: this.current()?.id || null,
      }));
    } catch { /* приватный режим */ }
  }

  setCatalog(tracks) {
    this.tracks = tracks.slice();
    this.byId = new Map(tracks.map((t) => [t.id, t]));
    this.rebuildOrder(this.current()?.id || this.lastTrackId);
  }

  rebuildOrder(keepTrackId) {
    const idx = this.tracks.map((_, i) => i);
    if (this.shuffle) {
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
    }
    this.order = idx;
    if (keepTrackId && this.byId.has(keepTrackId)) {
      const ti = this.tracks.findIndex((t) => t.id === keepTrackId);
      this.pos = Math.max(0, this.order.indexOf(ti));
    } else if (this.pos < 0 && this.order.length) {
      this.pos = 0;
    }
    this.emit("queue");
  }

  current() {
    if (this.pos < 0 || !this.order.length) return null;
    return this.tracks[this.order[this.pos]] || null;
  }

  upcoming() {
    // явная очередь + остаток порядка
    const out = [];
    for (const id of this.queue) {
      const t = this.byId.get(id);
      if (t) out.push({ track: t, queued: true });
    }
    for (let k = this.pos + 1; k < this.order.length; k++) {
      out.push({ track: this.tracks[this.order[k]], queued: false });
    }
    if (this.repeat === RepeatMode.ALL) {
      for (let k = 0; k <= this.pos; k++) {
        out.push({ track: this.tracks[this.order[k]], queued: false });
      }
    }
    return out;
  }

  async playTrack(id, { autoplay = true } = {}) {
    const t = this.byId.get(id);
    if (!t) return false;
    const ti = this.tracks.findIndex((x) => x.id === id);
    const oi = this.order.indexOf(ti);
    if (oi >= 0) this.pos = oi;
    else { this.order.splice(this.pos + 1, 0, ti); this.pos += 1; }
    this.queue = this.queue.filter((q) => q !== id);
    this.setSrc(t);
    this.save();
    if (autoplay) return this.play();
    this.emit("track");
    return true;
  }

  setSrc(t) {
    if (!this.audio.src.endsWith(encodeURI(t.src)) && this.audio.getAttribute("data-tid") !== t.id) {
      this.audio.src = t.src;
      this.audio.setAttribute("data-tid", t.id);
    }
    this.updateMediaSession(t);
    this.emit("track");
  }

  updateMediaSession(t) {
    if (!("mediaSession" in navigator) || !t) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.artist || "Pharmacy INC.",
        album: t.albumTitle || "",
        artwork: [{ src: t.cover, sizes: "512x512", type: "image/jpeg" }],
      });
    } catch { /* ignore */ }
  }

  async play() {
    if (!this.current() && this.order.length) {
      this.pos = 0;
      this.setSrc(this.current());
    }
    try {
      await this.audio.play();
      this.emit("state");
      return true;
    } catch {
      this.emit("error-nofile");
      return false;
    }
  }

  pause() { this.audio.pause(); }
  toggle() { return this.audio.paused ? this.play() : (this.pause(), Promise.resolve(false)); }
  get playing() { return !this.audio.paused && !this.audio.ended; }

  next(auto = false) {
    if (this.repeat === RepeatMode.ONE && auto) {
      this.audio.currentTime = 0;
      return this.play();
    }
    if (this.queue.length) {
      const id = this.queue.shift();
      this.playTrack(id);
      this.emit("queue");
      return;
    }
    if (!this.order.length) return;
    if (this.pos < this.order.length - 1) {
      this.pos += 1;
      this.setSrc(this.current());
      this.save();
      this.play();
    } else if (this.repeat === RepeatMode.ALL) {
      this.pos = 0;
      this.setSrc(this.current());
      this.save();
      this.play();
    } else {
      this.pause();
      this.emit("ended-queue");
    }
  }

  prev() {
    if (this.audio.currentTime > 4) { this.audio.currentTime = 0; return; }
    if (!this.order.length) return;
    this.pos = (this.pos - 1 + this.order.length) % this.order.length;
    this.setSrc(this.current());
    this.save();
    this.play();
  }

  onEnded() {
    if (this.repeat === RepeatMode.ONE) {
      this.audio.currentTime = 0;
      this.play();
      return;
    }
    this.next(true);
  }

  seekTo(sec) {
    this.lastSeekTarget = sec;
    if (!isFinite(sec)) return;
    const d = this.audio.duration || this.current()?.duration || 0;
    this.audio.currentTime = Math.min(Math.max(0, sec), d || sec);
  }

  seekBy(delta) { this.seekTo(this.audio.currentTime + delta); }

  setVolume(v) {
    this.volume = Math.min(1, Math.max(0, v));
    if (!this.muted) this.audio.volume = this.volume;
    if (this.volume > 0 && this.muted) { this.muted = false; this.audio.volume = this.volume; }
    this.save(); this.emit("volume");
  }

  toggleMute() {
    this.muted = !this.muted;
    this.audio.volume = this.muted ? 0 : this.volume;
    this.save(); this.emit("volume");
  }

  toggleShuffle() {
    const cur = this.current()?.id;
    this.shuffle = !this.shuffle;
    this.rebuildOrder(cur);
    this.save(); this.emit("mode");
    return this.shuffle;
  }

  cycleRepeat() {
    this.repeat = this.repeat === RepeatMode.OFF ? RepeatMode.ALL : this.repeat === RepeatMode.ALL ? RepeatMode.ONE : RepeatMode.OFF;
    this.save(); this.emit("mode");
    return this.repeat;
  }

  addToQueue(id) {
    if (!this.byId.has(id)) return false;
    this.queue.push(id);
    this.emit("queue");
    this.save();
    return true;
  }

  playNext(id) {
    if (!this.byId.has(id)) return false;
    this.queue.unshift(id);
    this.emit("queue");
    return true;
  }

  clearQueue() { this.queue = []; this.emit("queue"); }

  dropFromQueue(id) {
    const i = this.queue.indexOf(id);
    if (i < 0) return false;
    this.queue.splice(i, 1);
    this.emit("queue");
    return true;
  }

  removeFromQueue(index) {
    this.queue.splice(index, 1);
    this.emit("queue");
  }

  emit(kind) { this.onEvent(kind, this); }
}
