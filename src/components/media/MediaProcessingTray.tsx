// gn-apex/src/components/media/MediaProcessingTray.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CheckCircle2,
  Film,
  ImageIcon,
  Loader2,
  Music,
  X,
  XCircle,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import axios from "axios";
import apiClient from "@/lib/api";
import type {
  ImageOptOptions,
  VideoOptOptions,
  AudioOptOptions,
} from "./mediaOptimizerEngine";

// Shadcn UI Imports
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type TrayKind = "image" | "video" | "audio";
export type TrayStatus = "uploading" | "processing" | "done" | "error";

export interface TrayItem {
  id: string;
  mediaId: string | null;
  filename: string;
  kind: TrayKind;
  thumbnail: string;
  status: TrayStatus;
  progress: number;
  label: string;
  error?: string;
  addedAt: number;
  rehydrated?: boolean;
}

// ─────────────────────────────────────────────
// BACKGROUND STORAGE & ORCHESTRATION ENGINE
// ─────────────────────────────────────────────

const STORAGE_KEY = "apex:media-processing-tray:v1";
const POLL_INTERVAL_MS = 2500;

let items: TrayItem[] = [];
const listeners = new Set<() => void>();
let storeHydrated = false;
let pollingInterval: ReturnType<typeof setInterval> | null = null;

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Graceful fallback if storage is unavailable
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function loadPersisted(): TrayItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrayItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (it): it is TrayItem =>
        !!it && it.status === "processing" && !!it.mediaId,
    );
  } catch {
    return [];
  }
}

export function ensureHydrated() {
  if (storeHydrated) return;
  storeHydrated = true;
  items = loadPersisted();
  if (items.some((i) => i.status === "processing")) {
    startPolling();
  }
}

function getSnapshot() {
  return items;
}

const EMPTY_TRAY: TrayItem[] = [];

function getServerSnapshot() {
  return EMPTY_TRAY;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function trackMediaItem(input: {
  id: string;
  filename: string;
  kind: TrayKind;
  thumbnail: string;
}) {
  ensureHydrated();
  items = [
    ...items,
    {
      id: input.id,
      mediaId: null,
      filename: input.filename,
      kind: input.kind,
      thumbnail: input.thumbnail,
      status: "uploading",
      progress: 0,
      label: "Preparing upload channel...",
      addedAt: Date.now(),
    },
  ];
  emit();
}

export function updateMediaItem(id: string, patch: Partial<TrayItem>) {
  ensureHydrated();
  let changed = false;
  items = items.map((it) => {
    if (it.id !== id) return it;
    changed = true;
    return { ...it, ...patch };
  });
  if (changed) emit();
}

export function removeMediaItem(id: string) {
  ensureHydrated();
  const before = items.length;
  items = items.filter((it) => it.id !== id);
  if (items.length !== before) emit();
}

export function useMediaProcessingItems(): TrayItem[] {
  ensureHydrated();
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function guessKindFromMime(mime: string): TrayKind {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "image";
}

// ─────────────────────────────────────────────
// ENQUEUE BACKGROUND TASKS
// ─────────────────────────────────────────────

export function enqueueBackgroundUpload(
  file: File,
  kind: TrayKind,
  thumbnail: string,
  projectId?: string,
  options?: ImageOptOptions | VideoOptOptions | AudioOptOptions,
  contentId?: string,
  onSuccess?: (url: string, mediaId: string) => void, // 👈 1. ADD CALLBACK PARAMETER
) {
  ensureHydrated();
  const id = `bg-${Math.random().toString(36).slice(2, 9)}`;

  trackMediaItem({
    id,
    filename: file.name,
    kind,
    thumbnail,
  });

  void runBackgroundPipeline(
    id,
    file,
    kind,
    projectId,
    options,
    contentId,
    onSuccess, // 👈 2. PASS TO PIPELINE
  ); // 👈 2. PASS TO PIPELINE
}

async function runBackgroundPipeline(
  id: string,
  file: File,
  kind: TrayKind,
  projectId?: string,
  options?: ImageOptOptions | VideoOptOptions | AudioOptOptions,
  contentId?: string,
  onSuccess?: (url: string, mediaId: string) => void,
) {
  try {
    updateMediaItem(id, {
      progress: 5,
      label: "Requesting upload channel...",
    });

    const contentType = file.type || "application/octet-stream";

    const presignRes = await apiClient.post("/media/upload/presign", {
      filename: file.name,
      contentType,
      type: kind,
      contentId,
    });

    const { uploadUrl, fileKey, mediaId, publicUrl } = presignRes.data;

    updateMediaItem(id, {
      mediaId,
      progress: 15,
      label: "Streaming payload to edge...",
    });

    await axios.put(uploadUrl, file, {
      headers: { "Content-Type": contentType },
      onUploadProgress: (e) => {
        const rawPct = e.loaded / (e.total || 1);
        const progress = Math.round(15 + rawPct * 75);
        updateMediaItem(id, {
          progress,
          label: `Streaming: ${Math.round(rawPct * 100)}%`,
        });
      },
    });

    updateMediaItem(id, {
      progress: 95,
      label: "Enqueuing optimization...",
    });

    await apiClient.post(`/media/upload/process/${mediaId}`, {
      projectId,
      contentId,
      sourceKey: fileKey,
      filename: file.name,
      type: kind,
      options: options || {},
    });

    if (onSuccess) {
      onSuccess(publicUrl || uploadUrl.split("?")[0], mediaId);
    }

    updateMediaItem(id, {
      status: "processing",
      progress: 100,
      label: "Optimizing on server...",
    });

    void refreshMediaProcessingStatus();
    startPolling();
  } catch (error: unknown) {
    let msg = "Upload failed";
    if (axios.isAxiosError(error)) {
      const resp = error.response?.data as
        | { message?: string | string[] }
        | undefined;
      if (resp?.message) {
        msg = Array.isArray(resp.message)
          ? resp.message.join(", ")
          : resp.message;
      } else {
        msg = error.message;
      }
    } else if (error instanceof Error) {
      msg = error.message;
    }

    updateMediaItem(id, {
      status: "error",
      label: "Process failed",
      error: msg,
    });
  }
}

export async function refreshMediaProcessingStatus() {
  ensureHydrated();
  const targets = items.filter((i) => i.status === "processing" && i.mediaId);
  if (targets.length === 0) {
    stopPolling();
    return;
  }

  try {
    const ids = targets.map((i) => i.mediaId as string).join(",");
    const res = await apiClient.get("/media/status", { params: { ids } });
    const rows = res.data as Array<{
      id: string;
      status: "pending" | "done" | "error";
      error?: string;
    }>;
    const byId = new Map(rows.map((r) => [r.id, r]));

    for (const t of targets) {
      const row = byId.get(t.mediaId as string);
      if (!row) continue;
      if (row.status === "done") {
        updateMediaItem(t.id, {
          status: "done",
          progress: 100,
          label: "Optimized and deployed",
        });
      } else if (row.status === "error") {
        updateMediaItem(t.id, {
          status: "error",
          label: "Optimization failed",
          error: row.error || "The processing engine rejected this format.",
        });
      }
    }
  } catch {
    // Graceful retry on next poll tick
  }
}

function startPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(() => {
    const hasActive = items.some((i) => i.status === "processing");
    if (!hasActive) {
      stopPolling();
      return;
    }
    void refreshMediaProcessingStatus();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

async function rehydrateFromServer() {
  try {
    const res = await apiClient.get("/media/processing");
    const rows = res.data as Array<{
      id: string;
      filename: string;
      fileType: string;
      createdAt: string;
    }>;
    const known = new Set(
      items.map((i) => i.mediaId).filter((v): v is string => !!v),
    );
    const additions: TrayItem[] = rows
      .filter((r) => !known.has(r.id))
      .map((r) => ({
        id: r.id,
        mediaId: r.id,
        filename: r.filename,
        kind: guessKindFromMime(r.fileType || ""),
        thumbnail: "",
        status: "processing",
        progress: 100,
        label: "Optimizing on server...",
        addedAt: new Date(r.createdAt).getTime(),
        rehydrated: true,
      }));

    if (additions.length > 0) {
      items = [...items, ...additions];
      emit();
      startPolling();
    }
  } catch {
    // Graceful fallback
  }
}

// ─────────────────────────────────────────────
// PRESENTER RENDERING PANEL
// ─────────────────────────────────────────────

const KIND_ICON: Record<TrayKind, React.ReactNode> = {
  image: <ImageIcon size={14} className="text-violet-400" />,
  video: <Film size={14} className="text-blue-400" />,
  audio: <Music size={14} className="text-sky-400" />,
};

const EXIT_ANIM_MS = 300;
const DONE_LINGER_MS = 2600;

export function MediaProcessingTray() {
  const trayItems = useMediaProcessingItems();
  const [isExpanded, setIsExpanded] = useState(true);
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set());
  const scheduledRef = useRef<Set<string>>(new Set());
  const [prevLength, setPrevLength] = useState(trayItems.length);

  // Auto-expand the panel whenever something new joins the queue. Adjusting
  // state during render (rather than in an effect) avoids a second paint.
  if (trayItems.length !== prevLength) {
    setPrevLength(trayItems.length);
    if (trayItems.length > prevLength) setIsExpanded(true);
  }

  // Handle server rehydration on initial mount
  useEffect(() => {
    void rehydrateFromServer();
    startPolling();
    return () => stopPolling();
  }, []);

  // Monitor items transitioning to done state
  useEffect(() => {
    for (const item of trayItems) {
      if (item.status === "done" && !scheduledRef.current.has(item.id)) {
        scheduledRef.current.add(item.id);
        setTimeout(() => {
          setLeavingIds((prev) => new Set(prev).add(item.id));
          setTimeout(() => {
            removeMediaItem(item.id);
            scheduledRef.current.delete(item.id);
            setLeavingIds((prev) => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            });
          }, EXIT_ANIM_MS);
        }, DONE_LINGER_MS);
      }
    }
  }, [trayItems]);

  const dismissItem = useCallback((id: string) => {
    setLeavingIds((prev) => new Set(prev).add(id));
    setTimeout(() => removeMediaItem(id), EXIT_ANIM_MS);
  }, []);

  if (trayItems.length === 0) return null;

  const activeCount = trayItems.filter((i) => i.status !== "done").length;
  const completedCount = trayItems.filter((i) => i.status === "done").length;
  const sorted = [...trayItems].sort((a, b) => a.addedAt - b.addedAt);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-end pointer-events-none gap-2">
      {/* 1. COLLAPSED MINIMALIST STATUS PILL */}
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          className="pointer-events-auto shadow-2xl rounded-full px-4 py-5 h-auto flex items-center gap-2.5 bg-black/70 dark:bg-neutral-900/70 backdrop-blur-md hover:bg-black border border-foreground/10 text-white animate-in fade-in slide-in-from-bottom-2 duration-300"
          variant="outline"
        >
          <div className="relative">
            <Layers className="h-4 w-4 text-primary" />
            {activeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </div>
          <span className="text-xs font-semibold">
            {activeCount > 0
              ? `Processing ${activeCount} file${activeCount > 1 ? "s" : ""}`
              : `${completedCount} upload${completedCount > 1 ? "s" : ""} finished`}
          </span>
          <ChevronUp className="h-4 w-4 text-white/60 ml-1" />
        </Button>
      )}

      {/* 2. EXPANDED DETAIL VIEW (Using Shadcn Card & primitives) */}
      {isExpanded && (
        <Card className="pointer-events-auto w-88 max-w-[calc(100vw-2rem)] border-none  bg-black/80 text-white shadow-2xl backdrop-blur-xs dark:backdrop-blur-lg dark:bg-neutral-700/80 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-0! pb-1! border-b border-white/5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary shrink-0" />
              <div>
                <CardTitle className="text-xs font-bold tracking-tight">
                  Media Dispatch Center
                </CardTitle>
                <CardDescription className="text-[9px] text-white/50 font-mono tracking-wider mt-0.5">
                  {activeCount > 0
                    ? `${activeCount} ACTIVE OPERATIONS`
                    : "ALL TRANSFERS COMPLETED"}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-0!">
            <ScrollArea className="max-h-88 p-3 pt-0">
              <div className="flex flex-col gap-2">
                {sorted.map((item) => {
                  const leaving = leavingIds.has(item.id);
                  const isError = item.status === "error";
                  const isUploading = item.status === "uploading";
                  const isDone = item.status === "done";

                  return (
                    <div
                      key={item.id}
                      className={[
                        "flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 p-2.5 transition-all duration-300",
                        leaving ? "translate-x-3 scale-95 opacity-0" : "",
                      ].join(" ")}
                    >
                      {/* Image Thumbnail / Type Icon fallback */}
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                        {item.thumbnail ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            {KIND_ICON[item.kind]}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-black">
                          {isDone ? (
                            <CheckCircle2
                              size={11}
                              className="text-emerald-400"
                            />
                          ) : isError ? (
                            <XCircle size={11} className="text-red-400" />
                          ) : (
                            <Loader2
                              size={8}
                              className="animate-spin text-primary"
                            />
                          )}
                        </div>
                      </div>

                      {/* Content / Labels */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="truncate text-xs max-w-45 font-semibold text-white/90">
                            {item.filename}
                          </p>
                          <Badge
                            variant="outline"
                            className={[
                              "text-[8px] uppercase tracking-wider font-mono h-4 px-1 shrink-0 border-white/10",
                              isDone
                                ? "text-emerald-400"
                                : isError
                                  ? "text-red-400"
                                  : "text-primary",
                            ].join(" ")}
                          >
                            {item.kind}
                          </Badge>
                        </div>

                        <p
                          className={[
                            "truncate font-mono text-[9px]",
                            isError
                              ? "text-red-400"
                              : isDone
                                ? "text-emerald-400/80"
                                : "animate-pulse text-white/50",
                          ].join(" ")}
                        >
                          {isError ? item.error || item.label : item.label}
                        </p>

                        {isUploading && (
                          <Progress
                            value={item.progress}
                            className="h-1 bg-white/10"
                          />
                        )}
                      </div>

                      {/* Action trigger button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => dismissItem(item.id)}
                        className="h-6 w-6 shrink-0 rounded-full text-white/40 hover:bg-white/10 hover:text-white/80"
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
