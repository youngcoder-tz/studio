'use client';

import { cn, hexToRgb, isLightColor } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TextInput } from './input';

// ─── Color ───────────────────────────────────────────────────────────────────

export function ColorInput({
  value,
  onChange,
  allowEmpty,
}: {
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}) {
  // The native colour input only speaks 6-digit hex. Values like `var(--x)`,
  // `oklch(...)` or `transparent` are still valid tokens (the backend accepts
  // them), so the text field is the source of truth and the swatch is a
  // convenience that only appears when the value *is* a hex colour.
  const rgb = hexToRgb(value);
  const isHex = rgb !== null;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-[var(--color-line)]',
          !isHex && 'preview-backdrop',
        )}
        style={isHex ? { background: value } : undefined}
      >
        <input
          type="color"
          value={isHex ? normalizeHex(value) : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Pick a colour"
        />
        {!isHex ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] text-[var(--color-ink-faint)]">
            fx
          </span>
        ) : null}
      </div>
      <TextInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#06b6d4 or var(--brand)"
        className="font-mono text-xs"
      />
      {allowEmpty && value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="focus-ring rounded p-1 text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"
          aria-label="Clear"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

function normalizeHex(value: string): string {
  const hex = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex}`;
  if (/^[0-9a-fA-F]{8}$/.test(hex)) return `#${hex.slice(0, 6)}`;
  return '#000000';
}

export function ColorSwatch({ value }: { value: unknown }) {
  if (typeof value !== 'string') return null;
  const rgb = hexToRgb(value);
  return (
    <span
      className={cn(
        'inline-block h-3.5 w-3.5 rounded-sm border border-black/30',
        isLightColor(value) && 'ring-1 ring-white/20',
      )}
      style={rgb ? { background: value } : { background: 'transparent' }}
    />
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  allowEmpty,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-2.5 text-left text-sm"
      >
        <span className={cn('truncate', !selected && 'text-[var(--color-ink-faint)]')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={14} className="shrink-0 text-[var(--color-ink-faint)]" />
      </button>

      {open ? (
        <div className="surface absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md shadow-xl">
          {allowEmpty ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-[var(--color-ink-faint)] hover:bg-[var(--color-panel-2)]"
            >
              {placeholder}
            </button>
          ) : null}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-panel-2)]"
            >
              <span className="min-w-0">
                <span className="block truncate">{option.label}</span>
                {option.hint ? (
                  <span className="block truncate text-[11px] text-[var(--color-ink-faint)]">
                    {option.hint}
                  </span>
                ) : null}
              </span>
              {option.value === value ? (
                <Check size={14} className="shrink-0 text-[var(--color-accent)]" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Switch ──────────────────────────────────────────────────────────────────

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'focus-ring relative h-5 w-9 shrink-0 rounded-full border transition-colors',
        checked
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/30'
          : 'border-[var(--color-line)] bg-[var(--color-canvas)]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all',
          checked
            ? 'left-[18px] bg-[var(--color-accent)]'
            : 'left-0.5 bg-[var(--color-ink-faint)]',
        )}
      />
    </button>
  );
}

// ─── Segmented ───────────────────────────────────────────────────────────────

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors',
            option.value === value
              ? 'bg-[var(--color-panel-2)] text-[var(--color-ink)]'
              : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
