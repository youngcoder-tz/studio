// studio/src/components/gnapex-studio/shell/studio-boot-skeleton.tsx
//
// A shell-faithful first paint. Rail, sidebar, top bar, stage and status bar
// all keep their real dimensions, so the editor never flashes a generic
// loader or a solid slab before the workspace arrives.
//
// The station prop lets the same skeleton follow ?station=palette, ?station=
// library, and so on. Each stage mirrors the dominant layout of that station.

import { Fragment, type ComponentProps, type ComponentType, type ReactNode } from "react";
import {
  ArrowUpRight,
  Bot,
  Boxes,
  Check,
  Clock,
  Database,
  FlaskConical,
  Folder,
  FolderTree,
  Gauge,
  Globe2,
  History,
  Image as ImageIcon,
  Keyboard,
  Laptop,
  Moon,
  Palette,
  Search,
  Settings2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ActiveStation } from "@/lib/gnapex-studio/store";

type StationMeta = {
  label: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const STATION_META: Record<ActiveStation, StationMeta> = {
  explorer: {
    label: "Pages",
    title: "Pages",
    description: "Navigate the route tree and edit provisioned pages.",
    icon: FolderTree,
  },
  setups: {
    label: "Setup",
    title: "Setup",
    description: "The live workspace contract, runtime and validation.",
    icon: Settings2,
  },
  palette: {
    label: "Palette",
    title: "Palette",
    description:
      "Author the global design tokens — colors, type, shape, layout.",
    icon: Palette,
  },
  library: {
    label: "Components",
    title: "Components",
    description: "The contract's component catalog and where they render.",
    icon: Boxes,
  },
  states: {
    label: "Playground",
    title: "States",
    description:
      "Simulate site-user states directly inside the preview frame.",
    icon: FlaskConical,
  },
  gora: {
    label: "Gora AI",
    title: "GORA",
    description:
      "Workspace-aware review: diagnostics, hygiene and coverage.",
    icon: Sparkles,
  },
  assets: {
    label: "Assets",
    title: "Assets",
    description: "Every media reference the workspace document actually renders.",
    icon: ImageIcon,
  },
  revisions: {
    label: "History",
    title: "History",
    description: "The revision ledger — every checkpoint of this workspace.",
    icon: History,
  },
  settings: {
    label: "Studio settings",
    title: "Studio settings",
    description: "Theme, motion and the state of your session.",
    icon: Sliders,
  },
};

const RAIL_STATIONS: {
  id: ActiveStation;
  label: string;
  icon: ComponentType<{ className?: string }>;
  highlight?: boolean;
}[] = [
  { id: "explorer", label: "Pages", icon: FolderTree },
  { id: "setups", label: "Setup", icon: Settings2 },
  { id: "palette", label: "Palette", icon: Palette },
  { id: "library", label: "Components", icon: Boxes },
  { id: "states", label: "Playground", icon: FlaskConical },
  { id: "gora", label: "Gora AI", icon: Sparkles, highlight: true },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "revisions", label: "History", icon: History },
  { id: "settings", label: "Studio settings", icon: Sliders },
];

const PAGE_TREE = [
  { folderWidth: 96, pages: [70, 58] },
  { folderWidth: 82, pages: [76, 64, 52] },
  { folderWidth: 104, pages: [66, 58] },
  { folderWidth: 88, pages: [72, 60, 54] },
];

function Bone({ className, ...props }: ComponentProps<"div">) {
  return (
    <Skeleton
      className={cn(
        "studio-skeleton animate-none rounded-md bg-[var(--soft)]",
        className,
      )}
      {...props}
    />
  );
}

export function StudioBootSkeleton({
  station = "explorer",
}: {
  station?: ActiveStation | null;
}) {
  const meta = station ? STATION_META[station] : null;
  const label = meta?.title ?? "workspace";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`Loading ${label}`}
      data-slot="studio-boot-skeleton"
      data-station={station ?? "boot"}
      className="relative flex h-dvh min-h-0 select-none overflow-hidden bg-background text-[13px] text-foreground antialiased"
    >
      <div
        aria-hidden
        className="studio-glow pointer-events-none absolute inset-0"
      />
      <span className="sr-only">
        Opening GN-Apex Studio — assembling {label}.
      </span>

      <BootRail station={station} />
      <BootSidebar station={station} />

      <div className="relative z-0 flex min-w-0 flex-1 flex-col">
        <BootTopBar station={station} />

        <div className="flex min-h-0 flex-1">
          <main aria-hidden className="relative min-w-0 flex-1 overflow-hidden">
            <BootStage station={station} />
          </main>
        </div>

        <BootStatusBar />
      </div>
    </div>
  );
}

/* ── shell chrome ─────────────────────────────────────────────────────────── */

function BootRail({ station }: { station: ActiveStation | null }) {
  return (
    <nav
      aria-hidden
      className="studio-glass flex w-14 shrink-0 select-none flex-col items-center gap-1 py-3"
    >
      <div className="mb-2 grid size-9 place-items-center rounded-xl bg-linear-to-br from-[var(--brand-text)] to-indigo-600 font-bold text-white opacity-85 shadow-sm">
        ✦
      </div>

      {RAIL_STATIONS.map((item, index) => {
        const Icon = item.icon;
        const active = item.id === station;
        return (
          <Fragment key={item.id}>
            {index === RAIL_STATIONS.length - 1 ? <div className="flex-1" /> : null}
            <div
              className={cn(
                "grid size-10 place-items-center rounded-xl transition-colors",
                active
                  ? "bg-[var(--active)] text-[var(--brand-text)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-text)_30%,transparent)]"
                  : item.highlight
                    ? "text-[var(--brand-text)]/55"
                    : "text-muted-foreground/40",
              )}
            >
              <Icon className="size-[17px]" />
            </div>
          </Fragment>
        );
      })}

      <span className="mt-1 text-[9px] font-mono tracking-tighter text-muted-foreground/40">
        v4.2
      </span>
    </nav>
  );
}

function BootTopBar({ station }: { station: ActiveStation | null }) {
  const meta = station ? STATION_META[station] : null;

  return (
    <header
      aria-hidden
      className="relative z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border px-4"
    >
      <div className="flex min-w-0 items-center gap-1 truncate text-[13px]">
        <Bone className="h-3.5 w-24" />
        <span className="text-muted-foreground/30">/</span>
        <span className="text-muted-foreground">{meta?.label ?? "Workspace"}</span>
        {station === "explorer" ? (
          <>
            <span className="text-muted-foreground/30">/</span>
            <Bone className="h-3 w-14" />
          </>
        ) : null}
      </div>

      <div className="flex-1" />

      <div className="studio-action hidden !min-h-8 gap-2 md:flex">
        <Search className="size-3.5 text-muted-foreground/60" />
        <span className="text-muted-foreground/70">Search or jump to…</span>
        <span className="studio-chip font-mono opacity-60">⌘K</span>
      </div>

      <span className="studio-chip hidden md:inline-flex">
        <span className="size-1.5 animate-pulse rounded-full bg-success/60" />
        <Bone className="h-2.5 w-14" />
      </span>

      <div className="studio-action !min-h-8 !min-w-8 !justify-center !px-0 text-muted-foreground/60">
        ◐
      </div>

      <div className="grid size-8 place-items-center rounded-[10px] border border-border bg-[var(--soft)] text-muted-foreground/50">
        <Keyboard className="size-3.5" />
      </div>

      <div className="flex h-8 items-center justify-center rounded-[10px] border border-primary/10 bg-primary/15 px-3.5">
        <Bone className="h-2.5 w-10 bg-background/50" />
      </div>
    </header>
  );
}

function BootStatusBar() {
  return (
    <footer
      aria-hidden
      className="relative z-10 flex h-9 shrink-0 items-center justify-between gap-6 border-t border-border px-3"
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-md px-2 py-1">
          <span className="size-1.5 rounded-full bg-warning/60" />
          <Bone className="h-2.5 w-16" />
        </span>
        <Bone className="h-2.5 w-24" />
        <Bone className="h-2.5 w-20" />
      </div>
      <div className="flex items-center gap-3">
        <Bone className="h-2.5 w-24" />
        <Bone className="h-2.5 w-14" />
      </div>
    </footer>
  );
}

/* ── sidebars ─────────────────────────────────────────────────────────────── */

function BootSidebar({ station }: { station: ActiveStation | null }) {
  if (station === null) return <NeutralSidebarSkeleton />;

  return station === "explorer" ? (
    <PagesSidebarSkeleton />
  ) : (
    <WorkspaceSidebarSkeleton station={station} />
  );
}

function NeutralSidebarSkeleton() {
  return (
    <aside
      aria-hidden
      className="studio-glass relative z-10 flex min-h-0 w-[264px] shrink-0 flex-col overflow-hidden"
    >
      <div className="px-3.5 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl border border-border bg-[var(--active)] text-[var(--brand-text)] opacity-70">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Bone className="h-3 w-20" />
            <Bone className="mt-1 h-2.5 w-28" />
          </div>
        </div>
        <div className="mt-2.5 space-y-1.5">
          <Bone className="h-2.5 w-full" />
          <Bone className="h-2.5 w-4/5" />
        </div>
      </div>

      <div className="studio-scroll flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-3">
          <SidebarChartSkeleton />
          <SidebarListSkeleton rows={5} />
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2">
        <TemplateCardSkeleton />
      </div>

      <div className="border-t border-border p-3">
        <Bone className="h-7 w-full rounded-[10px]" />
      </div>
    </aside>
  );
}

function PagesSidebarSkeleton() {
  return (
    <aside
      aria-hidden
      className="studio-glass relative z-10 flex min-h-0 w-[264px] shrink-0 flex-col overflow-hidden"
    >
      <div className="px-3 pb-2 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <Bone className="h-4 w-14" />
          <Bone className="size-6 rounded-lg" />
        </div>
        <Bone className="h-8 w-full rounded-[9px]" />
      </div>

      <div className="studio-scroll flex-1 overflow-y-auto px-2 pb-3">
        <div className="space-y-1.5">
          {PAGE_TREE.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-0.5">
              <div className="flex items-center gap-2 rounded-[9px] px-2 py-1.5">
                <Folder className="size-3.5 text-muted-foreground/45" />
                <Bone
                  className="h-3"
                  style={{ width: `${group.folderWidth}px` }}
                />
                <Bone className="ml-auto h-4 w-7 rounded" />
              </div>

              {group.pages.map((width, pageIndex) => (
                <div
                  key={pageIndex}
                  className="flex items-center gap-2 rounded-[9px] py-1.5 pl-8 pr-2"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-foreground/15" />
                  <Bone className="h-2.5" style={{ width: `${width}px` }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-3 pb-2.5">
        <TemplateCardSkeleton />
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
        <Bone className="h-2.5 w-24" />
        <Bone className="h-2.5 w-20" />
      </div>
    </aside>
  );
}

function WorkspaceSidebarSkeleton({ station }: { station: ActiveStation }) {
  const meta = STATION_META[station] ?? STATION_META.explorer;
  const Icon = meta.icon;

  return (
    <aside
      aria-hidden
      className="studio-glass relative z-10 flex min-h-0 w-[264px] shrink-0 flex-col overflow-hidden"
    >
      <div className="px-3.5 pb-3 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-xl border border-border bg-[var(--active)] text-[var(--brand-text)] opacity-70">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {meta.title}
            </p>
            <Bone className="mt-1 h-2.5 w-24" />
          </div>
        </div>
        <div className="mt-2.5 space-y-1.5">
          <Bone className="h-2.5 w-full" />
          <Bone className="h-2.5 w-4/5" />
        </div>
      </div>

      <div className="studio-scroll flex-1 overflow-y-auto px-3 pb-3">
        <SidebarQuickSkeleton station={station} />
      </div>

      <div className="shrink-0 px-3 pb-2">
        <TemplateCardSkeleton />
      </div>

      <div className="border-t border-border p-3">
        <div className="studio-action w-full !justify-between opacity-70">
          <span>Back to pages</span>
          <ArrowUpRight className="size-3.5 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}

function TemplateCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/70 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]">
      <Bone className="h-16 w-full rounded-none bg-linear-to-br from-[var(--brand-text)]/25 via-[var(--brand-text)]/10 to-transparent" />
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-4 w-12 rounded-full" />
        </div>
        <Bone className="h-2.5 w-32" />
        <div className="flex gap-1.5 pt-0.5">
          <Bone className="h-4 w-14 rounded-full" />
          <Bone className="h-4 w-10 rounded-full" />
          <Bone className="h-4 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SidebarQuickSkeleton({ station }: { station: ActiveStation }) {
  if (station === "states") return <SidebarStateSkeleton />;
  if (station === "settings") return <SidebarSettingsSkeleton />;
  if (station === "assets" || station === "revisions") {
    return <SidebarListSkeleton rows={station === "revisions" ? 6 : 3} />;
  }

  return (
    <div className="space-y-3">
      <SidebarChartSkeleton donut={station === "library"} />
      <SidebarListSkeleton rows={station === "palette" ? 6 : 4} />
    </div>
  );
}

function SidebarChartSkeleton({ donut = false }: { donut?: boolean }) {
  const heights = ["h-4", "h-8", "h-5", "h-10", "h-7", "h-9", "h-6", "h-11"];

  return (
    <div className="rounded-xl border border-border/70 bg-card/60 px-2 pb-1 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette className="size-3.5 text-[var(--brand-text)]/55" />
          <Bone className="h-2.5 w-20" />
        </div>
        <Bone className="h-4 w-10 rounded-full" />
      </div>

      {donut ? (
        <div className="mt-1 grid grid-cols-[104px_1fr] items-center gap-1">
          <div className="mx-auto grid size-[88px] place-items-center rounded-full border-[10px] border-[var(--soft)]">
            <Bone className="size-8 rounded-full" />
          </div>
          <div className="space-y-2 pr-1.5">
            <Bone className="h-2.5 w-full" />
            <Bone className="h-2.5 w-4/5" />
            <Bone className="h-2.5 w-3/5" />
            <Bone className="ml-auto h-2 w-16" />
          </div>
        </div>
      ) : (
        <div className="mt-3 flex h-[62px] items-end gap-1.5 px-1">
          {heights.map((height, index) => (
            <Bone
              key={index}
              className={cn(
                "flex-1 rounded-t-[4px] bg-[var(--active)]",
                height,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-lg px-2.5 py-2"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Bone className="size-3 rounded-sm" />
            <Bone
              className="h-2.5"
              style={{ width: `${72 + (index % 3) * 14}px` }}
            />
          </span>
          <Bone className="h-2.5 w-8" />
        </div>
      ))}
    </div>
  );
}

function SidebarStateSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <FlaskConical className="size-3.5 text-[var(--brand-text)]/55" />
        <Bone className="h-2.5 w-20" />
        <Bone className="ml-auto h-4 w-10 rounded-full" />
      </div>
      <div className="mt-2.5 space-y-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center justify-between rounded-lg px-2.5 py-2",
              index === 0 && "bg-[var(--active)]",
            )}
          >
            <Bone className="h-3 w-20" />
            {index === 0 ? (
              <Check className="size-3.5 text-[var(--brand-text)]/60" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1.5 px-2.5">
        <Bone className="h-2 w-full" />
        <Bone className="h-2 w-4/5" />
      </div>
    </div>
  );
}

function SidebarSettingsSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Settings2 className="size-3.5 text-[var(--brand-text)]/55" />
        <Bone className="h-2.5 w-20" />
      </div>
      <div className="studio-seg mt-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5",
              index === 0 && "bg-[var(--active)]",
            )}
          >
            <Bone className="size-2.5 rounded-sm" />
            <Bone className="h-2.5 w-8" />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <SidebarListSkeleton rows={1} />
      </div>
    </div>
  );
}

/* ── stages ───────────────────────────────────────────────────────────────── */

function BootStage({ station }: { station: ActiveStation | null }) {
  if (station === null) return <NeutralStageSkeleton />;

  switch (station) {
    case "explorer":
      return <PagesStageSkeleton />;
    case "setups":
      return <SetupStageSkeleton station={station} />;
    case "palette":
      return <PaletteStageSkeleton station={station} />;
    case "library":
      return <LibraryStageSkeleton station={station} />;
    case "states":
      return <StatesStageSkeleton station={station} />;
    case "gora":
      return <GoraStageSkeleton station={station} />;
    case "assets":
      return <AssetsStageSkeleton station={station} />;
    case "revisions":
      return <RevisionsStageSkeleton station={station} />;
    case "settings":
      return <SettingsStageSkeleton station={station} />;
    default:
      return <PagesStageSkeleton />;
  }
}

function NeutralStageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-[var(--active)] text-[var(--brand-text)] opacity-75">
            <Sparkles className="size-4" />
          </div>
          <div>
            <Bone className="h-4 w-28" />
            <Bone className="mt-1.5 h-3 w-64 max-w-[42vw]" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Bone className="h-5 w-16 rounded-full" />
          <Bone className="h-8 w-24 rounded-[10px]" />
        </div>
      </div>

      <StageScroll>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border bg-card/60 p-4 shadow-[0_12px_32px_-26px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bone className="size-8 rounded-xl" />
                  <div className="space-y-1.5">
                    <Bone className="h-3 w-24" />
                    <Bone className="h-2.5 w-16" />
                  </div>
                </div>
                <Bone className="h-5 w-10 rounded-full" />
              </div>
              <div className="mt-4 space-y-2">
                <Bone className="h-2.5 w-full" />
                <Bone className="h-2.5 w-11/12" />
                <Bone className="h-2.5 w-3/4" />
              </div>
              <div className="mt-4 flex gap-2">
                <Bone className="h-4 w-14 rounded-full" />
                <Bone className="h-4 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </StageScroll>
    </div>
  );
}

function StageHeaderSkeleton({
  station,
  actionCount = 1,
}: {
  station: ActiveStation;
  actionCount?: number;
}) {
  const meta = STATION_META[station] ?? STATION_META.explorer;
  const Icon = meta.icon;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-[var(--active)] text-[var(--brand-text)] opacity-75">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-foreground">
            {meta.title}
          </p>
          <Bone className="mt-1 h-3 w-64 max-w-[42vw]" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Bone className="h-5 w-16 rounded-full" />
        {Array.from({ length: actionCount }).map((_, index) => (
          <Bone
            key={index}
            className={cn(
              "h-8 rounded-[10px]",
              index === actionCount - 1 ? "w-28" : "w-20",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function StageScroll({ children }: { children: ReactNode }) {
  return (
    <div className="studio-scroll flex-1 overflow-y-auto px-6 py-5">
      {children}
    </div>
  );
}

function CardSkeleton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

function CardHeadSkeleton({
  icon,
  hint = true,
}: {
  icon?: ReactNode;
  hint?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="text-[var(--brand-text)]/55">{icon}</span>
        ) : null}
        <Bone className="h-3 w-28" />
      </div>
      {hint ? <Bone className="h-4 w-12 rounded-full" /> : null}
    </div>
  );
}

function StatTileSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-[var(--soft)] p-3.5">
      <div className="flex items-center gap-1.5">
        <Bone className="size-3 rounded-sm" />
        <Bone className="h-2.5 w-16" />
      </div>
      <Bone className="mt-2 h-6 w-14" />
    </div>
  );
}

function TokenRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-[var(--soft)] p-2"
        >
          <Bone className="size-7 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bone
              className="h-2.5"
              style={{ width: `${55 + (index % 3) * 12}%` }}
            />
            <Bone className="h-2 w-1/3" />
          </div>
          <Bone className="h-5 w-12 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function PagesStageSkeleton() {
  return (
    <div className="studio-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-275 p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Your site, by folder
          </h2>
          <Bone className="mt-2 h-3 w-80 max-w-full" />
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-[var(--soft)] p-3.5"
            >
              <Bone className="h-2.5 w-16" />
              <Bone className="mt-2 h-7 w-10" />
            </div>
          ))}
        </div>

        <Bone className="mb-3 h-2.5 w-16" />

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <FolderCardSkeleton key={index} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FolderCardSkeleton({ index }: { index: number }) {
  return (
    <div className="rounded-2xl border border-border bg-[var(--soft)] p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-[var(--active)] text-[var(--brand-text)]/45">
          <Folder className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Bone
            className="h-3.5"
            style={{ width: `${96 + (index % 3) * 18}px` }}
          />
          <Bone className="h-2.5 w-36 max-w-full" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Bone className="h-6 w-16 rounded-lg" />
        <div className="flex -space-x-1.5">
          {[0, 1, 2].map((fanIndex) => (
            <Bone
              key={fanIndex}
              className="h-8 w-6 rounded border border-border/60 bg-[var(--active)]"
              style={{ transform: `rotate(${(fanIndex - 1) * 6}deg)` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupStageSkeleton({ station }: { station: ActiveStation }) {
  return (
    <div className="flex h-full flex-col">
      <StageHeaderSkeleton station={station} actionCount={1} />
      <StageScroll>
        <div className="mx-auto grid max-w-4xl gap-4">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <StatTileSkeleton key={index} />
            ))}
          </div>

          <CardSkeleton>
            <CardHeadSkeleton icon={<Gauge className="size-3.5" />} />
            <div className="mt-3 grid gap-4 lg:grid-cols-[150px_1fr] lg:items-center">
              <div className="mx-auto grid size-[118px] place-items-center rounded-full border-[18px] border-[var(--soft)]">
                <Bone className="size-10 rounded-full" />
              </div>
              <div className="space-y-2.5">
                <Bone className="h-2.5 w-full" />
                <Bone className="h-2.5 w-4/5" />
                <Bone className="h-2.5 w-3/5" />
                <Bone className="h-2.5 w-2/3" />
              </div>
            </div>
          </CardSkeleton>

          <div className="grid gap-4 lg:grid-cols-2">
            <CardSkeleton>
              <CardHeadSkeleton icon={<ShieldCheck className="size-3.5" />} />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[38, 50, 44, 60, 36, 54].map((width, index) => (
                  <Bone
                    key={index}
                    className="h-5 rounded-full"
                    style={{ width: `${width}px` }}
                  />
                ))}
              </div>
            </CardSkeleton>

            <CardSkeleton>
              <CardHeadSkeleton icon={<Database className="size-3.5" />} />
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                  >
                    <Bone className="h-2.5 w-28" />
                    <Bone className="h-2.5 w-16" />
                  </div>
                ))}
              </div>
            </CardSkeleton>
          </div>

          <CardSkeleton>
            <CardHeadSkeleton icon={<Globe2 className="size-3.5" />} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-2"
                >
                  <Bone className="h-2.5 w-20" />
                  <Bone className="ml-auto h-4 w-10 rounded-full" />
                </div>
              ))}
            </div>
          </CardSkeleton>
        </div>
      </StageScroll>
    </div>
  );
}

function PaletteStageSkeleton({ station }: { station: ActiveStation }) {
  return (
    <div className="flex h-full flex-col">
      <StageHeaderSkeleton station={station} actionCount={3} />

      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-6 py-2">
        {[44, 52, 46, 60, 44].map((width, index) => (
          <Bone
            key={index}
            className={cn(
              "h-6 rounded-full",
              index === 0 && "bg-[var(--active)]",
            )}
            style={{ width: `${width}px` }}
          />
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Bone className="h-6 w-20 rounded-full" />
          <Bone className="h-7 w-44 rounded-full" />
        </div>
      </div>

      <StageScroll>
        <div className="mx-auto max-w-5xl space-y-4">
          <PaletteBrandBoardSkeleton />
          <ColorLabSkeleton />

          <div className="grid gap-4 lg:grid-cols-3">
            <AtelierSkeleton />
            <ShadeLadderSkeleton />
            <ReadabilitySkeleton />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CardSkeleton>
              <CardHeadSkeleton icon={<Palette className="size-3.5" />} />
              <TokenRowsSkeleton rows={5} />
            </CardSkeleton>
            <CardSkeleton>
              <CardHeadSkeleton icon={<Palette className="size-3.5" />} />
              <TokenRowsSkeleton rows={5} />
            </CardSkeleton>
          </div>
        </div>
      </StageScroll>
    </div>
  );
}

function PaletteBrandBoardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-[var(--brand-text)]/10 via-transparent to-[var(--brand-text)]/5" />
      <div className="relative grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_268px] lg:items-center lg:p-6">
        <div>
          <div className="flex items-center gap-2">
            <Bone className="size-9 rounded-xl" />
            <div className="space-y-1.5">
              <Bone className="h-3 w-24" />
              <Bone className="h-2.5 w-32" />
            </div>
          </div>
          <Bone className="mt-6 h-9 w-2/3 max-w-[360px]" />
          <Bone className="mt-2 h-3 w-1/2 max-w-[260px]" />
          <div className="mt-5 flex gap-2.5">
            {[0, 1, 2, 3].map((index) => (
              <Bone
                key={index}
                className="size-8 rounded-full border border-border"
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/50 p-3.5">
          <div className="flex items-center justify-between">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-5 w-12 rounded-full" />
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center rounded-full border-[9px] border-[var(--soft)]">
              <Bone className="size-8 rounded-full" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className="h-2.5 w-full" />
              <Bone className="h-2.5 w-4/5" />
              <Bone className="h-2.5 w-3/5" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Bone className="h-7 flex-1 rounded-lg" />
            <Bone className="h-7 flex-1 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorLabSkeleton() {
  return (
    <CardSkeleton>
      <CardHeadSkeleton icon={<Palette className="size-3.5" />} hint={false} />
      <div className="mt-4 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
        <div className="mx-auto grid size-[168px] place-items-center rounded-full border-[22px] border-[var(--soft)]">
          <Bone className="size-20 rounded-full" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <Bone className="h-2.5 w-24" />
                <Bone className="h-2.5 w-14" />
              </div>
              <Bone className="h-2 w-full rounded-full" />
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <Bone key={index} className="size-7 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </CardSkeleton>
  );
}

function AtelierSkeleton() {
  return (
    <CardSkeleton>
      <CardHeadSkeleton icon={<Sparkles className="size-3.5" />} />
      <div className="mt-4 space-y-2">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-[var(--soft)] p-2"
          >
            <Bone className="size-7 rounded-md bg-[var(--active)]" />
            <Bone className="h-2.5 w-24" />
            <Bone className="ml-auto h-5 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </CardSkeleton>
  );
}

function ShadeLadderSkeleton() {
  return (
    <CardSkeleton>
      <CardHeadSkeleton icon={<Palette className="size-3.5" />} />
      <div className="mt-4 grid grid-cols-10 overflow-hidden rounded-lg border border-border/70">
        {Array.from({ length: 10 }).map((_, index) => (
          <Bone
            key={index}
            className="h-9 rounded-none bg-[var(--active)]"
            style={{ opacity: 0.45 + index * 0.055 }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Bone className="h-2.5 w-20" />
        <Bone className="h-2.5 w-14" />
      </div>
    </CardSkeleton>
  );
}

function ReadabilitySkeleton() {
  return (
    <CardSkeleton>
      <CardHeadSkeleton icon={<ShieldCheck className="size-3.5" />} />
      <div className="mt-4 flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center rounded-full border-[9px] border-[var(--soft)]">
          <Bone className="size-9 rounded-full" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Bone className="h-2.5 w-full" />
          <Bone className="h-2.5 w-4/5" />
          <Bone className="h-2.5 w-3/5" />
        </div>
      </div>
      <Bone className="mt-4 h-7 w-full rounded-lg" />
    </CardSkeleton>
  );
}

function LibraryStageSkeleton({ station }: { station: ActiveStation }) {
  return (
    <div className="flex h-full flex-col">
      <StageHeaderSkeleton station={station} actionCount={0} />

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
        <Bone className="h-8 w-56 rounded-[10px]" />
        <div className="flex flex-wrap items-center gap-1.5">
          {[34, 44, 40, 48, 36].map((width, index) => (
            <Bone
              key={index}
              className={cn(
                "h-6 rounded-full",
                index === 0 && "bg-[var(--active)]",
              )}
              style={{ width: `${width}px` }}
            />
          ))}
          <Bone className="mx-1 hidden h-4 w-px rounded-none bg-border sm:block" />
          <Bone className="h-7 w-24 rounded-[10px]" />
        </div>
      </div>

      <StageScroll>
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-border bg-card/70 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <Bone className="h-3.5 w-24" />
                  <Bone className="h-5 w-14 rounded-full" />
                </div>
                <div className="mt-2 space-y-1.5">
                  <Bone className="h-2.5 w-full" />
                  <Bone className="h-2.5 w-4/5" />
                </div>
                <Bone className="mt-3 h-1 w-full rounded-full" />
                <Bone className="mt-2 h-2 w-28" />
              </div>
            ))}
          </div>

          <CardSkeleton className="h-fit p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <Bone className="h-3.5 w-28" />
                <Bone className="h-2.5 w-20" />
              </div>
              <Bone className="size-7 rounded-md" />
            </div>
            <div className="mt-3 space-y-1.5">
              <Bone className="h-2.5 w-full" />
              <Bone className="h-2.5 w-4/5" />
            </div>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <Bone className="h-2.5 w-20" />
                  <Bone className="h-2.5 w-14" />
                </div>
              ))}
            </div>
            <Bone className="mt-4 h-8 w-full rounded-[10px]" />
          </CardSkeleton>
        </div>
      </StageScroll>
    </div>
  );
}

function StatesStageSkeleton({ station }: { station: ActiveStation }) {
  return (
    <div className="flex h-full flex-col">
      <StageHeaderSkeleton station={station} actionCount={1} />
      <StageScroll>
        <div className="mx-auto max-w-2xl space-y-2.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card/70 px-5 py-4"
            >
              <Bone className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Bone className="h-3.5 w-36" />
                <Bone className="h-2.5 w-64 max-w-full" />
              </div>
              <Bone className="h-5 w-12 rounded-full" />
            </div>
          ))}

          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-border bg-card/80 p-4">
            <Bone className="mt-0.5 size-4 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-2.5 w-full" />
              <Bone className="h-2.5 w-4/5" />
            </div>
          </div>
        </div>
      </StageScroll>
    </div>
  );
}

function GoraStageSkeleton({ station }: { station: ActiveStation }) {
  return (
    <div className="flex h-full flex-col">
      <StageHeaderSkeleton station={station} actionCount={1} />
      <StageScroll>
        <div className="mx-auto max-w-2xl space-y-2.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-start gap-3.5 rounded-2xl border border-border bg-card/80 p-4"
            >
              <Bone className="mt-0.5 size-4 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Bone className="h-3.5 w-48 max-w-full" />
                <Bone className="h-2.5 w-full" />
                <Bone className="h-2.5 w-3/4" />
              </div>
              <Bone className="h-7 w-24 shrink-0 rounded-[10px]" />
            </div>
          ))}

          <div className="flex items-center justify-center gap-2 pt-2">
            <Bot className="size-3.5 text-muted-foreground/40" />
            <Bone className="h-2.5 w-72 max-w-full" />
          </div>
        </div>
      </StageScroll>
    </div>
  );
}

function AssetsStageSkeleton({ station }: { station: ActiveStation }) {
  return (
    <div className="flex h-full flex-col">
      <StageHeaderSkeleton station={station} actionCount={0} />

      <div className="border-b border-border px-6 py-3">
        <Bone className="h-8 w-64 rounded-[10px]" />
      </div>

      <StageScroll>
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border bg-card/80"
              >
                <Bone className="aspect-video w-full rounded-none" />
                <div className="space-y-2 p-3">
                  <Bone className="h-2.5 w-full" />
                  <div className="flex items-center justify-between">
                    <Bone className="h-5 w-24 rounded-full" />
                    <Bone className="size-6 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </StageScroll>
    </div>
  );
}

function RevisionsStageSkeleton({ station }: { station: ActiveStation }) {
  return (
    <div className="flex h-full flex-col">
      <StageHeaderSkeleton station={station} actionCount={1} />
      <StageScroll>
        <div className="mx-auto max-w-3xl space-y-2">
          <CardSkeleton>
            <CardHeadSkeleton icon={<Clock className="size-3.5" />} />
            <div className="mt-1 grid gap-2 lg:grid-cols-[1fr_130px]">
              <div className="flex h-[110px] items-end gap-1.5">
                {[14, 28, 18, 36, 24, 32, 20, 40, 26, 34].map(
                  (height, index) => (
                    <Bone
                      key={index}
                      className="flex-1 rounded-t-[4px] bg-[var(--active)]"
                      style={{ height: `${height + 8}px` }}
                    />
                  ),
                )}
              </div>
              <div className="grid place-items-center">
                <div className="grid size-[102px] place-items-center rounded-full border-[12px] border-[var(--soft)]">
                  <Bone className="size-8 rounded-full" />
                </div>
              </div>
            </div>
          </CardSkeleton>

          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Bone className="h-3.5 w-10" />
                  <Bone className="h-5 w-16 rounded-full" />
                  <Bone className="h-5 w-12 rounded-full" />
                </div>
                <Bone className="h-2.5 w-3/4" />
              </div>
              <div className="flex items-center gap-1.5">
                <Bone className="h-5 w-12 rounded-full" />
                <Bone className="h-5 w-12 rounded-full" />
                <Bone className="h-7 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </StageScroll>
    </div>
  );
}

function SettingsStageSkeleton({ station }: { station: ActiveStation }) {
  return (
    <div className="flex h-full flex-col">
      <StageHeaderSkeleton station={station} actionCount={0} />
      <StageScroll>
        <div className="mx-auto max-w-2xl space-y-5">
          <CardSkeleton>
            <CardHeadSkeleton icon={<Palette className="size-3.5" />} />
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {[
                { icon: Sun, width: 28 },
                { icon: Moon, width: 32 },
                { icon: Laptop, width: 36 },
              ].map((option, index) => {
                const Icon = option.icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-4",
                      index === 1 && "bg-[var(--active)]",
                    )}
                  >
                    <Icon className="size-4 text-muted-foreground/45" />
                    <Bone
                      className="h-2.5"
                      style={{ width: `${option.width}px` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <Bone className="h-10 flex-1 rounded-lg bg-linear-to-br from-slate-100 to-indigo-100 dark:from-slate-900 dark:to-indigo-950" />
              <Bone className="h-10 flex-1 rounded-lg bg-linear-to-br from-slate-950 to-indigo-950" />
              <Bone className="h-10 flex-1 rounded-lg bg-linear-to-r from-slate-100 via-slate-950 to-slate-100" />
            </div>
          </CardSkeleton>

          <CardSkeleton className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Bone className="h-3.5 w-28" />
              <Bone className="h-2.5 w-56" />
            </div>
            <Bone className="h-6 w-11 rounded-full" />
          </CardSkeleton>

          <CardSkeleton>
            <CardHeadSkeleton icon={<Gauge className="size-3.5" />} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-[var(--soft)] px-3 py-2"
                >
                  <Bone className="h-2 w-16" />
                  <Bone className="mt-1.5 h-3 w-20" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Bone className="h-8 w-32 rounded-[10px]" />
              <Bone className="h-8 w-36 rounded-[10px]" />
            </div>
          </CardSkeleton>

          <CardSkeleton>
            <CardHeadSkeleton icon={<Keyboard className="size-3.5" />} />
            <div className="mt-3 space-y-1.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                >
                  <Bone className="h-2.5 w-24" />
                  <Bone className="h-2.5 w-32" />
                </div>
              ))}
            </div>
          </CardSkeleton>
        </div>
      </StageScroll>
    </div>
  );
}
