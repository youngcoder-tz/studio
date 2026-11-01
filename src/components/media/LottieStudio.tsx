// gn-apex/src/components/media/LottieStudio.tsx
// Lottie workbench: scrubbable player, segment looping, stage backgrounds, size
// tests, live recolouring (JSON) and a real optimiser (minify, round, strip).

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  Play,
  Pause,
  Repeat,
  Frame,
  Palette,
  Download,
  Undo2,
  Redo2,
  StepBack,
  StepForward,
  Grid3x3,
  Square,
  RotateCcw,
  Box,
} from "lucide-react";
import {
  Stage,
  StudioTabs,
  type StudioTabDef,
  Group,
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
  Tile,
  Kbd,
  isTyping,
  mergeSection,
  useEditHistory,
  fmtBytes,
  clamp,
} from "./studioControls";
import {
  defaultLottieEdits,
  applyRecolor,
  lottiePalette,
  lottieInfo,
  optimizeLottie,
  type LottieEdits,
} from "./studioEdits";

export type LottieData = Record<string, unknown>;

type DotLottieInstance = Parameters<
  NonNullable<
    React.ComponentProps<typeof DotLottieReact>["dotLottieRefCallback"]
  >
>[0];

export interface LottieStudioProps {
  file: File;
  /** Parsed JSON for .json files, null for binary .lottie. */
  data: LottieData | null;
  /** Object URL, used by the dotLottie player. */
  url: string | null;
  initialEdits?: LottieEdits | null;
  onEditsChange?: (e: LottieEdits) => void;
}

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3];
const SIZES = [
  [0, "Fit"],
  [24, "24 px"],
  [48, "48 px"],
  [96, "96 px"],
  [256, "256 px"],
] as const;
const hex = (h: string) => h.toLowerCase();

export function LottieStudio({
  file,
  data,
  url,
  initialEdits,
  onEditsChange,
}: LottieStudioProps) {
  const isJson = !!data;
  const lref = useRef<LottieRefCurrentProps | null>(null);
  const dl = useRef<DotLottieInstance>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [tab, setTab] = useState("play");
  const [ed, setEd] = useState<LottieEdits>(
    () => initialEdits ?? defaultLottieEdits(),
  );
  const hist = useEditHistory(ed, setEd);
  const set = useCallback(
    (p: Partial<LottieEdits>) => setEd((s) => ({ ...s, ...p })),
    [],
  );
  const seg = useCallback(
    (p: Partial<LottieEdits["seg"]>) => setEd((s) => mergeSection(s, "seg", p)),
    [],
  );

  const cb = useRef(onEditsChange);
  useEffect(() => {
    cb.current = onEditsChange;
  });

  useEffect(() => {
    cb.current?.(ed);
  }, [ed]);

  const info = useMemo(() => lottieInfo(data), [data]);
  const [dlTotal, setDlTotal] = useState(0);
  const total = isJson ? info.frames : dlTotal;
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scrub, setScrub] = useState(false);
  const dirRef = useRef<1 | -1>(1);

  const palette = useMemo(() => (data ? lottiePalette(data) : []), [data]);
  const live = useMemo(
    () => (data ? applyRecolor(data, ed.recolor) : null),
    [data, ed.recolor],
  );

  // Optimised size, debounced (for large JSON payloads)
  const [optSize, setOptSize] = useState<number | null>(null);
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(
      () => setOptSize(new Blob([optimizeLottie(data, ed)]).size),
      250,
    );
    return () => clearTimeout(t);
  }, [data, ed]);

  const a = Math.round(ed.seg.a * total);
  const b = Math.max(a + 1, Math.round(ed.seg.b * total));

  // Push settings into the player
  useEffect(() => {
    const L = lref.current;
    if (!L) return;
    L.setSpeed(ed.speed);
    dirRef.current = ed.dir;
    L.setDirection(ed.dir);
    if (total && (ed.seg.a > 0 || ed.seg.b < 1)) {
      L.playSegments([info.ip + a, info.ip + b], true);
    } else if (total) {
      L.playSegments([info.ip, info.op], true);
    }
    if (!playing) L.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ed.speed, ed.dir, ed.seg.a, ed.seg.b, total, live]);

  const toggle = useCallback(() => {
    if (isJson) {
      if (playing) {
        lref.current?.pause();
      } else {
        lref.current?.play();
      }
    } else {
      if (playing) {
        dl.current?.pause();
      } else {
        dl.current?.play();
      }
    }
    setPlaying((prev) => !prev);
  }, [isJson, playing]);

  const goTo = useCallback(
    (f: number) => {
      const n = clamp(Math.round(f), 0, Math.max(0, total - 1));
      if (isJson) {
        lref.current?.goToAndStop(info.ip + n, true);
      } else {
        dl.current?.setFrame(n);
      }
      setFrame(n);
      setPlaying(false);
    },
    [isJson, total, info.ip],
  );

  useEffect(() => {
    if (!scrub) return;
    const mv = (e: PointerEvent) => {
      if (!trackRef.current) return;
      const r = trackRef.current.getBoundingClientRect();
      goTo(clamp((e.clientX - r.left) / r.width, 0, 1) * total);
    };
    const up = () => setScrub(false);
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
  }, [scrub, goTo, total]);

  const onKey = (e: React.KeyboardEvent) => {
    if (isTyping(e.target)) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        hist.redo();
      } else {
        hist.undo();
      }
    } else if (k === " ") {
      e.preventDefault();
      toggle();
    } else if (k === "arrowleft") {
      goTo(frame - (e.shiftKey ? 10 : 1));
    } else if (k === "arrowright") {
      goTo(frame + (e.shiftKey ? 10 : 1));
    } else if (k === "l") {
      set({ loop: !ed.loop });
    }
  };

  const stageBg: React.CSSProperties =
    ed.bg === "checker"
      ? {
          backgroundImage:
            "repeating-conic-gradient(#1d262b 0 25%, #27323a 0 50%)",
          backgroundSize: "20px 20px",
        }
      : {
          background:
            ed.bg === "light"
              ? "#ffffff"
              : ed.bg === "dark"
                ? "#0b0f11"
                : ed.bgColor,
        };

  const boxSize = ed.size
    ? { width: ed.size, height: ed.size }
    : { width: "100%", maxWidth: "34rem", aspectRatio: "1 / 1" };
  const mode = ed.bounce ? "bounce" : ed.dir === -1 ? "reverse" : "forward";

  const exportName =
    file.name.replace(/\.(json|lottie)$/i, "") +
    (ed.fmt === "lottie" ? ".lottie" : ".json");
  const est =
    isJson && optSize !== null
      ? ed.fmt === "lottie"
        ? Math.round(optSize * 0.45)
        : optSize
      : file.size;

  const tabs: StudioTabDef[] = [
    { id: "play", label: "Playback", icon: <Play size={15} /> },
    { id: "stage", label: "Stage", icon: <Frame size={15} /> },
    ...(isJson
      ? [{ id: "color", label: "Colors", icon: <Palette size={15} /> }]
      : []),
    { id: "export", label: "Export", icon: <Download size={15} /> },
  ];

  return (
    <div
      tabIndex={0}
      onKeyDown={onKey}
      className="grid min-h-0 flex-1 outline-none lg:grid-cols-[minmax(0,1fr)_23rem]"
    >
      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
        {/* ── PLAYER PLAYGROUND (Zero overflow-y) ── */}
        <Stage className="size-full flex-1 min-h-0 overflow-hidden p-3 lg:p-4">
          <div className="flex h-full w-full flex-col items-center justify-center gap-2.5">
            <div
              className="relative overflow-hidden rounded-none border border-white/10 shadow-2xl"
              style={{
                ...boxSize,
                ...stageBg,
                outline: ed.outline ? "1px dashed #5fcdd9" : undefined,
              }}
            >
              {ed.grid && (
                <div
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(95,205,217,.25) 1px,transparent 1px),linear-gradient(90deg,rgba(95,205,217,.25) 1px,transparent 1px)",
                    backgroundSize: "10% 10%",
                  }}
                />
              )}
              <div className="absolute inset-0 grid place-items-center">
                <div style={{ width: `${ed.scale}%`, height: `${ed.scale}%` }}>
                  {isJson && live ? (
                    <Lottie
                      lottieRef={lref}
                      animationData={live}
                      loop={ed.loop || ed.bounce}
                      autoplay
                      onEnterFrame={(e) => {
                        if (
                          !scrub &&
                          e &&
                          typeof e === "object" &&
                          "currentTime" in e
                        ) {
                          const t =
                            (e as { currentTime?: number }).currentTime ?? 0;
                          setFrame(Math.max(0, Math.round(t - info.ip)));
                        }
                      }}
                      onLoopComplete={() => {
                        if (ed.bounce) {
                          dirRef.current = (dirRef.current * -1) as 1 | -1;
                          lref.current?.setDirection(dirRef.current);
                          lref.current?.play();
                        }
                      }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : url ? (
                    <DotLottieReact
                      src={url}
                      autoplay
                      loop={ed.loop}
                      speed={ed.speed}
                      mode={mode}
                      segment={
                        total && (ed.seg.a > 0 || ed.seg.b < 1)
                          ? [a, b]
                          : undefined
                      }
                      dotLottieRefCallback={(d) => {
                        dl.current = d;
                        if (!d) return;
                        d.addEventListener("load", () => {
                          setDlTotal(Math.round(d.totalFrames ?? 0));
                        });
                        d.addEventListener(
                          "frame",
                          (e: { currentFrame: number }) => {
                            setFrame(Math.round(e.currentFrame));
                          },
                        );
                      }}
                      className="size-full"
                    />
                  ) : null}
                </div>
              </div>
              <div className="pointer-events-none absolute left-3 top-3 z-20 flex gap-1.5">
                <Chip>
                  <Box size={12} className="text-primary" />
                  {isJson ? "Lottie JSON" : "dotLottie"}
                </Chip>
                {isJson && (
                  <Chip>
                    {info.w}×{info.h}
                  </Chip>
                )}
              </div>
            </div>

            <div className="flex w-full max-w-2xl flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-black/50 px-2 py-1.5">
              <IconBtn
                label="Undo"
                onClick={hist.undo}
                disabled={!hist.canUndo}
              >
                <Undo2 size={15} />
              </IconBtn>
              <IconBtn
                label="Redo"
                onClick={hist.redo}
                disabled={!hist.canRedo}
              >
                <Redo2 size={15} />
              </IconBtn>
              <span className="mx-1 h-4 w-px bg-white/10" />
              <IconBtn label="Previous frame" onClick={() => goTo(frame - 1)}>
                <StepBack size={15} />
              </IconBtn>
              <IconBtn label={playing ? "Pause" : "Play"} onClick={toggle}>
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </IconBtn>
              <IconBtn label="Next frame" onClick={() => goTo(frame + 1)}>
                <StepForward size={15} />
              </IconBtn>
              <span className="ml-1 font-mono text-[11px] tabular-nums text-white/60">
                {frame} / {total}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <IconBtn
                  label="Loop (L)"
                  active={ed.loop}
                  onClick={() => set({ loop: !ed.loop })}
                >
                  <Repeat size={15} />
                </IconBtn>
                <IconBtn
                  label="Grid"
                  active={ed.grid}
                  onClick={() => set({ grid: !ed.grid })}
                >
                  <Grid3x3 size={15} />
                </IconBtn>
                <IconBtn
                  label="Canvas outline"
                  active={ed.outline}
                  onClick={() => set({ outline: !ed.outline })}
                >
                  <Square size={15} />
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
          </div>
        </Stage>

        {/* ── TIMELINE ── */}
        <div className="shrink-0 space-y-1 border-t border-muted-foreground/15 bg-mutted px-4 py-2.5">
          <div
            ref={trackRef}
            onPointerDown={(e) => {
              setScrub(true);
              const r = trackRef.current!.getBoundingClientRect();
              goTo(((e.clientX - r.left) / r.width) * total);
            }}
            className="relative h-10 cursor-pointer touch-none overflow-hidden rounded-lg border border-white/10 bg-neutral-900"
          >
            <div
              className="absolute inset-y-0 bg-primary/20"
              style={{
                left: `${ed.seg.a * 100}%`,
                right: `${(1 - ed.seg.b) * 100}%`,
              }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-primary/30"
              style={{ width: `${(frame / (total || 1)) * 100}%` }}
            />
            {(["a", "b"] as const).map((h) => (
              <div
                key={h}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const mv = (ev: PointerEvent) => {
                    if (!trackRef.current) return;
                    const r = trackRef.current.getBoundingClientRect();
                    const p = clamp((ev.clientX - r.left) / r.width, 0, 1);
                    if (h === "a") {
                      seg({ a: Math.min(p, ed.seg.b - 0.02) });
                    } else {
                      seg({ b: Math.max(p, ed.seg.a + 0.02) });
                    }
                  };
                  const up = () => {
                    window.removeEventListener("pointermove", mv);
                    window.removeEventListener("pointerup", up);
                  };
                  window.addEventListener("pointermove", mv);
                  window.addEventListener("pointerup", up);
                }}
                role="slider"
                aria-label={h === "a" ? "Segment start" : "Segment end"}
                aria-valuenow={Math.round(ed.seg[h] * 100)}
                className="absolute inset-y-0 z-10 flex w-3 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded bg-primary"
                style={{ left: `${ed.seg[h] * 100}%` }}
              >
                <span className="h-4 w-0.5 rounded bg-primary-foreground/80" />
              </div>
            ))}
            <div
              className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white"
              style={{ left: `${(frame / (total || 1)) * 100}%` }}
            />
          </div>
          <p className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>
              Loop frames {a}–{b}
            </span>
            <span>
              <Kbd>Space</Kbd> play <Kbd>←</Kbd>
              <Kbd>→</Kbd> frame
            </span>
          </p>
        </div>
      </div>

      {/* ── INSPECTOR TOOLS ── */}
      <aside className="flex h-full min-h-0 flex-col overflow-hidden border-t border-muted-foreground/15 bg-muted lg:border-l lg:border-t-0">
        <StudioTabs tabs={tabs} active={tab} onChange={setTab} />
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 [scrollbar-width:thin]">
          {tab === "play" && (
            <>
              <Group title="Playback">
                <Range
                  label="Speed"
                  value={ed.speed}
                  min={0.25}
                  max={3}
                  step={0.25}
                  unit="x"
                  onChange={(v) => set({ speed: v })}
                />
                <Seg
                  value={ed.dir}
                  options={[
                    { value: 1, label: "Forward" },
                    { value: -1, label: "Reverse" },
                  ]}
                  onChange={(v) => set({ dir: Number(v) as 1 | -1 })}
                />
                <Toggle
                  label="Loop"
                  checked={ed.loop}
                  onChange={(v) => set({ loop: v })}
                />
                <Toggle
                  label="Ping-pong"
                  sub="Play forward, then backward"
                  checked={ed.bounce}
                  onChange={(v) => set({ bounce: v })}
                />
              </Group>
              <Group title="Segment">
                <Range
                  label="Start frame"
                  value={a}
                  min={0}
                  max={Math.max(1, total - 1)}
                  onChange={(v) =>
                    seg({ a: Math.min(v / (total || 1), ed.seg.b - 0.02) })
                  }
                />
                <Range
                  label="End frame"
                  value={b}
                  min={1}
                  max={Math.max(1, total)}
                  onChange={(v) =>
                    seg({ b: Math.max(v / (total || 1), ed.seg.a + 0.02) })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Btn
                    onClick={() =>
                      seg({
                        a: clamp(frame / (total || 1), 0, ed.seg.b - 0.02),
                      })
                    }
                  >
                    Start here
                  </Btn>
                  <Btn
                    onClick={() =>
                      seg({
                        b: clamp(frame / (total || 1), ed.seg.a + 0.02, 1),
                      })
                    }
                  >
                    End here
                  </Btn>
                </div>
                <Btn
                  className="w-full"
                  icon={<RotateCcw size={12} />}
                  onClick={() => seg({ a: 0, b: 1 })}
                >
                  Whole animation
                </Btn>
              </Group>
              <Group title="Details">
                {isJson ? (
                  <KV
                    rows={[
                      ["Canvas", `${info.w}×${info.h}`],
                      ["Frame rate", `${info.fr} fps`],
                      ["Frames", info.frames],
                      ["Duration", `${info.duration.toFixed(2)} s`],
                      ["Layers", info.layers],
                      ["Assets", info.assets],
                      ["Version", info.version],
                    ]}
                  />
                ) : (
                  <KV
                    rows={[
                      ["Format", "dotLottie"],
                      ["Frames", total || "—"],
                      ["Size", fmtBytes(file.size)],
                    ]}
                  />
                )}
              </Group>
            </>
          )}
          {tab === "stage" && (
            <>
              <Group title="Preview background">
                <div className="grid grid-cols-4 gap-2">
                  {(["checker", "light", "dark", "custom"] as const).map(
                    (k) => (
                      <Tile
                        key={k}
                        label={k[0].toUpperCase() + k.slice(1)}
                        active={ed.bg === k}
                        onClick={() => set({ bg: k })}
                      >
                        <span
                          className="mb-1 block h-7 rounded border border-white/10"
                          style={
                            k === "checker"
                              ? {
                                  backgroundImage:
                                    "repeating-conic-gradient(#1d262b 0 25%, #27323a 0 50%)",
                                  backgroundSize: "10px 10px",
                                }
                              : {
                                  background:
                                    k === "light"
                                      ? "#fff"
                                      : k === "dark"
                                        ? "#0b0f11"
                                        : ed.bgColor,
                                }
                          }
                        />
                      </Tile>
                    ),
                  )}
                </div>
                {ed.bg === "custom" && (
                  <Swatches
                    label="Color"
                    value={ed.bgColor}
                    onChange={(v) => set({ bgColor: v })}
                  />
                )}
              </Group>
              <Group title="Size">
                <Range
                  label="Animation scale"
                  value={ed.scale}
                  min={40}
                  max={140}
                  unit="%"
                  onChange={(v) => set({ scale: v })}
                />
                <Sel
                  label="Test at size"
                  value={String(ed.size)}
                  options={SIZES.map(([v, l]) => ({
                    value: String(v),
                    label: l,
                  }))}
                  onChange={(v) => set({ size: +v })}
                />
                <Note>
                  Icons are often shown tiny. Test at 24 px to check the detail
                  still reads.
                </Note>
              </Group>
              <Group title="Guides">
                <Toggle
                  label="Grid"
                  checked={ed.grid}
                  onChange={(v) => set({ grid: v })}
                />
                <Toggle
                  label="Canvas outline"
                  checked={ed.outline}
                  onChange={(v) => set({ outline: v })}
                />
              </Group>
            </>
          )}
          {tab === "color" && (
            <Group title="Palette" sub={`${palette.length} colors`}>
              {palette.length === 0 ? (
                <Note>
                  No flat fill or stroke colors found. Gradients and animated
                  colors can&apos;t be remapped.
                </Note>
              ) : (
                <>
                  {palette.map((p) => (
                    <Swatches
                      key={p.hex}
                      label={`${p.hex.toUpperCase()} · used ${p.count}×`}
                      value={hex(ed.recolor[p.hex] ?? p.hex)}
                      onChange={(v) =>
                        set({ recolor: { ...ed.recolor, [p.hex]: hex(v) } })
                      }
                    />
                  ))}
                  <Btn
                    className="w-full"
                    icon={<RotateCcw size={12} />}
                    onClick={() => set({ recolor: {} })}
                  >
                    Restore original colors
                  </Btn>
                  <Note>
                    Changes show live and are written into the exported file.
                  </Note>
                </>
              )}
            </Group>
          )}
          {tab === "export" && (
            <>
              <Group title="Format">
                <Seg
                  value={ed.fmt}
                  options={[
                    { value: "json", label: "Lottie JSON" },
                    { value: "lottie", label: "dotLottie" },
                  ]}
                  onChange={(v) => set({ fmt: v })}
                />
                {!isJson && (
                  <Note>Binary dotLottie files are uploaded as they are.</Note>
                )}
              </Group>
              {isJson && (
                <Group title="Optimize">
                  <Toggle
                    label="Minify"
                    sub="Strip whitespace"
                    checked={ed.minify}
                    onChange={(v) => set({ minify: v })}
                  />
                  <Toggle
                    label="Round path precision"
                    sub="Smaller files, no visible change"
                    checked={ed.round}
                    onChange={(v) => set({ round: v })}
                  />
                  {ed.round && (
                    <Range
                      label="Decimals"
                      value={ed.precision}
                      min={0}
                      max={4}
                      onChange={(v) => set({ precision: v })}
                    />
                  )}
                  <Toggle
                    label="Strip layer names"
                    sub="Removes editor labels"
                    checked={ed.stripNames}
                    onChange={(v) => set({ stripNames: v })}
                  />
                  <Toggle
                    label="Drop hidden layers"
                    checked={ed.dropHidden}
                    onChange={(v) => set({ dropHidden: v })}
                  />
                </Group>
              )}
              <Group title="Result">
                <KV
                  rows={[
                    ["File", exportName],
                    ["Original", fmtBytes(file.size)],
                    ["Estimated size", fmtBytes(est)],
                    [
                      "Saved",
                      `${Math.max(0, Math.round((1 - est / (file.size || 1)) * 100))}%`,
                    ],
                  ]}
                />
              </Group>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
