'use client';

// studio/src/components/setup/review-summary.tsx
//
// REVIEW STAGE.
//
// Shows the fully assembled identity as a faithful snapshot, without
// pretending it is a real portal: name, tagline, logo, chosen track,
// toggled features, chosen palette and pages to come. Actions: open draft, or
// publish.

import { motion } from 'framer-motion';
import { Check, ChevronRight, UploadCloud } from 'lucide-react';

import { FlowGlyph } from './icon-bridge';
import { PresetCard } from './identity-cards';
import {
  childOptionsFor,
  operationalTitleFor,
  type FlowField,
  type FlowOriginOption,
  type FlowTrack,
  type ModeFlow,
  type FlowFeature,
} from '@/lib/setup-flow';
import type { GlobalTokens, StudioManifest, TemplateAccent } from '@/lib/contract';
import { WORKSPACE_MODE_LABELS } from '@/lib/contract';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const stagger = 0.05;

export function ReviewSummary({
  flow,
  origin,
  track,
  levels,
  enabledFeatures,
  detailFields,
  manifest,
  templateName,
  tokens,
  paletteSource,
  busy,
  onBack,
  onOpenStudio,
  onSaveDraft,
  onPublish,
  onPickPreset,
}: {
  flow: ModeFlow;
  origin: FlowOriginOption | null;
  track: FlowTrack | null;
  levels: string[];
  enabledFeatures: FlowFeature[];
  detailFields: FlowField[];
  tokens: GlobalTokens;
  manifest: StudioManifest;
  templateName: string;
  paletteSource: string;
  busy: 'save' | 'publish' | null;
  onBack: () => void;
  onOpenStudio: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPickPreset: (presetTokens: GlobalTokens) => void;
}) {
    const name = String(tokens.siteName ?? 'Unnamed');
  const tagline = String(tokens.tagline ?? '');

  // The trail reads back the answers in the order they were given, so the
  // client can see the shape of what they commissioned — not a wall of tokens.
  const levelLabels = track
    ? childOptionsFor(flow, track)
        .filter((option) => levels.includes(option.value))
        .map((option) => option.label)
    : [];
  const trail: { label: string; value: string }[] = [
    { label: 'What it is', value: origin?.label ?? flow.brandTitle },
    { label: 'Shelf', value: track?.label ?? 'General workspace' },
    ...(levelLabels.length
      ? [{ label: flow.childFieldLabel ?? 'Focus', value: levelLabels.join(' · ') }]
      : []),
    { label: 'Capabilities', value: `${enabledFeatures.length} switched on` },
    { label: 'Template', value: templateName || 'None installed' },
    { label: 'Palette', value: paletteSource || 'Set by hand in the studio' },
  ];

  const credentialAnswers = (origin?.fields ?? []).filter(
    (field) => String(tokens[field.key] ?? '').trim(),
  );
  const operationAnswers = detailFields.filter((field) =>
    String(tokens[field.key] ?? '').trim(),
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-5"
      >
        {/* Hero brand snapshot */}
        <div className="surface-glass overflow-hidden rounded-3xl">
          <div
            className="relative p-5 sm:p-6"
            style={{
              background: `linear-gradient(135deg, ${String(tokens.surfaceColor ?? '#f8fafc')}, ${String(tokens.backgroundColor ?? '#ffffff')})`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm"
                  style={{ background: String(tokens.primaryColor ?? '#4f46e5') }}
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
                    <FlowGlyph name={flow.icon} size={20} />
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className="truncate text-[8.5px] font-semibold uppercase tracking-[0.24em]"
                    style={{ color: String(tokens.accentColor ?? '#4f46e5') }}
                  >
                    {flow.osName}
                  </p>
                  <p
                    className="truncate text-base font-semibold"
                    style={{ color: String(tokens.textColor ?? '#0f172a') }}
                  >
                    {name}
                  </p>
                  <p
                    className="truncate text-[10.5px] opacity-70"
                    style={{ color: String(tokens.textColor ?? '#0f172a') }}
                  >
                    {tagline || 'Your tagline appears here'}
                  </p>
                </div>
              </div>
              {track || origin ? (
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white"
                  style={{ background: (track ?? origin)?.accent.primary }}
                >
                  {track?.label ?? origin?.label}
                </span>
              ) : null}
            </div>

            {[...enabledFeatures].slice(0, 4).map((feature, index) => {
                            return (
                <motion.div
                  key={feature.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * stagger }}
                  className="mt-3 flex items-center gap-2 rounded-xl border px-2.5 py-2"
                  style={{
                    borderColor: String(tokens.borderColor ?? '#e2e8f0'),
                    background: String(tokens.surfaceColor ?? '#f8fafc'),
                  }}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md text-white"
                    style={{ background: String(tokens.secondaryColor ?? '#06b6d4') }}
                  >
                    <FlowGlyph name={feature.icon} size={13} />
                  </span>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: String(tokens.textColor ?? '#0f172a') }}
                  >
                    {feature.label}
                  </span>
                  <Check
                    size={12}
                    className="ml-auto"
                    style={{ color: String(tokens.accentColor ?? '#06b6d4') }}
                  />
                </motion.div>
              );
            })}

            {enabledFeatures.length > 4 ? (
              <p
                className="mt-2.5 text-[10px] font-medium opacity-60"
                style={{ color: String(tokens.textColor ?? '#0f172a') }}
              >
                +{enabledFeatures.length - 4} more capability selected — each one mounts a section
                on the portal.
              </p>
            ) : null}

            {/* Provenance strip — which project + template this draft grows from */}
            <div
              className="mt-4 flex items-center justify-between gap-2 border-t pt-2.5"
              style={{ borderColor: String(tokens.borderColor ?? '#e2e8f0') }}
            >
              <span
                className="truncate text-[9.5px] uppercase tracking-[0.16em] opacity-60"
                style={{ color: String(tokens.textColor ?? '#0f172a') }}
              >
                {manifest.projectName}
              </span>
              <span
                className="shrink-0 text-[9.5px] font-medium opacity-80"
                style={{ color: String(tokens.textColor ?? '#0f172a') }}
              >
                {templateName}
              </span>
            </div>
          </div>
        </div>

        {/* Commissioning trail — the answers in the order they were given */}
        <div className="surface-glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            How this workspace was commissioned
          </p>
          <ol className="mt-2.5 space-y-1.5">
            {trail.map((entry, index) => (
              <motion.li
                key={entry.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * stagger, duration: 0.35 }}
                className="flex items-start gap-2"
              >
                <ChevronRight
                  size={12}
                  className="mt-[3px] shrink-0 text-[var(--color-accent)]"
                />
                <span className="w-[96px] shrink-0 text-[9.5px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
                  {entry.label}
                </span>
                <span className="min-w-0 flex-1 text-[11.5px] font-medium leading-snug text-[var(--color-ink)]">
                  {entry.value}
                </span>
              </motion.li>
            ))}
          </ol>
        </div>

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

        {/* Operational summary */}
        <div className="surface-glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            {operationalTitleFor(flow, origin)}
          </p>
          {operationAnswers.length ? (
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
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
              Nothing filled in yet — every question on the details card is optional, and the
              portal will still build. Add them whenever you have them.
            </p>
          )}
        </div>

        {/* Style presets (re-pickable here) */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Palette
            </p>
            <p className="truncate text-[9.5px] text-[var(--color-ink-faint)]">
              {paletteSource ? `from ${paletteSource.toLowerCase()}` : 'tuned by hand'}
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {flow.presets.map((preset) => (
              <PresetCard
                key={preset.key}
                label={preset.label}
                description={preset.description}
                accent={preset.accent}
                active={String(tokens.primaryColor ?? '') === String(preset.tokens.primaryColor ?? '')}
                onSelect={() => onPickPreset(preset.tokens)}
              />
            ))}
          </div>
        </div>

        {/* Runtime surfaces */}
        {flow.runtimeSurfaces.length ? (
          <div className="surface-glass rounded-2xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              {WORKSPACE_MODE_LABELS[flow.key]} runtime surfaces
            </p>
            <ul className="mt-2 space-y-1">
              {flow.runtimeSurfaces.map((surface) => (
                <li key={surface} className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-dim)]">
                  <span className="h-1 w-1 rounded-full bg-[var(--color-accent)]" />
                  {surface}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
              Supplied by the mode runtime. Styling them is safe; their logic is not editable here.
            </p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-[var(--color-line)] pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <Button variant="secondary" size="md" disabled={busy !== null} onClick={onOpenStudio}>
            Open in Studio
          </Button>
          <Button variant="secondary" size="md" disabled={busy !== null} onClick={onSaveDraft}>
            {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : null}
            Save as draft
          </Button>
          <Button variant="primary" size="md" disabled={busy !== null} onClick={onPublish}>
            {busy === 'publish' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UploadCloud size={14} />
            )}
            Publish portal
          </Button>
        </div>
      </motion.div>

      {/* Right column: live style preview, reuse of the old StylePreview */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-4"
      >
        <StylePreview tokens={tokens} accent={flow.accent} />
        <div className="surface-glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
            What publishing does
          </p>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-[var(--color-ink-dim)]">
            <li>Promotes the current draft to the live portal immediately.</li>
            <li>Keeps a revision in history so you can roll back.</li>
            <li>Invalidates the edge cache; visitors see the new version.</li>
            <li>Never changes underlying mode functions.</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

/** Small style preview, mirrors the StyleStep surface but at review scale. */
function StylePreview({ tokens, accent }: { tokens: GlobalTokens; accent: TemplateAccent }) {
  const primary = String(tokens.primaryColor ?? '#4f46e5');
  const secondary = String(tokens.secondaryColor ?? '#06b6d4');
  const surface = String(tokens.surfaceColor ?? '#f8fafc');
  const background = String(tokens.backgroundColor ?? '#ffffff');
  const text = String(tokens.textColor ?? '#0f172a');
  const border = String(tokens.borderColor ?? '#e2e8f0');
  const radius =
    tokens.borderRadius === 'none'
      ? '0px'
      : tokens.borderRadius === 'pill'
        ? '999px'
        : tokens.borderRadius === 'rounded'
          ? '14px'
          : '8px';

  return (
    <div className="surface-glass overflow-hidden rounded-3xl">
      <div className="border-b border-[var(--color-line)] px-4 py-2.5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-faint)]">
          Style preview
        </p>
      </div>
      <div className="p-4 sm:p-5" style={{ background }}>
        <div
          className="overflow-hidden border"
          style={{ background, borderColor: border, borderRadius: radius }}
        >
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ background: surface, borderBottom: `1px solid ${border}` }}
          >
            <span
              className="text-[10px] font-semibold"
              style={{ color: text, fontFamily: String(tokens.fontHeading ?? '') }}
            >
              {String(tokens.siteName ?? 'Your workspace')}
            </span>
            <span
              className="px-2 py-0.5 text-[8px] font-medium text-white"
              style={{ background: primary, borderRadius: radius }}
            >
              Learn more
            </span>
          </div>
          <div className="p-4">
            <p
              className="text-[8px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: secondary }}
            >
              Preview
            </p>
            <p
              className="mt-1.5 text-sm font-semibold leading-snug"
              style={{ color: text, fontFamily: String(tokens.fontHeading ?? '') }}
            >
              {String(tokens.tagline ?? 'A clear, confident headline.')}
            </p>
            <div className="mt-3 flex gap-1.5">
              <span
                className="px-2.5 py-1 text-[8px] font-medium text-white"
                style={{ background: primary, borderRadius: radius }}
              >
                Primary action
              </span>
              <span
                className="border px-2.5 py-1 text-[8px] font-medium"
                style={{ borderColor: border, color: text, borderRadius: radius }}
              >
                Secondary
              </span>
            </div>
            {/* Accent bar using mode's palette for a bit of flavour */}
            <div className="mt-3 h-1 rounded-full" style={{ background: accent.secondary, opacity: 0.7 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
