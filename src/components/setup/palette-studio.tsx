'use client';

// studio/src/components/setup/palette-studio.tsx
//
// THE STYLE STEP, BUILT LIKE AN ACTUAL STUDIO.
//
// Two ways through it, because two kinds of people arrive:
//
//  • Most clients want one colour and a site that works. They set a brand
//    colour — or accept the one the wizard already inferred from the template
//    they just picked — and every surface, border and ink is derived, kept
//    readable by construction.
//  • Someone who thinks in tokens can switch derivation off and drive each
//    variable directly, including the raw values below the fold.
//
// Both paths write the same ordinary global design tokens the compiled portal
// already reads. Nothing here is a new backend concept: theme, primaryColor,
// surfaceColor, fontHeading, borderRadius, contentMaxWidth and friends are the
// contract, validated by the client mirror of the backend's rules before the
// wizard lets you leave the card.

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, RotateCcw, SlidersHorizontal, Sparkles, Type } from 'lucide-react';

import type { GlobalTokens } from '@/lib/contract';
import {
  DENSITY_OPTIONS,
  FONT_PAIRINGS,
  RADIUS_OPTIONS,
  asHex,
  contrastReport,
  deriveTokens,
  hexToHsl,
  hslToHex,
  nameColor,
  seedPalette,
  type SeedCandidate,
} from '@/lib/palette';
import { SETUP_TOKENS } from '@/lib/setup-flow';
import { validateTokenValue } from '@/lib/validate';
import { cn } from '@/lib/utils';
import { FlowGlyph } from './icon-bridge';
import { Field, TextInput } from '@/components/ui/input';
import { ColorInput, Segmented } from '@/components/ui/controls';

type ThemeChoice = 'light' | 'dark' | 'system';

/** Which tokens this card is responsible for. Everything else is untouched. */
const CONTROLLED_KEYS = [
  'theme',
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'backgroundColor',
  'surfaceColor',
  'borderColor',
  'textColor',
  'mutedTextColor',
  'borderRadius',
  'fontHeading',
  'fontBody',
  'contentMaxWidth',
  'sectionSpacing',
  'gridGutter',
] as const;

const DERIVED_KEYS = [
  'backgroundColor',
  'surfaceColor',
  'borderColor',
  'textColor',
  'mutedTextColor',
] as const;

const HARMONIES: { key: string; label: string; shift: number }[] = [
  { key: 'analogous', label: 'Analogous', shift: 32 },
  { key: 'complement', label: 'Complement', shift: 180 },
  { key: 'triad', label: 'Triad', shift: 120 },
  { key: 'split', label: 'Split', shift: 150 },
];

export function PaletteStudio({
  tokens,
  onChange,
  seedCandidates,
  accent,
}: {
  tokens: GlobalTokens;
  onChange: (patch: GlobalTokens) => void;
  /** The signals the palette can be inferred from, strongest last. */
  seedCandidates: SeedCandidate[];
  accent: { primary: string; secondary: string };
}) {
  const seed = useMemo(() => seedPalette(seedCandidates), [seedCandidates]);
  const [auto, setAuto] = useState(() => !hasFullPalette(tokens));
  const [showRaw, setShowRaw] = useState(false);

  const primary = asHex(tokens.primaryColor, seed?.primary ?? accent.primary);
  const secondary = asHex(tokens.secondaryColor, primary);
  const accentColor = asHex(tokens.accentColor, secondary);
  const theme = (tokens.theme === 'dark' ? 'dark' : tokens.theme === 'system' ? 'system' : 'light') as ThemeChoice;
  const deriveTheme = theme === 'system' ? 'light' : theme;

  // The first time the card opens, the inferred brand *is* the answer — a
  // client should never start from an empty colour field when the wizard
  // already knows what their template and track look like.
  useEffect(() => {
    if (!seed || tokens.primaryColor) return;
    onChange({ ...seed.tokens, [SETUP_TOKENS.paletteSource]: seed.source });
    // Seeding is a mount-time event; later edits must not resurrect it.
  }, [seed, tokens.primaryColor, onChange]);

  const write = (patch: GlobalTokens) => {
    if (!auto) {
      onChange(patch);
      return;
    }
    // Derivation stays in *this* card's scope: the brand trio and theme drive
    // the chrome, and the client's own surfaces are recomputed only when they
    // are still derivation-shaped (never a hand-picked colour they set).
    const brand = {
      primary: asHex(patch.primaryColor ?? primary),
      secondary: asHex(patch.secondaryColor ?? secondary),
      accent: asHex(patch.accentColor ?? accentColor),
      theme: (patch.theme ? patch.theme === 'dark' ? 'dark' : 'light' : deriveTheme) as 'light' | 'dark',
    };
    onChange({ ...patch, ...deriveTokens(brand) });
  };

  const setBrand = (key: 'primaryColor' | 'secondaryColor' | 'accentColor', value: string) =>
    write({ [key]: value });

  const harmonise = (hueShift: number) => {
    const hsl = hexToHsl(primary) ?? { h: 244, s: 0.7, l: 0.55 };
    const support = hslToHex({ ...hsl, h: hsl.h + hueShift, s: Math.min(1, hsl.s * 0.95) });
    const highlight = hslToHex({ ...hsl, h: hsl.h + hueShift + 18, l: Math.min(0.72, hsl.l + 0.12) });
    write({ secondaryColor: support, accentColor: highlight });
  };

  const report = contrastReport(tokens);
  const failures = report.filter((row) => row.grade === 'low' || row.grade === 'large');
  const radius = String(tokens.borderRadius ?? 'rounded');
  const density = densityOf(tokens);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      {/* ── Controls ── */}
      <div className="space-y-5">
        {/* Inferred brand */}
        <div className="rounded-2xl border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_50%,transparent)] p-3.5">
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              <Sparkles size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-snug">
                {nameColor(primary)} brand
                <span className="ml-2 font-mono text-[10px] font-normal text-[var(--color-ink-faint)]">
                  {primary.toUpperCase()}
                </span>
              </p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-[var(--color-ink-faint)]">
                {seed
                  ? `Inferred from ${seed.source}. Everything below is derived from it — and every one of them is yours to change.`
                  : 'This workspace has no brand colour yet. Pick one and the surfaces follow.'}
              </p>
            </div>
            {seed ? (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...seed.tokens, [SETUP_TOKENS.paletteSource]: seed.source })
                }
                className="focus-ring shrink-0 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[10px] text-[var(--color-ink-dim)] hover:border-[var(--color-line-strong)]"
              >
                <RotateCcw size={10} className="mr-1 inline" />
                Reset to inferred
              </button>
            ) : null}
          </div>
        </div>

        {/* Brand trio + tuner */}
        <Group title="Brand colours" icon="palette">
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ['primaryColor', 'Primary'],
                ['secondaryColor', 'Secondary'],
                ['accentColor', 'Accent'],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label} hint={key}>
                <ColorInput
                  value={String(tokens[key] ?? '')}
                  onChange={(value) => setBrand(key, value)}
                />
              </Field>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <HueSlider
              label="Hue"
              value={hexToHsl(primary)?.h ?? 0}
              onChange={(h) => {
                const hsl = hexToHsl(primary) ?? { h, s: 0.7, l: 0.55 };
                write({ primaryColor: hslToHex({ ...hsl, h }) });
              }}
            />
            <HueSlider
              label="Saturation"
              value={Math.round((hexToHsl(primary)?.s ?? 0.7) * 100)}
              max={100}
              suffix="%"
              onChange={(s) => {
                const hsl = hexToHsl(primary) ?? { h: 244, s: s / 100, l: 0.55 };
                write({ primaryColor: hslToHex({ ...hsl, s: s / 100 }) });
              }}
            />
            <HueSlider
              label="Depth"
              value={Math.round((hexToHsl(primary)?.l ?? 0.55) * 100)}
              max={100}
              suffix="%"
              onChange={(l) => {
                const hsl = hexToHsl(primary) ?? { h: 244, s: 0.7, l: l / 100 };
                write({ primaryColor: hslToHex({ ...hsl, l: l / 100 }) });
              }}
            />
          </div>

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Harmony
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {HARMONIES.map((harmony) => (
                <button
                  key={harmony.key}
                  type="button"
                  onClick={() => harmonise(harmony.shift)}
                  className="focus-ring group inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[10.5px] transition-colors hover:border-[var(--color-line-strong)]"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      background: hslToHex({
                        h: (hexToHsl(primary)?.h ?? 0) + harmony.shift,
                        s: hexToHsl(primary)?.s ?? 0.7,
                        l: 0.52,
                      }),
                    }}
                  />
                  {harmony.label}
                </button>
              ))}
            </div>
          </div>
        </Group>

        {/* Theme + derivation */}
        <Group title="Surface behaviour" icon="contrast">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented<ThemeChoice>
              value={theme}
              onChange={(next) => write({ theme: next })}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
            <button
              type="button"
              onClick={() => setAuto((v) => !v)}
              className={cn(
                'focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] font-medium transition-colors',
                auto
                  ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)]'
                  : 'border-[var(--color-line)] text-[var(--color-ink-dim)]',
              )}
            >
              {auto ? <Check size={11} /> : <SlidersHorizontal size={11} />}
              {auto ? 'Auto-deriving surfaces' : 'Driving tokens manually'}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DERIVED_KEYS.map((key) => (
              <Field key={key} label={labelFor(key)} hint={key}>
                <ColorInput
                  value={String(tokens[key] ?? '')}
                  onChange={(value) => {
                    setAuto(false);
                    onChange({ [key]: value });
                  }}
                />
              </Field>
            ))}
          </div>

          {auto ? (
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
              These five follow the brand colour while auto-derivation is on. Editing one switches
              the card to manual so your choice is never overwritten.
            </p>
          ) : null}
        </Group>

        {/* Type, shape, density */}
        <Group title="Type, shape and rhythm" icon="type">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Font pairing" hint="fontHeading / fontBody">
              <div className="space-y-1.5">
                {FONT_PAIRINGS.map((pair) => {
                  const active = pair.heading === String(tokens.fontHeading ?? '');
                  return (
                    <button
                      key={pair.key}
                      type="button"
                      onClick={() => onChange({ fontHeading: pair.heading, fontBody: pair.body })}
                      className={cn(
                        'focus-ring flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                        active
                          ? 'border-[var(--color-accent)]/55 bg-[color-mix(in_oklab,var(--color-accent)_9%,transparent)]'
                          : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                      )}
                    >
                      <span>
                        <span
                          className="block text-[12px] font-semibold leading-snug"
                          style={{ fontFamily: pair.heading }}
                        >
                          {pair.label}
                        </span>
                        <span
                          className="mt-0.5 block text-[9.5px] text-[var(--color-ink-faint)]"
                          style={{ fontFamily: pair.body }}
                        >
                          The quickest way to say what you do.
                        </span>
                      </span>
                      {active ? <Type size={13} className="text-[var(--color-accent)]" /> : null}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="space-y-4">
              <Field label="Corner radius" hint="borderRadius">
                <div className="flex flex-wrap gap-1.5">
                  {RADIUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onChange({ borderRadius: option })}
                      className={cn(
                        'focus-ring rounded-lg border px-3 py-1.5 text-[10.5px] font-medium capitalize transition-colors',
                        radius === option
                          ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)]'
                          : 'border-[var(--color-line)] text-[var(--color-ink-dim)]',
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Density" hint="contentMaxWidth / sectionSpacing / gridGutter">
                <div className="flex flex-wrap gap-1.5">
                  {DENSITY_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => onChange({ ...option.tokens })}
                      className={cn(
                        'focus-ring rounded-lg border px-3 py-1.5 text-[10.5px] font-medium transition-colors',
                        density === option.key
                          ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)]'
                          : 'border-[var(--color-line)] text-[var(--color-ink-dim)]',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Site name" hint="siteName — shown in the portal header">
                <TextInput
                  value={String(tokens.siteName ?? '')}
                  maxLength={120}
                  onChange={(event) => onChange({ siteName: event.target.value })}
                />
              </Field>
            </div>
          </div>
        </Group>

        {/* Raw tokens */}
        <div className="rounded-2xl border border-[var(--color-line)]">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="focus-ring flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
          >
            <span className="text-[11px] font-semibold">
              Raw token values
              <span className="ml-2 font-normal text-[var(--color-ink-faint)]">
                {CONTROLLED_KEYS.length} tokens
              </span>
            </span>
            <span className="text-[10px] text-[var(--color-accent)]">
              {showRaw ? 'hide' : 'inspect'}
            </span>
          </button>
          {showRaw ? (
            <div className="grid gap-2.5 border-t border-[var(--color-line)] p-3.5 sm:grid-cols-2">
              {CONTROLLED_KEYS.map((key) => {
                const value = String(tokens[key] ?? '');
                const problem = value ? validateTokenValue(key, value) : null;
                return (
                  <Field
                    key={key}
                    label={labelFor(key)}
                    hint={problem ?? `--portal-${kebab(key)}`}
                    error={problem}
                  >
                    <TextInput
                      value={value}
                      onChange={(event) => onChange({ [key]: event.target.value })}
                      className={cn('font-mono text-[11px]', problem && 'border-[var(--color-danger)]')}
                    />
                  </Field>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Preview + legibility ── */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <StyleStage tokens={tokens} accent={accent} />

        <div className="surface-glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            Legibility
          </p>
          <ul className="mt-2 space-y-1.5">
            {report.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[10.5px] text-[var(--color-ink-dim)]">
                  {row.label}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]',
                    row.grade === 'aaa' &&
                      'border-[var(--color-success)]/50 text-[var(--color-success)]',
                    row.grade === 'aa' && 'border-[var(--color-line-strong)] text-[var(--color-ink-dim)]',
                    row.grade === 'large' && 'border-[var(--color-warn)]/50 text-[var(--color-warn)]',
                    row.grade === 'low' && 'border-[var(--color-danger)]/50 text-[var(--color-danger)]',
                  )}
                >
                  {row.ratio.toFixed(1)} · {row.grade}
                </span>
              </li>
            ))}
          </ul>
          {failures.length ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--color-warn)]/35 bg-[color-mix(in_oklab,var(--color-warn)_9%,transparent)] px-2.5 py-2">
              <p className="text-[10px] leading-relaxed text-[var(--color-ink-dim)]">
                {failures.length === 1
                  ? 'One pairing is below the comfortable reading floor.'
                  : `${failures.length} pairings are below the comfortable reading floor.`}{' '}
                <button
                  type="button"
                  onClick={() => {
                    const brand = deriveTokens({
                      primary,
                      secondary,
                      accent: accentColor,
                      theme: deriveTheme,
                    });
                    onChange({
                      textColor: brand.textColor,
                      mutedTextColor: brand.mutedTextColor,
                    });
                  }}
                  className="font-semibold text-[var(--color-accent)] underline-offset-2 hover:underline"
                >
                  Fix the inks
                </button>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-[var(--color-ink-faint)]">
              Every pairing passes AA. Body text passes AAA.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-parts ───────────────────────────────────────────────────────────────

function Group({
  title,
  icon,
  children,
}: {
  title: string;
  icon: 'palette' | 'contrast' | 'type';
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-glass rounded-2xl p-4"
    >
      <header className="mb-3.5 flex items-center gap-2">
        <FlowGlyph name={icon} size={13} className="text-[var(--color-accent)]" />
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
          {title}
        </h3>
      </header>
      {children}
    </motion.section>
  );
}

function HueSlider({
  label,
  value,
  max = 360,
  suffix = '°',
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[10.5px] text-[var(--color-ink-dim)]">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-accent)]"
      />
      <span className="w-12 shrink-0 text-right font-mono text-[10px] text-[var(--color-ink-faint)]">
        {Math.round(value)}
        {suffix}
      </span>
    </label>
  );
}

/** The live portal mock, painted from the tokens as they stand. */
function StyleStage({
  tokens,
  accent,
}: {
  tokens: GlobalTokens;
  accent: { primary: string; secondary: string };
}) {
  const background = String(tokens.backgroundColor ?? '#ffffff');
  const surface = String(tokens.surfaceColor ?? '#f1f5f9');
  const text = String(tokens.textColor ?? '#0f172a');
  const muted = String(tokens.mutedTextColor ?? '#475569');
  const border = String(tokens.borderColor ?? '#e2e8f0');
  const primary = asHex(tokens.primaryColor, accent.primary);
  const secondary = asHex(tokens.secondaryColor, primary);
  const radius = radiusOf(tokens.borderRadius);
  const heading = String(tokens.fontHeading ?? 'system-ui, sans-serif');
  const body = String(tokens.fontBody ?? 'system-ui, sans-serif');
  const maxWidth = String(tokens.contentMaxWidth ?? '76rem');
  const gutter = String(tokens.gridGutter ?? '1.5rem');

  return (
    <div className="surface-glass overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-2.5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-faint)]">
          Your portal, right now
        </p>
        <p className="font-mono text-[9px] text-[var(--color-ink-faint)]">max {maxWidth}</p>
      </div>
      <div className="p-4" style={{ background }}>
        <div
          className="mx-auto space-y-3"
          style={{ maxWidth: 460, fontFamily: body }}
        >
          <div
            className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ background: surface, border: `1px solid ${border}` }}
          >
            <span className="text-[11px] font-semibold" style={{ color: text, fontFamily: heading }}>
              {String(tokens.siteName ?? 'Your workspace')}
            </span>
            <span className="flex gap-2 text-[8.5px]" style={{ color: muted }}>
              <span>Home</span>
              <span>About</span>
              <span>Contact</span>
            </span>
          </div>

          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              borderRadius: radius,
            }}
          >
            <div className="p-4">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.22em] text-white/75">
                {String(tokens.tagline ? 'Message' : 'Headline')}
              </p>
              <p
                className="mt-1.5 text-balance text-[15px] font-semibold leading-snug text-white"
                style={{ fontFamily: heading }}
              >
                {String(tokens.tagline ?? 'A headline that sounds like you.')}
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

          <div className="grid grid-cols-2" style={{ gap: gutter }}>
            {['Card one', 'Card two'].map((label) => (
              <div
                key={label}
                className="rounded-xl p-3"
                style={{ background: surface, border: `1px solid ${border}`, borderRadius: radius }}
              >
                <span
                  className="block h-1.5 w-10 rounded-full"
                  style={{ background: primary, opacity: 0.85 }}
                />
                <p className="mt-2 text-[10px] font-semibold" style={{ color: text }}>
                  {label}
                </p>
                <p className="mt-1 text-[9px] leading-relaxed" style={{ color: muted }}>
                  Supporting copy stays readable at every size.
                </p>
              </div>
            ))}
          </div>

          <p className="text-[9px] leading-relaxed" style={{ color: muted }}>
            Muted text on the page background is the pairing most portals get wrong — this one is
            measured above.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelFor(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function kebab(key: string): string {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
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

function densityOf(tokens: GlobalTokens): string | null {
  const match = DENSITY_OPTIONS.find(
    (option) => String(option.tokens.contentMaxWidth) === String(tokens.contentMaxWidth ?? ''),
  );
  return match?.key ?? null;
}

/** A token map already carries a real palette when the surfaces are set. */
function hasFullPalette(tokens: GlobalTokens): boolean {
  return Boolean(tokens.primaryColor && tokens.backgroundColor && tokens.textColor);
}
