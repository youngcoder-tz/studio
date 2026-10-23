// studio/src/lib/palette.ts
//
// THE COLOUR ENGINE BEHIND THE SETUP PALETTE STEP.
//
// A client does not think in `borderColor: #cbd5e1`. They think "navy, warm,
// trustworthy" — so the wizard takes one brand colour and derives the whole
// token set, then lets anyone who *does* think in tokens override any single
// value. Both paths write the same ordinary design tokens the compiled portal
// already consumes; nothing here is a new backend concept.
//
// Everything is pure and hex-only. A derived value must satisfy the studio's
// mirror of the backend colour validator (`validate.ts`), which is why the
// engine never emits `color-mix()` or relative-colour syntax.

import { hexToRgb } from './utils';
import type { GlobalTokens } from './contract';

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function toHex(r: number, g: number, b: number): string {
  const part = (channel: number) =>
    Math.round(clamp(channel) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Any CSS colour the studio can reason about, normalised to `#rrggbb`. */
export function asHex(value: unknown, fallback = '#4f46e5'): string {
  const rgb = typeof value === 'string' ? hexToRgb(value) : null;
  if (!rgb) return fallback;
  return toHex(rgb.r / 255, rgb.g / 255, rgb.b / 255);
}

export function isColorToken(value: unknown): boolean {
  return typeof value === 'string' && hexToRgb(value) !== null;
}

export function hexToHsl(value: unknown): Hsl | null {
  const rgb = typeof value === 'string' ? hexToRgb(value) : null;
  if (!rgb) return null;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

export function hslToHex(hsl: Hsl): string {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = clamp(hsl.s);
  const l = clamp(hsl.l);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return toHex(r + m, g + m, b + m);
}

/** Nudge one HSL channel of a colour; missing channels are left alone. */
export function adjust(
  value: unknown,
  delta: { h?: number; s?: number; l?: number },
): string {
  const hsl = hexToHsl(value);
  if (!hsl) return asHex(value);
  return hslToHex({
    h: hsl.h + (delta.h ?? 0),
    s: clamp(hsl.s + (delta.s ?? 0)),
    l: clamp(hsl.l + (delta.l ?? 0)),
  });
}

export function mix(from: unknown, toward: unknown, amount: number): string {
  const a = hexToRgb(asHex(from));
  const b = hexToRgb(asHex(toward));
  if (!a || !b) return asHex(from);
  const t = clamp(amount);
  return toHex(
    (a.r + (b.r - a.r) * t) / 255,
    (a.g + (b.g - a.g) * t) / 255,
    (a.b + (b.b - a.b) * t) / 255,
  );
}

// ─── Contrast ────────────────────────────────────────────────────────────────

/** WCAG 2 relative luminance. */
export function luminance(value: unknown): number {
  const rgb = hexToRgb(asHex(value));
  if (!rgb) return 0;
  const channel = (raw: number) => {
    const v = raw / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a: unknown, b: unknown): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Returns `fg` pulled toward `towardDark ? black : white` until it clears
 * `min` against `background`. Bounded so a hopeless pair returns its best
 * effort rather than looping.
 */
export function makeReadable(fg: unknown, background: unknown, min = 4.5): string {
  const target = luminance(background) > 0.4 ? '#000000' : '#ffffff';
  let best = asHex(fg);
  let bestRatio = contrastRatio(best, background);
  for (let step = 0.05; step <= 1 && bestRatio < min; step += 0.05) {
    const candidate = mix(fg, target, step);
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }
  return best;
}

export type ContrastGrade = 'aaa' | 'aa' | 'large' | 'low';

export function gradeContrast(ratio: number): ContrastGrade {
  if (ratio >= 7) return 'aaa';
  if (ratio >= 4.5) return 'aa';
  if (ratio >= 3) return 'large';
  return 'low';
}

// ─── Derivation ──────────────────────────────────────────────────────────────

export type PaletteTheme = 'light' | 'dark';

export interface DeriveOptions {
  primary: string;
  secondary?: string;
  accent?: string;
  theme?: PaletteTheme;
}

/**
 * A full, self-consistent global token set from one brand colour.
 *
 * Surfaces stay near-white/near-black with the brand hue present but quiet
 * (chrome should never compete with content), and text is pushed through
 * `makeReadable` so a bright brand colour can't produce an unreadable portal.
 */
export function deriveTokens({
  primary,
  secondary,
  accent,
  theme = 'light',
}: DeriveOptions): GlobalTokens {
  const brand = asHex(primary);
  const hsl = hexToHsl(brand) ?? { h: 244, s: 0.7, l: 0.55 };
  const support = asHex(secondary ?? adjust(brand, { h: 32, l: 0.06 }), brand);
  const highlight = asHex(accent ?? support, support);
  const dark = theme === 'dark';

  const tint = (lightness: number, saturation: number) =>
    hslToHex({ h: hsl.h, s: clamp(saturation), l: lightness });

  const backgroundColor = dark ? tint(0.07, hsl.s * 0.18) : tint(0.995, hsl.s * 0.04);
  const surfaceColor = dark ? tint(0.13, hsl.s * 0.2) : tint(0.96, hsl.s * 0.1);
  const borderColor = dark ? tint(0.24, hsl.s * 0.24) : tint(0.89, hsl.s * 0.22);
  const inkBase = dark ? tint(0.95, 0.02) : tint(0.13, 0.16);
  const mutedBase = dark ? tint(0.68, 0.08) : tint(0.44, 0.1);

  return {
    theme,
    primaryColor: brand,
    secondaryColor: support,
    accentColor: highlight,
    backgroundColor,
    surfaceColor,
    borderColor,
    textColor: makeReadable(inkBase, backgroundColor, 8),
    mutedTextColor: makeReadable(mutedBase, backgroundColor, 4.5),
  };
}

/** The brand trio pulled off an existing token map, when it has one. */
export function brandFromTokens(tokens: GlobalTokens): {
  primary: string;
  secondary?: string;
  accent?: string;
  theme?: PaletteTheme;
} | null {
  const primary = tokens.primaryColor;
  if (!isColorToken(primary)) return null;
  const theme = tokens.theme === 'dark' ? 'dark' : tokens.theme === 'light' ? 'light' : undefined;
  return {
    primary: asHex(primary),
    secondary: isColorToken(tokens.secondaryColor) ? asHex(tokens.secondaryColor) : undefined,
    accent: isColorToken(tokens.accentColor) ? asHex(tokens.accentColor) : undefined,
    theme,
  };
}

export interface SeedCandidate {
  /** What the client is told the palette came from. */
  label: string;
  primary: string;
  secondary?: string;
  accent?: string;
  theme?: PaletteTheme;
  /** Higher wins when several candidates are usable. */
  weight: number;
}

/**
 * The smart part of the palette step: the template's own accent, the track's
 * tint and any colour the project already carries are all real signals. The
 * strongest usable one becomes the starting brand colour, so the client lands
 * on a palette that already matches the choice they just made.
 */
export function seedPalette(candidates: SeedCandidate[]): {
  tokens: GlobalTokens;
  source: string;
  primary: string;
} | null {
  const usable = candidates
    .filter((c) => isColorToken(c.primary))
    .sort((a, b) => b.weight - a.weight)[0];
  if (!usable) return null;
  const brand = asHex(usable.primary);
  return {
    tokens: deriveTokens({
      primary: brand,
      secondary: usable.secondary,
      accent: usable.accent,
      theme: usable.theme ?? 'light',
    }),
    source: usable.label,
    primary: brand,
  };
}

// ─── Naming ──────────────────────────────────────────────────────────────────

const HUE_NAMES: [number, string][] = [
  [12, 'Crimson'],
  [32, 'Amber'],
  [55, 'Gold'],
  [80, 'Lime'],
  [150, 'Emerald'],
  [185, 'Teal'],
  [215, 'Azure'],
  [255, 'Indigo'],
  [290, 'Violet'],
  [330, 'Magenta'],
  [360, 'Crimson'],
];

/** A human name for a brand colour, used as the palette's label. */
export function nameColor(value: unknown): string {
  const hsl = hexToHsl(value);
  if (!hsl) return 'Custom';
  const hueName = HUE_NAMES.find(([limit]) => hsl.h <= limit)?.[1] ?? 'Crimson';
  if (hsl.s < 0.12) return hsl.l > 0.6 ? 'Neutral' : 'Graphite';
  if (hsl.l > 0.78) return `Pale ${hueName}`;
  if (hsl.l < 0.24) return `Deep ${hueName}`;
  if (hsl.s > 0.8) return `Vivid ${hueName}`;
  return hueName;
}

// ─── Token groups the palette editor writes ──────────────────────────────────

export const PALETTE_COLOR_KEYS = [
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'backgroundColor',
  'surfaceColor',
  'textColor',
  'mutedTextColor',
  'borderColor',
] as const;

export const FONT_PAIRINGS: { key: string; label: string; heading: string; body: string }[] = [
  {
    key: 'geist',
    label: 'Geist / Geist',
    heading: 'Geist, system-ui, sans-serif',
    body: 'Geist, system-ui, sans-serif',
  },
  {
    key: 'bricolage',
    label: 'Bricolage / Geist',
    heading: 'Bricolage Grotesque, Georgia, serif',
    body: 'Geist, system-ui, sans-serif',
  },
  {
    key: 'editorial',
    label: 'Georgia / Georgia',
    heading: 'Georgia, Times New Roman, serif',
    body: 'Georgia, Times New Roman, serif',
  },
  {
    key: 'inter',
    label: 'Bricolage / Inter',
    heading: 'Bricolage Grotesque, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
];

export const RADIUS_OPTIONS = ['none', 'soft', 'rounded', 'pill'] as const;

export const DENSITY_OPTIONS: {
  key: string;
  label: string;
  tokens: GlobalTokens;
}[] = [
  {
    key: 'compact',
    label: 'Compact',
    tokens: { contentMaxWidth: '68rem', sectionSpacing: '3rem', gridGutter: '1rem' },
  },
  {
    key: 'balanced',
    label: 'Balanced',
    tokens: { contentMaxWidth: '76rem', sectionSpacing: '4rem', gridGutter: '1.5rem' },
  },
  {
    key: 'spacious',
    label: 'Spacious',
    tokens: { contentMaxWidth: '84rem', sectionSpacing: '5.5rem', gridGutter: '2rem' },
  },
];

/** Contrast pairs worth showing a client, in reading order. */
export const CONTRAST_CHECKS: {
  label: string;
  foreground: string;
  background: string;
}[] = [
  { label: 'Body text on page', foreground: 'textColor', background: 'backgroundColor' },
  { label: 'Muted text on page', foreground: 'mutedTextColor', background: 'backgroundColor' },
  { label: 'Text on a surface card', foreground: 'textColor', background: 'surfaceColor' },
  { label: 'Label on the primary button', foreground: 'backgroundColor', background: 'primaryColor' },
];

export function contrastReport(
  tokens: GlobalTokens,
): { label: string; ratio: number; grade: ContrastGrade }[] {
  return CONTRAST_CHECKS.map((check) => ({
    label: check.label,
    ratio: contrastRatio(tokens[check.foreground], tokens[check.background]),
    grade: gradeContrast(contrastRatio(tokens[check.foreground], tokens[check.background])),
  }));
}
