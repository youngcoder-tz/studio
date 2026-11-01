// gn-apex/src/components/media/cropRenderer.ts
/**
 * cropRenderer.ts — one drawing function for the whole crop studio.
 * ─────────────────────────────────────────────────────────────────────
 * The stage, the live previews and the final export all call
 * `renderCropOutput()`, so what you see is exactly what gets uploaded.
 *
 * Coordinate model (all in OUTPUT pixels, i.e. the size of the exported file):
 *   • The crop frame is `OW × OH` and never moves.
 *   • The image centre sits at (cx, cy) from the frame centre.
 *   • `s` = output pixels per source pixel. `s / cover` is the zoom the user
 *     sees. Below 1 the image is smaller than the frame ("zoom out") and the
 *     empty area is filled with the chosen background.
 * ─────────────────────────────────────────────────────────────────────
 */

import {
  applySharpen,
  createImage,
  resolveFormat,
  type CropOutputFormat,
  type CropResult,
} from "./cropUtils";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type CropShape = "rect" | "rounded" | "round";
export type BgMode = "transparent" | "color" | "gradient" | "blur";
export type Anchor = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
export type MarkId =
  | "orbit"
  | "bolt"
  | "leaf"
  | "hex"
  | "wave"
  | "spark"
  | "apex"
  | "ring";
export type BadgeType = "verified" | "online" | "star" | "pro";
export type TargetId =
  | "avatar"
  | "logo"
  | "wordmark"
  | "favicon"
  | "cover"
  | "banner"
  | "photo"
  | "portrait"
  | "story"
  | "square"
  | "free"
  | "locked";

export interface TargetPreset {
  id: TargetId;
  label: string;
  w: number;
  h: number;
  shape: CropShape;
  format: CropOutputFormat;
  bg: BgMode;
  hint: string;
  free?: boolean;
}

export interface CropView {
  cx: number;
  cy: number;
  s: number;
  /** Fine rotation in degrees (-45 … 45) */
  rot: number;
  /** Quarter turns 0-3 */
  quarter: number;
  fx: boolean;
  fy: boolean;
}

export interface CropAdjust {
  preset: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  grayscale: number;
  sepia: number;
  blur: number;
  /** Extra raw CSS filter appended verbatim (used by the AI template recipes). */
  css?: string;
}

export interface CropEditState {
  target: TargetId;
  /** Frame size when target === "free" */
  free: { w: number; h: number };
  /** Frame size when the parent fixes the ratio via props (target === "locked") */
  locked: { w: number; h: number };
  shape: CropShape;
  radius: number;
  view: CropView;
  adjust: CropAdjust;
  bg: { mode: BgMode; color: string; color2: string };
  ring: {
    on: boolean;
    width: number;
    gap: number;
    style: "solid" | "gradient";
    color: string;
    color2: string;
  };
  mark: {
    on: boolean;
    logo: MarkId;
    custom: boolean;
    pos: Anchor;
    size: number;
    opacity: number;
    margin: number;
    tint: string;
  };
  text: {
    on: boolean;
    value: string;
    font: keyof typeof CROP_FONTS;
    size: number;
    color: string;
    pos: Anchor;
    weight: number;
    shadow: boolean;
  };
  badge: {
    on: boolean;
    type: BadgeType;
    pos: "tl" | "tr" | "bl" | "br";
    size: number;
  };
}

export interface CropOutputSettings {
  format: CropOutputFormat;
  /** 0.3 – 1 */
  quality: number;
  sharpen: boolean;
  /** Longest output edge in px. Empty = frame size. */
  maxDimension?: number;
  /** Optional corner watermark text. */
  watermark?: string;
}

export interface RenderSource {
  el: CanvasImageSource;
  w: number;
  h: number;
}

export interface RenderAssets {
  customLogo?: HTMLImageElement | null;
}

// ─────────────────────────────────────────────
// PRESETS
// ─────────────────────────────────────────────

export const CROP_TARGETS: Record<TargetId, TargetPreset> = {
  avatar: { id: "avatar", label: "Avatar", w: 512, h: 512, shape: "round", format: "webp", bg: "color", hint: "512 · round" },
  logo: { id: "logo", label: "Logo", w: 512, h: 512, shape: "rounded", format: "png", bg: "transparent", hint: "512 · alpha" },
  wordmark: { id: "wordmark", label: "Wide logo", w: 1200, h: 400, shape: "rect", format: "png", bg: "transparent", hint: "1200×400" },
  favicon: { id: "favicon", label: "Favicon", w: 256, h: 256, shape: "rounded", format: "png", bg: "transparent", hint: "256" },
  cover: { id: "cover", label: "Cover", w: 1500, h: 500, shape: "rect", format: "webp", bg: "blur", hint: "1500×500" },
  banner: { id: "banner", label: "Banner", w: 1920, h: 1080, shape: "rect", format: "webp", bg: "blur", hint: "16:9" },
  photo: { id: "photo", label: "Photo", w: 1200, h: 900, shape: "rect", format: "webp", bg: "blur", hint: "4:3" },
  portrait: { id: "portrait", label: "Portrait", w: 1080, h: 1350, shape: "rect", format: "webp", bg: "blur", hint: "4:5" },
  story: { id: "story", label: "Story", w: 1080, h: 1920, shape: "rect", format: "webp", bg: "blur", hint: "9:16" },
  square: { id: "square", label: "Square", w: 1080, h: 1080, shape: "rect", format: "webp", bg: "blur", hint: "1:1" },
  free: { id: "free", label: "Free", w: 0, h: 0, shape: "rect", format: "webp", bg: "blur", hint: "any size", free: true },
  locked: { id: "locked", label: "Fixed", w: 0, h: 0, shape: "rect", format: "webp", bg: "blur", hint: "set by field" },
};

/** Targets users can pick from. "locked" is only ever set by the parent. */
export const PICKABLE_TARGETS: TargetId[] = [
  "avatar", "logo", "wordmark", "favicon", "cover", "banner", "photo", "portrait", "story", "free",
];

export const CROP_LOOKS: Record<string, { label: string; a: Omit<CropAdjust, "preset" | "blur"> }> = {
  none: { label: "Natural", a: { brightness: 100, contrast: 100, saturation: 100, hue: 0, grayscale: 0, sepia: 0 } },
  vivid: { label: "Vivid", a: { brightness: 104, contrast: 112, saturation: 140, hue: 0, grayscale: 0, sepia: 0 } },
  mono: { label: "Mono", a: { brightness: 104, contrast: 108, saturation: 100, hue: 0, grayscale: 100, sepia: 0 } },
  noir: { label: "Noir", a: { brightness: 88, contrast: 140, saturation: 100, hue: 0, grayscale: 100, sepia: 0 } },
  warm: { label: "Warm", a: { brightness: 104, contrast: 104, saturation: 118, hue: -8, grayscale: 0, sepia: 22 } },
  cool: { label: "Cool", a: { brightness: 102, contrast: 104, saturation: 108, hue: 12, grayscale: 0, sepia: 0 } },
  fade: { label: "Fade", a: { brightness: 112, contrast: 84, saturation: 82, hue: 0, grayscale: 0, sepia: 10 } },
  pop: { label: "Pop", a: { brightness: 100, contrast: 122, saturation: 170, hue: 0, grayscale: 0, sepia: 0 } },
};

export const CROP_FONTS = {
  Geist: "Geist, system-ui, sans-serif",
  Display: "'Bricolage Grotesque', Geist, system-ui, sans-serif",
  Mono: "'Geist Mono', ui-monospace, monospace",
  Serif: "Georgia, serif",
} as const;

/** Built-in logo marks, 100×100 viewBox. `c` is the fill colour. */
export const MARKS: Record<MarkId, (c: string) => string> = {
  orbit: (c) => `<circle cx="46" cy="54" r="28" fill="none" stroke="${c}" stroke-width="10"/><circle cx="76" cy="26" r="12" fill="${c}"/>`,
  bolt: (c) => `<path d="M58 6 22 56h24l-6 38 38-54H54z" fill="${c}"/>`,
  leaf: (c) => `<path d="M16 84C10 42 38 14 88 12c2 50-24 76-62 74" fill="${c}"/><path d="M18 86 54 46" stroke="#0007" stroke-width="6" stroke-linecap="round" fill="none"/>`,
  hex: (c) => `<path d="M50 6 88 28v44L50 94 12 72V28z" fill="none" stroke="${c}" stroke-width="9" stroke-linejoin="round"/><path d="M50 30 69 41v22L50 74 31 63V41z" fill="${c}"/>`,
  wave: (c) => `<rect x="8" y="38" width="12" height="24" rx="6" fill="${c}"/><rect x="28" y="20" width="12" height="60" rx="6" fill="${c}"/><rect x="48" y="8" width="12" height="84" rx="6" fill="${c}"/><rect x="68" y="26" width="12" height="48" rx="6" fill="${c}"/><rect x="88" y="42" width="6" height="16" rx="3" fill="${c}"/>`,
  spark: (c) => `<path d="M50 4C54 34 66 46 96 50 66 54 54 66 50 96 46 66 34 54 4 50 34 46 46 34 50 4z" fill="${c}"/>`,
  apex: (c) => `<path d="M50 8 94 92H72L50 48 28 92H6z" fill="${c}"/>`,
  ring: (c) => `<circle cx="50" cy="50" r="38" fill="none" stroke="${c}" stroke-width="12"/><circle cx="50" cy="50" r="12" fill="${c}"/>`,
};

export const MARK_IDS = Object.keys(MARKS) as MarkId[];

export const markSvg = (id: MarkId, color = "#ffffff", size = 100) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${MARKS[id](color)}</svg>`;

// ─────────────────────────────────────────────
// ZOOM MAPPING  (slider −100 … +100  ↔  10% … 800%)
// ─────────────────────────────────────────────

export const MIN_REL_ZOOM = 0.1;
export const MAX_REL_ZOOM = 8;

/** Negative values zoom OUT (padding appears), 0 = fills the frame, positive zooms IN. */
export const sliderToRelZoom = (v: number) =>
  v >= 0 ? Math.pow(8, v / 100) : Math.pow(10, v / 100);
export const relZoomToSlider = (z: number) =>
  z >= 1 ? (100 * Math.log(z)) / Math.log(8) : 100 * Math.log10(z);

// ─────────────────────────────────────────────
// STATE HELPERS
// ─────────────────────────────────────────────

export function frameOf(st: CropEditState): { w: number; h: number } {
  if (st.target === "free") return { w: Math.round(st.free.w), h: Math.round(st.free.h) };
  if (st.target === "locked") return st.locked;
  const t = CROP_TARGETS[st.target];
  return { w: t.w, h: t.h };
}

export const totalRotation = (st: CropEditState) =>
  ((st.view.quarter * 90 + st.view.rot) * Math.PI) / 180;

/** Scale at which the (quarter-rotated) image just covers the frame. */
export function coverScale(st: CropEditState, src: { w: number; h: number }) {
  const f = frameOf(st);
  const odd = st.view.quarter % 2 === 1;
  const w = odd ? src.h : src.w;
  const h = odd ? src.w : src.h;
  return Math.max(f.w / w, f.h / h);
}

export function clampView(st: CropEditState, src: { w: number; h: number }): CropEditState {
  const f = frameOf(st);
  const cov = coverScale(st, src);
  const v = { ...st.view };
  v.s = Math.min(MAX_REL_ZOOM * cov, Math.max(MIN_REL_ZOOM * cov, v.s));
  const r = totalRotation(st);
  const c = Math.abs(Math.cos(r));
  const sn = Math.abs(Math.sin(r));
  const bw = (src.w * c + src.h * sn) * v.s;
  const bh = (src.w * sn + src.h * c) * v.s;
  const bx = Math.abs(bw - f.w) / 2;
  const by = Math.abs(bh - f.h) / 2;
  v.cx = Math.min(bx, Math.max(-bx, v.cx));
  v.cy = Math.min(by, Math.max(-by, v.cy));
  return { ...st, view: v };
}

/** Smallest scale at which the rotated image still covers the frame. */
export function fillScale(st: CropEditState, src: { w: number; h: number }) {
  const f = frameOf(st);
  const r = totalRotation(st);
  const co = Math.cos(-r);
  const si = Math.sin(-r);
  let need = 0;
  for (const [hx, hy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const px = (hx * f.w) / 2 - st.view.cx;
    const py = (hy * f.h) / 2 - st.view.cy;
    const x = px * co - py * si;
    const y = px * si + py * co;
    need = Math.max(need, Math.abs(x) / (src.w / 2), Math.abs(y) / (src.h / 2));
  }
  return need;
}

export function createEditState(opts: {
  src: { w: number; h: number };
  cropShape?: "rect" | "round";
  aspectRatio?: number;
  target?: TargetId;
}): CropEditState {
  const { src, cropShape, aspectRatio } = opts;
  let target: TargetId = opts.target ?? "free";
  let shape: CropShape = "rect";
  const locked = { w: 1024, h: 1024 };

  if (cropShape) {
    // The parent dictates the frame (same contract the old CropStudio had).
    target = "locked";
    shape = cropShape === "round" ? "round" : "rect";
    const r = aspectRatio || 1;
    if (r >= 1) {
      locked.w = 1024;
      locked.h = Math.round(1024 / r);
    } else {
      locked.h = 1024;
      locked.w = Math.round(1024 * r);
    }
    if (cropShape === "round") {
      locked.w = locked.h = 512;
    }
  } else {
    shape = CROP_TARGETS[target].shape;
  }

  // Free-form starts at the original's own size (capped at 4096) so an
  // untouched image is never silently downscaled.
  const k = Math.min(1, 4096 / Math.max(src.w, src.h));
  const free = { w: Math.max(64, Math.round(src.w * k)), h: Math.max(64, Math.round(src.h * k)) };

  const st: CropEditState = {
    target,
    free,
    locked,
    shape,
    radius: 22,
    view: { cx: 0, cy: 0, s: 1, rot: 0, quarter: 0, fx: false, fy: false },
    adjust: { preset: "none", brightness: 100, contrast: 100, saturation: 100, hue: 0, grayscale: 0, sepia: 0, blur: 0 },
    bg: { mode: cropShape === "round" ? "color" : "blur", color: "#0b0f12", color2: "#7c5cff" },
    ring: { on: false, width: 7, gap: 7, style: "gradient", color: "#5fcdd9", color2: "#7c5cff" },
    mark: { on: false, logo: "orbit", custom: false, pos: "br", size: 16, opacity: 92, margin: 5, tint: "#ffffff" },
    text: { on: false, value: "", font: "Display", size: 7, color: "#ffffff", pos: "bc", weight: 700, shadow: true },
    badge: { on: false, type: "verified", pos: "br", size: 22 },
  };
  st.view.s = coverScale(st, src);
  return st;
}

/** Re-fit after the frame or rotation changed, keeping the user's relative zoom. */
export function withRelativeZoom(
  st: CropEditState,
  src: { w: number; h: number },
  change: (s: CropEditState) => CropEditState,
): CropEditState {
  const rel = st.view.s / coverScale(st, src);
  const next = change(st);
  next.view = { ...next.view, s: rel * coverScale(next, src) };
  return clampView(next, src);
}

// ─────────────────────────────────────────────
// DRAWING
// ─────────────────────────────────────────────

const canFilter = () =>
  typeof CanvasRenderingContext2D !== "undefined" &&
  "filter" in CanvasRenderingContext2D.prototype;

export const filterString = (a: CropAdjust) => {
  const p: string[] = [];
  if (a.brightness !== 100) p.push(`brightness(${a.brightness}%)`);
  if (a.contrast !== 100) p.push(`contrast(${a.contrast}%)`);
  if (a.saturation !== 100) p.push(`saturate(${a.saturation}%)`);
  if (a.hue) p.push(`hue-rotate(${a.hue}deg)`);
  if (a.grayscale) p.push(`grayscale(${a.grayscale}%)`);
  if (a.sepia) p.push(`sepia(${a.sepia}%)`);
  if (a.blur) p.push(`blur(${a.blur}px)`);
  if (a.css) p.push(a.css);
  return p.join(" ");
};

function roundedRect(p: Path2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
}

export function shapePath(st: Pick<CropEditState, "shape" | "radius">, w: number, h: number, inset = 0) {
  const p = new Path2D();
  const ww = Math.max(1, w - 2 * inset);
  const hh = Math.max(1, h - 2 * inset);
  if (st.shape === "round") p.ellipse(w / 2, h / 2, ww / 2, hh / 2, 0, 0, Math.PI * 2);
  else if (st.shape === "rounded") roundedRect(p, inset, inset, ww, hh, (Math.min(ww, hh) * st.radius) / 100);
  else p.rect(inset, inset, ww, hh);
  return p;
}

const markCache = new Map<string, HTMLImageElement>();
const svgUri = (s: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);

/** Resolves once the built-in mark for this state is decoded (needed before export). */
export function loadMark(st: CropEditState): Promise<void> {
  if (!st.mark.on || st.mark.custom) return Promise.resolve();
  const key = st.mark.logo + st.mark.tint;
  const hit = markCache.get(key);
  if (hit?.complete) return Promise.resolve();
  return new Promise((res) => {
    const im = hit ?? new Image();
    im.onload = () => res();
    im.onerror = () => res();
    if (!hit) {
      im.src = svgUri(markSvg(st.mark.logo, st.mark.tint, 256));
      markCache.set(key, im);
    }
  });
}

function markImage(st: CropEditState, assets: RenderAssets, onLoad?: () => void) {
  if (st.mark.custom) return assets.customLogo?.complete ? assets.customLogo : null;
  const key = st.mark.logo + st.mark.tint;
  let im = markCache.get(key);
  if (!im) {
    im = new Image();
    if (onLoad) im.onload = onLoad;
    im.src = svgUri(markSvg(st.mark.logo, st.mark.tint, 256));
    markCache.set(key, im);
  }
  return im.complete && im.naturalWidth ? im : null;
}

function place(pos: string, bx: number, by: number, bw: number, bh: number, w: number, h: number, mg: number) {
  const col = pos[1];
  const row = pos[0];
  const x = col === "l" ? bx + mg : col === "r" ? bx + bw - w - mg : bx + (bw - w) / 2;
  const y = row === "t" ? by + mg : row === "b" ? by + bh - h - mg : by + (bh - h) / 2;
  return [x, y] as const;
}

export interface RenderOptions {
  /** Solid colour painted under everything (for JPEG, which has no alpha). */
  fill?: string | null;
  /** Pattern shown where the output is transparent (stage only). */
  checker?: CanvasPattern | null;
  /** Small corner watermark burned into the result (preview + export). */
  watermark?: string;
  /** Called when a lazily loaded overlay image finishes decoding. */
  onAssetLoad?: () => void;
}

/**
 * Draws the finished crop into a context that is already scaled so that
 * 1 unit = 1 output pixel (frame is OW × OH).
 */
export function renderCropOutput(
  c: CanvasRenderingContext2D,
  st: CropEditState,
  src: RenderSource,
  OW: number,
  OH: number,
  assets: RenderAssets = {},
  o: RenderOptions = {},
) {
  const u = Math.min(OW, OH) / 512;
  const v = st.view;
  if (o.fill) {
    c.fillStyle = o.fill;
    c.fillRect(0, 0, OW, OH);
  }
  const inset = st.ring.on ? (st.ring.width + st.ring.gap) * u : 0;

  c.save();
  c.clip(shapePath(st, OW, OH, inset));

  if (st.bg.mode === "color") {
    c.fillStyle = st.bg.color;
    c.fillRect(0, 0, OW, OH);
  } else if (st.bg.mode === "gradient") {
    const g = c.createLinearGradient(0, 0, OW, OH);
    g.addColorStop(0, st.bg.color);
    g.addColorStop(1, st.bg.color2);
    c.fillStyle = g;
    c.fillRect(0, 0, OW, OH);
  } else if (st.bg.mode === "blur") {
    if (canFilter()) {
      const sc = Math.max(OW / src.w, OH / src.h) * 1.3;
      c.save();
      c.filter = `blur(${30 * u}px) brightness(.78) saturate(1.2)`;
      c.drawImage(src.el, OW / 2 - (src.w * sc) / 2, OH / 2 - (src.h * sc) / 2, src.w * sc, src.h * sc);
      c.restore();
    } else {
      c.fillStyle = st.bg.color;
      c.fillRect(0, 0, OW, OH);
    }
  } else if (o.checker) {
    c.fillStyle = o.checker;
    c.fillRect(0, 0, OW, OH);
  }

  c.save();
  c.translate(OW / 2 + v.cx, OH / 2 + v.cy);
  c.rotate(totalRotation(st));
  c.scale(v.fx ? -1 : 1, v.fy ? -1 : 1);
  c.scale(v.s, v.s);
  const f = filterString(st.adjust);
  if (f && canFilter()) c.filter = f;
  c.imageSmoothingQuality = "high";
  c.drawImage(src.el, -src.w / 2, -src.h / 2, src.w, src.h);
  c.restore();
  c.restore();

  if (st.ring.on) {
    c.save();
    c.lineWidth = st.ring.width * u;
    const g = c.createLinearGradient(0, 0, OW, OH);
    g.addColorStop(0, st.ring.color);
    g.addColorStop(1, st.ring.style === "solid" ? st.ring.color : st.ring.color2);
    c.strokeStyle = g;
    c.stroke(shapePath(st, OW, OH, (st.ring.width * u) / 2));
    c.restore();
  }

  // Overlays stay inside the visible area; round frames use the inscribed square.
  const round = st.shape === "round";
  const bi = inset + (round ? Math.min(OW, OH) * 0.146 : 0);
  const bx = bi;
  const by = bi;
  const bw = OW - 2 * bi;
  const bh = OH - 2 * bi;
  const base = Math.min(OW, OH);

  if (st.mark.on) {
    const im = markImage(st, assets, o.onAssetLoad);
    if (im) {
      const m = st.mark;
      const ar = im.naturalWidth / im.naturalHeight || 1;
      let h = (base * m.size) / 100;
      let w = h * ar;
      if (w > bw * 0.8) {
        w = bw * 0.8;
        h = w / ar;
      }
      const [x, y] = place(m.pos, bx, by, bw, bh, w, h, (base * m.margin) / 100);
      c.save();
      c.globalAlpha = m.opacity / 100;
      c.shadowColor = "rgba(0,0,0,.35)";
      c.shadowBlur = base * 0.015;
      c.drawImage(im, x, y, w, h);
      c.restore();
    }
  }

  if (st.text.on && st.text.value) {
    const t = st.text;
    const px = (base * t.size) / 100;
    c.save();
    c.font = `${t.weight} ${px}px ${CROP_FONTS[t.font]}`;
    c.fillStyle = t.color;
    const w = c.measureText(t.value).width;
    const [x, y] = place(t.pos, bx, by, bw, bh, w, px * 0.78, base * 0.04);
    if (t.shadow) {
      c.shadowColor = "rgba(0,0,0,.55)";
      c.shadowBlur = px * 0.25;
      c.shadowOffsetY = px * 0.05;
    }
    c.fillText(t.value, x, y + px * 0.78);
    c.restore();
  }

  if (st.badge.on) drawBadge(c, st, OW, OH, inset);

  if (o.watermark) drawWatermark(c, o.watermark, OW, OH, base);
}

/** A discreet maker's mark in the bottom-right corner. */
function drawWatermark(c: CanvasRenderingContext2D, text: string, OW: number, OH: number, base: number) {
  const px = base * 0.034;
  c.save();
  c.font = `600 ${px}px Geist, system-ui, sans-serif`;
  c.textAlign = "right";
  c.textBaseline = "bottom";
  c.globalAlpha = 0.72;
  c.fillStyle = "#ffffff";
  c.shadowColor = "rgba(0,0,0,.5)";
  c.shadowBlur = px * 0.5;
  c.fillText(text, OW - base * 0.035, OH - base * 0.03);
  c.restore();
}

function drawBadge(c: CanvasRenderingContext2D, st: CropEditState, OW: number, OH: number, inset: number) {
  const b = st.badge;
  const base = Math.min(OW, OH);
  const r = (base * b.size) / 200;
  const right = b.pos[1] === "r";
  const bottom = b.pos[0] === "b";
  let cx: number;
  let cy: number;
  if (st.shape === "round") {
    const R = Math.min(OW, OH) / 2 - inset;
    const d = R * 0.707;
    cx = OW / 2 + (right ? d : -d);
    cy = OH / 2 + (bottom ? d : -d);
  } else {
    const m = base * 0.04 + r;
    cx = right ? OW - m - inset : m + inset;
    cy = bottom ? OH - m - inset : m + inset;
  }
  cx = Math.min(OW - r - 2, Math.max(r + 2, cx));
  cy = Math.min(OH - r - 2, Math.max(r + 2, cy));

  c.save();
  c.translate(cx, cy);
  c.shadowColor = "rgba(0,0,0,.35)";
  c.shadowBlur = r * 0.35;
  c.fillStyle = "#fff";
  c.beginPath();
  c.arc(0, 0, r * 1.14, 0, Math.PI * 2);
  c.fill();
  c.shadowColor = "transparent";
  c.fillStyle = { verified: "#2f7cf6", online: "#2fbf71", star: "#f2a93b", pro: "#7c5cff" }[b.type];
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#fff";
  c.fillStyle = "#fff";
  c.lineCap = "round";
  c.lineJoin = "round";
  c.lineWidth = r * 0.2;
  if (b.type === "verified") {
    c.beginPath();
    c.moveTo(-r * 0.42, r * 0.02);
    c.lineTo(-r * 0.1, r * 0.34);
    c.lineTo(r * 0.46, -r * 0.32);
    c.stroke();
  } else if (b.type === "star") {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? r * 0.22 : r * 0.55;
      c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    c.closePath();
    c.fill();
  } else if (b.type === "pro") {
    c.font = `700 ${r * 0.74}px Geist, system-ui, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("PRO", 0, r * 0.04);
  }
  c.restore();
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

/**
 * Renders the edit state to a File. Replaces the old
 * `getCroppedImg(url, pixelCrop, …)` call for the crop dialog; the legacy
 * function in cropUtils.ts is still there for other callers.
 */
export async function exportCrop(
  imageSrc: string,
  st: CropEditState,
  settings: CropOutputSettings,
  fileName: string,
  assets: RenderAssets = {},
): Promise<CropResult & { warnings: string[] }> {
  const img = await createImage(imageSrc);
  const src: RenderSource = { el: img, w: img.naturalWidth, h: img.naturalHeight };
  const f = frameOf(st);
  const warnings: string[] = [];

  let sc = 1;
  const long = Math.max(f.w, f.h);
  if (settings.maxDimension && long > settings.maxDimension) sc = settings.maxDimension / long;
  const W = Math.max(1, Math.round(f.w * sc));
  const H = Math.max(1, Math.round(f.h * sc));

  await loadMark(st);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.scale(sc, sc);

  const format = resolveFormat(settings.format);
  const needsAlpha = st.bg.mode === "transparent" || st.shape !== "rect" || st.ring.on;
  if (format === "jpeg" && needsAlpha) {
    warnings.push("JPEG has no transparency, so empty areas were filled with the background colour.");
  }
  renderCropOutput(ctx, st, src, f.w, f.h, assets, {
    fill: format === "jpeg" ? st.bg.color : null,
    watermark: settings.watermark,
  });
  if (settings.sharpen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    try {
      applySharpen(ctx, W, H);
    } catch {
      /* tainted canvas: skip sharpening */
    }
  }

  const mime = format === "jpeg" ? "image/jpeg" : `image/${format}`;
  const quality = Math.min(1, Math.max(0.3, settings.quality));
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, mime, format === "png" ? undefined : quality),
  );
  if (!blob) throw new Error("Canvas serialisation failed.");

  const ext = format === "jpeg" ? "jpg" : format;
  const clean = fileName.replace(/\.[^.]+$/, "");
  const file = new File([blob], `${clean}.${ext}`, { type: mime });
  return { file, width: W, height: H, format, sizeBytes: blob.size, warnings };
}
