// studio/src/components/gnapex-studio/shell/studio-shell.tsx
// GN-Apex Studio — frontier workspace shell.
// Layout mirrors the reference: icon rail | sidebar | (header, stage, status) | inspector.
// Every surface is a soft, translucent shadcn token. Nothing is a solid slab.
"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type {
  StudioManifest,
  TemplateRuntimeMeta,
  WorkspaceDocument,
} from "@/lib/contract";
import { store } from "@/lib/gnapex-studio/store";
import { buildVRFS } from "@/lib/gnapex-studio/vrfs-engine";
import { useAutosave } from "@/hooks/gnapex-studio/use-autosave";
import { TopBar } from "./top-bar";
import { DirectoryTree } from "./directory-tree";
import { DirectoryOverviewStage } from "../canvas/directory-overview-stage";
import { PreviewFrame } from "../canvas/preview-frame";
import { InspectorRoot } from "../inspector/inspector-root";
import { StatusBar } from "./status-bar";
import { CanvasContextMenu } from "../context-menu/context-menu";
import { CommandPalette } from "../command-palette/command-palette";
import { ShortcutsModal } from "../overlays/shortcuts-modal";
import { ActivityIconRail } from "./activity-icon-rail";
import { WorkspaceControlPanel } from "./workspace-control-panel";
import { TemplatePaletteCard } from "./design-sheets";
import { StudioWorkspaceStage } from "../canvas/studio-workspace-stage";

export interface StudioShellProps {
  projectId: string;
  manifest: StudioManifest | null;
  document: WorkspaceDocument | null;
  previewToken: string | null;
  previewOrigin: string;
  framedPageKey?: string;
  /** Compiled bundle metadata from the registered template (Model B canvas). */
  templateRuntime?: TemplateRuntimeMeta | null;
}

export function StudioShell({
  projectId,
  manifest,
  document,
  previewToken,
  previewOrigin,
  framedPageKey,
  templateRuntime,
}: StudioShellProps) {
  const activeStation = store((s) => s.activeStation);
  const stageMode = store((s) => s.stageMode);
  useAutosave(projectId, !!document);

  const vrfs = React.useMemo(
    () => (manifest && document ? buildVRFS(manifest, document) : null),
    [manifest, document],
  );

  const isPages = activeStation === "explorer";
  const isCanvas = isPages && stageMode === "CANVAS_EDIT";

  return (
    <div className="relative flex h-dvh min-h-0 select-none overflow-hidden bg-background text-[13px] text-foreground antialiased">
      {/* soft brand glow, same wash as the reference */}
      <div
        aria-hidden
        className="studio-glow pointer-events-none absolute inset-0"
      />

      <ActivityIconRail />

      {isPages ? (
        <PagesSidebar
          manifest={manifest}
          projectId={projectId}
        />
      ) : (
        <WorkspaceControlPanel station={activeStation} manifest={manifest} />
      )}

      <div className="relative z-0 flex min-w-0 flex-1 flex-col">
        <TopBar manifest={manifest} />

        <div className="flex min-h-0 flex-1">
          <main className="relative min-w-0 flex-1 overflow-hidden">
            {isPages && stageMode === "DIRECTORY_OVERVIEW" ? (
              manifest && document ? (
                <DirectoryOverviewStage
                  manifest={manifest}
                  document={document}
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="size-5 animate-spin rounded-full border-2 border-border border-t-[var(--brand-text)]" />
                    <p className="text-[12px]">Loading workspace…</p>
                  </div>
                </div>
              )
            ) : isCanvas ? (
              <div className="relative flex h-full min-h-0 flex-col">
                <PreviewFrame
                  projectId={projectId}
                  pageKey={framedPageKey ?? ""}
                  previewToken={previewToken}
                  resolvedOrigin={previewOrigin}
                  templateRuntime={templateRuntime}
                />
              </div>
            ) : (
              <StudioWorkspaceStage
                station={activeStation}
                manifest={manifest}
                document={document}
                vrfs={vrfs}
              />
            )}
          </main>

          {isCanvas && (
            <aside className="studio-glass studio-scroll relative z-10 hidden min-h-0 w-[300px] shrink-0 flex-col overflow-y-auto border-l border-border lg:flex">
              <InspectorRoot />
            </aside>
          )}
        </div>

        <StatusBar />
      </div>

      <CanvasContextMenu />
      <CommandPaletteLauncher />
      <ShortcutsModalLauncher />
    </div>
  );
}

/* ── Pages sidebar: header + filter + tree + footer stats ─────────────────── */

function PagesSidebar({
  manifest,
  projectId,
}: {
  manifest: StudioManifest | null;
  projectId: string;
}) {
  const [filter, setFilter] = useState("");

  if (!manifest) return <aside className="w-[264px] shrink-0" />;

  const pageCount = manifest.pageCatalog.length;
  const folderCount = new Set(
    manifest.pageCatalog
      .flatMap((p) =>
        p.defaultPath ? p.defaultPath.split("/").slice(1, -1) : [],
      )
      .filter(Boolean),
  ).size;

  return (
    <aside className="studio-glass relative z-10 flex min-h-0 w-[264px] shrink-0 flex-col overflow-hidden">
      {/* Header: title + quick actions */}
      <div className="px-3 pb-2 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <b className="text-[13px] font-semibold text-foreground">Pages</b>
          <button
            type="button"
            title="New page"
            onClick={() =>
              toast.info(
                "Page authoring arrives with the route contract writer",
              )
            }
            className="studio-action !min-h-0 !rounded-lg !px-2 !py-1 !text-[11px]"
          >
            <Plus className="size-3" />
          </button>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="studio-soft-input !text-xs"
          placeholder="Filter routes…"
        />
      </div>

      {/* Tree */}
      <div className="studio-scroll flex-1 overflow-y-auto px-2 pb-3">
        <DirectoryTree manifest={manifest} filterQuery={filter} />
      </div>

      {/* Design card: the workspace's template + the two design sheets */}
      <div className="shrink-0 px-3 pb-2.5">
        <TemplatePaletteCard projectId={projectId} />
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2.5 text-[11px] text-muted-foreground">
        <span>
          {pageCount} routes · {Math.max(folderCount, 1)} groups
        </span>
        <span>Next.js App Router</span>
      </div>
    </aside>
  );
}

/* ── Canvas + palette launchers (self-keyed so ⌘K and ⌘/ keep working) ─────── */

function CommandPaletteLauncher() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  return <CommandPalette open={open} onOpenChange={setOpen} />;
}

function ShortcutsModalLauncher() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  if (!open) return null;
  return <ShortcutsModal open onClose={() => setOpen(false)} />;
}
