// studio/src/components/gnapex-studio/canvas/studio-workspace-stage.tsx
//
// The station stages. Every rail station other than "explorer" renders here,
// fully wired to the real backend contract: setup validation, palette token
// authoring, component catalog, state simulation, GORA review, asset
// inventory, revision ledger and studio preferences.
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BadgeCheck,
  Banknote,
  BookOpen,
  Bot,
  Boxes,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clipboard,
  Clock,
  Compass,
  Copy,
  Database,
  FileWarning,
  FlaskConical,
  Gauge,
  Globe2,
  GraduationCap,
  Image as ImageIcon,
  Info,
  Languages,
  Laptop,
  Layers,
  Link2,
  Loader2,
  Monitor,
  Moon,
  Palette,
  ReceiptText,
  RotateCcw,
  Ruler,
  Search,
  Settings2,
  Shapes,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  Type,
  UserPlus,
  Users,
  UsersRound,
  Video,
  WandSparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import type {
  ComponentManifest,
  Diagnostic,
  GlobalTokens,
  RevisionSummary,
  StudioManifest,
  WorkspaceDocument,
} from '@/lib/contract';
import {
  BORDER_RADIUS_PRESETS,
  CANONICAL_TOKEN_KINDS,
  TOKEN_GROUPS,
  desktopSpan,
} from '@/lib/contract';
import {
  applyOperations,
  validateDocument,
  validateTokens,
} from '@/lib/api/workspace';
import {
  asHex,
  contrastReport,
  deriveTokens,
  hexToHsl,
  hslToHex,
  luminance,
  nameColor,
} from '@/lib/palette';
import {
  useDiscardDraft,
  useDiff,
  useHistory,
  useRevertToRevision,
  useSyncStatus,
} from '@/lib/api/hooks';
import { store, type ActiveStation, type SimulationState } from '@/lib/gnapex-studio/store';
import { useTheme } from '@/components/theme/theme-provider';
import { HoloWheel, HARMONIES } from '@/components/setup/color-wheel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { validateTokenValue } from '@/lib/validate';
import { cn } from '@/lib/utils';
import { BarsMini, DonutMini, StatTile, useChartTheme } from '../shell/station-charts';

type TokenValue = string | number;

/* ── shared furniture ─────────────────────────────────────────────────────── */

function StationHeader({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-[var(--active)] text-[var(--brand-text)]">
          {icon}
        </div>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-[12px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

function Chip({ children, tone = 'soft' }: { children: React.ReactNode; tone?: 'soft' | 'ok' | 'warn' | 'bad' | 'brand' }) {
  const tones: Record<string, string> = {
    soft: 'bg-[var(--soft)] text-muted-foreground',
    ok: 'bg-[var(--success)]/10 text-[var(--success)]',
    warn: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    bad: 'bg-destructive/10 text-destructive',
    brand: 'bg-[var(--active)] text-[var(--brand-text)]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function EmptyHint({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <div className="grid size-9 place-items-center rounded-full bg-[var(--soft)] text-muted-foreground">{icon}</div>
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function useProjectId(): string | null {
  return store((s) => s.meta?.projectId ?? null);
}

const card =
  'rounded-2xl border border-border bg-card/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-sm';

/* ── 1 · SETUP — live contract + validation ──────────────────────────────── */

function SetupStation({ manifest, document: doc }: { manifest: StudioManifest | null; document: WorkspaceDocument | null }) {
  const projectId = useProjectId();
  const sync = useSyncStatus(projectId ?? '');
  const [running, setRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[] | null>(null);

  const runValidation = useCallback(async () => {
    if (!projectId || !doc) return;
    setRunning(true);
    try {
      const result = await validateDocument(projectId, {
        pageLayouts: doc.pageLayouts,
        globalTokens: doc.globalTokens,
        seo: doc.seo as Record<string, unknown>,
        i18n: doc.i18n,
      });
      setDiagnostics(result.diagnostics);
      if (result.ok) toast.success('Contract validation passed', { description: 'The workspace document is consistent.' });
      else {
        const errors = result.diagnostics.filter((d: Diagnostic) => d.severity === 'error').length;
        toast.warning('Validation finished with findings', { description: `${errors} error(s).` });
      }
    } catch (error: unknown) {
      toast.error('Validation failed', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setRunning(false);
    }
  }, [projectId, doc]);

  return (
    <div className="flex h-full flex-col">
      <StationHeader
        icon={<Settings2 className="size-4" />}
        title="Setup"
        description="The live workspace contract, runtime and validation."
      >
        <Button size="sm" variant="outline" className="h-8 rounded-[10px]" onClick={runValidation} disabled={running || !doc}>
          {running ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
          Validate contract
        </Button>
      </StationHeader>

      <div className="studio-scroll flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto grid max-w-4xl gap-4">
          {/* runtime heart-beat */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Template"
              value={doc?.templateId ?? manifest?.workspaceMode ?? '—'}
              mono
              tone="brand"
              icon={<Gauge className="size-3.5" />}
            />
            <StatTile
              label="Draft revision"
              value={`r${sync.data?.draftRevision ?? doc?.draftRevision ?? '—'}`}
              icon={<BadgeCheck className="size-3.5" />}
            />
            <StatTile
              label="Live revision"
              value={`r${sync.data?.liveRevision ?? doc?.liveRevision ?? '—'}`}
              icon={<Globe2 className="size-3.5" />}
            />
            <StatTile
              label="Draft state"
              value={
                sync.data
                  ? sync.data.isDirty
                    ? 'Unpublished changes'
                    : 'In sync with live'
                  : doc?.isDirty
                    ? 'Unpublished changes'
                    : 'In sync'
              }
              tone={sync.data?.isDirty || doc?.isDirty ? 'warn' : 'ok'}
              icon={sync.data?.isDirty || doc?.isDirty ? <FileWarning className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
            />
          </div>

          {/* composition: contract pieces at a glance */}
          <CompositionCard manifest={manifest} doc={doc} />

          {/* capabilities + data sources */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className={`p-5 ${card}`}>
              <Head icon={<Gauge className="size-3.5" />} title="Capabilities" hint={`${manifest?.capabilities.length ?? 0} granted`} />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(manifest?.capabilities ?? []).map((c) => (
                  <Chip key={c} tone="brand">{c}</Chip>
                ))}
              </div>
            </section>
            <section className={`p-5 ${card}`}>
              <Head icon={<Database className="size-3.5" />} title="Data sources" hint={`${manifest?.dataSources?.length ?? 0} registered`} />
              {manifest?.dataSources?.length ? (
                <ul className="mt-3 space-y-2">
                  {manifest.dataSources.map((ds) => (
                    <li key={ds.endpoint} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] transition-colors hover:bg-[var(--hover)]">
                      <span className="font-medium text-foreground">{ds.label}</span>
                      <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
                        {ds.responseKey}
                        {ds.requiresSiteUser ? <Chip tone="warn">site-user</Chip> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[12px] text-muted-foreground">No data sources registered in the manifest.</p>
              )}
            </section>
          </div>

          {/* contract surface summary */}
          <section className={`p-5 ${card}`}>
            <Head icon={<Globe2 className="size-3.5" />} title="Route surface" hint={`${manifest?.pageCatalog.length ?? 0} pages`} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(manifest?.pageCatalog ?? []).slice(0, 12).map((p) => (
                <div key={p.key} className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2">
                  <span className="truncate font-mono text-[11px] text-foreground">{p.key}</span>
                  {p.required ? <Chip>required</Chip> : null}
                </div>
              ))}
              {(manifest?.pageCatalog.length ?? 0) > 12 && (
                <div className="grid place-items-center rounded-lg border border-dashed border-border px-2.5 py-2 text-[11px] text-muted-foreground">
                  +{manifest!.pageCatalog.length - 12} more
                </div>
              )}
            </div>
          </section>

          {/* validation diagnostics */}
          {diagnostics !== null && (
            <section className={`p-5 ${card}`}>
              <Head
                icon={diagnostics.length === 0 ? <CheckCircle2 className="size-3.5" /> : <FileWarning className="size-3.5" />}
                title="Validation report"
                hint={diagnostics.length === 0 ? 'all clear' : `${diagnostics.length} finding(s)`}
              />
              {diagnostics.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--success)]">
                  <BadgeCheck className="size-4" /> The workspace document satisfies the contract.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {diagnostics.map((d, i) => (
                    <li key={`${d.path}-${i}`} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[var(--hover)]">
                      <span
                        className={`mt-1 size-2 shrink-0 rounded-full ${
                          d.severity === 'error' ? 'bg-destructive' : d.severity === 'warning' ? 'bg-[var(--warning)]' : 'bg-[var(--info)]'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{d.path}</p>
                        <p className="text-[12.5px] text-foreground">{d.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** Contract composition: component census donut + real route density bars. */
function CompositionCard({
  manifest,
  doc,
}: {
  manifest: StudioManifest | null;
  doc: WorkspaceDocument | null;
}) {
  const categories = new Map<string, number>();
  for (const c of manifest?.components ?? []) {
    const key = c.category || 'misc';
    categories.set(key, (categories.get(key) ?? 0) + 1);
  }
  const slices = [...categories.entries()].map(([label, value]) => ({ label, value }));
  const totalComponents = slices.reduce((n, s) => n + s.value, 0);

  const layouts = doc?.pageLayouts ?? {};
  const density = Object.keys(layouts)
    .map((pageKey) => ({ label: pageKey, value: layouts[pageKey]?.length ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const totalSections = density.reduce((n, d) => n + d.value, 0);
  const palette = useChartTheme();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={`p-5 ${card}`}>
        <Head icon={<Boxes className="size-3.5" />} title="Contract census" hint={`${totalComponents} components`} />
        {totalComponents > 0 ? (
          <div className="mt-1 grid grid-cols-[120px_1fr] items-center gap-2">
            <DonutMini
              slices={slices}
              height={120}
              centerValue={String(totalComponents)}
              centerLabel="parts"
            />
            <ul className="space-y-1 pr-1">
              {slices.slice(0, 6).map((s, i) => (
                <li key={s.label} className="flex items-center gap-2 text-[11.5px]">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: palette.charts[i % palette.charts.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label.toLowerCase()}</span>
                  <span className="font-mono text-[10.5px] text-foreground">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-[12px] text-muted-foreground">No components registered in the manifest.</p>
        )}
      </section>

      <section className={`p-5 ${card}`}>
        <Head icon={<Gauge className="size-3.5" />} title="Surface density" hint={`${totalSections} sections live`} />
        {totalSections > 0 ? (
          <BarsMini data={density} vertical height={22} suffix=" sections" />
        ) : (
          <p className="mt-3 text-[12px] text-muted-foreground">
            The provisioned pages carry no sections yet — open the canvas and compose.
          </p>
        )}
      </section>
    </div>
  );
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

/* ── 2 · PALETTE — live global-token authoring ───────────────────────────── */

const FONT_STACKS = [
  'Geist, system-ui, sans-serif',
  'Inter, system-ui, sans-serif',
  'Satoshi, Inter, system-ui, sans-serif',
  'system-ui, sans-serif',
  'Georgia, serif',
  'Geist Mono, ui-monospace, monospace',
  'ui-monospace, SFMono-Regular, monospace',
];

const LENGTH_PRESETS: Record<string, string[]> = {
  contentMaxWidth: ['48rem', '60rem', '72rem', '84rem', '96rem'],
  sectionSpacing: ['2rem', '3rem', '4rem', '6rem'],
  gridGutter: ['0.75rem', '1rem', '1.5rem', '2rem'],
};

const SELECT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  theme: [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ],
  direction: [
    { value: 'ltr', label: 'Left to right' },
    { value: 'rtl', label: 'Right to left' },
  ],
  locale: [
    { value: 'en', label: 'English' },
    { value: 'sw', label: 'Kiswahili' },
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' },
  ],
  currency: [
    { value: 'USD', label: 'US Dollar' },
    { value: 'TZS', label: 'Tanzanian Shilling' },
    { value: 'KES', label: 'Kenyan Shilling' },
    { value: 'EUR', label: 'Euro' },
  ],
};

/** Human names for the token inspector. The key stays visible underneath. */
const TOKEN_LABELS: Record<string, string> = {
  primaryColor: 'Primary ink',
  secondaryColor: 'Secondary ink',
  accentColor: 'Accent ink',
  backgroundColor: 'Canvas',
  surfaceColor: 'Surface',
  textColor: 'Body ink',
  mutedTextColor: 'Muted ink',
  borderColor: 'Hairline',
  successColor: 'Success',
  warningColor: 'Warning',
  dangerColor: 'Danger',
  fontHeading: 'Heading type',
  fontBody: 'Body type',
  fontMono: 'Mono type',
  borderRadius: 'Corner radius',
  contentMaxWidth: 'Content width',
  sectionSpacing: 'Section spacing',
  gridGutter: 'Grid gutter',
  siteName: 'Site name',
  tagline: 'Tagline',
  logoUrl: 'Logo URL',
  ogImage: 'Share image',
  theme: 'Theme',
  direction: 'Direction',
  locale: 'Locale',
  currency: 'Currency',
  setupOrigin: 'Setup origin',
  setupTrack: 'Delivery track',
};

type FeatureMeta = {
  key: string;
  label: string;
  short: string;
  icon: React.ReactNode;
};

const ADVANCED_FEATURES: FeatureMeta[] = [
  { key: 'resultsOnline', label: 'Online results', short: 'Results', icon: <TrendingUp className="size-2.5" /> },
  { key: 'feeStatements', label: 'Fee statements', short: 'Fees', icon: <ReceiptText className="size-2.5" /> },
  { key: 'timetable', label: 'Timetable', short: 'Timetable', icon: <CalendarDays className="size-2.5" /> },
  { key: 'admissions', label: 'Admissions', short: 'Admissions', icon: <UserPlus className="size-2.5" /> },
  { key: 'progressTracking', label: 'Progress tracking', short: 'Progress', icon: <Gauge className="size-2.5" /> },
  { key: 'certificates', label: 'Certificates', short: 'Certs', icon: <Award className="size-2.5" /> },
  { key: 'courseCatalog', label: 'Course catalog', short: 'Catalog', icon: <BookOpen className="size-2.5" /> },
  { key: 'liveTutoring', label: 'Live tutoring', short: 'Tutoring', icon: <Video className="size-2.5" /> },
  { key: 'staffDirectory', label: 'Staff directory', short: 'Staff', icon: <Users className="size-2.5" /> },
  { key: 'cohorts', label: 'Cohorts', short: 'Cohorts', icon: <UsersRound className="size-2.5" /> },
];

type TrackMeta = {
  /** Suffix used by the setupTrack<track>Features token key. */
  key: string;
  /** Value used by the setupTrack token itself. */
  value: string;
  label: string;
  icon: React.ReactNode;
};

const ADVANCED_TRACKS: TrackMeta[] = [
  { key: 'k12', value: 'k12', label: 'K–12', icon: <GraduationCap className="size-3.5" /> },
  { key: 'nursery', value: 'nursery', label: 'Nursery', icon: <Sparkles className="size-3.5" /> },
  { key: 'primary', value: 'primary', label: 'Primary', icon: <BookOpen className="size-3.5" /> },
  { key: 'secondary', value: 'secondary', label: 'Secondary', icon: <BookOpen className="size-3.5" /> },
  { key: 'highered', value: 'higher-ed', label: 'Higher education', icon: <GraduationCap className="size-3.5" /> },
  { key: 'madrasah', value: 'madrasah', label: 'Madrasah', icon: <BookOpen className="size-3.5" /> },
  { key: 'tutoring', value: 'tutoring', label: 'Tutoring', icon: <Users className="size-3.5" /> },
  { key: 'specialneeds', value: 'special-needs', label: 'Special needs', icon: <UsersRound className="size-3.5" /> },
  { key: 'courselibrary', value: 'course-library', label: 'Course library', icon: <BookOpen className="size-3.5" /> },
  { key: 'trainernetwork', value: 'trainer-network', label: 'Trainer network', icon: <Users className="size-3.5" /> },
  { key: 'bootcampacademy', value: 'bootcamp-academy', label: 'Bootcamp academy', icon: <FlaskConical className="size-3.5" /> },
  { key: 'microcredentials', value: 'micro-credentials', label: 'Micro-credentials', icon: <BadgeCheck className="size-3.5" /> },
  { key: 'corporatetraining', value: 'corporate-training', label: 'Corporate training', icon: <Layers className="size-3.5" /> },
];

function featureTokenKey(track: TrackMeta): string {
  return `setupTrack${track.key}Features`;
}

function parseFeatures(value: TokenValue): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function tokenKind(key: string, value: TokenValue): string {
  return CANONICAL_TOKEN_KINDS[key] ?? guessKind(value);
}

function guessKind(value: TokenValue): string {
  if (typeof value !== 'string') return typeof value === 'number' ? 'length' : 'text';
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) return 'color';
  if (value.includes('serif') || value.includes('mono') || value.includes('sans')) return 'font';
  if (/^-?[\d.]+(rem|px|em|%)$/.test(value)) return 'length';
  if (value.startsWith('http')) return 'url';
  return 'text';
}

/* ── The palette atelier ─────────────────────────────────────────────────────
   Real tools, one shelf: curated brand recipes, a shade ladder and the
   legibility instrument. Every control writes ordinary global tokens into the
   draft — the save path is the same validate + bulkUpdate the header owns. */

const ATELIER_PRESETS: {
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

function paletteRadius(value: unknown): number {
  switch (String(value ?? 'soft')) {
    case 'none':
      return 4;
    case 'rounded':
      return 16;
    case 'pill':
      return 999;
    default:
      return 10;
  }
}

function contrastScore(report: { ratio: number }[]): number {
  if (!report.length) return 0;
  return Math.round(
    report.reduce((sum, row) => sum + Math.min(100, (row.ratio / 8) * 100), 0) /
      report.length,
  );
}

/** Clipboard with the same honest success/error contract everywhere. */
function copyText(value: string, label: string) {
  const fallback = () => {
    const area = document.createElement('textarea');
    area.value = value;
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
    if (ok) toast.success(`${label} copied`);
    else toast.error('The clipboard is locked', { description: value });
  };

  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    fallback();
    return;
  }
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    fallback,
  );
}

/** A live channel scale — hue, saturation or lightness. */
function ChannelMeter({
  label,
  value,
  max,
  gradient,
  display,
}: {
  label: string;
  value: number;
  max: number;
  gradient: string;
  display: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-3 font-mono text-[9px] uppercase text-muted-foreground">{label}</span>
      <span
        aria-hidden
        className="relative h-1.5 flex-1 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
        style={{ background: gradient }}
      >
        <span
          className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm"
          style={{ left: `${pct}%` }}
        />
      </span>
      <span className="w-10 text-right font-mono text-[9.5px] text-muted-foreground">{display}</span>
    </div>
  );
}

/**
 * The colour lab: the same physical wheel the setup bench uses, wired into
 * this station's draft. Hue and the inner pad write `primaryColor`; harmony
 * dots write the support pair. The hex field validates before it writes.
 */
function ColorLabCard({
  draft,
  onChange,
}: {
  draft: GlobalTokens;
  onChange: (patch: GlobalTokens) => void;
}) {
  const primary = asHex(draft.primaryColor, '#6366f1');
  const secondary = asHex(draft.secondaryColor, primary);
  const accent = asHex(draft.accentColor, secondary);
  const hsl = hexToHsl(primary) ?? { h: 244, s: 0.7, l: 0.55 };
  const secondaryHsl = hexToHsl(secondary);
  /** Black and white have no usable hue; borrow the support hue so harmony
   *  recipes still produce a real pair instead of four identical greys. */
  const neutralSeed = hsl.s < 0.04 || hsl.l < 0.02 || hsl.l > 0.98;
  const harmonyHsl = neutralSeed
    ? { h: secondaryHsl?.h ?? 244, s: Math.max(0.62, secondaryHsl?.s ?? 0.72), l: 0.55 }
    : hsl;
  const [hexEdit, setHexEdit] = useState<{ value: string; error: string | null; base: string } | null>(null);
  const hex = hexEdit && hexEdit.base === primary ? hexEdit.value : primary.toUpperCase();
  const hexError = hexEdit && hexEdit.base === primary ? hexEdit.error : null;

  const commitHex = () => {
    const next = hex.trim().toLowerCase();
    const problem = validateTokenValue('primaryColor', next);
    if (problem) {
      setHexEdit({ value: hex, error: problem, base: primary });
      return;
    }
    setHexEdit(null);
    if (next !== primary.toLowerCase()) onChange({ primaryColor: next });
  };

  const applyHarmony = (shift: number, label: string) => {
    const support = hslToHex({
      ...harmonyHsl,
      h: harmonyHsl.h + shift,
      s: Math.min(1, harmonyHsl.s * 0.95),
    });
    const highlight = hslToHex({
      ...harmonyHsl,
      h: harmonyHsl.h + shift + 18,
      l: Math.min(0.72, harmonyHsl.l + 0.12),
    });
    onChange({ secondaryColor: support, accentColor: highlight });
    toast.success(`${label} harmony applied`, {
      description: 'Secondary and accent moved. Save to draft to keep the pair.',
    });
  };

  const hueGradient =
    'linear-gradient(90deg, hsl(0 90% 58%), hsl(60 90% 54%), hsl(120 80% 48%), hsl(180 80% 48%), hsl(240 85% 60%), hsl(300 85% 58%), hsl(360 90% 58%))';

  return (
    <section className={`relative overflow-hidden p-5 ${card}`}>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full opacity-[0.13] blur-3xl"
        style={{ background: primary }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Head icon={<WandSparkles className="size-3.5" />} title="Colour lab" hint={nameColor(primary)} />
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone="brand">primary {primary.toUpperCase()}</Chip>
            <Chip>{Math.round(hsl.h)}° · {Math.round(hsl.s * 100)}% · {Math.round(hsl.l * 100)}%</Chip>
          </div>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Drag the ring for hue, the pad for depth. Harmony dots move the support pair —
          every write lands in this station&apos;s draft.
        </p>

        <div className="mt-4 grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-center">
          <div className="relative mx-auto grid w-fit place-items-center">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-2 rounded-full opacity-40 blur-2xl"
              style={{ background: primary }}
            />
            <HoloWheel
              primary={primary}
              onHue={(hue) => onChange({ primaryColor: hslToHex({ ...hsl, h: hue }) })}
              onSl={(saturation, lightness) =>
                onChange({ primaryColor: hslToHex({ h: hsl.h, s: saturation, l: lightness }) })
              }
              onHarmony={(shift) => {
                const harmony = HARMONIES.find((item) => item.shift === shift);
                applyHarmony(shift, harmony?.label ?? 'Custom');
              }}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[25px] font-semibold leading-tight tracking-tight text-foreground">
                  {nameColor(primary)}
                </p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {primary} · primary colour
                </p>
              </div>
              <div className="flex items-start gap-2">
                <label
                  className="relative size-11 shrink-0 overflow-hidden rounded-2xl border border-border shadow-sm"
                  style={{ background: primary }}
                  title="Pick a primary colour"
                >
                  <input
                    type="color"
                    value={primary}
                    onChange={(event) => onChange({ primaryColor: event.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Pick primary colour"
                  />
                  <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/25" />
                </label>
                <div className="w-[124px]">
                  <Input
                    value={hex}
                    onChange={(event) => {
                      setHexEdit({ value: event.target.value, error: null, base: primary });
                    }}
                    onBlur={commitHex}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        commitHex();
                      } else if (event.key === 'Escape') {
                        setHexEdit(null);
                      }
                    }}
                    aria-label="Primary colour value"
                    aria-invalid={Boolean(hexError)}
                    spellCheck={false}
                    className="h-8 rounded-lg font-mono text-[11px] uppercase"
                  />
                  {hexError ? (
                    <p className="mt-1 text-[8.5px] leading-tight text-destructive" title={hexError}>
                      Invalid colour
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => copyText(primary.toUpperCase(), 'Primary hex')}
                      className="mt-1 inline-flex items-center gap-1 text-[8.5px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Copy className="size-2.5" />
                      Copy hex
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-1.5 rounded-xl border border-border/60 bg-[var(--soft)]/50 p-2.5">
              <ChannelMeter
                label="H"
                value={hsl.h}
                max={360}
                gradient={hueGradient}
                display={`${Math.round(hsl.h)}°`}
              />
              <ChannelMeter
                label="S"
                value={hsl.s * 100}
                max={100}
                gradient={`linear-gradient(90deg, ${hslToHex({ ...hsl, s: 0 })}, ${hslToHex({ ...hsl, s: 1 })})`}
                display={`${Math.round(hsl.s * 100)}%`}
              />
              <ChannelMeter
                label="L"
                value={hsl.l * 100}
                max={100}
                gradient={`linear-gradient(90deg, #000, ${hslToHex({ ...hsl, l: 0.5 })}, #fff)`}
                display={`${Math.round(hsl.l * 100)}%`}
              />
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Harmony recipes
                </p>
                <span className="text-[8.5px] text-muted-foreground/70">
                  {neutralSeed ? 'support hue · neutral primary' : 'secondary · accent'}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {HARMONIES.map((harmony) => {
                  const target = hslToHex({
                    h: harmonyHsl.h + harmony.shift,
                    s: harmonyHsl.s,
                    l: 0.55,
                  });
                  const highlight = hslToHex({
                    h: harmonyHsl.h + harmony.shift + 18,
                    s: harmonyHsl.s,
                    l: Math.min(0.72, harmonyHsl.l + 0.12),
                  });
                  return (
                    <button
                      key={harmony.key}
                      type="button"
                      onClick={() => applyHarmony(harmony.shift, harmony.label)}
                      title={`${harmony.label}: move support colours to hue ${Math.round((harmonyHsl.h + harmony.shift) % 360)}°`}
                      className="group flex min-w-0 items-center gap-1.5 rounded-lg border border-border/60 px-1.5 py-1.5 text-left transition-colors hover:border-[var(--brand-text)]/40 hover:bg-[var(--hover)]"
                    >
                      <span className="relative flex shrink-0 items-center" aria-hidden>
                        <span className="size-4 rounded-full border border-white/30" style={{ background: primary }} />
                        <span
                          className="-ml-1.5 size-4 rounded-full border border-white/30 ring-2 ring-[var(--card)]"
                          style={{ background: target }}
                        />
                        <span
                          className="-ml-1.5 size-4 rounded-full border border-white/30 ring-2 ring-[var(--card)]"
                          style={{ background: highlight }}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[9.5px] font-semibold text-foreground">
                          {harmony.label}
                        </span>
                        <span className="block truncate font-mono text-[7.5px] uppercase text-muted-foreground">
                          {target}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-[var(--soft)]/50 px-2.5 py-2">
              <span className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                trio
              </span>
              {[
                { label: 'P', value: primary },
                { label: 'S', value: secondary },
                { label: 'A', value: accent },
              ].map((swatch) => (
                <button
                  key={swatch.label}
                  type="button"
                  onClick={() => copyText(swatch.value.toUpperCase(), `${swatch.label} hex`)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 py-0.5 pl-0.5 pr-2 transition-colors hover:border-[var(--brand-text)]/40 hover:bg-[var(--hover)]"
                  title={`Copy ${swatch.value.toUpperCase()}`}
                >
                  <span
                    className="size-4 rounded-full border border-border/70"
                    style={{ background: swatch.value }}
                  />
                  <span className="font-mono text-[8.5px] uppercase text-muted-foreground group-hover:text-foreground">
                    {swatch.label} · {swatch.value}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The live board: the portal's own hero painted from the draft tokens. */
function PaletteBrandBoard({
  draft,
  report,
  score,
  tokenCount,
  groupCount,
  dirty,
  onSyncInks,
  onRederive,
}: {
  draft: GlobalTokens;
  report: { label: string; ratio: number; grade: string }[];
  score: number;
  tokenCount: number;
  groupCount: number;
  dirty: boolean;
  onSyncInks: () => void;
  onRederive: () => void;
}) {
  const primary = asHex(draft.primaryColor, '#6366f1');
  const secondary = asHex(draft.secondaryColor, primary);
  const accent = asHex(draft.accentColor, secondary);
  const surface = asHex(draft.surfaceColor, '#f8fafc');
  const text = asHex(draft.textColor, '#0f172a');
  const border = asHex(draft.borderColor, '#e2e8f0');
  const heading = String(draft.fontHeading ?? 'inherit');
  const body = String(draft.fontBody ?? 'inherit');
  const radius = paletteRadius(draft.borderRadius);
  // White ink over a scrim (below) reads on every brand gradient — including
  // near-black primaries that would make a luminance-derived ink invisible.
  const onBrand = '#ffffff';
  const anyLow = report.some((row) => row.grade === 'low');
  const anyLarge = report.some((row) => row.grade === 'large');
  const tone = anyLow ? 'var(--danger)' : anyLarge ? 'var(--warning)' : 'var(--success)';
  const verdict = anyLow ? 'Below the floor' : anyLarge ? 'Large text only' : 'Storefront ready';
  const theme = String(draft.theme ?? 'light');
  const density =
    String(draft.contentMaxWidth ?? '') === '68rem'
      ? 'compact'
      : String(draft.contentMaxWidth ?? '') === '84rem'
        ? 'spacious'
        : 'balanced';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border">
      <div
        className="relative isolate overflow-hidden"
        style={{
          background: `linear-gradient(125deg, ${primary} 0%, ${secondary} 62%, ${accent} 100%)`,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 8% 0%, rgba(255,255,255,0.30), transparent 55%), radial-gradient(120% 90% at 100% 100%, rgba(0,0,0,0.30), transparent 58%)',
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(96deg, rgba(6,8,16,0.62) 0%, rgba(6,8,16,0.36) 52%, rgba(6,8,16,0.04) 100%)',
          }}
        />
        <div className="relative grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_268px] lg:items-center lg:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]"
                style={{ background: 'rgba(8,10,18,0.38)', color: onBrand }}
              >
                <span className="size-1.5 animate-pulse rounded-full" style={{ background: tone }} />
                live palette
              </span>
              {[
                `theme ${theme}`,
                `${String(draft.borderRadius ?? 'soft')} corners`,
                `${density} rhythm`,
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                  style={{ background: 'rgba(8,10,18,0.32)', color: onBrand, opacity: 0.82 }}
                >
                  {chip}
                </span>
              ))}
              {dirty ? (
                <span className="rounded-full bg-[var(--warning)]/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-black/80">
                  draft changed
                </span>
              ) : null}
            </div>

            <p
              className="mt-3 font-mono text-[9px] uppercase tracking-[0.26em]"
              style={{ color: onBrand, opacity: 0.62 }}
            >
              The portal, as the tokens stand
            </p>
            <p
              className="mt-1.5 text-balance text-[27px] font-semibold leading-[1.05] tracking-tight"
              style={{ color: onBrand, fontFamily: heading }}
            >
              {String(draft.siteName ?? 'Your workspace')}
            </p>
            <p
              className="mt-1.5 max-w-lg text-[12.5px] leading-relaxed"
              style={{ color: onBrand, opacity: 0.8, fontFamily: body }}
            >
              {String(draft.tagline ?? 'A headline that sounds like you.')}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="px-3 py-1.5 text-[11px] font-semibold"
                style={{
                  background: '#ffffff',
                  color: '#0b1220',
                  borderRadius: Math.min(radius, 999),
                }}
              >
                Primary action
              </span>
              <span
                className="border px-3 py-1.5 text-[11px] font-medium"
                style={{ color: onBrand, borderColor: `${onBrand}66`, borderRadius: radius }}
              >
                Secondary
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                style={{ background: surface, color: text, border: `1px solid ${border}` }}
              >
                card surface
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {[
                { label: 'Primary', value: primary },
                { label: 'Secondary', value: secondary },
                { label: 'Accent', value: accent },
              ].map((swatch) => (
                <div key={swatch.label} className="flex items-center gap-2">
                  <span
                    className="size-7 rounded-lg border border-white/45 shadow-sm"
                    style={{ background: swatch.value }}
                  />
                  <span className="leading-tight">
                    <span
                      className="block text-[8.5px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: onBrand, opacity: 0.58 }}
                    >
                      {swatch.label}
                    </span>
                    <span
                      className="block font-mono text-[10px]"
                      style={{ color: onBrand, opacity: 0.86 }}
                    >
                      {swatch.value.toUpperCase()} · {nameColor(swatch.value)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* The instrument panel: score, verdict, real pairings */}
          <div
            className="rounded-2xl border p-3.5 backdrop-blur-md"
            style={{ borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(8,10,18,0.55)' }}
          >
            <div className="flex items-center gap-3.5">
              <span className="relative grid size-[68px] shrink-0 place-items-center">
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${tone} ${score * 3.6}deg, rgba(255,255,255,0.16) 0)`,
                  }}
                />
                <span
                  className="absolute inset-[7px] rounded-full"
                  style={{ background: 'rgba(8,10,18,0.82)' }}
                />
                <span className="relative text-center">
                  <span className="block font-mono text-[17px] font-bold leading-none text-white">
                    {score}
                  </span>
                  <span className="mt-0.5 block font-mono text-[6.5px] uppercase tracking-[0.18em] text-white/55">
                    score
                  </span>
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Readability
                </p>
                <p className="mt-0.5 truncate text-[12.5px] font-semibold text-white">{verdict}</p>
                <p className="mt-0.5 text-[9px] text-white/60">
                  {tokenCount} tokens · {groupCount} groups
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onSyncInks}
                className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[9.5px] font-semibold text-white transition-colors hover:bg-white/20"
              >
                Sync inks
              </button>
              <button
                type="button"
                onClick={onRederive}
                className="rounded-lg border border-white/20 px-2 py-1.5 text-[9.5px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                Re-derive
              </button>
            </div>

            <ul className="mt-3 space-y-1">
              {report.map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-2 text-[9px] text-white/65"
                >
                  <span className="min-w-0 truncate">{row.label}</span>
                  <span className="shrink-0 font-mono">
                    {row.ratio.toFixed(1)} · {row.grade}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function AtelierCard({
  draft,
  onApply,
}: {
  draft: GlobalTokens;
  onApply: (preset: (typeof ATELIER_PRESETS)[number]) => void;
}) {
  const active = String(draft.primaryColor ?? '').toLowerCase();
  return (
    <section className={`p-4 ${card}`}>
      <Head icon={<Sparkles className="size-3.5" />} title="Atelier" hint={`${ATELIER_PRESETS.length} recipes`} />
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        A brand set that clears the lab — every token stays yours to tune.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ATELIER_PRESETS.map((preset) => {
          const selected = active === preset.primary.toLowerCase();
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onApply(preset)}
              className={`group overflow-hidden rounded-xl border text-left transition-all hover:-translate-y-0.5 ${
                selected
                  ? 'border-[var(--brand-text)]/60 ring-1 ring-[var(--brand-text)]/30'
                  : 'border-border/70 hover:border-[var(--brand-text)]/40'
              }`}
            >
              <span
                className="relative block h-7 w-full"
                style={{
                  background: `linear-gradient(100deg, ${preset.primary}, ${preset.secondary} 64%, ${preset.accent})`,
                }}
              >
                <span className="absolute inset-0 bg-[radial-gradient(120%_100%_at_10%_0%,rgba(255,255,255,0.34),transparent_58%)]" />
              </span>
              <span className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate text-[10.5px] font-semibold text-foreground">
                    {preset.label}
                  </span>
                  <span className="block truncate text-[8.5px] text-muted-foreground">
                    {preset.vibe}
                    {preset.theme === 'dark' ? ' · dark' : ''}
                  </span>
                </span>
                {selected ? <Check className="size-3 shrink-0 text-[var(--brand-text)]" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ShadeLadderCard({
  draft,
  onPick,
}: {
  draft: GlobalTokens;
  onPick: (value: string) => void;
}) {
  const primary = asHex(draft.primaryColor, '#6366f1');
  const accent = asHex(draft.accentColor, primary);
  const hsl = hexToHsl(primary) ?? { h: 244, s: 0.7, l: 0.55 };
  const steps = [0.97, 0.92, 0.84, 0.75, 0.66, 0.56, 0.46, 0.36, 0.26, 0.17];
  const labels = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
  const rungs = steps.map((l) => hslToHex({ ...hsl, l }));

  return (
    <section className={`p-4 ${card}`}>
      <Head icon={<Palette className="size-3.5" />} title="Shade ladder" hint="primary scale" />
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Drag the eye down the scale — click a step to make it the accent.
      </p>
      <div
        className="mt-3 grid grid-cols-10 overflow-hidden rounded-lg border border-border/70"
        role="group"
        aria-label="Primary shade ladder — pick the accent"
      >
        {rungs.map((rung, index) => {
          const isAccent = accent.toLowerCase() === rung.toLowerCase();
          return (
            <button
              key={`${rung}-${index}`}
              type="button"
              onClick={() => onPick(rung)}
              title={`${rung.toUpperCase()} — ${nameColor(rung)}`}
              className="group relative h-16 transition-transform hover:scale-y-105"
              style={{ background: rung }}
            >
              <span
                className="absolute inset-x-0 top-1 text-center font-mono text-[6.5px] font-semibold uppercase tracking-wide"
                style={{ color: luminance(rung) > 0.4 ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.72)' }}
              >
                {labels[index]}
              </span>
              {isAccent ? (
                <span className="absolute inset-x-0.5 bottom-1 rounded-sm bg-black/55 py-0.5 text-center font-mono text-[6px] font-semibold uppercase tracking-wider text-white">
                  accent
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
        <span>tint</span>
        <span>{primary.toUpperCase()}</span>
        <span>shade</span>
      </div>
    </section>
  );
}

function ReadabilityCard({
  report,
  score,
  onFix,
}: {
  report: { label: string; ratio: number; grade: string }[];
  score: number;
  onFix: () => void;
}) {
  return (
    <section className={`p-4 ${card}`}>
      <Head icon={<ShieldCheck className="size-3.5" />} title="Readability" hint={`score ${score}`} />
      <ul className="mt-2.5 space-y-1.5">
        {report.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-2 rounded-lg bg-[var(--soft)] px-2.5 py-1.5"
          >
            <span className="min-w-0 truncate text-[10px] text-muted-foreground">{row.label}</span>
            <span
              className="shrink-0 font-mono text-[9.5px] font-semibold"
              style={{
                color:
                  row.grade === 'low'
                    ? 'var(--danger)'
                    : row.grade === 'large'
                      ? 'var(--warning)'
                      : 'var(--success)',
              }}
            >
              {row.ratio.toFixed(1)} · {row.grade}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onFix}
        className="focus-ring mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[10.5px] font-medium text-foreground transition-colors hover:border-[var(--brand-text)]/40 hover:bg-[var(--hover)]"
      >
        <RotateCcw className="size-3" />
        Re-derive the inks
      </button>
      <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
        WCAG 2 · AA 4.5 · AAA 7. Written into the draft only.
      </p>
    </section>
  );
}

function PaletteStation({ document: doc }: { document: WorkspaceDocument | null }) {
  const projectId = useProjectId();
  const hydrateDocument = store((s) => s.hydrateDocument);
  const [draft, setDraft] = useState<GlobalTokens>({});
  const [draftRev, setDraftRev] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [changedOnly, setChangedOnly] = useState(false);

  // Adopt a freshly saved server document when nothing is dirty. Adjusting
  // state during render (guarded) keeps the draft local while the server doc
  // flows in — no effect, no cascading render.
  const docRev = doc?.draftRevision ?? null;
  if (doc && !dirty && draftRev !== docRev) {
    setDraftRev(docRev);
    setDraft({ ...doc.globalTokens });
  }

  const setToken = (key: string, value: TokenValue) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const setTokens = (patch: GlobalTokens) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const entryKeys = useMemo(() => {
    const keys = new Set<string>([...Object.keys(doc?.globalTokens ?? {}), ...Object.keys(draft)]);
    return [...keys].sort((a, b) => {
      const ia = TOKEN_GROUPS.findIndex((g) => g.keys.includes(a));
      const ib = TOKEN_GROUPS.findIndex((g) => g.keys.includes(b));
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [doc?.globalTokens, draft]);

  const validate = async () => {
    if (!projectId) return;
    setValidating(true);
    try {
      const result = await validateTokens(projectId, draft);
      if (result.ok) {
        toast.success('Tokens are valid against the contract');
        setDraft(result.tokens as GlobalTokens);
      } else {
        const first = result.issues[0];
        toast.error('Token validation failed', {
          description: result.issues.length > 1 ? `${first?.message} (+${result.issues.length - 1} more)` : first?.message,
        });
      }
    } catch (error: unknown) {
      toast.error('Validation request failed', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setValidating(false);
    }
  };

  const save = async () => {
    if (!projectId || !doc) return;
    setSaving(true);
    try {
      const check = await validateTokens(projectId, draft);
      if (!check.ok) {
        toast.error('Fix token issues first', {
          description: check.issues.slice(0, 2).map((i) => i.message).join(' · '),
        });
        setSaving(false);
        return;
      }
      await applyOperations(projectId, {
        operations: [{ op: 'token.bulkUpdate', tokens: draft }],
        baseRevision: doc.draftRevision,
        message: 'Palette: global token update from Studio',
      });
      hydrateDocument({ ...doc, globalTokens: draft, isDirty: true });
      setDraftRev((doc.draftRevision ?? 0) + 1);
      setDirty(false);
      toast.success('Palette saved to draft', { description: 'Publish to roll the new tokens live.' });
    } catch (error: unknown) {
      toast.error('Save failed', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (doc) setDraft({ ...doc.globalTokens });
    setDirty(false);
    toast('Draft palette reverted to the saved document');
  };

  const groups = useMemo(() => {
    const grouped = TOKEN_GROUPS.map((g) => ({ ...g, keys: g.keys.filter((k) => entryKeys.includes(k)) }));
    const orphanKeys = entryKeys.filter((k) => !TOKEN_GROUPS.some((g) => g.keys.includes(k)));
    if (orphanKeys.length) grouped.push({ label: 'Advanced', keys: orphanKeys });
    return grouped.filter((g) => g.keys.length > 0);
  }, [entryKeys]);

  const visibleGroups = groupFilter === 'all' ? groups : groups.filter((g) => g.label === groupFilter);

  const report = useMemo(() => contrastReport(draft), [draft]);
  const score = contrastScore(report);
  const needle = query.trim().toLowerCase();
  const changedCount = entryKeys.filter(
    (key) => String(draft[key]) !== String(doc?.globalTokens?.[key]),
  ).length;
  const filteredGroups = visibleGroups
    .map((group) => ({
      ...group,
      keys: group.keys.filter((key) => {
        if (changedOnly && String(draft[key]) === String(doc?.globalTokens?.[key])) return false;
        if (!needle) return true;
        return (
          key.toLowerCase().includes(needle) ||
          String(draft[key] ?? '').toLowerCase().includes(needle)
        );
      }),
    }))
    .filter((group) => group.keys.length > 0);

  const brandTokens = (tokens: GlobalTokens) =>
    deriveTokens({
      primary: asHex(tokens.primaryColor),
      secondary: asHex(tokens.secondaryColor),
      accent: asHex(tokens.accentColor),
      theme: String(tokens.theme ?? 'light') === 'dark' ? 'dark' : 'light',
    });

  const applyPreset = (preset: (typeof ATELIER_PRESETS)[number]) => {
    setDraft((current) => ({ ...current, ...deriveTokens(preset) }));
    setDirty(true);
    toast(`${preset.label} recipe loaded`, {
      description: 'Brand, surfaces and inks written to the draft — save to keep it.',
    });
  };

  const syncInks = () => {
    setDraft((current) => {
      const derived = brandTokens(current);
      return { ...current, textColor: derived.textColor, mutedTextColor: derived.mutedTextColor };
    });
    setDirty(true);
    toast('Inks re-derived for readability', {
      description: 'Text and muted text now clear WCAG AA against the current surfaces.',
    });
  };

  const rederiveSurfaces = () => {
    setDraft((current) => ({ ...current, ...brandTokens(current) }));
    setDirty(true);
    toast('Surfaces re-derived from the brand', {
      description: 'Every background, border and ink now shares one hue family.',
    });
  };

  return (
    <div className="flex h-full flex-col">
      <StationHeader
        icon={<Palette className="size-4" />}
        title="Palette"
        description="Author the global design tokens — colors, type, shape, layout."
      >
        {dirty ? <Chip tone="warn">unsaved changes</Chip> : <Chip tone="ok">in sync</Chip>}
        <Button size="sm" variant="outline" className="h-8 rounded-[10px]" onClick={validate} disabled={validating}>
          {validating ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
          Validate
        </Button>
        <Button size="sm" variant="ghost" className="h-8 rounded-[10px] text-muted-foreground" onClick={discard} disabled={!dirty || saving}>
          Discard
        </Button>
        <Button size="sm" className="h-8 rounded-[10px]" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Save to draft
        </Button>
      </StationHeader>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-6 py-2">
        <button
          type="button"
          onClick={() => setGroupFilter('all')}
          data-active={groupFilter === 'all'}
          className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-[var(--hover)] data-[active=true]:bg-[var(--active)] data-[active=true]:text-[var(--brand-text)]"
        >
          All groups
        </button>
        {groups.map((g) => (
          <button
            key={g.label}
            type="button"
            onClick={() => setGroupFilter(g.label)}
            data-active={groupFilter === g.label}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-[var(--hover)] data-[active=true]:bg-[var(--active)] data-[active=true]:text-[var(--brand-text)]"
          >
            {g.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <label className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-[var(--hover)]">
            <Switch
              size="sm"
              checked={changedOnly}
              onCheckedChange={(next) => setChangedOnly(Boolean(next))}
              aria-label="Show changed tokens only"
            />
            Changed{changedCount ? ` · ${changedCount}` : ''}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter tokens…"
              aria-label="Filter tokens"
              spellCheck={false}
              className="h-7 w-44 rounded-full bg-transparent pl-8 pr-2.5 text-[11px]"
            />
          </div>
        </div>
      </div>

      <div className="studio-scroll flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-5xl space-y-4">
          <PaletteBrandBoard
            draft={draft}
            report={report}
            score={score}
            tokenCount={entryKeys.length}
            groupCount={groups.length}
            dirty={dirty}
            onSyncInks={syncInks}
            onRederive={rederiveSurfaces}
          />

          <ColorLabCard draft={draft} onChange={setTokens} />

          <div className="grid gap-4 lg:grid-cols-3">
            <AtelierCard draft={draft} onApply={applyPreset} />
            <ShadeLadderCard
              draft={draft}
              onPick={(value) => {
                setToken('accentColor', value);
                toast(`Accent set to ${value.toUpperCase()}`, {
                  description: 'Save to draft to commit the palette.',
                });
              }}
            />
            <ReadabilityCard report={report} score={score} onFix={syncInks} />
          </div>

          {filteredGroups.map((group) => {
            if (group.label === 'Advanced') {
              return (
                <AdvancedToolsCard
                  key={group.label}
                  keys={group.keys}
                  draft={draft}
                  saved={doc?.globalTokens ?? {}}
                  onChange={setToken}
                />
              );
            }
            const colors = group.keys
              .filter((key) => tokenKind(key, draft[key] ?? '') === 'color')
              .slice(0, 6);
            return (
              <section key={group.label} className={`p-5 ${card}`}>
                <div className="flex items-start justify-between gap-3">
                  <Head icon={<Palette className="size-3.5" />} title={group.label} hint={`${group.keys.length} tokens`} />
                  {colors.length ? (
                    <div className="flex -space-x-1 pt-0.5">
                      {colors.map((key) => (
                        <span
                          key={key}
                          title={`${key} · ${asHex(draft[key], '#94a3b8').toUpperCase()}`}
                          className="size-3.5 rounded-full border border-[var(--background)] shadow-sm"
                          style={{ background: asHex(draft[key], '#94a3b8') }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                  {group.keys.map((key) => (
                    <TokenRowControl
                      key={key}
                      tokenKey={key}
                      value={draft[key] ?? doc?.globalTokens?.[key] ?? ''}
                      savedValue={doc?.globalTokens?.[key] ?? ''}
                      changed={dirty && String(draft[key]) !== String(doc?.globalTokens?.[key])}
                      onChange={(v) => setToken(key, v)}
                      onRevert={() => setToken(key, doc?.globalTokens?.[key] ?? '')}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {filteredGroups.length === 0 ? (
            <div className={`flex flex-col items-center gap-1.5 px-6 py-10 text-center ${card}`}>
              <Search className="size-4 text-muted-foreground" />
              <p className="text-[12.5px] font-medium text-foreground">No tokens match that filter</p>
              <p className="text-[11px] text-muted-foreground">
                Try another word, or include unchanged tokens again.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-1 h-7 rounded-lg text-[11px]"
                onClick={() => {
                  setQuery('');
                  setChangedOnly(false);
                  setGroupFilter('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type TokenSelectOption = { value: string; label: string; node?: React.ReactNode };

/** Compact shadcn Select used by every select-shaped token in this station. */
function TokenSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'Choose…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: TokenSelectOption[];
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}) {
  const EMPTY = '__empty__';
  const merged =
    value && !options.some((option) => option.value === value)
      ? [{ value, label: value }, ...options]
      : options;

  return (
    <Select
      value={value || EMPTY}
      onValueChange={(next) => {
        if (next !== EMPTY) onChange(next);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn(
          'h-8 w-full rounded-lg border-border/70 bg-transparent px-2.5 text-[11px] shadow-none',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72 min-w-[180px]">
        {merged
          .filter((option) => option.value)
          .map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-[11.5px]">
              {option.node ?? option.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'color':
      return 'colour';
    case 'radius':
      return 'shape';
    case 'length':
      return 'length';
    default:
      return kind;
  }
}

function tokenMeta(tokenKey: string, kind: string): { icon: React.ReactNode; label: string } {
  const label =
    TOKEN_LABELS[tokenKey] ??
    tokenKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase())
      .trim();

  const icon =
    tokenKey === 'theme' ? (
      <Sun className="size-3" />
    ) : tokenKey === 'direction' ? (
      <ArrowRight className="size-3" />
    ) : tokenKey === 'locale' ? (
      <Languages className="size-3" />
    ) : tokenKey === 'currency' ? (
      <Banknote className="size-3" />
    ) : kind === 'color' ? (
      <Palette className="size-3" />
    ) : kind === 'font' ? (
      <Type className="size-3" />
    ) : kind === 'radius' ? (
      <Shapes className="size-3" />
    ) : kind === 'length' ? (
      <Ruler className="size-3" />
    ) : kind === 'url' ? (
      <Link2 className="size-3" />
    ) : (
      <Settings2 className="size-3" />
    );

  return { icon, label };
}

/**
 * One token, treated like an instrument: a readable name, the contract key,
 * type-aware control, live validation, copy and revert. Native selects are
 * replaced with the studio's shadcn Select so the filterable menu works here
 * too.
 */
function TokenRowControl({
  tokenKey,
  value,
  savedValue,
  changed,
  onChange,
  onRevert,
}: {
  tokenKey: string;
  value: TokenValue;
  savedValue: TokenValue;
  changed: boolean;
  onChange: (value: TokenValue) => void;
  onRevert: () => void;
}) {
  const kind = tokenKind(tokenKey, value);
  const strValue = String(value ?? '');
  const problem = validateTokenValue(tokenKey, strValue);
  const meta = tokenMeta(tokenKey, kind);
  const isHex = hexToHsl(strValue) !== null;

  const fontOptions = [...FONT_STACKS];
  if (strValue && !fontOptions.includes(strValue)) fontOptions.push(strValue);

  const radiusOptions: string[] = [...BORDER_RADIUS_PRESETS];
  if (strValue && !radiusOptions.includes(strValue)) radiusOptions.push(strValue);

  const selectOptions = SELECT_OPTIONS[tokenKey] ?? [];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border px-3 py-2.5 transition-all',
        changed
          ? 'border-[var(--warning)]/45 bg-[var(--warning)]/[0.055] shadow-[0_8px_24px_-20px_rgba(217,119,6,0.55)]'
          : 'border-border/60 bg-[var(--soft)]/30 hover:border-border hover:bg-[var(--soft)]/55',
      )}
    >
      {changed ? (
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-[2.5px] rounded-full bg-[var(--warning)]"
        />
      ) : null}

      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-[var(--soft)] text-muted-foreground transition-colors group-hover:text-foreground">
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[11.5px] font-semibold text-foreground">{meta.label}</p>
            {changed ? (
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--warning)]" title="Changed" />
            ) : null}
          </div>
          <p className="truncate font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground/60">
            {tokenKey} · {kindLabel(kind)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
          {changed ? (
            <button
              type="button"
              onClick={onRevert}
              title={`Revert ${tokenKey} to ${String(savedValue) || 'the saved value'}`}
              aria-label={`Revert ${tokenKey}`}
              className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
            >
              <RotateCcw className="size-3" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => copyText(tokenKey, 'Token name')}
            title={`Copy ${tokenKey}`}
            aria-label={`Copy ${tokenKey}`}
            className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
          >
            <Copy className="size-3" />
          </button>
        </div>
      </div>

      <div className="mt-2">
        {kind === 'color' ? (
          <div className="flex items-center gap-2">
            <label
              className={cn(
                'relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border/70',
                !isHex && 'bg-[conic-gradient(#e2e8f0_25%,transparent_0_50%,#e2e8f0_0_75%,transparent_0)] bg-[length:8px_8px]',
              )}
              style={isHex ? { background: strValue } : undefined}
              title={`Pick ${meta.label}`}
            >
              <input
                type="color"
                value={asHex(strValue, '#6366f1')}
                onChange={(event) => onChange(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={`Pick ${meta.label}`}
              />
              {!isHex ? (
                <span className="pointer-events-none grid h-full place-items-center text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                  fx
                </span>
              ) : null}
              <span className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20" />
            </label>
            <Input
              value={strValue}
              onChange={(event) => onChange(event.target.value)}
              aria-label={`${meta.label} value`}
              aria-invalid={Boolean(problem)}
              spellCheck={false}
              className="h-8 flex-1 font-mono text-[11px]"
            />
            {!problem ? (
              <span className="hidden shrink-0 rounded-md bg-[var(--soft)] px-1.5 py-0.5 text-[8.5px] text-muted-foreground sm:inline">
                {nameColor(strValue)}
              </span>
            ) : null}
          </div>
        ) : null}

        {kind === 'font' ? (
          <div className="space-y-1">
            <TokenSelect
              value={strValue}
              onChange={(next) => onChange(next)}
              ariaLabel={`Choose ${meta.label}`}
              options={fontOptions.map((font) => ({
                value: font,
                label: font.split(',')[0] ?? font,
                node: (
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="truncate" style={{ fontFamily: font }}>
                      {font.split(',')[0] ?? font}
                    </span>
                    <span className="text-[10px] text-muted-foreground" style={{ fontFamily: font }}>
                      Aa
                    </span>
                  </span>
                ),
              }))}
            />
            {strValue ? (
              <p className="truncate px-0.5 text-[13px] text-foreground" style={{ fontFamily: strValue }}>
                The quick brown fox
              </p>
            ) : null}
          </div>
        ) : null}

        {kind === 'radius' ? (
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/60 bg-[var(--soft)]">
              <span
                className="size-4 border border-foreground/40 bg-card"
                style={{ borderRadius: Math.min(paletteRadius(strValue), 999) }}
              />
            </span>
            <TokenSelect
              value={strValue}
              onChange={(next) => onChange(next)}
              ariaLabel={`Choose ${meta.label}`}
              options={radiusOptions.map((radius) => ({
                value: radius,
                label: radius,
                node: (
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="capitalize">{radius}</span>
                    <span
                      className="h-3 w-3 border border-current opacity-60"
                      style={{ borderRadius: Math.min(paletteRadius(radius), 999) }}
                    />
                  </span>
                ),
              }))}
            />
          </div>
        ) : null}

        {kind === 'length' ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1">
              {(LENGTH_PRESETS[tokenKey] ?? ['1rem', '2rem']).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange(preset)}
                  className={cn(
                    'rounded-md px-1.5 py-0.5 font-mono text-[9.5px] transition-colors',
                    strValue === preset
                      ? 'bg-[var(--active)] text-[var(--brand-text)]'
                      : 'bg-[var(--soft)] text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={strValue}
                onChange={(event) => onChange(event.target.value)}
                aria-label={`${meta.label} value`}
                aria-invalid={Boolean(problem)}
                spellCheck={false}
                className="h-8 flex-1 font-mono text-[11px]"
              />
              <span className="shrink-0 rounded-md bg-[var(--soft)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
                px · rem · %
              </span>
            </div>
          </div>
        ) : null}

        {['theme', 'direction', 'locale', 'currency'].includes(kind) ? (
          <TokenSelect
            value={strValue}
            onChange={(next) => onChange(next)}
            ariaLabel={`Choose ${meta.label}`}
            options={selectOptions.map((option) => ({
              value: option.value,
              label: option.label,
              node:
                tokenKey === 'theme' ? (
                  <span className="inline-flex items-center gap-1.5">
                    {option.value === 'light' ? (
                      <Sun className="size-3 text-[var(--warning)]" />
                    ) : option.value === 'dark' ? (
                      <Moon className="size-3 text-[var(--brand-text)]" />
                    ) : (
                      <Monitor className="size-3 text-muted-foreground" />
                    )}
                    {option.label}
                  </span>
                ) : undefined,
            }))}
          />
        ) : null}

        {kind === 'text' || kind === 'url' || kind === 'unknown' ? (
          <div className="flex items-center gap-2">
            <Input
              value={strValue}
              onChange={(event) => onChange(event.target.value)}
              aria-label={`${meta.label} value`}
              aria-invalid={Boolean(problem)}
              spellCheck={false}
              className="h-8 flex-1 text-[11px]"
            />
            {kind === 'url' ? (
              problem ? (
                <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
              ) : (
                <Check className="size-3.5 shrink-0 text-[var(--success)]" />
              )
            ) : null}
          </div>
        ) : null}
      </div>

      {problem ? (
        <p className="mt-1.5 flex items-start gap-1 text-[9px] leading-tight text-destructive">
          <AlertTriangle className="mt-px size-2.5 shrink-0" />
          {problem}
        </p>
      ) : null}
    </div>
  );
}

/* ── Advanced setup grammar — a real capability matrix ──────────────────── */

function RadialMeter({
  value,
  total,
  hue,
  changed,
  size = 72,
}: {
  value: number;
  total: number;
  hue: number;
  changed: boolean;
  size?: number;
}) {
  const safeTotal = Math.max(total, 1);
  const pct = Math.round((value / safeTotal) * 100);
  const stroke = Math.max(3.5, size * 0.075);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <span
      role="img"
      aria-label={`${value} of ${total} capabilities on, ${pct} percent`}
      title={`${pct}% provisioned`}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className="absolute inset-[3px] rounded-full opacity-70 blur-md transition-opacity"
        style={{ background: `hsl(${hue} 80% 58% / ${changed ? 0.34 : 0.16})` }}
      />
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden className="relative -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--soft)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`hsl(${hue} 84% 38%)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out dark:hidden"
          style={{ filter: `drop-shadow(0 0 2px hsl(${hue} 84% 38% / 0.35))` }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`hsl(${hue} 84% 64%)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="hidden transition-[stroke-dashoffset] duration-500 ease-out dark:block"
          style={{ filter: `drop-shadow(0 0 3px hsl(${hue} 84% 64% / 0.6))` }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">
        <span className="text-[15px] font-semibold leading-none text-foreground">
          {value}
          <span className="text-[9.5px] font-normal text-muted-foreground">/{total}</span>
        </span>
      </span>
      {changed ? (
        <span
          aria-hidden
          className="absolute right-1 top-1 size-2.5 rounded-full bg-[var(--warning)] ring-2 ring-card"
        />
      ) : null}
    </span>
  );
}

function TrackFeatureCard({
  track,
  index,
  value,
  savedValue,
  onToggle,
}: {
  track: TrackMeta;
  index: number;
  value: TokenValue;
  savedValue: TokenValue;
  onToggle: (featureKey: string) => void;
}) {
  const selected = parseFeatures(value);
  const known = ADVANCED_FEATURES.filter((feature) => selected.includes(feature.key));
  const unknown = selected.filter(
    (feature) => !ADVANCED_FEATURES.some((candidate) => candidate.key === feature),
  );
  const count = known.length;
  const hue = (index * 41 + 188) % 360;
  const changed = String(value) !== String(savedValue);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border/60 p-3 transition-colors hover:border-border"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 72% 55% / 0.055), transparent 58%)`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span
              className="grid size-7 shrink-0 place-items-center rounded-lg"
              style={{
                background: `hsl(${hue} 72% 55% / 0.14)`,
                color: `hsl(${hue} 72% 52%)`,
                boxShadow: `inset 0 0 0 1px hsl(${hue} 72% 55% / 0.22)`,
              }}
            >
              {track.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold text-foreground">
                {track.label}
              </p>
              <p className="truncate font-mono text-[8.5px] text-muted-foreground/65">
                {featureTokenKey(track)}
              </p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {ADVANCED_FEATURES.map((feature) => {
              const on = selected.includes(feature.key);
              return (
                <button
                  key={feature.key}
                  type="button"
                  aria-pressed={on}
                  title={`${on ? 'Remove' : 'Add'} ${feature.label}`}
                  onClick={() => onToggle(feature.key)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8.5px] font-medium transition-colors',
                    on
                      ? 'border-transparent text-foreground'
                      : 'border-border/60 text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground',
                  )}
                  style={
                    on
                      ? {
                          background: `hsl(${hue} 72% 55% / 0.15)`,
                          boxShadow: `inset 0 0 0 1px hsl(${hue} 72% 55% / 0.32)`,
                        }
                      : undefined
                  }
                >
                  <span className={on ? 'opacity-100' : 'opacity-55'}>{feature.icon}</span>
                  {feature.short}
                  {on ? <Check className="size-2.5" /> : null}
                </button>
              );
            })}
            {unknown.map((feature) => (
              <button
                key={feature}
                type="button"
                onClick={() => onToggle(feature)}
                title={`Remove ${feature}`}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-[var(--soft)] px-1.5 py-0.5 text-[8.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {feature}
                <X className="size-2.5" />
              </button>
            ))}
          </div>
        </div>
        <RadialMeter
          value={count}
          total={ADVANCED_FEATURES.length}
          hue={hue}
          changed={changed}
          size={72}
        />
      </div>
    </div>
  );
}

function AdvancedToolsCard({
  keys,
  draft,
  saved,
  onChange,
}: {
  keys: string[];
  draft: GlobalTokens;
  saved: GlobalTokens;
  onChange: (key: string, value: TokenValue) => void;
}) {
  const metaKeys: string[] = keys.filter((key) => key === 'setupOrigin' || key === 'setupTrack');
  const featureKeys: string[] = keys.filter((key) => /^setupTrack.+Features$/.test(key));
  const otherKeys = keys.filter(
    (key) => !metaKeys.includes(key) && !featureKeys.includes(key),
  );
  const tracks = ADVANCED_TRACKS.filter((track) =>
    featureKeys.includes(featureTokenKey(track)),
  );
  const featureCount = tracks.reduce(
    (count, track) => count + parseFeatures(draft[featureTokenKey(track)] ?? '').length,
    0,
  );
  const totalSlots = tracks.length * ADVANCED_FEATURES.length;
  const changed = keys.some((key) => String(draft[key]) !== String(saved[key]));

  const originValue = String(draft.setupOrigin ?? '');
  const originOptions: TokenSelectOption[] = [
    { value: 'programme', label: 'Programme' },
    { value: 'template', label: 'Template' },
    { value: 'scratch', label: 'Scratch' },
  ];
  if (originValue && !originOptions.some((option) => option.value === originValue)) {
    originOptions.unshift({ value: originValue, label: originValue });
  }

  const trackValue = String(draft.setupTrack ?? '');
  const trackOptions: TokenSelectOption[] = ADVANCED_TRACKS.map((track) => ({
    value: track.value,
    label: track.label,
    node: (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-muted-foreground">{track.icon}</span>
        {track.label}
      </span>
    ),
  }));
  if (trackValue && !trackOptions.some((option) => option.value === trackValue)) {
    trackOptions.unshift({ value: trackValue, label: trackValue });
  }

  const toggleFeature = (tokenKey: string, featureKey: string) => {
    const current = parseFeatures(draft[tokenKey] ?? '');
    const next = current.includes(featureKey)
      ? current.filter((item) => item !== featureKey)
      : [...current, featureKey];
    onChange(tokenKey, next.join(','));
  };

  return (
    <section className={`overflow-hidden ${card}`}>
      <div className="relative overflow-hidden border-b border-border/60 p-5">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[var(--brand-text)] opacity-[0.09] blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-1/3 size-52 rounded-full bg-[var(--chart-3)] opacity-[0.08] blur-3xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <span className="text-[var(--brand-text)]">
                  <WandSparkles className="size-3.5" />
                </span>
                Advanced tools
              </h3>
              <Chip tone="brand">{keys.length} settings</Chip>
              {changed ? <Chip tone="warn">unsaved</Chip> : <Chip tone="ok">in sync</Chip>}
            </div>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
              The delivery grammar behind this workspace. Pick the origin and track, then
              compose each track&apos;s capability set — every chip is a real token write.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip>{featureCount} features on</Chip>
            <Chip>{totalSlots} slots</Chip>
          </div>
        </div>

        {metaKeys.length ? (
          <div className="relative mt-3 grid gap-2 sm:grid-cols-2">
            {metaKeys.includes('setupOrigin') ? (
              <div className="rounded-xl border border-border/60 bg-card/50 px-2.5 py-2 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <Compass className="size-2.5" />
                    Setup origin
                  </p>
                  <span className="truncate font-mono text-[7.5px] text-muted-foreground/55">
                    setupOrigin · {originValue || '—'}
                  </span>
                </div>
                <div className="mt-1.5">
                  <TokenSelect
                    value={originValue}
                    onChange={(next) => onChange('setupOrigin', next)}
                    options={originOptions}
                    ariaLabel="Setup origin"
                  />
                </div>
              </div>
            ) : null}
            {metaKeys.includes('setupTrack') ? (
              <div className="rounded-xl border border-border/60 bg-card/50 px-2.5 py-2 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <GraduationCap className="size-2.5" />
                    Delivery track
                  </p>
                  <span className="truncate font-mono text-[7.5px] text-muted-foreground/55">
                    setupTrack · {trackValue || '—'}
                  </span>
                </div>
                <div className="mt-1.5">
                  <TokenSelect
                    value={trackValue}
                    onChange={(next) => onChange('setupTrack', next)}
                    options={trackOptions}
                    ariaLabel="Delivery track"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="p-5">
        {tracks.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Feature matrix
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                  Click a capability to add or remove it from that track.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--soft)] px-2 py-0.5 font-mono text-[8.5px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-[var(--success)]" />
                live tokens
              </span>
            </div>
            <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
              {tracks.map((track, index) => {
                const tokenKey = featureTokenKey(track);
                return (
                  <TrackFeatureCard
                    key={track.key}
                    track={track}
                    index={index}
                    value={draft[tokenKey] ?? ''}
                    savedValue={saved[tokenKey] ?? ''}
                    onToggle={(featureKey) => toggleFeature(tokenKey, featureKey)}
                  />
                );
              })}
            </div>
          </>
        ) : null}

        {otherKeys.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {otherKeys.map((key) => (
              <TokenRowControl
                key={key}
                tokenKey={key}
                value={draft[key] ?? saved[key] ?? ''}
                savedValue={saved[key] ?? ''}
                changed={String(draft[key]) !== String(saved[key])}
                onChange={(next) => onChange(key, next)}
                onRevert={() => onChange(key, saved[key] ?? '')}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ── 3 · LIBRARY — the component catalog ─────────────────────────────────── */

function LibraryStation({
  manifest,
  document: doc,
}: {
  manifest: StudioManifest | null;
  document: WorkspaceDocument | null;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [sort, setSort] = useState<'usage' | 'name'>('usage');
  const [selected, setSelected] = useState<string | null>(null);

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    const pagesById = new Map<string, string[]>();
    const layouts = doc?.pageLayouts ?? {};
    for (const pageKey of Object.keys(layouts)) {
      for (const inst of layouts[pageKey] ?? []) {
        const id = inst.componentId ?? '';
        if (!id) continue;
        counts.set(id, (counts.get(id) ?? 0) + 1);
        pagesById.set(id, [...(pagesById.get(id) ?? []), pageKey]);
      }
    }
    return { counts, pagesById };
  }, [doc]);

  const components: ComponentManifest[] = useMemo(
    () => manifest?.components ?? [],
    [manifest?.components],
  );
  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(components.map((c) => c.category)))],
    [components],
  );

  const filtered = components.filter((c) => {
    if (category !== 'ALL' && c.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q)
    );
  });
  const maxUsage = Math.max(1, ...usage.counts.values());
  const ordered = useMemo(() => {
    const list = [...filtered];
    if (sort === 'usage') list.sort((a, b) => (usage.counts.get(b.id) ?? 0) - (usage.counts.get(a.id) ?? 0) || a.name.localeCompare(b.name));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [filtered, sort, usage]);

  const active = components.find((c) => c.id === selected) ?? null;

  return (
    <div className="flex h-full flex-col">
      <StationHeader
        icon={<Boxes className="size-4" />}
        title="Components"
        description="The contract's component catalog and where they render."
      >
        <Chip tone="brand">{components.length} registered</Chip>
      </StationHeader>

      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            className="h-8 w-56 rounded-[10px] bg-[var(--soft)] pl-8 text-[12.5px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              data-active={category === cat}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-[var(--hover)] data-[active=true]:bg-[var(--active)] data-[active=true]:text-[var(--brand-text)]"
            >
              {cat === 'ALL' ? 'All' : cat.toLowerCase()}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <div className="studio-seg !text-[11px]">
            <button type="button" data-active={sort === 'usage'} onClick={() => setSort('usage')}>
              <span className="px-2 py-1">Busiest</span>
            </button>
            <button type="button" data-active={sort === 'name'} onClick={() => setSort('name')}>
              <span className="px-2 py-1">A–Z</span>
            </button>
          </div>
        </div>
      </div>

      <div className="studio-scroll flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ordered.map((c) => {
              const n = usage.counts.get(c.id) ?? 0;
              const pct = Math.round((n / maxUsage) * 100);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all hover:shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)] ${
                    selected === c.id ? 'border-[var(--brand-text)]/60 bg-[var(--active)]' : 'border-border bg-card/70 hover:bg-[var(--hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-foreground">{c.name}</p>
                    <Chip tone={n > 0 ? 'brand' : 'soft'}>{n > 0 ? `${n}× used` : 'dormant'}</Chip>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted-foreground">{c.description}</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--soft)]">
                    <span
                      className="block h-full rounded-full bg-linear-to-r from-[var(--chart-3)] to-[var(--chart-2)] transition-[width] duration-500"
                      style={{ width: `${n > 0 ? Math.max(pct, 6) : 0}%` }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/60">{c.id} · {c.category.toLowerCase()}</p>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="sm:col-span-2">
                <EmptyHint icon={<Boxes className="size-4" />} title="No components match" body="Try a different search term or category filter." />
              </div>
            )}
          </div>

          {/* detail pane */}
          <aside className={`h-fit p-4 ${card}`}>
            {active ? (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{active.name}</p>
                    <p className="font-mono text-[10.5px] text-muted-foreground">{active.id} · v{active.version}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setSelected(null)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{active.description}</p>
                <dl className="mt-3 space-y-2 text-[11.5px]">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Category</dt><dd>{active.category.toLowerCase()}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Used on</dt><dd>{usage.counts.get(active.id) ?? 0} instance(s)</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Desktop span</dt><dd>{desktopSpan(active) ?? '—'}/12</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Mobile span</dt><dd>{active.preferredSpan == null ? '—' : typeof active.preferredSpan === 'object' ? active.preferredSpan.mobile : active.preferredSpan}/12</dd></div>
                </dl>
                {(usage.pagesById.get(active.id) ?? []).length > 0 && (
                  <>
                    <p className="mt-3.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rendered on</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(usage.pagesById.get(active.id) ?? []).map((pageKey) => (
                        <span key={pageKey} className="rounded-full bg-[var(--soft)] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          /{pageKey}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Authorable fields</p>
                <ul className="mt-2 space-y-1.5">
                  {(active.fields ?? []).map((f) => (
                    <li key={f.key} className="flex items-center justify-between rounded-lg bg-[var(--soft)] px-2.5 py-1.5">
                      <span className="text-[11.5px] text-foreground">{f.label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{f.type.toLowerCase()}</span>
                    </li>
                  ))}
                  {(active.fields ?? []).length === 0 && <li className="text-[11.5px] text-muted-foreground">No authorable fields.</li>}
                </ul>
              </div>
            ) : (
              <EmptyHint icon={<Boxes className="size-4" />} title="Select a component" body="Pick any card to inspect its fields, spans and usage." />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── 4 · STATES — the site-user state simulator ──────────────────────────── */

const STATE_META: { id: SimulationState; label: string; body: string }[] = [
  { id: 'normal', label: 'Active session', body: 'The page in its normal, fully-populated state.' },
  { id: 'loading', label: 'Loading skeletons', body: 'How the surface reads while data is on the wire.' },
  { id: 'empty', label: 'Empty data', body: 'First-run experience before any records exist.' },
  { id: 'validation_error', label: 'Validation errors', body: 'Swagger-validations failing server-side.' },
  { id: 'auth_error', label: 'Unauthorized', body: 'Expired or missing session ≠ graceful degradation.' },
  { id: 'offline', label: 'Offline', body: 'No connectivity — resilient content only.' },
];

function StatesStation({ document: doc }: { document: WorkspaceDocument | null }) {
  const simulationState = store((s) => s.simulationState);
  const setSimulationState = store((s) => s.setSimulationState);
  const openPageCanvas = store((s) => s.openPageCanvas);
  const activeFileKey = store((s) => s.activeFileKey);

  const fallbackPage = Object.keys(doc?.pageLayouts ?? {})[0] ?? 'auth-login';
  const target = activeFileKey ?? fallbackPage;

  return (
    <div className="flex h-full flex-col">
      <StationHeader
        icon={<FlaskConical className="size-4" />}
        title="States"
        description="Simulate site-user states directly inside the preview frame."
      >
        <Button size="sm" className="h-8 rounded-[10px]" onClick={() => openPageCanvas(target)}>
          <ArrowRight className="size-3.5" /> Open canvas
        </Button>
      </StationHeader>

      <div className="studio-scroll flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-2xl space-y-2.5">
          {STATE_META.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSimulationState(st.id)}
              className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all ${
                simulationState === st.id
                  ? 'border-[var(--brand-text)]/60 bg-[var(--active)] shadow-[0_10px_30px_-18px_var(--primary)]'
                  : 'border-border bg-card/70 hover:bg-[var(--hover)]'
              }`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full ${
                  simulationState === st.id ? 'bg-[var(--brand-text)] text-[var(--primary-foreground)]' : 'bg-[var(--soft)] text-muted-foreground'
                }`}
              >
                {simulationState === st.id ? <Check className="size-4" /> : <FlaskConical className="size-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-foreground">{st.label}</p>
                <p className="text-[12px] text-muted-foreground">{st.body}</p>
              </div>
              {simulationState === st.id && <Chip tone="brand">live</Chip>}
            </button>
          ))}

          <div className={`mt-4 flex items-start gap-2.5 p-4 ${card}`}>
            <Info className="mt-0.5 size-4 shrink-0 text-[var(--brand-text)]" />
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              The selected state is pushed to the preview frame over the studio bridge — open the
              canvas for <span className="font-mono text-[11px] text-foreground">{target}</span> and the
              portal bootstraps with exactly this state. It never affects the live site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 5 · GORA — workspace review copilot ────────────────────────────────── */

interface Insight {
  severity: 'error' | 'warning' | 'info' | 'ok';
  title: string;
  body: string;
  action?: { label: string; station: ActiveStation };
}

function GoraStation({
  manifest,
  document: doc,
}: {
  manifest: StudioManifest | null;
  document: WorkspaceDocument | null;
}) {
  const projectId = useProjectId();
  const setActiveStation = store((s) => s.setActiveStation);
  const [running, setRunning] = useState(false);
  const [insights, setInsights] = useState<Insight[] | null>(null);

  const runReview = useCallback(async () => {
    if (!projectId || !doc || !manifest) return;
    setRunning(true);
    try {
      const result = await validateDocument(projectId, {
        pageLayouts: doc.pageLayouts,
        globalTokens: doc.globalTokens,
        seo: doc.seo as Record<string, unknown>,
        i18n: doc.i18n,
      });

      const found: Insight[] = [];

      const errors = result.diagnostics.filter((d) => d.severity === 'error');
      const warnings = result.diagnostics.filter((d) => d.severity === 'warning');
      if (errors.length) {
        found.push({
          severity: 'error',
          title: `${errors.length} contract error(s)`,
          body: errors[0].message + (errors.length > 1 ? ` — and ${errors.length - 1} more.` : ''),
          action: { label: 'Open setup validator', station: 'setups' },
        });
      }
      if (warnings.length) {
        found.push({
          severity: 'warning',
          title: `${warnings.length} warning(s)`,
          body: warnings[0].message + (warnings.length > 1 ? ` — and ${warnings.length - 1} more.` : ''),
          action: { label: 'Open setup validator', station: 'setups' },
        });
      }

      // token hygiene (heuristic, from the real document)
      const tokens = doc.globalTokens ?? {};
      const colorKeys = Object.keys(tokens).filter((k) => tokenKind(k, tokens[k]) === 'color');
      const unfinished = colorKeys.filter((k) => {
        const v = String(tokens[k]);
        return !v.startsWith('#') && !v.startsWith('rgb') && !v.startsWith('hsl');
      });
      if (unfinished.length) {
        found.push({
          severity: 'warning',
          title: `${unfinished.length} color token(s) off-palette`,
          body: `${unfinished.slice(0, 3).join(', ')} ${unfinished.length > 3 ? '…' : ''} — not strict hex/rgb values, so preview may fall back.`,
          action: { label: 'Open palette', station: 'palette' },
        });
      }

      // component usage (heuristic, from the real pageLayouts)
      const registered = new Set(manifest.components.map((c) => c.id));
      const used = new Set<string>();
      for (const pageKey of Object.keys(doc.pageLayouts ?? {})) {
        for (const inst of doc.pageLayouts[pageKey] ?? []) {
          const id = inst.componentId ?? '';
          if (id) used.add(id);
        }
      }
      const unknown = [...used].filter((id) => !registered.has(id));
      if (unknown.length) {
        found.push({
          severity: 'warning',
          title: `${unknown.length} unregistered component(s) in layouts`,
          body: `${unknown.slice(0, 3).join(', ')}${unknown.length > 3 ? '…' : ''} render on pages but are not in the manifest catalog.`,
          action: { label: 'Open components', station: 'library' },
        });
      }
      const dormant = registered.size - [...registered].filter((r) => used.has(r)).length;
      if (dormant > 0) {
        found.push({
          severity: 'info',
          title: `${dormant} catalog component(s) dormant`,
          body: 'Registered in the contract but unused on any page layout.',
          action: { label: 'Open components', station: 'library' },
        });
      }

      // seo coverage
      const pages = Object.keys(doc.pageLayouts ?? {});
      const seoCount = Object.keys(doc.seo ?? {}).length;
      const missingSeo = pages.length - seoCount;
      if (missingSeo > 0) {
        found.push({
          severity: 'info',
          title: `${missingSeo} page(s) without SEO config`,
          body: `${seoCount} of ${pages.length} pages define title/description overrides.`,
        });
      }

      if (!found.some((f) => f.severity === 'error' || f.severity === 'warning')) {
        found.unshift({
          severity: 'ok',
          title: 'Workspace is healthy',
          body: `Validation passed across ${pages.length} pages, ${used.size} of ${registered.size} components in use.`,
        });
      }
      setInsights(found);
      toast.success('GORA review complete', { description: `${found.length} insight(s) from your live contract.` });
    } catch (error: unknown) {
      toast.error('Review failed', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setRunning(false);
    }
  }, [projectId, doc, manifest]);

  const severityIcon: Record<string, React.ReactNode> = {
    error: <CircleAlert className="size-4 text-destructive" />,
    warning: <AlertTriangle className="size-4 text-[var(--warning)]" />,
    info: <Info className="size-4 text-sky-500" />,
    ok: <BadgeCheck className="size-4 text-[var(--success)]" />,
  };

  return (
    <div className="flex h-full flex-col">
      <StationHeader
        icon={<Sparkles className="size-4" />}
        title="GORA"
        description="Workspace-aware review: diagnostics, hygiene and coverage."
      >
        <Button size="sm" className="h-8 rounded-[10px]" onClick={runReview} disabled={running || !doc || !manifest}>
          {running ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
          Run workspace review
        </Button>
      </StationHeader>

      <div className="studio-scroll flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-2xl space-y-2.5">
          {insights === null && (
            <EmptyHint
              icon={<Bot className="size-5" />}
              title="No review yet"
              body="Run a review and GORA walks your real workspace document — contract validation, token hygiene, component usage and SEO coverage — and turns the findings into actions."
            />
          )}
          {insights?.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3.5 p-4 ${card}`}>
              <span className="mt-0.5 shrink-0">{severityIcon[ins.severity]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground">{ins.title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{ins.body}</p>
              </div>
              {ins.action && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 rounded-[10px] text-[11.5px]"
                  onClick={() => setActiveStation(ins.action!.station)}
                >
                  {ins.action.label} <ChevronRight className="size-3" />
                </Button>
              )}
            </div>
          ))}

          <p className="pt-2 text-center text-[10.5px] text-muted-foreground/60">
            GORA reviews read directly from your workspace contract — every finding is grounded in the saved document.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── 6 · ASSETS — media referenced by the real document ─────────────────── */

interface AssetRef {
  url: string;
  pageKey: string;
  componentId: string;
  fieldKey: string;
}

function collectAssets(doc: WorkspaceDocument | null): AssetRef[] {
  const seen = new Map<string, AssetRef>();
  if (!doc) return [];
  const looksLikeAsset = (v: string) =>
    /^https?:\/\//.test(v) || /\.(png|jpe?g|svg|webp|gif|avif|ico|mp4|webm)$/i.test(v);
  for (const pageKey of Object.keys(doc.pageLayouts ?? {})) {
    for (const inst of doc.pageLayouts[pageKey] ?? []) {
      for (const [fieldKey, value] of Object.entries(inst.props ?? {})) {
        if (typeof value === 'string' && looksLikeAsset(value) && !seen.has(value)) {
          seen.set(value, { url: value, pageKey, componentId: inst.componentId ?? '', fieldKey });
        }
      }
    }
  }
  return [...seen.values()];
}

function AssetsStation({ document: doc }: { document: WorkspaceDocument | null }) {
  const [query, setQuery] = useState('');
  const assets = useMemo(() => collectAssets(doc), [doc]);
  const filtered = assets.filter(
    (a) => !query.trim() || a.url.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col">
      <StationHeader
        icon={<ImageIcon className="size-4" />}
        title="Assets"
        description="Every media reference the workspace document actually renders."
      >
        <Chip tone="brand">{assets.length} referenced</Chip>
      </StationHeader>

      <div className="border-b border-border px-6 py-3">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by URL…"
            className="h-8 rounded-[10px] bg-[var(--soft)] pl-8 text-[12.5px]"
          />
        </div>
      </div>

      <div className="studio-scroll flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-4xl">
          {filtered.length === 0 ? (
            <EmptyHint
              icon={<ImageIcon className="size-5" />}
              title={assets.length === 0 ? 'No media referenced yet' : 'Nothing matches that filter'}
              body={
                assets.length === 0
                  ? 'Pages render no absolute image/video URLs right now — upload flows arrive with the media library station upgrade.'
                  : 'Try a different search term.'
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <figure key={a.url} className={`overflow-hidden ${card}`}>
                  <div className="grid aspect-video place-items-center border-b border-border bg-[var(--soft)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.url}
                      alt={a.fieldKey}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                      }}
                    />
                  </div>
                  <figcaption className="space-y-1.5 p-3">
                    <p className="truncate font-mono text-[10.5px] text-muted-foreground" title={a.url}>{a.url}</p>
                    <div className="flex items-center justify-between">
                      <Chip>{a.pageKey} · {a.fieldKey}</Chip>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Copy URL"
                        onClick={() => {
                          void navigator.clipboard.writeText(a.url);
                          toast('Asset URL copied');
                        }}
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 7 · REVISIONS — the real history ledger ────────────────────────────── */

function RevisionsStation({ document: doc }: { document: WorkspaceDocument | null }) {
  const projectId = useProjectId();
  const history = useHistory(projectId ?? '', undefined, !!projectId);
  const revert = useRevertToRevision(projectId ?? '');
  const discard = useDiscardDraft(projectId ?? '');
  const [selected, setSelected] = useState<number | null>(null);

  const revisions: RevisionSummary[] = history.data?.revisions ?? [];
  const diff = useDiff(
    projectId ?? '',
    selected !== null ? Math.max(selected - 1, 0) : null,
    selected,
  );

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <StationHeader
        icon={<Clock className="size-4" />}
        title="History"
        description="The revision ledger — every checkpoint of this workspace."
      >
        <Chip tone="brand">draft r{doc?.draftRevision ?? '—'} · live r{doc?.liveRevision ?? '—'}</Chip>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-[10px] text-destructive hover:bg-destructive/10"
          onClick={() => {
            if (!doc?.isDirty) {
              toast.info('The draft is already in sync with live — nothing to discard.');
              return;
            }
            discard.mutate();
          }}
          disabled={discard.isPending}
        >
          <Trash2 className="size-3.5" /> Discard draft
        </Button>
      </StationHeader>

      <div className="studio-scroll flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-3xl space-y-2">
          {/* ledger pulse — real checkpoints per day, straight from the backend */}
          <LedgerPulseCard revisions={revisions} />

          {revisions.map((rev) => (
            <div
              key={rev.id}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                selected === rev.revision
                  ? 'border-[var(--brand-text)]/60 bg-[var(--active)]'
                  : 'border-border bg-card/70 hover:bg-[var(--hover)]'
              }`}
            >
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelected(rev.revision)}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12.5px] font-semibold text-foreground">r{rev.revision}</span>
                  <Chip tone={rev.kind === 'PUBLISHED' ? 'ok' : rev.kind === 'ROLLBACK' ? 'warn' : 'soft'}>{rev.kind.toLowerCase()}</Chip>
                  {rev.isLive && <Chip tone="brand">live</Chip>}
                  {rev.isDraft && <Chip tone="warn">draft head</Chip>}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                  {rev.message ?? 'No message'} · {fmtDate(rev.createdAt)}
                  {rev.actorRole ? ` · ${rev.actorRole.toLowerCase()}` : ''}
                </p>
              </button>

              <div className="flex items-center gap-1.5">
                {rev.errorCount > 0 && <Chip tone="bad">{rev.errorCount} err</Chip>}
                {rev.warningCount > 0 && <Chip tone="warn">{rev.warningCount} warn</Chip>}
                <Chip>{rev.operationCount} ops</Chip>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-lg px-2 text-[11.5px]"
                  onClick={() => setSelected(selected === rev.revision ? null : rev.revision)}
                >
                  {selected === rev.revision ? 'Hide meta' : 'Meta'}
                </Button>
                {!rev.isLive && !rev.isDraft && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg px-2 text-[11.5px]"
                    onClick={() => {
                      toast.info(`Rolling back live to r${rev.revision}…`);
                      revert.mutate({ revision: rev.revision, message: `Studio rollback to r${rev.revision}` });
                    }}
                    disabled={revert.isPending}
                  >
                    <RotateCcw className="size-3" /> Roll back
                  </Button>
                )}
              </div>

              {selected === rev.revision && (
                <div className="w-full space-y-2 border-t border-border/60 pt-3 text-[11.5px] text-muted-foreground">
                  <div className="flex flex-wrap gap-1.5">
                    {rev.operationKinds.map((k) => (
                      <Chip key={k} tone="soft">{k}</Chip>
                    ))}
                    {rev.operationKinds.length === 0 && <Chip>metadata-only checkpoint</Chip>}
                  </div>
                  <DiffSummary diff={diff.data ?? null} from={Math.max(rev.revision - 1, 0)} to={rev.revision} />
                </div>
              )}
            </div>
          ))}

          {revisions.length === 0 && !history.isLoading && (
            <EmptyHint icon={<Clock className="size-5" />} title="No revisions yet" body="Save or publish and the ledger starts filling." />
          )}
          {history.isLoading && (
            <div className="grid place-items-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          )}
        </div>
      </div>
    </div>
  );
}

function LedgerPulseCard({ revisions }: { revisions: RevisionSummary[] }) {
  const palette = useChartTheme();
  if (revisions.length === 0) return null;
  const byDay = new Map<string, number>();
  for (const rev of [...revisions].reverse()) {
    let day: string;
    try {
      day = new Date(rev.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      continue;
    }
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const data = [...byDay.entries()].slice(-10).map(([label, value]) => ({ label, value }));

  const kinds = new Map<string, number>();
  for (const rev of revisions) kinds.set(rev.kind, (kinds.get(rev.kind) ?? 0) + 1);
  const kindSlices = [...kinds.entries()].map(([label, value]) => ({ label, value }));
  const kindTone: Record<string, string> = {
    DRAFT: palette.charts[1] ?? palette.charts[0]!,
    PUBLISHED: palette.charts[2] ?? palette.charts[0]!,
    ROLLBACK: palette.charts[3] ?? palette.charts[0]!,
  };

  return (
    <section className={`p-5 ${card}`}>
      <Head icon={<Clock className="size-3.5" />} title="Ledger pulse" hint={`${revisions.length} checkpoints`} />
      <div className="mt-1 grid gap-2 lg:grid-cols-[1fr_130px]">
        <BarsMini data={data} height={110} suffix=" checkpoints" />
        <DonutMini
          slices={kindSlices.map((s) => ({ ...s, color: kindTone[s.label] }))}
          height={110}
          centerValue={String(revisions.length)}
          centerLabel="revisions"
        />
      </div>
    </section>
  );
}

function DiffSummary({
  diff,
  from,
  to,
}: {
  diff: { pages: { pageKey: string; status: string }[]; tokens: { added: string[]; removed: string[]; changed: string[] } } | null;
  from: number;
  to: number;
}) {
  if (!diff) return null;
  const changedTokens = diff.tokens.added.length + diff.tokens.removed.length + diff.tokens.changed.length;
  if (diff.pages.length === 0 && changedTokens === 0) {
    return <p>r{from} → r{to}: no layout or token changes recorded.</p>;
  }
  return (
    <div className="space-y-1.5">
      <p>
        <span className="font-mono">r{from} → r{to}</span> · {diff.pages.length} page(s) touched · {changedTokens} token change(s)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {diff.pages.slice(0, 8).map((p) => (
          <Chip key={p.pageKey} tone="soft">{p.pageKey}</Chip>
        ))}
      </div>
    </div>
  );
}

/* ── 8 · SETTINGS — the editing environment itself ──────────────────────── */

function SettingsStation() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const projectId = useProjectId();
  const sync = useSyncStatus(projectId ?? '');
  const discard = useDiscardDraft(projectId ?? '');
  const [motionOff, setMotionOff] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (motionOff) root.setAttribute('data-studio-motion', 'off');
    else root.removeAttribute('data-studio-motion');
  }, [motionOff]);

  const themeOptions = [
    { id: 'light' as const, label: 'Light', icon: <Sun className="size-4" /> },
    { id: 'dark' as const, label: 'Dark', icon: <Moon className="size-4" /> },
    { id: 'system' as const, label: 'System', icon: <Laptop className="size-4" /> },
  ];

  return (
    <div className="flex h-full flex-col">
      <StationHeader
        icon={<Settings2 className="size-4" />}
        title="Studio settings"
        description="Theme, motion and the state of your session."
      />

      <div className="studio-scroll flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-2xl space-y-5">
          {/* appearance */}
          <section className={`p-5 ${card}`}>
            <Head icon={<Palette className="size-3.5" />} title="Appearance" hint={resolvedTheme} />
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {themeOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setTheme(o.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-[12px] font-medium transition-all ${
                    theme === o.id
                      ? 'border-[var(--brand-text)]/60 bg-[var(--active)] text-[var(--brand-text)]'
                      : 'border-border text-muted-foreground hover:bg-[var(--hover)]'
                  }`}
                >
                  {o.icon}
                  {o.label}
                </button>
              ))}
            </div>
            {/* mini canvas preview */}
            <div className="mt-4 flex gap-2">
              {themeOptions.map((o) => (
                <div
                  key={o.id}
                  className="h-10 flex-1 rounded-lg border border-border"
                  style={{
                    background:
                      o.id === 'light'
                        ? 'linear-gradient(120deg,#f8fafc, #eef2ff)'
                        : o.id === 'dark'
                          ? 'linear-gradient(120deg,#111328,#191c38)'
                          : 'linear-gradient(90deg,#f8fafc 33%, #111328 33%, #111328 66%, #f8fafc 66%)',
                  }}
                  aria-hidden
                />
              ))}
            </div>
          </section>

          {/* motion */}
          <section className={`flex items-center justify-between p-5 ${card}`}>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">Reduce motion</h3>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Disable studio animations and transitions.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={motionOff}
              onClick={() => setMotionOff((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${motionOff ? 'bg-[var(--brand-text)]' : 'bg-[var(--soft)] border border-border'}`}
            >
              <span
                className={`absolute top-1/2 size-4.5 -translate-y-1/2 rounded-full bg-background border border-border shadow transition-all ${motionOff ? 'left-[calc(100%-20px)]' : 'left-1'}`}
                style={{ height: 18, width: 18 }}
              />
            </button>
          </section>

          {/* session diagnostics */}
          <section className={`p-5 ${card}`}>
            <Head icon={<Gauge className="size-3.5" />} title="Session" hint={sync.data ? 'synced' : 'no data'} />
            <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-[12px]">
              <Row k="Draft" v={`r${sync.data?.draftRevision ?? '—'}`} />
              <Row k="Live" v={`r${sync.data?.liveRevision ?? '—'}`} />
              <Row k="Last saved" v={sync.data?.lastSavedAt ? new Date(sync.data.lastSavedAt).toLocaleString() : '—'} />
              <Row k="Last published" v={sync.data?.lastPublishedAt ? new Date(sync.data.lastPublishedAt).toLocaleString() : '—'} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-8 rounded-[10px]" onClick={() => void sync.refetch()}>
                Refresh sync status
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-[10px] text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (!sync.data?.isDirty) {
                    toast.info('Nothing unsaved — draft matches live.');
                    return;
                  }
                  discard.mutate();
                }}
                disabled={discard.isPending}
              >
                <Trash2 className="size-3.5" /> Discard unsaved draft
              </Button>
            </div>
          </section>

          {/* shortcuts */}
          <section className={`p-5 ${card}`}>
            <Head icon={<Clipboard className="size-3.5" />} title="Keyboard shortcuts" />
            <dl className="mt-3 space-y-1.5 text-[12px]">
              {[
                ['⌘K / Ctrl K', 'Command palette'],
                ['⌘/ / Ctrl /', 'Shortcut reference'],
                ['Right click', 'Canvas + tree context menus'],
                ['Esc', 'Dismiss overlays'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-[var(--hover)]">
                  <dt className="font-mono text-[11px] text-muted-foreground">{k}</dt>
                  <dd className="text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-[var(--soft)] px-3 py-2">
      <dt className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="mt-0.5 truncate font-medium text-foreground">{v}</dd>
    </div>
  );
}

/* ── router ──────────────────────────────────────────────────────────────── */

export interface StudioWorkspaceStageProps {
  station: ActiveStation;
  manifest: StudioManifest | null;
  document: WorkspaceDocument | null;
  vrfs: unknown;
}

export function StudioWorkspaceStage({ station, manifest, document: doc }: StudioWorkspaceStageProps) {
  return (
    <div className="fade-in-stage relative h-full">
      {station === 'setups' && <SetupStation manifest={manifest} document={doc} />}
      {station === 'palette' && <PaletteStation document={doc} />}
      {station === 'library' && <LibraryStation manifest={manifest} document={doc} />}
      {station === 'states' && <StatesStation document={doc} />}
      {station === 'gora' && <GoraStation manifest={manifest} document={doc} />}
      {station === 'assets' && <AssetsStation document={doc} />}
      {station === 'revisions' && <RevisionsStation document={doc} />}
      {station === 'settings' && <SettingsStation />}
    </div>
  );
}

export default StudioWorkspaceStage;
