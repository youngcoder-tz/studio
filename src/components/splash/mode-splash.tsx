'use client';

// studio/src/components/splash/mode-splash.tsx
//
// THE CINEMATIC WARM-UP.
//
// When a project loads for the first time (or auto-redirects to setup) it
// shows this instead of a spinner. One per mode: EduOS gets an academic aurora
// with a rising orbit, NGO a pulse-and-ripple, Commerce a rolling ledger, and
// the neutral ones a calm constellation.
//
// It is deliberately NOT a progress bar — a fake `%` would lie. Instead it
// narrates real steps ("wiring results & fees safely") in mode voice while
// the queries resolve behind the curtain. Done equals `phase="exit"`, at
// which point framer-motion slides the whole thing away without a flash.

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { FlowGlyph } from '@/components/setup/icon-bridge';
import type { ModeFlow } from '@/lib/setup-flow';
import { WORKSPACE_MODE_LABELS } from '@/lib/contract';
import type { WorkspaceMode } from '@/lib/contract';
import { cn } from '@/lib/utils';

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
  const reduce = useReducedMotion();
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
              {/* Orbiting dots, only on light-reduce: off */}
              {!reduce ? (
                <>
                  <svg
                    aria-hidden
                    className="absolute -inset-14 orbit-slow"
                    width="260"
                    height="260"
                    viewBox="0 0 260 260"
                    fill="none"
                  >
                    <circle
                      cx="130"
                      cy="130"
                      r="112"
                      stroke={palette[1]}
                      strokeOpacity="0.28"
                      strokeWidth="1"
                      className="dash-flow"
                    />
                    <circle cx="130" cy="18" r="3" fill={palette[1]} />
                  </svg>
                  <svg
                    aria-hidden
                    className="absolute -inset-24 orbit-slow-rev"
                    width="320"
                    height="320"
                    viewBox="0 0 320 320"
                    fill="none"
                  >
                    <circle
                      cx="160"
                      cy="160"
                      r="140"
                      stroke={palette[0]}
                      strokeOpacity="0.18"
                      strokeWidth="1"
                      className="dash-flow"
                    />
                    <circle cx="300" cy="160" r="2" fill={palette[0]} />
                  </svg>
                </>
              ) : null}

              {/* Pulsing halo behind the icon */}
              <div
                className={cn(
                  'pulse-ring relative flex h-24 w-24 items-center justify-center rounded-[28px] text-white shadow-2xl',
                  reduce ? '' : 'float-slow',
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
              {WORKSPACE_MODE_LABELS[mode]}{' '}
              <span
                style={{
                  backgroundImage: `linear-gradient(100deg, ${palette[0]}, ${palette[1]})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Studio
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 }}
              className="mt-2 text-[12px] tracking-wide text-[var(--color-ink-faint)]"
            >
              {projectName}
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

          {/* Bottom rule with mode name, subtle */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-6">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--color-ink-faint)]">
              {WORKSPACE_MODE_LABELS[mode]}
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
