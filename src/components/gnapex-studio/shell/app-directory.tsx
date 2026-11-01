// studio/src/components/gnapex-studio/shell/app-directory.tsx
"use client";

import React, { useState } from "react";
import { Search, Plus } from "lucide-react";
import type { StudioManifest, WorkspaceDocument } from "@/lib/contract";
import { store } from "@/lib/gnapex-studio/store";
import { buildVFS, countFiles } from "@/lib/gnapex-studio/vfs";

const TEMPLATES = [
  {
    name: "Aurora",
    desc: "Soft glass, airy spacing",
    color: "#4f46e5",
    radius: "14px",
    tags: ["Glass", "Rounded"],
  },
  {
    name: "Campus Serif",
    desc: "Editorial, warm and readable",
    color: "#059669",
    radius: "6px",
    tags: ["Serif", "Trust"],
  },
  {
    name: "Gridline",
    desc: "Technical, dense and precise",
    color: "#7c3aed",
    radius: "3px",
    tags: ["Mono", "Dense"],
  },
];

export function AppDirectory({
  manifest,
}: {
  manifest: StudioManifest;
  document?: WorkspaceDocument;
}) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(["students", "auth", "public"]),
  );

  const vfs = React.useMemo(
    () => buildVFS(manifest.pageCatalog),
    [manifest.pageCatalog],
  );
  const activeStation = store((s) => s.activeStation);
  const activeFileKey = store((s) => s.activeFileKey);
  const vfsPath = store((s) => s.vfsPath);

  const navToOverview = store((s) => s.navToOverview);
  const navToFolder = store((s) => s.navToFolder);
  const openFile = store((s) => s.openFile);
  const setActiveSection = store((s) => s.setActiveStation);

  const tplIdx = store((s) => s.activeTemplateIndex);
  const activeTpl = TEMPLATES[tplIdx] || TEMPLATES[0];

  const toggleFolder = (folderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const isOverviewActive =
    activeStation === "explorer" && vfsPath.length === 0 && !activeFileKey;

  return (
    <aside className="flex h-full w-66 shrink-0 flex-col border-r border-border bg-transparent">
      {/* Top Header */}
      <div className="border-b border-border p-3 pb-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-foreground">Pages</span>
          <button
            type="button"
            onClick={() => navToOverview()}
            title="Overview"
            className="rounded-lg border border-border bg-[var(--soft)] px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-[var(--soft)] px-2.5 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter routes…"
            className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {/* Root Overview Entry */}
        <button
          type="button"
          onClick={() => navToOverview()}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            isOverviewActive
              ? "bg-[var(--active)] text-[var(--brand-text)]"
              : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
          }`}
        >
          <span className="text-sm">◉</span>
          <span>Overview</span>
        </button>

        <p className="mt-3 px-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
          App routes
        </p>

        {/* Hierarchical Tree Folders */}
        <div className="mt-1 space-y-0.5">
          {Object.entries(vfs.folders).map(([folderKey, folder]) => {
            const isOpen = expanded.has(folderKey);
            const isFolderSelected = vfsPath[0] === folderKey && !activeFileKey;

            return (
              <div key={folderKey}>
                <div
                  onClick={() => {
                    toggleFolder(folderKey);
                    navToFolder([folderKey]);
                  }}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                    isFolderSelected
                      ? "bg-[var(--active)] text-[var(--brand-text)]"
                      : "text-foreground hover:bg-[var(--hover)]"
                  }`}
                >
                  <span className="w-3 text-[10px] text-muted-foreground">
                    {isOpen ? "▾" : "▸"}
                  </span>
                  <span>{folder.icon}</span>
                  <span className="flex-1 truncate font-medium">
                    {folder.name}
                  </span>
                  <span className="rounded-md bg-[var(--soft)] px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                    {countFiles(folder)}
                  </span>
                </div>

                {/* Subfolder & Leaf File Children */}
                {isOpen && (
                  <div className="space-y-0.5 pl-4">
                    {Object.entries(folder.children).map(
                      ([childKey, childNode]) => {
                        if (childNode.type === "folder") {
                          const isSubOpen = expanded.has(
                            `${folderKey}/${childKey}`,
                          );
                          return (
                            <div key={childKey}>
                              <div
                                onClick={() => {
                                  toggleFolder(`${folderKey}/${childKey}`);
                                  navToFolder([folderKey, childKey]);
                                }}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-[var(--hover)]"
                              >
                                <span className="w-3 text-[10px] text-muted-foreground">
                                  {isSubOpen ? "▾" : "▸"}
                                </span>
                                <span>📁</span>
                                <span className="flex-1 truncate font-mono text-[11px]">
                                  {childNode.name}
                                </span>
                              </div>
                              {isSubOpen && (
                                <div className="space-y-0.5 pl-4">
                                  {Object.entries(childNode.children).map(
                                    ([subFileKey, subFileNode]) => {
                                      const isFileActive =
                                        activeFileKey === subFileNode.id;
                                      return (
                                        <button
                                          key={subFileKey}
                                          type="button"
                                          onClick={() =>
                                            openFile(
                                              [folderKey, childKey],
                                              subFileNode.id,
                                            )
                                          }
                                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition-colors ${
                                            isFileActive
                                              ? "bg-[var(--active)] font-medium text-[var(--brand-text)]"
                                              : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
                                          }`}
                                        >
                                          <span className="text-[10px] text-muted-foreground/70">
                                            ▫
                                          </span>
                                          <span className="truncate">
                                            {subFileNode.name}
                                          </span>
                                        </button>
                                      );
                                    },
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }

                        const isFileActive = activeFileKey === childNode.id;
                        return (
                          <button
                            key={childKey}
                            type="button"
                            onClick={() => openFile([folderKey], childNode.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition-colors ${
                              isFileActive
                                ? "bg-[var(--active)] font-medium text-[var(--brand-text)]"
                                : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
                            }`}
                          >
                            <span className="text-[10px] text-muted-foreground/70">▫</span>
                            <span className="truncate">{childNode.name}</span>
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Template Card Dock */}
      <div className="shrink-0 border-t border-border p-2.5">
        <div className="rounded-xl border border-border bg-[var(--soft)] p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-foreground">
              Template
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400">
              Active
            </span>
          </div>

          <div
            className="mb-2 h-16 w-full rounded-lg p-2"
            style={{
              background: `linear-gradient(135deg, ${activeTpl.color}33, ${activeTpl.color}0a)`,
            }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div
                className="h-1.5 w-6 rounded-full"
                style={{ background: activeTpl.color }}
              />
              <div className="h-1 w-3 rounded-full bg-[var(--soft)]0" />
            </div>
            <div className="rounded border border-border bg-black/40 p-1.5">
              <div className="mb-1 h-1 w-3/4 rounded-full bg-foreground/20" />
              <div
                className="h-2 w-8 rounded"
                style={{
                  background: activeTpl.color,
                  borderRadius: activeTpl.radius,
                }}
              />
            </div>
          </div>

          <div className="text-xs font-semibold text-foreground">
            {activeTpl.name}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            {activeTpl.desc}
          </div>

          <div className="mt-2 flex gap-1">
            <button
              type="button"
              onClick={() => setActiveSection("palette")}
              className="flex-1 rounded-lg border border-border bg-[var(--soft)] py-1 text-center text-[10px] text-foreground hover:bg-[var(--hover)]"
            >
              Tune
            </button>
            <button
              type="button"
              onClick={() => {
                // Future modal hook for template selection
              }}
              className="flex-1 rounded-lg border border-border bg-[var(--soft)] py-1 text-center text-[10px] text-foreground hover:bg-[var(--hover)]"
            >
              Switch
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
