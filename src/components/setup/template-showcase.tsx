'use client';

// studio/src/components/setup/template-showcase.tsx
//
// THE TEMPLATE SLIDESHOW.
//
// This card answers "what will my site look like?" before the client has
// installed anything. Every slide is a *real gallery template object* from
// `/workspace-template/gallery` — the same record the Studio's marketplace uses
// — and the preview is drawn from the backend's `preview` read model, which is
// derived from the template's own hero copy, palette and section headings. So
// what is shown here is what installing produces, not a mockup of it.
//
// Installing goes through `selectTemplate`, which replaces the DRAFT only. The
// live portal keeps serving whatever it served before, exactly as the footer of
// the wizard promises.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Star,
} from 'lucide-react';

import type { GalleryTemplate, GalleryTemplatePreview } from '@/lib/contract';
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

export function TemplateShowcase({
  templates,
  installedKey,
  busy,
  preferredKeys = [],
  accent,
  onInstall,
  onContinue,
}: {
  templates: GalleryTemplate[];
  installedKey: string | null;
  busy: boolean;
  preferredKeys?: string[];
  accent: { primary: string; secondary: string };
  onInstall: (key: string) => void;
  onContinue: () => void;
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
  const [playing, setPlaying] = useState(!reduce);
  const [hovered, setHovered] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

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
    if (!playing || hovered || reduce || slides.length < 2) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current + 1) % slides.length),
      AUTOPLAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [playing, hovered, reduce, index, slides.length]);

  const jump = (next: number) => {
    if (!slides.length) return;
    setIndex(((next % slides.length) + slides.length) % slides.length);
    setPlaying(false);
  };

  const active = slides[index];

  if (!slides.length) {
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

  const preview = previewOf(active);

  return (
    <div className="space-y-4">
      {/* ── Stage ── */}
      <div
        ref={stageRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative"
      >
        <div className="surface-glass overflow-hidden rounded-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.key}
              initial={{ opacity: 0, y: 14, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.995 }}
              transition={{ duration: reduce ? 0.18 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <TemplateFrame template={active} preview={preview} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrows */}
        <StageArrow side="left" disabled={slides.length < 2} onClick={() => jump(index - 1)} />
        <StageArrow side="right" disabled={slides.length < 2} onClick={() => jump(index + 1)} />

        {/* Autoplay + progress */}
        <div className="mt-2 flex items-center gap-3 px-1">
          {!reduce && slides.length > 1 ? (
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? 'Pause the slideshow' : 'Play the slideshow'}
              className="focus-ring flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-dim)] hover:border-[var(--color-line-strong)]"
            >
              {playing ? <Pause size={11} /> : <Play size={11} />}
            </button>
          ) : null}
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
            {!playing || reduce ? (
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${((index + 1) / slides.length) * 100}%`,
                  background: `linear-gradient(90deg, ${accent.primary}, ${accent.secondary})`,
                }}
              />
            ) : (
              <motion.div
                key={`${active.key}-${index}`}
                className="absolute inset-y-0 left-0 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
                style={{ background: `linear-gradient(90deg, ${accent.primary}, ${accent.secondary})` }}
              />
            )}
          </div>
          <p className="shrink-0 text-[10px] tabular-nums text-[var(--color-ink-faint)]">
            {index + 1} / {slides.length}
          </p>
        </div>
      </div>

      {/* ── Filmstrip ── */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {slides.map((template, slideIndex) => {
          const thumb = previewOf(template);
          const isActive = slideIndex === index;
          const isInstalled = template.key === installedKey;
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => jump(slideIndex)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'focus-ring group relative shrink-0 overflow-hidden rounded-xl border p-1.5 text-left transition-all',
                isActive
                  ? 'border-[var(--color-accent)]/60'
                  : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
              )}
              style={{ width: 116 }}
            >
              <span
                className="flex h-9 items-end gap-1 rounded-md p-1.5"
                style={{ background: thumb.palette.background }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: thumb.palette.primary }}
                />
                <span
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: thumb.palette.surface }}
                />
              </span>
              <span className="mt-1.5 flex items-center gap-1">
                <span className="truncate text-[9.5px] font-medium leading-tight">
                  {template.displayName}
                </span>
                {isInstalled ? <Check size={9} className="shrink-0 text-[var(--color-success)]" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Meta + actions ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight">{active.displayName}</h3>
            {active.isVerified ? (
              <span className="rounded-full border border-[var(--color-line)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
                verified
              </span>
            ) : null}
            {typeof active.rating === 'number' ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--color-ink-dim)]">
                <Star size={10} className="fill-[var(--color-warn)] text-[var(--color-warn)]" />
                {active.rating.toFixed(1)}
              </span>
            ) : null}
            {active.key === installedKey ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--color-success)_14%,transparent)] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-success)]">
                <Check size={9} strokeWidth={3} /> installed
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 max-w-xl text-[11.5px] leading-relaxed text-[var(--color-ink-dim)]">
            {active.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(active.tags ?? []).slice(0, 6).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[9.5px] text-[var(--color-ink-faint)]"
              >
                {tag}
              </span>
            ))}
            <span className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[9.5px] text-[var(--color-ink-faint)]">
              {preview.pages.length} pages
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            disabled={busy || active.key === installedKey}
            onClick={() => onInstall(active.key)}
            className={cn(
              'focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-4 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55',
              active.key === installedKey
                ? 'border-[var(--color-line)] text-[var(--color-ink-faint)]'
                : 'border-[var(--color-line-strong)] hover:border-[var(--color-accent)]/60',
            )}
          >
            {busy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : active.key === installedKey ? (
              <Check size={12} />
            ) : null}
            {active.key === installedKey ? 'This is your draft' : 'Load this template'}
          </button>
          <ContinueButton
            label={active.key === installedKey ? 'Continue with this look' : 'Continue'}
            hint="You can switch templates later in the Studio."
            busy={busy}
            accent={{ primary: accent.primary, secondary: accent.secondary }}
            onClick={onContinue}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Stage chrome ────────────────────────────────────────────────────────────

function StageArrow({
  side,
  disabled,
  onClick,
}: {
  side: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous template' : 'Next template'}
      className={cn(
        'surface-glass focus-ring absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)] disabled:opacity-30 sm:flex',
        side === 'left' ? '-left-4' : '-right-4',
      )}
    >
      <Icon size={16} />
    </button>
  );
}

// ─── The live preview ────────────────────────────────────────────────────────

/**
 * A scaled portal: nav, hero, section bands. Drawn entirely from the template's
 * own tokens, so the colour relationships a client sees here are the ones the
 * compiled site will use. Ink is derived through the same contrast helper the
 * palette step uses, because the gallery's palette carries no text colour.
 */
function TemplateFrame({
  template,
  preview,
}: {
  template: GalleryTemplate;
  preview: GalleryTemplatePreview;
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
}

/** A soft ink for secondary copy, kept above the readable floor. */
function mixInk(ink: string, background: string): string {
  const ratio = contrastRatio(ink, background);
  return ratio > 9 ? makeReadable(ink, background, 4.8) : ink;
}

/**
 * The origin's and track's own picks float to the front; anything the client
 * already has installed is placed first of all, so the slideshow opens on the
 * truth rather than a suggestion.
 */
function orderTemplates(
  templates: GalleryTemplate[],
  preferredKeys: string[],
): GalleryTemplate[] {
  const rank = new Map(preferredKeys.map((key, i) => [key, i]));
  return [...templates].sort((a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99));
}
