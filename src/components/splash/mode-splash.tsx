'use client';

// studio/src/components/splash/mode-splash.tsx
//
// THE CINEMATIC WARM-UP.
//
// When a project loads for the first time (or auto-redirects to setup) it
// shows this instead of a spinner. Each workspace mode is a different product
// with a different name, so each gets its own signature: `flow.splashMotif`
// picks the motion and `flow.osName` picks the words. EduOS rises through
// rooflines; NGO OS beats and ripples; Commerce rolls a ledger; Partner links
// up; GENERAL keeps a calm constellation.
//
// It is deliberately NOT a progress bar — a fake `%` would lie. Instead it
// narrates real steps ("wiring results & fees safely") in mode voice while
// the queries resolve behind the curtain. Done equals `phase="exit"`, at
// which point framer-motion slides the whole thing away without a flash.

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { FlowGlyph } from '@/components/setup/icon-bridge';
import type { ModeFlow, SplashMotif } from '@/lib/setup-flow';
import { WORKSPACE_MODE_LABELS } from '@/lib/contract';
import type { WorkspaceMode } from '@/lib/contract';
import { cn } from '@/lib/utils';

/** The stage colour trio plus the caller's motion preference. */
type MotifProps = { palette: string[]; reduce: boolean };

const loop = (reduce: boolean, duration: number, delay = 0) => ({
  duration,
  delay,
  repeat: reduce ? 0 : Infinity,
  ease: 'easeInOut' as const,
});

/**
 * Every motif draws inside a 320×320 box centred on the mode glyph, so the
 * glyph stays put no matter which product is booting.
 */
function MotifStage({ motif, palette, reduce }: { motif: SplashMotif } & MotifProps) {
  if (motif === 'campus') return <CampusMotif palette={palette} reduce={reduce} />;
  if (motif === 'pulse') return <PulseMotif palette={palette} reduce={reduce} />;
  if (motif === 'ledger') return <LedgerMotif palette={palette} reduce={reduce} />;
  if (motif === 'network') return <NetworkMotif palette={palette} reduce={reduce} />;
  return <ConstellationMotif palette={palette} reduce={reduce} />;
}

/** EduOS — stacked rooflines rising into a slowly turning graduation ring. */
function CampusMotif({ palette, reduce }: MotifProps) {
  const tiers = [0, 1, 2, 3];
  return (
    <svg
      aria-hidden
      className="absolute -inset-20"
      width="320"
      height="320"
      viewBox="0 0 320 320"
      fill="none"
    >
      <motion.circle
        cx="160"
        cy="160"
        r="150"
        stroke={palette[1]}
        strokeOpacity="0.16"
        strokeWidth="1"
        className="dash-flow"
      />
      {tiers.map((tier) => {
        const inset = tier * 13;
        const peak = 214 - tier * 24;
        return (
          <motion.path
            key={tier}
            d={`M ${30 + inset} 262 L ${30 + inset} ${peak} L 160 ${peak - 26} L ${290 - inset} ${peak} L ${290 - inset} 262`}
            stroke={tier % 2 ? palette[1] : palette[0]}
            strokeOpacity={0.18 + tier * 0.07}
            strokeWidth="1.2"
            initial={reduce ? false : { opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{ duration: 1.1, delay: 0.15 + tier * 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}
    </svg>
  );
}

/** NGO OS — ripples leaving a heart line, the mode's whole promise in motion. */
function PulseMotif({ palette, reduce }: MotifProps) {
  return (
    <svg
      aria-hidden
      className="absolute -inset-24"
      width="360"
      height="360"
      viewBox="0 0 320 320"
      fill="none"
    >
      {[0, 1, 2].map((ring) => (
        <motion.circle
          key={ring}
          cx="160"
          cy="160"
          r="70"
          stroke={ring % 2 ? palette[0] : palette[1]}
          strokeWidth="1.4"
          style={{ transformOrigin: '160px 160px' }}
          initial={reduce ? { opacity: 0.18, scale: 1 } : { opacity: 0.55, scale: 0.55 }}
          animate={reduce ? { opacity: 0.18 } : { opacity: 0, scale: 1.45 }}
          transition={{ duration: 2.6, delay: ring * 0.85, repeat: reduce ? 0 : Infinity }}
        />
      ))}
      <motion.path
        d="M18 160 H96 l13 -27 17 54 14 -37 11 10 H302"
        stroke={palette[1]}
        strokeOpacity="0.38"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={loop(reduce, 2.1, 0.2)}
      />
    </svg>
  );
}

/** Commerce — a ledger column set that keeps balancing itself. */
function LedgerMotif({ palette, reduce }: MotifProps) {
  const columns = [56, 104, 152, 200, 248];
  return (
    <svg
      aria-hidden
      className="absolute -inset-20"
      width="320"
      height="320"
      viewBox="0 0 320 320"
      fill="none"
    >
      <motion.line
        x1="18"
        y1="176"
        x2="302"
        y2="176"
        stroke={palette[1]}
        strokeOpacity="0.24"
        strokeWidth="1"
        className="dash-flow"
      />
      {columns.map((x, index) => {
        const rise = 26 + ((index * 17) % 42);
        return (
          <motion.rect
            key={x}
            x={x}
            width="11"
            rx="3.5"
            fill={index % 2 ? palette[1] : palette[0]}
            fillOpacity="0.32"
            initial={reduce ? { y: 176 - rise, height: rise } : false}
            animate={
              reduce
                ? { y: 176 - rise, height: rise }
                : { y: [176, 176 - rise, 176 - rise * 0.4], height: [0, rise, rise * 0.4] }
            }
            transition={loop(reduce, 3.4, index * 0.24)}
          />
        );
      })}
    </svg>
  );
}

/** Partner — nodes wiring themselves into a network around the glyph. */
function NetworkMotif({ palette, reduce }: MotifProps) {
  const nodes: [number, number][] = [
    [62, 92],
    [160, 44],
    [258, 96],
    [236, 220],
    [118, 240],
    [44, 192],
  ];
  return (
    <svg
      aria-hidden
      className="absolute -inset-20"
      width="320"
      height="320"
      viewBox="0 0 320 320"
      fill="none"
    >
      {nodes.map(([x, y], index) => (
        <g key={`${x}-${y}`}>
          <motion.line
            x1="160"
            y1="160"
            x2={x}
            y2={y}
            stroke={palette[0]}
            strokeWidth="1"
            initial={reduce ? { opacity: 0.2 } : { opacity: 0 }}
            animate={reduce ? { opacity: 0.2 } : { opacity: [0.12, 0.45, 0.12] }}
            transition={loop(reduce, 2.9, index * 0.3)}
          />
          <motion.circle
            cx={x}
            cy={y}
            r="4"
            fill={index % 2 ? palette[1] : palette[0]}
            initial={reduce ? { opacity: 0.55 } : false}
            animate={reduce ? { opacity: 0.55 } : { opacity: [0.4, 1, 0.4], r: [3, 5, 3] }}
            transition={loop(reduce, 2.9, index * 0.3)}
          />
        </g>
      ))}
    </svg>
  );
}

/** GENERAL — scattered light finding its constellation. */
function ConstellationMotif({ palette, reduce }: MotifProps) {
  const stars: [number, number, number][] = [
    [48, 74, 2],
    [96, 40, 1.4],
    [150, 78, 2.4],
    [212, 36, 1.6],
    [268, 82, 2],
    [288, 152, 1.4],
    [246, 232, 2.2],
    [176, 268, 1.6],
    [102, 246, 2],
    [40, 196, 1.6],
  ];
  return (
    <svg
      aria-hidden
      className="absolute -inset-24"
      width="360"
      height="360"
      viewBox="0 0 320 320"
      fill="none"
    >
      {stars.map(([x, y, r], index) => (
        <motion.circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={r}
          fill={index % 3 === 0 ? palette[1] : palette[0]}
          initial={reduce ? { opacity: 0.4 } : { opacity: 0 }}
          animate={reduce ? { opacity: 0.4 } : { opacity: [0.15, 0.9, 0.15] }}
          transition={loop(reduce, 3.6, index * 0.32)}
        />
      ))}
    </svg>
  );
}

/** The glyph's own body language, matched to the motif above it. */
const HALO: Record<SplashMotif, string> = {
  campus: 'float-slow',
  pulse: 'beat-slow',
  ledger: 'roll-slow',
  network: 'breathe-slow',
  constellation: 'breathe-slow',
};

export function ModeSplash({
  flow,
  mode,
  phase,
  projectName,
}: {
  flow: ModeFlow;
  mode: WorkspaceMode;
  /** 'run' until the wizard is ready to mount; 'exit' slides it away. */
  phase: 'run' | 'exit';
  projectName: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const [lineIndex, setLineIndex] = useState(0);

  // Narrate the splash lines on a slow cadence. Stopped on exit; never
  // advances past the last line (it just holds it, which reads as patience).
  useEffect(() => {
    if (phase === 'exit') return;
    if (reduce) return;
    const timer = window.setInterval(() => {
      setLineIndex((current) => Math.min(current + 1, flow.splashLines.length - 1));
    }, 850);
    return () => window.clearInterval(timer);
  }, [phase, reduce, flow.splashLines.length]);

  const palette =
    mode === 'EDUCATION'
      ? [flow.accent.primary, flow.accent.secondary, '#fef0d4']
      : mode === 'NON_PROFIT'
        ? [flow.accent.primary, flow.accent.secondary, '#fee8c8']
        : [flow.accent.primary, flow.accent.secondary, '#eef2ff'];

  return (
    <AnimatePresence>
      {phase === 'run' ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.04 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[60] overflow-hidden"
          style={{ background: 'var(--color-bg)' }}
        >
          {/* Aurora tuned per mode */}
          <div aria-hidden className={cn('aurora-layer', reduce && 'opacity-40')}>
            <div
              className="aurora-blob aurora-a"
              style={{
                top: '-18%',
                left: '-10%',
                width: '62%',
                height: '68%',
                background: `radial-gradient(circle, ${palette[0]}, transparent 66%)`,
              }}
            />
            <div
              className="aurora-blob aurora-b"
              style={{
                bottom: '-22%',
                right: '-8%',
                width: '56%',
                height: '60%',
                background: `radial-gradient(circle, ${palette[1]}, transparent 70%)`,
              }}
            />
          </div>

          {/* Centre stage */}
          <div className="relative flex h-full flex-col items-center justify-center px-6">
            <div className="relative">
              <MotifStage motif={flow.splashMotif} palette={palette} reduce={reduce} />
              {!reduce && flow.splashMotif === 'campus' ? (
                <svg
                  aria-hidden
                  className="absolute -inset-14 orbit-slow"
                  width="260"
                  height="260"
                  viewBox="0 0 260 260"
                  fill="none"
                >
                  <circle cx="130" cy="130" r="112" stroke={palette[1]} strokeOpacity="0.22" strokeWidth="1" />
                  <circle cx="130" cy="18" r="3" fill={palette[1]} />
                </svg>
              ) : null}

              {/* Pulsing halo behind the icon */}
              <div
                className={cn(
                  'pulse-ring relative flex h-24 w-24 items-center justify-center rounded-[28px] text-white shadow-2xl',
                  reduce ? '' : HALO[flow.splashMotif],
                )}
                style={{
                  background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
                  color: palette[1],
                  boxShadow: `0 22px 70px -26px ${palette[0]}cc`,
                }}
              >
                <FlowGlyph name={flow.icon} size={40} className="relative z-10 text-white/95" />
              </div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="mt-10 text-center text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {flow.osName}{' '}
              <span
                style={{
                  backgroundImage: `linear-gradient(100deg, ${palette[0]}, ${palette[1]})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                is warming up
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 }}
              className="mt-2 text-[12px] tracking-wide text-[var(--color-ink-faint)]"
            >
              {projectName || WORKSPACE_MODE_LABELS[mode]}
            </motion.p>

            {/* Narration — the splash lines in mode voice */}
            <div className="mt-8 h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={lineIndex}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="text-[11.5px] tracking-wide text-[var(--color-ink-dim)]"
                >
                  {flow.splashLines[lineIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Loading bar — honest, no fake percentage */}
            <div className="mt-6 h-[3px] w-56 overflow-hidden rounded-full bg-[var(--color-line)]">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${palette[0]}, ${palette[1]})`,
                }}
                initial={{ width: '8%' }}
                animate={{ width: '88%' }}
                transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          {/* Bottom rule with the product's own name, subtle */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pb-6">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--color-ink-faint)]">
              {flow.osName}
            </p>
            <p className="text-[9px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)] opacity-70">
              {WORKSPACE_MODE_LABELS[mode]}
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
