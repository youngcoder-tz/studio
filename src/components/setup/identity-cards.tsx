'use client';

// studio/src/components/setup/identity-cards.tsx
//
// BRAND + OPERATIONS CARDS.
//
// These are the two card types that still contain real form controls. They
// keep the non-form feel: fields reveal in staggered groups, and only the
// essential ones exist — identity card asks "who is this?" and operations
// card asks "how does it run?", never "please fill all 12 fields at once".

import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { BadgeCheck, Check, ShieldCheck, Upload, X } from 'lucide-react';

import type { FlowField, ModeFlow } from '@/lib/setup-flow';
import type { GlobalTokens } from '@/lib/contract';
import { Field, TextArea, TextInput } from '@/components/ui/input';
import { UniversalUploader } from '@/components/media/UniversalUploader';
import { cn } from '@/lib/utils';

const list: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

/** The Studio's lexical helper — same shape as `textOf` in the setup page. */
const strOf = (value: unknown): string =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : "";

// ─── Identity ────────────────────────────────────────────────────────────────
//
// The branding step is a live billboard, not a form: everything the client
// types is reflected on a mock portal window beside the fields, and derived
// brand art (monogram, favicon, share card) previews itself in real time.

/** First letters of the first two words — the fallback monogram. */
const monogramOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

/** A slug-ish precursor, so the mock URL bar reads like a real domain. */
const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);

/** Tile that previews the client's logo — or the derived monogram until one
 *  has been set. Kept deliberately abstract so every caller frames it. */
function LogoTile({
  url,
  name,
  size,
  gradient,
  rounded = "rounded-xl",
}: {
  url: string;
  name: string;
  size: number;
  gradient: string;
  rounded?: string;
}) {
  const monogram = monogramOf(name);
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden text-white shadow-sm",
        rounded,
      )}
      style={{ width: size, height: size, background: gradient }}
    >
      {url ? (
        // Client-supplied, may be on any https host — plain <img> is right here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : monogram ? (
        <span
          className="font-heading font-semibold tracking-tight"
          style={{ fontSize: size * 0.34 }}
        >
          {monogram}
        </span>
      ) : (
        <AcropolisGlyphSeed size={size} />
      )}
    </div>
  );
}

/** The same mark as a favicon beside the mock URL — tiny on purpose. */
function FaviconTile({ url, name }: { url: string; name: string }) {
  return (
    <LogoTile
      url={url}
      name={name}
      size={16}
      gradient="linear-gradient(135deg, var(--color-accent), color-mix(in oklab, var(--color-accent) 55%, #06b6d4))"
      rounded="rounded-[5px]"
    />
  );
}

function AcropolisGlyphSeed({ size }: { size: number }) {
  return (
    <span style={{ fontSize: Math.round(size * 0.3), opacity: 0.9 }}>◈</span>
  );
}

export function IdentityCard({
  flow,
  tokens,
  onChange,
  autoName,
  examples,
}: {
  flow: ModeFlow;
  tokens: GlobalTokens;
  onChange: (key: string, value: string | number) => void;
  /** The project's own name, so the card knows the name was auto-filled. */
  autoName: string;
  /** A real example for the origin the client just picked. */
  examples?: { name: string; tagline: string };
}) {
  const name = strOf(tokens?.siteName ?? "");
  const tagline = strOf(tokens?.tagline ?? "");
  const logoUrl = strOf(tokens?.logoUrl ?? "").trim();
  const monogram = monogramOf(name);
  const logoGradient =
    "linear-gradient(135deg, var(--color-accent), color-mix(in oklab, var(--color-accent) 55%, #06b6d4))";
  const autoNamed = strOf(autoName ?? "").trim();
  const isAutoNamed = autoNamed !== "" && name === autoNamed;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr] lg:items-start">
      {/* ── Left: the billboard — the brand, seen as the world will see it ── */}
      <motion.div
        variants={list}
        initial="hidden"
        animate="show"
        className="space-y-3"
        aria-label="Live brand preview"
      >
        {/* Mock browser window */}
        <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-panel)]">
          {/* Accent wash bleeding up from the hero */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.13]"
            style={{
              background: `radial-gradient(120% 90% at 50% 115%, ${flow.accent.primary}, transparent 62%)`,
            }}
          />
          {/* Chrome bar */}
          <div className="relative flex items-center gap-2 border-b border-[var(--color-line)] px-3 py-2">
            <span className="flex gap-1.5">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-2 w-2 rounded-full bg-[var(--color-line-strong)]"
                />
              ))}
            </span>
            <span className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-2)] px-2 py-0.5">
              <LogoTile
                url={logoUrl}
                name={name}
                size={12}
                gradient={logoGradient}
                rounded="rounded-[3px]"
              />
              <span className="truncate text-[9.5px] text-[var(--color-ink-faint)]">
                portal.{slugOf(name) || "yourspace"}.nexus
              </span>
            </span>
          </div>
          {/* Navbar */}
          <div className="relative flex items-center gap-2.5 border-b border-[var(--color-line)]/60 px-4 py-2.5">
            <motion.span
              key={name}
              initial={{ scale: 0.86, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
            >
              <LogoTile
                url={logoUrl}
                name={name}
                size={28}
                gradient={logoGradient}
              />
            </motion.span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={name}
                initial={{ y: 8, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -8, opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="truncate text-[13px] font-semibold tracking-tight"
              >
                {name || "Your workspace"}
              </motion.span>
            </AnimatePresence>
            {/* Faux nav — skeleton chips, never real links */}
            <span className="ml-auto hidden items-center gap-2 sm:flex">
              {["Home", "About"].map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-[color-mix(in_oklab,var(--color-ink-faint)_10%,transparent)] px-2 py-0.5 text-[9px] text-[var(--color-ink-faint)]"
                >
                  {label}
                </span>
              ))}
            </span>
          </div>
          {/* Hero */}
          <div className="relative flex flex-col items-center px-5 pb-5 pt-6 text-center">
            <span
              className="rounded-full border px-2.5 py-0.5 text-[9px] uppercase tracking-[0.18em]"
              style={{ borderColor: flow.accent.primary, color: flow.accent.primary }}
            >
              {flow.osName} portal
            </span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h2
                key={name}
                initial={{ y: 12, opacity: 0, filter: "blur(6px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -10, opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                className="mt-2.5 max-w-[22ch] text-balance font-heading text-[clamp(1.35rem,3.2vw,1.9rem)] font-semibold leading-[1.12] tracking-tight"
              >
                {name || "Give it a name"}
              </motion.h2>
            </AnimatePresence>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={tagline}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-1.5 max-w-[36ch] text-[11px] leading-relaxed text-[var(--color-ink-dim)]"
              >
                {tagline || (
                  <span className="opacity-55">
                    A tagline sets the tone — one honest line is plenty.
                  </span>
                )}
              </motion.p>
            </AnimatePresence>
            <div className="mt-3.5 flex items-center gap-2">
              <motion.span
                animate={{ boxShadow: [
                  `0 0 0 0 ${flow.accent.primary}00`,
                  `0 0 18px 1px ${flow.accent.primary}44`,
                  `0 0 0 0 ${flow.accent.primary}00`,
                ] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                className="rounded-full px-3.5 py-1.5 text-[10.5px] font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${flow.accent.primary}, ${flow.accent.secondary})`,
                }}
              >
                Get started
              </motion.span>
              <span className="rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-[10.5px] text-[var(--color-ink-dim)]">
                Learn more
              </span>
            </div>
          </div>
        </div>

        {/* Derived artefacts — the plumbing they never have to think about */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/60 p-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
              Favicon
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex items-baseline gap-[1px]">
                <FaviconTile url={logoUrl} name={name} />
                <span className="text-[13px] leading-none text-[var(--color-ink-faint)]">
                  ◦
                </span>
              </span>
              <span className="truncate rounded-md border border-[var(--color-line)] bg-[var(--color-panel-2)] px-1.5 py-0.5 text-[9px] text-[var(--color-ink-faint)]">
                browser tab
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/60 p-2.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
              Share card
            </p>
            <div className="mt-2 flex items-center gap-2">
              <LogoTile
                url={logoUrl}
                name={name}
                size={30}
                gradient={logoGradient}
                rounded="rounded-lg"
              />
              <div className="min-w-0">
                <p className="truncate text-[10.5px] font-semibold leading-tight">
                  {name || "Your workspace"}
                </p>
                <p className="truncate text-[9px] text-[var(--color-ink-faint)]">
                  portal.{slugOf(name) || "yourspace"}.nexus
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Right: the interview — name, tagline, logo ── */}
      <motion.div variants={list} initial="hidden" animate="show" className="space-y-4">
        <motion.div variants={item}>
          <Field
            htmlFor="setup-siteName"
            label="Name"
            hint={
              isAutoNamed
                ? "Auto-filled from the project's name — edit it freely."
                : "Shown in navigation, page titles and footer."
            }
          >
            <div className="relative">
              <TextInput
                id="setup-siteName"
                value={name}
                maxLength={120}
                placeholder={examples?.name ?? "Riverside Academy"}
                onChange={(event) => onChange("siteName", event.target.value)}
                className="h-11 pl-11 text-base font-medium"
                autoFocus
              />
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                <LogoTile
                  url={logoUrl}
                  name={name}
                  size={28}
                  gradient={logoGradient}
                />
              </span>
              {isAutoNamed ? (
                <motion.span
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    background: `${flow.accent.primary}18`,
                    color: flow.accent.primary,
                  }}
                >
                  auto
                </motion.span>
              ) : null}
            </div>
          </Field>
        </motion.div>

        <motion.div variants={item}>
          <Field
            htmlFor="setup-tagline"
            label="Tagline"
            hint="One line, 240 characters max."
          >
            <TextArea
              id="setup-tagline"
              value={tagline}
              maxLength={240}
              placeholder={
                examples?.tagline ?? "Learning with purpose, leading with care."
              }
              onChange={(event) => onChange("tagline", event.target.value)}
              className="min-h-[68px]"
            />
          </Field>
        </motion.div>

        {/* Logo slot — the vendored Apex media engine does the heavy lifting:
            pick, crop circle-minus, optimise, and the returned CDN URL lands
            straight in the draft. A monogram fills the slot until then. */}
        <motion.div variants={item}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-faint)]">
            Logo
          </p>
          <div className="mt-2 flex items-center gap-3">
            <LogoSlot
              flow={flow}
              logoUrl={logoUrl}
              monogram={monogram}
              gradient={logoGradient}
              name={name}
              onUploaded={(url) => onChange("logoUrl", url)}
              onClear={() => onChange("logoUrl", "")}
            />
            <div className="min-w-0 flex-1 text-[10.5px] leading-relaxed text-[var(--color-ink-faint)]">
              <p>
                SVG, PNG or JPG — square crops best. Until one is set, the
                brand runs on the{" "}
                <span className="font-medium text-[var(--color-ink-dim)]">
                  “{monogram || "◈"}” monogram
                </span>{" "}
                everywhere.
              </p>
              <details className="mt-1.5">
                <summary className="cursor-pointer select-none text-[var(--color-ink-dim)] underline-offset-2 hover:underline">
                  Paste an image URL instead
                </summary>
                <TextInput
                  aria-label="Logo URL"
                  type="url"
                  value={logoUrl}
                  placeholder="https://cdn.example.com/logo.svg"
                  onChange={(event) => onChange("logoUrl", event.target.value)}
                  className="mt-1.5"
                />
              </details>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Logo slot ───────────────────────────────────────────────────────────────

function LogoSlot({
  flow,
  logoUrl,
  monogram,
  gradient,
  name,
  onUploaded,
  onClear,
}: {
  flow: ModeFlow;
  logoUrl: string;
  monogram: string;
  gradient: string;
  name: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
}) {
  if (logoUrl) {
    return (
      <div className="group relative">
        <LogoTile
          url={logoUrl}
          name={name}
          size={88}
          gradient={gradient}
          rounded="rounded-2xl"
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onClear}
          className="focus-ring absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-line-strong)] bg-[var(--color-panel)] text-[var(--color-ink-dim)] shadow-sm transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
          aria-label="Remove logo"
        >
          <X size={12} />
        </motion.button>
      </div>
    );
  }

  return (
    <UniversalUploader
      accept={["image"]}
      aspectRatio={1}
      cropShape="round"
      maxSizeMB={5}
      maxFiles={1}
      title="Brand logo"
      description="Crop, optimise and publish — the URL lands right here."
      onSuccess={(url) => onUploaded(url)}
    >
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="focus-ring relative flex h-[88px] w-[88px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--color-line-strong)] transition-colors hover:border-[var(--color-accent)]"
        aria-label="Upload a logo image"
      >
        {/* Ghost monogram shimmering behind, so the slot never looks empty */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-heading text-[22px] font-semibold opacity-[0.12]"
        >
          {monogram || "◈"}
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-pulse"
          style={{
            background: `radial-gradient(100% 70% at 50% 120%, ${flow.accent.primary}22, transparent 70%)`,
          }}
        />
        <span className="relative flex flex-col items-center gap-1 text-[var(--color-ink-dim)]">
          <Upload size={16} style={{ color: flow.accent.primary }} />
          <span className="text-[9.5px] font-medium">Upload</span>
        </span>
      </motion.div>
    </UniversalUploader>
  );
}

// ─── Operations ──────────────────────────────────────────────────────────────

export function OperationsCard({
  fields,
  tokens,
  onChange,
  issues,
}: {
  fields: FlowField[];
  tokens: GlobalTokens;
  onChange: (key: string, value: string | number) => void;
  /** Token-rule problems from the client mirror of the backend's validator. */
  issues?: Record<string, string>;
}) {
  return (
    <motion.div
      variants={list}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2"
    >
      {fields.map((field, index) => (
        <motion.div
          key={field.key}
          variants={item}
          className={field.type === 'select' ? '' : 'sm:col-span-2'}
        >
          <DynamicField
            field={field}
            value={String(tokens[field.key] ?? '')}
            onChange={(value) => onChange(field.key, value)}
            index={index}
            issue={issues?.[field.key]}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

function DynamicField({
  field,
  value,
  onChange,
  issue,
}: {
  field: FlowField;
  value: string;
  onChange: (value: string) => void;
  index: number;
  issue?: string;
}) {
  const inputType =
    field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : 'text';
  return (
    <Field
      label={field.label}
      hint={field.hint}
      error={issue ?? (field.required && !value.trim() ? 'Required.' : null)}
    >
      {field.type === 'select' ? (
        <div className="flex flex-wrap gap-1.5">
          {field.options?.map((option) => {
            const active = value === option.value;
            return (
              <motion.button
                key={option.value}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onChange(option.value)}
                className={cn(
                  'focus-ring rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)]'
                    : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                )}
              >
                {option.label}
              </motion.button>
            );
          })}
        </div>
      ) : field.type === 'textarea' ? (
        <TextArea
          value={value}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <TextInput
          type={inputType}
          value={value}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

// ─── Registry panel (credentials side visual) ────────────────────────────────
//
// The Register step asks about registration evidence, which reads like
// bureaucracy. The right column answers that mood: the same answers, rendered
// live as a letterpress-style certificate — a draft registry entry the client
// can watch fill in row by row. Each keystroke lands on mocked paper, so the
// step feels like issuing a document rather than filling a form.

/** Options carry print labels; a certificate should speak in those, not values. */
function displayOf(field: FlowField, raw: string): string {
  if (!raw) return "";
  const option = field.options?.find((candidate) => candidate.value === raw);
  return option ? option.label : raw;
}

const SEAL_RING = "M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0";

export function RegistryPanel({
  fields,
  tokens,
  siteName,
  accent,
}: {
  fields: FlowField[];
  tokens: GlobalTokens;
  /** The project name from the brand step — it tops the certificate. */
  siteName: string;
  accent: { primary: string; secondary: string };
}) {
  const reduce = useReducedMotion();

  const rows = fields.map((field) => {
    const display = displayOf(field, strOf(tokens[field.key]));
    return { field, value: display, filled: display.trim().length > 0 };
  });
  const filledCount = rows.filter((row) => row.filled).length;
  const complete = rows.length > 0 && filledCount === rows.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Live preview of your registry entry"
      className="flex w-full flex-col gap-3"
    >
      {/* Panel masthead */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={13} style={{ color: accent.primary }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-dim)]">
            Live registry preview
          </span>
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={complete ? "sealed" : "draft"}
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] tabular-nums"
            style={
              complete
                ? { background: `${accent.primary}1f`, color: accent.primary }
                : {
                    background:
                      "color-mix(in oklab, var(--color-ink-faint) 12%, transparent)",
                    color: "var(--color-ink-faint)",
                  }
            }
          >
            {complete ? "● Ready to display" : `Draft · ${filledCount}/${rows.length}`}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* The certificate itself */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-panel-2)] shadow-[var(--shadow-panel)]">
        {/* Guilloche paper: faint repeating arcs over an accent wash */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 85% -10%, ${accent.primary}1c, transparent 55%), radial-gradient(110% 80% at 0% 105%, ${accent.secondary}14, transparent 60%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `repeating-conic-gradient(from 8deg at 50% 120%, ${accent.primary} 0deg 2deg, transparent 2deg 14deg)`,
            maskImage: "radial-gradient(80% 60% at 50% 115%, black, transparent 75%)",
          }}
        />
        {/* Shine sweep — a hand-lifted-into-light moment, throttled */}
        {!reduce ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12"
            style={{
              background:
                "linear-gradient(100deg, transparent, rgba(255,255,255,0.14), transparent)",
            }}
            initial={{ x: "-160%" }}
            animate={{ x: ["-160%", "460%"] }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 5.5, ease: "easeInOut" }}
          />
        ) : null}

        <div className="relative flex flex-col items-center gap-3 px-4 pb-4 pt-4 sm:px-5">
          {/* Corner ticks, like a plate frame */}
          {[
            "left-2 top-2 border-l border-t",
            "right-2 top-2 border-r border-t",
            "bottom-2 left-2 border-b border-l",
            "bottom-2 right-2 border-b border-r",
          ].map((position) => (
            <span
              key={position}
              aria-hidden
              className={cn("absolute h-3 w-3 border-[var(--color-line-strong)] opacity-60", position)}
            />
          ))}

          <div className="flex items-center gap-2.5 pt-1" aria-hidden>
            <span className="h-px w-8" style={{ background: `${accent.secondary}66` }} />
            <span
              className="text-[8.5px] font-semibold uppercase tracking-[0.34em]"
              style={{ color: `${accent.primary}cc` }}
            >
              Certificate of registration
            </span>
            <span className="h-px w-8" style={{ background: `${accent.secondary}66` }} />
          </div>

          {/* Name — live from the brand step */}
          <div className="relative flex flex-col items-center gap-1 text-center">
            <AnimatePresence initial={false}>
              <motion.p
                key={siteName}
                initial={{ opacity: 0.35, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, position: "absolute" }}
                transition={{ duration: 0.35 }}
                className="font-heading text-[17px] font-semibold leading-tight text-[var(--color-ink)]"
              >
                {siteName || "Your institution's name"}
              </motion.p>
            </AnimatePresence>
            <span
              className="h-[2px] w-14 rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent.secondary}, ${accent.primary})` }}
              aria-hidden
            />
          </div>

          {/* Ledger rows — leader dots like a printed register */}
          <dl className="w-full pr-0.5">
            {rows.map(({ field, value, filled }, index) => {
              // Registration codes and years read best engraved: mono, spaced.
              const engraved = /number|year|code/i.test(field.label);
              return (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05, duration: 0.35 }}
                  className="flex items-baseline gap-2 py-[5px] text-[10.5px] leading-snug"
                >
                  <dt className="shrink-0 font-medium uppercase tracking-[0.08em] text-[var(--color-ink-faint)]">
                    {field.label}
                  </dt>
                  <dd
                    aria-hidden
                    className="mx-0.5 min-w-4 flex-1 self-center border-b border-dotted border-[var(--color-line-strong)]"
                  />
                  {filled ? (
                    <motion.dd
                      key={value}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "min-w-0 max-w-[60%] truncate text-right font-medium text-[var(--color-ink)]",
                        engraved && "font-mono text-[10px] tracking-[0.06em]",
                      )}
                    >
                      {value}
                    </motion.dd>
                  ) : (
                    <dd className="shrink-0 select-none text-right tracking-[0.3em] text-[var(--color-ink-faint)]">
                      — — —
                    </dd>
                  )}
                </motion.div>
              );
            })}
          </dl>

          {/* Wax seal with rotating ring text */}
          <div className="relative mt-1 flex items-end justify-between self-stretch">
            <p className="max-w-[62%] text-[9px] leading-relaxed text-[var(--color-ink-faint)]">
              Issued as presentation tokens — printed on admissions &amp; about
              pages. EduOS displays them, it never verifies them.
            </p>
            <div className="relative h-[74px] w-[74px] shrink-0" aria-hidden>
              <motion.svg
                viewBox="0 0 100 100"
                className="absolute inset-0"
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
                style={{ color: `${accent.primary}88` }}
              >
                <defs>
                  <path id="registry-seal-ring" d={SEAL_RING} fill="none" />
                </defs>
                <text
                  fontSize="7.2"
                  letterSpacing="2.1"
                  fill="currentColor"
                  className="font-semibold uppercase"
                >
                  <textPath href="#registry-seal-ring">
                    OFFICIAL ENTRY · STUDIO REGISTRY · DRAFT ·
                  </textPath>
                </text>
              </motion.svg>
              <motion.div
                initial={false}
                animate={
                  complete
                    ? { scale: [1.25, 0.94, 1.04, 1], rotate: [-10, 6, -2, 0] }
                    : { scale: 1, rotate: 0 }
                }
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-[17px] flex items-center justify-center rounded-full"
                style={{
                  background: complete
                    ? `conic-gradient(from 210deg, ${accent.secondary}, ${accent.primary})`
                    : `color-mix(in oklab, var(--color-ink-faint) 16%, transparent)`,
                  boxShadow: complete
                    ? `0 6px 16px -6px ${accent.primary}aa, inset 0 0 0 1.5px rgba(255,255,255,0.35)`
                    : "inset 0 0 0 1.5px color-mix(in oklab, var(--color-ink-faint) 22%, transparent)",
                }}
              >
                <BadgeCheck
                  size={22}
                  strokeWidth={2}
                  className={complete ? "text-white" : "text-[var(--color-ink-faint)]"}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Kept-in-place checklist — agreement that the paper is filling up */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
            In place
          </span>
          <span className="text-[9.5px] font-medium tabular-nums text-[var(--color-ink-dim)]">
            {filledCount} of {rows.length}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-ink-faint)_14%,transparent)]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent.secondary}, ${accent.primary})` }}
            initial={false}
            animate={{ width: `${rows.length ? (filledCount / rows.length) * 100 : 0}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
          />
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          {rows.map(({ field, filled }) => (
            <li key={field.key} className="flex items-center gap-1 text-[9.5px]">
              <motion.span
                initial={false}
                animate={filled ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "flex h-3 w-3 items-center justify-center rounded-full border",
                  filled
                    ? "border-transparent text-white"
                    : "border-dashed border-[var(--color-line-strong)] text-transparent",
                )}
                style={filled ? { background: accent.primary } : undefined}
              >
                <Check size={8} strokeWidth={3.5} />
              </motion.span>
              <span className={filled ? "text-[var(--color-ink-dim)]" : "text-[var(--color-ink-faint)]"}>
                {field.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}

// ─── Style card helpers ──────────────────────────────────────────────────────

export function PresetCard({
  label,
  description,
  accent,
  active,
  onSelect,
}: {
  label: string;
  description: string;
  accent: { primary: string; secondary: string; surface: string };
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'focus-ring group relative flex flex-col overflow-hidden rounded-2xl border p-3.5 text-left transition-colors',
        active
          ? 'border-[var(--color-accent)]/55 bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]'
          : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
      )}
    >
      {/* Three-dot accent trio */}
      <span className="flex gap-1">
        {[accent.primary, accent.secondary, accent.surface].map((color, index) => (
          <span
            key={`${label}-${index}`}
            className="h-3.5 w-3.5 rounded-full border border-black/10"
            style={{ background: color }}
          />
        ))}
      </span>
      <span className="mt-2.5 block text-[12px] font-semibold leading-snug">{label}</span>
      <span className="mt-0.5 block text-[10px] leading-snug text-[var(--color-ink-faint)]">
        {description}
      </span>
      {active ? (
        <motion.span
          layoutId={`preset-glow-${label.replace(/\W/g, '')}`}
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ border: `1.5px solid ${accent.primary}` }}
        />
      ) : null}
    </motion.button>
  );
}
