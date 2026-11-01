// gn-apex/src/components/media/MediaLibrarySheet.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sparkles,
  Search,
  Box,
  Music,
  ImageIcon,
  Wand2,
  Plus,
  X,
} from "lucide-react";
import {
  getTemplateCategories,
  sampleToFile,
  TEMPLATE_COUNT,
  type Sample,
  type SampleCategory,
  type SampleImage,
  type SampleMotion,
  type SampleSound,
} from "./mediaSamples";

export interface MediaLibrarySheetProps {
  children: React.ReactNode;
  onSelectFile?: (file: File) => void;
  side?: "left" | "right";
  className?: string;
  /** Open the sheet on first render (useful for previews). */
  defaultOpen?: boolean;
  /** Initial category id. */
  defaultTab?: string;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  avatar: <ImageIcon size={13} />,
  logo: <Sparkles size={13} />,
  cover: <Wand2 size={13} />,
  background: <ImageIcon size={13} />,
  motion: <Box size={13} />,
  sound: <Music size={13} />,
};

function svgUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function matches(s: Sample, q: string): boolean {
  if (!q) return true;
  const hay = `${s.id} ${s.label} ${s.meta}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

// ─────────────────────────────────────────────
// CARDS
// ─────────────────────────────────────────────

function ImageCard({
  s,
  onPick,
}: {
  s: SampleImage;
  onPick: (s: Sample) => void;
}) {
  const round = s.kind === "avatar";
  const wide = s.kind === "cover";
  return (
    <button
      type="button"
      onClick={() => onPick(s)}
      className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/6 hover:shadow-lg hover:shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div
        className={`relative w-full overflow-hidden ${wide ? "aspect-18/9" : "aspect-square"} bg-[#0b0f12]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgUri(s.svg)}
          alt={s.label}
          className={`h-full w-full object-cover ${round ? "p-3" : "p-0"}`}
          style={round ? { objectFit: "contain" } : undefined}
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <span className="pointer-events-none whitespace-nowrap absolute bottom-2 left-1/2 flex -translate-x-1/2 translate-y-2 items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-black opacity-0 shadow transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <Plus size={11} /> Use template
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">
            {s.label}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{s.meta}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">
          svg
        </span>
      </div>
    </button>
  );
}

function MotionCard({
  s,
  onPick,
}: {
  s: SampleMotion;
  onPick: (s: Sample) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(s)}
      className="group flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/3 p-3 text-left transition-all hover:border-white/20 hover:bg-white/6"
    >
      <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#0b0f12]">
        <div className="absolute inset-0 opacity-40 bg-[repeating-conic-gradient(#1d262b_0_25%,#27323a_0_50%)] bg-size-[10px_10px]" />
        <div className="relative grid size-7 place-items-center">
          <div
            className="absolute size-4 rounded-full border border-fuchsia-400/70 animate-pulse"
            style={{ animationDuration: "1200ms" }}
          />
          <div className="size-2 rounded-full bg-fuchsia-300/90" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">
          {s.label}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">{s.meta}</p>
      </div>
      <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">
        lottie
      </span>
    </button>
  );
}

function SoundCard({
  s,
  onPick,
}: {
  s: SampleSound;
  onPick: (s: Sample) => void;
}) {
  // deterministic bars for a pleasing little waveform preview
  const bars = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 28; i++) {
      out.push(0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + s.freq / 100)));
    }
    return out;
  }, [s.freq]);

  return (
    <button
      type="button"
      onClick={() => onPick(s)}
      className="group flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/3 p-3 text-left transition-all hover:border-white/20 hover:bg-white/6"
    >
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#0b0f12]">
        <Music size={18} className="text-sky-300" />
        <div className="absolute inset-x-0 bottom-2 flex items-end justify-center gap-0.5 px-2 opacity-80">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-0.5 rounded-full bg-sky-400/60 transition-transform group-hover:scale-y-110"
              style={{ height: `${Math.round(h * 60) + 10}%` }}
            />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">
          {s.label}
        </p>
        <div className="mt-1 flex h-4 items-end gap-0.5">
          {bars.map((h, i) => (
            <span
              key={i}
              className="w-0.75 rounded-full bg-sky-400/50"
              style={{ height: `${Math.round(h * 100)}%` }}
            />
          ))}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-mono uppercase text-muted-foreground">
        wav
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────
// SHEET
// ─────────────────────────────────────────────

export function MediaLibrarySheet({
  children,
  onSelectFile,
  side = "right",
  className,
  defaultOpen = false,
  defaultTab = "avatar",
}: MediaLibrarySheetProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(defaultTab);
  const [query, setQuery] = useState("");

  const categories = useMemo<SampleCategory[]>(
    () => getTemplateCategories(),
    [],
  );
  const current = categories.find((c) => c.id === active) ?? categories[0];
  const q = query.trim();
  const filtered = current.items.filter((s) => matches(s, q));

  // Global search across every category.
  const searchGroups = categories
    .map((c) => ({ category: c, items: c.items.filter((s) => matches(s, q)) }))
    .filter((g) => g.items.length > 0);
  const searchCount = searchGroups.reduce((n, g) => n + g.items.length, 0);

  const handlePick = (s: Sample) => {
    onSelectFile?.(sampleToFile(s));
    setOpen(false);
    setQuery("");
  };

  const renderGallery = (items: Sample[]) => {
    const images = items.filter((s): s is SampleImage => s.type === "image");
    const others = items.filter(
      (s): s is SampleMotion | SampleSound => s.type !== "image",
    );
    const hasWide = images.some((s) => s.kind === "cover");
    return (
      <div className="space-y-3">
        {images.length > 0 && (
          <div
            className={`grid gap-3 ${
              hasWide
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {images.map((s) => (
              <ImageCard key={s.id} s={s} onPick={handlePick} />
            ))}
          </div>
        )}
        {others.length > 0 && (
          <div className="space-y-2">
            {others.map((s) =>
              s.type === "motion" ? (
                <MotionCard key={s.id} s={s} onPick={handlePick} />
              ) : (
                <SoundCard key={s.id} s={s} onPick={handlePick} />
              ),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {React.isValidElement(children) ? (
        // base-ui hands the caller's element to the trigger via `render`
        // rather than Radix's `asChild`.
        <SheetTrigger render={children} />
      ) : (
        <SheetTrigger>{children}</SheetTrigger>
      )}
      <SheetContent
        side={side}
        className={`flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl ${className ?? ""}`}
      >
        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-white/8 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className=" border border-primary/20 bg-linear-to-br from-cyan-500 to-purple-500 p-2 shadow-lg shadow-cyan-900/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <SheetTitle className="flex items-center gap-2 text-base">
                Template Library
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-muted-foreground">
                  {TEMPLATE_COUNT} assets
                </span>
              </SheetTitle>
              <SheetDescription className="text-[11px]">
                Ready-made media. Pick one and it drops straight into the
                studio.
              </SheetDescription>
            </div>

            <SheetClose className="flex ">
              <X />
              close
            </SheetClose>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search all ${TEMPLATE_COUNT} templates…`}
              className="w-full rounded-xl border border-muted-foreground/15 bg-input/50 py-2 pl-9 pr-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-muted-foreground transition hover:bg-white/20 hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </SheetHeader>

        {/* Category rail */}
        <div className="shrink-0 flex items-center gap-1 overflow-x-auto border-b border-white/8 px-3 py-2 [scrollbar-width:none]">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active === c.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {CATEGORY_ICON[c.id]}
              {c.label}
              <span
                className={`text-[10px] font-mono ${active === c.id ? "text-background/70" : "text-muted-foreground/70"}`}
              >
                {c.items.length}
              </span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {q ? (
            searchCount === 0 ? (
              <div className="grid place-items-center py-16 text-center">
                <Search className="mb-3 size-6 text-muted-foreground/40" />
                <p className="text-sm font-semibold">No templates match</p>
                <p className="text-xs text-muted-foreground">
                  Nothing found for &ldquo;{q}&rdquo;. Try another word.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-[11px] text-muted-foreground">
                  {searchCount} result{searchCount === 1 ? "" : "s"} for &ldquo;
                  {q}&rdquo;
                </p>
                {searchGroups.map(({ category, items }) => (
                  <section key={category.id} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="text-primary/80">
                        {CATEGORY_ICON[category.id]}
                      </span>
                      {category.label}
                      <span className="font-mono text-muted-foreground/60">
                        {items.length}
                      </span>
                    </div>
                    {renderGallery(items)}
                  </section>
                ))}
              </div>
            )
          ) : (
            <>
              <p className="mb-3 text-[11px] text-muted-foreground">
                {current.hint}
              </p>
              {filtered.length === 0 ? (
                <div className="grid place-items-center py-16 text-center">
                  <Search className="mb-3 size-6 text-muted-foreground/40" />
                  <p className="text-sm font-semibold">Nothing here yet</p>
                  <p className="text-xs text-muted-foreground">
                    This category is empty.
                  </p>
                </div>
              ) : (
                renderGallery(filtered)
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
