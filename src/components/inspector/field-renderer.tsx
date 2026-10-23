'use client';

// studio/src/components/inspector/field-renderer.tsx
//
// THE SCHEMA-DRIVEN INSPECTOR PRIMITIVE.
//
// One control per `ManifestFieldType`, and no bespoke UI per component. This is
// what makes adding a component to the registry a backend-only change: the
// manifest already describes every field, so the Studio renders it without a
// line of new frontend code.
//
// Two properties are maintained deliberately:
//
//   • **LIST is recursive.** A repeater's `itemFields` are themselves
//     `ManifestField`s, so a list of lists works with no special-casing. Depth
//     is bounded only by the manifest.
//   • **Nothing is invented.** A field type the Studio does not recognise falls
//     back to a JSON editor rather than silently dropping the value, so a
//     forward-compatible manifest never loses data.

import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ManifestField } from '@/lib/contract';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ColorInput } from '@/components/ui/controls';
import { Field, TextArea, TextInput } from '@/components/ui/input';

export interface FieldRendererProps {
  field: ManifestField;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Rendered depth, used to bound LIST nesting visually and defensively. */
  depth?: number;
}

const MAX_LIST_DEPTH = 4;

export function FieldRenderer({ field, value, onChange, depth = 0 }: FieldRendererProps) {
  switch (field.type) {
    case 'TEXT':
      return (
        <Field label={field.label} hint={field.helpText}>
          <TextInput
            value={asString(value)}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder={placeholderFor(field)}
          />
        </Field>
      );

    case 'TEXT_LONG':
    case 'RICH_TEXT':
      return (
        <Field label={field.label} hint={field.helpText}>
          <TextArea
            value={asString(value)}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder={placeholderFor(field)}
            rows={field.type === 'RICH_TEXT' ? 5 : 3}
          />
        </Field>
      );

    case 'NUMBER': {
      const numeric = typeof value === 'number' ? value : '';
      return (
        <Field label={field.label} hint={field.helpText}>
          <TextInput
            type="number"
            value={numeric}
            onChange={(e) => {
              const raw = e.target.value;
              onChange(raw === '' ? undefined : Number(raw));
            }}
          />
        </Field>
      );
    }

    case 'BOOLEAN':
      return (
        <Field label={field.label} hint={field.helpText}>
          <button
            type="button"
            onClick={() => onChange(value ? undefined : true)}
            className={cn(
              'focus-ring flex h-8 w-full items-center justify-between rounded-md border px-2.5 text-sm transition-colors',
              value
                ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'border-[var(--color-line)] bg-[var(--color-canvas)] text-[var(--color-ink-faint)]',
            )}
          >
            <span>{value ? 'On' : 'Off'}</span>
            <span
              className={cn(
                'h-4 w-7 rounded-full transition-colors',
                value ? 'bg-[var(--color-accent)]/40' : 'bg-[var(--color-line)]',
              )}
            >
              <span
                className={cn(
                  'block h-4 w-4 rounded-full bg-[var(--color-ink)] transition-transform',
                  Boolean(value) && 'translate-x-3',
                )}
                style={{ transform: value ? 'translateX(12px)' : undefined }}
              />
            </span>
          </button>
        </Field>
      );

    case 'COLOR':
      return (
        <Field label={field.label} hint={field.helpText}>
          <ColorInput
            value={asString(value)}
            onChange={(next) => onChange(next || undefined)}
            allowEmpty
          />
        </Field>
      );

    case 'SELECT':
      return (
        <Field label={field.label} hint={field.helpText}>
          <select
            value={asString(value)}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="focus-ring h-8 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-2 text-sm"
          >
            <option value="">—</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      );

    case 'MULTI_SELECT': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <Field label={field.label} hint={field.helpText}>
          <div className="space-y-1.5 rounded-md border border-[var(--color-line)] p-2">
            {field.options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? selected.filter((v) => v !== option.value)
                        : [...selected, option.value];
                      onChange(next.length ? next : undefined);
                    }}
                    className="accent-[var(--color-accent)]"
                  />
                  <span>{option.label}</span>
                  {option.hint ? (
                    <span className="text-[var(--color-ink-faint)]">{option.hint}</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </Field>
      );
    }

    case 'IMAGE':
    case 'URL': {
      const media = asMediaUrl(value);
      return (
        <Field label={field.label} hint={field.helpText}>
          <div className="space-y-1.5">
            <TextInput
              value={media}
              onChange={(e) => onChange(e.target.value || undefined)}
              placeholder={field.type === 'URL' ? 'https://…' : '/uploads/…'}
              className="font-mono text-xs"
            />
            {field.type === 'IMAGE' && media ? (
              // A raw <img> is correct here: the URL is author-supplied and may
              // be any host, which next/image would require allow-listing for a
              // purely internal authoring affordance.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media}
                alt=""
                className="max-h-24 w-full rounded-md border border-[var(--color-line)] object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : null}
          </div>
        </Field>
      );
    }

    case 'DATE':
      return (
        <Field label={field.label} hint={field.helpText}>
          <TextInput
            type="date"
            value={asString(value).slice(0, 10)}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        </Field>
      );

    case 'KEY_VALUE':
      return (
        <KeyValueEditor
          label={field.label}
          hint={field.helpText}
          value={asRecord(value)}
          onChange={onChange}
        />
      );

    case 'LIST':
      return depth >= MAX_LIST_DEPTH ? (
        <Field label={field.label} hint="Maximum nesting depth reached.">
          <TextArea value={safeJson(value)} onChange={() => undefined} readOnly />
        </Field>
      ) : (
        <ListEditor
          field={field}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          depth={depth}
        />
      );

    case 'REFERENCE':
      return (
        <Field label={field.label} hint={field.helpText ?? 'Reference id.'}>
          <TextInput
            value={asString(value)}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="font-mono text-xs"
          />
        </Field>
      );

    case 'CODE':
      return (
        <Field label={field.label} hint={field.helpText}>
          <TextArea
            value={asString(value)}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="font-mono text-xs"
            spellCheck={false}
          />
        </Field>
      );

    default:
      // Forward compatibility: an unrecognised field type is still editable and
      // its value is never dropped.
      return (
        <Field
          label={field.label}
          hint={field.helpText ?? `Unrecognised field type "${field.type}".`}
        >
          <TextArea
            value={safeJson(value)}
            onChange={(e) => {
              try {
                onChange(e.target.value ? JSON.parse(e.target.value) : undefined);
              } catch {
                /* keep the raw text until it parses */
              }
            }}
            className="font-mono text-xs"
          />
        </Field>
      );
  }
}

// ─── List editor ─────────────────────────────────────────────────────────────

function ListEditor({
  field,
  value,
  onChange,
  depth,
}: {
  field: ManifestField;
  value: unknown[];
  onChange: (value: unknown) => void;
  depth: number;
}) {
  const [openItems, setOpenItems] = useState<number[]>([]);
  const itemFields = field.itemFields.length
    ? field.itemFields
    : [{ key: 'value', label: 'Value', type: 'TEXT' as const, helpText: null, options: [], accept: null, minItems: null, maxItems: null, itemFields: [] }];

  const atMax = field.maxItems !== null && value.length >= field.maxItems;
  const belowMin = field.minItems !== null && value.length < field.minItems;

  const updateItem = (index: number, key: string, next: unknown) => {
    const copy = [...value];
    const item = { ...(copy[index] as Record<string, unknown>) };
    if (next === undefined) delete item[key];
    else item[key] = next;
    copy[index] = item;
    onChange(copy);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const copy = [...value];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    onChange(copy);
  };

  return (
    <Field
      label={field.label}
      hint={
        field.helpText ??
        ([
          field.minItems !== null ? `min ${field.minItems}` : null,
          field.maxItems !== null ? `max ${field.maxItems}` : null,
        ]
          .filter(Boolean)
          .join(' · ') ||
          null)
      }
      error={belowMin ? `At least ${field.minItems} item(s) required.` : null}
    >
      <div className="space-y-1.5">
        {value.map((item, index) => {
          const isOpen = openItems.includes(index);
          const record = (item ?? {}) as Record<string, unknown>;
          const summary =
            itemFields
              .map((f) => record[f.key])
              .find((v) => typeof v === 'string' && v) ?? `Item ${index + 1}`;

          return (
            <div
              key={index}
              className="overflow-hidden rounded-md border border-[var(--color-line)]"
            >
              <div className="flex items-center gap-1 bg-[var(--color-panel-2)] px-1.5 py-1">
                <GripVertical size={12} className="text-[var(--color-ink-faint)]" />
                <button
                  type="button"
                  onClick={() =>
                    setOpenItems((prev) =>
                      prev.includes(index)
                        ? prev.filter((i) => i !== index)
                        : [...prev, index],
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <ChevronDown
                    size={13}
                    className={cn(
                      'shrink-0 text-[var(--color-ink-faint)] transition-transform',
                      !isOpen && '-rotate-90',
                    )}
                  />
                  <span className="truncate text-xs">{String(summary)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  className="focus-ring rounded p-0.5 text-[var(--color-ink-faint)] disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === value.length - 1}
                  className="focus-ring rounded p-0.5 text-[var(--color-ink-faint)] disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="focus-ring rounded p-0.5 text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"
                  aria-label="Remove item"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {isOpen ? (
                <div className="space-y-3 border-t border-[var(--color-line)] p-3">
                  {itemFields.map((itemField) => (
                    <FieldRenderer
                      key={itemField.key}
                      field={itemField}
                      value={record[itemField.key]}
                      onChange={(next) => updateItem(index, itemField.key, next)}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          disabled={atMax}
          onClick={() => {
            onChange([...value, {}]);
            setOpenItems((prev) => [...prev, value.length]);
          }}
          className="w-full justify-center border border-dashed border-[var(--color-line)]"
        >
          <Plus size={13} />
          Add item
        </Button>
      </div>
    </Field>
  );
}

// ─── Key/value editor ────────────────────────────────────────────────────────

function KeyValueEditor({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string | null;
  value: Record<string, unknown>;
  onChange: (value: unknown) => void;
}) {
  const entries = Object.entries(value);

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-1.5">
        {entries.map(([key, entryValue]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-24 shrink-0 truncate font-mono text-[11px] text-[var(--color-ink-dim)]">
              {key}
            </span>
            <TextInput
              value={typeof entryValue === 'string' ? entryValue : safeJson(entryValue)}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </Field>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function asString(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** IMAGE fields accept either a bare URL string or a `{ url, alt }` object. */
function asMediaUrl(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const url = (value as { url?: unknown }).url;
    if (typeof url === 'string') return url;
  }
  return '';
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? '', null, 2);
  } catch {
    return '';
  }
}

function placeholderFor(field: ManifestField): string | undefined {
  const example = (field as { example?: string }).example;
  return typeof example === 'string' ? example : undefined;
}
