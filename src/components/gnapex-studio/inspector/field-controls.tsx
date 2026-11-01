// studio/src/components/gnapex-studio/inspector/field-controls.tsx
"use client";

import { useRef, useState } from "react";
import { Lock } from "lucide-react";
import type { ManifestField } from "@/lib/contract";
import { store } from "@/lib/gnapex-studio/store";

// ─── SWATCH PRESETS ───
const SWATCHES = [
  { name: "White", value: "#ffffff" },
  { name: "Night", value: "#111827" },
  { name: "Grey", value: "#6b7280" },
  { name: "Brand", value: "var(--color-primary)" },
  { name: "Accent", value: "var(--color-accent)" },
];

export function FieldControl({
  field,
  value,
  pageKey,
  instanceId,
}: {
  field: ManifestField;
  value: unknown;
  pageKey: string;
  instanceId: string;
}) {
  const [text, setText] = useState(valueToString(value));
  const [lastValue, setLastValue] = useState(value);
  const commitTimer = useRef<number | undefined>(undefined);

  if (value !== lastValue) {
    setLastValue(value);
    setText(valueToString(value));
  }

  function commitValue(key: string, val: unknown) {
    store.getState().stageProps(pageKey, instanceId, { [key]: val });
  }

  function commitString(next: string) {
    setText(next);
    window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      commitValue(field.key, next);
    }, 350);
  }

  const label = (
    <div className="mb-1.5 flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{field.label}</span>
      {field.type === "NUMBER" && (
        <span className="font-mono text-[10px] text-muted-foreground/80">
          {text || "0"}
        </span>
      )}
    </div>
  );

  switch (field.type) {
    case "TEXT":
    case "URL":
    case "IMAGE":
    case "DATE":
      return (
        <div>
          {label}
          <input
            type={field.type === "DATE" ? "date" : "text"}
            value={text}
            onChange={(e) => commitString(e.target.value)}
            placeholder={field.helpText || ""}
            className="w-full rounded-lg border border-border bg-[var(--soft)] px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-[var(--brand-text)]"
          />
        </div>
      );

    case "TEXT_LONG":
    case "RICH_TEXT":
      return (
        <div>
          {label}
          <textarea
            value={text}
            onChange={(e) => commitString(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-[var(--soft)] px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-[var(--brand-text)]"
          />
        </div>
      );

    case "BOOLEAN":
      return (
        <div className="flex items-center justify-between rounded-lg bg-[var(--soft)] px-3 py-2">
          <span className="text-xs text-foreground">{field.label}</span>
          <button
            type="button"
            onClick={() => commitValue(field.key, value !== true)}
            className={`relative h-4 w-7 rounded-full transition-colors ${value === true ? "bg-[var(--brand-text)]" : "bg-[var(--soft)] border border-border"}`}
          >
            <span
              className={`absolute top-0.5 size-3 rounded-full bg-background border border-border transition-transform ${value === true ? "translate-x-3.5" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      );

    case "NUMBER":
      return (
        <div>
          {label}
          <input
            type="range"
            min={0}
            max={100} // Defaults. Ideally derived from schema if provided
            value={Number(text) || 0}
            onChange={(e) => commitString(e.target.value)}
            className="w-full accent-[var(--brand-text)]"
          />
        </div>
      );

    case "SELECT":
      // If 4 or fewer options, render as a beautiful segmented control pill (like the prototype)
      if (field.options.length <= 4) {
        return (
          <div>
            {label}
            <div className="flex gap-0.5 rounded-lg bg-[var(--soft)] p-0.5">
              {field.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => commitValue(field.key, opt.value)}
                  className={`flex-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                    text === opt.value
                      ? "bg-[var(--active)] text-[var(--brand-text)] shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      }
      // Otherwise fallback to native select dropdown
      return (
        <div>
          {label}
          <select
            value={text}
            onChange={(e) => commitValue(field.key, e.target.value)}
            className="w-full rounded-lg border border-border bg-[var(--soft)] px-2 py-1.5 text-xs text-foreground outline-none focus:border-[var(--brand-text)]"
          >
            <option value="">— Select —</option>
            {field.options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-popover text-popover-foreground"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "COLOR":
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch.value}
                onClick={() => commitValue(field.key, swatch.value)}
                title={swatch.name}
                className={`h-6 min-w-[24px] rounded-md border border-border transition-transform hover:scale-110 ${
                  text === swatch.value
                    ? "ring-2 ring-[var(--brand-text)] ring-offset-1 ring-offset-background"
                    : ""
                }`}
                style={{
                  background: swatch.value.startsWith("var")
                    ? "var(--primary)"
                    : swatch.value,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isValidHex(text) ? text : "#ffffff"}
              onChange={(e) => commitString(e.target.value)}
              className="size-7 cursor-pointer rounded-md border border-border bg-transparent"
            />
            <input
              value={text}
              onChange={(e) => commitString(e.target.value)}
              placeholder="#ffffff"
              className="flex-1 rounded-lg border border-border bg-[var(--soft)] px-2.5 py-1 font-mono text-xs text-foreground outline-none focus:border-[var(--brand-text)]"
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="rounded-lg border border-border bg-[var(--soft)] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {field.label}
            </span>
            <Lock className="size-3 text-muted-foreground/60" />
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Advanced editing for {field.type.toLowerCase()} available in full
            build.
          </p>
        </div>
      );
  }
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

function isValidHex(text: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(text);
}
