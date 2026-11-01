// gn-apex/src/components/media/mediaPresets.ts
// ─────────────────────────────────────────────────────────────────────────────
// APEX MEDIA STUDIO — Preset, filter, background, accent & AI-template
// catalogue. This is the single source of truth that drives the studio UI.
//
// Everything here is *pure data* so it can be consumed by the canvas, the
// inspector, the mini-preview frames and the uploader without side effects.
// ─────────────────────────────────────────────────────────────────────────────

export type MediaVariant =
  | "avatar"
  | "logo"
  | "banner"
  | "post"
  | "story"
  | "cover"
  | "thumbnail"
  | "favicon"
  | "product"
  | "free";

export type MediaCategory =
  | "identity"
  | "social"
  | "web"
  | "print"
  | "creative";

export interface MediaPreset {
  id: string;
  label: string;
  sub: string;
  variant: MediaVariant;
  category: MediaCategory;
  /** undefined = free-form (user drags the frame) */
  aspectRatio?: number;
  cropShape?: "rect" | "round";
  frameW: number;
  frameH: number;
  /** Letterbox fill. "transparent" reveals the checkerboard / alpha. */
  paddingColor?: string;
  /** Allows zooming below 100% (negative zoom → letterbox). */
  allowNegativeZoom?: boolean;
  /** Suggested starting zoom multiplier. */
  initialZoom?: number;
  emoji?: string;
  /** lucide-react icon name (resolved by the UI). Purely decorative. */
  accent?: AccentKey;
}

// ─────────────────────────────────────────────
// ACCENTS — consistent colour language across the studio
// ─────────────────────────────────────────────

export type AccentKey =
  | "cyan"
  | "violet"
  | "amber"
  | "rose"
  | "emerald"
  | "sky";

export interface AccentTokens {
  /** raw hex used by canvas / swatches */
  hex: string;
  /** tailwind text colour */
  text: string;
  /** tailwind bg (soft) */
  soft: string;
  /** tailwind border */
  border: string;
  /** ambient glow shadow */
  glow: string;
  /** gradient used for AI cards / headers */
  gradient: string;
  /** ring colour */
  ring: string;
}

export const ACCENTS: Record<AccentKey, AccentTokens> = {
  cyan: {
    hex: "#22d3ee",
    text: "text-cyan-300",
    soft: "bg-cyan-400/10",
    border: "border-cyan-400/30",
    glow: "shadow-[0_0_40px_-12px_#22d3ee]",
    gradient: "from-cyan-400/25 via-sky-400/10 to-transparent",
    ring: "ring-cyan-400/40",
  },
  violet: {
    hex: "#a855f7",
    text: "text-violet-300",
    soft: "bg-violet-500/10",
    border: "border-violet-400/30",
    glow: "shadow-[0_0_40px_-12px_#a855f7]",
    gradient: "from-violet-500/25 via-fuchsia-500/10 to-transparent",
    ring: "ring-violet-400/40",
  },
  amber: {
    hex: "#f59e0b",
    text: "text-amber-300",
    soft: "bg-amber-400/10",
    border: "border-amber-400/30",
    glow: "shadow-[0_0_40px_-12px_#f59e0b]",
    gradient: "from-amber-400/25 via-orange-400/10 to-transparent",
    ring: "ring-amber-400/40",
  },
  rose: {
    hex: "#fb7185",
    text: "text-rose-300",
    soft: "bg-rose-400/10",
    border: "border-rose-400/30",
    glow: "shadow-[0_0_40px_-12px_#fb7185]",
    gradient: "from-rose-400/25 via-pink-400/10 to-transparent",
    ring: "ring-rose-400/40",
  },
  emerald: {
    hex: "#34d399",
    text: "text-emerald-300",
    soft: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    glow: "shadow-[0_0_40px_-12px_#34d399]",
    gradient: "from-emerald-400/25 via-teal-400/10 to-transparent",
    ring: "ring-emerald-400/40",
  },
  sky: {
    hex: "#38bdf8",
    text: "text-sky-300",
    soft: "bg-sky-400/10",
    border: "border-sky-400/30",
    glow: "shadow-[0_0_40px_-12px_#38bdf8]",
    gradient: "from-sky-400/25 via-blue-400/10 to-transparent",
    ring: "ring-sky-400/40",
  },
};

export function accent(key: AccentKey | undefined): AccentTokens {
  return ACCENTS[key ?? "cyan"];
}

// ─────────────────────────────────────────────
// PRESET CATALOGUE
// ─────────────────────────────────────────────

export const MEDIA_PRESETS: MediaPreset[] = [
  {
    id: "avatar-round",
    label: "Avatar · Round",
    sub: "1:1 · 512px",
    variant: "avatar",
    category: "identity",
    aspectRatio: 1,
    cropShape: "round",
    frameW: 320,
    frameH: 320,
    emoji: "🙂",
    accent: "violet",
  },
  {
    id: "avatar-square",
    label: "Avatar · Square",
    sub: "1:1 · rounded",
    variant: "avatar",
    category: "identity",
    aspectRatio: 1,
    cropShape: "rect",
    frameW: 320,
    frameH: 320,
    emoji: "🟪",
    accent: "violet",
  },
  {
    id: "logo-square",
    label: "Logo · Square",
    sub: "1:1 transparent",
    variant: "logo",
    category: "identity",
    aspectRatio: 1,
    cropShape: "rect",
    frameW: 320,
    frameH: 320,
    paddingColor: "transparent",
    allowNegativeZoom: true,
    emoji: "⬛",
    accent: "cyan",
  },
  {
    id: "logo-wide",
    label: "Logo · Wide",
    sub: "3:1 letterbox",
    variant: "logo",
    category: "identity",
    aspectRatio: 3,
    cropShape: "rect",
    frameW: 360,
    frameH: 120,
    paddingColor: "transparent",
    allowNegativeZoom: true,
    emoji: "↔️",
    accent: "cyan",
  },
  {
    id: "favicon",
    label: "Favicon",
    sub: "1:1 · 64px",
    variant: "favicon",
    category: "web",
    aspectRatio: 1,
    cropShape: "rect",
    frameW: 280,
    frameH: 280,
    paddingColor: "transparent",
    allowNegativeZoom: true,
    emoji: "🔖",
    accent: "amber",
  },
  {
    id: "banner",
    label: "Banner",
    sub: "21:9 cinematic",
    variant: "banner",
    category: "web",
    aspectRatio: 21 / 9,
    cropShape: "rect",
    frameW: 440,
    frameH: 189,
    emoji: "🌄",
    accent: "amber",
  },
  {
    id: "cover-16-9",
    label: "Cover · 16:9",
    sub: "hero / youtube",
    variant: "cover",
    category: "web",
    aspectRatio: 16 / 9,
    cropShape: "rect",
    frameW: 420,
    frameH: 236,
    emoji: "🖼️",
    accent: "sky",
  },
  {
    id: "thumbnail",
    label: "Thumbnail",
    sub: "16:9 · video",
    variant: "thumbnail",
    category: "social",
    aspectRatio: 16 / 9,
    cropShape: "rect",
    frameW: 380,
    frameH: 214,
    emoji: "▶️",
    accent: "rose",
  },
  {
    id: "post-square",
    label: "Post · 1:1",
    sub: "instagram feed",
    variant: "post",
    category: "social",
    aspectRatio: 1,
    cropShape: "rect",
    frameW: 320,
    frameH: 320,
    emoji: "📸",
    accent: "rose",
  },
  {
    id: "post-portrait",
    label: "Post · 4:5",
    sub: "instagram portrait",
    variant: "post",
    category: "social",
    aspectRatio: 4 / 5,
    cropShape: "rect",
    frameW: 280,
    frameH: 350,
    emoji: "🖼️",
    accent: "rose",
  },
  {
    id: "story",
    label: "Story · 9:16",
    sub: "reels / tiktok",
    variant: "story",
    category: "social",
    aspectRatio: 9 / 16,
    cropShape: "rect",
    frameW: 225,
    frameH: 400,
    emoji: "📱",
    accent: "violet",
  },
  {
    id: "product",
    label: "Product",
    sub: "1:1 studio",
    variant: "product",
    category: "creative",
    aspectRatio: 1,
    cropShape: "rect",
    frameW: 320,
    frameH: 320,
    paddingColor: "#0b0b0f",
    allowNegativeZoom: true,
    emoji: "🧊",
    accent: "emerald",
  },
  {
    id: "print-photo",
    label: "Print · 3:2",
    sub: "classic photo",
    variant: "free",
    category: "print",
    aspectRatio: 3 / 2,
    cropShape: "rect",
    frameW: 360,
    frameH: 240,
    emoji: "📷",
    accent: "amber",
  },
  {
    id: "free",
    label: "Freeform",
    sub: "drag any corner",
    variant: "free",
    category: "creative",
    aspectRatio: undefined,
    cropShape: "rect",
    frameW: 340,
    frameH: 340,
    allowNegativeZoom: true,
    emoji: "⤢",
    accent: "cyan",
  },
];

export function getPresetById(id: string | undefined): MediaPreset | undefined {
  if (!id) return undefined;
  return MEDIA_PRESETS.find((p) => p.id === id);
}

export function presetForVariant(
  variant: MediaVariant | undefined,
): MediaPreset | undefined {
  if (!variant || variant === "free") return undefined;
  return MEDIA_PRESETS.find((p) => p.variant === variant);
}

export function presetsForVariant(
  variant: MediaVariant | undefined,
  allowed?: string[],
): MediaPreset[] {
  let list = MEDIA_PRESETS;
  if (allowed && allowed.length) {
    list = list.filter((p) => allowed.includes(p.id));
  }
  if (variant && variant !== "free") {
    const scoped = list.filter((p) => p.variant === variant);
    if (scoped.length) return scoped;
  }
  return list;
}

// ─────────────────────────────────────────────
// ASPECT RATIOS
// ─────────────────────────────────────────────

export interface AspectOption {
  id: string;
  label: string;
  value: number | undefined;
  hint?: string;
}

export const ASPECT_OPTIONS: AspectOption[] = [
  { id: "free", label: "Free", value: undefined, hint: "unlocked" },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "3:4", label: "3:4", value: 3 / 4 },
  { id: "2:3", label: "2:3", value: 2 / 3 },
  { id: "5:4", label: "5:4", value: 5 / 4 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "21:9", label: "21:9", value: 21 / 9 },
  { id: "3:1", label: "3:1", value: 3 },
];

// ─────────────────────────────────────────────
// FILTER PRESETS — CSS filter graphs, baked at export via ctx.filter
// ─────────────────────────────────────────────

export interface FilterPreset {
  id: string;
  label: string;
  css: string;
  emoji: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "none", label: "Original", css: "", emoji: "◻️" },
  {
    id: "nocturne",
    label: "Nocturne",
    css: "contrast(1.12) saturate(0.85) brightness(0.94) hue-rotate(-8deg)",
    emoji: "🌙",
  },
  {
    id: "golden",
    label: "Golden Hour",
    css: "sepia(0.22) saturate(1.25) brightness(1.06) contrast(1.05)",
    emoji: "🌅",
  },
  {
    id: "noir",
    label: "Mono Noir",
    css: "grayscale(1) contrast(1.25) brightness(0.98)",
    emoji: "🖤",
  },
  {
    id: "cyber",
    label: "Cyberpunk",
    css: "saturate(1.6) contrast(1.15) hue-rotate(-18deg)",
    emoji: "🌆",
  },
  {
    id: "pastel",
    label: "Pastel",
    css: "saturate(0.8) brightness(1.12) contrast(0.92)",
    emoji: "🍭",
  },
  {
    id: "film",
    label: "Analog Film",
    css: "sepia(0.12) saturate(1.1) contrast(1.08) brightness(1.02)",
    emoji: "🎞️",
  },
  {
    id: "arctic",
    label: "Arctic",
    css: "brightness(1.05) saturate(0.9) hue-rotate(8deg) contrast(1.04)",
    emoji: "❄️",
  },
  {
    id: "ember",
    label: "Ember",
    css: "saturate(1.35) contrast(1.1) hue-rotate(-12deg) brightness(1.02)",
    emoji: "🔥",
  },
  {
    id: "dream",
    label: "Dreamscape",
    css: "blur(0.4px) brightness(1.08) saturate(1.15) contrast(0.96)",
    emoji: "💭",
  },
];

// ─────────────────────────────────────────────
// BACKGROUND / LETTERBOX FILLS (negative-zoom padding)
// ─────────────────────────────────────────────

export interface BackgroundPreset {
  id: string;
  label: string;
  /** CSS colour used both in preview + canvas fillStyle. */
  value: string;
  /** checks toggle the checkerboard treatment for transparency */
  checker?: boolean;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "transparent",
    label: "Transparent",
    value: "transparent",
    checker: true,
  },
  { id: "void", label: "Void", value: "#050506" },
  { id: "ink", label: "Ink", value: "#0b0b0f" },
  { id: "slate", label: "Slate", value: "#334155" },
  { id: "white", label: "White", value: "#ffffff" },
  { id: "cyan", label: "Cyan", value: "#22d3ee" },
  { id: "violet", label: "Violet", value: "#a855f7" },
  { id: "rose", label: "Rose", value: "#fb7185" },
  { id: "emerald", label: "Emerald", value: "#34d399" },
  { id: "amber", label: "Amber", value: "#f59e0b" },
];

// ─────────────────────────────────────────────
// AI TEMPLATES — generative "looks".
//
// Real generation is out of scope for the client, so each template ships a
// deterministic recipe (aspect + filter + background + zoom + a processing
// shimmer) that is *applied* to the canvas. The copy + gradient sells the
// "generated" feel while staying 100% offline & instant.
// ─────────────────────────────────────────────

export interface AiTemplate {
  id: string;
  title: string;
  prompt: string;
  gradient: string;
  ratio: string;
  tags: string[];
  /** recipe */
  aspectRatio?: number;
  cropShape?: "rect" | "round";
  filter?: string;
  background?: string;
  zoom?: number;
  accent?: AccentKey;
}

export const AI_TEMPLATES: AiTemplate[] = [
  {
    id: "ai-neon",
    title: "Neon Avatar Pack",
    prompt: "cyberpunk neon rim-light portraits, 1:1",
    gradient: "from-fuchsia-500 via-violet-500 to-cyan-400",
    ratio: "1:1",
    tags: ["portrait", "neon"],
    aspectRatio: 1,
    cropShape: "round",
    filter: "saturate(1.6) contrast(1.15) hue-rotate(-18deg)",
    background: "#0b0b1a",
    zoom: 1.1,
    accent: "violet",
  },
  {
    id: "ai-clay",
    title: "Clay Logo Mockups",
    prompt: "soft 3d clay logo on pastel pedestal",
    gradient: "from-amber-400 via-pink-400 to-rose-400",
    ratio: "1:1",
    tags: ["logo", "3d"],
    aspectRatio: 1,
    filter: "saturate(1.1) brightness(1.06) contrast(0.98)",
    background: "#fdf2f8",
    zoom: 0.92,
    accent: "amber",
  },
  {
    id: "ai-gradient",
    title: "Aurora Banners",
    prompt: "aurora mesh gradient, 21:9 hero",
    gradient: "from-violet-500 via-blue-500 to-emerald-400",
    ratio: "21:9",
    tags: ["banner", "gradient"],
    aspectRatio: 21 / 9,
    filter: "saturate(1.35) brightness(1.05) contrast(1.06)",
    background: "#05070d",
    zoom: 1,
    accent: "sky",
  },
  {
    id: "ai-story",
    title: "Story Drops",
    prompt: "bold type + grain, 9:16 editorial",
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    ratio: "9:16",
    tags: ["story", "editorial"],
    aspectRatio: 9 / 16,
    filter: "contrast(1.12) saturate(1.2) brightness(1.02)",
    background: "#04120f",
    zoom: 1.05,
    accent: "emerald",
  },
  {
    id: "ai-duotone",
    title: "Duotone Posts",
    prompt: "duotone portraits, 4:5 magazine",
    gradient: "from-orange-400 via-rose-500 to-fuchsia-500",
    ratio: "4:5",
    tags: ["duotone", "post"],
    aspectRatio: 4 / 5,
    filter: "contrast(1.25) saturate(1.5) hue-rotate(-10deg)",
    background: "#1a0b12",
    zoom: 1.02,
    accent: "rose",
  },
  {
    id: "ai-mono",
    title: "Mono Marks",
    prompt: "minimal mono logo suite, transparent",
    gradient: "from-slate-300 via-zinc-400 to-zinc-600",
    ratio: "3:1",
    tags: ["logo", "mono"],
    aspectRatio: 3,
    filter: "grayscale(1) contrast(1.2)",
    background: "transparent",
    zoom: 0.95,
    accent: "cyan",
  },
  {
    id: "ai-softbox",
    title: "Softbox Portraits",
    prompt: "clean studio softbox headshot, 1:1",
    gradient: "from-sky-400 via-indigo-400 to-violet-400",
    ratio: "1:1",
    tags: ["portrait", "studio"],
    aspectRatio: 1,
    filter: "brightness(1.08) contrast(1.04) saturate(1.05)",
    background: "#0a0f1a",
    zoom: 1.08,
    accent: "sky",
  },
  {
    id: "ai-vapor",
    title: "Vaporwave Covers",
    prompt: "vaporwave gradient cover art, 16:9",
    gradient: "from-pink-400 via-fuchsia-500 to-cyan-400",
    ratio: "16:9",
    tags: ["cover", "retro"],
    aspectRatio: 16 / 9,
    filter: "saturate(1.5) contrast(1.1) hue-rotate(12deg)",
    background: "#12041c",
    zoom: 1,
    accent: "violet",
  },
];

// ─────────────────────────────────────────────
// LIVE PREVIEW TARGETS
// ─────────────────────────────────────────────

/** Avatar circles rendered beside the canvas while editing. */
export const AVATAR_PREVIEW_SIZES = [88, 44, 28] as const;

export interface SocialPreview {
  id: string;
  label: string;
  aspectRatio: number;
  /** tailwind classes for the mock chrome */
  chrome: string;
  accent: AccentKey;
}

export const SOCIAL_PREVIEWS: SocialPreview[] = [
  {
    id: "feed",
    label: "Feed 1:1",
    aspectRatio: 1,
    chrome: "bg-black/60 border-white/10",
    accent: "rose",
  },
  {
    id: "portrait",
    label: "Post 4:5",
    aspectRatio: 4 / 5,
    chrome: "bg-black/60 border-white/10",
    accent: "rose",
  },
  {
    id: "story",
    label: "Story 9:16",
    aspectRatio: 9 / 16,
    chrome: "bg-black/60 border-white/10",
    accent: "violet",
  },
  {
    id: "cover",
    label: "Cover 16:9",
    aspectRatio: 16 / 9,
    chrome: "bg-black/60 border-white/10",
    accent: "sky",
  },
  {
    id: "banner",
    label: "Banner 21:9",
    aspectRatio: 21 / 9,
    chrome: "bg-black/60 border-white/10",
    accent: "amber",
  },
];

// ─────────────────────────────────────────────
// VARIANT → UX COPY
// ─────────────────────────────────────────────

export const VARIANT_COPY: Record<
  MediaVariant,
  { eyebrow: string; title: string; blurb: string; accent: AccentKey }
> = {
  avatar: {
    eyebrow: "Identity",
    title: "Avatar Studio",
    blurb: "Round-crop your portrait — we preview it at every real size.",
    accent: "violet",
  },
  logo: {
    eyebrow: "Identity",
    title: "Logo Studio",
    blurb: "Transparent, letterboxed and ready for light or dark surfaces.",
    accent: "cyan",
  },
  banner: {
    eyebrow: "Web",
    title: "Banner Studio",
    blurb: "Cinematic wide crop tuned for hero headers.",
    accent: "amber",
  },
  cover: {
    eyebrow: "Web",
    title: "Cover Studio",
    blurb: "16:9 hero art that stays sharp on every breakpoint.",
    accent: "sky",
  },
  story: {
    eyebrow: "Social",
    title: "Story Studio",
    blurb: "Vertical, thumb-stopping and safe-area aware.",
    accent: "violet",
  },
  post: {
    eyebrow: "Social",
    title: "Post Studio",
    blurb: "Grid-perfect crops for the feed.",
    accent: "rose",
  },
  thumbnail: {
    eyebrow: "Social",
    title: "Thumbnail Studio",
    blurb: "Readable 16:9 thumbnails that survive the small screen.",
    accent: "rose",
  },
  favicon: {
    eyebrow: "Web",
    title: "Favicon Studio",
    blurb: "Pixel-perfect marks at 64px, 32px and 16px.",
    accent: "amber",
  },
  product: {
    eyebrow: "Commerce",
    title: "Product Studio",
    blurb: "Clean studio framing with consistent letterbox fill.",
    accent: "emerald",
  },
  free: {
    eyebrow: "Creative",
    title: "Media Studio",
    blurb: "Full creative control — crop, grade and compose freely.",
    accent: "cyan",
  },
};
