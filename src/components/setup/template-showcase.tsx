'use client';

// studio/src/components/setup/template-showcase.tsx
//
// THE TEMPLATE GALLERY.
//
// One template at a time: its cover on the left, its story on the right.
// Navigating is selecting — the slide the client lands on is the draft they
// continue with. "Preview template" opens a deep-detail sheet (the live portal
// render, page screenshots, palette, typography), and "Browse all" opens a
// searchable list of every template on the shelf.
//
// Every slide is a *real gallery template object* from `/workspace-template/
// gallery` — the same record the Studio's marketplace uses — covers and detail
// sheets are drawn from the backend's `preview` read model, so what is shown
// is what installing produces, not a mockup of it.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion';
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Globe,
  LayoutGrid,
  Loader2,
  Pause,
  Play,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from 'lucide-react';

import type { GalleryTemplate, GalleryTemplatePreview } from '@/lib/contract';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { asHex, contrastRatio, luminance, makeReadable } from '@/lib/palette';
import { cn } from '@/lib/utils';
import { ContinueButton } from './setup-visuals';

const AUTOPLAY_MS = 5200;

/** Token radius presets → the pixel value a preview can actually draw. */
export function radiusPx(value: unknown): number {
  switch (String(value ?? 'rounded')) {
    case 'none':
      return 0;
    case 'soft':
      return 6;
    case 'pill':
      return 999;
    default:
      return 14;
  }
}

/**
 * A template with no `preview` (an older backend, or a marketplace row with an
 * unusual document) still deserves a slide: fall back to the accent trio the
 * gallery has always returned.
 */
function previewOf(template: GalleryTemplate): GalleryTemplatePreview {
  if (template.preview) return template.preview;
  const accent = template.accent ?? {
    primary: '#4f46e5',
    secondary: '#22d3ee',
    surface: '#f1f5f9',
  };
  return {
    hero: { headline: template.displayName, subheadline: template.description },
    palette: {
      primary: accent.primary,
      secondary: accent.secondary,
      accent: accent.secondary,
      background: '#ffffff',
      surface: accent.surface,
    },
    fonts: { heading: 'system-ui, sans-serif', body: 'system-ui, sans-serif' },
    radius: 'rounded',
    pages: [],
    sections: [],
  };
}

/** A soft ink for secondary copy, kept above the readable floor. */
function mixInk(ink: string, background: string): string {
  const ratio = contrastRatio(ink, background);
  return ratio > 9 ? makeReadable(ink, background, 4.8) : ink;
}

/**
 * The origin's and track's own picks float to the front; anything the client
 * already has installed is placed first of all, so the gallery opens on the
 * truth rather than a suggestion. A sensible "default" always comes first if
 * present.
 */
function orderTemplates(
  templates: GalleryTemplate[],
  preferredKeys: string[],
): GalleryTemplate[] {
  const rank = new Map(preferredKeys.map((key, i) => [key, i]));
  return [...templates].sort((a, b) => {
    const aDefault =
      a.key.includes('default') ||
      a.key.includes('minimal') ||
      a.key.includes('campus') ||
      a.displayName?.toLowerCase().includes('default')
        ? -10
        : 0;
    const bDefault =
      b.key.includes('default') ||
      b.key.includes('minimal') ||
      b.key.includes('campus') ||
      b.displayName?.toLowerCase().includes('default')
        ? -10
        : 0;
    if (aDefault !== bDefault) return aDefault - bDefault;
    const ar = rank.get(a.key) ?? 99;
    const br = rank.get(b.key) ?? 99;
    if (ar !== br) return ar - br;
    // Prefer verified/builtins-ish ordering by key stability
    return a.key.localeCompare(b.key);
  });
}

// ─── Cover art ───────────────────────────────────────────────────────────────
//
// The cover is drawn from the template's own tokens — a miniature portal, not
// a stock photo — so the colour relationships are the ones installing produces.

export function CoverArt({
  template,
  preview,
  compact,
  active,
  panel,
  className,
}: {
  template: GalleryTemplate;
  preview: GalleryTemplatePreview;
  /** Thumbs in the browse sheet shrink the art to its essentials. */
  compact?: boolean;
  /** Detail-sheet cover mode: no window chrome, no floating pages — a wide
   *  poster that reads clean at ~330px, leaving the collisions to the chrome. */
  panel?: boolean;
  /** Adds the shine sweep to the featured (navigated-to) cover. */
  active?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { palette, fonts, hero } = preview;
  const headline = hero.headline || template.displayName;

  return (
    <div
      className={cn(
        'relative h-full w-full select-none overflow-hidden',
        className,
      )}
      style={{ background: palette.background, fontFamily: compact ? undefined : fonts.body }}
      aria-hidden
    >
      {active && !reduce ? (
        <motion.div
          className="pointer-events-none absolute inset-y-0 z-20 w-1/3 -skew-x-12"
          style={{
            background:
              'linear-gradient(100deg, transparent, rgba(255,255,255,0.16), transparent)',
          }}
          initial={{ x: '-160%' }}
          animate={{ x: ['-160%', '420%'] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 4.5, ease: 'easeInOut' }}
        />
      ) : null}

      {/* Deep accent pool behind the art */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(90% 70% at 100% 100%, ${palette.primary}2e, transparent 60%), radial-gradient(80% 70% at 0% 0%, ${palette.secondary}22, transparent 55%)`,
        }}
      />

      {compact ? (
        // Thumb: one headline line (the name travels beside it anyway) plus
        // the template's colour blocks. Enough to recognise the look at 84px.
        <div className="relative flex h-full w-full flex-col p-2">
          <span className="flex items-center justify-between">
            <span
              className="truncate text-[8px] font-semibold leading-tight"
              style={{ color: makeReadable(luminance(palette.background) > 0.45 ? '#0f172a' : '#f8fafc', palette.background, 8), fontFamily: fonts.heading }}
            >
              {headline}
            </span>
            <span
              className="ml-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: palette.secondary }}
            />
          </span>
          <span className="mt-auto flex gap-1">
            <span className="h-3 flex-1 rounded-[3px]" style={{ background: palette.surface }} />
            <span className="h-3 flex-[0.6] rounded-[3px]" style={{ background: palette.primary, opacity: 0.85 }} />
            <span className="h-3 flex-[0.35] rounded-[3px]" style={{ background: palette.accent }} />
          </span>
        </div>
      ) : (
        <div className="relative flex h-full w-full flex-col">
          {/* Window chrome — skipped in panel mode, where the sheet's own
              header already frames the poster */}
          {!panel ? (
            <div className="flex shrink-0 items-center gap-2 px-4 pt-3">
              <span className="flex gap-1.5">
                {['#f87171', '#fbbf24', '#34d399'].map((dot) => (
                  <span key={dot} className="h-1.5 w-1.5 rounded-full" style={{ background: dot, opacity: 0.75 }} />
                ))}
              </span>
              <span
                className="ml-1 truncate rounded-md px-2 py-0.5 text-[8px]"
                style={{ background: palette.surface, color: mixInk(luminance(palette.surface) > 0.45 ? '#0f172a' : '#f8fafc', palette.surface) }}
              >
                {template.key}.portal
              </span>
            </div>
          ) : null}

          {/* Hero */}
          <div className={cn('relative z-10 flex-1 px-4', panel ? 'pt-9' : 'pt-4')}>
            {hero.eyebrow ? (
              <p
                className="text-[7px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: palette.secondary }}
              >
                {hero.eyebrow}
              </p>
            ) : null}
            <h4
              className={cn('mt-1 line-clamp-3 font-semibold leading-snug tracking-tight', panel ? 'pr-2 text-[13.5px]' : 'pr-8 text-[17px]')}
              style={{ color: makeReadable(luminance(palette.background) > 0.45 ? '#0f172a' : '#f8fafc', palette.background, 8), fontFamily: fonts.heading }}
            >
              {headline}
            </h4>
            <div className="mt-2.5 flex gap-1.5">
              <span className="px-2.5 py-1 text-[7.5px] font-semibold" style={{ background: palette.primary, color: makeReadable(luminance(palette.primary) > 0.45 ? '#0b1120' : '#ffffff', palette.primary, 4.5), borderRadius: Math.min(radiusPx(preview.radius), 999) }}>
                Get started
              </span>
              <span className="px-2.5 py-1 text-[7.5px] font-medium" style={{ color: luminance(palette.background) > 0.45 ? '#0f172a' : '#f8fafc', borderRadius: Math.min(radiusPx(preview.radius), 999), boxShadow: `inset 0 0 0 1px ${asHex(palette.accent)}66` }}>
                Learn more
              </span>
            </div>

            {/* Floating stacked pages — the "more than one screen" tell. In
                panel mode the poster is handed to the sheet's chips instead. */}
            {!panel ? (
              <div className="pointer-events-none absolute right-3 top-1 w-[46%]">
                <div
                  className="relative h-16 translate-x-2 translate-y-2 rounded-lg opacity-60"
                  style={{ background: palette.surface, borderRadius: radiusPx(preview.radius) + 4 }}
                />
                <div
                  className="absolute right-2 top-0 h-16 w-full overflow-hidden rounded-lg"
                  style={{ background: palette.surface, borderRadius: radiusPx(preview.radius) + 4, boxShadow: `0 10px 24px -14px ${asHex(palette.primary)}77` }}
                >
                  <span className="absolute left-2 top-2 h-1.5 w-8 rounded-full" style={{ background: palette.primary }} />
                  <span className="absolute right-2 top-6 h-1 w-3 rounded-full" style={{ background: palette.accent }} />
                </div>
              </div>
            ) : null}
          </div>

          {/* Section band */}
          <div className="relative z-10 m-3 mt-1 grid flex-1 grid-cols-3 gap-1.5 pb-1">
            {[0, 1, 2].map((cell) => (
              <span
                key={cell}
                className="rounded-md"
                style={{
                  background: cell === 1 ? palette.secondary : palette.surface,
                  opacity: cell === 1 ? 0.85 : 1,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Floating sheets ─────────────────────────────────────────────────────────
//
// Both cabinets at this step ride the vendored /components/ui sheet: the same
// base-UI dialog the Studio uses everywhere, dressed down to a plain cabinet
// (no padding of its own — the sheets draw their own chrome).

/**
 * The vendored SheetContent caps right-side sheets at `sm:max-w-sm`; the same
 * data-variant chain later in the class list lets the caller pick its width —
 * tailwind-merge keeps the last of two identical variants.
 */
const SHEET_WIDTHS = {
  detail: 'w-full data-[side=right]:w-full max-w-full data-[side=right]:max-w-full data-[side=right]:sm:max-w-5xl',
  list: 'w-full data-[side=right]:w-full max-w-full data-[side=right]:max-w-full data-[side=right]:sm:max-w-2xl',
} as const;

function FloatingSheet({
  open,
  onClose,
  label,
  width,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  width: keyof typeof SHEET_WIDTHS;
  children: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-label={label}
        className={cn(
          'flex flex-col gap-0 rounded-none border-l border-[var(--color-line)] p-0 shadow-2xl',
          /* Opaque backing under the glass gradient: `bg-(--x)` sets the
             background colour, the [image:-hinted utility paints the panel
             gradient above it — pure utilities, nothing showing through. */
          'bg-(--color-panel-solid) bg-[image:var(--color-panel)]',
          SHEET_WIDTHS[width],
        )}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

// ─── The detail (preview) sheet ──────────────────────────────────────────────

function MiniShot({
  template,
  preview,
  label,
}: {
  template: GalleryTemplate;
  preview: GalleryTemplatePreview;
  label: string;
}) {
  const shot: GalleryTemplatePreview = {
    ...preview,
    hero: {
      ...preview.hero,
      eyebrow: undefined,
      headline: label,
      subheadline: preview.hero.headline ?? undefined,
    },
  };
  return (
    <div className="shrink-0" style={{ width: 208 }}>
      <div className="relative h-[132px] overflow-hidden rounded-xl border border-[var(--color-line)]">
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: '244%', transform: 'scale(0.41)' }}>
          <TemplateFrame template={template} preview={shot} bare />
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between px-0.5">
        <span className="truncate text-[9.5px] font-medium text-[var(--color-ink-dim)]">{label}</span>
        <span className="h-1 w-1 rounded-full" style={{ background: preview.palette.accent }} />
      </div>
    </div>
  );
}

export function TemplateDetailSheet({
  open,
  onClose,
  template,
  preview,
  installed,
  busy,
  accent,
  onInstall,
  
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  open: boolean;
  onClose: () => void;
  template: GalleryTemplate | null;
  preview: GalleryTemplatePreview | null;
  installed: boolean;
  busy: boolean;
  accent: { primary: string; secondary: string };
  onInstall: (key: string) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  /**
   * Play-Store-style app page: identity + adoption stats first, then the
   * about copy, the design tokens, and only then the gallery of shots — a
   * template's story reads top-down like an app listing.
   *
   * Hooks stay above the `return null` guard — the sheet is always mounted, so
   * the expanded-description state re-derives itself on every template change
   * (the file's render-phase pattern) without reordering hooks.
   */
  const [expanded, setExpanded] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(template?.key ?? null);
  if ((template?.key ?? null) !== lastKey) {
    setLastKey(template?.key ?? null);
    setExpanded(false);
  }
  if (!template || !preview) return null;

  const { palette, fonts } = preview;
  const pages = preview.pages.length ? preview.pages : preview.sections.length ? preview.sections : ['home'];
  const shots = pages.slice(0, 4);
  const author = template.authorName ?? 'GN-Apex';
  const longDescription = (template.description ?? '').length > 260;
  const licence =
    template.source === 'BUILTIN'
      ? 'Included'
      : template.price
        ? template.price > 0
          ? `$${template.price}`
          : 'Free'
        : 'Free';

  /** App-Store stat rail: value cells separated by hairlines. */
  const stats = [
    {
      label: 'Ratings',
      value: (
        <span className="flex items-center gap-1">
          <Star size={11} className="fill-[var(--color-warn)] text-[var(--color-warn)]" />
          {typeof template.rating === 'number' ? template.rating.toFixed(1) : '—'}
        </span>
      ),
    },
    { label: 'Projects', value: String(template.projectsUsing ?? 0) },
    { label: 'Pages', value: String(template.pageCount ?? preview.pages.length) },
    { label: 'Components', value: String(template.componentCount ?? preview.sections.length) },
  ];

  return (
    <FloatingSheet open={open} onClose={onClose} label={`${template.displayName} template details`} width="detail">
      {/* Top chrome: flip through templates while the sheet is open */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
        <div className="flex items-center overflow-hidden rounded-full border border-[var(--color-line)]">
          <SheetNavButton icon={<ChevronLeft size={13} />} disabled={!hasPrev} onClick={onPrev} aria="Previous template" />
          <SheetNavButton icon={<ChevronRight size={13} />} disabled={!hasNext} onClick={onNext} aria="Next template" last />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Storefront body — details first, gallery after */}
      <div className="scroll-y min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5">
        {/* Storefront hero: the listing reads left, the cover hangs right —
            on a handheld the cover leads and the story follows. */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.32fr)_minmax(230px,336px)] lg:items-stretch lg:gap-7">
          {/* The listing column */}
          <motion.div
            key={`listing-${template.key}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="order-2 flex min-w-0 flex-col lg:order-1"
          >
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink-faint)]"
            >
              {template.key}
            </span>
            <h2 className="mt-1 truncate font-heading text-[21px] font-semibold leading-tight tracking-tight">
              {template.displayName}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-medium text-[var(--color-ink-dim)]">
              <span>by {author}</span>
              {template.isVerified ? (
                <span
                  className="inline-flex items-center gap-0.5 font-semibold"
                  style={{ color: accent.primary }}
                >
                  <BadgeCheck size={12} /> verified
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
              {template.category} · {template.source === 'BUILTIN' ? 'official template' : 'marketplace'}
            </p>

            {/* The GET pill, App-Store style, with its fine print */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={busy || installed}
                onClick={() => onInstall(template.key)}
                className={cn(
                  'focus-ring inline-flex h-8 min-w-24 items-center justify-center gap-1.5 rounded-lg px-5 text-[11px] font-bold uppercase tracking-[0.08em] text-white transition-opacity disabled:cursor-default disabled:opacity-70',
                  !busy && !installed && 'active:scale-[0.97]',
                )}
                style={{ background: `linear-gradient(120deg, ${accent.primary}, ${accent.secondary})` }}
              >
                {busy ? <Loader2 size={11} className="animate-spin" /> : installed ? <Check size={11} /> : null}
                {installed ? 'Loaded' : 'Load template'}
              </button>
              <span className="text-[9px] leading-snug text-[var(--color-ink-faint)]">
                {installed
                  ? 'this look already wears your draft'
                  : 'replaces your draft — the live site keeps serving'}
              </span>
              {template.previewUrl ? (
                <a
                  href={template.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-line-strong)] px-3 text-[10.5px] font-semibold text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-accent)]/60 hover:text-[var(--color-ink)]"
                >
                  <Globe size={12} />
                  Open the live portal
                </a>
              ) : null}
            </div>

            {/* The stat rail, anchored to the cover's baseline */}
            <div className="mt-5 grid grid-cols-4 divide-x divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel-2)] lg:mt-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1 px-2 py-3.5 text-center">
                  <span className="flex items-center text-[16px] font-semibold tabular-nums text-[var(--color-ink)]">
                    {stat.value}
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* The cover column — a gradient-ring framed poster of the real look */}
          <motion.div
            key={`cover-${template.key}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.38 }}
            className="order-1 relative lg:order-2"
          >
            <div
              className="rounded-3xl p-[1.5px] shadow-[0_26px_48px_-30px_rgba(15,23,42,0.5)]"
              style={{
                background: `linear-gradient(140deg, ${accent.primary}66, ${accent.secondary}22 45%, ${accent.primary}77)`,
              }}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] bg-(--color-panel-solid)">
                <CoverArt template={template} preview={preview} active panel />

                {/* Floating truth chips */}
                <div className="pointer-events-none absolute left-3 top-3 z-20 flex gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md">
                    <Star size={9} className="fill-[var(--color-warn)] text-[var(--color-warn)]" />
                    {typeof template.rating === 'number' ? template.rating.toFixed(1) : '—'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md">
                    <Users size={9} />
                    {template.projectsUsing ?? 0} {template.projectsUsing === 1 ? 'project' : 'projects'}
                  </span>
                </div>

                {/* Base overlay: key + the palette the install carries */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between bg-gradient-to-t from-black/50 to-transparent px-3.5 pb-3 pt-7">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/85">
                    {template.category} portal
                  </span>
                  <span className="flex gap-1.5">
                    {[preview.palette.primary, preview.palette.secondary, preview.palette.accent].map((dot, i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full border border-white/50"
                        style={{ background: dot }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* About — before any screenshots, store-style */}
        <section className="mt-6">
          <SheetCaption>About this template</SheetCaption>
          <p
            className={cn(
              'text-[12.5px] leading-relaxed text-[var(--color-ink-dim)]',
              !expanded && 'line-clamp-3',
            )}
          >
            {template.description}
          </p>
          {longDescription ? (
            <button
              type="button"
              onClick={() => setExpanded((more) => !more)}
              className="focus-ring mt-1 text-[11px] font-semibold"
              style={{ color: accent.primary }}
            >
              {expanded ? 'Less' : 'More'}
            </button>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(template.tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[9.5px] text-[var(--color-ink-dim)]">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--color-ink-faint)]">
            <span>{licence} licence</span>
            <span className="text-[var(--color-line-strong)]">·</span>
            <span>{formatCount(template.downloads)} downloads</span>
            <span className="text-[var(--color-line-strong)]">·</span>
            <span>{template.projectsUsing ?? 0} {template.projectsUsing === 1 ? 'project' : 'projects'} using it</span>
          </p>
        </section>

        {/* Design — the tokens every page inherits */}
        <section className="mt-6">
          <SheetCaption>Design — the look every page inherits</SheetCaption>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['Primary', palette.primary],
                ['Secondary', palette.secondary],
                ['Accent', palette.accent],
                ['Surface', palette.surface],
                ['Background', palette.background],
              ] as const
            ).map(([name, color]) => (
              <span
                key={name}
                className="flex items-center gap-1.5 rounded-full border border-[var(--color-line)] py-0.5 pl-1 pr-2.5"
                title={`${name} ${color}`}
              >
                <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: color }} />
                <span className="text-[9.5px] font-medium text-[var(--color-ink-dim)]">{name}</span>
                <span className="text-[9px] tabular-nums text-[var(--color-ink-faint)]">{color}</span>
              </span>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(['heading', 'body'] as const).map((slot) => (
              <span key={slot} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-2.5 py-1.5">
                <span
                  className="text-[12px] leading-none"
                  style={{ fontFamily: fonts[slot] }}
                >
                  Aa
                </span>
                <span className="text-[9.5px] text-[var(--color-ink-faint)]">
                  {slot === 'heading' ? 'Headings' : 'Body'} · {fonts[slot].split(',')[0]}
                </span>
              </span>
            ))}
          </div>
        </section>

        {/* Live render — the honest build output */}
        <section className="mt-6">
          <SheetCaption>Live preview — a real render of this template</SheetCaption>
          <motion.div
            key={template.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-[0_22px_44px_-28px_rgba(15,23,42,0.35)]"
          >
            <TemplateFrame template={template} preview={preview} />
          </motion.div>

          {/* Page screenshots — after the details, store-style */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
                Screenshots — the pages a visitor scrolls
              </span>
              <span className="text-[9px] tabular-nums text-[var(--color-ink-faint)]">
                {shots.length} of {pages.length}
              </span>
            </div>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {shots.map((page) => (
                <MiniShot key={page} template={template} preview={preview} label={page} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </FloatingSheet>
  );
}

// ─── The browse sheet ────────────────────────────────────────────────────────

function matchesQuery(template: GalleryTemplate, query: string): boolean {
  if (!query.trim()) return true;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [template.displayName, template.description ?? '', template.category, ...(template.tags ?? [])]
    .join(' ')
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

function BrowseSheet({
  open,
  onClose,
  slides,
  currentIndex,
  installedKey,
  onSelect,
  onPreview,
}: {
  open: boolean;
  onClose: () => void;
  slides: GalleryTemplate[];
  currentIndex: number;
  installedKey: string | null;
  /** Select the row: the featured card moves to it and the sheet closes. */
  onSelect: (index: number) => void;
  /** Deep-preview the row: the detail sheet opens on top. */
  onPreview: (index: number) => void;
}) {
  const [query, setQuery] = useState('');

  // Closing the sheet clears the search during render — React's own re-derive
  // pattern (same trick the featured gallery uses for new shelves), so the
  // next opening starts on the full shelf without an effect.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (!open) setQuery('');
  }

  const results = useMemo(
    () => slides.map((template, index) => ({ template, index })).filter(({ template }) => matchesQuery(template, query)),
    [slides, query],
  );

  return (
    <FloatingSheet open={open} onClose={onClose} label="Browse all templates" width="list">
      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--color-line)] px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-[15px] font-semibold tracking-tight">All templates</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the shelf"
            className="focus-ring grid h-8 w-8 place-items-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)]"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3.5 py-2 transition-colors focus-within:border-[var(--color-accent)]/60">
          <Search size={14} className="shrink-0 text-[var(--color-ink-faint)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the shelf — a plain word is enough…"
            aria-label="Search all templates"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)]"
          />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={query ? `${results.length}r` : `all${slides.length}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium tabular-nums text-[var(--color-ink-faint)]"
              style={{ background: 'color-mix(in oklab, var(--color-ink-faint) 10%, transparent)' }}
            >
              {query ? `${results.length} of ${slides.length}` : `${slides.length} templates`}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <div className="scroll-y min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {results.length === 0 ? (
          <p className="px-2 py-10 text-center text-[11px] text-[var(--color-ink-faint)]">
            Nothing on the shelf answers “{query}”. Try one plain word.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {results.map(({ template, index }) => {
              const isActive = index === currentIndex;
              const isInstalled = template.key === installedKey;
              return (
                <li key={template.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(index)}
                    className={cn(
                      'focus-ring group flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition-colors',
                      isActive
                        ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_8%,transparent)]'
                        : 'border-transparent hover:border-[var(--color-line)] hover:bg-[var(--color-panel-2)]',
                    )}
                  >
                    <span className="relative h-[52px] w-[84px] shrink-0 overflow-hidden rounded-xl border border-[var(--color-line)]">
                      <CoverArt template={template} preview={previewOf(template)} compact />
                      {isInstalled ? (
                        <span className="absolute right-1 top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-[var(--color-success)] text-white">
                          <Check size={8} strokeWidth={4} />
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[12px] font-semibold">{template.displayName}</span>
                        {template.rating ? (
                          <span className="inline-flex shrink-0 items-center gap-0.5 text-[9.5px] text-[var(--color-ink-faint)]">
                            <Star size={9} className="fill-[var(--color-warn)] text-[var(--color-warn)]" />
                            {template.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex gap-1.5 text-[9.5px] text-[var(--color-ink-faint)]">
                        {(template.tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} className="truncate lowercase">
                            {tag}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Preview ${template.displayName}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onPreview(index);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.stopPropagation();
                          onPreview(index);
                        }
                      }}
                      className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full border border-transparent text-[var(--color-ink-faint)] transition-colors hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
                    >
                      <Eye size={13} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FloatingSheet>
  );
}

// ─── The featured card (the step itself) ─────────────────────────────────────

export function TemplateShowcase({
  templates,
  installedKey,
  busy,
  preferredKeys = [],
  accent,
  onInstall,
  onContinue,
  onCustomize,
}: {
  templates: GalleryTemplate[];
  installedKey: string | null;
  busy: boolean;
  preferredKeys?: string[];
  accent: { primary: string; secondary: string };
  /** Installing replaces the draft only. Continue awaits it before advancing.
   *  Returns whether the install landed (false keeps the wizard on this step). */
  onInstall: (key: string) => boolean | void | Promise<boolean | void>;
  onContinue: () => void;
  /** Jumps to the palette studio. Passes the showcased template's key; the
   *  wizard installs it first when the draft doesn't already carry it. */
  onCustomize?: (templateKey: string) => void;
}) {
  const reduce = useReducedMotion();
  const slides = useMemo(
    () => orderTemplates(templates, preferredKeys),
    [templates, preferredKeys],
  );

  const [index, setIndex] = useState(() => {
    const at = slides.findIndex((t) => t.key === installedKey);
    return at > 0 ? at : 0;
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [playing, setPlaying] = useState(!reduce);
  const [hovered, setHovered] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [pendingJump, setPendingJump] = useState<number | null>(null);

  // A fresh shelf (a new track was picked) should start on its own first card,
  // but an already-installed template stays highlighted rather than jumping.
  // Comparing the shelf during render is React's own way to re-derive state
  // from props without a second cascading pass.
  const shelfKey = slides.map((template) => template.key).join('|');
  const [lastShelf, setLastShelf] = useState(shelfKey);
  if (shelfKey !== lastShelf) {
    setLastShelf(shelfKey);
    const installed = slides.findIndex((template) => template.key === installedKey);
    setIndex(installed > 0 ? installed : 0);
  }

  useEffect(() => {
    if (!playing || hovered || reduce || detailOpen || browseOpen || slides.length < 2) return;
    const timer = window.setTimeout(
      () => {
        setDirection(1);
        setIndex((current) => (current + 1) % slides.length);
      },
      AUTOPLAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, hovered, reduce, index, slides.length, detailOpen, browseOpen]);

  const jump = (next: number, dir: 1 | -1 = 1) => {
    if (!slides.length) return;
    setDirection(dir);
    setIndex(((next % slides.length) + slides.length) % slides.length);
    setPlaying(false);
  };

  // Preview deep-dives remember which slide to return to, so the feature is
  // also a browse: flipping through previews flips the featured card too.
  // Handled in render (the re-derive pattern) rather than in an effect, so the
  // transition lands on the very next committed frame.
  const [lastJump, setLastJump] = useState<number | null>(null);
  if (pendingJump !== lastJump) {
    setLastJump(pendingJump);
    if (pendingJump !== null) {
      jump(pendingJump, 1);
      setPendingJump(null);
    }
  }

  const active = slides[index];
  const activePreview = active ? previewOf(active) : null;

  if (!active || !activePreview) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--color-line)] p-8 text-center">
        <Loader2 size={16} className="animate-spin text-[var(--color-ink-faint)]" />
        <p className="text-[11px] text-[var(--color-ink-faint)]">
          Loading the templates for this workspace…
        </p>
        <p className="max-w-xs text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
          You can continue anyway — the wizard will keep your current draft.
        </p>
        <ContinueButton label="Continue" accent={accent} onClick={onContinue} />
      </div>
    );
  }

  const installedHere = active.key === installedKey;
  // EduOS ships a single first-class template: presenting it as "the portal
  // that's included" reads better than running a one-slide carousel, so the
  // browse control metamorphoses into a reroute to the palette studio.
  const single = slides.length === 1;

  /** Navigating is selecting: Continue installs what is on stage — and on a
   *  failed install, the page's error banner shows and the step holds. */
  const continueWithThis = async () => {
    if (installedHere) {
      onContinue();
      return;
    }
    try {
      await onInstall(active.key);
      onContinue();
    } catch {
      /* the page already surfaced the error */
    }
  };

  const stepSlash = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;

  return (
    <div className="space-y-5">
      {/* ── The featured row: cover left, story right ── */}
      <div
        className="grid gap-5 lg:grid-cols-[minmax(280px,0.82fr)_1.18fr] lg:gap-6"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Cover */}
        <div className="relative">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--color-line-strong)] shadow-[0 26px 46px -30px rgba(15,23,42,0.4)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.key}
                className="absolute inset-0"
                initial={{ opacity: 0, x: 34 * direction, scale: 0.985 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -26 * direction, scale: 0.99 }}
                transition={{ duration: reduce ? 0.16 : 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <CoverArt template={active} preview={activePreview} active />
              </motion.div>
            </AnimatePresence>

            {/* Autoplay progress, hairline across the cover base */}
            {!reduce && playing && slides.length > 1 ? (
              <motion.div
                key={`${active.key}-${index}`}
                className="absolute inset-x-0 bottom-0 z-20 h-[2.5px]"
                style={{ background: `linear-gradient(90deg, ${accent.primary}, ${accent.secondary})` }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
              />
            ) : null}
          </div>

          {/* Floating truth chips */}
          <div className="pointer-events-none absolute left-3 top-3 z-20 flex gap-1.5">
            {installedHere ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--color-success)_16%,transparent)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-success)] backdrop-blur-sm">
                <Check size={9} strokeWidth={3.5} /> your draft
              </span>
            ) : single ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md"
                style={{ background: `color-mix(in oklab, ${accent.primary} 78%, transparent)` }}
              >
                <Check size={9} strokeWidth={3.5} /> first-class template
              </span>
            ) : null}
            {typeof active.rating === 'number' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-md">
                <Star size={9} className="fill-[var(--color-warn)] text-[var(--color-warn)]" />
                {active.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-col">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            {single ? `Included portal · ${active.category}` : `Template ${stepSlash} · ${active.category}`}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h3
                key={active.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="truncate font-heading text-[19px] font-semibold tracking-tight"
              >
                {active.displayName}
              </motion.h3>
            </AnimatePresence>
            {active.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
                <BadgeCheck size={10} style={{ color: accent.primary }} /> verified
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-[var(--color-ink-dim)]">
            {active.description}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1">
            {(active.tags ?? []).slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[9.5px] text-[var(--color-ink-faint)]"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[9.5px] text-[var(--color-ink-faint)]">
              {active.pageCount ?? activePreview.pages.length} pages
            </span>
            {typeof active.projectsUsing === 'number' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[9.5px] text-[var(--color-ink-faint)]">
                <Users size={9} /> {active.projectsUsing} {active.projectsUsing === 1 ? 'project' : 'projects'}
              </span>
            ) : null}
            {typeof active.downloads === 'number' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[9.5px] text-[var(--color-ink-faint)]">
                <Download size={9} /> {formatCount(active.downloads)}
              </span>
            ) : null}
          </div>

          {/* Action row: preview + the slider nav, one flex line */}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              disabled={busy}
              className="focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[var(--color-line-strong)] px-4 text-[11.5px] font-semibold transition-colors hover:border-[var(--color-accent)]/60 disabled:opacity-55"
            >
              <Eye size={13} style={{ color: accent.primary }} />
              Preview template
            </button>

            <div className="flex h-9 items-center overflow-hidden rounded-full border border-[var(--color-line)] bg-[var(--color-panel-2)] transition-colors">
              <SheetNavButton
                icon={<ChevronLeft size={14} />}
                disabled={slides.length < 2 || busy}
                onClick={() => jump(index - 1, -1)}
                aria="Previous template"
              />
              <span className="w-14 select-none text-center text-[9.5px] font-semibold tabular-nums text-[var(--color-ink-dim)]">
                {stepSlash}
              </span>
              {playing ? (
                <button
                  type="button"
                  onClick={() => setPlaying(false)}
                  aria-label="Pause the slideshow"
                  className="focus-ring grid h-full w-7 place-items-center border-l border-[var(--color-line)] text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
                >
                  <Pause size={11} />
                </button>
              ) : null}
              <SheetNavButton
                icon={<ChevronRight size={14} />}
                disabled={slides.length < 2 || busy}
                onClick={() => jump(index + 1, 1)}
                aria="Next template"
                last
              />
            </div>
            {!playing && !reduce && slides.length > 1 ? (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="Resume the slideshow"
                className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-faint)] transition-colors hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
              >
                <Play size={12} />
              </button>
            ) : null}
          </div>

          <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
            {installedHere
              ? 'This look already wears your draft — continue and keep it.'
              : 'Continuing loads this look into your draft. Your live site is never touched.'}
          </p>
        </div>
      </div>

      {/* ── Bottom row: browse (or reroute to the palette) + continue ── */}
      <div className="flex flex-col items-stretch gap-2.5 pb-1 sm:flex-row sm:items-center sm:justify-between">
        {single ? (
          onCustomize && slides[0] ? (
            <button
              type="button"
              onClick={() => onCustomize(slides[0].key)}
              disabled={busy}
              className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-full border px-4 text-[11.5px] font-semibold transition-colors hover:opacity-85 disabled:opacity-55"
              style={{
                borderColor: `color-mix(in oklab, ${accent.primary} 45%, var(--color-line))`,
                color: accent.primary,
              }}
            >
              <SlidersIcon />
              Customize its UI/UX
            </button>
          ) : null
        ) : (
          <button
            type="button"
            onClick={() => setBrowseOpen(true)}
            disabled={busy}
            className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[var(--color-line)] px-4 text-[11.5px] font-semibold text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)] disabled:opacity-55"
          >
            <LayoutGridIcon />
            Browse all {slides.length} templates
          </button>
        )}
        <ContinueButton
          label={
            installedHere
              ? 'Continue with this look'
              : single
                ? 'Continue with your EduOS portal'
                : `Continue with ${active.displayName}`
          }
          hint={
            single
              ? 'Its palette, typography and brand dress every page — you can tune it next.'
              : 'You can switch templates later in the Studio.'
          }
          busy={busy}
          disabled={busy}
          accent={{ primary: accent.primary, secondary: accent.secondary }}
          onClick={() => void continueWithThis()}
        />
      </div>

      {/* ── Sheets ── */}
      <BrowseSheet
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        slides={slides}
        currentIndex={index}
        installedKey={installedKey}
        onSelect={(next) => {
          jump(next, 1);
          setBrowseOpen(false);
        }}
        onPreview={(next) => {
          setPendingJump(next);
          setBrowseOpen(false);
          setDetailOpen(true);
        }}
      />
      <TemplateDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        template={active}
        preview={activePreview}
        installed={installedHere}
        busy={busy}
        accent={accent}
        onInstall={(key) => void onInstall(key)}
        onPrev={() => jump(index - 1, -1)}
        onNext={() => jump(index + 1, 1)}
        hasPrev={slides.length > 1}
        hasNext={slides.length > 1}
      />
    </div>
  );
}

// ─── Shared chrome ───────────────────────────────────────────────────────────

/** A hint sentence, rendered once as the sheet's section eyebrow. */
function SheetCaption({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
      {children}
    </p>
  );
}

function SheetNavButton({
  icon,
  disabled,
  onClick,
  aria,
  last,
}: {
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  aria: string;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className={cn(
        'focus-ring grid h-full w-8 place-items-center text-[var(--color-ink-dim)] transition-colors hover:bg-[var(--color-panel-2)] hover:text-[var(--color-ink)] disabled:opacity-35',
        !last && 'border-r border-[var(--color-line)] pr-1',
        last && 'pl-1',
      )}
    >
      {icon}
    </button>
  );
}

function LayoutGridIcon() {
  return <LayoutGrid size={13} />;
}

function SlidersIcon() {
  return <SlidersHorizontal size={13} />;
}

function formatCount(value?: number | null): string {
  if (typeof value !== 'number') return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

// ─── The live portal render (detail sheet hero + page screenshots) ───────────

/**
 * A scaled portal: nav, hero, section bands. Drawn entirely from the template's
 * own tokens, so the colour relationships a client sees here are the ones the
 * compiled site will use. Ink is derived through the same contrast helper the
 * palette step uses, because the gallery's palette carries no text colour.
 */
function TemplateFrame({
  template,
  preview,
  bare,
}: {
  template: GalleryTemplate;
  preview: GalleryTemplatePreview;
  /** Skip the studio-like browser chrome (used inside scaled mini-shots). */
  bare?: boolean;
}) {
  const { palette, fonts, radius, hero, sections } = preview;
  const r = radiusPx(radius);
  const onBackground = makeReadable(luminance(palette.background) > 0.45 ? '#0f172a' : '#f8fafc', palette.background, 8);
  const onSurface = makeReadable(luminance(palette.surface) > 0.45 ? '#0f172a' : '#f8fafc', palette.surface, 7);
  const onPrimary = makeReadable(
    luminance(palette.primary) > 0.45 ? '#0b1120' : '#ffffff',
    palette.primary,
    4.5,
  );
  const muted = mixInk(onBackground, palette.background);
  const showHeadline = hero.headline || hero.subheadline;

  const frame = (
    <div>
      <div
        className="px-5 py-5 sm:px-7 sm:py-7"
        style={{ background: palette.background, fontFamily: fonts.body }}
      >
        {/* Nav */}
        <div
          className="flex items-center justify-between rounded-xl px-3 py-2"
          style={{ background: palette.surface }}
        >
          <span
            className="text-[11px] font-semibold"
            style={{ color: onSurface, fontFamily: fonts.heading }}
          >
            {template.displayName}
          </span>
          <span className="flex items-center gap-3">
            {['Home', 'About', 'Programmes'].map((item, itemIndex) => (
              <span
                key={item}
                className={cn('hidden text-[8.5px] sm:block', itemIndex === 0 && 'font-semibold')}
                style={{ color: itemIndex === 0 ? onSurface : muted }}
              >
                {item}
              </span>
            ))}
            <span
              className="px-2 py-1 text-[8.5px] font-semibold"
              style={{ background: palette.primary, color: onPrimary, borderRadius: Math.min(r, 999) }}
            >
              Enrol
            </span>
          </span>
        </div>

        {/* Hero */}
        <div className="mt-5 grid gap-4 sm:grid-cols-[1.25fr_0.75fr] sm:items-center">
          <div
            className={cn(
              'space-y-2',
              hero.alignment === 'center' && 'text-center',
              hero.alignment === 'right' && 'text-right',
            )}
          >
            {hero.eyebrow ? (
              <p
                className="text-[8.5px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: palette.secondary }}
              >
                {hero.eyebrow}
              </p>
            ) : null}
            <h4
              className="text-balance text-lg font-semibold leading-snug sm:text-[22px]"
              style={{ color: onBackground, fontFamily: fonts.heading }}
            >
              {showHeadline ? hero.headline || hero.subheadline : template.displayName}
            </h4>
            {hero.subheadline && hero.headline ? (
              <p className="text-[10.5px] leading-relaxed" style={{ color: muted }}>
                {hero.subheadline}
              </p>
            ) : null}
            <span
              className={cn('flex gap-2', hero.alignment === 'center' && 'justify-center')}
            >
              <span
                className="px-3 py-1.5 text-[9px] font-semibold"
                style={{
                  background: palette.primary,
                  color: onPrimary,
                  borderRadius: Math.min(r, 999),
                }}
              >
                Get started
              </span>
              <span
                className="border px-3 py-1.5 text-[9px] font-medium"
                style={{
                  borderColor: palette.accent,
                  color: onBackground,
                  borderRadius: Math.min(r, 999),
                }}
              >
                Learn more
              </span>
            </span>
          </div>

          {/* Hero visual: an accent panel that shows the secondary colour at work */}
          <div
            className="relative hidden h-28 overflow-hidden sm:block"
            style={{
              borderRadius: r,
              background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
            }}
          >
            <span
              className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full"
              style={{ background: palette.accent, opacity: 0.5 }}
            />
          </div>
        </div>

        {/* Sections */}
        <div className="mt-5 space-y-2.5">
          {(sections.length ? sections : ['What we offer', 'How it works']).slice(0, 3).map(
            (title, sectionIndex) => (
              <div
                key={title}
                className="rounded-xl border p-2.5"
                style={{
                  borderColor: `${asHex(palette.accent)}33`,
                  background: palette.surface,
                }}
              >
                <p
                  className="text-[9.5px] font-semibold"
                  style={{ color: onSurface, fontFamily: fonts.heading }}
                >
                  {title}
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 3 }).map((_, cellIndex) => (
                    <span
                      key={cellIndex}
                      className="block h-6 rounded-md"
                      style={{
                        background:
                          sectionIndex === 1 && cellIndex === 0
                            ? palette.secondary
                            : `${asHex(onSurface)}14`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>

        {/* Footer band */}
        <div
          className="mt-4 flex items-center justify-between border-t pt-2.5"
          style={{ borderColor: `${asHex(onBackground)}1f` }}
        >
          <span className="text-[8.5px]" style={{ color: muted }}>
            {template.category} · {preview.pages.join(' · ') || 'home'}
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: palette.secondary }}
          />
        </div>
      </div>
    </div>
  );

  if (bare) return frame;

  return (
    <div>
      {/* Browser chrome — a reminder this is a *site*, not a swatch */}
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-2">
        <span className="flex gap-1.5">
          {['#f87171', '#fbbf24', '#34d399'].map((dot) => (
            <span key={dot} className="h-2 w-2 rounded-full" style={{ background: dot }} />
          ))}
        </span>
        <span className="ml-1 truncate rounded-md bg-[var(--color-panel-2)] px-2 py-0.5 text-[9.5px] text-[var(--color-ink-faint)]">
          {template.key}.portal
        </span>
        <span className="ml-auto hidden text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)] sm:block">
          live preview
        </span>
      </div>
      {frame}
    </div>
  );
}
