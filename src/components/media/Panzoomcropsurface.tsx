// gn-apex/src/components/media/Panzoomcropsurface.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  clampView,
  filterString,
  frameOf,
  renderCropOutput,
  shapePath,
  totalRotation,
  type CropEditState,
  type RenderAssets,
} from "./cropRenderer";

/** Composition guides the user can leave on screen while framing. */
export type CropGridMode = "none" | "thirds" | "golden" | "diagonal" | "cross";

export interface PanZoomCropSurfaceProps {
  img: HTMLImageElement;
  state: CropEditState;
  assets?: RenderAssets;
  /** Absolute image-centre offset from the frame centre, in OUTPUT px. */
  onPan: (cx: number, cy: number) => void;
  /** Multiply zoom around a point (output px from the frame centre). */
  onZoomAt: (factor: number, ax: number, ay: number) => void;
  /** Free-form only: new frame size in output px. */
  onFrameResize?: (w: number, h: number) => void;
  /** Fired when a drag / pinch / resize finishes (record an undo step here). */
  onGestureEnd?: () => void;
  /** Space kept clear for overlays (HUD chips on top, dock at the bottom). */
  padTop?: number;
  padBottom?: number;
  /** Persistent composition guide drawn over the crop. */
  grid?: CropGridMode;
  /** Dashed ~90 % "safe area" guide. */
  safeArea?: boolean;
  /** Corner brackets around the frame. */
  brackets?: boolean;
  /** Blurred copy of the image behind the stage. */
  ambient?: boolean;
  /** Watermark text, drawn on the stage so it matches the exported file. */
  watermark?: string;
  /** Double-click resets the view. */
  onReset?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export interface StageGeometry {
  /** display px per output px */
  k: number;
  fw: number;
  fh: number;
  x0: number;
  y0: number;
  availW: number;
  availH: number;
}

/** Where the frame sits inside the stage. Free-form frames use a fixed scale so dragging a handle never rescales the stage. */
export function stageGeometry(
  W: number,
  H: number,
  st: CropEditState,
  padTop: number,
  padBottom: number,
  padX = 28,
): StageGeometry {
  const availW = Math.max(60, W - 2 * padX);
  const availH = Math.max(60, H - padTop - padBottom);
  const f = frameOf(st);
  const ref = Math.max(1600, f.w, f.h);
  const k =
    st.target === "free"
      ? Math.min(availW / ref, availH / ref)
      : Math.min(availW / f.w, availH / f.h);
  const fw = f.w * k;
  const fh = f.h * k;
  return {
    k,
    fw,
    fh,
    x0: (W - fw) / 2,
    y0: padTop + (availH - fh) / 2,
    availW,
    availH,
  };
}

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type HandleId = (typeof HANDLES)[number];

/** Composition guides, clipped to the frame shape. */
function drawGuides(
  ctx: CanvasRenderingContext2D,
  grid: CropGridMode,
  w: number,
  h: number,
) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,.34)";
  ctx.beginPath();
  if (grid === "thirds") {
    for (let i = 1; i < 3; i++) {
      ctx.moveTo((w * i) / 3, 0);
      ctx.lineTo((w * i) / 3, h);
      ctx.moveTo(0, (h * i) / 3);
      ctx.lineTo(w, (h * i) / 3);
    }
  } else if (grid === "golden") {
    for (const a of [0.382, 0.618]) {
      ctx.moveTo(w * a, 0);
      ctx.lineTo(w * a, h);
      ctx.moveTo(0, h * a);
      ctx.lineTo(w, h * a);
    }
  } else if (grid === "diagonal") {
    ctx.globalAlpha = 0.5;
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.moveTo(w, 0);
    ctx.lineTo(0, h);
  } else if (grid === "cross") {
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
  }
  ctx.stroke();
  if (grid === "cross") {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.035, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Dashed inner "safe area" rectangle (what short-form apps keep on screen). */
function drawSafeArea(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const ix = w * 0.05;
  const iy = h * 0.05;
  ctx.save();
  ctx.lineWidth = 1.25;
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(95,205,217,.75)";
  ctx.strokeRect(ix, iy, w - 2 * ix, h - 2 * iy);
  ctx.restore();
}

export function PanZoomCropSurface({
  img,
  state,
  assets,
  onPan,
  onZoomAt,
  onFrameResize,
  onGestureEnd,
  padTop = 56,
  padBottom = 84,
  grid = "thirds",
  safeArea = false,
  brackets = true,
  ambient = false,
  watermark,
  onReset,
  className = "",
  children,
}: PanZoomCropSurfaceProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0, dpr: 1 });
  const [grabbing, setGrabbing] = useState(false);
  const [assetTick, setAssetTick] = useState(0);

  const src = { el: img, w: img.naturalWidth, h: img.naturalHeight };
  const live = useRef({
    state,
    size,
    padTop,
    padBottom,
    onPan,
    onZoomAt,
    onFrameResize,
  });
  live.current = {
    state,
    size,
    padTop,
    padBottom,
    onPan,
    onZoomAt,
    onFrameResize,
  };
  const geo = size.w
    ? stageGeometry(size.w, size.h, state, padTop, padBottom)
    : null;

  // ── size tracking ────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({
        w: r.width,
        h: r.height,
        dpr: Math.min(2, window.devicePixelRatio || 1),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── drawing ──────────────────────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !size.w) return;
    const id = requestAnimationFrame(() => {
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const { w: W, h: H, dpr } = size;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const st = clampView(state, { w: src.w, h: src.h });
      const g = stageGeometry(W, H, st, padTop, padBottom);
      const f = frameOf(st);
      const v = st.view;

      // 1. dimmed full image everywhere outside the frame
      ctx.save();
      const hole = shapePath(st, g.fw, g.fh, 0);
      const big = new Path2D();
      big.rect(0, 0, W, H);
      big.addPath(hole, new DOMMatrix().translate(g.x0, g.y0));
      ctx.clip(big, "evenodd");
      ctx.globalAlpha = 0.38;
      ctx.translate(g.x0 + g.fw / 2 + v.cx * g.k, g.y0 + g.fh / 2 + v.cy * g.k);
      ctx.rotate(totalRotation(st));
      ctx.scale(v.fx ? -1 : 1, v.fy ? -1 : 1);
      ctx.scale(v.s * g.k, v.s * g.k);
      const fs = filterString(st.adjust);
      if (fs) ctx.filter = fs;
      ctx.drawImage(src.el, -src.w / 2, -src.h / 2, src.w, src.h);
      ctx.restore();

      // 2. frame outline (under the content so badges stay clean)
      ctx.save();
      ctx.translate(g.x0, g.y0);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      ctx.stroke(shapePath(st, g.fw, g.fh, 0));
      ctx.restore();

      // 3. the actual output, drawn by the same function the export uses
      const tile = document.createElement("canvas");
      tile.width = tile.height = 24;
      const tc = tile.getContext("2d");
      let checker: CanvasPattern | null = null;
      if (tc) {
        tc.fillStyle = "#1d262b";
        tc.fillRect(0, 0, 24, 24);
        tc.fillStyle = "#27323a";
        tc.fillRect(0, 0, 12, 12);
        tc.fillRect(12, 12, 12, 12);
        checker = ctx.createPattern(tile, "repeat");
        checker?.setTransform(new DOMMatrix().scale(1 / g.k));
      }
      ctx.save();
      ctx.translate(g.x0, g.y0);
      ctx.scale(g.k, g.k);
      renderCropOutput(ctx, st, src, f.w, f.h, assets ?? {}, {
        checker,
        watermark,
        onAssetLoad: () => setAssetTick((n) => n + 1),
      });
      ctx.restore();

      // 4. composition guides (kept clipped to the frame)
      const activeGrid: CropGridMode =
        grid === "none" && grabbing ? "thirds" : grid;
      if (activeGrid !== "none" || safeArea) {
        ctx.save();
        ctx.translate(g.x0, g.y0);
        ctx.clip(shapePath(st, g.fw, g.fh, 0));
        if (activeGrid !== "none") drawGuides(ctx, activeGrid, g.fw, g.fh);
        if (safeArea) drawSafeArea(ctx, g.fw, g.fh);
        ctx.restore();
      }
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state,
    size,
    img,
    assets,
    grabbing,
    padTop,
    padBottom,
    grid,
    safeArea,
    watermark,
    assetTick,
  ]);

  // ── wheel zoom (needs a non-passive listener) ───────────────────
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { state: st, size: sz, padTop: pt, padBottom: pb } = live.current;
      if (!sz.w) return;
      const g = stageGeometry(sz.w, sz.h, st, pt, pb);
      const r = cv.getBoundingClientRect();
      const ax = (e.clientX - r.left - g.x0 - g.fw / 2) / g.k;
      const ay = (e.clientY - r.top - g.y0 - g.fh / 2) / g.k;
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
      live.current.onZoomAt(factor, ax, ay);
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    return () => cv.removeEventListener("wheel", onWheel);
  }, []);

  // ── pointer: one finger pans, two fingers pinch ─────────────────
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number; cx: number; cy: number } | null>(
    null,
  );
  const pinch = useRef<{ d: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGrabbing(true);
    const v = live.current.state.view;
    if (pointers.current.size === 1) {
      pan.current = { x: e.clientX, y: e.clientY, cx: v.cx, cy: v.cy };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) };
      pan.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const { state: st, size: sz, padTop: pt, padBottom: pb } = live.current;
    const g = stageGeometry(sz.w, sz.h, st, pt, pb);

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = e.currentTarget.getBoundingClientRect();
      const ax = ((a.x + b.x) / 2 - r.left - g.x0 - g.fw / 2) / g.k;
      const ay = ((a.y + b.y) / 2 - r.top - g.y0 - g.fh / 2) / g.k;
      live.current.onZoomAt(d / pinch.current.d, ax, ay);
      pinch.current.d = d;
    } else if (pan.current) {
      const fine = e.shiftKey ? 0.25 : 1;
      live.current.onPan(
        pan.current.cx + ((e.clientX - pan.current.x) / g.k) * fine,
        pan.current.cy + ((e.clientY - pan.current.y) / g.k) * fine,
      );
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      pan.current = null;
      pinch.current = null;
      setGrabbing(false);
      onGestureEnd?.();
    } else if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      const v = live.current.state.view;
      pan.current = { x: p.x, y: p.y, cx: v.cx, cy: v.cy };
      pinch.current = null;
    }
  };

  // ── free-form frame handles ─────────────────────────────────────
  const resize = useRef<{
    h: HandleId;
    x: number;
    y: number;
    w: number;
    hh: number;
    k: number;
  } | null>(null);

  const startResize =
    (h: HandleId) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (!geo) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      resize.current = {
        h,
        x: e.clientX,
        y: e.clientY,
        w: state.free.w,
        hh: state.free.h,
        k: geo.k,
      };
      setGrabbing(true);
    };
  const moveResize = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = resize.current;
    if (!r || !geo) return;
    const dx = (e.clientX - r.x) / r.k;
    const dy = (e.clientY - r.y) / r.k;
    let w = r.w;
    let h = r.hh;
    // the frame stays centred, so a handle moves both sides
    if (r.h.includes("e")) w = r.w + dx * 2;
    if (r.h.includes("w")) w = r.w - dx * 2;
    if (r.h.includes("s")) h = r.hh + dy * 2;
    if (r.h.includes("n")) h = r.hh - dy * 2;
    // Shift keeps the frame's original aspect ratio.
    if (e.shiftKey) {
      const ar = r.w / r.hh;
      const vertical = r.h === "n" || r.h === "s";
      const horizontal = r.h === "e" || r.h === "w";
      if (vertical) w = h * ar;
      else if (horizontal) h = w / ar;
      else if (Math.abs(dx) >= Math.abs(dy)) h = w / ar;
      else w = h * ar;
    }
    const maxW = Math.floor(geo.availW / r.k);
    const maxH = Math.floor(geo.availH / r.k);
    live.current.onFrameResize?.(
      Math.min(Math.min(4096, maxW), Math.max(64, Math.round(w))),
      Math.min(Math.min(4096, maxH), Math.max(64, Math.round(h))),
    );
  };
  const endResize = () => {
    if (!resize.current) return;
    resize.current = null;
    setGrabbing(false);
    onGestureEnd?.();
  };

  const handlePos = useCallback(
    (h: HandleId) => {
      if (!geo) return { left: 0, top: 0 };
      const left = h.includes("w")
        ? geo.x0
        : h.includes("e")
          ? geo.x0 + geo.fw
          : geo.x0 + geo.fw / 2;
      const top = h.includes("n")
        ? geo.y0
        : h.includes("s")
          ? geo.y0 + geo.fh
          : geo.y0 + geo.fh / 2;
      return { left, top };
    },
    [geo],
  );

  const cursor: Record<HandleId, string> = {
    nw: "cursor-nwse-resize",
    se: "cursor-nwse-resize",
    ne: "cursor-nesw-resize",
    sw: "cursor-nesw-resize",
    n: "cursor-ns-resize",
    s: "cursor-ns-resize",
    e: "cursor-ew-resize",
    w: "cursor-ew-resize",
  };
  // Big, touch-friendly handles: a soft halo for the finger plus a solid grip.
  const shapeCls = (h: HandleId) =>
    h === "n" || h === "s"
      ? "h-3 w-9"
      : h === "e" || h === "w"
        ? "h-9 w-3"
        : "size-4";

  const showBrackets = brackets && state.shape !== "round" && geo;

  return (
    <div
      ref={wrapRef}
      className={`relative size-full overflow-hidden select-none touch-none bg-neutral-950 h-full ${className}`}
      style={
        ambient
          ? undefined
          : {
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }
      }
    >
      {ambient && (
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url("${img.src}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(48px) saturate(1.25) brightness(0.42)",
            transform: "scale(1.18)",
          }}
        />
      )}

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 size-full touch-none ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ width: size.w || "100%", height: size.h || "100%" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={onReset}
      />

      {/* Corner brackets — a crisp, pro framing affordance on rectangular crops. */}
      {showBrackets &&
        (
          [
            ["tl", "left-0 top-0 border-l-2 border-t-2", "rounded-tl-[6px]"],
            ["tr", "right-0 top-0 border-r-2 border-t-2", "rounded-tr-[6px]"],
            ["bl", "bottom-0 left-0 border-b-2 border-l-2", "rounded-bl-[6px]"],
            [
              "br",
              "bottom-0 right-0 border-b-2 border-r-2",
              "rounded-br-[6px]",
            ],
          ] as const
        ).map(([id, cls, round]) => (
          <span
            key={id}
            aria-hidden
            className={`pointer-events-none absolute z-20 size-5 border-primary/90 ${round} ${cls}`}
            style={{
              left: id.includes("l") ? geo.x0 - 4 : undefined,
              right: id.includes("r")
                ? size.w - (geo.x0 + geo.fw) - 4
                : undefined,
              top: id.includes("t") ? geo.y0 - 4 : undefined,
              bottom: id.includes("b")
                ? size.h - (geo.y0 + geo.fh) - 4
                : undefined,
            }}
          />
        ))}

      {state.target === "free" &&
        geo &&
        HANDLES.map((h) => (
          <div
            key={h}
            role="slider"
            aria-label={`Resize frame ${h}`}
            aria-valuenow={h === "n" || h === "s" ? state.free.h : state.free.w}
            onPointerDown={startResize(h)}
            onPointerMove={moveResize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className={`group absolute z-30 flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-md border-2 border-white bg-primary shadow-[0_2px_8px_rgba(0,0,0,.55)] ring-1 ring-black/20 transition-transform hover:scale-110 active:scale-95 ${shapeCls(h)} ${cursor[h]}`}
            style={handlePos(h)}
          >
            <i className="size-1 rounded-full bg-white/90" />
          </div>
        ))}

      {children}
    </div>
  );
}
