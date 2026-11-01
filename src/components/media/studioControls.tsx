// gn-apex/src/components/media/studioControls.tsx
// Shared inspector primitives for the video / audio / lottie / document studios.
// They mirror the visual language of Cropstudio so every media kind feels like
// one product: same grouping, same labels, same control rhythm.

"use client";

import React from "react";
import { Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────

export function fmtBytes(b: number): string {
  if (!Number.isFinite(b) || b < 0) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB`;
  if (b < 1073741824)
    return `${(b / 1048576).toFixed(b < 10485760 ? 2 : 1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

/** m:ss.d — matches the prototype's 0:08.0 readout. */
export function fmtTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
}

export function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}

// ─────────────────────────────────────────────
// TAB STRIP  (identical to the image studio's inspector tabs)
// ─────────────────────────────────────────────

export interface StudioTabDef {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export function StudioTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: StudioTabDef[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex border-b border-white/8 px-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`relative flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors ${
            active === t.id
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.icon}
          {t.label}
          {active === t.id && (
            <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// GROUP / FIELD
// ─────────────────────────────────────────────

export function Group({
  title,
  sub,
  gated,
  children,
}: {
  title: string;
  sub?: string;
  /** When provided the group renders a switch and dims its body when off. */
  gated?: { on: boolean; onToggle: (v: boolean) => void };
  children: React.ReactNode;
}) {
  const off = gated ? !gated.on : false;
  return (
    <section className={`space-y-3 ${off ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold">{title}</h4>
        {gated ? (
          <Switch
            checked={gated.on}
            onCheckedChange={gated.onToggle}
            aria-label={title}
          />
        ) : sub ? (
          <span className="text-[11px] text-muted-foreground">{sub}</span>
        ) : null}
      </div>
      <div className={`space-y-3 ${off ? "pointer-events-none" : ""}`}>
        {children}
      </div>
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// RANGE SLIDER
// ─────────────────────────────────────────────

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const display =
    unit === "x"
      ? `${value.toFixed(2)}×`
      : unit === "dB"
        ? `${value > 0 ? "+" : ""}${value} dB`
        : unit === "s"
          ? `${value.toFixed(1)} s`
          : `${value}${unit}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
        <span className="font-mono tabular-nums text-xs">{display}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        aria-label={label}
        className="h-1 bg-muted-foreground/40"
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// SEGMENTED CONTROL
// ─────────────────────────────────────────────

export function Seg<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
      )}
      <div className="flex gap-0.5 rounded-xl border border-muted-foreground/15 bg-input/50 p-0.5">
        {options.map((o) => {
          const selected = String(o.value) === String(value);
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(o.value)}
              className={`flex-1 whitespace-nowrap rounded-[0.55rem] px-2 py-1.5 text-xs font-medium transition-colors ${
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SELECT
// ─────────────────────────────────────────────

export function Sel({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 rounded-lg border border-muted-foreground/15 bg-input/50 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─────────────────────────────────────────────
// TOGGLE ROW
// ─────────────────────────────────────────────

export function Toggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

// ─────────────────────────────────────────────
// NOTE / KV / NUMBER INPUT
// ─────────────────────────────────────────────

export function Note({
  children,
  warn,
}: {
  children: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div
      className={`flex gap-2 rounded-xl border p-2.5 text-[11px] leading-relaxed ${
        warn
          ? "border-amber-400/20 bg-amber-400/10 text-foreground"
          : "border-white/8 bg-white/3 text-muted-foreground"
      }`}
    >
      <Info
        size={14}
        className={`mt-px shrink-0 ${warn ? "text-amber-400" : "text-muted-foreground"}`}
      />
      <span>{children}</span>
    </div>
  );
}

export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="truncate text-right font-mono tabular-nums">{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function NumIn({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full rounded-lg border border-muted-foreground/15 bg-input/50 px-2.5 font-mono text-xs tabular-nums focus:border-primary/40 focus:outline-none"
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// STAGE SHELL — the dark dotted canvas every media kind sits on
// ─────────────────────────────────────────────

export function Stage({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-neutral-950 p-5 lg:p-8 ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    >
      {children}
    </div>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-muted-foreground/15 bg-input/50 px-2.5 py-1 text-[11px] text-foreground backdrop-blur-sm">
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────
// EXTRA PRIMITIVES (shared by all studios)
// ─────────────────────────────────────────────

export function Btn({
  children,
  onClick,
  icon,
  active,
  className = "",
  title,
  disabled,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  active?: boolean;
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        active
          ? " bg-primary/30 text-primary"
          : "border-muted-foreground/15 bg-background hover:bg-input/60"
      } ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Round icon button used in the transport bars under every stage. */
export function IconBtn({
  children,
  onClick,
  label,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-40 ${
        active
          ? "bg-primary/20 text-primary"
          : "text-white/75 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export const SWATCHES = [
  "#ffffff",
  "#0b0f11",
  "#5fcdd9",
  "#7b5cd6",
  "#e5527a",
  "#f2a93b",
  "#9be7c4",
  "#ffd479",
];

export function Swatches({
  label,
  value,
  onChange,
  colors = SWATCHES,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
        <span className="font-mono text-[11px] uppercase text-muted-foreground">
          {value}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={value.toLowerCase() === c}
            onClick={() => onChange(c)}
            className={`size-6 rounded-full border transition-transform hover:scale-110 ${
              value.toLowerCase() === c
                ? "border-primary ring-2 ring-primary/40"
                : "border-white/20"
            }`}
            style={{ background: c }}
          />
        ))}
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} custom`}
          className="size-6 cursor-pointer rounded-full border border-white/20 bg-transparent p-0"
        />
      </div>
    </div>
  );
}

export type Pos9 = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";

export function PosPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Pos9;
  onChange: (v: Pos9) => void;
}) {
  const all: Pos9[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <div className="grid w-24 grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
        {all.map((p) => (
          <button
            key={p}
            type="button"
            aria-label={p}
            aria-pressed={value === p}
            onClick={() => onChange(p)}
            className={`h-5 rounded ${value === p ? "bg-primary" : "bg-white/10 hover:bg-white/20"}`}
          />
        ))}
      </div>
    </div>
  );
}

/** CSS placement for a 9-grid anchor, inset by `m` percent. */
export function posStyle(p: Pos9, m = 4): React.CSSProperties {
  const s: React.CSSProperties = { position: "absolute" };
  if (p[0] === "t") s.top = `${m}%`;
  else if (p[0] === "b") s.bottom = `${m}%`;
  else {
    s.top = "50%";
  }
  if (p[1] === "l") s.left = `${m}%`;
  else if (p[1] === "r") s.right = `${m}%`;
  else {
    s.left = "50%";
  }
  const tx = p[1] === "c" || p[1] === undefined ? "-50%" : "0";
  const ty = p[0] === "m" ? "-50%" : "0";
  if (tx !== "0" || ty !== "0") s.transform = `translate(${tx},${ty})`;
  return s;
}

export function TextIn({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const cls =
    "w-full rounded-lg border border-muted-foreground/15 bg-input/50 px-2.5 text-xs focus:border-primary/40 focus:outline-none";
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {multiline ? (
        <textarea
          value={value}
          rows={3}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${cls} resize-none py-2`}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${cls} h-9`}
        />
      )}
    </div>
  );
}

/** Small preset tile (used for looks, EQ presets, backgrounds…). */
export function Tile({
  children,
  active,
  onClick,
  label,
}: {
  children?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg  p-1.5 text-[11px] transition-colors ${
        active
          ? " bg-primary/30 text-primary"
          : "text-muted-foreground bg-background hover:bg-primary/10 hover:text-primary"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-muted-foreground/15 bg-input/50 px-1.5 py-px font-mono text-[10px] text-muted-foreground/70">
      {children}
    </kbd>
  );
}

/** Ignore global shortcuts while the user is typing in a field. */
export function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/** Shallow-merge helper for nested edit sections. */
export function mergeSection<T extends object, K extends keyof T>(
  prev: T,
  key: K,
  patch: Partial<T[K]>,
): T {
  return {
    ...prev,
    [key]: { ...(prev[key] as object), ...(patch as object) },
  } as T;
}

/** Debounced undo / redo over a whole plain-JSON edit object. */
export function useEditHistory<T>(state: T, setState: (s: T) => void) {
  const stack = React.useRef<string[]>([JSON.stringify(state)]);
  const idx = React.useRef(0);
  const skip = React.useRef(false);

  // Track history metadata in state so canUndo / canRedo don't read refs during render
  const [meta, setMeta] = React.useState({ i: 0, length: 1 });

  React.useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const s = JSON.stringify(state);
      if (stack.current[idx.current] === s) return;
      stack.current = stack.current.slice(0, idx.current + 1);
      stack.current.push(s);
      if (stack.current.length > 60) stack.current.shift();
      idx.current = stack.current.length - 1;
      setMeta({ i: idx.current, length: stack.current.length });
    }, 350);
    return () => window.clearTimeout(t);
  }, [state]);

  const go = React.useCallback(
    (d: number) => {
      const n = idx.current + d;
      if (n < 0 || n >= stack.current.length) return;
      idx.current = n;
      skip.current = true;
      setState(JSON.parse(stack.current[n]) as T);
      setMeta({ i: n, length: stack.current.length });
    },
    [setState],
  );

  const undo = React.useCallback(() => go(-1), [go]);
  const redo = React.useCallback(() => go(1), [go]);

  return {
    undo,
    redo,
    canUndo: meta.i > 0,
    canRedo: meta.i < meta.length - 1,
  };
}
