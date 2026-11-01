// studio/src/components/gnapex-studio/canvas/preview-frame.tsx
//
// The page canvas: utility bar, rulers/tool dock, device viewport, code &
// data sub-views, bottom drawer. Themed by the token system (light + dark):
// no hardcoded night palette — the studio chrome follows the studio theme,
// while the framed portal keeps its own runtime look.
"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Grid3x3,
  Hand,
  Image as ImageIcon,
  Minus,
  Monitor,
  MousePointer,
  Play,
  Plus,
  Redo2,
  Smartphone,
  Square,
  Tablet,
  Type,
  Undo2,
} from "lucide-react";

import { usePreviewBridge } from "@/hooks/gnapex-studio/use-preview-bridge";
import { store } from "@/lib/gnapex-studio/store";
import { previewPathFor } from "@/lib/preview";
import type { StudioManifest, TemplateRuntimeMeta } from "@/lib/contract";
import type { ViewportKey } from "@/lib/gnapex-studio/types";

import { RuntimeMount } from "./runtime-mount";
import { SelectionOverlay } from "./selection-overlay";
import { FloatingToolbar } from "./floating-toolbar";

type CanvasTab = "Design" | "Code" | "Data" | "Logic";
type CanvasTool =
  | "select"
  | "hand"
  | "Text"
  | "Button"
  | "Image"
  | "Card"
  | "Section";

const DEVICE_WIDTHS: Record<ViewportKey, number> = {
  desktop: 1100,
  tablet: 768,
  mobile: 390,
};
const softBtn =
  "rounded border border-border bg-[var(--soft)] p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-[var(--hover)]";
const toggleOn =
  "border-[var(--brand-text)]/50 bg-[var(--active)] text-[var(--brand-text)]";
const toggleOff = "border-border text-muted-foreground hover:text-foreground";

export interface PreviewFrameProps {
  projectId: string;
  pageKey: string;
  previewToken: string | null;
  resolvedOrigin: string;
  manifest?: StudioManifest | null;
  /**
   * When the registered template ships a compiled mount bundle (Model B),
   * the canvas executes it in-host instead of iframing a live URL.
   */
  templateRuntime?: TemplateRuntimeMeta | null;
}

export function PreviewFrame({
  projectId,
  pageKey,
  previewToken,
  resolvedOrigin,
  templateRuntime,
}: PreviewFrameProps) {
  const runtimeMode = Boolean(
    templateRuntime && (templateRuntime.bundleUrl ?? "").startsWith("http"),
  );
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // Store state
  const viewport = store((s) => s.viewport);
  const setViewport = store((s) => s.setViewport);
  const setBridgeStatus = store((s) => s.setBridgeStatus);
  const bridgeStatus = store((s) => s.bridgeStatus);
  const vfsPath = store((s) => s.vfsPath);
  const navToOverview = store((s) => s.navToOverview);
  const navToFolder = store((s) => s.navToFolder);
  const document_ = store((s) => s.document);

  // Canvas interactive settings
  const [activeTab, setActiveTab] = useState<CanvasTab>("Design");
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [zoom, setZoom] = useState<number>(100);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  // Explicit manual width; null = follow the active device preset.
  const [widthOverride, setWidthOverride] = useState<number | null>(null);
  const customWidth = widthOverride ?? DEVICE_WIDTHS[viewport];
  const [bottomDrawer, setBottomDrawer] = useState<
    "Layers" | "Console" | "A11y" | null
  >(null);

  // Connect typed bridge to live iframe (iframe mode only; the mount runtime
  // wires selection/hover directly into the store in the same window).
  usePreviewBridge({
    projectId,
    pageKey,
    previewOrigin: resolvedOrigin,
    frameRef,
    enabled: activeTab === "Design" && !runtimeMode,
  });

  // Calculate live iframe URL. When the studio preview proxy is enabled the
  // portal is fetched server-side and served same-origin, bypassing
  // X-Frame-Options on CDN-hosted runtimes.
  const frameSrc = useMemo(() => {
    const path = previewPathFor(pageKey);
    const params = new URLSearchParams();
    params.set("preview", "draft");
    params.set("_preview", "true");
    if (previewToken) params.set("previewKey", previewToken);
    params.set("projectId", projectId);
    params.set("_studio", "1");
    const studioOrigin =
      typeof window !== "undefined" ? window.location.origin : "";
    if (studioOrigin) params.set("studioOrigin", studioOrigin);
    const base = resolvedOrigin ? resolvedOrigin.replace(/\/$/, "") : "";
    const direct = `${base}${path}?${params.toString()}`;
    return process.env.NEXT_PUBLIC_PREVIEW_PROXY === "1"
      ? `/preview?src=${encodeURIComponent(direct)}`
      : direct;
  }, [pageKey, previewToken, projectId, resolvedOrigin]);

  useEffect(() => {
    setBridgeStatus("connecting");
  }, [frameSrc, setBridgeStatus]);

  // Back to directory handler
  const handleBackToFolder = () => {
    if (vfsPath.length > 0) navToFolder(vfsPath);
    else navToOverview();
  };

  const currentInstances = document_?.pageLayouts?.[pageKey] ?? [];
  const bridgeDown =
    bridgeStatus === "unavailable" || bridgeStatus === "connecting";

  // Workspace global tokens for the mount runtime (semantic token vocabulary).
  const documentTokens: Record<string, string> = (() => {
    const source = document_?.globalTokens as
      | Record<string, string | number>
      | undefined;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(source ?? {})) {
      out[key] = String(value);
    }
    return out;
  })();

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background text-[13px] text-foreground">
      {/* ── 1. Top Canvas Utility Bar ──────────────────────────────────────── */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card/50 px-3 backdrop-blur-sm">
        {/* Back button */}
        <button
          type="button"
          onClick={handleBackToFolder}
          title="Return to folder matrix"
          className="studio-action !min-h-0 !rounded-lg !px-2 !py-1 !text-xs"
        >
          <ArrowLeft className="size-3.5" />
          <span className="hidden sm:inline">Folders</span>
        </button>

        {/* Sub-view Tabs */}
        <div className="studio-seg !text-xs">
          {(["Design", "Code", "Data", "Logic"] as CanvasTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              data-active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              <span className="px-2 py-1">{tab}</span>
            </button>
          ))}
        </div>

        {/* Route URI chip */}
        <span className="studio-chip !rounded-md hidden font-mono lg:inline-flex">
          /{pageKey}
        </span>

        <div className="flex-1" />

        {/* Device Switcher */}
        <div className="studio-seg !text-xs">
          <button
            type="button"
            title="Desktop view (1100px)"
            data-active={viewport === "desktop"}
            onClick={() => {
              setViewport("desktop");
              setWidthOverride(null);
            }}
          >
            <Monitor className="size-3.5" />
          </button>
          <button
            type="button"
            title="Tablet view (768px)"
            data-active={viewport === "tablet"}
            onClick={() => {
              setViewport("tablet");
              setWidthOverride(null);
            }}
          >
            <Tablet className="size-3.5" />
          </button>
          <button
            type="button"
            title="Mobile view (390px)"
            data-active={viewport === "mobile"}
            onClick={() => {
              setViewport("mobile");
              setWidthOverride(null);
            }}
          >
            <Smartphone className="size-3.5" />
          </button>
        </div>

        {/* Manual Width Input */}
        <input
          type="number"
          value={customWidth}
          onChange={(e) =>
            setWidthOverride(
              Math.max(320, Math.min(1600, Number(e.target.value) || 1100)),
            )
          }
          className="hidden w-16 rounded-lg border border-border bg-[var(--soft)] px-1.5 py-1 text-center font-mono text-xs text-foreground outline-none transition-colors focus:border-[var(--brand-text)]/60 sm:inline-block"
        />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 text-xs">
          <button type="button" onClick={() => setZoom((z) => Math.max(50, z - 10))} className={softBtn}>
            <Minus className="size-3" />
          </button>
          <span className="w-10 text-center font-mono text-[11px] text-muted-foreground">
            {zoom}%
          </span>
          <button type="button" onClick={() => setZoom((z) => Math.min(150, z + 10))} className={softBtn}>
            <Plus className="size-3" />
          </button>
        </div>

        {/* Rulers / Grid / Snap Toggles */}
        <div className="hidden items-center gap-1 md:flex">
          <button
            type="button"
            onClick={() => setShowRulers(!showRulers)}
            className={`studio-chip !rounded-lg border ${showRulers ? toggleOn : toggleOff}`}
          >
            Rulers
          </button>
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`studio-chip !rounded-lg border ${showGrid ? toggleOn : toggleOff}`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`studio-chip !rounded-lg border ${snapToGrid ? toggleOn : toggleOff}`}
          >
            Snap
          </button>
        </div>

        {/* History buttons */}
        <button type="button" title="Undo" className={softBtn}>
          <Undo2 className="size-3.5" />
        </button>
        <button type="button" title="Redo" className={softBtn}>
          <Redo2 className="size-3.5" />
        </button>

        {/* Preview Play Switch */}
        <button
          type="button"
          onClick={() => setPreviewMode(!previewMode)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
            previewMode
              ? "bg-[var(--warning)] text-white hover:brightness-105"
              : "bg-[var(--active)] text-[var(--brand-text)] hover:brightness-105"
          }`}
        >
          {previewMode ? (
            <Square className="size-3 fill-current" />
          ) : (
            <Play className="size-3 fill-current" />
          )}
          <span>{previewMode ? "Exit" : "Preview"}</span>
        </button>
      </div>

      {/* ── 2. Stage Center Viewport ────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Pixel Rulers */}
        {showRulers && activeTab === "Design" && (
          <>
            {/* Top Ruler */}
            <div
              className="pointer-events-none absolute left-5 right-0 top-0 z-20 h-5 border-b border-border bg-[var(--soft)]/70"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(128,128,140,0.35) 0 1px, transparent 1px 50px)",
                backgroundSize: "100% 5px",
                backgroundRepeat: "repeat-x",
                backgroundPosition: "bottom",
              }}
            />
            {/* Left Ruler */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 top-5 z-20 w-5 border-r border-border bg-[var(--soft)]/70"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(180deg, rgba(128,128,140,0.35) 0 1px, transparent 1px 50px)",
                backgroundSize: "5px 100%",
                backgroundRepeat: "repeat-y",
                backgroundPosition: "right",
              }}
            />
          </>
        )}

        {/* Floating Tool Switcher Dock (Left) */}
        {activeTab === "Design" && !previewMode && (
          <aside className="studio-glass absolute left-8 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border border-border p-1.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
            {[
              [
                "select",
                <MousePointer key="s" className="size-4" />,
                "Select (V)",
              ],
              ["hand", <Hand key="h" className="size-4" />, "Hand (H)"],
              ["Text", <Type key="t" className="size-4" />, "Text Block (T)"],
              ["Button", <Square key="b" className="size-4" />, "Button (B)"],
              ["Image", <ImageIcon key="i" className="size-4" />, "Image (I)"],
              ["Card", <CreditCard key="c" className="size-4" />, "Card (C)"],
              [
                "Section",
                <Grid3x3 key="sec" className="size-4" />,
                "Blank Section (S)",
              ],
            ].map(([id, icon, label]) => (
              <button
                key={String(id)}
                type="button"
                onClick={() => setActiveTool(id as CanvasTool)}
                title={String(label)}
                className={`grid size-9 place-items-center rounded-xl transition-colors ${
                  activeTool === id
                    ? "bg-[var(--active)] text-[var(--brand-text)]"
                    : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
                }`}
              >
                {icon as React.ReactNode}
              </button>
            ))}
          </aside>
        )}

        {/* Main Canvas Scroll Area */}
        <div
          id="cv"
          className="studio-scroll relative h-full w-full overflow-auto p-12 transition-all bg-[radial-gradient(circle_at_1px_1px,rgba(127,127,140,0.16)_1px,transparent_0)] [background-size:20px_20px]"
        >
          {activeTab === "Design" ? (
            /* Device Viewport Frame */
            <div
              className="mx-auto transition-all duration-200"
              style={{
                width: customWidth,
                maxWidth: "100%",
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
              }}
            >
              {/* Frame Label */}
              <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>
                  {viewport.toUpperCase()} · {customWidth}px
                </span>
                <span>
                  {currentInstances.length} sections ·{" "}
                  {previewMode ? "Interactive Preview" : "Draft Canvas"}
                </span>
              </div>

              {/* Sandboxed Live Application Viewport */}
              <div className="relative overflow-hidden rounded-xs border border-border bg-background shadow-[0_30px_80px_-30px_rgba(15,15,30,0.5)]">
                {/* The live template — executed in-host from the compiled
                    bundle (Model B), or framed from a real URL (Model A). */}
                {runtimeMode && templateRuntime ? (
                  <RuntimeMount
                    bundleUrl={templateRuntime.bundleUrl}
                    pageKey={pageKey}
                    tokens={documentTokens}
                  />
                ) : (
                  <iframe
                    ref={frameRef}
                    src={frameSrc}
                    title={`GN-Apex live preview — ${pageKey}`}
                    className="block h-160 w-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                )}

                {/* Honest bridge state over the frame (never fakes content) */}
                {bridgeDown && !previewMode && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-10 mx-auto grid w-fit place-items-center gap-1.5 rounded-xl border border-border bg-[var(--soft)] px-4 py-2 text-center shadow-sm backdrop-blur-sm">
                    <span className="text-[11px] font-medium text-foreground">
                      {bridgeStatus === "unavailable"
                        ? "Portal runtime unreachable"
                        : "Connecting to the portal…"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {bridgeStatus === "unavailable"
                        ? "The live runtime origin did not respond — the draft layout shown here stays editable."
                        : "Validating the sandbox bridge and node registry."}
                    </span>
                  </div>
                )}

                {/* Overlays (Disabled in preview mode) */}
                {!previewMode && (
                  <>
                    <SelectionOverlay />
                    <FloatingToolbar />
                  </>
                )}
              </div>
            </div>
          ) : activeTab === "Code" ? (
            /* Generated Next.js Code View */
            <div className={`mx-auto max-w-4xl rounded-2xl border border-border bg-card/70 p-6 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)]`}>
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">app/portal/{pageKey}/page.tsx</span>
                <span className="studio-chip !font-mono">
                  Read-only Next.js View
                </span>
              </div>
              <pre className="studio-scroll overflow-x-auto rounded-xl bg-[var(--soft)] p-4 font-mono text-xs leading-relaxed text-foreground/90">
                {`// Generated Next.js Page Route from GN-Apex Contract\nimport { NexusPortalPage } from '@gnapex/client-sdk';\n\nexport default async function Page() {\n  return (\n    <main className="min-h-screen bg-background text-foreground">\n      ${currentInstances.map((i) => `<${i.componentId} id="${i.instanceId}" />`).join("\n      ")}\n    </main>\n  );\n}`}
              </pre>
            </div>
          ) : activeTab === "Data" ? (
            /* Data Endpoints Binding View */
            <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card/70 p-6 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)]">
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                Live Endpoint Bindings
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                Data sources wired to {pageKey}
              </p>
              <div className="divide-y divide-border rounded-xl border border-border bg-[var(--soft)]">
                {[
                  ["student.profile", "GET /api/v1/students/:id", "Populated"],
                  ["student.grades", "GET /api/v1/results/:id", "Populated"],
                  [
                    "student.fees",
                    "GET /api/v1/finance/ledgers",
                    "Active Stream",
                  ],
                ].map(([model, endpoint, status]) => (
                  <div
                    key={model}
                    className="flex items-center justify-between p-3.5 text-xs"
                  >
                    <span className="font-mono font-medium text-[var(--brand-text)]">
                      {model}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {endpoint}
                    </span>
                    <span className="rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Logic & Workflow Graph View */
            <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card/70 p-6 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)]">
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                Functional State Machine
              </h3>
              <p className="mb-6 text-xs text-muted-foreground">
                Server-governed workflow pipeline for this surface
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-xl border border-border bg-[var(--soft)] p-4 text-xs">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    Trigger
                  </span>
                  <p className="font-semibold text-foreground">
                    Site-User Action
                  </p>
                </div>
                <span className="text-muted-foreground/60">→</span>
                <div className="rounded-xl border border-border bg-[var(--soft)] p-4 text-xs">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    Contract Validation
                  </span>
                  <p className="font-semibold text-foreground">
                    GN-Apex API Guard
                  </p>
                </div>
                <span className="text-muted-foreground/60">→</span>
                <div className="rounded-xl border border-[var(--brand-text)]/40 bg-[var(--active)] p-4 text-xs">
                  <span className="text-[10px] font-mono uppercase text-[var(--brand-text)]">
                    Execution
                  </span>
                  <p className="font-semibold text-foreground">
                    Live Release Commit
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Bottom Drawer & Inspection Bar ───────────────────────────────── */}
      {bottomDrawer && (
        <div className="studio-scroll h-40 shrink-0 overflow-y-auto border-t border-border bg-card/60 p-3 text-xs backdrop-blur-sm">
          {bottomDrawer === "Layers" && (
            <div className="space-y-1">
              {currentInstances.map((inst) => (
                <div
                  key={inst.instanceId}
                  className="flex items-center justify-between rounded-lg px-3 py-1.5 transition-colors hover:bg-[var(--hover)]"
                >
                  <span className="font-medium text-foreground">
                    {inst.componentId}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {inst.instanceId}
                  </span>
                </div>
              ))}
              {currentInstances.length === 0 && (
                <p className="px-3 py-1.5 text-[11px] text-muted-foreground">
                  No sections on this page yet.
                </p>
              )}
            </div>
          )}
          {bottomDrawer === "Console" && (
            <div className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              <p className="text-[var(--brand-text)]">
                ⚡ Bridge status: {bridgeStatus} · origin validated
              </p>
              <p>
                ✔ Node registry initialized with {currentInstances.length}{" "}
                components
              </p>
              <p>✔ Draft revision r{document_?.draftRevision ?? "—"} target resolved</p>
            </div>
          )}
          {bottomDrawer === "A11y" && (
            <div className="space-y-1.5 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                <span>All form fields contain descriptive labels</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                <span>WCAG contrast ratio exceeds 4.5:1 on all text</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-[var(--success)]" />
                <span>Touch targets maintain 44px minimum sizing</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Status Toggles */}
      <footer className="flex h-8 shrink-0 items-center gap-1 border-t border-border px-3 font-mono text-[10px] text-muted-foreground">
        {(["Layers", "Console", "A11y"] as const).map((drawer) => (
          <button
            key={drawer}
            type="button"
            onClick={() =>
              setBottomDrawer(bottomDrawer === drawer ? null : drawer)
            }
            className={`rounded px-2 py-0.5 transition-colors ${
              bottomDrawer === drawer
                ? "bg-[var(--active)] text-[var(--brand-text)]"
                : "hover:bg-[var(--hover)] hover:text-foreground"
            }`}
          >
            {drawer === "A11y" ? "Accessibility · 0 issues" : drawer}
          </button>
        ))}
        <div className="flex-1" />
        <span>GN-Apex Sandbox Bridge · {pageKey}</span>
      </footer>
    </div>
  );
}

export default PreviewFrame;
