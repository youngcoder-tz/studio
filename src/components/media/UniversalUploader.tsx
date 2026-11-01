// gn-apex/src/components/media/UniversalUploader.tsx
"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  memo,
} from "react";
import {
  CheckCircle2,
  Loader2,
  Upload,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Film,
  ImageIcon,
  RotateCcw,
  Layers,
  Plus,
  MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";

// Engine utilities
import {
  generateThumbnail,
  formatBytes,
  formatDuration,
  type UnifiedOptOptions,
  type OptimizationResult,
  type ImageOutputFormat,
  type VideoOutputFormat,
  type AudioOutputFormat,
} from "./mediaOptimizerEngine";
import { VideoStudioProvider, VideoStage, VideoInspector } from "./VideoStudio";
import { AudioStudioProvider, AudioStage, AudioInspector } from "./AudioStudio";
// Crop utilities
import { createImage } from "./cropUtils";
import {
  createEditState,
  exportCrop,
  type CropEditState,
  type CropOutputSettings,
  type RenderAssets,
} from "./cropRenderer";
import { CropStudioProvider, CropStage, CropInspector } from "./Cropstudio";

// Background processing integration
import { enqueueBackgroundUpload } from "./MediaProcessingTray";

// Shadcn/ui Components
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { MediaStudioHeader } from "./MediaStudioHeader";
import { type VideoExportSettings } from "./VideoStudio";
import { type AudioExportSettings } from "./AudioStudio";
import type { VideoEdits, AudioEdits } from "./studioEdits";

// ─────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────

type MediaKind = "image" | "video" | "audio";
type ProcessStage = "idle" | "uploading" | "done" | "error";

interface QueuedFile {
  id: string;
  file: File;
  kind: MediaKind;
  thumbnail: string;
  optimized: OptimizationResult | null;
  progress: number;
  stage: ProcessStage;
  stageLabel: string;
  error: string | null;
}

export interface UniversalUploaderProps {
  children: React.ReactNode;
  projectId?: string;
  contentId?: string;
  aspectRatio?: number;
  cropShape?: "rect" | "round" | undefined;
  onSuccess: (url: string, mediaId: string) => void;
  maxSizeMB?: number;
  accept?: MediaKind[];
  maxFiles?: number;
  isMult?: boolean;
  /** Dialog heading. Defaults to "Apex Media Engine". */
  title?: string;
  /** Small line under the heading. */
  description?: string;
  /** Burn a corner watermark into every exported image. */
  watermark?: string;
}

interface QueueItemProps {
  entry: QueuedFile;
  isActive: boolean;
  isPreview: boolean;
  onRemove: () => void;
  onRetry: () => void;
  onSelect: () => void;
}

interface OptimisationSettingsProps {
  kind: Exclude<MediaKind, "image">;
  videoMaxRes: number | "";
  setVideoMaxRes: (v: number | "") => void;
  videoBitrate: number;
  setVideoBitrate: (v: number) => void;
  audioSampleRate: number;
  setAudioSampleRate: (v: number) => void;
  audioChannels: 1 | 2;
  setAudioChannels: (v: 1 | 2) => void;
  audioNormalize: boolean;
  setAudioNormalize: (v: boolean) => void;
}

const SAMPLE_RATES = [48000, 44100, 22050, 16000];

function detectKind(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ─────────────────────────────────────────────
// AUDIO PLAYER
// ─────────────────────────────────────────────
const AudioPlayer = memo(function AudioPlayer({
  file,
  waveformSrc,
}: {
  file: File;
  waveformSrc: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => setPlaying(false);

    return () => {
      audio.pause();
      audio.src = "";
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => {});
      setPlaying(true);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted((m) => !m);
    }
  };

  const seek = (v: number[]) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = v[0];
    setCurrentTime(v[0]);
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full rounded-xl overflow-hidden bg-black/60 border border-white/10">
      <div className="relative w-full h-16 overflow-hidden">
        {waveformSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={waveformSrc}
            alt="waveform"
            className="w-full h-full object-cover opacity-70"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={20} className="text-sky-400/60" />
          </div>
        )}
        <div
          className="absolute inset-y-0 left-0 bg-sky-400/20 border-r border-sky-400/60 transition-all"
          style={{ width: `${pct}%` }}
        />
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center group"
        >
          <div className="w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
            {playing ? (
              <Pause size={12} className="text-white" />
            ) : (
              <Play size={12} className="text-white ml-0.5" />
            )}
          </div>
        </button>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-black/40">
        <button
          onClick={togglePlay}
          className="shrink-0 text-white/80 hover:text-white transition-colors"
        >
          {playing ? (
            <Pause size={14} />
          ) : (
            <Play size={14} className="ml-0.5" />
          )}
        </button>
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 1}
          step={0.1}
          onValueChange={seek}
          className="flex-1 h-1"
        />
        <span className="text-[10px] font-mono text-white/50 tabular-nums shrink-0">
          {formatDuration(currentTime)}/{formatDuration(duration)}
        </span>
        <button
          onClick={toggleMute}
          className="shrink-0 text-white/50 hover:text-white/80 transition-colors"
        >
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// VIDEO PLAYER
// ─────────────────────────────────────────────
const VideoPlayer = memo(function VideoPlayer({
  file,
  thumbnail,
}: {
  file: File;
  thumbnail: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const v = videoRef.current;
    if (v) {
      v.src = url;
      v.defaultMuted = muted;
      v.muted = muted;
    }
    return () => {
      URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.playbackRate = speed;
    }
  }, [speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.loop = loop;
    }
  }, [loop]);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.play().catch(() => {});
      setPlaying(true);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (v: number[]) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = v[0];
    setCurrentTime(v[0]);
  };

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const c = containerRef.current;
    if (!c) return;
    if (!document.fullscreenElement) {
      await c.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden bg-black border border-white/10 relative group cursor-pointer"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      style={{ aspectRatio: "16/9" }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={thumbnail}
        muted={muted}
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) =>
          setDuration((e.target as HTMLVideoElement).duration)
        }
        onTimeUpdate={(e) =>
          setCurrentTime((e.target as HTMLVideoElement).currentTime)
        }
        onEnded={() => {
          setPlaying(false);
          if (loop && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => setPlaying(false));
          }
        }}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            togglePlay();
          } else if (e.key === "ArrowRight") {
            const v = videoRef.current;
            if (v) {
              v.currentTime = Math.min(duration, v.currentTime + 5);
              setCurrentTime(v.currentTime);
            }
          } else if (e.key === "ArrowLeft") {
            const v = videoRef.current;
            if (v) {
              v.currentTime = Math.max(0, v.currentTime - 5);
              setCurrentTime(v.currentTime);
            }
          } else if (e.key === "f" || e.key === "F") {
            toggleFullscreen();
          } else if (e.key === "m" || e.key === "M") {
            toggleMute();
          }
        }}
      />
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-black/60 border border-white/30 flex items-center justify-center backdrop-blur-sm hover:bg-black/80 transition-colors">
            <Play size={20} className="text-white ml-1" />
          </div>
        </button>
      )}
      <div
        className={[
          "absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-3 pt-6 pb-2 transition-opacity duration-200",
          showControls ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 1}
          step={0.1}
          onValueChange={seek}
          className="mb-2 h-1"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="text-white/90 hover:text-white"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause size={14} />
              ) : (
                <Play size={14} className="ml-0.5" />
              )}
            </button>
            <button
              onClick={toggleMute}
              className="text-white/60 hover:text-white/90"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="bg-black/50 text-white/80 text-xs rounded px-1 py-0.5 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLoop((l) => !l);
              }}
              className={`text-xs px-2 py-0.5 rounded border ${loop ? "bg-white/20 border-white/30 text-white" : "bg-black/50 border-white/10 text-white/70"}`}
              aria-label="Toggle loop"
            >
              Loop
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/50 tabular-nums">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
            <button
              onClick={toggleFullscreen}
              className="text-white/60 hover:text-white/90"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// VIDEO / AUDIO WORKBENCH  (media left, tools right)
// ─────────────────────────────────────────────
const MediaWorkbench = memo(function MediaWorkbench({
  entry,
  settings,
}: {
  entry: QueuedFile;
  settings: OptimisationSettingsProps;
}) {
  const isVideo = entry.kind === "video";
  return (
    <div className="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_21.5rem]">
      {/* Stage */}
      <div
        className="flex min-h-80 items-center justify-center bg-neutral-950 p-5 lg:min-h-120"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      >
        <div className="w-full max-w-2xl space-y-3">
          {isVideo ? (
            <div className="w-full space-y-3">
              <VideoPlayer file={entry.file} thumbnail={entry.thumbnail} />
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-white/5 px-2 py-0.5">
                  Space: play/pause
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5">
                  ←→: seek ±5s
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5">
                  F: fullscreen
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5">
                  M: mute
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10">
                  <Music size={18} className="text-sky-400" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white/90">
                    {entry.file.name}
                  </p>
                  <p className="font-mono text-[11px] text-white/45">
                    {formatBytes(entry.file.size)}
                  </p>
                </div>
              </div>
              <AudioPlayer file={entry.file} waveformSrc={entry.thumbnail} />
            </>
          )}
        </div>
      </div>

      {/* Inspector */}
      <aside className="space-y-5 border-t border-white/8 bg-black/10 p-4 lg:border-l lg:border-t-0">
        <section className="space-y-2">
          <h4 className="text-[13px] font-semibold">File</h4>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="truncate text-right font-mono">{entry.file.name}</dd>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="text-right font-mono">
              {entry.file.type || entry.kind}
            </dd>
            <dt className="text-muted-foreground">Size</dt>
            <dd className="text-right font-mono">
              {formatBytes(entry.file.size)}
            </dd>
          </dl>
        </section>
        <OptimisationSettings
          {...settings}
          kind={isVideo ? "video" : "audio"}
        />
        <p className="rounded-xl border border-white/8 bg-white/3 p-3 text-xs text-muted-foreground">
          {isVideo
            ? "Video is re-encoded on the server with FFmpeg after you dispatch. You can keep working while it processes."
            : "Audio is optimised on the server after you dispatch. You can keep working while it processes."}
        </p>
      </aside>
    </div>
  );
});

// ─────────────────────────────────────────────
// MAIN CONTAINER
// ─────────────────────────────────────────────

export function UniversalUploader({
  children,
  projectId,
  aspectRatio,
  cropShape,
  contentId,
  onSuccess,
  maxSizeMB = 200,
  accept = ["image", "video", "audio"],
  maxFiles = 10,
  isMult = false,
  title = "Apex Media Engine",
  description,
  watermark,
}: UniversalUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLSpanElement>(null);
  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Per-image edit sessions, so switching between queue items keeps every crop.
  const editsRef = useRef<Map<string, CropEditState>>(new Map());
  const assetsRef = useRef<Map<string, RenderAssets>>(new Map());
  // Per-item video / audio studio sessions (trim, look, tone…), sent as options.edits.
  const mediaEditsRef = useRef<Map<string, VideoEdits | AudioEdits>>(new Map());

  // Optimisation parameters
  const [imageQuality, setImageQuality] = useState(0.6);
  const [imageFormat, setImageFormat] = useState<ImageOutputFormat>("webp");
  const [imageSharpen, setImageSharpen] = useState(false);
  const [imageMaxDim, setImageMaxDim] = useState<number | "">("");
  const [imageWatermark, setImageWatermark] = useState<string | undefined>(
    watermark,
  );
  const [videoMaxRes, setVideoMaxRes] = useState<number | "">(1080);
  const [videoBitrate, setVideoBitrate] = useState(1200);
  const [videoFps, setVideoFps] = useState<24 | 30 | 60>(30);
  const [videoFormat, setVideoFormat] = useState<VideoOutputFormat>("mp4");
  const [videoKeepAudio, setVideoKeepAudio] = useState(true);
  const [audioSampleRate, setAudioSampleRate] = useState(44100);
  const [audioChannels, setAudioChannels] = useState<1 | 2>(2);
  const [audioNormalize, setAudioNormalize] = useState(false);
  const [audioFormat, setAudioFormat] = useState<AudioOutputFormat>("wav");
  const [audioBitrate, setAudioBitrate] = useState(128);

  const optOptionsRef = useRef<UnifiedOptOptions>({});
  useEffect(() => {
    optOptionsRef.current = {
      image: {
        quality: Math.round(imageQuality * 100),
        format: imageFormat,
        maxDimension: imageMaxDim ? Number(imageMaxDim) : undefined,
        stripExif: true,
      },
      video: {
        videoBitrateKbps: videoBitrate,
        maxDimension: videoMaxRes ? Number(videoMaxRes) : undefined,
        targetFps: videoFps,
        format: videoFormat,
        keepAudio: videoKeepAudio,
      },
      audio: {
        sampleRate: audioSampleRate,
        channels: audioChannels,
        normalize: audioNormalize,
        format: audioFormat,
        bitrateKbps: audioBitrate,
      },
    };
  }, [
    imageQuality,
    imageFormat,
    imageMaxDim,
    videoBitrate,
    videoMaxRes,
    videoFps,
    videoFormat,
    videoKeepAudio,
    audioSampleRate,
    audioChannels,
    audioNormalize,
    audioFormat,
    audioBitrate,
  ]);

  /** The crop studio edits these; the upload pipeline reads them. */
  const cropOutput = useMemo<CropOutputSettings>(
    () => ({
      format: imageFormat,
      quality: imageQuality,
      sharpen: imageSharpen,
      maxDimension: imageMaxDim ? Number(imageMaxDim) : undefined,
      watermark: imageWatermark,
    }),
    [imageFormat, imageQuality, imageSharpen, imageMaxDim, imageWatermark],
  );

  const onOutputChange = useCallback((p: Partial<CropOutputSettings>) => {
    if (p.format !== undefined) setImageFormat(p.format);
    if (p.quality !== undefined) setImageQuality(p.quality);
    if (p.sharpen !== undefined) setImageSharpen(p.sharpen);
    if ("maxDimension" in p) setImageMaxDim(p.maxDimension ?? "");
    if ("watermark" in p) setImageWatermark(p.watermark);
  }, []);

  const activeEntry = useMemo(
    () => queue.find((q) => q.id === activeId) ?? null,
    [queue, activeId],
  );
  const previewEntry = useMemo(
    () => queue.find((q) => q.id === previewId) ?? null,
    [queue, previewId],
  );

  const getUrl = useCallback((entry: QueuedFile): string => {
    if (!objectUrlsRef.current.has(entry.id)) {
      objectUrlsRef.current.set(entry.id, URL.createObjectURL(entry.file));
    }
    return objectUrlsRef.current.get(entry.id)!;
  }, []);

  const activeUrl = useMemo<string | null>(() => {
    if (!activeEntry || activeEntry.kind !== "image") return null;
    return getUrl(activeEntry);
  }, [activeEntry, getUrl]);

  const acceptStr = useMemo(
    () =>
      accept
        .map(
          (k) => ({ image: "image/*", video: "video/*", audio: "audio/*" })[k],
        )
        .join(","),
    [accept],
  );

  const revokeUrl = useCallback((id: string) => {
    const url = objectUrlsRef.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(id);
    }
    editsRef.current.delete(id);
    assetsRef.current.delete(id);
    mediaEditsRef.current.delete(id);
  }, []);

  useEffect(() => {
    const mapRef = objectUrlsRef.current;
    return () => {
      mapRef.forEach((url) => URL.revokeObjectURL(url));
      mapRef.clear();
    };
  }, []);

  const ingestFiles = useCallback(
    async (files: File[]) => {
      const accepted = files.filter((f) => {
        const kind = detectKind(f);
        if (!kind || !accept.includes(kind)) {
          toast.error("Format rejected", { description: f.name });
          return false;
        }
        if (f.size > maxSizeMB * 1024 * 1024) {
          toast.error("Payload limits exceeded", {
            description: `${f.name} exceeds standard size limits.`,
          });
          return false;
        }
        return true;
      });

      const slots = maxFiles - queue.length;
      if (slots <= 0) {
        toast.warning("Upload allocation fully utilized.");
        return;
      }

      const batch = accepted.slice(0, slots);
      if (batch.length === 0) return;

      const entries: QueuedFile[] = await Promise.all(
        batch.map(async (file) => {
          const kind = detectKind(file)!;
          let thumbnail = "";
          try {
            thumbnail = await generateThumbnail(file, 160);
          } catch {
            // Optional preview fallback
          }
          return {
            id: uid(),
            file,
            kind,
            thumbnail,
            optimized: null,
            progress: 0,
            stage: "idle",
            stageLabel: "Ready — queued for background dispatch",
            error: null,
          };
        }),
      );

      setQueue((prev) => [...prev, ...entries]);

      const firstImage = entries.find((e) => e.kind === "image");
      if (firstImage) {
        setActiveId(firstImage.id);
        setPreviewId(null);
      } else {
        const firstMedia = entries.find(
          (e) => e.kind === "video" || e.kind === "audio",
        );
        if (firstMedia) setPreviewId(firstMedia.id);
      }
    },
    [accept, maxFiles, maxSizeMB, queue.length],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) ingestFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [ingestFiles],
  );

  const removeFromQueue = useCallback(
    (id: string) => {
      revokeUrl(id);
      setQueue((prev) => prev.filter((q) => q.id !== id));
      if (activeId === id) setActiveId(null);
      if (previewId === id) setPreviewId(null);
    },
    [revokeUrl, activeId, previewId],
  );

  const retryEntry = useCallback((entry: QueuedFile) => {
    if (entry.kind === "image") {
      setActiveId(entry.id);
      setPreviewId(null);
    } else {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === entry.id
            ? {
                ...q,
                stage: "idle",
                stageLabel: "Ready",
                error: null,
              }
            : q,
        ),
      );
    }
  }, []);

  // Stable callbacks for the crop studio (it calls onStateChange from an effect).
  const handleStateChange = useCallback(
    (s: CropEditState) => {
      if (activeId) editsRef.current.set(activeId, s);
    },
    [activeId],
  );
  const handleAssetsChange = useCallback(
    (a: RenderAssets) => {
      if (activeId) assetsRef.current.set(activeId, a);
    },
    [activeId],
  );

  // ─────────────────────────────────────────────
  // INSTANT OFF-LOAD & DISPATCH PIPELINE
  // ─────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (isUploading) return;

    const needsUpload = queue.filter(
      (q) => q.stage === "idle" || q.stage === "error",
    );
    if (needsUpload.length === 0) return;

    setIsUploading(true);

    try {
      const compiledFiles = new Map<string, File>();

      // Compile every image that was edited. When the parent fixes the frame
      // (cropShape), untouched images get the default crop too, so the field
      // always receives the shape it asked for.
      for (const entry of needsUpload) {
        if (entry.kind !== "image") continue;
        const url = getUrl(entry);
        let st = editsRef.current.get(entry.id) ?? null;
        if (!st && cropShape) {
          const img = await createImage(url);
          st = createEditState({
            src: { w: img.naturalWidth, h: img.naturalHeight },
            cropShape,
            aspectRatio,
          });
        }
        if (!st) continue;
        try {
          const result = await exportCrop(
            url,
            st,
            cropOutput,
            entry.file.name,
            assetsRef.current.get(entry.id) ?? {},
          );
          compiledFiles.set(entry.id, result.file);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Compilation aborted";
          toast.error("Processing aborted", { description: msg });
          setIsUploading(false);
          return;
        }
      }

      // Close Dialog immediately and offload all tasks to the background uploader
      for (const entry of needsUpload) {
        const fileToUse = compiledFiles.get(entry.id) ?? entry.file;
        const base = optOptionsRef.current[entry.kind];
        const edits = mediaEditsRef.current.get(entry.id);
        const opts =
          edits && base
            ? { ...base, edits: edits as unknown as Record<string, unknown> }
            : base;

        enqueueBackgroundUpload(
          fileToUse,
          entry.kind,
          entry.thumbnail,
          projectId,
          opts,
          contentId,
          (url, mediaId) => {
            onSuccess(url, mediaId);
          },
        );
      }

      // Clear layout and close dialog instantly
      queue.forEach((q) => revokeUrl(q.id));
      setQueue([]);
      setActiveId(null);
      setPreviewId(null);
    } catch (err: unknown) {
      toast.error("Pipeline initialization failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsUploading(false);
    }
  }, [
    isUploading,
    queue,
    cropShape,
    aspectRatio,
    cropOutput,
    getUrl,
    projectId,
    revokeUrl,
    onSuccess,
    contentId,
  ]);

  const hasQueue = queue.length > 0;

  const showCropStudio = activeEntry?.kind === "image" && activeUrl;
  const showVideoStudio = !showCropStudio && previewEntry?.kind === "video";
  const showAudioStudio = !showCropStudio && previewEntry?.kind === "audio";
  const showMediaPreview =
    !showCropStudio &&
    !showVideoStudio &&
    !showAudioStudio &&
    !!previewEntry &&
    (previewEntry.kind === "video" || previewEntry.kind === "audio");

  const previewUrl = useMemo<string | null>(() => {
    if (
      !previewEntry ||
      (previewEntry.kind !== "video" && previewEntry.kind !== "audio")
    )
      return null;
    return getUrl(previewEntry);
  }, [previewEntry, getUrl]);

  const onVideoExportChange = useCallback((p: Partial<VideoExportSettings>) => {
    if (p.maxRes !== undefined) setVideoMaxRes(p.maxRes);
    if (p.bitrateKbps !== undefined) setVideoBitrate(p.bitrateKbps);
    if (p.fps !== undefined) setVideoFps(p.fps);
    if (p.format !== undefined) setVideoFormat(p.format);
    if (p.keepAudio !== undefined) setVideoKeepAudio(p.keepAudio);
  }, []);

  const onAudioExportChange = useCallback((p: Partial<AudioExportSettings>) => {
    if (p.fmt !== undefined) setAudioFormat(p.fmt);
    if (p.bitrateKbps !== undefined) setAudioBitrate(p.bitrateKbps);
    if (p.ch !== undefined) setAudioChannels(p.ch);
    if (p.sr !== undefined) setAudioSampleRate(p.sr);
  }, []);

  const handlePosterCapture = useCallback(
    (dataUrl: string) => {
      if (!previewEntry) return;
      const id = previewEntry.id;
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, thumbnail: dataUrl } : q)),
      );
    },
    [previewEntry],
  );

  const closeDialog = useCallback(() => {
    queue.forEach((q) => revokeUrl(q.id));
    setQueue([]);
    setActiveId(null);
    setPreviewId(null);
  }, [queue, revokeUrl]);

  const mediaSettings: OptimisationSettingsProps = {
    kind: "video",
    videoMaxRes,
    setVideoMaxRes,
    videoBitrate,
    setVideoBitrate,
    audioSampleRate,
    setAudioSampleRate,
    audioChannels,
    setAudioChannels,
    audioNormalize,
    setAudioNormalize,
  };

  const queueBar = (
    <div className="shrink-0 z-20 border-t border-muted-foreground/30 bg-muted backdrop-blur-md p-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {queue.map((entry) => (
          <QueueItem
            key={entry.id}
            entry={entry}
            isActive={entry.id === activeId}
            isPreview={entry.id === previewId}
            onRemove={() => removeFromQueue(entry.id)}
            onRetry={() => retryEntry(entry)}
            onSelect={() => {
              if (isUploading) return;
              if (entry.kind === "image" && entry.stage === "idle") {
                setActiveId(entry.id);
                setPreviewId(null);
              } else if (entry.kind === "video" || entry.kind === "audio") {
                setPreviewId(entry.id);
                setActiveId(null);
              }
            }}
          />
        ))}
        {isMult && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || queue.length >= maxFiles}
            className="flex h-16 shrink-0 items-center justify-center gap-2 rounded-sm bg-background cursor-pointer border-dashed border px-4 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Plus size={14} />
            Add file
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <span
        ref={dropZoneRef}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (!dropZoneRef.current?.contains(e.relatedTarget as Node))
            setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          ingestFiles(Array.from(e.dataTransfer.files));
        }}
        className={`cursor-pointer inline-flex transition-all duration-200 ${isDragging ? "ring-2 ring-primary ring-offset-2 scale-[1.02]" : ""}`}
      >
        {children}
        <input
          type="file"
          accept={acceptStr}
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
      </span>

      <Dialog open={hasQueue} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="flex sm:max-h-[94dvh] h-screen max-w-screen flex-col gap-0 overflow-hidden rounded-none  bg-card p-0  backdrop-blur-md sm:max-w-5xl dark:bg-neutral-900/90">
          <MediaStudioHeader
            icon={<Layers className="h-4 w-4 text-white" />}
            title={title}
            subtitle={
              description ??
              `${queue.length} file${queue.length !== 1 ? "s" : ""} queued${
                activeEntry?.kind === "image"
                  ? ". Crop, adjust and add props on the right."
                  : ""
              }`
            }
            badge={activeEntry?.kind ?? "media"}
            onSelectTemplateFile={(f) => ingestFiles([f])}
            extraRight={
              isMult ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || queue.length >= maxFiles}
                      />
                    }
                  >
                    <Plus size={15} />
                  </TooltipTrigger>
                  <TooltipContent>Add more files</TooltipContent>
                </Tooltip>
              ) : null
            }
          />

          {/* ───────── MODAL BODY: 2-COLUMN PLAYGROUND GRID ───────── */}
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_21.5rem]">
            {/* 1. IMAGE STUDIO */}
            {showCropStudio ? (
              <CropStudioProvider
                url={activeUrl!}
                fileName={activeEntry!.file.name}
                cropShape={cropShape}
                aspectRatio={aspectRatio}
                initialState={editsRef.current.get(activeEntry!.id) ?? null}
                initialAssets={assetsRef.current.get(activeEntry!.id) ?? null}
                onStateChange={handleStateChange}
                onAssetsChange={handleAssetsChange}
                output={cropOutput}
                onOutputChange={onOutputChange}
              >
                {/* ── LEFT COLUMN: Stage Playground + Bottom Queue (NO OVERFLOW-Y) ── */}
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-950">
                  <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                    <CropStage />
                  </div>
                  {queueBar}
                </div>

                {/* ── RIGHT COLUMN: Inspector Tools (Full height, scrollable) ── */}
                <aside className="flex h-full min-h-0 flex-col border-t border-white/8 bg-black/10 lg:border-l lg:border-t-0">
                  <CropInspector />
                </aside>
              </CropStudioProvider>
            ) : showVideoStudio && previewEntry && previewUrl ? (
              /* 2. VIDEO STUDIO */
              <VideoStudioProvider
                key={previewEntry.id}
                file={previewEntry.file}
                url={previewUrl}
                thumbnail={previewEntry.thumbnail}
                initialEdits={
                  (mediaEditsRef.current.get(previewEntry.id) as VideoEdits) ??
                  null
                }
                onEditsChange={(e) =>
                  mediaEditsRef.current.set(previewEntry.id, e)
                }
                exportSettings={{
                  maxRes: videoMaxRes,
                  bitrateKbps: videoBitrate,
                  fps: videoFps,
                  format: videoFormat,
                  keepAudio: videoKeepAudio,
                }}
                onExportChange={onVideoExportChange}
                onPoster={handlePosterCapture}
              >
                {/* ── LEFT COLUMN: Video Stage (zero overflow-y) + Bottom Queue ── */}
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-950">
                  <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                    <VideoStage />
                  </div>
                  {queueBar}
                </div>

                {/* ── RIGHT COLUMN: Full-height Video Inspector ── */}
                <aside className="flex h-full min-h-0 flex-col border-t border-white/8 bg-black/10 lg:border-l lg:border-t-0">
                  <VideoInspector />
                </aside>
              </VideoStudioProvider>
            ) : showAudioStudio && previewEntry && previewUrl ? (
              /* 3. AUDIO STUDIO */
              <AudioStudioProvider
                key={previewEntry.id}
                file={previewEntry.file}
                url={previewUrl}
                initialEdits={
                  (mediaEditsRef.current.get(previewEntry.id) as AudioEdits) ??
                  null
                }
                onEditsChange={(e) =>
                  mediaEditsRef.current.set(previewEntry.id, e)
                }
                exportSettings={{
                  fmt: audioFormat,
                  bitrateKbps: audioBitrate,
                  ch: audioChannels,
                  sr: audioSampleRate,
                }}
                onExportChange={onAudioExportChange}
              >
                {/* ── LEFT COLUMN: Audio Stage (zero overflow-y) + Bottom Queue ── */}
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-950">
                  <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                    <AudioStage />
                  </div>
                  {queueBar}
                </div>

                {/* ── RIGHT COLUMN: Full-height Audio Inspector ── */}
                <aside className="flex h-full min-h-0 flex-col border-t border-muted-foreground/10 bg-muted lg:border-l lg:border-t-0">
                  <AudioInspector />
                </aside>
              </AudioStudioProvider>
            ) : (
              /* 4. FALLBACK / BLANK SELECTION */
              <>
                {/* ── LEFT COLUMN: Media View or Empty Placeholder + Bottom Queue ── */}
                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-950">
                  <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                    {showMediaPreview && previewEntry ? (
                      <MediaWorkbench
                        entry={previewEntry}
                        settings={mediaSettings}
                      />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                        <MousePointerClick className="size-6 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Pick a file below to edit it
                        </p>
                        <p className="max-w-sm text-xs text-muted-foreground">
                          Images open in the crop studio. Video and audio open
                          in their own studios with trim, look, sound and export
                          tools.
                        </p>
                      </div>
                    )}
                  </div>
                  {queueBar}
                </div>

                {/* ── RIGHT COLUMN: Fallback Settings or Empty Placeholder ── */}
                <aside className="flex h-full min-h-0 flex-col border-t border-muted-foreground/10 bg-muted lg:border-l lg:border-t-0 overflow-y-auto p-4">
                  {showMediaPreview && previewEntry ? (
                    <OptimisationSettings
                      {...mediaSettings}
                      kind={previewEntry.kind === "video" ? "video" : "audio"}
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                      No file selected
                    </div>
                  )}
                </aside>
              </>
            )}
          </div>

          <DialogFooter className="shrink-0 items-center border-t border-white/8 px-6 py-3 sm:justify-between">
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              {activeEntry?.kind === "image"
                ? "Drag to pan · scroll to zoom · the dialog closes as soon as you dispatch"
                : "Files are optimised in the background after you dispatch"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeDialog}
                disabled={isUploading}
                className="rounded-full border border-white/10 text-xs hover:bg-white/5"
              >
                Clear all
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isUploading}
                className="gap-1.5 rounded-full text-xs shadow-lg shadow-primary/20"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Staging
                  </>
                ) : (
                  <>
                    <Upload size={12} /> Dispatch ({queue.length})
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────
// QUEUE ITEM VIEW PANEL
// ─────────────────────────────────────────────

const QueueItem = memo(function QueueItem({
  entry,
  isActive,
  isPreview,
  onRemove,
  onRetry,
  onSelect,
}: QueueItemProps) {
  const isError = entry.stage === "error";
  const isIdle = entry.stage === "idle";
  const isRunning = entry.stage === "uploading";
  const isDone = entry.stage === "done";
  const selected = isActive || isPreview;

  const kindIcon: Record<MediaKind, React.ReactNode> = {
    image: <ImageIcon size={14} className="text-violet-500" />,
    video: <Film size={14} className="text-blue-500" />,
    audio: <Music size={14} className="text-sky-500" />,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex w-56 shrink-0 items-center gap-2.5 rounded-sm  p-1.5 pr-8 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 ${selected ? " bg-primary/25 " : " bg-background hover:bg-background/70"} ${entry.kind !== "image" || isIdle ? "cursor-pointer" : ""}`}
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded-md">
        {entry.thumbnail ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={entry.thumbnail}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            {kindIcon[entry.kind]}
          </div>
        )}
        {entry.thumbnail && entry.kind !== "image" && (
          <div className="absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center rounded bg-foreground/50">
            {kindIcon[entry.kind]}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-xs font-semibold text-foreground">
          {entry.file.name}
        </p>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <span>{formatBytes(entry.file.size)}</span>
          <Badge
            variant="outline"
            className="h-4 border-muted-foreground/20 px-1.5 py-0 font-mono text-[9px] uppercase"
          >
            {entry.kind}
          </Badge>
        </div>
        {isRunning && (
          <div className="space-y-0.5">
            <Progress value={entry.progress} className="h-1 bg-white/10" />
            <p className="animate-pulse truncate font-mono text-[9px] text-primary/70">
              {entry.stageLabel}
            </p>
          </div>
        )}
        {isDone && (
          <p className="truncate font-mono text-[9px] text-emerald-400">
            {entry.stageLabel}
          </p>
        )}
        {isError && (
          <p className="truncate font-mono text-[10px] text-destructive">
            {entry.error}
          </p>
        )}
      </div>

      <div className="absolute right-1.5 top-1.5 flex flex-col items-center gap-0.5">
        {isDone && <CheckCircle2 size={14} className="text-emerald-400" />}
        {isRunning && (
          <Loader2 size={14} className="animate-spin text-primary" />
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${entry.file.name}`}
                className="size-6 rounded-full text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              />
            }
          >
            <X size={12} />
          </TooltipTrigger>
          <TooltipContent>Remove</TooltipContent>
        </Tooltip>
        {isError && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Retry"
                  className="size-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                />
              }
            >
              <RotateCcw size={12} />
            </TooltipTrigger>
            <TooltipContent>Retry</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// SETTINGS (inline in the right panel, per media kind)
// ─────────────────────────────────────────────

const OptimisationSettings = memo(function OptimisationSettings(
  props: OptimisationSettingsProps,
) {
  if (props.kind === "video") {
    return (
      <fieldset className="space-y-3 text-xs">
        <legend className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
          <Film size={13} className="text-blue-400" /> Video
        </legend>
        <div className="space-y-1.5">
          <Label className="text-xs font-normal text-muted-foreground">
            Max resolution
          </Label>
          <Select
            value={String(props.videoMaxRes)}
            onValueChange={(v) => props.setVideoMaxRes(Number(v))}
          >
            <SelectTrigger className="h-9 rounded-lg border-white/10 bg-black/20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2160, 1440, 1080, 720].map((r) => (
                <SelectItem key={r} value={String(r)} className="text-xs">
                  {r}p
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label className="text-xs font-normal text-muted-foreground">
              Bitrate
            </Label>
            <span className="font-mono tabular-nums">
              {props.videoBitrate} kbps
            </span>
          </div>
          <Slider
            value={[props.videoBitrate]}
            min={500}
            max={8000}
            step={100}
            onValueChange={(v) => props.setVideoBitrate(v[0])}
            aria-label="Video bitrate"
          />
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-3 text-xs">
      <legend className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
        <Music size={13} className="text-sky-400" /> Audio
      </legend>
      <div className="space-y-1.5">
        <Label className="text-xs font-normal text-muted-foreground">
          Sample rate
        </Label>
        <Select
          value={String(props.audioSampleRate)}
          onValueChange={(v) => props.setAudioSampleRate(Number(v))}
        >
          <SelectTrigger className="h-9 rounded-lg border-white/10 bg-black/20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SAMPLE_RATES.map((r) => (
              <SelectItem key={r} value={String(r)} className="text-xs">
                {r / 1000} kHz
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-normal text-muted-foreground">
          Channels
        </Label>
        <Select
          value={String(props.audioChannels)}
          onValueChange={(v) => props.setAudioChannels(Number(v) as 1 | 2)}
        >
          <SelectTrigger className="h-9 rounded-lg border-white/10 bg-black/20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1" className="text-xs">
              Mono
            </SelectItem>
            <SelectItem value="2" className="text-xs">
              Stereo
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-normal">Normalize loudness</Label>
        <Switch
          checked={props.audioNormalize}
          onCheckedChange={props.setAudioNormalize}
          aria-label="Normalize loudness"
        />
      </div>
    </fieldset>
  );
});
