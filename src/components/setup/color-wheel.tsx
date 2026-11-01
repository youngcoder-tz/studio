'use client';

// studio/src/components/setup/color-wheel.tsx
//
// One physical colour picker, shared by the setup bench and the Palette
// station. A hue ring, a saturation-by-depth pad at its centre, and one dot
// per harmony recipe orbiting the ring at the hue it would move the support
// colours to. Everything is controlled: no hidden colour state lives here.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { hexToHsl, hslToHex } from '@/lib/palette';
import { cn } from '@/lib/utils';

export const HARMONIES: { key: string; label: string; shift: number }[] = [
  { key: 'analogous', label: 'Analogous', shift: 32 },
  { key: 'complement', label: 'Complement', shift: 180 },
  { key: 'triad', label: 'Triad', shift: 120 },
  { key: 'split', label: 'Split', shift: 150 },
];

/** The hue ring, once: 13 stops around the wheel, physical degrees. */
const HUE_RING = `conic-gradient(${Array.from(
  { length: 13 },
  (_, index) => `hsl(${index * 30}deg 100% 54%) ${index * 30}deg`,
).join(', ')})`;

const WHEEL_SIZE = 200;
const WHEEL_THICK = 22;

/**
 * A physical colour picker: drag the ring for hue, drag inside the pad for
 * saturation and lightness, Click a harmony dot to move the support colours.
 * The wheel is keyboard-operable too — arrows nudge the hue by one degree
 * (shift for ten).
 */
export function HoloWheel({
  primary,
  onHue,
  onSl,
  onHarmony,
  size = WHEEL_SIZE,
  className,
}: {
  primary: string;
  onHue: (hue: number) => void;
  onSl: (saturation: number, lightness: number) => void;
  onHarmony: (hueShift: number) => void;
  size?: number;
  className?: string;
}) {
  const [drag, setDrag] = useState<'ring' | 'pad' | null>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const hsl = hexToHsl(primary) ?? { h: 244, s: 0.7, l: 0.55 };

  const scale = size / WHEEL_SIZE;
  const thick = WHEEL_THICK * scale;
  const pad = size * 0.52;

  /** Capture only works for pointers the browser is tracking; anything else
   *  (stale id, synthetic event) must not abort the drag itself. */
  const capture = (event: ReactPointerEvent) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* no capture — moves still arrive if the pointer stays on the element */
    }
  };

  const ringPoint = (clientX: number, clientY: number) => {
    const rect = ringRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    onHue(((angle % 360) + 360) % 360);
  };

  const padPoint = (clientX: number, clientY: number) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const l = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height));
    onSl(s, l);
  };

  const wheelPoint = (hue: number): { left: number; top: number } => {
    const radius = size / 2 - thick / 2;
    const angle = ((hue - 90) * Math.PI) / 180;
    return {
      left: size / 2 + radius * Math.cos(angle),
      top: size / 2 + radius * Math.sin(angle),
    };
  };

  return (
    <div
      ref={ringRef}
      role="slider"
      aria-label="Brand hue ring"
      aria-valuenow={Math.round(hsl.h)}
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuetext={`Hue ${Math.round(hsl.h)} degrees`}
      tabIndex={0}
      className={cn(
        'relative shrink-0 cursor-crosshair touch-none select-none rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
        className,
      )}
      style={{ width: size, height: size }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 10 : 1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          onHue((hsl.h + step) % 360);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          onHue((hsl.h - step + 360) % 360);
        } else if (event.key === 'Home') {
          event.preventDefault();
          onHue(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          onHue(359);
        }
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        capture(event);
        setDrag('ring');
        ringPoint(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (drag === 'ring') ringPoint(event.clientX, event.clientY);
      }}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
    >
      {/* The hue ring */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ background: HUE_RING }}
      />
      {/* The well on the inside */}
      <span
        className="pointer-events-none absolute rounded-full bg-[var(--color-panel-2)]"
        style={{ inset: thick }}
      />

      {/* Harmony orbit — where each recipe would land; a click applies it */}
      {HARMONIES.map((harmony) => {
        const angle = hsl.h + harmony.shift;
        const pos = wheelPoint(angle);
        return (
          <button
            key={harmony.key}
            type="button"
            title={harmony.label}
            aria-label={`Apply ${harmony.label} harmony`}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              onHarmony(harmony.shift);
            }}
            className="absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white/85 shadow-md transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{
              ...pos,
              background: hslToHex({
                h: angle,
                s: Math.max(hsl.s, 0.5),
                l: 0.55,
              }),
            }}
          />
        );
      })}

      {/* The ring knob */}
      <span
        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow-[0_2px_10px_rgba(15,23,42,0.45)]"
        style={{
          ...wheelPoint(hsl.h),
          width: 17 * scale,
          height: 17 * scale,
          background: primary,
          transition: drag ? 'none' : 'left 0.12s ease-out, top 0.12s ease-out',
        }}
      />

      {/* The saturation-by-depth pad */}
      <div
        ref={padRef}
        aria-label="Saturation and depth pad"
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-crosshair overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12),0_10px_24px_-14px_rgba(15,23,42,0.5)]"
        style={{ width: pad, height: pad }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          capture(event);
          setDrag('pad');
          padPoint(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (drag === 'pad') padPoint(event.clientX, event.clientY);
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        {/* Pure hue below, white from the left, black from the floor */}
        <span className="absolute inset-0" style={{ background: hslToHex({ ...hsl, s: 1, l: 0.5 }) }} />
        <span
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, hsl(0 0% 100%), transparent 55%)' }}
        />
        <span
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,1), transparent 55%)' }}
        />
        {/* The pad knob */}
        <span
          className={cn(
            'pointer-events-none absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_6px_rgba(15,23,42,0.55)]',
            drag === 'pad' && 'scale-110',
          )}
          style={{
            left: `${hsl.s * 100}%`,
            top: `${(1 - hsl.l) * 100}%`,
            background: primary,
            transition: drag ? 'none' : 'left 0.12s ease-out, top 0.12s ease-out',
          }}
        />
      </div>
    </div>
  );
}
