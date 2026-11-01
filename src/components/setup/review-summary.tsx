'use client';

// studio/src/components/setup/review-summary.tsx
//
// THE PRE-FLIGHT STAGE.
//
// Production reading of the finished setup: a checklist of every answer,
// exactly as retained, and a browser-framed render of the portal draft the
// tokens produce. Nothing here pretends to be published — the wizard saves
// automatically and never publishes. The one action is Next: Open the Studio.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Monitor, Smartphone } from 'lucide-react';

import { FlowGlyph } from './icon-bridge';
import {
  operationalTitleFor,
  type FlowField,
  type FlowIcon,
  type FlowOriginOption,
  type FlowTrack,
  type ModeFlow,
  type FlowFeature,
} from '@/lib/setup-flow';
import type { GlobalTokens, StudioManifest } from '@/lib/contract';
import {
  DENSITY_OPTIONS,
  FONT_PAIRINGS,
  asHex,
} from '@/lib/palette';
import { cn } from '@/lib/utils';

const stagger = 0.05;

export function ReviewSummary({
  flow,
  origin,
  track,
  enabledFeatures,
  detailFields,
  manifest,
  templateName,
  tokens,
  paletteSource,
  busy,
  onBack,
  onOpenStudio,
}: {
  flow: ModeFlow;
  origin: FlowOriginOption | null;
  track: FlowTrack | null;
  enabledFeatures: FlowFeature[];
  detailFields: FlowField[];
  tokens: GlobalTokens;
  manifest: StudioManifest;
  templateName: string;
  paletteSource: string;
  busy: 'save' | null;
  onBack: () => void;
  onOpenStudio: () => void;
}) {
  const name = String(tokens.siteName ?? manifest.projectName);
  const tagline = String(tokens.tagline ?? '');
  const primary = asHex(tokens.primaryColor, flow.accent.primary);
  const secondary = asHex(tokens.secondaryColor, primary);
  const accent = asHex(tokens.accentColor, secondary);

  // Pre-flight rows: every commissioning answer, in the order it was given,
  // with a real value — nothing placeholder-shaped lives on this card.
  const checklist: {
    key: string;
    glyph: FlowIcon;
    label: string;
    value: string;
    side?: string;
    isHex?: boolean;
  }[] = [
    {
      key: 'origin',
      glyph: flow.icon,
      label: 'Origin',
      value: origin?.label ?? flow.brandTitle,
      side: 'kept',
    },
    {
      key: 'shelf',
      glyph: track?.icon ?? flow.icon,
      label: 'Shelf',
      value: track?.label ?? 'General workspace',
      side: `${enabledFeatures.length} capabilities`,
    },
    {
      key: 'template',
      glyph: 'layers',
      label: 'Template',
      value: templateName ? friendly(templateName) : 'Starter layout',
      side: templateName ? 'installed' : 'built-in',
    },
    {
      key: 'palette',
      glyph: 'palette',
      label: 'Palette',
      value: paletteSource ? `from ${paletteSource}` : 'tuned by hand',
      isHex: true,
    },
    {
      key: 'shape',
      glyph: 'type',
      label: 'Type & shape',
      value: shapeSummary(tokens),
      side: 'configured',
    },
  ];

  const credentialAnswers = (origin?.fields ?? []).filter(
    (field) => String(tokens[field.key] ?? '').trim(),
  );
  const operationAnswers = detailFields.filter((field) =>
    String(tokens[field.key] ?? '').trim(),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start">
      {/* ── The manifest — left ────────────────────────────────────────────── */}
      <div className="order-2 space-y-4 lg:order-1">
        {/* Identity, as retained */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="surface-glass overflow-hidden rounded-2xl"
        >
          <div
            className="relative p-5"
            style={{
              background: `linear-gradient(135deg, ${asHex(tokens.surfaceColor, '#f8fafc')}, ${asHex(tokens.backgroundColor, '#ffffff')})`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                  style={{ background: primary }}
                >
                  {String(tokens.logoUrl ?? '') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={String(tokens.logoUrl)}
                      src={String(tokens.logoUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-white">
                      <FlowGlyph name={flow.icon} size={20} />
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className="truncate text-[8.5px] font-semibold uppercase tracking-[0.24em]"
                    style={{ color: accent }}
                  >
                    {flow.osName} · draft
                  </p>
                  <p
                    className="truncate text-[15.5px] font-semibold leading-tight"
                    style={{ color: asHex(tokens.textColor, '#0f172a'), fontFamily: String(tokens.fontHeading ?? '') }}
                  >
                    {name}
                  </p>
                  {tagline ? (
                    <p
                      className="mt-0.5 truncate text-[10.5px]"
                      style={{ color: asHex(tokens.textColor, '#0f172a'), opacity: 0.7 }}
                    >
                      {tagline}
                    </p>
                  ) : null}
                </div>
              </div>
              {track || origin ? (
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white"
                  style={{ background: (track ?? origin)?.accent.primary }}
                >
                  {track?.label ?? origin?.label}
                </span>
              ) : null}
            </div>
          </div>
        </motion.div>

        {/* The pre-flight checklist */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="surface-glass overflow-hidden rounded-2xl"
        >
          <header className="flex items-baseline justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Pre-flight checklist
            </p>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
              {checklist.length} answers · auto-saved
            </p>
          </header>
          <ol>
            {checklist.map((row, index) => (
              <motion.li
                key={row.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * stagger, duration: 0.35 }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5',
                  index < checklist.length - 1 && 'border-b border-[var(--color-line)]/70',
                )}
              >
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]">
                  0{index + 1}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)] text-[var(--color-accent)]">
                  <FlowGlyph name={row.glyph} size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-medium leading-snug text-[var(--color-ink)]">
                    {row.value}
                  </span>
                  <span className="block truncate font-mono text-[8.5px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
                    {row.label}
                  </span>
                </span>
                {row.isHex ? (
                  <span className="flex shrink-0 gap-1">
                    {[primary, secondary, accent].map((dot, dotIndex) => (
                      <span
                        key={dotIndex}
                        className="h-3 w-3 rounded-full border border-black/10 dark:border-white/15"
                        style={{ background: dot }}
                        title={dot.toUpperCase()}
                      />
                    ))}
                  </span>
                ) : row.side ? (
                  <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
                    {row.side}
                  </span>
                ) : null}
              </motion.li>
            ))}
          </ol>
        </motion.section>

        {/* Registration evidence — only origins that asked for it have answers */}
        {credentialAnswers.length ? (
          <div className="surface-glass rounded-2xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              {origin?.credentialsTitle ?? 'Registration details'}
            </p>
            <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {credentialAnswers.map((field) => (
                <div
                  key={field.key}
                  className="rounded-xl border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_60%,transparent)] px-2.5 py-1.5"
                >
                  <dt className="text-[9px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 truncate text-[11.5px] font-medium text-[var(--color-ink)]">
                    {String(tokens[field.key])}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
              Saved as ordinary workspace tokens — edit them in Studio at any time, no rebuild.
            </p>
          </div>
        ) : null}

        {/* Operational summary — only for setups that still ask the Details card */}
        {operationAnswers.length ? (
          <div className="surface-glass rounded-2xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              {operationalTitleFor(flow, origin)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {operationAnswers.slice(0, 8).map((f) => (
                <span
                  key={f.key}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] text-[var(--color-ink-dim)]"
                >
                  <span className="text-[var(--color-ink-faint)]">{f.label}:</span>
                  <span className="font-medium">{String(tokens[f.key])}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Runtime surfaces — what the portal will actually carry */}
        {flow.runtimeSurfaces.length ? (
          <div className="surface-glass rounded-2xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              {flow.osName} carries
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {flow.runtimeSurfaces.map((surface) => (
                <span
                  key={surface}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-ink-dim)]"
                >
                  <span className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
                  {surface}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Actions — the single next step: open the studio */}
        <div className="rounded-2xl border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_55%,transparent)] p-4">
          <p className="text-[10.5px] leading-relaxed text-[var(--color-ink-dim)]">
            <span className="font-semibold">Everything here is already saved</span>
            <span className="text-[var(--color-ink-faint)]">
              {' '}
              — each step you completed wrote the draft. Setup stops here by design: publishing is
              a Studio decision, never a wizard one.
            </span>
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="focus-ring rounded-full border border-[var(--color-line)] px-4 py-2 text-[11px] font-medium text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)]"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={onOpenStudio}
              className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-white transition-opacity disabled:cursor-default disabled:opacity-70"
              style={{ background: `linear-gradient(120deg, ${primary}, ${secondary})` }}
            >
              {busy === 'save' ? <LoaderDot /> : null}
              Open the Studio
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── The real bench — right, pinned ─────────────────────────────────── */}
      <div className="order-1 space-y-4 lg:sticky lg:top-6 lg:self-start lg:order-2">
        <ReviewStage tokens={tokens} flow={flow} features={enabledFeatures} />
      </div>
    </div>
  );
}

// ─── The bench: the draft portal, browser-framed ─────────────────────────────

/**
 * The live portal the retained tokens produce — the same honest render the
 * studio uses, marked DRAFT rather than LIVE: nothing here is published.
 */
function ReviewStage({
  tokens,
  flow,
  features,
}: {
  tokens: GlobalTokens;
  flow: ModeFlow;
  features: FlowFeature[];
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  const background = String(tokens.backgroundColor ?? '#ffffff');
  const surface = String(tokens.surfaceColor ?? '#f1f5f9');
  const text = String(tokens.textColor ?? '#0f172a');
  const muted = String(tokens.mutedTextColor ?? '#475569');
  const border = String(tokens.borderColor ?? '#e2e8f0');
  const primary = asHex(tokens.primaryColor, flow.accent.primary);
  const secondary = asHex(tokens.secondaryColor, primary);
  const accent = asHex(tokens.accentColor, secondary);
  const radius = radiusOf(tokens.borderRadius);
  const heading = String(tokens.fontHeading ?? 'system-ui, sans-serif');
  const body = String(tokens.fontBody ?? 'system-ui, sans-serif');
  const gutter = String(tokens.gridGutter ?? '1.5rem');
  const siteName = String(tokens.siteName ?? 'Your workspace');
  const mockWidth = device === 'mobile' ? 286 : 480;

  // The feature cards are the real toggled capabilities, not invented copy.
  const featureCards = (features.length ? features.slice(0, 2) : defaultCards()).map(
    (feature) => ({
      label: feature.label,
      copy: 'copy' in feature ? feature.copy : feature.description,
    }),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2.5 border-b border-[var(--color-line)] bg-[var(--color-panel-2)] px-3.5 py-2">
        <span className="flex shrink-0 gap-1.5">
          {['#f87171', '#fbbf24', '#34d399'].map((dot) => (
            <span
              key={dot}
              className="h-2 w-2 rounded-full"
              style={{ background: dot, opacity: 0.72 }}
            />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-[var(--color-canvas)] px-2 py-0.5 font-mono text-[9px] text-[var(--color-ink-faint)]">
          https://{slugOf(siteName)}.gn-apex.portal
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-warn)]/40 bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)] px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warn)]" />
          <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-[var(--color-warn)]">
            draft
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] p-0.5">
          {(
            [
              ['desktop', Monitor],
              ['mobile', Smartphone],
            ] as const
          ).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              title={key === 'desktop' ? 'Desktop rendering' : 'Rendering at a phone width'}
              onClick={() => setDevice(key)}
              className={cn(
                'focus-ring grid h-5 w-6 place-items-center rounded-[5px] transition-colors',
                device === key
                  ? 'bg-[var(--color-panel-2)] text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]',
              )}
            >
              <Icon size={11} />
            </button>
          ))}
        </span>
        <span className="flex shrink-0 gap-1">
          {[primary, secondary, accent].map((dot, index) => (
            <span
              key={index}
              className="h-2 w-2 rounded-full border border-white/50 dark:border-black/40"
              style={{ background: dot }}
            />
          ))}
        </span>
      </div>

      {/* The portal itself */}
      <div className="p-4" style={{ background }}>
        <motion.div
          className="mx-auto transition-[max-width] duration-300 ease-out"
          style={{ maxWidth: mockWidth, fontFamily: body }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ background: surface, border: `1px solid ${border}`, borderRadius: radius }}
          >
            <span
              className="min-w-0 truncate text-[11.5px] font-semibold"
              style={{ color: text, fontFamily: heading }}
            >
              {siteName}
            </span>
            <span className="flex shrink-0 items-center gap-2.5 text-[8.5px]" style={{ color: muted }}>
              <span className="hidden sm:inline">Home</span>
              <span>About</span>
              <span>Contact</span>
              <span
                className="px-2 py-0.5 text-[8.5px] font-semibold text-white"
                style={{ background: primary, borderRadius: Math.min(radius, 999) }}
              >
                Join
              </span>
            </span>
          </div>

          {/* Hero — the real tagline if the client wrote one */}
          <div
            className="relative mt-2 overflow-hidden"
            style={{
              background: `linear-gradient(132deg, ${primary}, ${secondary})`,
              borderRadius: radius,
            }}
          >
            <div className="p-4">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.22em] text-white/75">
                {String(tokens.tagline || '').trim() ? 'Message' : 'Welcome'}
              </p>
              <p
                className="mt-1.5 text-balance text-[15px] font-semibold leading-snug text-white"
                style={{ fontFamily: heading }}
              >
                {String(tokens.tagline || '').trim() || siteName}
              </p>
              <div className="mt-3 flex gap-2">
                <span
                  className="px-2.5 py-1 text-[9px] font-semibold"
                  style={{
                    background: '#ffffff',
                    color: primary,
                    borderRadius: radius === 999 ? 999 : Math.min(radius, 10),
                  }}
                >
                  Primary action
                </span>
                <span
                  className="border px-2.5 py-1 text-[9px] font-medium text-white"
                  style={{ borderColor: 'rgba(255,255,255,0.6)', borderRadius: radius }}
                >
                  Secondary
                </span>
              </div>
            </div>
          </div>

          {/* Cards — the client's own toggled capabilities */}
          <div className="mt-2 grid grid-cols-2" style={{ gap: gutter }}>
            {(featureCards.length ? featureCards : defaultCards()).map((card, index) => (
              <div
                key={`${card.label}-${index}`}
                className="p-3"
                style={{ background: surface, border: `1px solid ${border}`, borderRadius: radius }}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="block h-1.5 w-8 rounded-full"
                    style={{ background: primary, opacity: 0.85 }}
                  />
                  {index === 0 ? (
                    <span
                      className="h-1.5 w-3 rounded-full"
                      style={{ background: accent, opacity: 0.9 }}
                    />
                  ) : null}
                </span>
                <p className="mt-2 text-[10px] font-semibold" style={{ color: text, fontFamily: heading }}>
                  {card.label}
                </p>
                <p className="mt-1 text-[9px] leading-relaxed" style={{ color: muted }}>
                  {card.copy}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-2.5 text-center text-[8.5px] leading-relaxed" style={{ color: muted }}>
            This is the draft the tokens produce — the live portal keeps its current version until
            you publish from the Studio.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** `edu-campus` → `Edu Campus`, designed for real keys, not invented labels. */
function friendly(key: string): string {
  return key
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function shapeSummary(tokens: GlobalTokens): string {
  const pair = FONT_PAIRINGS.find((candidate) => candidate.heading === String(tokens.fontHeading ?? ''));
  const radius = String(tokens.borderRadius ?? 'rounded');
  const density =
    DENSITY_OPTIONS.find(
      (option) => String(option.tokens.contentMaxWidth) === String(tokens.contentMaxWidth ?? ''),
    )?.label ?? 'balanced';
  return [pair?.label ?? 'Site fonts', radius, density.toLowerCase()]
    .filter(Boolean)
    .join(' · ');
}

function radiusOf(value: unknown): number {
  switch (String(value ?? 'rounded')) {
    case 'none':
      return 2;
    case 'soft':
      return 8;
    case 'pill':
      return 999;
    default:
      return 16;
  }
}

function slugOf(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'your-workspace';
}

/** Honest fallback copy for the bench cards when nothing was toggled on. */
function defaultCards(): { label: string; copy: string }[] {
  return [
    { label: 'What we do', copy: 'The service in one honest sentence, readable at 4.5:1.' },
    { label: 'Who we serve', copy: 'The people this portal is actually for, every day.' },
  ];
}

function LoaderDot() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="absolute h-3 w-3 animate-ping rounded-full bg-white/60" />
      <span className="h-3 w-3 rounded-full bg-white/80" />
    </span>
  );
}
