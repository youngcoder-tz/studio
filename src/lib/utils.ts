import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministic, collision-resistant instance id (the backend caps at 80 chars). */
export function newInstanceId(componentId: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().split('-')[0]
      : Math.random().toString(36).slice(2, 10);
  return `${componentId}-${random}`;
}

export function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parses a `#rrggbb` / `#rgb` string into an `{ r, g, b }` triple. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(normalized)) {
    return null;
  }
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Relatively-luminant check, used to pick readable text over a swatch. */
export function isLightColor(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const rgb = hexToRgb(value);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6;
}

/** Formats an ISO timestamp as a compact relative time. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return 'just now';
  if (abs < hour) return `${Math.round(abs / minute)}m ago`;
  if (abs < day) return `${Math.round(abs / hour)}h ago`;
  if (abs < 30 * day) return `${Math.round(abs / day)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Reads a dotted path from a nested object, e.g. `cta.label`. Returns
 * `undefined` for a missing branch rather than throwing, because the inspector
 * frequently renders a field for a prop the instance does not set yet.
 */
export function getPath(source: unknown, path: string): unknown {
  if (!path) return source;
  const segments = path.split('.');
  let cursor: unknown = source;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

/**
 * Immutably sets a dotted path. Creates intermediate objects as needed.
 * A `null` value deletes the key, which is the same convention the backend's
 * `node.updateProps` documents.
 */
export function setPath(
  source: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const segments = path.split('.');
  const next: Record<string, unknown> = { ...source };
  let cursor = next;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const existing = cursor[segment];
    const cloned =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    cursor[segment] = cloned;
    cursor = cloned;
  }

  const last = segments[segments.length - 1];
  if (value === null || value === undefined) {
    delete cursor[last];
  } else {
    cursor[last] = value;
  }
  return next;
}

/** Stable JSON stringify for change detection (key order independent). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function truncate(value: string, max = 80): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
