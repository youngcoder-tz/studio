// studio/src/components/gnapex-studio/canvas/directory-overview-stage.tsx
"use client";

import React from "react";
import { ArrowLeft, Clock, FileText, Folder } from "lucide-react";
import type { StudioManifest, WorkspaceDocument } from "@/lib/contract";
import { store } from "@/lib/gnapex-studio/store";
import {
  buildVFS,
  countFiles,
  findVfsFile,
  type VFSFolder,
  type VFSNode,
} from "@/lib/gnapex-studio/vfs";

export interface DirectoryOverviewStageProps {
  manifest: StudioManifest;
  document: WorkspaceDocument;
}

export function DirectoryOverviewStage({
  manifest,
  document: document_,
}: DirectoryOverviewStageProps) {
  const vfs = React.useMemo(
    () => buildVFS(manifest.pageCatalog),
    [manifest.pageCatalog],
  );

  // Store bindings
  const activeDirectoryId = store((s) => s.activeDirectoryId);
  const vfsPath = store((s) => s.vfsPath);
  const navToOverview = store((s) => s.navToOverview);
  const navToFolder = store((s) => s.navToFolder);
  const openFile = store((s) => s.openFile);

  // Determine current active folder based on path or activeDirectoryId
  const currentFolder = React.useMemo<VFSFolder | null>(() => {
    const targetPath =
      vfsPath.length > 0
        ? vfsPath
        : activeDirectoryId
          ? [activeDirectoryId]
          : [];

    if (targetPath.length === 0) return null;

    let curr: VFSNode = vfs.folders[targetPath[0]];
    if (!curr) return null;

    for (let i = 1; i < targetPath.length; i++) {
      if (curr.type === "folder" && curr.children[targetPath[i]]) {
        curr = curr.children[targetPath[i]];
      } else {
        return null;
      }
    }
    return curr.type === "folder" ? curr : null;
  }, [vfs, vfsPath, activeDirectoryId]);

  // Handler to go back one folder level or to the overview root
  const handleGoBack = () => {
    if (vfsPath.length > 1) {
      navToFolder(vfsPath.slice(0, -1));
    } else {
      navToOverview();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LEVEL 1: Subfolder Directory Matrix
  // ─────────────────────────────────────────────────────────────────────────────
  if (currentFolder) {
    const items = Object.values(currentFolder.children);
    const effectivePath = vfsPath.length > 0 ? vfsPath : [currentFolder.name];

    return (
      <div className="mx-auto max-w-275 p-6 md:p-8">
        {/* Subfolder Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              title="Go back"
              className="rounded-xl border border-border bg-[var(--soft)] p-2 text-foreground transition-colors hover:bg-[var(--hover)]"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold capitalize text-foreground">
                {currentFolder.label || currentFolder.name}
              </h1>
              <div className="text-xs text-muted-foreground">
                {currentFolder.description} · {countFiles(currentFolder)} pages
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-border bg-[var(--soft)] px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
              /{effectivePath.join("/")}
            </span>
          </div>
        </div>

        {/* Directory Items Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((node) => {
            const isFolder = node.type === "folder";

            return (
              <div
                key={node.id}
                onClick={() => {
                  if (isFolder) {
                    navToFolder([...effectivePath, node.name]);
                  } else {
                    openFile(effectivePath, node.id);
                  }
                }}
                className="group cursor-pointer rounded-2xl border border-border bg-[var(--soft)] p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--brand-text)]/40 hover:bg-[var(--hover)]"
              >
                {/* Visual Thumbnail */}
                <div
                  className="mb-3 grid h-24 place-items-center rounded-xl"
                  style={{
                    background: isFolder
                      ? "rgba(255, 255, 255, 0.03)"
                      : `linear-gradient(160deg, ${currentFolder.tone}22, transparent)`,
                  }}
                >
                  {isFolder ? (
                    <Folder className="size-8 text-muted-foreground group-hover:text-[var(--brand-text)]" />
                  ) : (
                    <div className="h-[72px] w-14 rounded-md border border-border bg-[var(--soft)] p-1.5 shadow-sm">
                      <div
                        className="mb-1 h-1.5 rounded-full"
                        style={{ background: `${currentFolder.tone}99` }}
                      />
                      <div className="mb-1 h-1 rounded-full bg-foreground/20" />
                      <div className="h-1 w-2/3 rounded-full bg-foreground/20" />
                    </div>
                  )}
                </div>

                {/* Node Metadata */}
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-foreground">
                    {node.label || node.name}
                  </span>
                  {isFolder ? (
                    <span className="rounded-md bg-[var(--soft)] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {countFiles(node)}
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-emerald-400">
                      live
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  {isFolder ? "Dynamic sub-route" : node.routePath}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LEVEL 0: Global Overview Matrix (All Domain Groups)
  // ─────────────────────────────────────────────────────────────────────────────
  const folderEntries = Object.entries(vfs.folders);
  const totalDirs = folderEntries.length;
  const totalPages = vfs.totalCount;
  const liveCount = Object.keys(document_?.pageLayouts ?? {}).length || 4;

  return (
    <div className="mx-auto max-w-275 p-6 md:p-8">
      {/* Overview Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Your site, by folder
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalPages} pages across {totalDirs} domain groups. Open a folder,
          then a page to edit it on the canvas.
        </p>
      </div>

      {/* KPI Cards Bar */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Pages", totalPages],
          ["Live on draft", liveCount],
          ["Contract pages", totalPages],
          ["Directories", totalDirs],
        ].map(([title, val]) => (
          <div
            key={String(title)}
            className="rounded-xl border border-border bg-[var(--soft)] p-3.5"
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              {title}
            </div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Domain Folders Grid */}
      <p className="mb-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
        Folders
      </p>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {folderEntries.map(([key, folder]) => (
          <div
            key={key}
            onClick={() => navToFolder([key])}
            className="group cursor-pointer rounded-2xl border border-border bg-[var(--soft)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--brand-text)]/40 hover:bg-[var(--hover)]"
          >
            {/* Folder Header */}
            <div className="flex items-center gap-3">
              <div
                className="grid size-11 shrink-0 place-items-center rounded-xl text-xl shadow-inner"
                style={{
                  background: `${folder.tone}22`,
                  border: `1px solid ${folder.tone}44`,
                }}
              >
                {folder.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold text-foreground">
                  {folder.label}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {folder.description}
                </div>
              </div>
            </div>

            {/* Folder Footer with Tilted 3-Card Fan Visual */}
            <div className="mt-5 flex items-center justify-between">
              <span className="rounded-lg bg-[var(--soft)] px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                {countFiles(folder)} pages
              </span>

              {/* 3-Card Fan Graphic */}
              <div className="flex -space-x-1.5" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-6 rounded border border-border shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${folder.tone}66, ${folder.tone}11)`,
                      transform: `rotate(${(i - 1) * 6}deg)`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recently Edited Table */}
      <div className="mt-10">
        <p className="mb-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          Recently edited
        </p>
        <div className="divide-y divide-border rounded-2xl border border-border bg-[var(--soft)]">
          {[
            ["auth-login", "login", "auth", "Today, 09:12"],
            ["portal-student-results", "results", "students", "Yesterday"],
            ["portal-student-fees", "fees", "students", "Mon"],
          ].map(([id, name, domain, time]) => (
            <div
              key={id}
              onClick={() => {
                const location = findVfsFile(vfs, id);
                if (location) {
                  openFile(location.folderPath, location.file.id);
                }
              }}
              className="flex cursor-pointer items-center justify-between px-4 py-2.5! text-xs text-foreground transition-colors hover:bg-[var(--soft)]"
            >
              <div className="flex items-center gap-2">
                <FileText className="size-3.5 text-[var(--brand-text)]" />
                <span className="font-medium text-foreground">{name}</span>
                <span className="text-muted-foreground">in {domain}/</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3" />
                <span>{time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Aliases for compatibility with any import statement
export const DirectoryOverview = DirectoryOverviewStage;
export default DirectoryOverviewStage;
