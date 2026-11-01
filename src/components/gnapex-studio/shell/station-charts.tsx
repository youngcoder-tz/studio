// studio/src/components/gnapex-studio/shell/station-charts.tsx
//
// The studio's mini chart kit (recharts), themed from the shadcn tokens so
// every chart works in light and dark. All data comes from the real workspace
// document, manifest and revision ledger — nothing synthesized.

'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';

type Row = { label: string; value: number };

export type ChartPalette = {
  isDark: boolean;
  charts: string[];
  axis: string;
  grid: string;
  soft: string;
  border: string;
  foreground: string;
  popover: string;
  background: string;
};

/**
 * The shadcn chart tokens are plain hex values (not HSL triplets), so they
 * must be read from computed styles rather than wrapped in `hsl(...)`. Doing
 * it here also means the recharts SVG receives real colours on both themes,
 * including after the Studio theme segment flips `html.dark`.
 */
const LIGHT_PALETTE: ChartPalette = {
  isDark: false,
  charts: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'],
  axis: '#6b7080',
  grid: 'rgba(15, 23, 42, 0.10)',
  soft: 'rgba(15, 23, 42, 0.045)',
  border: 'rgba(15, 23, 42, 0.10)',
  foreground: '#1b1d24',
  popover: '#fbfbfd',
  background: '#f7f7f9',
};

const DARK_PALETTE: ChartPalette = {
  isDark: true,
  charts: ['#818cf8', '#38bdf8', '#34d399', '#fbbf24', '#f472b6'],
  axis: '#8a90a2',
  grid: 'rgba(255, 255, 255, 0.10)',
  soft: 'rgba(255, 255, 255, 0.045)',
  border: 'rgba(255, 255, 255, 0.10)',
  foreground: '#e9eaf0',
  popover: '#101218',
  background: '#0c0d11',
};

export function useChartTheme(): ChartPalette {
  // Subscribe to the `html.light` / `html.dark` class the ThemeProvider owns,
  // rather than copying theme state into this component tree. The snapshot is
  // a string so React can safely bail out when nothing changed.
  const className = React.useSyncExternalStore(
    subscribeThemeClass,
    themeClassSnapshot,
    () => 'light',
  );
  return React.useMemo(() => resolveChartPalette(className), [className]);
}

function subscribeThemeClass(onChange: () => void) {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

function themeClassSnapshot(): string {
  return typeof document === 'undefined' ? 'light' : document.documentElement.className;
}

const PALETTE_CACHE = new Map<string, ChartPalette>();

/**
 * Read the actual shadcn variables once per class state. They are hex values,
 * so wrapping them in `hsl(...)` — as the old kit did — produced invalid SVG
 * fills and left the charts relying on the browser's fallback black.
 */
function resolveChartPalette(className: string): ChartPalette {
  const cached = PALETTE_CACHE.get(className);
  if (cached) return cached;

  const isDark = /(^|\s)dark(\s|$)/.test(className);
  const base = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  if (typeof window === 'undefined') return base;

  const styles = window.getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  const palette: ChartPalette = {
    isDark,
    charts: [
      read('--chart-1', base.charts[0]!),
      read('--chart-2', base.charts[1]!),
      read('--chart-3', base.charts[2]!),
      read('--chart-4', base.charts[3]!),
      read('--chart-5', base.charts[4]!),
    ],
    axis: read('--muted-foreground', base.axis),
    grid: read('--border', base.grid),
    soft: read('--soft', base.soft),
    border: read('--border', base.border),
    foreground: read('--foreground', base.foreground),
    popover: read('--popover', base.popover),
    background: read('--background', base.background),
  };
  PALETTE_CACHE.set(className, palette);
  return palette;
}

function chartColor(palette: ChartPalette, index: number): string {
  return palette.charts[index % palette.charts.length] ?? palette.charts[0] ?? '#4f46e5';
}

function TipBox({
  active,
  payload,
  label,
  suffix = '',
  palette,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  suffix?: string;
  palette: ChartPalette;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const value = item?.value;
  const name = label ?? item?.payload?.label ?? item?.name ?? 'Value';
  const marker =
    (typeof item?.payload?.fill === 'string' && item.payload.fill !== 'none'
      ? item.payload.fill
      : null) ??
    item?.color ??
    palette.charts[0];

  return (
    <div className="min-w-[96px] rounded-xl border border-border/70 bg-popover/95 px-3 py-2 text-[11px] shadow-[0_16px_40px_-24px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full" style={{ background: marker }} />
        <span className="max-w-[148px] truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {name}
        </span>
      </div>
      <p className="mt-1 text-[15px] font-semibold leading-none text-foreground">
        {value}
        {suffix}
      </p>
    </div>
  );
}

/** Sections per page — a soft gradient area over a whisper grid. */
export function AreaMini({
  data,
  height = 120,
  suffix = '',
}: {
  data: Row[];
  height?: number;
  suffix?: string;
}) {
  const palette = useChartTheme();
  const fillId = `area-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const line = chartColor(palette, 1);

  return (
    <div style={{ height, width: '100%' }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: -2 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line} stopOpacity={palette.isDark ? 0.5 : 0.38} />
              <stop offset="55%" stopColor={line} stopOpacity={palette.isDark ? 0.16 : 0.12} />
              <stop offset="100%" stopColor={line} stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke={palette.grid}
            strokeDasharray="3 6"
            strokeOpacity={0.75}
          />
          <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false} height={6} />
          <YAxis tick={false} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            cursor={{ stroke: palette.axis, strokeDasharray: '3 4', strokeOpacity: 0.35 }}
            content={<TipBox suffix={suffix} palette={palette} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={line}
            strokeWidth={2}
            strokeLinecap="round"
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{
              r: 3.5,
              strokeWidth: 2,
              stroke: palette.background,
              fill: line,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical bars with rounded caps; palette follows the chart tokens. */
export function BarsMini({
  data,
  height = 130,
  vertical = false,
  suffix = '',
}: {
  data: Row[];
  height?: number;
  /** horizontal bars + category labels (good for long names) */
  vertical?: boolean;
  suffix?: string;
}) {
  const palette = useChartTheme();
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');

  if (vertical) {
    return (
      <div style={{ height: Math.max(height, data.length * 30), width: '100%' }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 14, left: 0, bottom: 0 }}>
            <defs>
              {data.map((_, i) => {
                const color = chartColor(palette, i);
                return (
                  <linearGradient key={i} id={`${uid}-bar-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={0.68} />
                    <stop offset="100%" stopColor={color} stopOpacity={1} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              horizontal={false}
              stroke={palette.grid}
              strokeDasharray="3 6"
              strokeOpacity={0.65}
            />
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 10.5, fill: palette.axis }}
              tickMargin={5}
              axisLine={false}
              tickLine={false}
              width={104}
            />
            <Tooltip
              cursor={{ fill: palette.soft, radius: 6 }}
              content={<TipBox suffix={suffix} palette={palette} />}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={11} background={{ fill: palette.soft }}>
              {data.map((_, i) => (
                <Cell key={i} fill={`url(#${uid}-bar-${i})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%' }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: -2 }}>
          <defs>
            {data.map((_, i) => {
              const color = chartColor(palette, i);
              return (
                <linearGradient key={i} id={`${uid}-col-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.46} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid
            vertical={false}
            stroke={palette.grid}
            strokeDasharray="3 6"
            strokeOpacity={0.65}
          />
          <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false} height={6} />
          <YAxis tick={false} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            cursor={{ fill: palette.soft, radius: 6 }}
            content={<TipBox suffix={suffix} palette={palette} />}
          />
          <Bar dataKey="value" radius={[5, 5, 1, 1]} barSize={16}>
            {data.map((_, i) => (
              <Cell key={i} fill={`url(#${uid}-col-${i})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut for share-of-total stories (usage, coverage). */
export function DonutMini({
  slices,
  height = 140,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; value: number; color?: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const palette = useChartTheme();
  const empty = slices.reduce((n, s) => n + s.value, 0) === 0;

  return (
    <div className="relative" style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Quiet track keeps the geometry legible even at zero data. */}
          <Pie
            data={[{ label: 'track', value: 1 }]}
            dataKey="value"
            innerRadius="62%"
            outerRadius="88%"
            fill={palette.soft}
            isAnimationActive={false}
            style={{ pointerEvents: 'none' }}
          />
          {!empty ? (
            <Pie
              data={slices}
              dataKey="value"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2.5}
              cornerRadius={4}
              stroke={palette.background}
              strokeWidth={1.5}
              isAnimationActive={false}
            >
              {slices.map((s, i) => (
                <Cell key={i} fill={s.color ?? chartColor(palette, i)} />
              ))}
            </Pie>
          ) : null}
          {!empty ? <Tooltip content={<TipBox palette={palette} />} /> : null}
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="text-balance text-center leading-tight">
            <b className="block bg-linear-to-b from-foreground to-foreground/60 bg-clip-text text-[20px] font-bold tracking-tight text-transparent">
              {centerValue}
            </b>
            {centerLabel && centerValue !== '' ? (
              <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                {centerLabel}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Tiny stat card with an optional accent hairline and live tone. */
export function StatTile({
  label,
  value,
  tone = 'soft',
  icon,
  mono,
}: {
  label: string;
  value: string;
  tone?: 'soft' | 'ok' | 'warn' | 'brand';
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  const toneRing: Record<string, string> = {
    soft: 'bg-[var(--soft)]',
    ok: 'bg-[var(--success)]/10 text-[var(--success)]',
    warn: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    brand: 'bg-[var(--active)] text-[var(--brand-text)]',
  };
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/70 px-3.5 py-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-20px_rgba(0,0,0,0.45)]',
        tone === 'brand'
          ? 'bg-[var(--active)]/60'
          : tone === 'ok' || tone === 'warn'
            ? 'bg-card/70'
            : 'bg-[var(--soft)]',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {icon ? <span className="text-muted-foreground/70">{icon}</span> : null}
      </div>
      <p
        className={cn(
          'mt-1 truncate text-[13.5px] font-semibold',
          tone === 'ok'
            ? 'text-[var(--success)]'
            : tone === 'warn'
              ? 'text-[var(--warning)]'
              : tone === 'brand'
                ? 'text-[var(--brand-text)]'
                : 'text-foreground',
          mono && 'font-mono text-[12.5px]',
        )}
      >
        {value}
      </p>
      <span
        aria-hidden
        className={cn('absolute inset-x-0 bottom-0 h-[2.5px] opacity-70', toneRing[tone])}
      />
    </div>
  );
}
