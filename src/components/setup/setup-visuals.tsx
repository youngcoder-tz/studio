'use client';

// studio/src/components/setup/setup-visuals.tsx
//
// THE ANIMATED FURNITURE.
//
// Presentational primitives built only for the onboarding wizard: an aurora
// backdrop, a soft frosted panel, animated progress, selectable choice cards,
// and a magnetic continue button. Every motion is real pointer state — no
// scrolljacking — and CSS-level `prefers-reduced-motion` is respected.

import { motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

import { FlowGlyph } from './icon-bridge';
import type { FlowFeature, FlowIcon, FlowTrack } from '@/lib/setup-flow';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 380, damping: 30 };

// ─── Aurora backdrop ─────────────────────────────────────────────────────────

export function AuroraBackdrop({
  primary,
  secondary,
  surface,
}: {
  primary: string;
  secondary: string;
  surface: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={cn('aurora-layer', reduce && 'opacity-45')}>
        <div
          className="aurora-blob aurora-a"
          style={{
            top: '-15%',
            left: '-8%',
            width: '52%',
            height: '58%',
            background: `radial-gradient(circle at 35% 40%, ${primary}, transparent 68%)`,
          }}
        />
        <div
          className="aurora-blob aurora-b"
          style={{
            bottom: '-18%',
            right: '-6%',
            width: '46%',
            height: '52%',
            background: `radial-gradient(circle at 60% 40%, ${secondary}, transparent 70%)`,
          }}
        />
        <div
          className="aurora-blob aurora-a float-slow"
          style={{
            top: '30%',
            left: '38%',
            width: '26%',
            height: '34%',
            opacity: 0.32,
            background: `radial-gradient(circle at 50% 50%, ${surface}, transparent 70%)`,
          }}
        />
      </div>
      {/* Fine grid veil, barely there */}
      <div
        className="grid-veil absolute inset-0 opacity-[0.09]"
        style={{ maskImage: 'radial-gradient(ellipse at 50% 30%, black, transparent 75%)' }}
      />
      {/* Edge vignette keeps panels readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1300px 880px at 50% -8%, transparent, color-mix(in oklab, var(--color-bg) 92%, transparent) 86%)',
        }}
      />
    </div>
  );
}

// ─── Frosted panel ───────────────────────────────────────────────────────────

export function Panel({
  children,
  className,
  sweep = false,
}: {
  children: ReactNode;
  className?: string;
  sweep?: boolean;
}) {
  return (
    <div className={cn('surface-glass relative rounded-3xl', className)}>
      {sweep ? <div className="beam-sweep absolute inset-0 rounded-3xl opacity-60" /> : null}
      <div className="relative">{children}</div>
    </div>
  );
}

// ─── Progress spine ──────────────────────────────────────────────────────────

export function ProgressSpine({
  steps,
  current,
  reached,
  onJump,
}: {
  steps: { id: string; label: string; icon?: FlowIcon }[];
  current: number;
  reached: number;
  onJump: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Setup progress"
      className="surface-glass relative mx-auto flex w-full max-w-2xl items-stretch gap-1 rounded-2xl px-2.5 py-2"
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const reachable = index <= reached;
        return (
          <button
            key={step.id}
            type="button"
            disabled={!reachable}
            onClick={() => reachable && onJump(index)}
            className={cn(
              'focus-ring group relative flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors',
              active && 'bg-[var(--color-panel-2)]',
              !reachable && 'cursor-not-allowed opacity-35',
              reachable && !active && 'hover:bg-[color-mix(in_oklab,var(--color-accent)_8%,transparent)]',
            )}
          >
            {active ? (
              <motion.span
                layoutId="spine-thumb"
                className="pointer-events-none absolute inset-0 rounded-xl border border-[var(--color-line-strong)]"
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              />
            ) : null}
            <span
              className={cn(
                'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]',
                active
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_18%,transparent)]'
                  : done
                    ? 'bg-[color-mix(in_oklab,var(--color-success)_22%,transparent)] text-[var(--color-success)]'
                    : 'border border-[var(--color-line)]',
              )}
            >
              {done ? (
                <Check size={11} strokeWidth={3} />
              ) : (
                <FlowGlyph
                  name={step.icon ?? 'sparkles'}
                  size={11}
                />
              )}
            </span>
            <span
              className={cn(
                'relative hidden truncate text-[10.5px] font-medium tracking-wide sm:block',
                active ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-faint)]',
              )}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Track card ──────────────────────────────────────────────────────────────

/**
 * The selectable choice card. It takes the shape both a track and an origin
 * option share, because the wizard asks the same kind of question at both
 * gates — "which of these is closest to what you are?"
 */
export type FlowChoice = Pick<FlowTrack, 'id' | 'label' | 'description' | 'icon' | 'accent'>;

export function TrackCard({
  track,
  selected,
  onSelect,
  hint,
}: {
  track: FlowChoice;
  selected: boolean;
  onSelect: () => void;
  hint?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={spring}
      className={cn(
        'focus-ring group relative flex h-full flex-col overflow-hidden rounded-2xl border p-3.5 text-left transition-colors sm:p-4',
        selected
          ? 'border-[var(--color-accent)]/55 bg-[color-mix(in_oklab,var(--color-accent)_9%,transparent)]'
          : 'border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface)_65%,transparent)] hover:border-[var(--color-line-strong)]',
      )}
    >
      {/* Corner tint that fills on select */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(230px 130px at 12% 0%, ${track.accent.primary}26, transparent 70%)`,
        }}
      />
      {selected ? (
        <motion.span
          layoutId={`track-glow-${track.id}`}
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            border: `1.5px solid ${track.accent.primary}`,
            boxShadow: `0 6px 22px -10px ${track.accent.primary}88 inset, 0 0 24px -12px ${track.accent.primary}66`,
          }}
        />
      ) : null}

      <span className="relative flex items-start gap-2.5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-300 group-hover:scale-[1.06]"
          style={{
            background: `linear-gradient(135deg, ${track.accent.primary}, ${track.accent.secondary})`,
          }}
        >
          <FlowGlyph name={track.icon} size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold leading-snug">{track.label}</span>
          <span className="mt-0.5 block text-[10.5px] leading-snug text-[var(--color-ink-faint)]">
            {track.description}
          </span>
          {hint ? (
            <span className="mt-1 block text-[9.5px] leading-snug text-[var(--color-ink-faint)] opacity-80">
              {hint}
            </span>
          ) : null}
        </span>
        {selected ? (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: track.accent.primary }}
          >
            <Check size={12} strokeWidth={3} />
          </motion.span>
        ) : null}
      </span>
    </motion.button>
  );
}

// ─── Feature tile (toggleable) ───────────────────────────────────────────────

export function FeatureTile({
  feature,
  enabled,
  onToggle,
  delay = 0,
}: {
  feature: FlowFeature;
  enabled: boolean;
  onToggle: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      {...({ transition: { ...spring, delay } } as object)}
      className={cn(
        'focus-ring group relative flex items-start gap-2.5 overflow-hidden rounded-xl border p-3 text-left transition-colors',
        enabled
          ? 'border-[var(--color-accent)]/50 bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]'
          : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
          enabled
            ? 'text-white'
            : 'bg-[var(--color-panel-2)] text-[var(--color-ink-faint)] group-hover:text-[var(--color-ink-dim)]',
        )}
        style={enabled ? { background: 'var(--color-accent)' } : undefined}
      >
        <FlowGlyph name={feature.icon} size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11.5px] font-semibold leading-snug">{feature.label}</span>
        <span className="mt-0.5 block text-[10px] leading-snug text-[var(--color-ink-faint)]">
          {feature.description}
        </span>
      </span>
      <span
        className={cn(
          'ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
          enabled
            ? 'border-transparent bg-[var(--color-accent)] text-white'
            : 'border-[var(--color-line-strong)]',
        )}
      >
        {enabled ? <Check size={10} strokeWidth={3} /> : null}
      </span>
    </motion.button>
  );
}

// ─── Level chip (multi-select pill) ──────────────────────────────────────────

export function LevelChip({
  label,
  description,
  selected,
  onToggle,
  delay = 0,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onToggle: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      {...({ transition: { ...spring, delay } } as object)}
      className={cn(
        'focus-ring group rounded-full border px-3.5 py-2 text-left transition-colors',
        selected
          ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)]'
          : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
      )}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full transition-colors',
            selected ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-line-strong)]',
          )}
        />
        <span className="text-[11.5px] font-medium">{label}</span>
        {description ? (
          <span className="hidden text-[10px] text-[var(--color-ink-faint)] sm:inline">
            · {description}
          </span>
        ) : null}
      </span>
    </motion.button>
  );
}

// ─── Magnetic continue button ────────────────────────────────────────────────

export function ContinueButton({
  label = 'Continue',
  hint,
  disabled,
  busy,
  onClick,
  accent,
}: {
  label?: string;
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  accent?: { primary: string; secondary: string };
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reduce = useReducedMotion();

  const handleMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: px * 10, y: py * 6 });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        ref={ref}
        type="button"
        disabled={disabled || busy}
        onClick={onClick}
        onMouseMove={handleMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        animate={{ rotateX: tilt.y, rotateY: tilt.x }}
        whileHover={{ scale: disabled ? 1 : 1.015 }}
        whileTap={{ scale: disabled ? 1 : 0.985 }}
        transition={spring}
        style={{ perspective: 500 }}
        className={cn(
          'focus-ring group relative inline-flex h-11 min-w-[220px] items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold tracking-wide disabled:cursor-not-allowed disabled:opacity-50',
          'text-[var(--color-accent-foreground)]',
        )}
      >
        <span
          className="absolute inset-0"
          style={{
            background: accent
              ? `linear-gradient(120deg, ${accent.primary}, ${accent.secondary})`
              : 'linear-gradient(120deg, var(--color-accent), color-mix(in oklab, var(--color-accent) 72%, #06b6d4))',
          }}
        />
        {/* Inner highlight sheen */}
        <span className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.22),transparent)]" />
        <span className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <span
            className="beam-sweep absolute inset-0"
            aria-hidden
          />
        </span>
        <span className="relative flex items-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {label}
          {!busy ? (
            <motion.span
              aria-hidden
              animate={{ x: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            >
              →
            </motion.span>
          ) : null}
        </span>
      </motion.button>
      {hint ? (
        <p className="text-[10px] text-[var(--color-ink-faint)]">{hint}</p>
      ) : null}
    </div>
  );
}

// ─── Section header (per-card) ───────────────────────────────────────────────

export function StepHeading({
  step,
  title,
  description,
  accent,
}: {
  step: string;
  title: string;
  description?: string;
  accent?: string;
}) {
  return (
    <div className="relative z-10">
      <motion.p
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: accent ?? 'var(--color-accent)' }}
      >
        {step}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-1.5 text-balance text-xl font-semibold tracking-tight sm:text-2xl"
      >
        {title}
      </motion.h2>
      {description ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-[var(--color-ink-dim)]"
        >
          {description}
        </motion.p>
      ) : null}
    </div>
  );
}
