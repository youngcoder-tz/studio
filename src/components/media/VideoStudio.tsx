// gn-apex/src/components/media/VideoStudio.tsx
// Full video workbench split into Provider, Stage (Playground), and Inspector.

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Crop,
  SlidersHorizontal,
  Sparkles,
  Scissors,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Camera,
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Film,
  StepBack,
  StepForward,
  Undo2,
  Redo2,
  Maximize2,
  Repeat,
} from "lucide-react";
import { formatBytes } from "./mediaOptimizerEngine";
import {
  Stage,
  StudioTabs,
  type StudioTabDef,
  Group,
  Field,
  Range,
  Seg,
  Sel,
  Toggle,
  Note,
  KV,
  Chip,
  Btn,
  IconBtn,
  Swatches,
  PosPicker,
  posStyle,
  TextIn,
  Tile,
  Kbd,
  isTyping,
  mergeSection,
  useEditHistory,
  fmtTime,
  clamp,
} from "./studioControls";
import { defaultVideoEdits, type VideoEdits } from "./studioEdits";

// ─────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────

export interface VideoExportSettings {
  maxRes: number | "";
  bitrateKbps: number;
  fps: 24 | 30 | 60;
  format: "mp4" | "webm";
  keepAudio: boolean;
}

export interface VideoStudioProps {
  file: File;
  url: string;
  thumbnail?: string;
  exportSettings: VideoExportSettings;
  onExportChange: (p: Partial<VideoExportSettings>) => void;
  onPoster?: (dataUrl: string) => void;
  initialEdits?: VideoEdits | null;
  onEditsChange?: (e: VideoEdits) => void;
}

const FRAME_PRESETS = [
  {
    id: "source",
    label: "Source",
    ratio: null as number | null,
    sub: "native",
  },
  { id: "banner", label: "Banner", ratio: 16 / 9, sub: "16:9" },
  { id: "square", label: "Square", ratio: 1, sub: "1:1" },
  { id: "portrait", label: "Portrait", ratio: 4 / 5, sub: "4:5" },
  { id: "story", label: "Story", ratio: 9 / 16, sub: "9:16" },
  { id: "cinema", label: "Cinema", ratio: 21 / 9, sub: "21:9" },
];

const LOOKS = [
  { id: "natural", label: "Natural", css: "none" },
  { id: "vivid", label: "Vivid", css: "saturate(1.45) contrast(1.1)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.08)" },
  {
    id: "noir",
    label: "Noir",
    css: "grayscale(1) contrast(1.4) brightness(0.88)",
  },
  {
    id: "warm",
    label: "Warm",
    css: "sepia(0.25) saturate(1.15) hue-rotate(-8deg)",
  },
  { id: "cool", label: "Cool", css: "saturate(1.08) hue-rotate(12deg)" },
  {
    id: "fade",
    label: "Fade",
    css: "brightness(1.12) contrast(0.84) saturate(0.82)",
  },
  { id: "pop", label: "Pop", css: "contrast(1.22) saturate(1.7)" },
];

const BADGES = {
  live: { label: "LIVE", bg: "#e5527a" },
  hd: { label: "HD", bg: "#2b9fb0" },
  new: { label: "NEW", bg: "#7b5cd6" },
  rec: { label: "● REC", bg: "#c2453a" },
} as const;

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const FPS_STEP = 1 / 30;
/** Pointer must travel this many px before a press becomes a pan (not a click). */
const PAN_THRESHOLD = 4;

type FrameEdits = VideoEdits["frame"];

/** Round to at most 3 decimal places (also kills float noise like 33.300000000000004). */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp + round focus / zoom values so state never holds more than 3 decimals. */
function sanitizeFrame(p: Partial<FrameEdits>): Partial<FrameEdits> {
  const out: Partial<FrameEdits> = { ...p };
  if (typeof out.x === "number") {
    out.x = Number.isFinite(out.x) ? round3(clamp(out.x, 0, 100)) : 50;
  }
  if (typeof out.y === "number") {
    out.y = Number.isFinite(out.y) ? round3(clamp(out.y, 0, 100)) : 50;
  }
  if (typeof out.zoom === "number") {
    out.zoom = Number.isFinite(out.zoom) ? round3(clamp(out.zoom, 1, 4)) : 1;
  }
  return out;
}

function lookCss(l: VideoEdits["look"]): string {
  const p = LOOKS.find((x) => x.id === l.preset);
  if (p && l.preset !== "natural") return p.css;
  return `brightness(${l.brightness}%) contrast(${l.contrast}%) saturate(${l.saturation}%) hue-rotate(${l.hue}deg) grayscale(${l.grayscale}%) sepia(${l.sepia}%)${l.blur ? ` blur(${l.blur}px)` : ""}`;
}

// ─────────────────────────────────────────────
// FILMSTRIP
// ─────────────────────────────────────────────

function useFilmstrip(url: string, duration: number, count = 14) {
  const [frames, setFrames] = useState<string[]>([]);
  useEffect(() => {
    if (!url || !duration || duration <= 0) return;
    let dead = false;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.crossOrigin = "anonymous"; // must be set BEFORE src
    v.src = url;
    const out: string[] = [];
    const c = document.createElement("canvas");

    // Attach the listener first, then trigger the action, so we never miss the event.
    const waitFor = (ev: "loadeddata" | "seeked", ms = 4000) =>
      new Promise<void>((resolve) => {
        let done = false;
        const fin = () => {
          if (done) return;
          done = true;
          v.removeEventListener(ev, fin);
          v.removeEventListener("error", fin);
          window.clearTimeout(t);
          resolve();
        };
        const t = window.setTimeout(fin, ms);
        v.addEventListener(ev, fin);
        v.addEventListener("error", fin);
      });

    const run = async () => {
      await waitFor("loadeddata", 8000);
      if (!v.videoWidth || !v.videoHeight || dead) return;
      setFrames([]);
      c.height = 72;
      c.width = Math.max(1, Math.round((72 * v.videoWidth) / v.videoHeight));
      const ctx = c.getContext("2d");
      if (!ctx) return;
      for (let i = 0; i < count && !dead; i++) {
        const seeked = waitFor("seeked");
        v.currentTime = Math.min(
          Math.max(0, duration - 0.05),
          ((i + 0.5) / count) * duration,
        );
        await seeked;
        if (dead) return;
        try {
          ctx.drawImage(v, 0, 0, c.width, c.height);
          out.push(c.toDataURL("image/jpeg", 0.6));
        } catch {
          return; // tainted canvas (CORS) – bail quietly, thumbnail fallback is used
        }
        if (!dead && (i % 3 === 2 || i === count - 1)) setFrames([...out]);
      }
    };
    run().catch(() => {});
    return () => {
      dead = true;
      v.removeAttribute("src");
      v.load();
    };
  }, [url, duration, count]);
  return frames;
}

// ─────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────

interface WheelLike {
  deltaY: number;
  ctrlKey: boolean;
  metaKey: boolean;
  preventDefault: () => void;
}

interface VideoStudioContextValue {
  file: File;
  url: string;
  thumbnail?: string;
  exportSettings: VideoExportSettings;
  onExportChange: (p: Partial<VideoExportSettings>) => void;
  onPoster?: (dataUrl: string) => void;
  ed: VideoEdits;
  setEd: React.Dispatch<React.SetStateAction<VideoEdits>>;
  set: (p: Partial<VideoEdits>) => void;
  sec: <K extends "frame" | "look" | "text" | "mark" | "badge" | "trim">(
    k: K,
    p: Partial<VideoEdits[K]>,
  ) => void;
  hist: ReturnType<typeof useEditHistory<VideoEdits>>;
  tab: string;
  setTab: React.Dispatch<React.SetStateAction<string>>;
  tabs: StudioTabDef[];
  playing: boolean;
  time: number;
  setTime: React.Dispatch<React.SetStateAction<number>>;
  duration: number;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  src: { w: number; h: number };
  setSrc: React.Dispatch<React.SetStateAction<{ w: number; h: number }>>;
  drag: "a" | "b" | "head" | null;
  setDrag: React.Dispatch<React.SetStateAction<"a" | "b" | "head" | null>>;
  frames: string[];
  preset: (typeof FRAME_PRESETS)[number];
  boxRatio: number;
  aT: number;
  bT: number;
  odd: boolean;
  filter: string;
  est: { len: number; bytes: number };
  ticks: number[];
  seek: (t: number) => void;
  togglePlay: () => void;
  setIn: () => void;
  setOut: () => void;
  capturePoster: () => void;
  resetFrame: () => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  boxRef: React.RefObject<HTMLDivElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  onPanDown: (e: React.PointerEvent) => void;
  onPanMove: (e: React.PointerEvent) => void;
  /** Ends a pan gesture. Returns true when the gesture was a real drag (not a click). */
  onPanUp: (e: React.PointerEvent) => boolean;
  onWheel: (e: WheelLike) => void;
  onKey: (e: React.KeyboardEvent) => void;
  pFrom: (e: { clientX: number }) => number;
}

const VideoStudioContext = createContext<VideoStudioContextValue | null>(null);

export function useVideoStudio(): VideoStudioContextValue {
  const ctx = useContext(VideoStudioContext);
  if (!ctx) {
    throw new Error("useVideoStudio must be used within a VideoStudioProvider");
  }
  return ctx;
}

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export function VideoStudioProvider({
  file,
  url,
  thumbnail,
  exportSettings,
  onExportChange,
  onPoster,
  initialEdits,
  onEditsChange,
  children,
}: VideoStudioProps & { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [tab, setTab] = useState("frame");
  const [ed, setEd] = useState<VideoEdits>(() => {
    const base = initialEdits ?? defaultVideoEdits();
    return { ...base, frame: { ...base.frame, ...sanitizeFrame(base.frame) } };
  });
  const hist = useEditHistory(ed, setEd);

  const set = useCallback(
    (p: Partial<VideoEdits>) => setEd((s) => ({ ...s, ...p })),
    [],
  );
  const sec = useCallback(
    <K extends "frame" | "look" | "text" | "mark" | "badge" | "trim">(
      k: K,
      p: Partial<VideoEdits[K]>,
    ) =>
      setEd((s) =>
        mergeSection(
          s,
          k,
          k === "frame"
            ? (sanitizeFrame(p as Partial<FrameEdits>) as Partial<
                VideoEdits[K]
              >)
            : p,
        ),
      ),
    [],
  );

  const cb = useRef(onEditsChange);
  useEffect(() => {
    cb.current = onEditsChange;
  });

  useEffect(() => {
    cb.current?.(ed);
  }, [ed]);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [src, setSrc] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<"a" | "b" | "head" | null>(null);

  const frames = useFilmstrip(url, duration);
  const preset =
    FRAME_PRESETS.find((f) => f.id === ed.frame.id) ?? FRAME_PRESETS[0];

  // Follow the exact native video aspect ratio when available
  const srcRatio = src.w && src.h ? src.w / src.h : 16 / 9;
  const boxRatio = preset.ratio ?? srcRatio;

  const aT = ed.trim.a * duration;
  const bT = ed.trim.b * duration;
  const odd = ed.frame.rot % 180 !== 0;
  const filter = lookCss(ed.look);

  // Sync playback speed
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = ed.speed;
  }, [ed.speed]);

  const env = useCallback(
    (t: number) => {
      let g = 1;
      if (ed.fadeIn > 0) g = Math.min(g, clamp((t - aT) / ed.fadeIn, 0, 1));
      if (ed.fadeOut > 0) g = Math.min(g, clamp((bT - t) / ed.fadeOut, 0, 1));
      return g;
    },
    [ed.fadeIn, ed.fadeOut, aT, bT],
  );

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = ed.mute;
      v.volume = clamp((ed.volume / 100) * env(v.currentTime), 0, 1);
    }
  }, [ed.mute, ed.volume, env, time]);

  // Smooth playhead + keep playback inside the trim selection (rAF, not a poll)
  useEffect(() => {
    if (!playing || duration <= 0) return;
    let raf = 0;
    let last = -1;
    const tick = () => {
      const v = videoRef.current;
      if (!v) return;
      const t = v.currentTime;
      if (t >= bT - 0.03) {
        if (ed.loop) {
          v.currentTime = aT;
          last = aT;
          setTime(aT);
        } else {
          v.pause();
          setPlaying(false);
          setTime(bT);
          return;
        }
      } else if (t < aT - 0.05) {
        v.currentTime = aT;
        last = aT;
        setTime(aT);
      } else if (Math.abs(t - last) >= FPS_STEP) {
        last = t;
        setTime(t);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [playing, aT, bT, ed.loop, duration]);

  const seek = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v || !Number.isFinite(t)) return;
      const targetTime = duration > 0 ? clamp(t, 0, duration) : Math.max(0, t);
      v.currentTime = targetTime;
      setTime(targetTime);
    },
    [duration],
  );

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.paused) {
      v.pause();
      setPlaying(false);
      return;
    }
    const endLimit = duration > 0 ? bT - 0.05 : Infinity;
    if (v.currentTime < aT || (duration > 0 && v.currentTime >= endLimit)) {
      v.currentTime = aT;
    }
    v.play()
      .then(() => setPlaying(true))
      .catch((err) => {
        console.warn("Playback error:", err);
        setPlaying(false);
      });
  }, [duration, aT, bT]);

  const setIn = useCallback(() => {
    sec("trim", { a: clamp(time / (duration || 1), 0, ed.trim.b - 0.01) });
  }, [sec, time, duration, ed.trim.b]);

  const setOut = useCallback(() => {
    sec("trim", { b: clamp(time / (duration || 1), ed.trim.a + 0.01, 1) });
  }, [sec, time, duration, ed.trim.a]);

  const pFrom = useCallback((e: { clientX: number }) => {
    if (!trackRef.current) return 0;
    const r = trackRef.current.getBoundingClientRect();
    if (!r.width) return 0;
    return clamp((e.clientX - r.left) / r.width, 0, 1);
  }, []);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const p = pFrom(e);
      if (drag === "a") sec("trim", { a: Math.min(p, ed.trim.b - 0.01) });
      else if (drag === "b") sec("trim", { b: Math.max(p, ed.trim.a + 0.01) });
      else seek(p * duration);
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, ed.trim.a, ed.trim.b, duration, seek, sec, pFrom]);

  // ── Pan (focus X / Y) ─────────────────────────────────────────
  // Only active while a pointer is actually pressed on the stage. Hovering never moves focus.
  const pan = useRef<{
    id: number;
    x: number;
    y: number;
    fx: number;
    fy: number;
    moved: boolean;
  } | null>(null);

  const onPanDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pan.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        fx: ed.frame.x,
        fy: ed.frame.y,
        moved: false,
      };
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* pointer may already be gone */
      }
    },
    [ed.frame.x, ed.frame.y],
  );

  const onPanMove = useCallback(
    (e: React.PointerEvent) => {
      const p = pan.current;
      if (!p || p.id !== e.pointerId) return;
      // Button released outside the window / lost → stop panning immediately
      if (e.pointerType === "mouse" && e.buttons === 0) {
        pan.current = null;
        return;
      }
      const r = boxRef.current?.getBoundingClientRect();
      if (!r || !r.width || !r.height) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.moved) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD) return;
        p.moved = true;
      }
      const z = Math.max(ed.frame.zoom, 1);
      sec("frame", {
        x: p.fx - ((dx / r.width) * 100) / z,
        y: p.fy - ((dy / r.height) * 100) / z,
      });
    },
    [ed.frame.zoom, sec],
  );

  const onPanUp = useCallback((e: React.PointerEvent): boolean => {
    const p = pan.current;
    pan.current = null;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* already released */
    }
    return p ? p.moved : true; // no active pan → don't treat as a click
  }, []);

  const onWheel = useCallback(
    (e: WheelLike) => {
      if (!e.ctrlKey && !e.metaKey && tab !== "frame") return;
      e.preventDefault();
      sec("frame", { zoom: ed.frame.zoom - e.deltaY * 0.002 });
    },
    [tab, ed.frame.zoom, sec],
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z") {
        e.preventDefault();
        if (e.shiftKey) hist.redo();
        else hist.undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (k === " ") {
        e.preventDefault();
        togglePlay();
      } else if (k === "arrowleft") {
        e.preventDefault();
        seek(time - (e.shiftKey ? 1 : FPS_STEP));
      } else if (k === "arrowright") {
        e.preventDefault();
        seek(time + (e.shiftKey ? 1 : FPS_STEP));
      } else if (k === "i") setIn();
      else if (k === "o") setOut();
      else if (k === "m") set({ mute: !ed.mute });
      else if (k === "l") set({ loop: !ed.loop });
    },
    [hist, togglePlay, seek, time, setIn, setOut, set, ed.mute, ed.loop],
  );

  const capturePoster = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return;
    const H = Math.min(v.videoHeight, 1080);
    const W = Math.round(H * boxRatio);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    if (!x) return;
    const rot = (ed.frame.rot * Math.PI) / 180;
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    const sw = odd ? vh : vw;
    const sh = odd ? vw : vh;
    const cover = Math.max(W / sw, H / sh) * ed.frame.zoom;
    const ox = (ed.frame.x / 100 - 0.5) * (sw * cover - W) * -1;
    const oy = (ed.frame.y / 100 - 0.5) * (sh * cover - H) * -1;
    x.save();
    x.filter = filter;
    x.translate(W / 2 + ox, H / 2 + oy);
    x.rotate(rot);
    x.scale(ed.frame.flipX ? -1 : 1, ed.frame.flipY ? -1 : 1);
    x.drawImage(
      v,
      (-vw * cover) / 2,
      (-vh * cover) / 2,
      vw * cover,
      vh * cover,
    );
    x.restore();
    x.filter = "none";
    if (ed.look.vignette) {
      const g = x.createRadialGradient(
        W / 2,
        H / 2,
        W * 0.25,
        W / 2,
        H / 2,
        W * 0.75,
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${ed.look.vignette / 100})`);
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
    }
    const anchor = (
      p: string,
      w: number,
      h: number,
      m: number,
    ): [number, number] => [
      p[1] === "l" ? m : p[1] === "r" ? W - w - m : (W - w) / 2,
      p[0] === "t" ? m : p[0] === "b" ? H - h - m : (H - h) / 2,
    ];
    if (ed.text.on && ed.text.value) {
      const fs = (ed.text.size / 100) * W;
      x.font = `${ed.text.weight} ${fs}px system-ui, sans-serif`;
      const w = x.measureText(ed.text.value).width;
      const [tx, ty] = anchor(ed.text.pos, w, fs, W * 0.04);
      if (ed.text.shadow) {
        x.shadowColor = "rgba(0,0,0,.6)";
        x.shadowBlur = fs * 0.2;
      }
      x.fillStyle = ed.text.color;
      x.textBaseline = "top";
      x.fillText(ed.text.value, tx, ty);
      x.shadowBlur = 0;
    }
    if (ed.mark.on && ed.mark.label) {
      const fs = (ed.mark.size / 100) * W * 0.5;
      x.font = `700 ${fs}px system-ui, sans-serif`;
      x.globalAlpha = ed.mark.opacity / 100;
      const w = x.measureText(ed.mark.label).width + fs;
      const [mx, my] = anchor(ed.mark.pos, w, fs * 1.6, W * 0.04);
      x.fillStyle = "rgba(0,0,0,.45)";
      x.fillRect(mx, my, w, fs * 1.6);
      x.fillStyle = "#fff";
      x.textBaseline = "middle";
      x.fillText(ed.mark.label, mx + fs / 2, my + fs * 0.8);
      x.globalAlpha = 1;
    }
    if (ed.badge.on) {
      const b = BADGES[ed.badge.type];
      const fs = W * 0.03;
      x.font = `700 ${fs}px system-ui, sans-serif`;
      const w = x.measureText(b.label).width + fs * 1.4;
      const [bx, by] = anchor(ed.badge.pos, w, fs * 1.8, W * 0.04);
      x.fillStyle = b.bg;
      x.fillRect(bx, by, w, fs * 1.8);
      x.fillStyle = "#fff";
      x.textBaseline = "middle";
      x.fillText(b.label, bx + fs * 0.7, by + fs * 0.9);
    }
    let dataUrl: string;
    try {
      dataUrl = c.toDataURL("image/jpeg", 0.88);
    } catch (err) {
      // Cross-origin video without CORS headers taints the canvas
      console.warn("Poster capture blocked (tainted canvas):", err);
      window.dispatchEvent(
        new CustomEvent("apex:studio", {
          detail: {
            title: "Poster capture failed",
            detail: "Video source blocks canvas access (CORS)",
          },
        }),
      );
      return;
    }
    onPoster?.(dataUrl);
    window.dispatchEvent(
      new CustomEvent("apex:studio", {
        detail: { title: "Poster captured", detail: `${W}×${H}` },
      }),
    );
  }, [ed, boxRatio, odd, filter, onPoster]);

  const est = useMemo(() => {
    const len = Math.max(0, bT - aT) / (ed.speed || 1);
    const v = (exportSettings.bitrateKbps * 1000 * len) / 8;
    const a = exportSettings.keepAudio && !ed.mute ? (128000 * len) / 8 : 0;
    return { len, bytes: v + a };
  }, [aT, bT, ed.speed, ed.mute, exportSettings]);

  const resetFrame = useCallback(
    () =>
      sec("frame", {
        zoom: 1,
        x: 50,
        y: 50,
        rot: 0,
        flipX: false,
        flipY: false,
      }),
    [sec],
  );

  const tabs: StudioTabDef[] = useMemo(
    () => [
      { id: "frame", label: "Frame", icon: <Crop size={15} /> },
      { id: "look", label: "Look", icon: <SlidersHorizontal size={15} /> },
      { id: "props", label: "Props", icon: <Sparkles size={15} /> },
      { id: "trim", label: "Trim", icon: <Scissors size={15} /> },
      { id: "export", label: "Export", icon: <Download size={15} /> },
    ],
    [],
  );

  const ticks = useMemo(() => {
    if (!duration || duration <= 0) return [];
    const step =
      duration > 120 ? 30 : duration > 40 ? 10 : duration > 12 ? 5 : 1;
    return Array.from(
      { length: Math.floor(duration / step) + 1 },
      (_, i) => i * step,
    );
  }, [duration]);

  const value = useMemo<VideoStudioContextValue>(
    () => ({
      file,
      url,
      thumbnail,
      exportSettings,
      onExportChange,
      onPoster,
      ed,
      setEd,
      set,
      sec,
      hist,
      tab,
      setTab,
      tabs,
      playing,
      time,
      setTime,
      duration,
      setDuration,
      src,
      setSrc,
      drag,
      setDrag,
      frames,
      preset,
      boxRatio,
      aT,
      bT,
      odd,
      filter,
      est,
      ticks,
      seek,
      togglePlay,
      setIn,
      setOut,
      capturePoster,
      resetFrame,
      rootRef,
      videoRef,
      boxRef,
      trackRef,
      onPanDown,
      onPanMove,
      onPanUp,
      onWheel,
      onKey,
      pFrom,
    }),
    [
      file,
      url,
      thumbnail,
      exportSettings,
      onExportChange,
      onPoster,
      ed,
      set,
      sec,
      hist,
      tab,
      tabs,
      playing,
      time,
      duration,
      src,
      drag,
      frames,
      preset,
      boxRatio,
      aT,
      bT,
      odd,
      filter,
      est,
      ticks,
      seek,
      togglePlay,
      setIn,
      setOut,
      capturePoster,
      resetFrame,
      onPanDown,
      onPanMove,
      onPanUp,
      onWheel,
      onKey,
      pFrom,
    ],
  );

  return (
    <VideoStudioContext.Provider value={value}>
      {children}
    </VideoStudioContext.Provider>
  );
}

// ─────────────────────────────────────────────
// STAGE COMPONENT (Window playground)
// ─────────────────────────────────────────────

export interface VideoStageProps {
  className?: string;
}

export function VideoStage({ className = "" }: VideoStageProps) {
  const {
    file,
    url,
    thumbnail,
    ed,
    set,
    hist,
    playing,
    time,
    setTime,
    duration,
    setDuration,
    src,
    setSrc,
    frames,
    preset,
    boxRatio,
    odd,
    filter,
    aT,
    bT,
    ticks,
    seek,
    togglePlay,
    capturePoster,
    rootRef,
    videoRef,
    boxRef,
    trackRef,
    onPanDown,
    onPanMove,
    onPanUp,
    onWheel,
    onKey,
    sec,
    setDrag,
    pFrom,
  } = useVideoStudio();

  // Native, non-passive wheel listener so ctrl+wheel zooms the video
  // instead of zooming the whole browser page.
  const wheelRef = useRef(onWheel);
  useEffect(() => {
    wheelRef.current = onWheel;
  }, [onWheel]);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, [boxRef]);

  // Zoom is applied around the box centre; focus X/Y slides the zoomed picture so
  // the focus point moves toward the centre. Max shift = (zoom-1)/2 of the box,
  // so edges are never exposed.
  const zoom = ed.frame.zoom;
  const fix = odd && boxRatio ? Math.max(boxRatio, 1 / boxRatio) : 1;
  const tx = round3((0.5 - ed.frame.x / 100) * (zoom - 1) * 100);
  const ty = round3((0.5 - ed.frame.y / 100) * (zoom - 1) * 100);
  const canPan = zoom > 1 || !!preset.ratio;

  const handleKeyTrim = (h: "a" | "b") => (e: React.KeyboardEvent) => {
    const k = e.key;
    if (k !== "ArrowLeft" && k !== "ArrowRight") return;
    e.preventDefault();
    e.stopPropagation();
    const d = (k === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 0.05 : 0.005);
    if (h === "a")
      sec("trim", { a: clamp(ed.trim.a + d, 0, ed.trim.b - 0.01) });
    else sec("trim", { b: clamp(ed.trim.b + d, ed.trim.a + 0.01, 1) });
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKey}
      className={`relative flex size-full min-h-0 flex-1 flex-col overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    >
      {/* ── PLAYER PLAYGROUND (Expands smoothly, zero overflow-y) ── */}
      <Stage className="size-full flex-1 min-h-0 overflow-hidden p-3 lg:p-4">
        <div className="flex h-full w-full max-w-4xl flex-col items-center justify-center gap-2.5">
          <div
            ref={boxRef}
            onPointerDown={(e) => {
              rootRef.current?.focus({ preventScroll: true });
              onPanDown(e);
            }}
            onPointerMove={onPanMove}
            onPointerUp={(e) => {
              const dragged = onPanUp(e);
              if (!dragged) togglePlay();
            }}
            onPointerCancel={(e) => {
              onPanUp(e);
            }}
            className={`relative max-h-[50vh] w-full touch-none select-none overflow-hidden rounded-none border border-white/10 bg-black shadow-2xl ${
              canPan ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
            }`}
            style={{
              aspectRatio: String(boxRatio),
              maxWidth: `min(100%, ${50 * boxRatio}vh)`,
              containerType: "inline-size",
            }}
          >
            <video
              ref={videoRef}
              src={url}
              poster={thumbnail}
              playsInline
              preload="auto"
              crossOrigin="anonymous"
              className={`pointer-events-none size-full ${
                preset.ratio || zoom > 1 ? "object-cover" : "object-contain"
              }`}
              style={{
                filter,
                objectPosition: `${ed.frame.x}% ${ed.frame.y}%`,
                transform: `translate(${tx}%, ${ty}%) rotate(${ed.frame.rot}deg) scale(${
                  zoom * fix * (ed.frame.flipX ? -1 : 1)
                }, ${zoom * fix * (ed.frame.flipY ? -1 : 1)})`,
              }}
              onLoadedMetadata={(e) => {
                const el = e.currentTarget;
                if (el.duration && Number.isFinite(el.duration)) {
                  setDuration(el.duration);
                }
                if (el.videoWidth && el.videoHeight) {
                  setSrc({ w: el.videoWidth, h: el.videoHeight });
                }
              }}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onPlay={() => {}}
              onPause={() => {}}
              onEnded={() => {
                if (ed.loop) {
                  seek(aT);
                  videoRef.current?.play().catch(() => {});
                }
              }}
            />
            {ed.look.vignette > 0 && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${ed.look.vignette / 100}) 100%)`,
                }}
              />
            )}
            {ed.text.on && ed.text.value && (
              <div
                className="pointer-events-none whitespace-pre font-sans leading-none"
                style={{
                  ...posStyle(ed.text.pos),
                  fontSize: `${ed.text.size}cqw`,
                  fontWeight: ed.text.weight,
                  color: ed.text.color,
                  textShadow: ed.text.shadow
                    ? "0 .06em .2em rgba(0,0,0,.6)"
                    : undefined,
                }}
              >
                {ed.text.value}
              </div>
            )}
            {ed.mark.on && ed.mark.label && (
              <div
                className="pointer-events-none flex items-center gap-[.4em] rounded bg-black/45 px-[.6em] py-[.3em] font-bold text-white"
                style={{
                  ...posStyle(ed.mark.pos),
                  fontSize: `${ed.mark.size / 2}cqw`,
                  opacity: ed.mark.opacity / 100,
                }}
              >
                <span className="inline-block size-[.7em] rounded-full border-2 border-cyan-300" />
                {ed.mark.label}
              </div>
            )}
            {ed.badge.on && (
              <div
                className="pointer-events-none rounded px-[.7em] py-[.3em] font-bold text-white"
                style={{
                  ...posStyle(ed.badge.pos),
                  fontSize: "3cqw",
                  background: BADGES[ed.badge.type].bg,
                }}
              >
                {BADGES[ed.badge.type].label}
              </div>
            )}
            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
              <Chip>
                <Film size={12} className="text-blue-400" />{" "}
                {src.w ? `${src.w}×${src.h}` : file.type || "video"}
              </Chip>
              {preset.ratio && <Chip>{preset.sub}</Chip>}
              {zoom > 1 && <Chip>{zoom.toFixed(1)}×</Chip>}
            </div>
            {!playing && (
              <span className="pointer-events-none absolute inset-0 grid place-items-center">
                <span className="grid size-14 place-items-center rounded-full border border-white/20 bg-black/50 backdrop-blur">
                  <Play size={22} className="ml-1 text-white" />
                </span>
              </span>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex w-full max-w-3xl flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-black/50 px-2 py-1.5">
            <IconBtn label="Undo" onClick={hist.undo} disabled={!hist.canUndo}>
              <Undo2 size={15} />
            </IconBtn>
            <IconBtn label="Redo" onClick={hist.redo} disabled={!hist.canRedo}>
              <Redo2 size={15} />
            </IconBtn>
            <span className="mx-1 h-4 w-px bg-white/10" />
            <IconBtn
              label="Back one frame"
              onClick={() => seek(time - FPS_STEP)}
            >
              <StepBack size={15} />
            </IconBtn>
            <IconBtn label={playing ? "Pause" : "Play"} onClick={togglePlay}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </IconBtn>
            <IconBtn
              label="Forward one frame"
              onClick={() => seek(time + FPS_STEP)}
            >
              <StepForward size={15} />
            </IconBtn>
            <span className="ml-1 font-mono text-[11px] tabular-nums text-white/60">
              {fmtTime(time)} / {fmtTime(duration)}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <IconBtn
                label="Loop selection (L)"
                onClick={() => set({ loop: !ed.loop })}
                active={ed.loop}
              >
                <Repeat size={15} />
              </IconBtn>
              <IconBtn
                label={ed.mute ? "Unmute (M)" : "Mute (M)"}
                onClick={() => set({ mute: !ed.mute })}
              >
                {ed.mute ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </IconBtn>
              <input
                type="range"
                min={0}
                max={100}
                value={ed.volume}
                onChange={(e) => set({ volume: +e.target.value })}
                aria-label="Volume"
                className="w-16 accent-(--color-primary,#5fcdd9)"
              />
              <select
                value={ed.speed}
                onChange={(e) => set({ speed: +e.target.value })}
                className="rounded border border-white/10 bg-black/50 px-1 py-0.5 text-xs text-white/80"
                aria-label="Speed"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
              <IconBtn label="Capture poster" onClick={capturePoster}>
                <Camera size={15} />
              </IconBtn>
              <IconBtn
                label="Fullscreen"
                onClick={() => boxRef.current?.requestFullscreen?.()}
              >
                <Maximize2 size={15} />
              </IconBtn>
            </div>
          </div>
          <p className="hidden items-center gap-2 text-[10px] text-muted-foreground sm:flex">
            <Kbd>Space</Kbd> play <Kbd>←</Kbd>
            <Kbd>→</Kbd> frame <Kbd>I</Kbd>
            <Kbd>O</Kbd> in/out <Kbd>Ctrl Z</Kbd> undo · drag video to focus
          </p>
        </div>
      </Stage>

      {/* ── TIMELINE (Anchored directly above queue) ── */}
      <div className="shrink-0 space-y-1 border-t border-white/8 bg-black/40 px-4 py-2.5">
        <div className="relative h-3 font-mono text-[9px] text-muted-foreground">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2"
              style={{ left: `${(t / (duration || 1)) * 100}%` }}
            >
              {fmtTime(t).replace(/\.0$/, "")}
            </span>
          ))}
        </div>
        <div
          ref={trackRef}
          onPointerDown={(e) => {
            setDrag("head");
            seek(pFrom(e) * duration);
          }}
          className="relative h-14 cursor-pointer touch-none overflow-hidden rounded-lg border border-white/10 bg-neutral-900"
        >
          <div className="absolute inset-0 flex">
            {(frames.length ? frames : thumbnail ? [thumbnail] : []).map(
              (f, i) => (
                <div
                  key={i}
                  className="h-full min-w-0 flex-1 bg-cover bg-center opacity-70"
                  style={{ backgroundImage: `url("${f}")` }}
                />
              ),
            )}
          </div>
          <div
            className="absolute inset-y-0 left-0 bg-black/70"
            style={{ width: `${ed.trim.a * 100}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-black/70"
            style={{ width: `${(1 - ed.trim.b) * 100}%` }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 border-y-2 border-primary"
            style={{
              left: `${ed.trim.a * 100}%`,
              right: `${(1 - ed.trim.b) * 100}%`,
            }}
          />
          {(["a", "b"] as const).map((h) => (
            <div
              key={h}
              onPointerDown={(e) => {
                e.stopPropagation();
                setDrag(h);
              }}
              onKeyDown={handleKeyTrim(h)}
              tabIndex={0}
              className="absolute inset-y-0 z-10 flex w-3 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded bg-primary outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ left: `${ed.trim[h] * 100}%` }}
              role="slider"
              aria-label={h === "a" ? "Trim in" : "Trim out"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(ed.trim[h] * 100)}
            >
              <span className="h-5 w-0.5 rounded bg-primary-foreground/80" />
            </div>
          ))}
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white shadow"
            style={{
              left: `${clamp(time / (duration || 1), 0, 1) * 100}%`,
            }}
          >
            <span className="absolute -top-px left-1/2 size-2 -translate-x-1/2 rounded-full bg-white" />
          </div>
        </div>
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>In {fmtTime(aT)}</span>
          <span>Selection {fmtTime(bT - aT)}</span>
          <span>Out {fmtTime(bT)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// INSPECTOR COMPONENT (Tools on the right)
// ─────────────────────────────────────────────

export interface VideoInspectorProps {
  className?: string;
}

export function VideoInspector({ className = "" }: VideoInspectorProps) {
  const {
    thumbnail,
    exportSettings,
    onExportChange,
    ed,
    set,
    sec,
    tab,
    setTab,
    tabs,
    time,
    duration,
    frames,
    src,
    preset,
    aT,
    bT,
    est,
    setIn,
    setOut,
    capturePoster,
    resetFrame,
  } = useVideoStudio();

  // The real video frame used to preview every look: the filmstrip frame closest
  // to the playhead, falling back to the poster thumbnail.
  const lookFrame = useMemo(() => {
    if (frames.length) {
      const i = clamp(
        Math.round((time / (duration || 1)) * (frames.length - 1)),
        0,
        frames.length - 1,
      );
      return frames[i];
    }
    return thumbnail;
  }, [frames, time, duration, thumbnail]);

  const numInput = (raw: string, fallback: number) => {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <aside
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-muted ${className}`}
    >
      <StudioTabs tabs={tabs} active={tab} onChange={setTab} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 [scrollbar-width:thin]">
        {tab === "frame" && (
          <>
            <Group title="Frame to">
              <div className="grid grid-cols-3 gap-2">
                {FRAME_PRESETS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={ed.frame.id === f.id}
                    onClick={() => sec("frame", { id: f.id })}
                    className={`flex flex-col items-center gap-1.5 rounded-xl  p-2.5 text-[11px] font-medium transition-colors ${ed.frame.id === f.id ? " bg-primary/30 text-primary" : " text-muted-foreground hover:bg-primary/10 bg-background"}`}
                  >
                    <span className="grid h-8 w-10 place-items-center">
                      <span
                        className="block bg-current opacity-70"
                        style={{
                          width: f.ratio
                            ? f.ratio >= 1
                              ? 32
                              : 32 * f.ratio
                            : 32,
                          height: f.ratio
                            ? f.ratio >= 1
                              ? 32 / f.ratio
                              : 32
                            : 22,
                        }}
                      />
                    </span>
                    {f.label}
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {f.sub}
                    </span>
                  </button>
                ))}
              </div>
            </Group>
            <Group title="Position">
              <Range
                label="Zoom"
                value={ed.frame.zoom}
                min={1}
                max={4}
                step={0.01}
                unit="x"
                onChange={(v) => sec("frame", { zoom: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Range
                  label="Focus X"
                  value={ed.frame.x}
                  min={0}
                  max={100}
                  step={0.1}
                  unit="%"
                  onChange={(v) => sec("frame", { x: v })}
                />
                <Range
                  label="Focus Y"
                  value={ed.frame.y}
                  min={0}
                  max={100}
                  step={0.1}
                  unit="%"
                  onChange={(v) => sec("frame", { y: v })}
                />
              </div>
            </Group>
            <Group title="Orientation">
              <div className="grid grid-cols-4 gap-2">
                <Btn
                  title="Rotate left"
                  icon={<RotateCcw size={14} />}
                  onClick={() =>
                    sec("frame", { rot: (ed.frame.rot + 270) % 360 })
                  }
                />
                <Btn
                  title="Rotate right"
                  icon={<RotateCw size={14} />}
                  onClick={() =>
                    sec("frame", { rot: (ed.frame.rot + 90) % 360 })
                  }
                />
                <Btn
                  title="Flip horizontal"
                  icon={<FlipHorizontal2 size={14} />}
                  active={ed.frame.flipX}
                  onClick={() => sec("frame", { flipX: !ed.frame.flipX })}
                />
                <Btn
                  title="Flip vertical"
                  icon={<FlipVertical2 size={14} />}
                  active={ed.frame.flipY}
                  onClick={() => sec("frame", { flipY: !ed.frame.flipY })}
                />
              </div>
              <Btn
                className="w-full"
                icon={<RotateCcw size={12} />}
                onClick={resetFrame}
              >
                Reset frame
              </Btn>
              <Note>
                Drag the picture to reposition, scroll to zoom. The final render
                is made on the server.
              </Note>
            </Group>
          </>
        )}

        {tab === "look" && (
          <>
            <Group title="Looks">
              <div className="grid grid-cols-4 gap-2">
                {LOOKS.map((l) => (
                  <Tile
                    key={l.id}
                    label={l.label}
                    active={ed.look.preset === l.id}
                    onClick={() =>
                      sec("look", {
                        preset: l.id,
                        brightness: 100,
                        contrast: 100,
                        saturation: 100,
                        hue: 0,
                        grayscale: 0,
                        sepia: 0,
                        blur: 0,
                      })
                    }
                  >
                    <span
                      className="mb-1 block h-10 w-full overflow-hidden rounded bg-cover bg-center"
                      style={{
                        backgroundImage: lookFrame
                          ? `url("${lookFrame}")`
                          : "linear-gradient(135deg,#5fcdd9,#7b5cd6)",
                        filter: l.css,
                      }}
                    />
                  </Tile>
                ))}
              </div>
            </Group>
            <Group title="Adjust">
              {(
                [
                  ["brightness", "Brightness", 50, 150, "%"],
                  ["contrast", "Contrast", 50, 150, "%"],
                  ["saturation", "Saturation", 0, 200, "%"],
                  ["hue", "Hue shift", -180, 180, "°"],
                  ["blur", "Blur", 0, 12, "px"],
                  ["grayscale", "Grayscale", 0, 100, "%"],
                  ["sepia", "Sepia", 0, 100, "%"],
                ] as const
              ).map(([k, label, min, max, unit]) => (
                <Range
                  key={k}
                  label={label}
                  value={ed.look[k]}
                  min={min}
                  max={max}
                  step={k === "blur" ? 0.5 : 1}
                  unit={unit}
                  onChange={(v) => sec("look", { [k]: v, preset: "custom" })}
                />
              ))}
              <Range
                label="Vignette"
                value={ed.look.vignette}
                min={0}
                max={80}
                unit="%"
                onChange={(v) => sec("look", { vignette: v })}
              />
              <Btn
                className="w-full"
                icon={<RotateCcw size={12} />}
                onClick={() => sec("look", defaultVideoEdits().look)}
              >
                Reset adjustments
              </Btn>
            </Group>
          </>
        )}

        {tab === "props" && (
          <>
            <Group
              title="Caption"
              gated={{
                on: ed.text.on,
                onToggle: (v) => sec("text", { on: v }),
              }}
            >
              <TextIn
                label="Text"
                value={ed.text.value}
                onChange={(v) => sec("text", { value: v })}
              />
              <Range
                label="Size"
                value={ed.text.size}
                min={2}
                max={16}
                step={0.5}
                unit="%"
                onChange={(v) => sec("text", { size: v })}
              />
              <Seg
                label="Weight"
                value={ed.text.weight}
                options={[
                  { value: 400, label: "Regular" },
                  { value: 700, label: "Bold" },
                  { value: 900, label: "Black" },
                ]}
                onChange={(v) => sec("text", { weight: Number(v) })}
              />
              <Swatches
                label="Color"
                value={ed.text.color}
                onChange={(v) => sec("text", { color: v })}
              />
              <PosPicker
                label="Position"
                value={ed.text.pos}
                onChange={(v) => sec("text", { pos: v })}
              />
              <Toggle
                label="Soft shadow"
                checked={ed.text.shadow}
                onChange={(v) => sec("text", { shadow: v })}
              />
            </Group>
            <Group
              title="Watermark"
              gated={{
                on: ed.mark.on,
                onToggle: (v) => sec("mark", { on: v }),
              }}
            >
              <TextIn
                label="Label"
                value={ed.mark.label}
                onChange={(v) => sec("mark", { label: v })}
              />
              <Range
                label="Size"
                value={ed.mark.size}
                min={6}
                max={30}
                unit="%"
                onChange={(v) => sec("mark", { size: v })}
              />
              <Range
                label="Opacity"
                value={ed.mark.opacity}
                min={20}
                max={100}
                unit="%"
                onChange={(v) => sec("mark", { opacity: v })}
              />
              <PosPicker
                label="Position"
                value={ed.mark.pos}
                onChange={(v) => sec("mark", { pos: v })}
              />
            </Group>
            <Group
              title="Badge"
              gated={{
                on: ed.badge.on,
                onToggle: (v) => sec("badge", { on: v }),
              }}
            >
              <Seg
                value={ed.badge.type}
                options={(Object.keys(BADGES) as (keyof typeof BADGES)[]).map(
                  (k) => ({ value: k, label: BADGES[k].label }),
                )}
                onChange={(v) => sec("badge", { type: v })}
              />
              <PosPicker
                label="Position"
                value={ed.badge.pos}
                onChange={(v) => sec("badge", { pos: v })}
              />
            </Group>
          </>
        )}

        {tab === "trim" && (
          <>
            <Group title="Range">
              <div className="grid grid-cols-2 gap-3">
                <Field label="In">
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={duration}
                    value={aT.toFixed(1)}
                    onChange={(e) =>
                      sec("trim", {
                        a: clamp(
                          numInput(e.target.value, aT) / (duration || 1),
                          0,
                          ed.trim.b - 0.01,
                        ),
                      })
                    }
                    className="h-9 w-full rounded-lg border border-muted-foreground/15 bg-input/50 px-2.5 font-mono text-xs tabular-nums focus:border-primary/40 focus:outline-none"
                  />
                </Field>
                <Field label="Out">
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={duration}
                    value={bT.toFixed(1)}
                    onChange={(e) =>
                      sec("trim", {
                        b: clamp(
                          numInput(e.target.value, bT) / (duration || 1),
                          ed.trim.a + 0.01,
                          1,
                        ),
                      })
                    }
                    className="h-9 w-full rounded-lg border border-muted-foreground/15 bg-input/50 px-2.5 font-mono text-xs tabular-nums focus:border-primary/40 focus:outline-none"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Btn icon={<Scissors size={12} />} onClick={setIn}>
                  Set in here
                </Btn>
                <Btn icon={<Scissors size={12} />} onClick={setOut}>
                  Set out here
                </Btn>
              </div>
              <Btn
                className="w-full"
                onClick={() => sec("trim", { a: 0, b: 1 })}
              >
                Use full length
              </Btn>
              <KV
                rows={[
                  ["Length", fmtTime(bT - aT)],
                  ["After speed", fmtTime(est.len)],
                  ["Original", fmtTime(duration)],
                ]}
              />
            </Group>
            <Group title="Playback">
              <Sel
                label="Speed"
                value={String(ed.speed)}
                options={SPEEDS.map((s) => ({
                  value: String(s),
                  label: `${s}×`,
                }))}
                onChange={(v) => set({ speed: +v })}
              />
              <Toggle
                label="Loop the selection"
                checked={ed.loop}
                onChange={(v) => set({ loop: v })}
              />
            </Group>
            <Group title="Sound">
              <Toggle
                label="Mute"
                sub="Removes the audio track from the export"
                checked={ed.mute}
                onChange={(v) => set({ mute: v })}
              />
              <Range
                label="Volume"
                value={ed.volume}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => set({ volume: v })}
              />
              <Range
                label="Fade in"
                value={ed.fadeIn}
                min={0}
                max={5}
                step={0.1}
                unit="s"
                onChange={(v) => set({ fadeIn: round3(v) })}
              />
              <Range
                label="Fade out"
                value={ed.fadeOut}
                min={0}
                max={5}
                step={0.1}
                unit="s"
                onChange={(v) => set({ fadeOut: round3(v) })}
              />
            </Group>
          </>
        )}

        {tab === "export" && (
          <>
            <Group title="Video">
              <Sel
                label="Max height"
                value={String(exportSettings.maxRes)}
                options={[
                  { value: "", label: "Source" },
                  ...[2160, 1440, 1080, 720, 480].map((r) => ({
                    value: String(r),
                    label: `${r}p`,
                  })),
                ]}
                onChange={(v) =>
                  onExportChange({ maxRes: v === "" ? "" : Number(v) })
                }
              />
              <Range
                label="Bitrate"
                value={exportSettings.bitrateKbps}
                min={500}
                max={8000}
                step={100}
                unit=" kbps"
                onChange={(v) => onExportChange({ bitrateKbps: v })}
              />
              <Sel
                label="Frame rate"
                value={String(exportSettings.fps)}
                options={[24, 30, 60].map((f) => ({
                  value: String(f),
                  label: `${f} fps`,
                }))}
                onChange={(v) =>
                  onExportChange({ fps: Number(v) as 24 | 30 | 60 })
                }
              />
              <Seg
                label="Format"
                value={exportSettings.format}
                options={[
                  { value: "mp4", label: "MP4 · H.264" },
                  { value: "webm", label: "WebM · VP9" },
                ]}
                onChange={(v) => onExportChange({ format: v })}
              />
              <Toggle
                label="Keep audio"
                checked={exportSettings.keepAudio}
                onChange={(v) => onExportChange({ keepAudio: v })}
              />
            </Group>
            <Group title="Poster frame">
              <button
                type="button"
                onClick={capturePoster}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/3 p-3 text-left hover:border-primary/40 hover:bg-primary/5"
              >
                <span
                  className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/40 bg-cover bg-center"
                  style={
                    thumbnail
                      ? { backgroundImage: `url("${thumbnail}")` }
                      : undefined
                  }
                >
                  {!thumbnail && (
                    <Camera size={18} className="text-muted-foreground" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">
                    Capture poster
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    Uses the frame, look and props at the playhead
                  </span>
                </span>
              </button>
            </Group>
            <Group title="Result">
              <KV
                rows={[
                  [
                    "Output frame",
                    preset.ratio
                      ? preset.sub
                      : src.w
                        ? `${src.w}×${src.h}`
                        : "—",
                  ],
                  ["Length", fmtTime(est.len)],
                  ["Estimated size", formatBytes(Math.round(est.bytes))],
                  ["Source", src.w ? `${src.w}×${src.h}` : "—"],
                  ["Format", exportSettings.format.toUpperCase()],
                ]}
              />
              <Note>
                Video is re-encoded on the server with FFmpeg after you
                dispatch.
              </Note>
            </Group>
          </>
        )}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// COMPATIBILITY DEFAULT EXPORT (STAGE PLAYGROUND)
// ─────────────────────────────────────────────

export function VideoStudio(
  props: Partial<VideoStudioProps> & { className?: string },
) {
  const ctx = useContext(VideoStudioContext);

  if (ctx) {
    return <VideoStage className={props.className} />;
  }

  if (
    !props.file ||
    !props.url ||
    !props.exportSettings ||
    !props.onExportChange
  ) {
    return null;
  }

  return (
    <VideoStudioProvider
      file={props.file}
      url={props.url}
      thumbnail={props.thumbnail}
      exportSettings={props.exportSettings}
      onExportChange={props.onExportChange}
      onPoster={props.onPoster}
      initialEdits={props.initialEdits}
      onEditsChange={props.onEditsChange}
    >
      <VideoStage className={props.className} />
    </VideoStudioProvider>
  );
}
