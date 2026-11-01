// studio/src/hooks/gnapex-studio/use-explorer-route.ts
//
// Pages navigation is part of the URL too:
//
//   /editor                         → Pages overview
//   /editor/auth                    → folder
//   /editor/auth/login              → file canvas
//   /editor/students/studentId/results
//
// The VFS keeps its readable tree names (`[studentId]`), while the address bar
// uses clean segments (`studentId`). Deep links, reloads, browser back/forward,
// and command-palette jumps all converge on the same store location.

"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import type { StudioManifest } from "@/lib/contract";
import { store } from "@/lib/gnapex-studio/store";
import {
  buildVFS,
  findVfsFile,
  resolveVfsSegments,
  type VFSRoot,
} from "@/lib/gnapex-studio/vfs";

function editorMarker(projectId: string): string {
  return `/studio/${projectId}/editor`;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function editorBasePath(projectId: string): string {
  if (typeof window === "undefined") return editorMarker(projectId);
  const marker = editorMarker(projectId);
  const index = window.location.pathname.indexOf(marker);
  return index >= 0
    ? window.location.pathname.slice(0, index + marker.length)
    : marker;
}

function readExplorerSegments(projectId: string): string[] {
  if (typeof window === "undefined") return [];
  const marker = editorMarker(projectId);
  const pathname = window.location.pathname;
  const index = pathname.indexOf(marker);
  if (index < 0) return [];

  return pathname
    .slice(index + marker.length)
    .split("/")
    .filter(Boolean)
    .map(safeDecode);
}

function currentHref(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function hrefForSegments(projectId: string, segments: string[]): string {
  if (typeof window === "undefined") return "";
  const encoded = segments.map(encodeURIComponent).join("/");
  return `${editorBasePath(projectId)}${encoded ? `/${encoded}` : ""}${
    window.location.search
  }${window.location.hash}`;
}

function segmentsForState(
  vfs: VFSRoot,
  vfsPath: string[],
  activeFileKey: string | null,
): string[] {
  if (activeFileKey) {
    const location = findVfsFile(vfs, activeFileKey);
    if (location) return location.urlPath;
  }

  if (vfsPath.length > 0) {
    const resolved = resolveVfsSegments(vfs, vfsPath);
    if (resolved) return resolved.urlPath;
  }

  return [];
}

export function useExplorerRoute({
  projectId,
  manifest,
  initialPath = [],
}: {
  projectId: string;
  manifest: StudioManifest | null;
  initialPath?: string[];
}) {
  const vfs = useMemo(
    () => (manifest ? buildVFS(manifest.pageCatalog) : null),
    [manifest],
  );

  // These subscriptions are triggers for the store → URL effect. The effect
  // reads the freshest store snapshot so it can never overwrite a just-restored
  // deep link with the pre-restore render values.
  const vfsPath = store((s) => s.vfsPath);
  const activeFileKey = store((s) => s.activeFileKey);

  const booted = useRef(false);

  const restore = useCallback(
    (segments: string[], normalize: boolean) => {
      if (!vfs) return;

      const resolved = resolveVfsSegments(vfs, segments);

      if (resolved?.kind === "file" && resolved.file) {
        store
          .getState()
          .restoreExplorerLocation(resolved.folderPath, resolved.file.id);
      } else if (resolved?.kind === "folder") {
        store.getState().restoreExplorerLocation(resolved.folderPath, null);
      } else {
        store.getState().restoreExplorerLocation([], null);
      }

      if (!normalize) return;

      const target = hrefForSegments(
        projectId,
        resolved?.urlPath ?? [],
      );
      if (currentHref() !== target) {
        window.history.replaceState(window.history.state, "", target);
      }
    },
    [projectId, vfs],
  );

  // Restore once the manifest (and therefore the VFS) is available. A layout
  // effect keeps the overview from painting before the deep-linked file.
  useLayoutEffect(() => {
    if (!vfs || booted.current) return;
    booted.current = true;

    const locationSegments = readExplorerSegments(projectId);
    restore(
      locationSegments.length > 0 ? locationSegments : initialPath,
      true,
    );
  }, [initialPath, projectId, restore, vfs]);

  // Store → URL. Explorer navigation creates a real history entry so browser
  // back/forward can walk folders and files. Station changes only replace the
  // query string (see useStationRoute).
  useEffect(() => {
    if (!vfs || !booted.current) return;

    const state = store.getState();
    const target = hrefForSegments(
      projectId,
      segmentsForState(vfs, state.vfsPath, state.activeFileKey),
    );
    if (currentHref() === target) return;

    window.history.pushState(window.history.state, "", target);
  }, [activeFileKey, projectId, vfs, vfsPath]);

  // URL → store for browser back/forward.
  useEffect(() => {
    if (!vfs) return;

    const onPopState = () => {
      booted.current = true;
      restore(readExplorerSegments(projectId), true);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [projectId, restore, vfs]);
}
