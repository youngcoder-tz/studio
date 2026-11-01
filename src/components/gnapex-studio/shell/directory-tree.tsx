// studio/src/components/gnapex-studio/shell/directory-tree.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Lock,
  Copy,
  CopyPlus,
  FilePlus,
  FolderOpen,
  MousePointer2,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { StudioManifest, WorkspaceDocument } from "@/lib/contract";
import { store } from "@/lib/gnapex-studio/store";
import {
  buildVFS,
  countFiles,
  type VFSFolder,
  type VFSFile,
  type VFSNode,
} from "@/lib/gnapex-studio/vfs";

export interface DirectoryTreeProps {
  manifest: StudioManifest;
  document?: WorkspaceDocument;
  filterQuery?: string;
  className?: string;
}

export function DirectoryTree({
  manifest,
  filterQuery = "",
  className = "",
}: DirectoryTreeProps) {
  // Store bindings
  const vfsPath = store((s) => s.vfsPath);
  const activeFileKey = store((s) => s.activeFileKey);
  const activeDirectoryId = store((s) => s.activeDirectoryId);
  const activeStation = store((s) => s.activeStation);

  const navToOverview = store((s) => s.navToOverview);
  const navToFolder = store((s) => s.navToFolder);
  const openFile = store((s) => s.openFile);

  // Expanded folders
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set([
      "auth",
      "students",
      "public",
      "parents",
      "teachers",
      "students/[studentId]",
    ]),
  );

  // Right-Click Context Menu State
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    type: "folder" | "file";
    id: string;
    path: string[];
    routePath: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setCtxMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", esc);
    };
  }, []);

  const vfs = useMemo(
    () => buildVFS(manifest.pageCatalog),
    [manifest.pageCatalog],
  );

  const toggleFolder = (folderKey: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderKey)) next.delete(folderKey);
      else next.add(folderKey);
      return next;
    });
  };

  const isOverviewActive =
    activeStation === "explorer" &&
    vfsPath.length === 0 &&
    !activeFileKey &&
    !activeDirectoryId;

  const query = filterQuery.trim().toLowerCase();
  const nodeMatches = (node: VFSNode): boolean => {
    if (!query) return true;
    if (node.type === "file") {
      return (
        node.name.toLowerCase().includes(query) ||
        node.label.toLowerCase().includes(query) ||
        node.routePath.toLowerCase().includes(query)
      );
    }
    return (
      node.name.toLowerCase().includes(query) ||
      node.label.toLowerCase().includes(query) ||
      Object.values(node.children).some(nodeMatches)
    );
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    type: "folder" | "file",
    id: string,
    path: string[],
    routePath: string,
    name: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    let x = e.clientX;
    let y = e.clientY;
    // Keep menu in viewport bounds
    if (x + 220 > window.innerWidth) x = window.innerWidth - 230;
    if (y + 260 > window.innerHeight) y = window.innerHeight - 270;
    setCtxMenu({ x, y, type, id, path, routePath, name });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Recursive Node Renderers
  // ─────────────────────────────────────────────────────────────────────────
  const renderFolder = (
    folder: VFSFolder,
    currentPath: string[],
    depth = 0,
  ) => {
    const folderKey = currentPath.join("/");
    const isExpanded = query ? true : expanded.has(folderKey);
    const isFolderActive =
      (vfsPath.join("/") === folderKey || activeDirectoryId === folder.name) &&
      !activeFileKey;

    const children = Object.values(folder.children).filter(nodeMatches);
    if (
      query &&
      children.length === 0 &&
      !folder.label.toLowerCase().includes(query)
    ) {
      return null;
    }

    return (
      <div key={folderKey} className="flex flex-col">
        <div
          onClick={() => {
            toggleFolder(folderKey);
            navToFolder(currentPath);
          }}
          onContextMenu={(e) =>
            handleContextMenu(
              e,
              "folder",
              folderKey,
              currentPath,
              `/${folderKey}`,
              folder.name,
            )
          }
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          className={`group flex cursor-pointer items-center gap-1.5 rounded-lg py-1.5 pr-2 text-xs transition-colors ${
            isFolderActive
              ? "studio-list-row-active"
              : "text-foreground hover:bg-[var(--hover)]"
          }`}
        >
          <button
            type="button"
            onClick={(e) => toggleFolder(folderKey, e)}
            className="flex size-4 shrink-0 items-center justify-center text-muted-foreground/70 hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
          <span className="flex size-4 shrink-0 items-center justify-center text-sm">
            {depth > 0 ? (
              <Folder className="size-3.5 text-[var(--brand-text)]/80" />
            ) : (
              folder.icon || <Folder className="size-3.5 text-muted-foreground" />
            )}
          </span>
          <span className="flex-1 truncate font-medium">
            {folder.label || folder.name}
          </span>
          <span className="studio-chip !rounded-md !px-1.5 !py-0 !font-mono !text-[9px]">
            {countFiles(folder)}
          </span>
        </div>

        {isExpanded && (
          <div className="flex flex-col space-y-0.5">
            {children.map((child) => {
              if (child.type === "folder")
                return renderFolder(
                  child,
                  [...currentPath, child.name],
                  depth + 1,
                );
              return renderFile(child, currentPath, depth + 1);
            })}
          </div>
        )}
      </div>
    );
  };

  const renderFile = (file: VFSFile, parentPath: string[], depth = 0) => {
    const isFileActive = activeFileKey === file.id;

    return (
      <button
        key={file.id}
        type="button"
        onClick={() => {
          openFile(parentPath, file.id);
        }}
        onContextMenu={(e) =>
          handleContextMenu(
            e,
            "file",
            file.id,
            parentPath,
            file.routePath,
            file.name,
          )
        }
        style={{ paddingLeft: `${24 + depth * 12}px` }}
        className={`group flex w-full items-center gap-2 rounded-lg py-1 pr-2 text-left text-xs transition-colors ${
          isFileActive
            ? "studio-list-row-active font-medium"
            : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
        }`}
      >
        <FileText
          className={`size-3.5 shrink-0 transition-colors ${isFileActive ? "text-[var(--brand-text)]" : "text-muted-foreground/70 group-hover:text-foreground"}`}
        />
        <span className="flex-1 truncate">{file.name}</span>
        {file.required && (
          <span title="Contract-required route">
            <Lock className="size-2.5 text-warning/80" />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <button
        type="button"
        onClick={navToOverview}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          isOverviewActive
            ? "studio-list-row-active"
            : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
        }`}
      >
        <span className="text-sm">◉</span>
        <span>Overview</span>
      </button>

      <div className="pt-2">
        {Object.entries(vfs.folders).map(([folderKey, folder]) =>
          renderFolder(folder, [folderKey], 0),
        )}
      </div>

      {/* ── Context Menu Overlay ── */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -5 }}
            transition={{ duration: 0.12 }}
            className="studio-popover fixed z-[99999] min-w-[210px] overflow-hidden p-1.5"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 border-b border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {ctxMenu.type} · {ctxMenu.name}
            </div>

            {ctxMenu.type === "folder" ? (
              <>
                <MenuBtn
                  icon={<FolderOpen />}
                  label="Open folder overview"
                  onClick={() => {
                    navToFolder(ctxMenu.path);
                    setCtxMenu(null);
                  }}
                />
                <MenuBtn
                  icon={<FilePlus />}
                  label="New page here"
                  onClick={() => {
                    toast.success("Blank draft route created");
                    setCtxMenu(null);
                  }}
                />
                <MenuBtn
                  icon={
                    expanded.has(ctxMenu.id) ? (
                      <ChevronRight />
                    ) : (
                      <ChevronDown />
                    )
                  }
                  label={expanded.has(ctxMenu.id) ? "Collapse" : "Expand"}
                  onClick={() => {
                    toggleFolder(ctxMenu.id);
                    setCtxMenu(null);
                  }}
                />
                <div className="my-1 h-px bg-border" />
                <MenuBtn
                  icon={<Copy />}
                  label="Copy route path"
                  onClick={() => {
                    navigator.clipboard.writeText(ctxMenu.routePath);
                    toast("Route path copied to clipboard");
                    setCtxMenu(null);
                  }}
                />
                <div className="my-1 h-px bg-border" />
                <MenuBtn
                  icon={<Trash2 />}
                  label="Delete folder"
                  danger
                  onClick={() => {
                    toast.info("Contract folders cannot be deleted — they are provisioned");
                    setCtxMenu(null);
                  }}
                />
              </>
            ) : (
              <>
                <MenuBtn
                  icon={<MousePointer2 />}
                  label="Open in Studio"
                  onClick={() => {
                    openFile(ctxMenu.path, ctxMenu.id);
                    setCtxMenu(null);
                  }}
                />
                <MenuBtn
                  icon={<CopyPlus />}
                  label="Duplicate page"
                  onClick={() => {
                    toast.info("Page duplication arrives with route authoring");
                    setCtxMenu(null);
                  }}
                />
                <div className="my-1 h-px bg-border" />
                <MenuBtn
                  icon={<Copy />}
                  label="Copy route URI"
                  onClick={() => {
                    navigator.clipboard.writeText(ctxMenu.routePath);
                    toast("Route URI copied to clipboard");
                    setCtxMenu(null);
                  }}
                />
                <div className="my-1 h-px bg-border" />
                <MenuBtn
                  icon={<Trash2 />}
                  label="Delete page"
                  danger
                  onClick={() => {
                    toast.info(
                      ctxMenu.id.includes("auth-") ||
                        ctxMenu.id.startsWith("public-")
                        ? "Contract pages are protected"
                        : "Page deletion arrives with route authoring",
                    );
                    setCtxMenu(null);
                  }}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuBtn({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors ${
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
      }`}
    >
      {React.cloneElement(
        icon as React.ReactElement<{ className?: string; 'aria-hidden'?: boolean }>,
        {
          className: 'size-3.5 shrink-0',
          'aria-hidden': true,
        },
      )}
      <span className="flex-1 font-medium">{label}</span>
    </button>
  );
}

export default DirectoryTree;
