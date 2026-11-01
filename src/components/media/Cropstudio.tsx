// gn-apex/src/components/media/CropStudio.tsx
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
  Crosshair,
  Crop as CropIcon,
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  Maximize2,
  Minimize2,
  Redo2,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  Upload,
  Download,
  ZoomIn,
  ZoomOut,
  Info,
  Wand2,
  Grid3x3,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePanZoomCrop } from "./usePanZoomCrop";
import { PanZoomCropSurface, type CropGridMode } from "./Panzoomcropsurface";
import { formatBytes } from "./mediaOptimizerEngine";
import type { CropOutputFormat } from "./cropUtils";
import { AI_TEMPLATES, type AiTemplate } from "./mediaPresets";
import {
  CROP_FONTS,
  CROP_LOOKS,
  CROP_TARGETS,
  MARK_IDS,
  PICKABLE_TARGETS,
  coverScale,
  exportCrop,
  frameOf,
  markSvg,
  renderCropOutput,
  filterString,
  type Anchor,
  type BgMode,
  type CropEditState,
  type CropOutputSettings,
  type CropShape,
  type RenderAssets,
  type TargetId,
} from "./cropRenderer";

// ─────────────────────────────────────────────
// TYPES & CONTEXT
// ─────────────────────────────────────────────

export interface CropStudioProps {
  url: string;
  /** Used for the file name in the header and for the export estimate. */
  fileName?: string;
  /** Parent fixes the frame (the old props). Leave empty for free choice. */
  cropShape?: "rect" | "round";
  aspectRatio?: number;
  /** Restore edits made earlier on this file (when the user switches between queue items). */
  initialState?: CropEditState | null;
  initialAssets?: RenderAssets | null;
  /** Called on every change so the parent can keep the latest edit for upload time. */
  onStateChange: (state: CropEditState) => void;
  onAssetsChange?: (assets: RenderAssets) => void;
  /** Output settings live in the parent because the upload pipeline needs them too. */
  output: CropOutputSettings;
  onOutputChange: (patch: Partial<CropOutputSettings>) => void;
}

export type TabId = "crop" | "look" | "ai" | "props" | "export";
type PZ = ReturnType<typeof usePanZoomCrop>;

interface CropStudioContextValue {
  url: string;
  fileName: string;
  img: HTMLImageElement | null;
  loading: boolean;
  failed: boolean;
  source: { w: number; h: number };
  pz: PZ;
  state: CropEditState;
  frame: { w: number; h: number };
  assets: RenderAssets;
  setAssets: (a: RenderAssets) => void;
  output: CropOutputSettings;
  onOutputChange: (patch: Partial<CropOutputSettings>) => void;
  tab: TabId;
  setTab: React.Dispatch<React.SetStateAction<TabId>>;
  grid: CropGridMode;
  setGrid: React.Dispatch<React.SetStateAction<CropGridMode>>;
  safeArea: boolean;
  setSafeArea: (v: boolean) => void;
  ambient: boolean;
  setAmbient: (v: boolean) => void;
  brackets: boolean;
  setBrackets: (v: boolean) => void;
  locked: boolean;
}

const CropStudioContext = createContext<CropStudioContextValue | null>(null);

export function useCropStudio(): CropStudioContextValue {
  const ctx = useContext(CropStudioContext);
  if (!ctx) {
    throw new Error("useCropStudio must be used within a CropStudioProvider");
  }
  return ctx;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "crop", label: "Crop", icon: <CropIcon size={15} /> },
  { id: "look", label: "Look", icon: <SlidersHorizontal size={15} /> },
  { id: "ai", label: "AI", icon: <Wand2 size={15} /> },
  { id: "props", label: "Props", icon: <Sparkles size={15} /> },
  { id: "export", label: "Export", icon: <Download size={15} /> },
];

const SWATCHES = [
  "#ffffff",
  "#0b0f12",
  "#5fcdd9",
  "#7c5cff",
  "#e5527a",
  "#f2a93b",
  "#46c284",
];

const ANCHORS: Anchor[] = [
  "tl",
  "tc",
  "tr",
  "ml",
  "mc",
  "mr",
  "bl",
  "bc",
  "br",
];

const GRID_ORDER: CropGridMode[] = [
  "none",
  "thirds",
  "golden",
  "diagonal",
  "cross",
];

const GRID_LABEL: Record<CropGridMode, string> = {
  none: "Off",
  thirds: "Thirds",
  golden: "Golden",
  diagonal: "Diagonal",
  cross: "Cross",
};

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export function CropStudioProvider({
  url,
  fileName = "image",
  cropShape,
  aspectRatio,
  initialState,
  initialAssets,
  onStateChange,
  onAssetsChange,
  output,
  onOutputChange,
  children,
}: CropStudioProps & { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState<{
    url: string;
    img: HTMLImageElement | null;
    failed: boolean;
  }>({ url: "", img: null, failed: false });

  useEffect(() => {
    let cancelled = false;
    const im = new Image();
    im.onload = () => {
      if (!cancelled) setLoaded({ url, img: im, failed: false });
    };
    im.onerror = () => {
      if (!cancelled) setLoaded({ url, img: null, failed: true });
    };
    im.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  const current = loaded.url === url ? loaded : null;
  const img = current?.img ?? null;
  const loading = !current?.img && !current?.failed;
  const failed = !!current?.failed;

  return (
    <CropStudioProviderLoaded
      key={url}
      url={url}
      fileName={fileName}
      img={img}
      loading={loading}
      failed={failed}
      cropShape={cropShape}
      aspectRatio={aspectRatio}
      initialState={initialState}
      initialAssets={initialAssets}
      onStateChange={onStateChange}
      onAssetsChange={onAssetsChange}
      output={output}
      onOutputChange={onOutputChange}
    >
      {children}
    </CropStudioProviderLoaded>
  );
}

function CropStudioProviderLoaded({
  url,
  fileName = "image",
  img,
  loading,
  failed,
  cropShape,
  aspectRatio,
  initialState,
  initialAssets,
  onStateChange,
  onAssetsChange,
  output,
  onOutputChange,
  children,
}: CropStudioProps & {
  img: HTMLImageElement | null;
  loading: boolean;
  failed: boolean;
  children: React.ReactNode;
}) {
  const source = useMemo(
    () => ({ w: img?.naturalWidth || 1024, h: img?.naturalHeight || 1024 }),
    [img],
  );

  const pz = usePanZoomCrop({ source, cropShape, aspectRatio, initialState });
  const { state, frame } = pz;
  const [tab, setTab] = useState<TabId>("crop");
  const [assets, setAssetsState] = useState<RenderAssets>(initialAssets ?? {});
  const [grid, setGrid] = useState<CropGridMode>("thirds");
  const [safeArea, setSafeArea] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [brackets, setBrackets] = useState(true);
  const locked = state.target === "locked";

  useEffect(() => {
    onStateChange(state);
  }, [state, onStateChange]);

  const setAssets = useCallback(
    (a: RenderAssets) => {
      setAssetsState(a);
      onAssetsChange?.(a);
    },
    [onAssetsChange],
  );

  const value = useMemo<CropStudioContextValue>(
    () => ({
      url,
      fileName: fileName || "image",
      img,
      loading,
      failed,
      source,
      pz,
      state,
      frame,
      assets,
      setAssets,
      output,
      onOutputChange,
      tab,
      setTab,
      grid,
      setGrid,
      safeArea,
      setSafeArea,
      ambient,
      setAmbient,
      brackets,
      setBrackets,
      locked,
    }),
    [
      url,
      fileName,
      img,
      loading,
      failed,
      source,
      pz,
      state,
      frame,
      assets,
      setAssets,
      output,
      onOutputChange,
      tab,
      grid,
      safeArea,
      ambient,
      brackets,
      locked,
    ],
  );

  return (
    <CropStudioContext.Provider value={value}>
      {children}
    </CropStudioContext.Provider>
  );
}

// ─────────────────────────────────────────────
// STAGE COMPONENT (Only the window playground)
// ─────────────────────────────────────────────

export interface CropStageProps {
  className?: string;
}

export function CropStage({ className = "" }: CropStageProps) {
  const {
    img,
    loading,
    failed,
    source,
    pz,
    state,
    frame,
    assets,
    grid,
    setGrid,
    safeArea,
    ambient,
    brackets,
    output,
  } = useCropStudio();

  const relPct = Math.round(pz.relZoom * 100);
  const upscaled = state.view.s > 1.001;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (
      (e.target as HTMLElement).closest("input,select,textarea,[role=slider]")
    )
      return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) pz.redo();
      else pz.undo();
      return;
    }
    const step = e.shiftKey ? 24 : 4;
    const map: Record<string, () => void> = {
      "+": () => pz.zoomAt(1.15, 0, 0, true),
      "=": () => pz.zoomAt(1.15, 0, 0, true),
      "-": () => pz.zoomAt(1 / 1.15, 0, 0, true),
      "0": pz.resetView,
      c: pz.centre,
      "[": () => pz.rotate(-1),
      "]": () => pz.rotate(1),
      ArrowLeft: () => pz.nudge(-step, 0),
      ArrowRight: () => pz.nudge(step, 0),
      ArrowUp: () => pz.nudge(0, -step),
      ArrowDown: () => pz.nudge(0, step),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  if (failed) {
    return (
      <div className="flex size-full items-center justify-center bg-neutral-950 text-sm text-destructive">
        This image could not be opened.
      </div>
    );
  }

  if (loading || !img) {
    return (
      <div className="flex size-full items-center justify-center bg-neutral-950">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => (e.key.startsWith("Arrow") ? pz.commit() : undefined)}
      className={`relative size-full min-h-0 flex-1 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    >
      <PanZoomCropSurface
        img={img}
        state={state}
        assets={assets}
        onPan={pz.panTo}
        onZoomAt={(f, ax, ay) => pz.zoomAt(f, ax, ay)}
        onFrameResize={(w, h) => pz.setFreeSize(w, h)}
        onGestureEnd={pz.commit}
        grid={grid}
        safeArea={safeArea}
        ambient={ambient}
        brackets={brackets}
        watermark={output.watermark}
        onReset={pz.resetView}
      >
        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
          <Chip>
            {CROP_TARGETS[state.target].label}{" "}
            <b className="font-mono font-medium">
              {frame.w}×{frame.h}
            </b>
          </Chip>
          <div className="flex flex-wrap justify-end gap-1.5">
            <button
              type="button"
              title={`Composition guides: ${GRID_LABEL[grid]}`}
              onClick={() =>
                setGrid(
                  (g) =>
                    GRID_ORDER[(GRID_ORDER.indexOf(g) + 1) % GRID_ORDER.length],
                )
              }
              className="pointer-events-auto inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2.5 text-[11px] font-medium text-white/85 backdrop-blur-md transition-colors hover:bg-black/75"
            >
              <Grid3x3 size={13} />
              {GRID_LABEL[grid]}
            </button>
            {relPct < 100 && (
              <Chip warn>
                Zoomed out <b className="font-mono font-medium">{relPct}%</b>
              </Chip>
            )}
            {upscaled && (
              <Chip warn>
                Upscaled{" "}
                <b className="font-mono font-medium">
                  {state.view.s.toFixed(1)}×
                </b>
              </Chip>
            )}
            <Chip muted>
              Source{" "}
              <b className="font-mono font-medium">
                {source.w}×{source.h}
              </b>
            </Chip>
          </div>
        </div>

        {/* Floating dock */}
        <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/80 px-2 py-1.5 shadow-2xl backdrop-blur-md [scrollbar-width:none]">
          <DockBtn label="Rotate left ( [ )" onClick={() => pz.rotate(-1)}>
            <RotateCcw size={15} />
          </DockBtn>
          <DockBtn label="Rotate right ( ] )" onClick={() => pz.rotate(1)}>
            <RotateCw size={15} />
          </DockBtn>
          <DockBtn
            label="Flip horizontally"
            onClick={() => pz.flip("x")}
            active={state.view.fx}
          >
            <FlipHorizontal2 size={15} />
          </DockBtn>
          <DockBtn
            label="Flip vertically"
            onClick={() => pz.flip("y")}
            active={state.view.fy}
          >
            <FlipVertical2 size={15} />
          </DockBtn>
          <Divider />
          <DockBtn
            label="Zoom out ( − )"
            onClick={() => pz.zoomAt(1 / 1.25, 0, 0, true)}
          >
            <ZoomOut size={15} />
          </DockBtn>
          <div className="relative flex w-28 shrink-0 items-center sm:w-44">
            <Slider
              value={[pz.zoomSlider]}
              min={-100}
              max={100}
              step={0.5}
              onValueChange={(v) => pz.setZoomSlider(v[0])}
              onValueCommit={pz.commit}
              aria-label="Zoom. Negative values zoom out."
              className="cursor-pointer"
            />
            {/* 100 % marker */}
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-px -translate-y-1/2 bg-white/60" />
          </div>
          <DockBtn
            label="Zoom in ( + )"
            onClick={() => pz.zoomAt(1.25, 0, 0, true)}
          >
            <ZoomIn size={15} />
          </DockBtn>
          <button
            type="button"
            onClick={pz.fill}
            title="Back to 100%"
            className={`h-7 w-13 shrink-0 rounded-lg bg-white/8 text-center font-mono text-[11px] tabular-nums transition-colors hover:bg-white/15 ${relPct < 100 ? "text-amber-300" : "text-white"}`}
          >
            {relPct}%
          </button>
          <Divider />
          <DockBtn label="Fit whole image" onClick={pz.fit}>
            <Minimize2 size={15} />
          </DockBtn>
          <DockBtn label="Fill frame" onClick={pz.fill}>
            <Maximize2 size={15} />
          </DockBtn>
          <DockBtn label="Centre ( C )" onClick={pz.centre}>
            <Crosshair size={15} />
          </DockBtn>
          <DockBtn label="Reset ( 0 )" onClick={pz.resetView}>
            <RefreshCcw size={15} />
          </DockBtn>
        </div>
      </PanZoomCropSurface>
    </div>
  );
}

// ─────────────────────────────────────────────
// INSPECTOR COMPONENT (Tools on the right)
// ─────────────────────────────────────────────

export interface CropInspectorProps {
  className?: string;
}

export function CropInspector({ className = "" }: CropInspectorProps) {
  const {
    url,
    fileName,
    img,
    loading,
    failed,
    source,
    pz,
    state,
    assets,
    setAssets,
    output,
    onOutputChange,
    tab,
    setTab,
    grid,
    setGrid,
    safeArea,
    setSafeArea,
    ambient,
    setAmbient,
    brackets,
    setBrackets,
    locked,
  } = useCropStudio();

  const upscaled = state.view.s > 1.001;

  if (failed || loading || !img) {
    return (
      <aside
        className={`flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-xs text-muted-foreground ${className}`}
      >
        <Loader2 className="mb-2 size-5 animate-spin" />
        Preparing inspector...
      </aside>
    );
  }

  return (
    <aside
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-muted ${className}`}
    >
      <div className="shrink-0 border-b border-white/8 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Live result
          </p>
          <div className="flex items-center gap-0.5">
            <IconBtn
              label="Undo ( Ctrl+Z )"
              disabled={!pz.canUndo}
              onClick={pz.undo}
            >
              <Undo2 size={14} />
            </IconBtn>
            <IconBtn label="Redo" disabled={!pz.canRedo} onClick={pz.redo}>
              <Redo2 size={14} />
            </IconBtn>
          </div>
        </div>
        <LivePreview img={img} state={state} assets={assets} />
      </div>

      <div
        role="tablist"
        className="shrink-0 flex border-b border-white/8 px-2"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors ${tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.icon}
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 [scrollbar-width:thin]">
        {tab === "crop" && (
          <CropTab
            pz={pz}
            locked={locked}
            onTarget={(id) => {
              pz.setTarget(id);
              const f = CROP_TARGETS[id].format;
              if (f === "png") onOutputChange({ format: "png" });
              else if (output.format === "png") onOutputChange({ format: f });
            }}
            grid={grid}
            setGrid={setGrid}
            safeArea={safeArea}
            setSafeArea={setSafeArea}
            ambient={ambient}
            setAmbient={setAmbient}
            brackets={brackets}
            setBrackets={setBrackets}
          />
        )}
        {tab === "look" && <LookTab img={img} pz={pz} />}
        {tab === "ai" && <AITab pz={pz} source={source} />}
        {tab === "props" && (
          <PropsTab pz={pz} assets={assets} setAssets={setAssets} />
        )}
        {tab === "export" && (
          <ExportTab
            url={url}
            fileName={fileName}
            state={state}
            assets={assets}
            output={output}
            onOutputChange={onOutputChange}
            upscaled={upscaled}
          />
        )}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// COMPATIBILITY DEFAULT EXPORT (STAGE PLAYGROUND)
// ─────────────────────────────────────────────

/**
 * Default standalone CropStudio: wraps the stage and exports only the stage.
 * If placed within an existing CropStudioProvider, it simply renders CropStage.
 */
export function CropStudio(
  props: Partial<CropStudioProps> & { className?: string },
) {
  const ctx = useContext(CropStudioContext);

  if (ctx) {
    return <CropStage className={props.className} />;
  }

  // If used standalone without CropStudioProvider, provision it
  if (
    !props.url ||
    !props.onStateChange ||
    !props.output ||
    !props.onOutputChange
  ) {
    return null;
  }

  return (
    <CropStudioProvider
      url={props.url}
      fileName={props.fileName}
      cropShape={props.cropShape}
      aspectRatio={props.aspectRatio}
      initialState={props.initialState}
      initialAssets={props.initialAssets}
      onStateChange={props.onStateChange}
      onAssetsChange={props.onAssetsChange}
      output={props.output}
      onOutputChange={props.onOutputChange}
    >
      <CropStage className={props.className} />
    </CropStudioProvider>
  );
}

// ─────────────────────────────────────────────
// TABS & SUBCOMPONENTS
// ─────────────────────────────────────────────

function CropTab({
  pz,
  locked,
  onTarget,
  grid,
  setGrid,
  safeArea,
  setSafeArea,
  ambient,
  setAmbient,
  brackets,
  setBrackets,
}: {
  pz: PZ;
  locked: boolean;
  onTarget: (id: TargetId) => void;
  grid: CropGridMode;
  setGrid: (g: CropGridMode) => void;
  safeArea: boolean;
  setSafeArea: (v: boolean) => void;
  ambient: boolean;
  setAmbient: (v: boolean) => void;
  brackets: boolean;
  setBrackets: (v: boolean) => void;
}) {
  const { state, update, commit } = pz;
  const patch = (fn: (s: CropEditState) => CropEditState, c = true) =>
    update(fn, c);

  return (
    <>
      {locked ? (
        <Section title="Frame">
          <Note>
            This field needs a {frameOf(state).w}×{frameOf(state).h} image, so
            the frame is fixed. Move and zoom the picture inside it.
          </Note>
        </Section>
      ) : (
        <Section title="Use this as">
          <div className="grid grid-cols-3 gap-2">
            {PICKABLE_TARGETS.map((id) => {
              const t = CROP_TARGETS[id];
              const f = t.free ? { w: 4, h: 3 } : t;
              const r = f.w / f.h;
              const w = r >= 1 ? 30 : 30 * r;
              const h = r >= 1 ? 30 / r : 30;
              const on = state.target === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onTarget(id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl  px-1 pb-2 pt-2.5 text-[11px] font-medium transition-colors ${on ? "bg-primary/30" : " bg-background hover:border-muted-foreground/25"}`}
                >
                  <span className="grid h-8 w-10 place-items-center">
                    <i
                      className={`block ${on ? "bg-primary" : "bg-muted-foreground/50"}`}
                      style={{
                        width: w,
                        height: h,
                        borderRadius:
                          t.shape === "round"
                            ? "50%"
                            : t.shape === "rounded"
                              ? 7
                              : 2,
                      }}
                    />
                  </span>
                  {t.label}
                  <span className="font-mono text-[10px] font-normal text-muted-foreground">
                    {t.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {state.target === "free" && (
        <Section title="Frame size">
          <div className="grid grid-cols-2 gap-2">
            {(["w", "h"] as const).map((k) => (
              <label
                key={k}
                className="space-y-1 text-xs text-muted-foreground"
              >
                {k === "w" ? "Width" : "Height"}
                <input
                  type="number"
                  min={64}
                  max={4096}
                  value={state.free[k]}
                  onChange={(e) => {
                    const v = Math.min(
                      4096,
                      Math.max(64, Math.round(+e.target.value) || 64),
                    );
                    patch((s) => ({ ...s, free: { ...s.free, [k]: v } }));
                  }}
                  className="h-9 w-full rounded-lg border border-muted-foreground/15 bg-input/50 px-2.5 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
              </label>
            ))}
          </div>
          <Note>
            Drag the handles on the frame, or type a size. The frame resizes
            from its centre.
          </Note>
        </Section>
      )}

      {!locked && (
        <Section title="Shape">
          <Seg<CropShape>
            value={state.shape}
            onChange={(v) => patch((s) => ({ ...s, shape: v }))}
            options={[
              ["rect", "Square corners"],
              ["rounded", "Rounded"],
              ["round", "Circle"],
            ]}
          />
          {state.shape === "rounded" && (
            <SliderRow
              label="Corner radius"
              value={state.radius}
              min={0}
              max={50}
              unit="%"
              onChange={(v) => update((s) => ({ ...s, radius: v }))}
              onCommit={commit}
            />
          )}
        </Section>
      )}

      <Section title="Position">
        <SliderRow
          label="Zoom"
          value={Math.round(pz.relZoom * 100)}
          sliderValue={pz.zoomSlider}
          min={-100}
          max={100}
          step={0.5}
          unit="%"
          onChange={(v) => pz.setZoomSlider(v)}
          onCommit={commit}
          rawSlider
        />
        <div className="-mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Zoom out</span>
          <span>100% fills the frame</span>
          <span>Zoom in</span>
        </div>
        <SliderRow
          label="Straighten"
          value={state.view.rot}
          min={-45}
          max={45}
          step={0.5}
          unit="°"
          onChange={(v) =>
            update((s) => ({ ...s, view: { ...s.view, rot: v } }))
          }
          onCommit={commit}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={pz.fit}
            className="rounded-lg text-xs"
          >
            <Minimize2 size={13} /> Fit whole
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={pz.fill}
            className="rounded-lg text-xs"
          >
            <Maximize2 size={13} /> Fill frame
          </Button>
        </div>
      </Section>

      <Section title="Background">
        <p className="text-xs text-muted-foreground">
          Fills any space the picture does not cover, for example when you zoom
          out below 100%.
        </p>
        <Seg<BgMode>
          value={state.bg.mode}
          onChange={(v) => patch((s) => ({ ...s, bg: { ...s.bg, mode: v } }))}
          options={[
            ["transparent", "None"],
            ["color", "Colour"],
            ["gradient", "Gradient"],
            ["blur", "Blur"],
          ]}
        />
        {(state.bg.mode === "color" || state.bg.mode === "gradient") && (
          <ColorField
            label={state.bg.mode === "gradient" ? "From" : "Colour"}
            value={state.bg.color}
            onChange={(v, c) =>
              update((s) => ({ ...s, bg: { ...s.bg, color: v } }), c)
            }
          />
        )}
        {state.bg.mode === "gradient" && (
          <ColorField
            label="To"
            value={state.bg.color2}
            onChange={(v, c) =>
              update((s) => ({ ...s, bg: { ...s.bg, color2: v } }), c)
            }
          />
        )}
      </Section>

      <Section title="Guides">
        <Seg<CropGridMode>
          value={grid}
          onChange={(v) => setGrid(v)}
          options={[
            ["none", "Off"],
            ["thirds", "Thirds"],
            ["golden", "Golden"],
            ["diagonal", "Diagonal"],
            ["cross", "Cross"],
          ]}
        />
        <SwitchRow
          label="Safe area"
          hint="Shows the ~90% margin short-form apps keep on screen"
          checked={safeArea}
          onChange={setSafeArea}
        />
        <SwitchRow
          label="Corner brackets"
          hint="Framing marks around a rectangular crop"
          checked={brackets}
          onChange={setBrackets}
        />
        <SwitchRow
          label="Ambient backdrop"
          hint="Blurred copy of the picture behind the stage"
          checked={ambient}
          onChange={setAmbient}
        />
      </Section>
    </>
  );
}

function LookTab({ img, pz }: { img: HTMLImageElement; pz: PZ }) {
  const { state, update, commit } = pz;
  const a = state.adjust;
  const setA = (k: keyof typeof a, v: number) =>
    update((s) => ({
      ...s,
      adjust: { ...s.adjust, [k]: v, preset: "custom" },
    }));

  return (
    <>
      <Section title="Looks">
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(CROP_LOOKS).map(([id, l]) => (
            <button
              key={id}
              type="button"
              aria-pressed={a.preset === id}
              onClick={() =>
                update(
                  (s) => ({
                    ...s,
                    adjust: { ...s.adjust, ...l.a, preset: id },
                  }),
                  true,
                )
              }
              className={`flex flex-col items-center gap-1 rounded-lg border p-1 text-[10px] transition-colors ${a.preset === id ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/25"}`}
            >
              <LookThumb img={img} look={l.a} />
              {l.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Adjust">
        <SliderRow
          label="Brightness"
          value={a.brightness}
          min={50}
          max={150}
          unit="%"
          onChange={(v) => setA("brightness", v)}
          onCommit={commit}
        />
        <SliderRow
          label="Contrast"
          value={a.contrast}
          min={50}
          max={150}
          unit="%"
          onChange={(v) => setA("contrast", v)}
          onCommit={commit}
        />
        <SliderRow
          label="Saturation"
          value={a.saturation}
          min={0}
          max={200}
          unit="%"
          onChange={(v) => setA("saturation", v)}
          onCommit={commit}
        />
        <SliderRow
          label="Hue shift"
          value={a.hue}
          min={-180}
          max={180}
          unit="°"
          onChange={(v) => setA("hue", v)}
          onCommit={commit}
        />
        <SliderRow
          label="Blur"
          value={a.blur}
          min={0}
          max={12}
          step={0.5}
          unit="px"
          onChange={(v) => setA("blur", v)}
          onCommit={commit}
        />
        <SliderRow
          label="Grayscale"
          value={a.grayscale}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => setA("grayscale", v)}
          onCommit={commit}
        />
        <SliderRow
          label="Sepia"
          value={a.sepia}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => setA("sepia", v)}
          onCommit={commit}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg text-xs"
          onClick={() =>
            update(
              (s) => ({
                ...s,
                adjust: {
                  ...s.adjust,
                  ...CROP_LOOKS.none.a,
                  blur: 0,
                  preset: "none",
                },
              }),
              true,
            )
          }
        >
          <RotateCcw size={13} /> Reset adjustments
        </Button>
      </Section>
    </>
  );
}

function AITab({ pz, source }: { pz: PZ; source: { w: number; h: number } }) {
  const { update } = pz;

  const apply = (t: AiTemplate) =>
    update((s) => {
      let next: CropEditState = {
        ...s,
        shape: t.cropShape === "round" ? "round" : "rect",
      };
      if (t.aspectRatio) {
        const ar = t.aspectRatio;
        const free =
          ar >= 1
            ? { w: 1080, h: Math.max(64, Math.round(1080 / ar)) }
            : { w: Math.max(64, Math.round(1080 * ar)), h: 1080 };
        next = { ...next, target: "free", free };
      }
      const bg = t.background;
      next = {
        ...next,
        bg:
          bg === "transparent"
            ? { ...next.bg, mode: "transparent" }
            : { ...next.bg, mode: "color", color: bg ?? next.bg.color },
        adjust: {
          ...CROP_LOOKS.none.a,
          blur: 0,
          css: t.filter,
          preset: `ai:${t.id}`,
        },
        view: { ...next.view, cx: 0, cy: 0, rot: 0, quarter: 0 },
      };
      const cov = coverScale(next, source);
      return { ...next, view: { ...next.view, s: cov * (t.zoom ?? 1) } };
    }, true);

  return (
    <>
      <Section title="AI templates">
        <p className="text-xs text-muted-foreground">
          One tap applies a full recipe — frame ratio, look and letterbox fill.
          Runs on-device and stays fully editable afterwards.
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {AI_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => apply(t)}
              className="group flex items-center gap-3 rounded-xl  bg-background p-2.5 text-left transition-all hover:border-primary/50 hover:bg-white/6"
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-lg bg-linear-to-br ${t.gradient}`}
              >
                <Wand2 size={17} className="text-white/90" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-xs font-semibold">
                    {t.title}
                  </span>
                  <span className="ml-auto shrink-0 rounded-full border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {t.ratio}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {t.prompt}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Section>
      <Note>
        Every template only sets the frame, Look and background — tweak any of
        them on the Crop and Look tabs right after.
      </Note>
    </>
  );
}

function PropsTab({
  pz,
  assets,
  setAssets,
}: {
  pz: PZ;
  assets: RenderAssets;
  setAssets: (a: RenderAssets) => void;
}) {
  const { state, update, commit } = pz;
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends "ring" | "mark" | "text" | "badge">(
    k: K,
    patch: Partial<CropEditState[K]>,
    c = false,
  ) =>
    update((s) => ({ ...s, [k]: { ...s[k], ...patch } }) as CropEditState, c);

  const uploadLogo = (f: File) => {
    const im = new Image();
    im.onload = () => {
      setAssets({ customLogo: im });
      set("mark", { custom: true, on: true }, true);
    };
    im.src = URL.createObjectURL(f);
  };

  return (
    <>
      <Section
        title="Ring"
        gate={state.ring.on}
        onGate={(v) => set("ring", { on: v }, true)}
      >
        <Seg
          value={state.ring.style}
          onChange={(v) => set("ring", { style: v }, true)}
          options={[
            ["gradient", "Gradient"],
            ["solid", "Solid"],
          ]}
        />
        <SliderRow
          label="Thickness"
          value={state.ring.width}
          min={2}
          max={24}
          unit="px"
          onChange={(v) => set("ring", { width: v })}
          onCommit={commit}
        />
        <SliderRow
          label="Gap"
          value={state.ring.gap}
          min={0}
          max={24}
          unit="px"
          onChange={(v) => set("ring", { gap: v })}
          onCommit={commit}
        />
        <ColorField
          label="Colour"
          value={state.ring.color}
          onChange={(v, c) => set("ring", { color: v }, c)}
        />
        {state.ring.style === "gradient" && (
          <ColorField
            label="Second colour"
            value={state.ring.color2}
            onChange={(v, c) => set("ring", { color2: v }, c)}
          />
        )}
      </Section>

      <Section
        title="Logo mark"
        gate={state.mark.on}
        onGate={(v) => set("mark", { on: v }, true)}
      >
        <div className="grid grid-cols-4 gap-2">
          {MARK_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-label={id}
              aria-pressed={!state.mark.custom && state.mark.logo === id}
              onClick={() =>
                set("mark", { logo: id, custom: false, on: true }, true)
              }
              /* 👇 Added flex items-center justify-center p-2 [&_svg]:size-5 */
              className={`flex aspect-square items-center justify-center rounded-xl p-2 transition-colors [&_svg]:size-15 ${
                !state.mark.custom && state.mark.logo === id
                  ? " bg-primary/30 text-primary"
                  : " bg-background text-foreground hover:border-white/25"
              }`}
              dangerouslySetInnerHTML={{ __html: markSvg(id, "currentColor") }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/3 p-2.5">
          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/30">
            {assets.customLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assets.customLogo.src}
                alt=""
                className="size-full object-contain"
              />
            ) : (
              <Upload size={15} className="text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-medium">Your own logo</p>
            <p className="text-muted-foreground">PNG, SVG or JPG</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg text-xs"
            onClick={() => fileRef.current?.click()}
          >
            {assets.customLogo ? "Replace" : "Upload"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadLogo(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="grid grid-cols-[auto_1fr] items-start gap-4">
          <PosGrid
            label="Position"
            value={state.mark.pos}
            onChange={(v) => set("mark", { pos: v }, true)}
          />
          <div className="space-y-3">
            <SliderRow
              label="Size"
              value={state.mark.size}
              min={6}
              max={60}
              unit="%"
              onChange={(v) => set("mark", { size: v })}
              onCommit={commit}
            />
            <SliderRow
              label="Opacity"
              value={state.mark.opacity}
              min={10}
              max={100}
              unit="%"
              onChange={(v) => set("mark", { opacity: v })}
              onCommit={commit}
            />
          </div>
        </div>
        {!state.mark.custom && (
          <ColorField
            label="Tint"
            value={state.mark.tint}
            onChange={(v, c) => set("mark", { tint: v }, c)}
          />
        )}
      </Section>

      <Section
        title="Caption"
        gate={state.text.on}
        onGate={(v) => set("text", { on: v }, true)}
      >
        <input
          value={state.text.value}
          maxLength={60}
          placeholder="@handle or a short title"
          aria-label="Caption text"
          onChange={(e) => set("text", { value: e.target.value })}
          onBlur={commit}
          className="h-9 w-full rounded-lg border border-muted-foreground/15 bg-input/50 px-3 text-sm outline-none focus:border-primary"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={state.text.font}
            onValueChange={(v) =>
              set("text", { font: v as keyof typeof CROP_FONTS }, true)
            }
          >
            <SelectTrigger className="h-9 rounded-lg border border-muted-foreground/15 bg-input/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(CROP_FONTS).map((f) => (
                <SelectItem key={f} value={f} className="text-xs">
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(state.text.weight)}
            onValueChange={(v) => set("text", { weight: +v }, true)}
          >
            <SelectTrigger className="h-9 rounded-lg border border-muted-foreground/15 bg-input/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="400" className="text-xs">
                Regular
              </SelectItem>
              <SelectItem value="600" className="text-xs">
                Semibold
              </SelectItem>
              <SelectItem value="700" className="text-xs">
                Bold
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SliderRow
          label="Size"
          value={state.text.size}
          min={3}
          max={20}
          step={0.5}
          unit="%"
          onChange={(v) => set("text", { size: v })}
          onCommit={commit}
        />
        <ColorField
          label="Colour"
          value={state.text.color}
          onChange={(v, c) => set("text", { color: v }, c)}
        />
        <PosGrid
          label="Position"
          value={state.text.pos}
          onChange={(v) => set("text", { pos: v }, true)}
        />
        <SwitchRow
          label="Soft shadow"
          checked={state.text.shadow}
          onChange={(v) => set("text", { shadow: v }, true)}
        />
      </Section>

      <Section
        title="Badge"
        gate={state.badge.on}
        onGate={(v) => set("badge", { on: v }, true)}
      >
        <Seg
          value={state.badge.type}
          onChange={(v) => set("badge", { type: v }, true)}
          options={[
            ["verified", "Verified"],
            ["online", "Online"],
            ["star", "Star"],
            ["pro", "Pro"],
          ]}
        />
        <Seg
          value={state.badge.pos}
          onChange={(v) => set("badge", { pos: v }, true)}
          options={[
            ["tl", "Top left"],
            ["tr", "Top right"],
            ["bl", "Bottom left"],
            ["br", "Bottom right"],
          ]}
        />
        <SliderRow
          label="Size"
          value={state.badge.size}
          min={10}
          max={40}
          unit="%"
          onChange={(v) => set("badge", { size: v })}
          onCommit={commit}
        />
      </Section>
    </>
  );
}

const FORMATS: CropOutputFormat[] = ["webp", "avif", "jpeg", "png"];

function ExportTab({
  url,
  fileName,
  state,
  assets,
  output,
  onOutputChange,
  upscaled,
}: {
  url: string;
  fileName: string;
  state: CropEditState;
  assets: RenderAssets;
  output: CropOutputSettings;
  onOutputChange: (p: Partial<CropOutputSettings>) => void;
  upscaled: boolean;
}) {
  const f = frameOf(state);
  const [est, setEst] = useState<{
    sig: string;
    w: number;
    h: number;
    bytes: number;
    format: string;
    warnings: string[];
  } | null>(null);

  const sig = `${url}|${output.format}|${output.quality}|${output.sharpen}|${
    output.watermark ?? ""
  }|${output.maxDimension ?? ""}|${JSON.stringify(state)}`;

  useEffect(() => {
    let live = true;
    const id = setTimeout(async () => {
      try {
        const r = await exportCrop(url, state, output, fileName, assets);
        if (live)
          setEst({
            sig,
            w: r.width,
            h: r.height,
            bytes: r.sizeBytes,
            format: r.format,
            warnings: r.warnings,
          });
      } catch {
        /* estimate is optional */
      }
    }, 450);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [sig, url, state, output, fileName, assets]);

  const fresh = est && est.sig === sig ? est : null;
  const alpha =
    state.bg.mode === "transparent" || state.shape !== "rect" || state.ring.on;

  return (
    <>
      <Section title="Format">
        <Seg<CropOutputFormat>
          value={output.format}
          onChange={(v) => onOutputChange({ format: v })}
          options={FORMATS.map(
            (x) =>
              [x, x === "jpeg" ? "JPEG" : x.toUpperCase()] as [
                CropOutputFormat,
                string,
              ],
          )}
        />
        <SliderRow
          label="Quality"
          value={Math.round(output.quality * 100)}
          min={40}
          max={100}
          unit="%"
          disabled={output.format === "png"}
          onChange={(v) => onOutputChange({ quality: v / 100 })}
        />
      </Section>
      <Section title="Size">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Longest edge</Label>
          <Select
            value={String(output.maxDimension ?? 0)}
            onValueChange={(v) =>
              onOutputChange({ maxDimension: +v || undefined })
            }
          >
            <SelectTrigger className="h-9 rounded-lg border border-muted-foreground/15 bg-input/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0" className="text-xs">
                Frame size
              </SelectItem>
              {[4096, 2048, 1200, 800, 400].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n} px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <SwitchRow
          label="Sharpen after resizing"
          hint="Adds a light unsharp mask"
          checked={output.sharpen}
          onChange={(v) => onOutputChange({ sharpen: v })}
        />
      </Section>
      <Section title="Watermark">
        <input
          value={output.watermark ?? ""}
          maxLength={40}
          placeholder="© Your Studio (leave empty for none)"
          aria-label="Watermark text"
          onChange={(e) =>
            onOutputChange({ watermark: e.target.value || undefined })
          }
          className="h-9 w-full rounded-lg border border-muted-foreground/15 bg-input/50 px-3 text-sm outline-none focus:border-primary"
        />
        <Note>
          Shown bottom-right. It appears on the stage and in the exported file.
        </Note>
      </Section>
      <Section title="Result">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">Frame</dt>
          <dd className="text-right font-mono">
            {f.w}×{f.h} px
          </dd>
          <dt className="text-muted-foreground">Output</dt>
          <dd className="text-right font-mono">
            {fresh ? `${fresh.w}×${fresh.h} px` : "…"}
          </dd>
          <dt className="text-muted-foreground">File</dt>
          <dd className="text-right font-mono">
            {fresh ? formatBytes(fresh.bytes) : "estimating…"}
          </dd>
          <dt className="text-muted-foreground">Metadata</dt>
          <dd className="text-right font-mono">EXIF removed</dd>
        </dl>
        {output.format === "jpeg" && alpha && (
          <Note warn>
            JPEG has no transparency. Empty areas and rounded corners are filled
            with the background colour.
          </Note>
        )}
        {upscaled && (
          <Note warn>
            The crop is upscaled {state.view.s.toFixed(2)}× from the original,
            so it may look soft. A larger original gives a sharper result.
          </Note>
        )}
      </Section>
    </>
  );
}

// ─────────────────────────────────────────────
// PREVIEWS
// ─────────────────────────────────────────────

function PreviewCanvas({
  img,
  state,
  assets,
  w,
  h,
}: {
  img: HTMLImageElement;
  state: CropEditState;
  assets: RenderAssets;
  w: number;
  h: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const f = frameOf(state);
    c.width = Math.round(w * 2);
    c.height = Math.round(h * 2);
    ctx.setTransform(c.width / f.w, 0, 0, c.height / f.h, 0, 0);
    renderCropOutput(
      ctx,
      state,
      { el: img, w: img.naturalWidth, h: img.naturalHeight },
      f.w,
      f.h,
      assets,
    );
  }, [img, state, assets, w, h]);
  return (
    <canvas
      ref={ref}
      style={{ width: w, height: h }}
      className="block max-w-full"
    />
  );
}

function LivePreview({
  img,
  state,
  assets,
}: {
  img: HTMLImageElement;
  state: CropEditState;
  assets: RenderAssets;
}) {
  const f = frameOf(state);
  const r = f.w / f.h;
  const pv = (w: number, h: number) => (
    <PreviewCanvas img={img} state={state} assets={assets} w={w} h={h} />
  );
  const cell = (
    label: string,
    node: React.ReactNode,
    tone?: "light" | "dark",
  ) => (
    <div
      key={label}
      className="flex flex-col items-center gap-1.5 text-[10px] text-muted-foreground"
    >
      <div
        className={
          tone
            ? `rounded-xl border border-white/10 p-2.5 ${tone === "light" ? "bg-white" : "bg-neutral-900"}`
            : ""
        }
      >
        {node}
      </div>
      {label}
    </div>
  );

  if (
    state.target === "avatar" ||
    (state.target === "locked" && state.shape === "round")
  )
    return (
      <div className="flex flex-wrap items-end gap-3">
        {cell("96 px", pv(88, 88))}
        {cell("48 px", pv(48, 48))}
        {cell("28 px", pv(28, 28))}
      </div>
    );
  if (state.target === "favicon")
    return (
      <div className="flex flex-wrap items-end gap-3">
        {cell("On light", pv(40, 40), "light")}
        {cell("On dark", pv(40, 40), "dark")}
        {cell("16 px", pv(16, 16))}
      </div>
    );
  if (state.target === "logo")
    return (
      <div className="flex flex-wrap items-end gap-3">
        {cell("On light", pv(56, 56), "light")}
        {cell("On dark", pv(56, 56), "dark")}
        {cell("Tab icon", pv(18, 18))}
      </div>
    );
  if (state.target === "wordmark")
    return (
      <div className="flex flex-wrap items-end gap-3">
        {cell("On light", pv(130, 43), "light")}
        {cell("On dark", pv(130, 43), "dark")}
      </div>
    );
  const maxW = 320;
  const maxH = r >= 1 ? 140 : 180;
  const h = Math.min(maxH, maxW / r);
  return <div className="flex">{pv(Math.round(h * r), Math.round(h))}</div>;
}

function LookThumb({
  img,
  look,
}: {
  img: HTMLImageElement;
  look: Omit<import("./cropRenderer").CropAdjust, "preset" | "blur">;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, 96, 72);
    const sc = Math.max(96 / img.naturalWidth, 72 / img.naturalHeight);
    ctx.filter = filterString({ ...look, blur: 0, preset: "x" });
    ctx.drawImage(
      img,
      48 - (img.naturalWidth * sc) / 2,
      36 - (img.naturalHeight * sc) / 2,
      img.naturalWidth * sc,
      img.naturalHeight * sc,
    );
  }, [img, look]);
  return (
    <canvas
      ref={ref}
      width={96}
      height={72}
      className="block w-full rounded-md"
    />
  );
}

// ─────────────────────────────────────────────
// SMALL UI PARTS
// ─────────────────────────────────────────────

function Section({
  title,
  children,
  gate,
  onGate,
}: {
  title: string;
  children: React.ReactNode;
  gate?: boolean;
  onGate?: (v: boolean) => void;
}) {
  const off = gate === false;
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold">{title}</h4>
        {onGate && (
          <Switch
            checked={!!gate}
            onCheckedChange={onGate}
            aria-label={title}
          />
        )}
      </header>
      <div
        className={`space-y-3 transition-opacity ${off ? "pointer-events-none opacity-40" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div
      role="group"
      className="flex gap-0.5 rounded-xl border border-muted-foreground/15 bg-input/50 p-0.5"
    >
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex-1 whitespace-nowrap rounded-[0.55rem] px-2 py-1.5 text-xs font-medium transition-colors ${value === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  onCommit,
  disabled,
  sliderValue,
  rawSlider,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  onCommit?: () => void;
  disabled?: boolean;
  sliderValue?: number;
  rawSlider?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${disabled ? "opacity-40" : ""}`}>
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
        <output className="font-mono text-xs tabular-nums">
          {rawSlider
            ? value
            : Number.isInteger(step)
              ? value
              : value.toFixed(1)}
          {unit}
        </output>
      </div>
      <Slider
        value={[sliderValue ?? value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(v[0])}
        onValueCommit={onCommit}
        aria-label={label}
        className="bg-muted-foreground/40"
      />
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs">
        <p>{label}</p>
        {hint && <p className="text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string, commit: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
        <output className="font-mono text-[11px] text-muted-foreground">
          {value}
        </output>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={value.toLowerCase() === c}
            onClick={() => onChange(c, true)}
            className={`size-6 rounded-full border-2 border-neutral-900 transition-shadow ${value.toLowerCase() === c ? "ring-2 ring-primary" : "ring-1 ring-white/20"}`}
            style={{ background: c }}
          />
        ))}
        <input
          type="color"
          value={value}
          aria-label={`${label}, custom`}
          onChange={(e) => onChange(e.target.value, false)}
          onBlur={(e) => onChange(e.target.value, true)}
          className="h-6 w-8 cursor-pointer rounded-md border border-white/15 bg-transparent p-0"
        />
      </div>
    </div>
  );
}

function PosGrid({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Anchor;
  onChange: (v: Anchor) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <div className="grid w-fit grid-cols-3 gap-1">
        {ANCHORS.map((p) => (
          <button
            key={p}
            type="button"
            aria-label={p}
            aria-pressed={value === p}
            onClick={() => onChange(p)}
            className={`size-6 rounded-md border transition-colors ${value === p ? "border-primary bg-primary" : "border-white/15 bg-white/5 hover:bg-white/10"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Note({
  children,
  warn,
}: {
  children: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div
      className={`flex gap-2 rounded-xl border p-2.5 text-xs ${warn ? "border-amber-400/20 bg-amber-400/8 text-foreground" : "border-white/8 bg-white/3 text-muted-foreground"}`}
    >
      <Info
        size={14}
        className={`mt-0.5 shrink-0 ${warn ? "text-amber-400" : ""}`}
      />
      <span>{children}</span>
    </div>
  );
}

function Chip({
  children,
  warn,
  muted,
}: {
  children: React.ReactNode;
  warn?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-6.5 items-center gap-1.5 whitespace-nowrap rounded-full border bg-black/70 px-2.5 text-[11px] font-medium backdrop-blur-md ${warn ? "border-amber-500/40 text-amber-300" : muted ? "border-white/10 text-white/60" : "border-white/10 text-white"}`}
    >
      {children}
    </span>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-white/10" />;
}

function DockBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${active ? "bg-primary/25 text-primary" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
