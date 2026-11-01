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
// The room is arranged like a fitting bench: the numbered tool rail sits on
// the left, the browser-framed live portal sits on the right (pinned, with a
// token strip and a contrast lab beneath it), and a maximise control opens the
// whole bench again in a full-width sheet for serious tuning.
//
// All paths write the same ordinary global design tokens the compiled portal
// already reads. Nothing here is a new backend concept: theme, primaryColor,
// surfaceColor, fontHeading, borderRadius, contentMaxWidth and friends are the
// contract, validated by the client mirror of the backend's rules before the
// wizard lets you leave the card.

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  Copy,
  Maximize2,
  Monitor,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Type,
} from 'lucide-react';

import type { GlobalTokens } from '@/lib/contract';
import {
  CONTRAST_CHECKS,
  DENSITY_OPTIONS,
  FONT_PAIRINGS,
  RADIUS_OPTIONS,
  asHex,
  contrastReport,
  deriveTokens,
  hexToHsl,
  hslToHex,
  isColorToken,
  luminance,
  nameColor,
  seedPalette,
  type SeedCandidate,
} from '@/lib/palette';
import { SETUP_TOKENS } from '@/lib/setup-flow';
import { validateTokenValue } from '@/lib/validate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Field, TextInput } from '@/components/ui/input';
import { ColorInput, Segmented } from '@/components/ui/controls';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { HARMONIES, HoloWheel } from './color-wheel';

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
  'siteName',
  'tagline',
  'logoUrl',
] as const;

const DERIVED_KEYS = [
  'backgroundColor',
  'surfaceColor',
  'borderColor',
  'textColor',
  'mutedTextColor',
] as const;

/** Curated starting points, not a lock-in: a recipe only writes the brand
 *  trio and theme, so the derivation (or the client) still owns everything
 *  else. Each one already clears AA on its own surfaces by construction. */
const ATELIER_RECIPES: {
  key: string;
  label: string;
  vibe: string;
  primary: string;
  secondary: string;
  accent: string;
  theme: 'light' | 'dark';
}[] = [
  { key: 'aurora', label: 'Aurora', vibe: 'violet · cyan', primary: '#6d28d9', secondary: '#0ea5e9', accent: '#22d3ee', theme: 'light' },
  { key: 'ember', label: 'Ember', vibe: 'crimson · amber', primary: '#b91c1c', secondary: '#f59e0b', accent: '#fbbf24', theme: 'light' },
  { key: 'tidal', label: 'Tidal', vibe: 'teal · deep sea', primary: '#0f766e', secondary: '#0369a1', accent: '#2dd4bf', theme: 'light' },
  { key: 'midnight', label: 'Midnight', vibe: 'rose · violet', primary: '#f43f5e', secondary: '#8b5cf6', accent: '#fb7185', theme: 'dark' },
  { key: 'grove', label: 'Grove', vibe: 'green · lime', primary: '#15803d', secondary: '#84cc16', accent: '#a3e635', theme: 'light' },
  { key: 'clay', label: 'Clay', vibe: 'terracotta · sand', primary: '#c2410c', secondary: '#d97706', accent: '#f59e0b', theme: 'light' },
];

const SHADE_STEPS = [0.97, 0.92, 0.84, 0.75, 0.66, 0.56, 0.46, 0.36, 0.26, 0.17];
const SHADE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

/** The strip cells, in "system" order: canvas first, brand last. */
const STRIP_KEYS = [
  'backgroundColor',
  'surfaceColor',
  'borderColor',
  'textColor',
  'mutedTextColor',
  'primaryColor',
  'secondaryColor',
  'accentColor',
] as const;

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
  const seedInfo = seedPalette(seedCandidates);
  const [auto, setAuto] = useState(() => !hasFullPalette(tokens));
  const [showRaw, setShowRaw] = useState(false);
  const [maximized, setMaximized] = useState(false);

  const primary = asHex(tokens.primaryColor, seedInfo?.primary ?? accent.primary);
  const secondary = asHex(tokens.secondaryColor, primary);
  const accentColor = asHex(tokens.accentColor, secondary);
  const theme = (tokens.theme === 'dark' ? 'dark' : tokens.theme === 'system' ? 'system' : 'light') as ThemeChoice;
  const deriveTheme = theme === 'system' ? 'light' : theme;

  // The first time the card opens, the inferred brand *is* the answer — a
  // client should never start from an empty colour field when the wizard
  // already knows what their template and track look like.
  useEffect(() => {
    if (!seedInfo) return;
    if (tokens.primaryColor) return;
    onChange({ ...seedInfo.tokens, [SETUP_TOKENS.paletteSource]: seedInfo.source });
    // Seeding is a mount-time event; later edits must not resurrect it.
  }, [seedInfo, tokens.primaryColor, onChange]);

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

  // The wheel drives the primary through real HSL channels, so both handlers
  // write through the same derivation the swatches do.
  const primaryHsl = hexToHsl(primary) ?? { h: 244, s: 0.7, l: 0.55 };
  const shades = SHADE_STEPS.map((l) => hslToHex({ ...primaryHsl, l }));

  const cssPreview = CONTROLLED_KEYS.slice(0, 3)
    .map((key) => `  --${key}: ${String(tokens[key] ?? '')};`)
    .join('\n');

  const copyExport = (format: 'css' | 'json') => {
    const output =
      format === 'css'
        ? `:root {\n${CONTROLLED_KEYS.map(
            (key) => `  --${key}: ${String(tokens[key] ?? '')};`,
          ).join('\n')}\n}`
        : JSON.stringify(
            Object.fromEntries(CONTROLLED_KEYS.map((key) => [key, tokens[key] ?? ''])),
            null,
            2,
          );
    const announce = () =>
      toast.success(`Copied ${CONTROLLED_KEYS.length} tokens as ${format.toUpperCase()}`);

    // The async Clipboard API needs a user gesture and a granted permission.
    // When either is missing (embedded webviews, locked-down browsers), fall
    // back to the selection-based copy before telling the user anything.
    const fallbackCopy = () => {
      const area = document.createElement('textarea');
      area.value = output;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.inset = '0 auto auto -9999px';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      area.remove();
      if (ok) {
        announce();
      } else {
        toast.error('The clipboard is locked', {
          description: 'The token block above is selectable — copy it by hand.',
        });
      }
    };

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      fallbackCopy();
      return;
    }
    void navigator.clipboard.writeText(output).then(announce, fallbackCopy);
  };

  const report = contrastReport(tokens);
  const failures = report.filter((row) => row.grade === 'low' || row.grade === 'large');
  const radius = String(tokens.borderRadius ?? 'rounded');
  const density = densityOf(tokens);

  const openStudio = () => setMaximized(true);

  const fixInks = () => {
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
  };

  /** The bench: portal stage, token strip, contrast lab. Rendered beside the
   *  rail on the step card, and again inside the maximised sheet. */
  const stageCore = (
    <>
      <PortalStage
        tokens={tokens}
        accent={{ primary, secondary }}
        onMaximize={openStudio}
      />
      <TokenStrip tokens={tokens} />
      <ContrastLab tokens={tokens} report={report} failures={failures} onFix={fixInks} />
    </>
  );

  /** The full tool rail — panels 01..04 plus the inspector. */
  const railPanels = (
    <>
      {/* 01 · Brand trio */}
      <Panel index="01" title="Brand colours">
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              ['Primary', 'primaryColor'],
              ['Secondary', 'secondaryColor'],
              ['Accent', 'accentColor'],
            ] as const
          ).map(([label, key]) => (
            <BrandSlot
              key={key}
              label={label}
              value={String(tokens[key] ?? '')}
              onChange={(value) => setBrand(key, value)}
            />
          ))}
        </div>
      </Panel>

      {/* 02 · The wheel — hue ring, depth pad, harmony orbit */}
      <Panel index="02" title="The colour wheel">
        <div className="flex items-center gap-5">
          <HoloWheel
            primary={primary}
            onHue={(h) => write({ primaryColor: hslToHex({ ...primaryHsl, h }) })}
            onSl={(s, l) => write({ primaryColor: hslToHex({ ...primaryHsl, s, l }) })}
            onHarmony={harmonise}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[20px] font-semibold tracking-tight">
              {nameColor(primary)}
            </p>
            <p className="mt-1 font-mono text-[11.5px] uppercase tracking-[0.16em] text-[var(--color-ink-dim)]">
              {primary.toUpperCase()}
            </p>
            <p className="mt-2.5 text-[9.5px] leading-relaxed text-[var(--color-ink-faint)]">
              Drag the ring for hue; the pad inside sets saturation and depth. Every write re-derives
              the surfaces while auto is on.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            Harmony recipes
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {HARMONIES.map((harmony) => {
              const target = hslToHex({
                h: primaryHsl.h + harmony.shift,
                s: primaryHsl.s,
                l: 0.52,
              });
              return (
                <button
                  key={harmony.key}
                  type="button"
                  onClick={() => harmonise(harmony.shift)}
                  title={`Move the support colours to hue ${Math.round((primaryHsl.h + harmony.shift) % 360)}°`}
                  className="focus-ring group inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] py-1 pl-1.5 pr-2.5 text-[10.5px] font-medium transition-colors hover:border-[var(--color-line-strong)]"
                >
                  {/* The pair the recipe produces: incumbent → target */}
                  <span className="relative flex items-center">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ background: primary }}
                    />
                    <span
                      className="-ml-1.5 h-3.5 w-3.5 rounded-full ring-2 ring-[var(--color-panel)]"
                      style={{ background: target }}
                    />
                  </span>
                  {harmony.label}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* 03 · Surfaces — theme + derivation */}
      <Panel index="03" title="Surface behaviour">
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
                ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)] text-[var(--color-ink)]'
                : 'border-[var(--color-line)] text-[var(--color-ink-dim)]',
            )}
          >
            {auto ? <Check size={11} /> : <SlidersHorizontal size={11} />}
            {auto ? 'Auto-deriving surfaces' : 'Driving tokens manually'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DERIVED_KEYS.map((key) => (
            <div key={key} className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[10px] text-[var(--color-ink-dim)]">
                  {labelFor(key)}
                </span>
                {auto ? (
                  <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                    auto
                  </span>
                ) : null}
              </div>
              <ColorInput
                value={String(tokens[key] ?? '')}
                onChange={(value) => {
                  setAuto(false);
                  onChange({ [key]: value });
                }}
              />
            </div>
          ))}
        </div>

        {auto ? (
          <p className="mt-3 text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
            These five follow the brand colour while auto-derivation is on. Editing one switches
            the card to manual so your choice is never overwritten.
          </p>
        ) : null}
      </Panel>

      {/* 04 · Type, shape, rhythm */}
      <Panel index="04" title="Type, shape and rhythm">
        <div className="grid gap-2 sm:grid-cols-2">
          {FONT_PAIRINGS.map((pair) => {
            const active = pair.heading === String(tokens.fontHeading ?? '');
            return (
              <button
                key={pair.key}
                type="button"
                onClick={() => onChange({ fontHeading: pair.heading, fontBody: pair.body })}
                className={cn(
                  'focus-ring relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_8%,transparent)]'
                    : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="palette-font-bar"
                    className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full"
                    style={{ background: primary }}
                  />
                ) : null}
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)]"
                  style={{ fontFamily: pair.heading }}
                >
                  <span className="text-[16px] font-semibold leading-none">Ag</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[11.5px] font-semibold"
                    style={{ fontFamily: pair.heading }}
                  >
                    {pair.label}
                  </span>
                  <span
                    className="mt-0.5 block truncate text-[9.5px] text-[var(--color-ink-faint)]"
                    style={{ fontFamily: pair.body }}
                  >
                    Rendered, not just named.
                  </span>
                </span>
                {active ? (
                  <Type size={13} className="shrink-0 text-[var(--color-accent)]" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Corner radius
            </p>
            <div className="mt-1.5 flex gap-1.5">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange({ borderRadius: option })}
                  className={cn(
                    'focus-ring flex flex-col items-center gap-1 rounded-xl border px-2.5 py-1.5 transition-colors',
                    radius === option
                      ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]'
                      : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                  )}
                >
                  {/* The option drawn as the shape it installs */}
                  <span
                    className="h-5 w-5 border border-[var(--color-ink-faint)] bg-[var(--color-panel-2)]"
                    style={{ borderRadius: SHAPE_RADIUS[option] }}
                  />
                  <span className="text-[8.5px] font-medium capitalize">{option}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Density
            </p>
            <div className="mt-1.5 flex gap-1.5">
              {DENSITY_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onChange({ ...option.tokens })}
                  className={cn(
                    'focus-ring flex flex-col items-center gap-1 rounded-xl border px-2.5 py-1.5 transition-colors',
                    density === option.key
                      ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]'
                      : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                  )}
                >
                  <DensityThumb keyName={option.key} />
                  <span className="text-[8.5px] font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <Field label="Site name" hint="siteName — shown in the portal header">
            <TextInput
              value={String(tokens.siteName ?? '')}
              maxLength={120}
              onChange={(event) => onChange({ siteName: event.target.value })}
            />
          </Field>
          <Field label="Tagline" hint="tagline — the sentence under your name">
            <TextInput
              value={String(tokens.tagline ?? '')}
              maxLength={240}
              onChange={(event) => onChange({ tagline: event.target.value })}
            />
          </Field>
          <Field
            label="Logo URL"
            hint="logoUrl — https:// or a root-relative path"
            error={tokens.logoUrl ? validateTokenValue('logoUrl', String(tokens.logoUrl)) : null}
          >
            <TextInput
              value={String(tokens.logoUrl ?? '')}
              maxLength={2048}
              placeholder="https://cdn.example.com/logo.svg or /brand/logo.svg"
              onChange={(event) => onChange({ logoUrl: event.target.value })}
            />
          </Field>
        </div>
      </Panel>

      {/* 05 · Atelier — recipes, the primary ladder and a portable copy */}
      <Panel index="05" title="Atelier, ladder and export">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Brand recipes
            </p>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
              {ATELIER_RECIPES.length} sets
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-ink-dim)]">
            A whole brand in one click. The trio and theme change; surfaces and inks are re-derived
            around them.
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {ATELIER_RECIPES.map((recipe) => {
              const active = primary.toLowerCase() === recipe.primary.toLowerCase();
              return (
                <button
                  key={recipe.key}
                  type="button"
                  onClick={() => {
                    write({
                      primaryColor: recipe.primary,
                      secondaryColor: recipe.secondary,
                      accentColor: recipe.accent,
                      theme: recipe.theme,
                    });
                    toast(`${recipe.label} recipe applied`, {
                      description: auto
                        ? 'Surfaces and inks were re-derived around the new brand.'
                        : 'Brand trio written; your hand-set surfaces were left untouched.',
                    });
                  }}
                  className={cn(
                    'focus-ring group overflow-hidden rounded-xl border text-left transition-all hover:-translate-y-0.5',
                    active
                      ? 'border-[var(--color-accent)]/60 ring-1 ring-[var(--color-accent)]/25'
                      : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                  )}
                >
                  <span
                    className="relative block h-8"
                    style={{
                      background: `linear-gradient(100deg, ${recipe.primary}, ${recipe.secondary} 64%, ${recipe.accent})`,
                    }}
                  >
                    <span className="absolute inset-0 bg-[radial-gradient(120%_100%_at_10%_0%,rgba(255,255,255,0.34),transparent_58%)]" />
                    {active ? (
                      <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-black/35 text-white">
                        <Check size={9} />
                      </span>
                    ) : null}
                  </span>
                  <span className="block px-2.5 py-1.5">
                    <span className="block truncate text-[10.5px] font-semibold">{recipe.label}</span>
                    <span className="block truncate text-[8.5px] text-[var(--color-ink-faint)]">
                      {recipe.vibe}
                      {recipe.theme === 'dark' ? ' · dark' : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Primary shade ladder
            </p>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
              click → accent
            </span>
          </div>
          <div
            className="mt-2 grid grid-cols-10 overflow-hidden rounded-lg border border-[var(--color-line)]"
            role="group"
            aria-label="Primary shade ladder — pick the accent"
          >
            {shades.map((shade, index) => {
              const selected = accentColor.toLowerCase() === shade.toLowerCase();
              return (
                <button
                  key={`${shade}-${index}`}
                  type="button"
                  onClick={() => write({ accentColor: shade })}
                  title={`${shade.toUpperCase()} · ${nameColor(shade)}`}
                  className="group relative h-14 transition-transform hover:scale-y-105"
                  style={{ background: shade }}
                >
                  <span
                    className="absolute inset-x-0 top-1 text-center font-mono text-[6px] font-semibold uppercase"
                    style={{
                      color:
                        luminance(shade) > 0.4
                          ? 'rgba(15,23,42,0.55)'
                          : 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {SHADE_LABELS[index]}
                  </span>
                  {selected ? (
                    <span className="absolute inset-x-0.5 bottom-1 rounded-sm bg-black/55 py-0.5 text-center font-mono text-[5.5px] font-semibold uppercase tracking-wider text-white">
                      accent
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
            <span>tint</span>
            <span>{primary.toUpperCase()}</span>
            <span>shade</span>
          </p>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Take it with you
            </p>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
              {CONTROLLED_KEYS.length} tokens
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-ink-dim)]">
            The raw token names and values, ready for a handoff doc or another workspace.
          </p>
          <pre className="mt-2 max-h-[86px] overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2 font-mono text-[8.5px] leading-relaxed text-[var(--color-ink-dim)]">
            {`:root {\n${cssPreview}\n  …\n}`}
          </pre>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['css', 'json'] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => copyExport(format)}
                className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-line)] px-2.5 py-1.5 text-[10.5px] font-medium transition-colors hover:border-[var(--color-line-strong)] hover:bg-[var(--color-panel-2)]"
              >
                <Copy size={11} />
                Copy {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* Raw tokens — the inspector */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]">
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="focus-ring flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="text-[11px] font-semibold">
            Raw token values
            <span className="ml-2 font-mono text-[9px] font-normal uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
              {CONTROLLED_KEYS.length} keys
            </span>
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-accent)]">
            {showRaw ? 'hide' : 'inspect'}
          </span>
        </button>
        {showRaw ? (
          <div className="grid gap-2.5 border-t border-[var(--color-line)] p-4 sm:grid-cols-2">
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
    </>
  );

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:items-start">
        {/* ── The tool rail — left ─────────────────────────────────────────── */}
        <div className="order-2 min-w-0 space-y-4 lg:order-1">
          {/* Inferred brand signal */}
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_55%,transparent)] px-3.5 py-3">
            <span className="flex shrink-0 items-center">
              {[primary, secondary, accentColor].map((dot, index) => (
                <span
                  key={index}
                  className="-ml-1.5 h-4 w-4 rounded-full border border-white/60 shadow-sm first:ml-0 dark:border-black/40"
                  style={{ background: dot }}
                />
              ))}
            </span>
            <p className="min-w-0 flex-1 text-[10.5px] leading-snug text-[var(--color-ink-dim)]">
              {seedInfo ? (
                <>
                  Inferred from <span className="font-semibold">{seedInfo.source}</span>
                  <span className="text-[var(--color-ink-faint)]">
                    {' '}
                    — every surface follows, and each one stays yours to change.
                  </span>
                </>
              ) : (
                'This workspace has no brand colour yet. Pick one and the surfaces follow.'
              )}
            </p>
            {seedInfo ? (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...seedInfo.tokens, [SETUP_TOKENS.paletteSource]: seedInfo.source })
                }
                className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-line)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)]"
              >
                <RotateCcw size={10} />
                Reset
              </button>
            ) : null}
          </div>

          {railPanels}
        </div>

        {/* ── The bench — right, pinned ───────────────────────────────────── */}
        <div className="order-1 min-w-0 space-y-4 lg:sticky lg:top-6 lg:order-2 lg:self-start">
          {stageCore}

          {/* The maximiser: the whole bench opens full-width in a sheet */}
          <button
            type="button"
            onClick={openStudio}
            className="focus-ring group flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_60%,transparent)] px-4 py-3 text-left transition-colors hover:border-[var(--color-line-strong)]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
              >
                <Maximize2 size={13} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11.5px] font-semibold">
                  Open the full studio
                </span>
                <span className="mt-0.5 block truncate text-[9.5px] text-[var(--color-ink-faint)]">
                  The whole bench — wheel, surfaces, type and the live portal — at full width.
                </span>
              </span>
            </span>
            <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)] transition-colors group-hover:text-[var(--color-accent)]">
              maximise
            </span>
          </button>
        </div>
      </div>

      {/* ── The maximised studio sheet ────────────────────────────────────── */}
      <StudioSheet
        open={maximized}
        onClose={() => setMaximized(false)}
        primary={primary}
        secondary={secondary}
      >
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
          {/* The rail, full size */}
          <div className="order-2 min-w-0 space-y-4 lg:order-1">{railPanels}</div>

          {/* The bench, pinned beside it */}
          <div className="order-1 min-w-0 space-y-4 lg:sticky lg:top-2 lg:order-2 lg:self-start">
            {stageCore}

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] px-3.5 py-2.5">
              <p className="text-[9.5px] leading-snug text-[var(--color-ink-faint)]">
                Everything here is a live draft — the published site keeps serving until you
                commission it.
              </p>
              <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
                draft-only
              </span>
            </div>
          </div>
        </div>
      </StudioSheet>
    </>
  );
}

// ─── The maximised studio sheet ──────────────────────────────────────────────

/** A full-width bench sheet: the entire palette studio at `max-w-6xl`. */
function StudioSheet({
  open,
  onClose,
  primary,
  secondary,
  children,
}: {
  open: boolean;
  onClose: () => void;
  primary: string;
  secondary: string;
  children: React.ReactNode;
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
        aria-label="The palette studio, full width"
        className="flex w-full flex-col gap-0 rounded-none border-l border-[var(--color-line)] p-0 shadow-2xl data-[side=right]:w-full data-[side=right]:max-w-full data-[side=right]:sm:max-w-6xl bg-(--color-panel-solid) bg-[image:var(--color-panel)]"
      >
        {/* Header — the brand gradient carries the sheet identity */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              <Maximize2 size={16} />
            </span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
                Full bench
              </p>
              <p className="text-[15px] font-semibold tracking-tight">The palette studio</p>
            </div>
          </div>
          <div className="flex items-baseline gap-4">
            <p className="hidden max-w-[280px] text-right text-[9.5px] leading-relaxed text-[var(--color-ink-faint)] lg:block">
              Every change lands in the live portal the instant you make it — the bench and the
              tools share one state.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring shrink-0 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-[10px] font-medium text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)]"
            >
              Collapse
            </button>
          </div>
        </div>

        <div className="scroll-y min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5 sm:px-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── The stage ───────────────────────────────────────────────────────────────

/**
 * The live portal, browser-framed. Everything inside is painted from the tokens
 * as they stand — including the max width, gutter and corner radius — so a
 * client can see the whole system move, not just the hero. Flat by design: no
 * drop shadow, the frame carries itself.
 */
function PortalStage({
  tokens,
  accent,
  onMaximize,
}: {
  tokens: GlobalTokens;
  accent: { primary: string; secondary: string };
  onMaximize?: () => void;
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const reduced = useReducedMotion();

  const background = String(tokens.backgroundColor ?? '#ffffff');
  const surface = String(tokens.surfaceColor ?? '#f1f5f9');
  const text = String(tokens.textColor ?? '#0f172a');
  const muted = String(tokens.mutedTextColor ?? '#475569');
  const border = String(tokens.borderColor ?? '#e2e8f0');
  const primary = asHex(tokens.primaryColor, accent.primary);
  const secondary = asHex(tokens.secondaryColor, primary);
  const accentColor = asHex(tokens.accentColor, secondary);
  const radius = radiusOf(tokens.borderRadius);
  const heading = String(tokens.fontHeading ?? 'system-ui, sans-serif');
  const body = String(tokens.fontBody ?? 'system-ui, sans-serif');
  const gutter = String(tokens.gridGutter ?? '1.5rem');
  const siteName = String(tokens.siteName ?? 'Your workspace');
  const mockWidth = device === 'mobile' ? 286 : 480;

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
        <span className="inline-flex shrink-0 items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
          <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
            live
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
        {onMaximize ? (
          <button
            type="button"
            onClick={onMaximize}
            title="Open the full studio"
            className="focus-ring grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border border-[var(--color-line)] text-[var(--color-ink-faint)] transition-colors hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink-dim)]"
          >
            <Maximize2 size={10} />
          </button>
        ) : null}
        <span className="flex shrink-0 gap-1">
          {[primary, secondary, accentColor].map((dot, index) => (
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

          {/* Hero */}
          <div
            className="relative mt-2 overflow-hidden"
            style={{
              background: `linear-gradient(132deg, ${primary}, ${secondary})`,
              borderRadius: radius,
            }}
          >
            {!reduced ? (
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.2) 46%, transparent 62%)',
                }}
              />
            ) : null}
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

          {/* Cards, spaced by the gutter the density option installs */}
          <div className="mt-2 grid grid-cols-2" style={{ gap: gutter }}>
            {[
              { label: 'What we do', copy: 'The service in one honest sentence, readable at 4.5:1.' },
              { label: 'Who we serve', copy: 'The people this portal is actually for, every day.' },
            ].map((card, index) => (
              <div
                key={card.label}
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
                      style={{ background: accentColor, opacity: 0.9 }}
                    />
                  ) : null}
                </span>
                <p className="mt-2 text-[10px] font-semibold" style={{ color: text }}>
                  {card.label}
                </p>
                <p className="mt-1 text-[9px] leading-relaxed" style={{ color: muted }}>
                  {card.copy}
                </p>
              </div>
            ))}
          </div>

          {/* A form — surfaces and borders, live */}
          <div
            className="mt-2 p-3"
            style={{ background: surface, border: `1px solid ${border}`, borderRadius: radius }}
          >
            <p className="text-[10px] font-semibold" style={{ color: text, fontFamily: heading }}>
              Get in touch
            </p>
            <div
              className="mt-2 flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5"
              style={{ background, border: `1px solid ${border}` }}
            >
              <span className="text-[9px]" style={{ color: muted }}>
                you@example.com
              </span>
              <span
                className="px-2 py-0.5 text-[8.5px] font-semibold text-white"
                style={{ background: primary, borderRadius: Math.min(radius, 999) }}
              >
                Send
              </span>
            </div>
          </div>

          <p className="mt-2.5 text-center text-[8.5px] leading-relaxed" style={{ color: muted }}>
            Every colour, border and corner above is the palette being tuned right now.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

/** The whole token system as one connected band, in install order. */
function TokenStrip({ tokens }: { tokens: GlobalTokens }) {
  return (
    <div className="surface-glass rounded-2xl px-3.5 pb-3 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
          Token strip
        </p>
        <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
          8 live tokens
        </p>
      </div>
      <div className="mt-2 grid grid-cols-8 overflow-hidden rounded-lg border border-[var(--color-line)]">
        {STRIP_KEYS.map((key) => {
          const value = String(tokens[key] ?? '');
          // Only real hex paints the cell — a half-typed "#1e3a" or a
          // var(--) token must not surprise anyone with a random parse.
          const paint = value && isColorToken(value) ? value : undefined;
          return (
            <span
              key={key}
              title={`${key} — ${value || 'unset'}`}
              className={cn(
                'h-8 border-l border-black/10 first:border-l-0 dark:border-white/10',
                !paint && 'preview-backdrop',
              )}
              style={{ background: paint }}
            />
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-8">
        {STRIP_KEYS.map((key) => (
          <span
            key={key}
            title={labelFor(key)}
            className="truncate text-center font-mono text-[7.5px] uppercase tracking-[0.1em] text-[var(--color-ink-faint)]"
          >
            {key.replace(/Color$/, '').toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── The contrast lab ────────────────────────────────────────────────────────

/**
 * Legibility, reported like an instrument: a scored gauge for the palette as a
 * whole, and one row per WCAG pairing rendered in the real inks — the text you
 * would ship, sitting on the background it would sit on.
 */
function ContrastLab({
  tokens,
  report,
  failures,
  onFix,
}: {
  tokens: GlobalTokens;
  report: { label: string; ratio: number; grade: string }[];
  failures: { label: string; ratio: number; grade: string }[];
  onFix: () => void;
}) {
  const reduced = useReducedMotion();
  const scaleMax = 8;
  const score = Math.round(
    report.reduce((sum, row) => sum + Math.min(100, (row.ratio / scaleMax) * 100), 0) /
      (report.length || 1),
  );
  const anyLow = failures.some((row) => row.grade === 'low');
  const tone = anyLow
    ? 'var(--color-danger)'
    : failures.length
      ? 'var(--color-warn)'
      : 'var(--color-success)';
  const verdict = anyLow
    ? 'Below the reading floor'
    : failures.length
      ? 'Only as large text'
      : 'Storefront ready';
  const note = anyLow
    ? `${failures.length} ${failures.length === 1 ? 'pairing sits' : 'pairings sit'} under 3:1 — fix before you ship.`
    : failures.length
      ? 'Everything clears 3:1, but body copy wants AA 4.5:1.'
      : 'Every pairing passes AA; body copy passes AAA.';

  return (
    <div className="surface-glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
          Contrast lab
        </p>
        <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
          WCAG 2 · AA 4.5 · AAA 7
        </p>
      </div>

      {/* The score instrument */}
      <div className="mt-3 flex items-center gap-4">
        <span className="relative grid h-[74px] w-[74px] shrink-0 place-items-center">
          <motion.span
            className="absolute inset-0 rounded-full"
            initial={reduced ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              background: `conic-gradient(${tone} ${score * 3.6}deg, var(--color-line) ${score * 3.6}deg)`,
            }}
          />
          <span className="absolute inset-[8px] rounded-full bg-[var(--color-panel-2)]" />
          <span className="absolute inset-x-0 text-center">
            <span className="block font-mono text-[17px] font-bold leading-none tracking-tight">
              {score}
            </span>
            <span className="mt-0.5 block font-mono text-[7px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              score
            </span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold leading-tight tracking-tight">
            {verdict}
          </p>
          <p className="mt-1 text-[9.5px] leading-relaxed text-[var(--color-ink-faint)]">
            {note}
          </p>
          {failures.length ? (
            <button
              type="button"
              onClick={onFix}
              className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-warn)]/50 bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-warn)] transition-colors hover:bg-[color-mix(in_oklab,var(--color-warn)_18%,transparent)]"
            >
              Re-derive the inks
            </button>
          ) : null}
        </div>
      </div>

      {/* The pairings, painted in the real inks they'd ship with */}
      <ul className="mt-4 space-y-1.5">
        {report.map((row, index) => {
          const check = CONTRAST_CHECKS[index];
          const fg = String(tokens[check.foreground] ?? '#0f172a');
          const bg = String(tokens[check.background] ?? '#ffffff');
          const light = luminance(bg) > 0.4;
          return (
            <li
              key={row.label}
              className="flex items-center justify-between gap-2.5 rounded-xl px-3 py-2"
              style={{
                background: bg,
                border: `1px solid ${light ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.16)'}`,
              }}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background:
                      row.grade === 'aaa' || row.grade === 'aa'
                        ? 'var(--color-success)'
                        : row.grade === 'large'
                          ? 'var(--color-warn)'
                          : 'var(--color-danger)',
                  }}
                />
                <span
                  className="min-w-0 truncate text-[10.5px] font-medium"
                  style={{
                    color: fg,
                    opacity: 0.82,
                    fontFamily: String(tokens.fontBody ?? 'system-ui, sans-serif'),
                  }}
                >
                  {row.label}
                </span>
              </span>
              <span
                className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: fg, opacity: 0.66 }}
              >
                {row.ratio.toFixed(1)} · {row.grade}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── The rail parts ──────────────────────────────────────────────────────────

/** A numbered, hairlined studio panel. */
function Panel({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="surface-glass overflow-hidden rounded-2xl"
    >
      <header className="flex items-baseline gap-2.5 border-b border-[var(--color-line)] px-4 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
          {index}
        </span>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-dim)]">
          {title}
        </h3>
      </header>
      <div className="p-4">{children}</div>
    </motion.section>
  );
}

/**
 * A brand colour, exactly like the surface rows: label above, the absolute
 * colour box living inside the input line, with the colour's own name riding
 * the label row so the swatch no longer needs a card of its own.
 */
function BrandSlot({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const shown = value && isColorToken(value) ? asHex(value) : null;

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] text-[var(--color-ink-dim)]">{label}</span>
        {shown ? (
          <span
            className="shrink-0 truncate text-[9px] font-semibold"
            style={{ color: shown }}
          >
            {nameColor(shown)}
          </span>
        ) : (
          <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
            fx
          </span>
        )}
      </div>
      <ColorInput value={value} onChange={onChange} />
    </div>
  );
}

const SHAPE_RADIUS: Record<string, number> = {
  none: 2,
  soft: 7,
  rounded: 12,
  pill: 999,
};

/** A miniature layout that demos the density option's rhythm. */
function DensityThumb({ keyName }: { keyName: string }) {
  const spec = {
    compact: { pad: 4, gap: 2, width: 62 },
    balanced: { pad: 7, gap: 4, width: 76 },
    spacious: { pad: 10, gap: 6, width: 90 },
  }[keyName] ?? { pad: 7, gap: 4, width: 76 };

  return (
    <span
      className="flex h-7 w-10 flex-col justify-center rounded-md border border-[var(--color-line)] bg-[var(--color-panel-2)]"
      style={{ gap: spec.gap, padding: spec.pad }}
    >
      <span
        className="h-1 rounded-full bg-[var(--color-accent)]"
        style={{ width: `${spec.width}%` }}
      />
      <span
        className="h-1 rounded-full bg-[var(--color-accent)] opacity-40"
        style={{ width: `${Math.round(spec.width * 0.6)}%` }}
      />
    </span>
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

function slugOf(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'your-workspace';
}

/** A token map already carries a real palette when the surfaces are set. */
function hasFullPalette(tokens: GlobalTokens): boolean {
  return Boolean(tokens.primaryColor && tokens.backgroundColor && tokens.textColor);
}
