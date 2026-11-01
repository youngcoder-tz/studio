// gn-apex/src/components/media/studioEdits.ts
// Edit models + pure helpers for the video, audio, document and Lottie studios.
// Every studio keeps its whole session in one plain-JSON object so the uploader
// can remember it per queue item and send it to the server as `options.edits`.

import type { Pos9 } from "./studioControls";

// ───────── VIDEO ─────────
export interface VideoEdits {
  frame: {
    id: string;
    zoom: number;
    x: number;
    y: number;
    rot: number;
    flipX: boolean;
    flipY: boolean;
  };
  look: {
    preset: string;
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    grayscale: number;
    sepia: number;
    blur: number;
    vignette: number;
  };
  text: {
    on: boolean;
    value: string;
    size: number;
    color: string;
    pos: Pos9;
    weight: number;
    shadow: boolean;
  };
  mark: {
    on: boolean;
    label: string;
    pos: Pos9;
    size: number;
    opacity: number;
  };
  badge: { on: boolean; type: "live" | "hd" | "new" | "rec"; pos: Pos9 };
  trim: { a: number; b: number };
  speed: number;
  loop: boolean;
  mute: boolean;
  volume: number; // 0..100
  fadeIn: number; // seconds
  fadeOut: number;
}

export const defaultVideoEdits = (): VideoEdits => ({
  frame: {
    id: "source",
    zoom: 1,
    x: 50,
    y: 50,
    rot: 0,
    flipX: false,
    flipY: false,
  },
  look: {
    preset: "natural",
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    vignette: 0,
  },
  text: {
    on: false,
    value: "Your caption",
    size: 6,
    color: "#ffffff",
    pos: "bc",
    weight: 700,
    shadow: true,
  },
  mark: { on: false, label: "APEX", pos: "br", size: 14, opacity: 85 },
  badge: { on: false, type: "hd", pos: "tl" },
  trim: { a: 0, b: 1 },
  speed: 1,
  loop: true,
  mute: false,
  volume: 100,
  fadeIn: 0,
  fadeOut: 0,
});

// ───────── AUDIO ─────────
export interface AudioEdits {
  trim: { a: number; b: number };
  speed: number;
  keepPitch: boolean;
  loop: boolean;
  gain: number; // dB
  normalize: boolean;
  fadeIn: number;
  fadeOut: number;
  bass: number; // dB
  treble: number; // dB
  lowpass: number; // Hz (20000 = off)
  highpass: number; // Hz (20 = off)
  mono: boolean;
  tone: string;
  title: string;
  artist: string;
}

export const defaultAudioEdits = (): AudioEdits => ({
  trim: { a: 0, b: 1 },
  speed: 1,
  keepPitch: true,
  loop: true,
  gain: 0,
  normalize: true,
  fadeIn: 0.4,
  fadeOut: 1.2,
  bass: 0,
  treble: 0,
  lowpass: 20000,
  highpass: 20,
  mono: false,
  tone: "flat",
  title: "",
  artist: "",
});

// ───────── DOCUMENT ─────────
export interface DocEdits {
  displayName: string;
  description: string;
  tags: string[];
  compress: boolean;
  quality: "screen" | "balanced" | "print";
  strip: boolean;
  flatten: boolean;
  ocr: boolean;
  linearize: boolean;
  csvTrim: boolean;
  csvDropEmpty: boolean;
  csvUtf8: boolean;
  watermark: boolean;
  watermarkText: string;
  allowDownload: boolean;
  expiryDays: number; // 0 = never
  visibility: "private" | "team" | "public";
}

export const defaultDocEdits = (name = ""): DocEdits => ({
  displayName: name.replace(/\.[^.]+$/, ""),
  description: "",
  tags: [],
  compress: true,
  quality: "balanced",
  strip: true,
  flatten: false,
  ocr: false,
  linearize: true,
  csvTrim: true,
  csvDropEmpty: true,
  csvUtf8: true,
  watermark: false,
  watermarkText: "Confidential",
  allowDownload: true,
  expiryDays: 0,
  visibility: "private",
});

// ───────── LOTTIE ─────────
export interface LottieEdits {
  speed: number;
  dir: 1 | -1;
  loop: boolean;
  bounce: boolean;
  seg: { a: number; b: number }; // 0..1 of the timeline
  bg: "checker" | "light" | "dark" | "custom";
  bgColor: string;
  scale: number; // %
  size: number; // px preview box, 0 = fit
  grid: boolean;
  outline: boolean;
  recolor: Record<string, string>; // original hex -> new hex
  fmt: "json" | "lottie";
  minify: boolean;
  round: boolean;
  precision: number;
  stripNames: boolean;
  dropHidden: boolean;
}

export const defaultLottieEdits = (): LottieEdits => ({
  speed: 1,
  dir: 1,
  loop: true,
  bounce: false,
  seg: { a: 0, b: 1 },
  bg: "checker",
  bgColor: "#ffffff",
  scale: 100,
  size: 0,
  grid: false,
  outline: false,
  recolor: {},
  fmt: "json",
  minify: true,
  round: true,
  precision: 2,
  stripNames: false,
  dropHidden: true,
});

// ───────── LOTTIE HELPERS ─────────
type Json = unknown;
const isObj = (v: Json): v is Record<string, Json> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const toHex = (r: number, g: number, b: number) =>
  "#" +
  [r, g, b]
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const fromHex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

/** Static fill / stroke colour holders: { ty:'fl'|'st', c:{ a:0, k:[r,g,b,(a)] } } */
function eachStaticColor(node: Json, fn: (c: { k: number[] }) => void): void {
  if (Array.isArray(node)) {
    node.forEach((n) => eachStaticColor(n, fn));
    return;
  }
  if (!isObj(node)) return;
  if (
    (node.ty === "fl" || node.ty === "st") &&
    isObj(node.c) &&
    node.c.a === 0 &&
    Array.isArray(node.c.k) &&
    typeof node.c.k[0] === "number"
  ) {
    fn(node.c as { k: number[] });
  }
  for (const k in node) {
    const v = node[k];
    if (v && typeof v === "object") eachStaticColor(v, fn);
  }
}

/** Unique fill/stroke colours (hex) with how many shapes use each, most used first. */
export function lottiePalette(data: Json): { hex: string; count: number }[] {
  const m = new Map<string, number>();
  eachStaticColor(data, (c) => {
    const h = toHex(c.k[0], c.k[1], c.k[2]);
    m.set(h, (m.get(h) ?? 0) + 1);
  });
  return [...m]
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);
}

export function applyRecolor<T>(data: T, map: Record<string, string>): T {
  if (!Object.keys(map).length) return data;
  const copy = JSON.parse(JSON.stringify(data)) as T;
  eachStaticColor(copy, (c) => {
    const to = map[toHex(c.k[0], c.k[1], c.k[2])];
    if (to) {
      const [r, g, b] = fromHex(to);
      c.k[0] = r;
      c.k[1] = g;
      c.k[2] = b;
    }
  });
  return copy;
}

/** Everything the export tab promises, applied to the JSON text. */
export function optimizeLottie(data: Json, e: LottieEdits): string {
  let d = applyRecolor(data, e.recolor) as Json;
  const f = Math.pow(10, e.precision);
  const walk = (n: Json): Json => {
    if (Array.isArray(n)) return n.map(walk);
    if (typeof n === "number")
      return e.round && !Number.isInteger(n) ? Math.round(n * f) / f : n;
    if (isObj(n)) {
      const o: Record<string, Json> = {};
      for (const k in n) {
        if (
          e.stripNames &&
          (k === "nm" || k === "mn" || k === "cl" || k === "ln")
        )
          continue;
        o[k] = walk(n[k]);
      }
      return o;
    }
    return n;
  };
  if (isObj(d) && e.dropHidden && Array.isArray(d.layers)) {
    d = {
      ...d,
      layers: (d.layers as Json[]).filter((l) => !(isObj(l) && l.hd === true)),
    };
  }
  d = walk(d);
  return e.minify ? JSON.stringify(d) : JSON.stringify(d, null, 2);
}

export function lottieInfo(data: Record<string, unknown> | null) {
  const d = (data ?? {}) as {
    w?: number;
    h?: number;
    fr?: number;
    ip?: number;
    op?: number;
    layers?: unknown[];
    assets?: unknown[];
    v?: string;
  };
  const fr = d.fr || 30,
    ip = d.ip || 0,
    op = d.op || 0;
  return {
    w: d.w ?? 0,
    h: d.h ?? 0,
    fr,
    ip,
    op,
    frames: Math.max(0, Math.round(op - ip)),
    duration: Math.max(0, (op - ip) / fr),
    layers: d.layers?.length ?? 0,
    assets: d.assets?.length ?? 0,
    version: d.v ?? "—",
  };
}
