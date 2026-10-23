'use client';

// studio/src/components/panels/token-panel.tsx
//
// THE DESIGN-TOKEN PANEL.
//
// This is the panel with the most security weight in the whole Studio, and the
// reason is worth stating plainly: the SDK's `NexusProvider` takes every token
// the backend sends and writes it to `document.documentElement.style` as a CSS
// custom property, on every visitor's page.
//
// So a token is not a preference — it is arbitrary CSS injected into the public
// site. The backend enforces the real boundary (key must survive the SDK's
// camelCase→kebab conversion into a legal custom-property name; value must be a
// safe CSS value). The Studio's job is to make that boundary *visible* before a
// save is attempted: the panel validates locally with the same rules and shows
// exactly which token is rejected and why, rather than letting an author type
// `red; } body { display:none` and only discover the problem on save.
//
// Token keys outside the recognised set are allowed and shown in their own
// group. That freedom is real (the SDK types `GlobalStyleTokens` as an open map)
// and closing it here would break clients who legitimately ship custom vars.

import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  BORDER_RADIUS_PRESETS,
  CANONICAL_TOKEN_KINDS,
  TOKEN_GROUPS,
  type GlobalTokens,
  type TokenKind,
  type TokenValue,
} from '@/lib/contract';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { ColorInput, Select } from '@/components/ui/controls';
import { Field, TextInput } from '@/components/ui/input';
import { validateTokenValue } from '@/lib/validate';

export function TokenPanel({
  tokens,
  baseTokens,
  disabled,
  onChange,
  onRemove,
  onBulkUpdate,
}: {
  tokens: GlobalTokens;
  baseTokens: GlobalTokens;
  disabled?: boolean;
  onChange: (key: string, value: TokenValue) => void;
  onRemove: (key: string) => void;
  onBulkUpdate: (tokens: GlobalTokens) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const customKeys = useMemo(
    () => Object.keys(tokens).filter((key) => !(key in CANONICAL_TOKEN_KINDS)),
    [tokens],
  );

  const normaliseKey = (raw: string) => raw.trim().replace(/\s+/g, '');

  const addCustom = () => {
    const key = normaliseKey(newKey);
    if (!key) return;
    onChange(key, newValue || '');
    setNewKey('');
    setNewValue('');
    setAdding(false);
  };

  const resetAll = () => {
    // Restoring means writing the base set back *and* removing anything the
    // author invented, otherwise "reset" would leave custom vars behind.
    const next: GlobalTokens = { ...baseTokens };
    const removals = Object.keys(tokens).filter((key) => !(key in baseTokens));
    for (const key of removals) onRemove(key);
    onBulkUpdate(next);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-line)] px-3 py-2.5">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-[var(--color-ink-dim)] uppercase">
            Design tokens
          </h3>
          <p className="text-[10px] text-[var(--color-ink-faint)]">
            Written to the visitor&apos;s document root as CSS variables.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            disabled={disabled}
            title="Restore every token to the template default"
          >
            <RotateCcw size={12} />
            Reset
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAdding((v) => !v)}
            disabled={disabled}
          >
            <Plus size={12} />
            Custom
          </Button>
        </div>
      </header>

      <div className="scroll-y min-h-0 flex-1 space-y-6 p-3">
        {adding ? (
          <div className="surface-2 space-y-2 rounded-lg p-3">
            <Field
              label="Variable name"
              hint="Letters and digits, starting with a letter. Becomes `--portal-<kebab-case>`."
            >
              <TextInput
                value={newKey}
                autoFocus
                onChange={(event) => setNewKey(event.target.value)}
                placeholder="brandGlow"
                className="font-mono text-xs"
              />
            </Field>
            <Field label="Value" hint="Any safe CSS value: colour, length, keyword.">
              <TextInput
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                placeholder="oklch(0.8 0.2 200)"
                className="font-mono text-xs"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={addCustom}
                disabled={!normaliseKey(newKey)}
              >
                Add variable
              </Button>
            </div>
          </div>
        ) : null}

        {TOKEN_GROUPS.map((group) => (
          <section key={group.label} className="space-y-3">
            <h4 className="text-[10px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
              {group.label}
            </h4>
            {group.keys.map((key) => (
              <TokenRow
                key={key}
                tokenKey={key}
                kind={CANONICAL_TOKEN_KINDS[key] ?? 'unknown'}
                value={tokens[key]}
                inherited={baseTokens[key]}
                disabled={disabled}
                onChange={(value) => onChange(key, value)}
                onRemove={() => onRemove(key)}
              />
            ))}
          </section>
        ))}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
              Custom variables
            </h4>
            <Badge>{customKeys.length}</Badge>
          </div>
          {customKeys.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
              None yet. Custom variables are passed through to the page untouched —
              useful for tokens your own components reference.
            </p>
          ) : (
            customKeys.map((key) => (
              <TokenRow
                key={key}
                tokenKey={key}
                kind="unknown"
                value={tokens[key]}
                inherited={baseTokens[key]}
                disabled={disabled}
                onChange={(value) => onChange(key, value)}
                onRemove={() => onRemove(key)}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function TokenRow({
  tokenKey,
  kind,
  value,
  inherited,
  disabled,
  onChange,
  onRemove,
}: {
  tokenKey: string;
  kind: TokenKind;
  value: TokenValue | undefined;
  inherited: TokenValue | undefined;
  disabled?: boolean;
  onChange: (value: TokenValue) => void;
  onRemove: () => void;
}) {
  const current = value === undefined ? '' : value;
  const isSet = value !== undefined && value !== '';
  const isInherited = !isSet && inherited !== undefined;
  const problem = isSet ? validateTokenValue(tokenKey, value) : null;
  const canRemove = value !== undefined && inherited === undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={`token-${tokenKey}`}
          className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-[var(--color-ink-dim)]"
        >
          <span className="truncate">{tokenKey}</span>
          {isInherited ? (
            <Badge tone="neutral">template default</Badge>
          ) : null}
          {problem ? (
            <Badge tone="danger">
              <AlertTriangle size={9} />
              invalid
            </Badge>
          ) : null}
        </label>
        {canRemove ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="focus-ring shrink-0 rounded p-0.5 text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"
            aria-label={`Remove ${tokenKey}`}
            title="Remove — falls back to the template default"
          >
            <Trash2 size={11} />
          </button>
        ) : null}
      </div>

      {kind === 'color' ? (
        <ColorInput value={String(current)} onChange={onChange} allowEmpty />
      ) : kind === 'radius' ? (
        <div className="flex flex-wrap items-center gap-1">
          {BORDER_RADIUS_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset)}
              className={cn(
                'focus-ring h-7 rounded-md border px-2 text-xs capitalize',
                current === preset
                  ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-line)] text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]',
              )}
            >
              {preset}
            </button>
          ))}
          <TextInput
            id={`token-${tokenKey}`}
            disabled={disabled}
            value={String(current)}
            onChange={(event) => onChange(event.target.value)}
            placeholder="or a raw value"
            className="w-28 font-mono text-xs"
          />
        </div>
      ) : kind === 'theme' ? (
        <Select
          value={String(current)}
          allowEmpty
          placeholder="Template default"
          onChange={onChange}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      ) : kind === 'direction' ? (
        <Select
          value={String(current)}
          allowEmpty
          placeholder="Template default"
          onChange={onChange}
          options={[
            { value: 'ltr', label: 'Left to right' },
            { value: 'rtl', label: 'Right to left' },
          ]}
        />
      ) : (
        <TextInput
          id={`token-${tokenKey}`}
          disabled={disabled}
          value={String(current)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            isInherited && inherited !== undefined
              ? String(inherited)
              : kind === 'font'
                ? "'Inter', sans-serif"
                : kind === 'length'
                  ? '72rem'
                  : ''
          }
          className={cn('font-mono text-xs', kind === 'unknown' && 'text-[var(--color-accent)]')}
        />
      )}

      {problem ? (
        <p className="text-[10px] leading-snug text-[var(--color-danger)]">{problem}</p>
      ) : null}
    </div>
  );
}
