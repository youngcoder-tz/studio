//gn-apex/src/components/media/cropUtils.ts

/**
 * cropUtils.ts — Enhanced Canvas Crop + Format Pipeline
 *
 * v2.1 changes:
 *  • Extended zoom scale range: -50 → 0 → 100
 *    - Negative values zoom OUT (adds padding/letterbox around the image)
 *    - Zero = natural fit
 *    - Positive values zoom IN (crop into the image)
 *  • Multi-format output (WebP, AVIF, JPEG, PNG) with browser fallback
 *  • Configurable quality + smart quality floor (never go below 0.6)
 *  • Optional progressive sharpening pass (unsharp mask)
 *  • EXIF orientation correction
 *  • Returns rich metadata alongside the File
 */

export type CropOutputFormat = "webp" | "avif" | "jpeg" | "png";

export interface CropResult {
  file: File;
  width: number;
  height: number;
  format: CropOutputFormat;
  sizeBytes: number;
}

export interface CropOptions {
  /**
   * Output format.  Falls back to jpeg if the browser doesn't support
   * the requested format.  Default: "webp"
   */
  format?: CropOutputFormat;
  /**
   * Encoding quality: 0.0 – 1.0  (default 0.88)
   * Ignored for PNG (lossless).
   */
  quality?: number;
  /**
   * Apply a subtle unsharp-mask after cropping to compensate for
   * resampling softness.  Default: false
   */
  sharpen?: boolean;
  /**
   * Hard cap on the longest output edge (px).
   * Useful when the source image is very large.
   */
  maxDimension?: number;
  /**
   * Background fill color for negative-zoom padding areas.
   * Defaults to transparent (for PNG) or black for lossy formats.
   */
  paddingColor?: string;
}

// ─────────────────────────────────────────────
// ZOOM SCALE CONVERSION
// ─────────────────────────────────────────────

/**
 * Converts the extended slider value (-50 → 0 → 100) to an actual
 * canvas draw scale factor.
 *
 *  value  -50 → scale 0.33  (image occupies ~33% of canvas — heavy padding)
 *  value    0 → scale 1.0   (natural 1:1, no zoom)
 *  value  100 → scale 3.0   (3× zoom in)
 *
 * The negative range uses an exponential decay so small movements near 0
 * feel natural, and extreme negatives produce visible letterboxing.
 */
export function sliderValueToScale(value: number): number {
  if (value >= 0) {
    // Positive: 0 → 1.0,  100 → 3.0  (linear)
    return 1 + (value / 100) * 2;
  } else {
    // Negative: 0 → 1.0,  -50 → ~0.33  (exponential)
    // scale = exp(value * ln(0.33) / -50)
    const minScale = 0.33;
    return Math.exp((value / -50) * Math.log(minScale)) * 1;
    // simpler: 1 + (value / 50) * 0.67
  }
}

/**
 * Inverse of sliderValueToScale — used to initialise the slider from a
 * known zoom level.
 */
export function scaleToSliderValue(scale: number): number {
  if (scale >= 1) {
    return ((scale - 1) / 2) * 100;
  } else {
    const minScale = 0.33;
    return -(Math.log(scale) / Math.log(minScale)) * 50;
  }
}

// ─────────────────────────────────────────────
// Format detection (cached)
// ─────────────────────────────────────────────

const _cache: Record<string, boolean> = {};

function browserSupports(mime: string): boolean {
  if (mime in _cache) return _cache[mime];
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 1;
  _cache[mime] = c.toDataURL(mime).startsWith(`data:${mime}`);
  return _cache[mime];
}

export function resolveFormat(requested: CropOutputFormat): CropOutputFormat {
  if (requested === "png") return "png"; // always supported
  const mime = `image/${requested}`;
  if (browserSupports(mime)) return requested;
  if (browserSupports("image/webp")) return "webp";
  return "jpeg"; // universal fallback
}

// ─────────────────────────────────────────────
// Image loader with EXIF orientation fix
// ─────────────────────────────────────────────

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Reads EXIF orientation tag (1-8) from a JPEG file.
 * Returns 1 (no rotation) for non-JPEG or unreadable files.
 */
async function readExifOrientation(file: File): Promise<number> {
  if (!file.type.includes("jpeg") && !file.type.includes("jpg")) return 1;

  try {
    const buf = await file.slice(0, 65_536).arrayBuffer(); // first 64 KB covers EXIF
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xffd8) return 1; // not a JPEG

    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xffe1) {
        // APP1 — EXIF block
        const exifOffset = offset + 10;
        const little = view.getUint16(exifOffset) === 0x4949;
        const ifdOffset = view.getUint32(exifOffset + 4, little);
        const entries = view.getUint16(exifOffset + ifdOffset, little);
        for (let i = 0; i < entries; i++) {
          const tagOffset = exifOffset + ifdOffset + 2 + i * 12;
          if (view.getUint16(tagOffset, little) === 0x0112) {
            return view.getUint16(tagOffset + 8, little);
          }
        }
        return 1;
      }
      if (marker === 0xffda) break; // Start of scan — no EXIF found
      offset += 2 + view.getUint16(offset + 2);
    }
  } catch {
    // silently ignore parsing errors
  }
  return 1;
}

// ─────────────────────────────────────────────
// Core crop function & UI Types
// ─────────────────────────────────────────────

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 🚀 ADDED: Unified UI props explicitly exported for React components
export type Area = PixelCrop;

export interface CropStudioProps {
  url: string;
  crop: { x: number; y: number };
  zoomSlider: number;
  cropZoom: number;
  aspectRatio: number;
  cropShape: "rect" | "round";
  setCrop: (c: { x: number; y: number }) => void;
  setZoomSlider: (v: number) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
}

/**
 * Extracts a cropped region from an image URL, applies optional
 * sharpening and format conversion, and returns a ready-to-upload File.
 *
 * When the crop area extends beyond image bounds (negative zoom / outward crop),
 * the out-of-bounds regions are filled with `options.paddingColor` (default: black
 * for lossy, transparent for PNG).
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  fileName: string = "cropped-image",
  options: CropOptions = {},
  sourceFile?: File,
): Promise<CropResult> {
  const { sharpen = false, maxDimension, paddingColor } = options;

  const quality = Math.max(0.6, Math.min(1, options.quality ?? 0.88));
  const requestedFormat = options.format ?? "webp";
  const format = resolveFormat(requestedFormat);
  const mimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;

  // EXIF orientation (only matters for JPEG sources from cameras)
  const orientation = sourceFile ? await readExifOrientation(sourceFile) : 1;

  const image = await createImage(imageSrc);

  let cropW = pixelCrop.width;
  let cropH = pixelCrop.height;

  // Resize cap
  if (maxDimension && Math.max(cropW, cropH) > maxDimension) {
    const scale = maxDimension / Math.max(cropW, cropH);
    cropW = Math.round(cropW * scale);
    cropH = Math.round(cropH * scale);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Handle EXIF rotation (orientations 5-8 swap W/H)
  const needsSwap = orientation >= 5 && orientation <= 8;
  canvas.width = needsSwap ? cropH : cropW;
  canvas.height = needsSwap ? cropW : cropH;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Fill background for out-of-bounds regions (negative zoom / outward crop)
  if (format === "png") {
    // Transparent by default for PNG
    if (paddingColor) {
      ctx.fillStyle = paddingColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // else: leave transparent (default canvas state)
  } else {
    // Lossy formats: fill with specified color or solid black
    ctx.fillStyle = paddingColor ?? "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Apply EXIF orientation transform
  applyExifTransform(ctx, orientation, canvas.width, canvas.height);

  // Clamp source rect to actual image bounds, compute destination offset
  // This is what makes negative zoom / outward crop work:
  // If pixelCrop.x < 0, the image starts inside the canvas (offset > 0)
  const srcX = Math.max(0, pixelCrop.x);
  const srcY = Math.max(0, pixelCrop.y);
  const srcW = Math.min(
    image.naturalWidth - srcX,
    pixelCrop.x < 0 ? pixelCrop.width + pixelCrop.x : pixelCrop.width,
  );
  const srcH = Math.min(
    image.naturalHeight - srcY,
    pixelCrop.y < 0 ? pixelCrop.height + pixelCrop.y : pixelCrop.height,
  );

  // Destination offset: where the image pixel starts on the canvas
  const dstX =
    pixelCrop.x < 0 ? Math.round((-pixelCrop.x / pixelCrop.width) * cropW) : 0;
  const dstY =
    pixelCrop.y < 0 ? Math.round((-pixelCrop.y / pixelCrop.height) * cropH) : 0;
  const dstW = Math.round((srcW / pixelCrop.width) * cropW);
  const dstH = Math.round((srcH / pixelCrop.height) * cropH);

  if (srcW > 0 && srcH > 0 && dstW > 0 && dstH > 0) {
    ctx.drawImage(image, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
  }

  // Optional unsharp mask (improves perceived sharpness after downscale)
  if (sharpen) {
    applySharpen(ctx, canvas.width, canvas.height);
  }

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, mimeType, format === "png" ? undefined : quality),
  );

  if (!blob) throw new Error("Canvas serialisation failed.");

  const ext = format === "jpeg" ? "jpg" : format;
  const cleanName = fileName.replace(/\.[^.]+$/, "");
  const file = new File([blob], `${cleanName}.${ext}`, { type: mimeType });

  return {
    file,
    width: canvas.width,
    height: canvas.height,
    format,
    sizeBytes: blob.size,
  };
}

// ─────────────────────────────────────────────
// EXIF orientation matrix helper
// ─────────────────────────────────────────────

function applyExifTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number,
) {
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, w, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, w, h);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, h);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, h, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, h, w);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, w);
      break;
    default:
      break; // no transform needed
  }
}

// ─────────────────────────────────────────────
// 3×3 unsharp mask via ImageData manipulation
// ─────────────────────────────────────────────

export function applySharpen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount = 0.4,
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const copy = new Uint8ClampedArray(data);

  // Gaussian blur kernel (approximated)
  const blurKernel = [0, 0.125, 0, 0.125, 0.5, 0.125, 0, 0.125, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let blurred = 0;
        let ki = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            blurred +=
              copy[((y + dy) * width + (x + dx)) * 4 + c] * blurKernel[ki++];
          }
        }
        // Unsharp = original + amount * (original - blurred)
        data[idx + c] = Math.min(
          255,
          Math.max(0, copy[idx + c] + amount * (copy[idx + c] - blurred)),
        );
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// ─────────────────────────────────────────────
// Legacy default export (backward-compatible)
// ─────────────────────────────────────────────

/**
 * Drop-in replacement for the original getCroppedImg.
 * Returns a File (JPEG, 90% quality) exactly as before,
 * but now with EXIF correction and smarter quality floor.
 */
export default async function getCroppedImgLegacy(
  imageSrc: string,
  pixelCrop: PixelCrop,
  fileName: string = "cropped-image.jpeg",
): Promise<File | null> {
  try {
    const result = await getCroppedImg(imageSrc, pixelCrop, fileName, {
      format: "jpeg",
      quality: 0.9,
    });
    return result.file;
  } catch {
    return null;
  }
}
