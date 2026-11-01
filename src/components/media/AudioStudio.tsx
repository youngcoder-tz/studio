// gn-apex/src/components/media/AudioStudio.tsx
// Audio workbench split into Provider, Stage (Playground), and Inspector.

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
  Scissors,
  Volume2,
  SlidersHorizontal,
  Download,
  Play,
  Pause,
  Repeat,
  Undo2,
  Redo2,
  StepBack,
  StepForward,
  Music2,
  Mic2,
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
  Tile,
  TextIn,
  Kbd,
  isTyping,
  mergeSection,
  useEditHistory,
  fmtTime,
  clamp,
} from "./studioControls";
import { defaultAudioEdits, type AudioEdits } from "./studioEdits";

// ─────────────────────────────────────────────
// TYPES & CONTEXT
// ─────────────────────────────────────────────

export interface AudioExportSettings {
  fmt: "ogg" | "wav";
  bitrateKbps: number;
  ch: 1 | 2;
  sr: number;
}

export interface AudioStudioProps {
  file: File;
  url: string;
  exportSettings?: AudioExportSettings;
  onExportChange: (p: Partial<AudioExportSettings>) => void;
  initialEdits?: AudioEdits | null;
  onEditsChange?: (e: AudioEdits) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const TONES: Record<
  string,
  {
    label: string;
    bass: number;
    treble: number;
    lowpass: number;
    highpass: number;
  }
> = {
  flat: { label: "Flat", bass: 0, treble: 0, lowpass: 20000, highpass: 20 },
  voice: { label: "Voice", bass: -3, treble: 3, lowpass: 12000, highpass: 120 },
  podcast: {
    label: "Podcast",
    bass: 2,
    treble: 4,
    lowpass: 16000,
    highpass: 80,
  },
  warm: { label: "Warm", bass: 5, treble: -3, lowpass: 14000, highpass: 20 },
  bright: {
    label: "Bright",
    bass: -2,
    treble: 6,
    lowpass: 20000,
    highpass: 40,
  },
  phone: { label: "Phone", bass: -6, treble: 0, lowpass: 3400, highpass: 300 },
};
const BARS = 600;

interface AudioStudioContextValue {
  file: File;
  url: string;
  exportSettings?: AudioExportSettings;
  onExportChange: (p: Partial<AudioExportSettings>) => void;
  ed: AudioEdits;
  setEd: React.Dispatch<React.SetStateAction<AudioEdits>>;
  set: (p: Partial<AudioEdits>) => void;
  trim: (p: Partial<AudioEdits["trim"]>) => void;
  hist: ReturnType<typeof useEditHistory<AudioEdits>>;
  tab: string;
  setTab: React.Dispatch<React.SetStateAction<string>>;
  tabs: StudioTabDef[];
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  time: number;
  duration: number;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  peaks: Float32Array | null;
  peakAbs: number;
  peakDb: number | null;
  info: { sr: number; ch: number };
  drag: "a" | "b" | "head" | null;
  setDrag: React.Dispatch<React.SetStateAction<"a" | "b" | "head" | null>>;
  aT: number;
  bT: number;
  len: number;
  bytes: number;
  sr: number;
  ch: number;
  exp: AudioExportSettings;
  seek: (t: number) => void;
  togglePlay: () => void;
  setIn: () => void;
  setOut: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  waveRef: React.RefObject<HTMLCanvasElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  meterRef: React.RefObject<HTMLDivElement | null>;
  onKey: (e: React.KeyboardEvent) => void;
  pFrom: (e: { clientX: number }) => number;
}

const AudioStudioContext = createContext<AudioStudioContextValue | null>(null);

export function useAudioStudio(): AudioStudioContextValue {
  const ctx = useContext(AudioStudioContext);
  if (!ctx) {
    throw new Error(
      "useAudioStudio must be used within an AudioStudioProvider",
    );
  }
  return ctx;
}

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export function AudioStudioProvider({
  file,
  url,
  exportSettings,
  onExportChange,
  initialEdits,
  onEditsChange,
  children,
}: AudioStudioProps & { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const meterRef = useRef<HTMLDivElement | null>(null);
  const graph = useRef<{
    ctx: AudioContext;
    hp: BiquadFilterNode;
    lo: BiquadFilterNode;
    hi: BiquadFilterNode;
    lp: BiquadFilterNode;
    gain: GainNode;
    an: AnalyserNode;
  } | null>(null);

  const [tab, setTab] = useState("trim");
  const [ed, setEd] = useState<AudioEdits>(
    () => initialEdits ?? defaultAudioEdits(),
  );
  const hist = useEditHistory(ed, setEd);
  const set = useCallback(
    (p: Partial<AudioEdits>) => setEd((s) => ({ ...s, ...p })),
    [],
  );
  const trim = useCallback(
    (p: Partial<AudioEdits["trim"]>) =>
      setEd((s) => mergeSection(s, "trim", p)),
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
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [peakAbs, setPeakAbs] = useState(0);
  const [info, setInfo] = useState({ sr: 0, ch: 0 });
  const [drag, setDrag] = useState<"a" | "b" | "head" | null>(null);

  const aT = ed.trim.a * duration;
  const bT = ed.trim.b * duration;
  const exp = useMemo(
    () =>
      exportSettings ?? {
        fmt: "ogg" as const,
        bitrateKbps: 128,
        ch: 2 as const,
        sr: 44100,
      },
    [exportSettings],
  );

  // ── Decode audio once for waveform display and peak detection ──
  useEffect(() => {
    let dead = false;
    if (file.size > 80 * 1024 * 1024) return;
    (async () => {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AC();
        const dec = await ctx.decodeAudioData(buf);
        ctx.close();
        if (dead) return;
        const out = new Float32Array(BARS);
        let pk = 0;
        for (let c = 0; c < dec.numberOfChannels; c++) {
          const d = dec.getChannelData(c);
          const per = Math.floor(d.length / BARS) || 1;
          for (let i = 0; i < BARS; i++) {
            let m = 0;
            for (
              let j = i * per, e = Math.min(d.length, j + per);
              j < e;
              j += Math.max(1, per >> 6)
            ) {
              m = Math.max(m, Math.abs(d[j]));
            }
            out[i] = Math.max(out[i], m);
            pk = Math.max(pk, m);
          }
        }
        setPeaks(out);
        setPeakAbs(pk);
        setInfo({ sr: dec.sampleRate, ch: dec.numberOfChannels });
      } catch {
        /* Optional waveform fallback */
      }
    })();
    return () => {
      dead = true;
    };
  }, [url, file.size]);

  // ── Web Audio Processing Chain ──
  const ensureGraph = useCallback(() => {
    if (graph.current || !audioRef.current) return graph.current;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    const srcNode = ctx.createMediaElementSource(audioRef.current);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    const lo = ctx.createBiquadFilter();
    lo.type = "lowshelf";
    lo.frequency.value = 200;
    const hi = ctx.createBiquadFilter();
    hi.type = "highshelf";
    hi.frequency.value = 4000;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    const gain = ctx.createGain();
    const an = ctx.createAnalyser();
    an.fftSize = 128;
    srcNode
      .connect(hp)
      .connect(lo)
      .connect(hi)
      .connect(lp)
      .connect(gain)
      .connect(an)
      .connect(ctx.destination);
    graph.current = { ctx, hp, lo, hi, lp, gain, an };
    return graph.current;
  }, []);

  useEffect(
    () => () => {
      graph.current?.ctx.close().catch(() => {});
      graph.current = null;
    },
    [],
  );

  const baseGain = useMemo(() => {
    let db = ed.gain;
    if (ed.normalize && peakAbs > 0) db += -1 - 20 * Math.log10(peakAbs);
    return Math.pow(10, clamp(db, -24, 24) / 20);
  }, [ed.gain, ed.normalize, peakAbs]);

  useEffect(() => {
    const g = graph.current;
    if (!g) return;
    g.hp.frequency.value = ed.highpass;
    g.lp.frequency.value = ed.lowpass;
    g.lo.gain.value = ed.bass;
    g.hi.gain.value = ed.treble;
  }, [ed.highpass, ed.lowpass, ed.bass, ed.treble, playing]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = ed.speed;
    (a as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch =
      ed.keepPitch;
  }, [ed.speed, ed.keepPitch]);

  // ── Frame updates: trim range, fades, audio meter ──
  useEffect(() => {
    if (!playing) {
      if (meterRef.current) meterRef.current.style.setProperty("--lv", "0");
      return;
    }
    let raf = 0;
    const buf = new Uint8Array(64);
    const tick = () => {
      const a = audioRef.current;
      if (a) {
        if (duration > 0 && a.currentTime >= bT - 0.02) {
          if (ed.loop) a.currentTime = aT;
          else {
            a.pause();
            setPlaying(false);
            return;
          }
        } else if (duration > 0 && a.currentTime < aT - 0.05)
          a.currentTime = aT;

        let e = 1;
        if (ed.fadeIn > 0)
          e = Math.min(e, clamp((a.currentTime - aT) / ed.fadeIn, 0, 1));
        if (ed.fadeOut > 0)
          e = Math.min(e, clamp((bT - a.currentTime) / ed.fadeOut, 0, 1));

        const g = graph.current;
        if (g) {
          g.gain.gain.value = baseGain * e;
          g.an.getByteFrequencyData(buf);
          let s = 0;
          for (let i = 0; i < 48; i++) s += buf[i];
          meterRef.current?.style.setProperty(
            "--lv",
            String(Math.min(1, s / 48 / 180)),
          );
        } else a.volume = clamp(baseGain * e, 0, 1);

        setTime(a.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, aT, bT, ed.loop, ed.fadeIn, ed.fadeOut, baseGain, duration]);

  const seek = useCallback(
    (t: number) => {
      const a = audioRef.current;
      if (!a) return;
      const targetTime = duration > 0 ? clamp(t, 0, duration) : Math.max(0, t);
      a.currentTime = targetTime;
      setTime(targetTime);
    },
    [duration],
  );

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    const g = ensureGraph();
    g?.ctx.resume();
    if (duration > 0 && (a.currentTime < aT || a.currentTime >= bT - 0.03)) {
      a.currentTime = aT;
    }
    a.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [playing, aT, bT, duration, ensureGraph]);

  const setIn = useCallback(() => {
    trim({ a: clamp(time / (duration || 1), 0, ed.trim.b - 0.01) });
  }, [trim, time, duration, ed.trim.b]);

  const setOut = useCallback(() => {
    trim({ b: clamp(time / (duration || 1), ed.trim.a + 0.01, 1) });
  }, [trim, time, duration, ed.trim.a]);

  const pFrom = useCallback((e: { clientX: number }) => {
    if (!trackRef.current) return 0;
    const r = trackRef.current.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width, 0, 1);
  }, []);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const p = pFrom(e);
      if (drag === "a") trim({ a: Math.min(p, ed.trim.b - 0.01) });
      else if (drag === "b") trim({ b: Math.max(p, ed.trim.a + 0.01) });
      else seek(p * duration);
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, ed.trim.a, ed.trim.b, duration, seek, trim, pFrom]);

  // ── Render Waveform Canvas ──
  useEffect(() => {
    const c = waveRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const x = c.getContext("2d");
    if (!x) return;
    x.scale(dpr, dpr);
    x.clearRect(0, 0, w, h);
    const n = peaks ? BARS : 120;
    const bw = w / n;
    const scale = ed.normalize && peakAbs ? 1 / peakAbs : 1;
    for (let i = 0; i < n; i++) {
      const p = i / n;
      const v = peaks
        ? clamp(peaks[i] * scale * Math.pow(10, ed.gain / 20), 0, 1)
        : 0.15 + 0.1 * Math.sin(i / 5);
      const inside = p >= ed.trim.a && p <= ed.trim.b;
      x.fillStyle = !peaks
        ? "rgba(255,255,255,.1)"
        : inside
          ? p < time / (duration || 1)
            ? "#5fcdd9"
            : "rgba(95,205,217,.55)"
          : "rgba(255,255,255,.14)";
      const bh = Math.max(2, v * h * 0.9);
      x.fillRect(i * bw, (h - bh) / 2, Math.max(1, bw - 0.6), bh);
    }
  }, [
    peaks,
    ed.trim.a,
    ed.trim.b,
    ed.gain,
    ed.normalize,
    peakAbs,
    time,
    duration,
    tab,
  ]);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z") {
        e.preventDefault();
        if (e.shiftKey) hist.redo();
        else hist.undo();
      } else if (k === " ") {
        e.preventDefault();
        togglePlay();
      } else if (k === "arrowleft") seek(time - (e.shiftKey ? 5 : 1));
      else if (k === "arrowright") seek(time + (e.shiftKey ? 5 : 1));
      else if (k === "i") setIn();
      else if (k === "o") setOut();
      else if (k === "l") set({ loop: !ed.loop });
    },
    [hist, togglePlay, seek, time, setIn, setOut, set, ed.loop],
  );

  const len = Math.max(0, bT - aT) / (ed.speed || 1);
  const sr = exp.sr;
  const ch = ed.mono ? 1 : exp.ch;
  const bytes =
    exp.fmt === "wav"
      ? sr * ch * 2 * len + 44
      : ((exp.bitrateKbps * 1000) / 8) * len * (ch === 1 ? 0.7 : 1);
  const peakDb = peakAbs ? 20 * Math.log10(peakAbs) : null;

  const tabs: StudioTabDef[] = useMemo(
    () => [
      { id: "trim", label: "Trim", icon: <Scissors size={15} /> },
      { id: "sound", label: "Sound", icon: <Volume2 size={15} /> },
      { id: "tone", label: "Tone", icon: <SlidersHorizontal size={15} /> },
      { id: "export", label: "Export", icon: <Download size={15} /> },
    ],
    [],
  );

  const value = useMemo<AudioStudioContextValue>(
    () => ({
      file,
      url,
      exportSettings,
      onExportChange,
      ed,
      setEd,
      set,
      trim,
      hist,
      tab,
      setTab,
      tabs,
      playing,
      setPlaying,
      time,
      duration,
      setDuration,
      peaks,
      peakAbs,
      peakDb,
      info,
      drag,
      setDrag,
      aT,
      bT,
      len,
      bytes,
      sr,
      ch,
      exp,
      seek,
      togglePlay,
      setIn,
      setOut,
      audioRef,
      waveRef,
      trackRef,
      meterRef,
      onKey,
      pFrom,
    }),
    [
      file,
      url,
      exportSettings,
      onExportChange,
      ed,
      set,
      trim,
      hist,
      tab,
      tabs,
      playing,
      time,
      duration,
      peaks,
      peakAbs,
      peakDb,
      info,
      drag,
      aT,
      bT,
      len,
      bytes,
      sr,
      ch,
      exp,
      seek,
      togglePlay,
      setIn,
      setOut,
      audioRef,
      waveRef,
      trackRef,
      meterRef,
      onKey,
      pFrom,
    ],
  );

  return (
    <AudioStudioContext.Provider value={value}>
      {children}
    </AudioStudioContext.Provider>
  );
}

// ─────────────────────────────────────────────
// STAGE COMPONENT (Window playground)
// ─────────────────────────────────────────────

export interface AudioStageProps {
  className?: string;
}

export function AudioStage({ className = "" }: AudioStageProps) {
  const {
    file,
    url,
    ed,
    set,
    hist,
    playing,
    setPlaying,
    time,
    duration,
    setDuration,
    info,
    peakDb,
    seek,
    togglePlay,
    audioRef,
    waveRef,
    trackRef,
    meterRef,
    onKey,
    setDrag,
    pFrom,
    aT,
    bT,
  } = useAudioStudio();

  return (
    <div
      tabIndex={0}
      onKeyDown={onKey}
      className={`relative flex size-full min-h-0 flex-1 flex-col overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    >
      {/* ── AUDIO PLAYGROUND (Zero overflow-y) ── */}
      <Stage className="size-full flex-1 min-h-0 overflow-hidden p-3 lg:p-4">
        <div className="flex h-full w-full max-w-3xl flex-col items-center justify-center space-y-3">
          {/* Record Disc & Ambient Level Meter */}
          <div className="relative mx-auto grid aspect-16/7 max-h-[46vh] w-full place-items-center overflow-hidden rounded-none border border-white/10 bg-black shadow-2xl">
            <div
              ref={meterRef}
              className="absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(95,205,217,calc(.05 + var(--lv,0) * .35)), transparent 62%)",
              }}
            />
            <svg
              viewBox="0 0 100 100"
              className={`relative size-36 sm:size-48 ${
                playing ? "animate-[spin_3s_linear_infinite]" : ""
              }`}
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="#0b0f11"
                stroke="#1d262b"
                strokeWidth=".8"
              />
              {[38, 32, 26, 20].map((r) => (
                <circle
                  key={r}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke="#1a2328"
                  strokeWidth=".7"
                />
              ))}
              <circle cx="50" cy="50" r="14" fill="url(#vg)" />
              <defs>
                <linearGradient id="vg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5fcdd9" />
                  <stop offset="100%" stopColor="#7b5cd6" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="2.2" fill="#0b0f11" />
              <path
                d="M50 4 A46 46 0 0 1 90 28"
                fill="none"
                stroke="rgba(255,255,255,.12)"
                strokeWidth="1.2"
              />
            </svg>
            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
              <Chip>
                <Music2 size={12} className="text-sky-400" />
                {file.name.split(".").pop()?.toUpperCase()}
              </Chip>
              {info.sr > 0 && (
                <Chip>
                  {(info.sr / 1000).toFixed(1)} kHz ·{" "}
                  {info.ch === 1 ? "Mono" : `${info.ch} ch`}
                </Chip>
              )}
              {peakDb !== null && <Chip>Peak {peakDb.toFixed(1)} dB</Chip>}
            </div>
            {(ed.title || ed.artist) && (
              <div className="absolute bottom-3 left-4 text-xs">
                <b>{ed.title}</b>{" "}
                <span className="text-muted-foreground">{ed.artist}</span>
              </div>
            )}
          </div>

          {/* Transport Dock */}
          <div className="flex w-full max-w-3xl flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-black/50 px-2 py-1.5">
            <audio
              ref={audioRef}
              src={url}
              preload="metadata"
              className="hidden"
              onLoadedMetadata={(e) => {
                const el = e.currentTarget;
                if (el.duration && Number.isFinite(el.duration)) {
                  setDuration(el.duration);
                }
              }}
              onEnded={() => setPlaying(false)}
            />
            <IconBtn label="Undo" onClick={hist.undo} disabled={!hist.canUndo}>
              <Undo2 size={15} />
            </IconBtn>
            <IconBtn label="Redo" onClick={hist.redo} disabled={!hist.canRedo}>
              <Redo2 size={15} />
            </IconBtn>
            <span className="mx-1 h-4 w-px bg-white/10" />
            <IconBtn label="Back 5 seconds" onClick={() => seek(time - 5)}>
              <StepBack size={15} />
            </IconBtn>
            <IconBtn label={playing ? "Pause" : "Play"} onClick={togglePlay}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </IconBtn>
            <IconBtn label="Forward 5 seconds" onClick={() => seek(time + 5)}>
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
              <select
                value={ed.speed}
                onChange={(e) => set({ speed: +e.target.value })}
                aria-label="Speed"
                className="rounded border border-white/10 bg-black/50 px-1 py-0.5 text-xs text-white/80"
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="hidden items-center justify-center gap-2 text-[10px] text-muted-foreground sm:flex">
            <Kbd>Space</Kbd> play <Kbd>←</Kbd>
            <Kbd>→</Kbd> seek <Kbd>I</Kbd>
            <Kbd>O</Kbd> in/out <Kbd>L</Kbd> loop
          </p>
        </div>
      </Stage>

      {/* ── WAVEFORM TIMELINE (Anchored directly above queue) ── */}
      <div className="shrink-0 space-y-1 border-t border-white/8 bg-black/40 px-4 py-2.5">
        <div
          ref={trackRef}
          onPointerDown={(e) => {
            setDrag("head");
            seek(pFrom(e) * duration);
          }}
          className="relative h-20 cursor-pointer touch-none overflow-hidden rounded-lg border border-white/10 bg-neutral-900"
        >
          <canvas ref={waveRef} className="absolute inset-0 size-full" />
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
              role="slider"
              aria-label={h === "a" ? "Trim in" : "Trim out"}
              aria-valuenow={Math.round(ed.trim[h] * 100)}
              className="absolute inset-y-0 z-10 flex w-3 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded bg-primary"
              style={{ left: `${ed.trim[h] * 100}%` }}
            >
              <span className="h-5 w-0.5 rounded bg-primary-foreground/80" />
            </div>
          ))}
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white shadow"
            style={{ left: `${(time / (duration || 1)) * 100}%` }}
          />
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

export interface AudioInspectorProps {
  className?: string;
}

export function AudioInspector({ className = "" }: AudioInspectorProps) {
  const {
    file,
    onExportChange,
    ed,
    set,
    trim,
    tab,
    setTab,
    tabs,
    duration,
    peakDb,
    aT,
    bT,
    len,
    bytes,
    sr,
    ch,
    exp,
    setIn,
    setOut,
  } = useAudioStudio();

  return (
    <aside
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-muted ${className}`}
    >
      <StudioTabs tabs={tabs} active={tab} onChange={setTab} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 [scrollbar-width:thin]">
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
                      trim({
                        a: clamp(
                          +e.target.value / (duration || 1),
                          0,
                          ed.trim.b - 0.01,
                        ),
                      })
                    }
                    className="h-9 w-full rounded-lg border border-muted-foreground/15 bg-input/50 px-2.5 font-mono text-xs focus:border-primary/40 focus:outline-none"
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
                      trim({
                        b: clamp(
                          +e.target.value / (duration || 1),
                          ed.trim.a + 0.01,
                          1,
                        ),
                      })
                    }
                    className="h-9 w-full rounded-lg border border-muted-foreground/15 bg-input/50 px-2.5 font-mono text-xs focus:border-primary/40 focus:outline-none"
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
              <Btn className="w-full" onClick={() => trim({ a: 0, b: 1 })}>
                Use full length
              </Btn>
              <KV
                rows={[
                  ["Length", fmtTime(bT - aT)],
                  ["After speed", fmtTime(len)],
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
                label="Keep pitch"
                sub="Off gives a tape-speed effect"
                checked={ed.keepPitch}
                onChange={(v) => set({ keepPitch: v })}
              />
              <Toggle
                label="Loop the selection"
                checked={ed.loop}
                onChange={(v) => set({ loop: v })}
              />
            </Group>
            <Note>
              Drag the teal handles to trim. Click or drag on the waveform to
              move the playhead.
            </Note>
          </>
        )}

        {tab === "sound" && (
          <>
            <Group title="Level">
              <Toggle
                label="Normalize volume"
                sub={
                  peakDb !== null
                    ? `Peak is ${peakDb.toFixed(1)} dBFS, raised to −1.0 dBFS`
                    : "Peak level unknown"
                }
                checked={ed.normalize}
                onChange={(v) => set({ normalize: v })}
              />
              <Range
                label="Gain"
                value={ed.gain}
                min={-12}
                max={12}
                step={0.5}
                unit="dB"
                onChange={(v) => set({ gain: v })}
              />
              <Range
                label="Fade in"
                value={ed.fadeIn}
                min={0}
                max={5}
                step={0.1}
                unit="s"
                onChange={(v) => set({ fadeIn: v })}
              />
              <Range
                label="Fade out"
                value={ed.fadeOut}
                min={0}
                max={5}
                step={0.1}
                unit="s"
                onChange={(v) => set({ fadeOut: v })}
              />
            </Group>
            <Group title="Channels">
              <Seg
                value={ed.mono ? 1 : 2}
                options={[
                  { value: 1, label: "Mono" },
                  { value: 2, label: "Stereo" },
                ]}
                onChange={(v) => {
                  set({ mono: Number(v) === 1 });
                  onExportChange({ ch: Number(v) as 1 | 2 });
                }}
              />
              <Sel
                label="Sample rate"
                value={String(exp.sr)}
                options={[
                  [48000, "48 kHz"],
                  [44100, "44.1 kHz"],
                  [22050, "22.05 kHz"],
                  [16000, "16 kHz voice"],
                ].map(([v, l]) => ({ value: String(v), label: String(l) }))}
                onChange={(v) => onExportChange({ sr: +v })}
              />
            </Group>
            <Note>
              Gain, normalize and fades play back live. Sample rate and channels
              are applied when the file is processed.
            </Note>
          </>
        )}

        {tab === "tone" && (
          <>
            <Group title="Presets">
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(TONES).map(([id, t]) => (
                  <Tile
                    key={id}
                    label={t.label}
                    active={ed.tone === id}
                    onClick={() =>
                      set({
                        tone: id,
                        bass: t.bass,
                        treble: t.treble,
                        lowpass: t.lowpass,
                        highpass: t.highpass,
                      })
                    }
                  >
                    <span className=" grid h-7 place-items-center">
                      <Mic2 size={16} />
                    </span>
                  </Tile>
                ))}
              </div>
            </Group>
            <Group title="Equaliser">
              <Range
                label="Bass"
                value={ed.bass}
                min={-12}
                max={12}
                step={0.5}
                unit="dB"
                onChange={(v) => set({ bass: v, tone: "custom" })}
              />
              <Range
                label="Treble"
                value={ed.treble}
                min={-12}
                max={12}
                step={0.5}
                unit="dB"
                onChange={(v) => set({ treble: v, tone: "custom" })}
              />
              <Sel
                label="High-pass (cut rumble)"
                value={String(ed.highpass)}
                options={[
                  [20, "Off"],
                  [80, "80 Hz"],
                  [120, "120 Hz"],
                  [300, "300 Hz"],
                ].map(([v, l]) => ({ value: String(v), label: String(l) }))}
                onChange={(v) => set({ highpass: +v, tone: "custom" })}
              />
              <Sel
                label="Low-pass"
                value={String(ed.lowpass)}
                options={[
                  [20000, "Off"],
                  [16000, "16 kHz"],
                  [12000, "12 kHz"],
                  [8000, "8 kHz"],
                  [3400, "3.4 kHz"],
                ].map(([v, l]) => ({ value: String(v), label: String(l) }))}
                onChange={(v) => set({ lowpass: +v, tone: "custom" })}
              />
              <Btn
                className="w-full"
                onClick={() => set({ tone: "flat", ...TONES.flat })}
              >
                Reset tone
              </Btn>
            </Group>
          </>
        )}

        {tab === "export" && (
          <>
            <Group title="Format">
              <Seg
                value={exp.fmt}
                options={[
                  { value: "ogg", label: "Ogg Vorbis" },
                  { value: "wav", label: "WAV" },
                ]}
                onChange={(v) => onExportChange({ fmt: v })}
              />
              {exp.fmt === "ogg" && (
                <Sel
                  label="Bitrate"
                  value={String(exp.bitrateKbps)}
                  options={[64, 96, 128, 192, 256].map((b) => ({
                    value: String(b),
                    label: `${b} kbps`,
                  }))}
                  onChange={(v) => onExportChange({ bitrateKbps: +v })}
                />
              )}
            </Group>
            <Group title="Tags">
              <TextIn
                label="Title"
                value={ed.title}
                onChange={(v) => set({ title: v })}
              />
              <TextIn
                label="Artist"
                value={ed.artist}
                onChange={(v) => set({ artist: v })}
              />
            </Group>
            <Group title="Result">
              <KV
                rows={[
                  ["Length", fmtTime(len)],
                  ["Estimated size", formatBytes(Math.round(bytes))],
                  ["Channels", ch === 1 ? "Mono" : "Stereo"],
                  ["Sample rate", `${sr / 1000} kHz`],
                  ["Original", formatBytes(file.size)],
                ]}
              />
              <Note>Audio is re-encoded on the server after you dispatch.</Note>
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

export function AudioStudio(
  props: Partial<AudioStudioProps> & { className?: string },
) {
  const ctx = useContext(AudioStudioContext);

  if (ctx) {
    return <AudioStage className={props.className} />;
  }

  if (!props.file || !props.url || !props.onExportChange) {
    return null;
  }

  return (
    <AudioStudioProvider
      file={props.file}
      url={props.url}
      exportSettings={props.exportSettings}
      onExportChange={props.onExportChange}
      initialEdits={props.initialEdits}
      onEditsChange={props.onEditsChange}
    >
      <AudioStage className={props.className} />
    </AudioStudioProvider>
  );
}
