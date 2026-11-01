// studio/src/components/gnapex-studio/shell/top-bar.tsx
// Header: breadcrumb trail, search trigger, save chip, theme, shortcuts, publish.
"use client";

import React, { useState } from "react";
import { Keyboard, Loader2, Search, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";

import { publishWorkspace } from "@/lib/api/workspace";
import { store, type ActiveStation } from "@/lib/gnapex-studio/store";
import { buildVFS, findVfsFile } from "@/lib/gnapex-studio/vfs";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import type { StudioManifest } from "@/lib/contract";

const STATION_CRUMBS: Record<ActiveStation, string> = {
  explorer: "Pages",
  setups: "Setup",
  palette: "Palette",
  library: "Components",
  states: "States",
  gora: "GORA",
  assets: "Assets",
  revisions: "History",
  settings: "Studio settings",
};

export function TopBar({ manifest }: { manifest: StudioManifest | null }) {
  const meta = store((s) => s.meta);
  const activeStation = store((s) => s.activeStation);
  const vfsPath = store((s) => s.vfsPath);
  const activeFileKey = store((s) => s.activeFileKey);
  const pendingOps = store((s) => s.pendingOps);
  const document_ = store((s) => s.document);
  const navToOverview = store((s) => s.navToOverview);
  const navToFolder = store((s) => s.navToFolder);

  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  const vfs = React.useMemo(
    () => (manifest ? buildVFS(manifest.pageCatalog) : null),
    [manifest],
  );
  const activeFile = React.useMemo(
    () => (vfs && activeFileKey ? findVfsFile(vfs, activeFileKey) : null),
    [activeFileKey, vfs],
  );
  const activeFileName = activeFile?.file.name ?? activeFileKey;

  const projectName = meta?.projectName ?? manifest?.projectName ?? "Workspace";
  const saving = pendingOps.length > 0;

  const openPalette = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  };
  const openShortcuts = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", metaKey: true, bubbles: true }));
  };

  const handlePublish = async () => {
    if (!meta) return;
    setPublishing(true);
    try {
      const res = await publishWorkspace(meta.projectId, "Studio live publish");
      toast.success("Live release updated", {
        description: `Serving live revision r${res.liveRevision ?? document_?.liveRevision ?? 0}.`,
      });
      setConfirming(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred while publishing.";
      toast.error("Publish failed", { description: message });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
      {/* Breadcrumb trail */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 truncate text-[13px]">
        <span className="font-semibold text-foreground">{projectName}</span>
        <span className="text-muted-foreground/50">/</span>
        <button
          type="button"
          onClick={navToOverview}
          className="rounded px-1 text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
        >
          {STATION_CRUMBS[activeStation]}
        </button>
        {activeStation === "explorer" &&
          vfsPath.map((seg, i) => (
            <React.Fragment key={`${seg}-${i}`}>
              <span className="text-muted-foreground/50">/</span>
              <button
                type="button"
                onClick={() => navToFolder(vfsPath.slice(0, i + 1))}
                className="rounded px-1 text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
              >
                {seg}
              </button>
            </React.Fragment>
          ))}
        {activeFileName && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <b className="px-1 text-foreground">{activeFileName}</b>
          </>
        )}
      </nav>

      <div className="flex-1" />

      {/* Quick search */}
      <button
        type="button"
        onClick={openPalette}
        className="studio-action hidden !min-h-8 gap-2 md:flex"
      >
        <Search className="size-3.5 text-muted-foreground" />
        Search or jump to…
        <span className="studio-chip font-mono">⌘K</span>
      </button>

      {/* Save state chip */}
      <span className="studio-chip hidden md:inline-flex">
        <span
          className={`size-1.5 animate-pulse rounded-full ${
            saving ? "bg-warning" : "bg-success"
          }`}
        />
        {saving ? "Saving…" : `Saved · r${document_?.draftRevision ?? 0}`}
      </span>

      {/* Theme cycle: system → light → dark */}
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
        title="Toggle theme"
        className="studio-action !min-h-8 !min-w-8 !justify-center !px-0"
      >
        <span aria-hidden className="text-[13px] leading-none">
          ◐
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (⌘/)"
        onClick={openShortcuts}
        className="text-muted-foreground"
      >
        <Keyboard className="size-3.5" />
      </Button>

      <Button
        size="sm"
        onClick={() => setConfirming(true)}
        disabled={publishing}
        className="h-8 rounded-[10px] px-3.5 text-[13px] font-medium shadow-[0_8px_20px_-10px_var(--primary)] hover:brightness-110"
      >
        {publishing ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Publish
      </Button>

      {confirming ? (
        <div
          role="dialog"
          aria-label="Publish workspace"
          className="studio-popover studio-popover-lift absolute right-4 top-[52px] z-30 w-[320px] p-3.5"
        >
          <div className="flex items-start gap-2.5">
            <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary dark:text-brand-text">
              <ShieldQuestion className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold">Publish workspace</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Push the current draft to the live portal. Visitors will see these changes.
              </p>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} className="text-muted-foreground">
                  Cancel
                </Button>
                <Button size="sm" onClick={handlePublish} disabled={publishing}>
                  Publish now
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
