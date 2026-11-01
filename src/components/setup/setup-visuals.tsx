"use client";

// studio/src/components/setup/setup-visuals.tsx
//
// THE ANIMATED FURNITURE.
//
// Presentational primitives built only for the onboarding wizard: an aurora
// backdrop, a soft frosted panel, animated progress, selectable choice cards,
// and a magnetic continue button. Every motion is real pointer state — no
// scrolljacking — and CSS-level `prefers-reduced-motion` is respected.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { FlowGlyph } from "./icon-bridge";
import type { FlowFeature, FlowIcon, FlowTrack } from "@/lib/setup-flow";
import { cn } from "@/lib/utils";

const spring = { type: "spring" as const, stiffness: 380, damping: 30 };

// ─── Step card (fixed-height wizard stage) ───────────────────────────────────
//
// Every wizard step renders inside one of these. On large screens the card is
// a fixed-height stage centred in the viewport: the heading and the continue
// button stay pinned, the body scrolls if the content is longer than the
// stage. On small screens the card grows naturally and the page scrolls, so
// nothing gets squeezed on a phone.
//
// The body centres its contents in the spare space — a short step no longer
// leaves a dead pool of empty space under it — and scrolls from the top when
// the step is taller than the stage.

export function StepCard({
  step,
  title,
  description,
  accent,
  footer,
  children,
  className,
  contentClassName,
  centerContents = true,
}: {
  step?: string;
  title?: string;
  description?: string;
  accent?: string;
  /** Pinned under the body: the continue button row. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Centre the body contents in the spare space. Long steps still scroll. */
  centerContents?: boolean;
}) {
  const hasHeader = Boolean(title || step || description);

  return (
    <div
      className={cn(
        "surface-glass relative flex flex-col overflow-hidden rounded-none",
        "lg:h-[min(78svh,720px)]",
        className,
      )}
    >
      {hasHeader ? (
        <div className="relative shrink-0 px-5 pb-1 pt-5 sm:px-6 sm:pt-6">
          <StepHeading
            step={step ?? ""}
            title={title ?? ""}
            description={description}
            accent={accent}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "step-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-4 sm:px-6",
          contentClassName,
        )}
      >
        {/* The inner wrapper is what centres: min-h-full keeps it as tall as
            the visible body even when the content is shorter, justify-centre
            spreads the slack above and below, and the scroll container still
            scrolls normally once the content outgrows the stage. */}
        <div
          className={cn(
            "flex min-h-full flex-col",
            centerContents && "justify-center",
          )}
        >
          {children}
        </div>
      </div>

      {footer ? (
        <div className="relative shrink-0 px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

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
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className={cn("aurora-layer", reduce && "opacity-45")}>
        <div
          className="aurora-blob aurora-a"
          style={{
            top: "-15%",
            left: "-8%",
            width: "52%",
            height: "58%",
            background: `radial-gradient(circle at 35% 40%, ${primary}, transparent 68%)`,
          }}
        />
        <div
          className="aurora-blob aurora-b"
          style={{
            bottom: "-18%",
            right: "-6%",
            width: "46%",
            height: "52%",
            background: `radial-gradient(circle at 60% 40%, ${secondary}, transparent 70%)`,
          }}
        />
        <div
          className="aurora-blob aurora-a float-slow"
          style={{
            top: "30%",
            left: "38%",
            width: "26%",
            height: "34%",
            opacity: 0.32,
            background: `radial-gradient(circle at 50% 50%, ${surface}, transparent 70%)`,
          }}
        />
      </div>
      {/* Fine grid veil, barely there */}
      <div
        className="grid-veil absolute inset-0 opacity-[0.09]"
        style={{
          maskImage:
            "radial-gradient(ellipse at 50% 30%, black, transparent 75%)",
        }}
      />
      {/* Edge vignette keeps panels readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1300px 880px at 50% -8%, transparent, color-mix(in oklab, var(--color-bg) 92%, transparent) 86%)",
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
    <div className={cn("surface-glass relative rounded-3xl", className)}>
      {sweep ? (
        <div className="beam-sweep absolute inset-0 rounded-3xl opacity-60" />
      ) : null}
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
      className=" relative mx-auto flex w-full max-w-6xl items-stretch gap-1 rounded-2xl px-2.5 sm:px-6 md:px-12 py-2"
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
              "focus-ring group relative flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors",
              active && "bg-(--color-panel-2)",
              !reachable && "cursor-not-allowed opacity-35",
              reachable &&
                !active &&
                "hover:bg-[color-mix(in_oklab,var(--color-accent)_8%,transparent)]",
            )}
          >
            {active ? (
              <motion.span
                layoutId="spine-thumb"
                className="pointer-events-none absolute inset-0 rounded-xl border border-(--color-line-strong)"
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
              />
            ) : null}
            <span
              className={cn(
                "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]",
                active
                  ? "bg-(--color-accent) text-(--color-accent-foreground) shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_18%,transparent)]"
                  : done
                    ? "bg-[color-mix(in_oklab,var(--color-success)_22%,transparent)] text-(--color-success)"
                    : "border border-(--color-line)",
              )}
            >
              {done ? (
                <Check size={11} strokeWidth={3} />
              ) : (
                <FlowGlyph name={step.icon ?? "sparkles"} size={11} />
              )}
            </span>
            <span
              className={cn(
                "relative hidden truncate text-[10.5px] font-medium tracking-wide sm:block",
                active ? "text-(--color-ink)" : "text-(--color-ink-faint)",
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
export type FlowChoice = Pick<
  FlowTrack,
  "id" | "label" | "description" | "icon" | "accent"
>;

export function TrackCard({
  track,
  selected,
  onSelect,
  hint,
  variant = "cover",
}: {
  track: FlowChoice;
  selected: boolean;
  onSelect: () => void;
  hint?: string;
  /** "cover" = full-width aspect-video icon banner over the words (Operation
   *  cards). "row" = compact flex-row chip + words (long cause shelves). */
  variant?: "cover" | "row";
}) {
  if (variant === "row") {
    return (
      <motion.button
        type="button"
        onClick={onSelect}
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.985 }}
        transition={spring}
        className={cn(
          "focus-ring group relative flex h-full w-full items-start gap-2.5 overflow-hidden rounded-2xl border p-3.5 text-left transition-colors",
          selected
            ? "border-accent/55 bg-[color-mix(in_oklab,var(--color-accent)_9%,transparent)]"
            : "border-(--color-line) bg-[color-mix(in_oklab,var(--color-surface)_65%,transparent)] hover:border-(--color-line-strong)",
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
            <span className="block text-[13px] font-semibold leading-snug">
              {track.label}
            </span>
            <span className="mt-0.5 block text-[10.5px] leading-snug text-(--color-ink-faint)">
              {track.description}
            </span>
            {hint ? (
              <span className="mt-1 block text-[9.5px] leading-snug text-(--color-ink-faint) opacity-80">
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

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={spring}
      className={cn(
        "focus-ring group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border text-center transition-colors",
        selected
          ? "border-accent/55 bg-[color-mix(in_oklab,var(--color-accent)_9%,transparent)]"
          : "border-(--color-line) bg-[color-mix(in_oklab,var(--color-surface)_65%,transparent)] hover:border-(--color-line-strong)",
      )}
    >
      {selected ? (
        <motion.span
          layoutId={`track-glow-${track.id}`}
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
          style={{
            border: `1.5px solid ${track.accent.primary}`,
            boxShadow: `0 6px 22px -10px ${track.accent.primary}55 inset`,
          }}
        />
      ) : null}

      {/* Selected tick rides the cover's top-right rail */}
      {selected ? (
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring}
          className="absolute right-2.5 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm"
          style={{ background: track.accent.primary }}
        >
          <Check size={12} strokeWidth={3} />
        </motion.span>
      ) : null}

      {/* The icon cover — the full card width, 16:9, gradient with a gloss */}
      <span
        aria-hidden
        className="relative z-0 flex aspect-video w-full items-center justify-center overflow-hidden"
      >
        <span
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.06]"
          style={{
            background: `linear-gradient(150deg, ${track.accent.primary}, ${track.accent.secondary})`,
          }}
        />
        {/* Gloss + depth so the cover never reads as a flat fill */}
        <span
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 18% 8%, rgba(255,255,255,0.32), transparent 55%), radial-gradient(140% 120% at 90% 115%, rgba(0,0,0,0.28), transparent 60%)",
          }}
        />
        <span
          className="absolute inset-0.75 rounded-xl"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.16)",
          }}
        />
        <span className="relative text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
          <FlowGlyph name={track.icon} size={40} />
        </span>
        {/* Seam between the cover and the words */}
        <span
          className="absolute inset-x-4 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
          }}
        />
      </span>

      {/* Words claim the full padded width, centred under the cover */}
      <span className="relative w-full px-3.5 pb-4 pt-3">
        <span className="block text-[13px] font-semibold leading-snug">
          {track.label}
        </span>
        <span className="mt-1 block text-pretty text-[10.5px] leading-snug text-(--color-ink-faint)">
          {track.description}
        </span>
        {hint ? (
          <span className="mt-1.5 block text-pretty text-[9.5px] leading-snug text-(--color-ink-faint) opacity-80">
            {hint}
          </span>
        ) : null}
      </span>
    </motion.button>
  );
}

// ─── Track gallery (the smart shelf search) ──────────────────────────────────
//
// The NGO shelf carries every cause the sector works in, so scanning it by
// eye stops scaling. The gallery owns a search bar that understands intent:
// "press" finds Media & journalism, "kids after school" finds Children &
// youth, "money for women in farms" mixes three signals and still matches
// three cards. Matching is token-set scoring over label, the track's own
// synonym field, the description, and a cross-causes thesaurus — every word
// of the query must connect to the card, and cards rank by how strongly
// they connect.

const SEARCH_THESAURUS: Record<string, string[]> = {
  press: ["media", "journalism"],
  journalists: ["media", "journalism"],
  journalism: ["media"],
  news: ["media", "journalism"],
  newsroom: ["media"],
  radio: ["media", "journalism"],
  reporters: ["media", "journalism"],
  newspaper: ["media", "journalism"],
  newspapers: ["media", "journalism"],
  tourist: ["tourism", "culture"],
  tourists: ["tourism", "culture"],
  travel: ["tourism"],
  hotel: ["tourism", "hospitality"],
  hotels: ["tourism", "hospitality"],
  hospitality: ["tourism"],
  museum: ["tourism", "culture", "heritage"],
  safari: ["tourism", "wildlife"],
  money: ["livelihoods", "jobs", "savings"],
  jobs: ["livelihoods", "work"],
  work: ["livelihoods"],
  employment: ["livelihoods", "jobs"],
  income: ["livelihoods"],
  loans: ["livelihoods", "microfinance"],
  savings: ["livelihoods"],
  microfinance: ["livelihoods"],
  business: ["livelihoods"],
  grants: ["livelihoods", "donations"],
  donations: ["livelihoods", "funding"],
  funding: ["livelihoods", "donations"],
  camps: ["refugees", "shelter", "displacement"],
  camp: ["refugees", "shelter"],
  tents: ["refugees", "shelter"],
  refugees: ["displacement", "shelter"],
  migrants: ["refugees", "displacement"],
  homeless: ["shelter", "housing"],
  houses: ["shelter", "housing"],
  housing: ["shelter"],
  kids: ["children", "youth"],
  child: ["children", "youth"],
  teenagers: ["youth", "children"],
  orphans: ["children"],
  girls: ["women", "gender"],
  woman: ["women"],
  mothers: ["women", "healthcare"],
  gender: ["women"],
  farms: ["food", "agriculture"],
  farming: ["food", "agriculture"],
  farmers: ["food", "agriculture"],
  crops: ["food", "agriculture"],
  hunger: ["food"],
  meals: ["food"],
  famine: ["food", "disaster"],
  animals: ["wildlife", "animal"],
  pets: ["animal", "wildlife"],
  wild: ["wildlife"],
  rhinos: ["wildlife"],
  rangers: ["wildlife"],
  trees: ["environment"],
  climate: ["environment"],
  planting: ["environment"],
  gyms: ["sports"],
  football: ["sports"],
  soccer: ["sports"],
  sport: ["sports"],
  coaching: ["sports", "education"],
  tech: ["digital"],
  computers: ["digital"],
  computer: ["digital"],
  internet: ["digital"],
  coding: ["digital", "education"],
  lawyers: ["legal"],
  court: ["legal", "justice"],
  courts: ["legal", "justice"],
  justice: ["legal"],
  rights: ["legal", "advocacy"],
  old: ["elderly"],
  seniors: ["elderly"],
  aging: ["elderly"],
  age: ["elderly"],
  lonely: ["elderly", "community"],
  clinics: ["healthcare"],
  hospital: ["healthcare"],
  doctors: ["healthcare"],
  maternal: ["healthcare"],
  medicines: ["healthcare"],
  wells: ["water", "sanitation"],
  boreholes: ["water", "sanitation"],
  toilets: ["water", "sanitation"],
  church: ["faith", "congregation"],
  mosque: ["faith", "congregation"],
  prayer: ["faith"],
  // Education vocabulary
  elementary: ["primary"],
  exams: ["exam", "assessment"],
  exam: ["exam prep", "tuition"],
  cram: ["exam"],
  tuition: ["exam"],
  hostel: ["boarding"],
  dorm: ["boarding"],
  residential: ["boarding"],
  ib: ["international"],
  igcse: ["international"],
  cambridge: ["international"],
  islam: ["madrasah"],
  islamic: ["madrasah"],
  arabic: ["madrasah", "language"],
  quran: ["madrasah"],
  hifz: ["madrasah"],
  trades: ["vocational", "technical"],
  apprentice: ["vocational"],
  degrees: ["college", "university"],
  campus: ["college", "university"],
  faculty: ["college", "university"],
  bootcamp: ["intensive", "hackathon"],
  hackathon: ["bootcamp"],
  live: ["cohort"],
  evening: ["adult", "language"],
  cefr: ["language"],
  ielts: ["language"],
  daycare: ["nursery"],
  kinder: ["nursery"],
  kindergarten: ["nursery"],
  // Ordinary & advanced level vocabulary (secondary = O-Level; A-Level = high school)
  olevel: ["secondary"],
  olevels: ["secondary"],
  ordinary: ["secondary"],
  advanced: ["level"],
  hsc: ["level"],
  upskilling: ["corporate"],
  workshops: ["community", "outreach"],
};

/** Glue words that carry zero intent — dropped so phrases like "money for farms" still resolve. */
const SEARCH_STOPWORDS = new Set([
  "for",
  "and",
  "the",
  "a",
  "an",
  "of",
  "in",
  "on",
  "to",
  "with",
  "that",
]);

/** Split a phrase into lowercase tokens; punctuation never matters. */
const tokensOf = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => Boolean(token) && !SEARCH_STOPWORDS.has(token));

/** Does one query token connect to this track? Higher is the better match. */
function tokenScore(
  token: string,
  label: string,
  description: string,
  extras: string[],
): number {
  const labelWords = label
    .toLowerCase()
    .split(/[\s/&-]+/)
    .filter(Boolean);
  let best = 0;
  if (labelWords.includes(token) || extras.includes(token))
    best = Math.max(best, 100);
  else if (label.toLowerCase().includes(token)) best = Math.max(best, 70);

  // The thesaurus: what a human calls it, not just what the card labels it.
  for (const synonym of [token, ...(SEARCH_THESAURUS[token] ?? [])]) {
    if (labelWords.includes(synonym) || extras.includes(synonym))
      best = Math.max(best, 85);
    else if (label.toLowerCase().includes(synonym)) best = Math.max(best, 50);
    else if (description.toLowerCase().includes(synonym))
      best = Math.max(best, 22);
  }

  // Partial words ("journ", "refug") still land on the right card.
  if (best === 0 && token.length >= 3) {
    if (labelWords.some((word) => word.startsWith(token))) best = 60;
    else if (
      extras.some((extra) => extra.startsWith(token) || extra.includes(token))
    )
      best = 45;
    else if (description.toLowerCase().includes(token)) best = 18;
  }
  return best;
}

/** Total intent score of a track for a whole query — or 0 when any word misses. */
export function trackIntentScore(
  track: FlowTrack,
  tokens: string[],
  lenient = false,
): number {
  const extras = (track.search ?? []).map((term) => term.toLowerCase());
  const label = track.label.toLowerCase();
  const description = track.description.toLowerCase();
  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(token, label, description, extras);
    if (score === 0 && !lenient) return 0;
    total += score;
  }
  return total;
}

/** Best-effort scoring: partial signals only, for widening a multi-word miss. */
function lenientScore(track: FlowTrack, tokens: string[]): number {
  const extras = (track.search ?? []).map((term) => term.toLowerCase());
  const label = track.label.toLowerCase();
  const description = track.description.toLowerCase();
  let total = 0;
  for (const token of tokens) {
    total += tokenScore(token, label, description, extras);
  }
  return total;
}

export function TrackGallery({
  tracks,
  selectedId,
  onSelect,
  accent,
  unit = "options",
  placeholder = `Search the ${unit} — a plain word is enough…`,
  suggestions = [],
}: {
  tracks: FlowTrack[];
  selectedId: string | null;
  onSelect: (track: FlowTrack) => void;
  accent: { primary: string; secondary: string };
  /** What one card of this shelf is called — feeds the counter and aria copy. */
  unit?: string;
  /** Hint sentence; should name words that genuinely match this shelf. */
  placeholder?: string;
  /** Quick-fill chips shown while the bar is empty. */
  suggestions?: string[];
}) {
  const [query, setQuery] = useState("");
  const tokens = useMemo(() => tokensOf(query), [query]);
  const shelfRef = useRef<HTMLDivElement>(null);

  // Every intent change re-anchors the viewport — a shrunk result set should
  // show its best match first, never a stale scrolled position.
  useEffect(() => {
    if (shelfRef.current) shelfRef.current.scrollTop = 0;
  }, [query]);

  const results = useMemo(() => {
    if (tokens.length === 0) return tracks;
    const scored = tracks
      .map((track) => ({ track, score: trackIntentScore(track, tokens) }))
      .filter((entry) => entry.score > 0);
    // A card must answer *every* intent word. When no card does — "money for
    // farms" is really two questions — widen to any card with signal and rank.
    if (scored.length === 0) {
      return tracks
        .map((track) => ({ track, score: lenientScore(track, tokens) }))
        .filter((entry) => entry.score >= 45)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.track);
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((entry) => entry.track);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, query]);

  const searching = tokens.length > 0;
  const reveal = tracks.length >= 6;
  const hints = suggestions
    .slice(0, 3)
    .map((word) => `“${word}”`)
    .join(", ");

  return (
    <div className="flex w-full flex-col gap-4">
      {reveal ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-xl"
        >
          <div className="group flex items-center gap-2 rounded-full border bg-[var(--color-panel-2)] px-3.5 py-2 shadow-[var(--shadow-panel)] transition-colors focus-within:border-[var(--color-accent)]/60">
            <Search
              size={15}
              className="shrink-0 transition-colors"
              style={{
                color: searching ? accent.primary : "var(--color-ink-faint)",
              }}
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              aria-label={`Search the ${unit} shelf`}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-(--color-ink) outline-none placeholder:text-(--color-ink-faint)"
            />
            {searching ? (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setQuery("")}
                className="focus-ring flex h-5 w-5 items-center justify-center rounded-full text-(--color-ink-faint) hover:text-(--color-ink-dim)"
                aria-label="Clear search"
              >
                <X size={12} />
              </motion.button>
            ) : null}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={
                  searching ? `${results.length}of${tracks.length}` : "browse"
                }
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-medium tabular-nums"
                style={
                  searching
                    ? {
                        background: `${accent.primary}18`,
                        color: accent.primary,
                      }
                    : {
                        background:
                          "color-mix(in oklab, var(--color-ink-faint) 10%, transparent)",
                        color: "var(--color-ink-faint)",
                      }
                }
              >
                {searching
                  ? `${results.length} match${results.length === 1 ? "" : "es"}`
                  : `${tracks.length} ${unit}`}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Suggestion chips, only while the bar is empty */}
          <AnimatePresence>
            {!searching && suggestions.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="mt-2 flex flex-wrap justify-center gap-1.5 overflow-hidden"
              >
                {suggestions.map((word, index) => (
                  <motion.button
                    key={word}
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 + index * 0.04 }}
                    onClick={() => setQuery(word)}
                    className="focus-ring rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[10px] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
                  >
                    {word}
                  </motion.button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}

      {/* The shelf playground — a fixed-height scroll viewport so the search
          bar survives filtering without shifting the page or the footer. */}
      <div className="relative w-full">
        <div
          ref={shelfRef}
          className={cn(
            "min-h-0 w-full",
            reveal &&
              "shelf-scroll h-[clamp(300px,46svh,440px)] overflow-y-auto overscroll-contain py-2 pr-1.5",
            !reveal && "py-2",
          )}
          style={
            reveal
              ? {
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0, black 22px, black calc(100% - 30px), transparent 100%)",
                  maskImage:
                    "linear-gradient(to bottom, transparent 0, black 22px, black calc(100% - 30px), transparent 100%)",
                }
              : undefined
          }
        >
          {results.length > 0 ? (
            <div className="grid gap-2.5 py-2 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((trackOption, index) => (
                <motion.div
                  key={trackOption.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(index, 12) * 0.04,
                    duration: 0.4,
                  }}
                  style={{ minHeight: "100%" }}
                >
                  <TrackCard
                    track={trackOption}
                    selected={selectedId === trackOption.id}
                    onSelect={() => onSelect(trackOption)}
                    variant="row"
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "flex flex-col items-center gap-2 text-center",
                reveal ? "h-full justify-center py-6" : "py-10",
              )}
            >
              <Sparkles size={20} style={{ color: accent.primary }} />
              <p className="text-[12px] font-medium">
                Nothing answers “{query}” yet
              </p>
              <p className="max-w-xs text-[10.5px] leading-relaxed text-[var(--color-ink-faint)]">
                Try a plainer word{hints.length > 0 ? ` — ${hints}` : ""} — or
                clear the search to browse the whole shelf.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
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
        "focus-ring group relative flex items-start gap-2.5 overflow-hidden rounded-xl border p-3 text-left transition-colors",
        enabled
          ? "border-[var(--color-accent)]/50 bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]"
          : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          enabled
            ? "text-white"
            : "bg-[var(--color-panel-2)] text-[var(--color-ink-faint)] group-hover:text-[var(--color-ink-dim)]",
        )}
        style={enabled ? { background: "var(--color-accent)" } : undefined}
      >
        <FlowGlyph name={feature.icon} size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11.5px] font-semibold leading-snug">
          {feature.label}
        </span>
        <span className="mt-0.5 block text-[10px] leading-snug text-[var(--color-ink-faint)]">
          {feature.description}
        </span>
      </span>
      <span
        className={cn(
          "ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          enabled
            ? "border-transparent bg-[var(--color-accent)] text-white"
            : "border-[var(--color-line-strong)]",
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
        "focus-ring group rounded-full border px-3.5 py-2 text-left transition-colors",
        selected
          ? "border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)]"
          : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]",
      )}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            selected
              ? "bg-[var(--color-accent)]"
              : "bg-[var(--color-line-strong)]",
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
  label = "Continue",
  hint,
  disabled,
  busy,
  onClick,
  accent,
  wide,
}: {
  label?: string;
  hint?: string;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  accent?: { primary: string; secondary: string };
  /** Stretches the pill across the footer and moves the detail words into the
   *  caption underneath — used where the label was naming the selection. */
  wide?: boolean;
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
    <div className={cn("flex flex-col gap-2", wide ? "w-full" : "items-center")}>
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
          "focus-ring group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-semibold tracking-wide disabled:cursor-not-allowed disabled:opacity-50",
          wide ? "mx-auto w-auto px-8" : "min-w-[220px]",
          "text-[var(--color-accent-foreground)]",
        )}
      >
        <span
          className="absolute inset-0"
          style={{
            background: accent
              ? `linear-gradient(120deg, ${accent.primary}, ${accent.secondary})`
              : "linear-gradient(120deg, var(--color-accent), color-mix(in oklab, var(--color-accent) 72%, #06b6d4))",
          }}
        />
        {/* Inner highlight sheen */}
        <span className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.22),transparent)]" />
        <span className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <span className="beam-sweep absolute inset-0" aria-hidden />
        </span>
        <span className="relative flex items-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {label}
          {!busy ? (
            <motion.span
              aria-hidden
              animate={{ x: [0, 3, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.8,
                ease: "easeInOut",
              }}
            >
              →
            </motion.span>
          ) : null}
        </span>
      </motion.button>
      {hint ? (
        <p
          className={cn(
            "text-[10px] leading-relaxed text-[var(--color-ink-faint)]",
            wide ? "mx-auto text-center" : "",
          )}
        >
          {hint}
        </p>
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
        style={{ color: accent ?? "var(--color-accent)" }}
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
