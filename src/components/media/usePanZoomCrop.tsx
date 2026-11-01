// gn-apex/src/components/media/usePanZoomCrop.ts
"use client";

/**
 * usePanZoomCrop — state + gesture maths for the crop studio.
 * ─────────────────────────────────────────────────────────────────────
 * v2: the whole edit lives in ONE immutable `CropEditState` (frame target,
 * shape, pan/zoom/rotate/flip, look, props). This hook owns it, keeps an
 * undo/redo history, and exposes every operation the toolbar needs.
 *
 *  • Zoom runs from 10 % to 800 % of "fills the frame". Below 100 % the image
 *    is smaller than the frame (negative slider values) and the background
 *    fills the gap; the exported file matches the preview exactly.
 *  • Pan/zoom/rotate all happen in OUTPUT pixels, so they stay valid when the
 *    stage is resized or the dialog is opened on another screen.
 *  • `getPixelCrop()` is kept for callers that still want a source-space
 *    rectangle (exact when rotation is 0; may start outside the image when
 *    zoomed out).
 * ─────────────────────────────────────────────────────────────────────
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { PixelCrop } from "./cropUtils";
import {
  CROP_TARGETS,
  clampView,
  coverScale,
  createEditState,
  fillScale,
  frameOf,
  relZoomToSlider,
  sliderToRelZoom,
  withRelativeZoom,
  type CropEditState,
  type TargetId,
} from "./cropRenderer";

export type { PixelCrop };

export interface UsePanZoomCropOptions {
  /** Natural pixel size of the loaded image. */
  source: { w: number; h: number };
  /** Parent-provided frame (old `cropShape` / `aspectRatio` props). */
  cropShape?: "rect" | "round";
  aspectRatio?: number;
  /** Restore a previous session for this file. */
  initialState?: CropEditState | null;
}

const HISTORY_LIMIT = 80;

export function usePanZoomCrop({
  source,
  cropShape,
  aspectRatio,
  initialState,
}: UsePanZoomCropOptions) {
  const [state, setStateRaw] = useState<CropEditState>(
    () => initialState ?? createEditState({ src: source, cropShape, aspectRatio }),
  );
  const stateRef = useRef(state);
  const hist = useRef<{ stack: CropEditState[]; i: number }>({
    stack: [state],
    i: 0,
  });
  const [histMeta, setHistMeta] = useState({ i: 0, len: 1 });

  const set = useCallback(
    (next: CropEditState, commit = false) => {
      stateRef.current = next;
      setStateRaw(next);
      if (commit) {
        const h = hist.current;
        h.stack.splice(h.i + 1);
        h.stack.push(next);
        if (h.stack.length > HISTORY_LIMIT) h.stack.shift();
        h.i = h.stack.length - 1;
        setHistMeta({ i: h.i, len: h.stack.length });
      }
    },
    [],
  );

  /** Run a pure update against the latest state. `commit` records an undo step. */
  const update = useCallback(
    (fn: (s: CropEditState) => CropEditState, commit = false) => {
      set(clampView(fn(stateRef.current), source), commit);
    },
    [set, source],
  );

  /** Record the current state as an undo step (call at the end of a gesture). */
  const commit = useCallback(() => {
    const h = hist.current;
    if (h.stack[h.i] === stateRef.current) return;
    h.stack.splice(h.i + 1);
    h.stack.push(stateRef.current);
    if (h.stack.length > HISTORY_LIMIT) h.stack.shift();
    h.i = h.stack.length - 1;
    setHistMeta({ i: h.i, len: h.stack.length });
  }, []);

  const undo = useCallback(() => {
    const h = hist.current;
    if (h.i <= 0) return;
    h.i -= 1;
    set(h.stack[h.i]);
    setHistMeta({ i: h.i, len: h.stack.length });
  }, [set]);

  const redo = useCallback(() => {
    const h = hist.current;
    if (h.i >= h.stack.length - 1) return;
    h.i += 1;
    set(h.stack[h.i]);
    setHistMeta({ i: h.i, len: h.stack.length });
  }, [set]);

  // ── derived ───────────────────────────────────────────────────────
  const cover = useMemo(() => coverScale(state, source), [state, source]);
  const relZoom = state.view.s / cover;
  const zoomSlider = Math.max(-100, Math.min(100, relZoomToSlider(relZoom)));
  const frame = frameOf(state);

  // ── zoom / pan ────────────────────────────────────────────────────
  /** Set zoom from the −100…100 slider, keeping the frame centre fixed. */
  const setZoomSlider = useCallback(
    (v: number, doCommit = false) =>
      update((s) => {
        const cov = coverScale(s, source);
        return { ...s, view: { ...s.view, s: cov * sliderToRelZoom(v) } };
      }, doCommit),
    [update, source],
  );

  /** Multiply the zoom, keeping the point (ax, ay) — in output px from the frame centre — still. */
  const zoomAt = useCallback(
    (factor: number, ax = 0, ay = 0, doCommit = false) =>
      update((s) => {
        const ns = s.view.s * factor;
        const k = ns / s.view.s;
        return {
          ...s,
          view: {
            ...s.view,
            s: ns,
            cx: ax - (ax - s.view.cx) * k,
            cy: ay - (ay - s.view.cy) * k,
          },
        };
      }, doCommit),
    [update],
  );

  const panTo = useCallback(
    (cx: number, cy: number) =>
      update((s) => ({ ...s, view: { ...s.view, cx, cy } })),
    [update],
  );

  const nudge = useCallback(
    (dx: number, dy: number) =>
      update(
        (s) => ({ ...s, view: { ...s.view, cx: s.view.cx + dx, cy: s.view.cy + dy } }),
        false,
      ),
    [update],
  );

  // ── discrete actions (each one is an undo step) ──────────────────
  const rotate = useCallback(
    (dir: 1 | -1) =>
      update(
        (s) =>
          withRelativeZoom(s, source, (st) => {
            const { cx, cy } = st.view;
            return {
              ...st,
              view: {
                ...st.view,
                quarter: (((st.view.quarter + dir) % 4) + 4) % 4,
                cx: dir > 0 ? -cy : cy,
                cy: dir > 0 ? cx : -cx,
              },
            };
          }),
        true,
      ),
    [update, source],
  );

  const flip = useCallback(
    (axis: "x" | "y") =>
      update(
        (s) => ({
          ...s,
          view: { ...s.view, fx: axis === "x" ? !s.view.fx : s.view.fx, fy: axis === "y" ? !s.view.fy : s.view.fy },
        }),
        true,
      ),
    [update],
  );

  /** Whole image visible (zoom out until it fits), padding fills the rest. */
  const fit = useCallback(
    () =>
      update((s) => {
        const f = frameOf(s);
        const odd = s.view.quarter % 2 === 1;
        const w = odd ? source.h : source.w;
        const h = odd ? source.w : source.h;
        return { ...s, view: { ...s.view, s: Math.min(f.w / w, f.h / h), cx: 0, cy: 0, rot: 0 } };
      }, true),
    [update, source],
  );

  /** Frame fully covered (the old zoom = 1). Accounts for fine rotation. */
  const fill = useCallback(
    () =>
      update((s) => ({
        ...s,
        view: { ...s.view, s: Math.max(coverScale(s, source), s.view.rot ? fillScale(s, source) : 0) },
      }), true),
    [update, source],
  );

  const centre = useCallback(
    () => update((s) => ({ ...s, view: { ...s.view, cx: 0, cy: 0 } }), true),
    [update],
  );

  const resetView = useCallback(
    () =>
      update((s) => {
        const base = { ...s, view: { cx: 0, cy: 0, s: 1, rot: 0, quarter: 0, fx: false, fy: false } };
        return { ...base, view: { ...base.view, s: coverScale(base, source) } };
      }, true),
    [update, source],
  );

  /** Switch what the image is for (avatar, cover, …). Applies that preset's shape and background. */
  const setTarget = useCallback(
    (id: TargetId) =>
      update((s) => {
        const t = CROP_TARGETS[id];
        const k = Math.min(1, 4096 / Math.max(source.w, source.h));
        const next: CropEditState = {
          ...s,
          free: id === "free"
            ? { w: Math.max(64, Math.round(source.w * k)), h: Math.max(64, Math.round(source.h * k)) }
            : s.free,
          target: id,
          shape: t.shape,
          bg: { ...s.bg, mode: t.bg },
          view: { ...s.view, cx: 0, cy: 0, rot: 0, quarter: 0 },
        };
        return { ...next, view: { ...next.view, s: coverScale(next, source) } };
      }, true),
    [update, source],
  );

  const setFreeSize = useCallback(
    (w: number, h: number, doCommit = false) =>
      update((s) => ({ ...s, free: { w, h } }), doCommit),
    [update],
  );

  /** Source-space rectangle of the frame (exact when rotation is 0). May start < 0 when zoomed out. */
  const getPixelCrop = useCallback((): PixelCrop => {
    const s = stateRef.current;
    const f = frameOf(s);
    const sc = s.view.s;
    const w = f.w / sc;
    const h = f.h / sc;
    return {
      x: Math.round(source.w / 2 - s.view.cx / sc - w / 2),
      y: Math.round(source.h / 2 - s.view.cy / sc - h / 2),
      width: Math.round(w),
      height: Math.round(h),
    };
  }, [source]);

  return {
    state,
    stateRef,
    frame,
    cover,
    relZoom,
    zoomSlider,
    update,
    commit,
    undo,
    redo,
    canUndo: histMeta.i > 0,
    canRedo: histMeta.i < histMeta.len - 1,
    setZoomSlider,
    zoomAt,
    panTo,
    nudge,
    rotate,
    flip,
    fit,
    fill,
    centre,
    resetView,
    setTarget,
    setFreeSize,
    getPixelCrop,
  };
}
