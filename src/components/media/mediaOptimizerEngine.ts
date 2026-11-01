//gn-apex/src/components/media/mediaOptimizerEngine.ts

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         APEX MEDIA HELPER ENGINE  v5.0                  ║
 * ║  UI Utilities · Thumbnails · Types (Compression Moved)  ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * v5.0 Note:
 * Heavy browser-native compression logic has been stripped out.
 * Optimization is now handled server-side via BullMQ, Sharp, and FFmpeg.
 * This file retains only the UI preview generators and type definitions.
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type ImageOutputFormat = "webp" | "avif" | "jpeg" | "png";
export type VideoOutputFormat = "webm" | "mp4";
export type AudioOutputFormat = "wav" | "ogg";

export interface ImageOptOptions {
  quality?: number;
  format?: ImageOutputFormat;
  maxDimension?: number;
  stripExif?: boolean;
}

export interface VideoOptOptions {
  videoBitrateKbps?: number;
  audioBitrateKbps?: number;
  maxDimension?: number;
  targetFps?: number;
  format?: VideoOutputFormat;
  keepAudio?: boolean;
  /** Studio edits (trim, frame, look, props…) for the server to apply. */
  edits?: Record<string, unknown>;
}

export interface AudioOptOptions {
  sampleRate?: number;
  channels?: 1 | 2;
  normalize?: boolean;
  lowPassHz?: number;
  format?: AudioOutputFormat;
  bitrateKbps?: number;
  /** Studio edits (trim, fades, tone…) for the server to apply. */
  edits?: Record<string, unknown>;
}

export interface UnifiedOptOptions {
  image?: ImageOptOptions;
  video?: VideoOptOptions;
  audio?: AudioOptOptions;
}

export interface OptimizationResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  savedBytes: number;
  savedPercent: number;
  outputFormat: string;
  dimensions?: { width: number; height: number };
  durationSeconds?: number;
  warnings: string[];
}

// ─────────────────────────────────────────────
// ████  THUMBNAIL GENERATOR (UI Previews) ████
// ─────────────────────────────────────────────

export async function generateThumbnail(
  file: File,
  thumbSize = 200,
): Promise<string> {
  // 1. IMAGE THUMBNAIL
  if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    const scale = thumbSize / Math.max(bitmap.width, bitmap.height);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.75);
  }

  // 2. VIDEO THUMBNAIL (Extracts frame at 10% duration)
  if (file.type.startsWith("video/")) {
    const url = URL.createObjectURL(file);
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.crossOrigin = "anonymous";

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, (video.duration || 0) * 0.1);
      };

      video.onseeked = () => {
        const scale =
          thumbSize / Math.max(video.videoWidth || 1, video.videoHeight || 1);
        const w = Math.round((video.videoWidth || 320) * scale);
        const h = Math.round((video.videoHeight || 240) * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Thumbnail extraction failed."));
      };

      video.load();
    });
  }

  // 3. AUDIO THUMBNAIL (Draws a waveform graphic)
  return generateWaveformThumbnail(file, thumbSize);
}

async function generateWaveformThumbnail(
  file: File,
  width: number,
): Promise<string> {
  const height = Math.round(width * 0.3);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  try {
    const ab = await file.arrayBuffer();
    const audioCtx = new window.AudioContext();
    const buffer = await audioCtx.decodeAudioData(ab);

    // Close context to free up memory
    if (audioCtx.state !== "closed") {
      await audioCtx.close();
    }

    const data = buffer.getChannelData(0);
    const step = Math.floor(data.length / width);
    const mid = height / 2;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#38bdf8"; // Sky blue
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      let min = 1,
        max = -1;
      for (let j = 0; j < step; j++) {
        const v = data[x * step + j] ?? 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      ctx.moveTo(x, mid + min * mid);
      ctx.lineTo(x, mid + max * mid);
    }

    ctx.stroke();
  } catch {
    // Fallback if audio cannot be decoded by the browser
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#38bdf8";
    ctx.font = `${height * 0.4}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("♪", width / 2, height * 0.7);
  }

  return canvas.toDataURL("image/jpeg", 0.8);
}

// ─────────────────────────────────────────────
// SHARED UTILITIES
// ─────────────────────────────────────────────

export function formatBytes(bytes: number, dp = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(dp)} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
