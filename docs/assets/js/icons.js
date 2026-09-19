/* Pharmacy INC. — самописные inline SVG-иконки. Без emoji, без иконочных шрифтов. */
const P = (inner, vb = "0 0 24 24") =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

export const Icons = {
  play: P(`<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>`),
  pause: P(`<rect x="7" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.6" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" stroke="none"/>`),
  next: P(`<path d="M6 6l8.5 6L6 18z" fill="currentColor" stroke="none"/><rect x="16" y="6" width="2.6" height="12" rx="1.1" fill="currentColor" stroke="none"/>`),
  prev: P(`<path d="M18 6l-8.5 6 8.5 6z" fill="currentColor" stroke="none"/><rect x="5.4" y="6" width="2.6" height="12" rx="1.1" fill="currentColor" stroke="none"/>`),
  volume: P(`<path d="M4 9.5v5h3.5L12 18.5v-13z" fill="currentColor" stroke="none" opacity=".9"/><path d="M15 9.2a4.2 4.2 0 0 1 0 5.6"/><path d="M17.4 7a7.4 7.4 0 0 1 0 10"/>`),
  mute: P(`<path d="M4 9.5v5h3.5L12 18.5v-13z" fill="currentColor" stroke="none" opacity=".9"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5"/>`),
  shuffle: P(`<path d="M4 7h3.2c4.5 0 5.3 10 9.6 10H20"/><path d="M18.5 15.5L20 17.5l-1.5 2"/><path d="M4 17h3.2c1.2 0 2.2-.7 3-1.8"/><path d="M13.4 8.8c.8-1.1 1.8-1.8 3-1.8H20"/><path d="M18.5 5L20 7l-1.5 2"/>`),
  repeat: P(`<path d="M17 2.5L20.5 6 17 9.5"/><path d="M3.5 11.5v-1a4 4 0 0 1 4-4h12"/><path d="M7 21.5L3.5 18 7 14.5"/><path d="M20.5 12.5v1a4 4 0 0 1-4 4h-12"/>`),
  repeatOne: P(`<path d="M17 2.5L20.5 6 17 9.5"/><path d="M3.5 11.5v-1a4 4 0 0 1 4-4h12"/><path d="M7 21.5L3.5 18 7 14.5"/><path d="M20.5 12.5v1a4 4 0 0 1-4 4h-12"/><circle cx="17" cy="17" r="5" fill="#140a24" stroke-width="1.6"/><text x="17" y="19.2" text-anchor="middle" font-size="7" font-weight="800" fill="currentColor" stroke="none">1</text>`),
  queue: P(`<path d="M4 6.5h12"/><path d="M4 11h12"/><path d="M4 15.5h7"/><circle cx="17.5" cy="16.5" r="2.6"/><path d="M19.7 18.4l2 2"/>`),
  lyrics: P(`<path d="M6 4h9l3 3v13H6z"/><path d="M9 11.5h6M9 14.5h6M9 17.5h3.5"/>`),
  download: P(`<path d="M12 4v10.5"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/>`),
  search: P(`<circle cx="11" cy="11" r="6"/><path d="M15.8 15.8L20 20"/>`),
  close: P(`<path d="M6 6l12 12M18 6L6 18"/>`),
  plus: P(`<path d="M12 5v14M5 12h14"/>`),
  check: P(`<path d="M5 12.5l4.5 4.5L19 7.5"/>`),
  info: P(`<circle cx="12" cy="12" r="8.2"/><path d="M12 11v5"/><circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none"/>`),
  warn: P(`<path d="M12 4L21 19.5H3z"/><path d="M12 10v4.5"/><circle cx="12" cy="16.8" r="1.1" fill="currentColor" stroke="none"/>`),
  disc: P(`<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="2.4"/>`),
  cross: P(`<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="2.4"/><circle cx="9.4" cy="14.6" r=".4" fill="currentColor"/><circle cx="14.6" cy="9.4" r=".4" fill="currentColor"/>`),
  note: P(`<path d="M9 17.5V6l10-2.2V15"/><circle cx="6.8" cy="17.5" r="2.6"/><circle cx="16.8" cy="15" r="2.6"/>`),
  pill: P(`<rect x="3.5" y="9" width="17" height="7" rx="3.5" transform="rotate(-30 12 12.5)"/><path d="M9.2 13.9l5.6-5.6" transform="rotate(-30 12 12.5)"/>`, "0 0 24 24"),
  chevron: P(`<path d="M9 5.5l7 6.5-7 6.5"/>`),
  keyboard: P(`<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h.8M11 11h.8M15 11h.8M7 14h10"/>`),
};
