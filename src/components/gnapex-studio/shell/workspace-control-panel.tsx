// studio/src/components/gnapex-studio/shell/workspace-control-panel.tsx
//
// The sidebar shown while a station other than Pages is open: station
// identity, real quick stats from the workspace document and one or two
// genuinely functional controls (state selector, theme segment).
'use client';

import React from 'react';
import {
  ArrowUpRight,
  Bot,
  Boxes,
  CheckCircle2,
  FlaskConical,
  FolderTree,
  Image as ImageIcon,
  Layers3,
  Palette,
  Settings2,
  Sparkles,
  Clock,
} from 'lucide-react';
import type { ActiveStation, SimulationState } from '@/lib/gnapex-studio/store';
import { store } from '@/lib/gnapex-studio/store';
import { useTheme } from '@/components/theme/theme-provider';
import { TOKEN_GROUPS } from '@/lib/contract';
import type { StudioManifest, WorkspaceDocument } from '@/lib/contract';
import { TemplatePaletteCard } from './design-sheets';
import { AreaMini, BarsMini, DonutMini } from './station-charts';

const meta: Record<ActiveStation, { title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  explorer: { title: 'Pages', icon: FolderTree, description: 'Navigate the route tree and edit provisioned pages.' },
  setups: { title: 'Setup', icon: Settings2, description: 'The workspace contract, runtime and validation.' },
  palette: { title: 'Palette', icon: Palette, description: 'Global design tokens: color, type, shape, layout.' },
  library: { title: 'Components', icon: Boxes, description: 'The contract catalog and where parts render.' },
  states: { title: 'States', icon: FlaskConical, description: 'Simulate site-user states in the preview.' },
  gora: { title: 'GORA', icon: Sparkles, description: 'Workspace review grounded in the real document.' },
  assets: { title: 'Assets', icon: ImageIcon, description: 'Media referenced by your live pages.' },
  revisions: { title: 'History', icon: Clock, description: 'The revision ledger: checkpoints, ops, rollbacks.' },
  settings: { title: 'Studio settings', icon: Settings2, description: 'Theme, motion and session health.' },
};

export interface WorkspaceControlPanelProps {
  station: ActiveStation;
  manifest: StudioManifest | null;
}

export function WorkspaceControlPanel({ station, manifest }: WorkspaceControlPanelProps) {
  const active = meta[station] ?? meta.explorer;
  const Icon = active.icon;
  const doc = store((s) => s.document);
  const projectId = store((s) => s.meta?.projectId);
  const navigateToDirectory = store((s) => s.navigateToDirectory);

  return (
    <aside className="studio-glass relative z-10 flex min-h-0 w-[264px] shrink-0 flex-col overflow-hidden">
      {/* Station identity */}
      <div className="px-3.5 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl border border-border bg-[var(--active)] text-[var(--brand-text)]">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">{active.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{manifest?.projectName ?? 'Workspace'}</p>
          </div>
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">{active.description}</p>
      </div>

      {/* Station-specific real stats + controls */}
      <div className="studio-scroll flex-1 overflow-y-auto px-3 pb-3">
        <StationQuick station={station} manifest={manifest} doc={doc} />
      </div>

      {/* Design card: template story + the two design sheets */}
      <div className="shrink-0 px-3 pb-2">
        <TemplatePaletteCard projectId={projectId} />
      </div>

      {/* Footer: back to the canvas */}
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={() => navigateToDirectory(null)}
          className="studio-action w-full !justify-between"
        >
          <span>Back to pages</span>
          <ArrowUpRight className="size-3.5 text-muted-foreground" />
        </button>
      </div>
    </aside>
  );
}

/* ── per-station quick content, all data real ────────────────────────────── */

function StationQuick({
  station,
  manifest,
  doc,
}: {
  station: ActiveStation;
  manifest: StudioManifest | null;
  doc: WorkspaceDocument | null;
}) {
  switch (station) {
    case 'palette':
      return (
        <div className="space-y-3">
          <TokenMixChart doc={doc} />
          <QuickList items={quickTokenGroups(doc)} />
        </div>
      );
    case 'library':
      return (
        <div className="space-y-3">
          <LibraryMixChart manifest={manifest} doc={doc} />
          <QuickList items={quickLibrary(manifest, doc)} />
        </div>
      );
    case 'states':
      return <StateQuickControl />;
    case 'settings':
      return <ThemeQuickControl />;
    case 'assets':
      return <QuickList items={quickAssets(doc)} />;
    case 'revisions':
      return <QuickList items={quickContractNumbers(manifest, doc)} />;
    default:
      return (
        <div className="space-y-3">
          <SectionsChart doc={doc} />
          <QuickList items={quickContractNumbers(manifest, doc)} />
        </div>
      );
  }
}

function Head({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <span className="text-[var(--brand-text)]">{icon}</span>
        {title}
      </h3>
      {hint ? <Chip>{hint}</Chip> : null}
    </div>
  );
}

function Chip({ children, tone = 'soft' }: { children: React.ReactNode; tone?: 'soft' | 'ok' | 'warn' | 'brand' }) {
  const tones: Record<string, string> = {
    soft: 'bg-[var(--soft)] text-muted-foreground',
    ok: 'bg-[var(--success)]/10 text-[var(--success)]',
    warn: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    brand: 'bg-[var(--active)] text-[var(--brand-text)]',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function QuickList({ items }: { items: { label: string; value: string; tone?: 'soft' | 'ok' | 'warn' | 'brand'; icon?: React.ReactNode }[] }) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] transition-colors hover:bg-[var(--hover)]"
        >
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
            {item.icon ?? null}
            <span className="truncate">{item.label}</span>
          </span>
          <span
            className={`shrink-0 font-medium ${
              item.tone === 'ok'
                ? 'text-[var(--success)]'
                : item.tone === 'warn'
                  ? 'text-[var(--warning)]'
                  : item.tone === 'brand'
                    ? 'text-[var(--brand-text)]'
                    : 'text-foreground'
            }`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

type Quick = { label: string; value: string; tone?: 'soft' | 'ok' | 'warn' | 'brand'; icon?: React.ReactNode };

function quickTokenGroups(doc: WorkspaceDocument | null): Quick[] {
  const tokens = doc?.globalTokens ?? {};
  const colors = Object.keys(tokens).filter((k) => k.toLowerCase().endsWith('color') || k.includes('Color'));
  return [
    { label: 'Tokens authored', value: String(Object.keys(tokens).length), tone: 'brand' },
    { label: 'Color tokens', value: String(colors.length) },
    { label: 'Site name', value: String(tokens.siteName ?? '—') },
    { label: 'Locale', value: String(tokens.locale ?? '—') },
    { label: 'Radius', value: String(tokens.borderRadius ?? '—') },
    { label: 'Direction', value: String(tokens.direction ?? '—') },
  ];
}

function quickLibrary(manifest: StudioManifest | null, doc: WorkspaceDocument | null): Quick[] {
  const counts = new Map<string, number>();
  for (const pageKey of Object.keys(doc?.pageLayouts ?? {})) {
    for (const inst of doc?.pageLayouts?.[pageKey] ?? []) {
      const id = inst.componentId ?? '';
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const used = counts.size;
  const registered = manifest?.components.length ?? 0;
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return [
    { label: 'Registered', value: String(registered), tone: 'brand' },
    { label: 'In use', value: String(used), tone: used > 0 ? 'ok' : 'warn' },
    { label: 'Dormant', value: String(Math.max(registered - used, 0)), tone: 'warn' },
    ...top.map(([id, n]) => ({ label: id, value: `${n}×` })),
  ];
}

function quickAssets(doc: WorkspaceDocument | null): Quick[] {
  const assets: string[] = [];
  for (const pageKey of Object.keys(doc?.pageLayouts ?? {})) {
    for (const inst of doc?.pageLayouts?.[pageKey] ?? []) {
      for (const [, v] of Object.entries(inst.props ?? {})) {
        if (typeof v === 'string' && (/^https?:\/\//.test(v) || /\.(png|jpe?g|svg|webp|gif|avif)$/i.test(v))) {
          if (!assets.includes(v)) assets.push(v);
        }
      }
    }
  }
  return [
    { label: 'Referenced media', value: String(assets.length), tone: 'brand' },
    { label: 'Pages rendered', value: String(Object.keys(doc?.pageLayouts ?? {}).length) },
    { label: 'Uploads', value: 'with media lib', tone: 'warn' },
  ];
}

function quickContractNumbers(manifest: StudioManifest | null, doc: WorkspaceDocument | null): Quick[] {
  return [
    { label: 'Draft', value: `r${doc?.draftRevision ?? '—'}`, tone: 'brand' },
    { label: 'Live', value: `r${doc?.liveRevision ?? '—'}` },
    { label: 'Dirty', value: doc?.isDirty ? 'yes' : 'no', tone: doc?.isDirty ? 'warn' : 'ok' },
    { label: 'Pages', value: String(manifest?.pageCatalog.length ?? 0) },
    { label: 'Capabilities', value: String(manifest?.capabilities.length ?? 0) },
    { label: 'Data sources', value: String(manifest?.dataSources?.length ?? 0) },
  ];
}

/* State selector mirrored with the canvas simulator bar (one store). */
const QUICK_STATES: { id: SimulationState; label: string }[] = [
  { id: 'normal', label: 'Active' },
  { id: 'loading', label: 'Loading' },
  { id: 'empty', label: 'Empty' },
  { id: 'validation_error', label: 'Invalid' },
  { id: 'auth_error', label: 'Unauthorized' },
  { id: 'offline', label: 'Offline' },
];

function StateQuickControl() {
  const simulationState = store((s) => s.simulationState);
  const setSimulationState = store((s) => s.setSimulationState);

  return (
    <div>
      <Head icon={<FlaskConical className="size-3.5" />} title="Simulated state" hint="live" />
      <div className="mt-2.5 space-y-1">
        {QUICK_STATES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSimulationState(s.id)}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[12px] transition-colors ${
              simulationState === s.id
                ? 'bg-[var(--active)] font-medium text-[var(--brand-text)]'
                : 'text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground'
            }`}
          >
            {s.label}
            {simulationState === s.id ? <CheckCircle2 className="size-3.5" /> : null}
          </button>
        ))}
      </div>
      <p className="mt-2 px-2.5 text-[10.5px] leading-relaxed text-muted-foreground">
        Applies to the preview over the studio bridge — open the canvas to see it.
      </p>
    </div>
  );
}

/* Theme segment in the settings sidebar; same source of truth as the stage. */
function ThemeQuickControl() {
  const { theme, setTheme } = useTheme();
  const options: { id: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Palette className="size-3" /> },
    { id: 'dark', label: 'Dark', icon: <Palette className="size-3" /> },
    { id: 'system', label: 'System', icon: <Layers3 className="size-3" /> },
  ];
  return (
    <div>
      <Head icon={<Settings2 className="size-3.5" />} title="Studio theme" />
      <div className="studio-seg mt-2.5">
        {options.map((o) => (
          <button key={o.id} type="button" data-active={theme === o.id} onClick={() => setTheme(o.id)}>
            <span className="inline-flex items-center gap-1.5">{o.icon}{o.label}</span>
          </button>
        ))}
      </div>
      <QuickList items={[{ label: 'GORA', value: 'review ready', tone: 'brand', icon: <Bot className="size-3" /> }]} />
    </div>
  );
}

/* ── Chart cards fed from the real document ─────────────────────────────── */

/**
 * Palette: at-rest token mass per token group (real document keys may include
 * drafts beyond the canonical groups; those roll into "Advanced").
 */
function TokenMixChart({ doc }: { doc: WorkspaceDocument | null }) {
  const tokens = doc?.globalTokens ?? {};
  const data = TOKEN_GROUPS.map((g) => ({
    label: g.label,
    value: g.keys.filter((k) => k in tokens).length,
  }));
  const advanced = Math.max(
    0,
    Object.keys(tokens).length - data.reduce((n, d) => n + d.value, 0),
  );
  if (advanced > 0) data.push({ label: 'Advanced', value: advanced });
  const total = Object.keys(tokens).length;
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 px-2 pt-2 pb-1">
      <Head icon={<Palette className="size-3.5" />} title="Token mass" hint={`${total} live`} />
      {total > 0 ? (
        <BarsMini data={data} vertical height={26} />
      ) : (
        <p className="px-1.5 py-2 text-[11px] text-muted-foreground">
          No tokens yet — open the studio bench to author the system.
        </p>
      )}
    </div>
  );
}

/** Library: coverage donut (in use vs dormant) + the three busiest parts. */
function LibraryMixChart({
  manifest,
  doc,
}: {
  manifest: StudioManifest | null;
  doc: WorkspaceDocument | null;
}) {
  const counts = new Map<string, number>();
  for (const pageKey of Object.keys(doc?.pageLayouts ?? {})) {
    for (const inst of doc?.pageLayouts?.[pageKey] ?? []) {
      const id = inst.componentId ?? '';
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const instances = [...counts.values()].reduce((n, v) => n + v, 0);
  const registered = manifest?.components.length ?? 0;
  const used = counts.size;
  const unused = Math.max(registered - used, 0);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, n]) => ({ label: id, value: n }));

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 px-2 pt-2 pb-1">
      <Head icon={<Boxes className="size-3.5" />} title="Coverage" hint={`${used}/${registered} used`} />
      <div className="mt-1 grid grid-cols-[104px_1fr] items-center gap-1">
        <DonutMini
          slices={[
            { label: 'In use', value: used },
            { label: 'Dormant', value: unused },
          ]}
          height={104}
          centerValue={registered > 0 ? `${Math.round((used / registered) * 100)}%` : '—'}
          centerLabel="coverage"
        />
        <div className="pr-1.5">
          {top.length > 0 ? (
            <BarsMini data={top} vertical height={24} suffix="×" />
          ) : (
            <p className="text-[11px] leading-snug text-muted-foreground">
              No instances on pages yet.
            </p>
          )}
          <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
            {instances} instance{instances === 1 ? '' : 's'} live
          </p>
        </div>
      </div>
    </div>
  );
}

/** Setup / GORA / global: surface density — real sections per page. */
function SectionsChart({ doc }: { doc: WorkspaceDocument | null }) {
  const layouts = doc?.pageLayouts ?? {};
  const data = Object.keys(layouts)
    .map((pageKey) => ({ label: pageKey, value: layouts[pageKey]?.length ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 px-2 pt-2 pb-1">
      <Head
        icon={<FolderTree className="size-3.5" />}
        title="Surface density"
        hint={`${total} sections`}
      />
      {total > 0 ? (
        <AreaMini data={data} height={104} />
      ) : (
        <p className="px-1.5 py-2 text-[11px] text-muted-foreground">
          The provisioned pages have no sections yet.
        </p>
      )}
    </div>
  );
}
