'use client';

// studio/src/components/setup/identity-cards.tsx
//
// BRAND + OPERATIONS CARDS.
//
// These are the two card types that still contain real form controls. They
// keep the non-form feel: fields reveal in staggered groups, and only the
// essential ones exist — identity card asks "who is this?" and operations
// card asks "how does it run?", never "please fill all 12 fields at once".

import { motion, type Variants } from 'framer-motion';

import { FlowGlyph } from './icon-bridge';
import type { FlowField, FlowIcon, ModeFlow } from '@/lib/setup-flow';
import type { GlobalTokens } from '@/lib/contract';
import { Field, TextArea, TextInput } from '@/components/ui/input';
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

// ─── Identity ────────────────────────────────────────────────────────────────

export function IdentityCard({
  flow,
  tokens,
  onChange,
  examples,
}: {
  flow: ModeFlow;
  tokens: GlobalTokens;
  onChange: (key: string, value: string | number) => void;
  /** A real example for the origin the client just picked. */
  examples?: { name: string; tagline: string };
}) {
  const nameHint = examples?.name ?? 'Riverside Academy';
  const taglineHint =
    examples?.tagline ?? 'Learning with purpose, leading with care.';

  return (
    <div className="space-y-5">
      <motion.div variants={list} initial="hidden" animate="show" className="space-y-4">
        <motion.div variants={item}>
          <Field htmlFor="setup-siteName" label="Name" hint="Shown in navigation, page titles and footer.">
            <TextInput
              id="setup-siteName"
              value={String(tokens.siteName ?? '')}
              maxLength={120}
              placeholder={nameHint}
              onChange={(event) => onChange('siteName', event.target.value)}
              className="h-10 text-base font-medium"
              autoFocus
            />
          </Field>
        </motion.div>

        <motion.div variants={item}>
          <Field htmlFor="setup-tagline" label="Tagline" hint="One line, 240 characters max.">
            <TextArea
              id="setup-tagline"
              value={String(tokens.tagline ?? '')}
              maxLength={240}
              placeholder={taglineHint}
              onChange={(event) => onChange('tagline', event.target.value)}
              className="min-h-[68px]"
            />
          </Field>
        </motion.div>

        <motion.div variants={item}>
          <Field
            htmlFor="setup-logoUrl"
            label="Logo URL"
            hint="https:// or a root-relative path. Optional."
          >
            <div className="flex items-start gap-3">
              <LogoPeek tokens={tokens} flowIconName={flow.icon} />
              <TextInput
                id="setup-logoUrl"
                type="url"
                value={String(tokens.logoUrl ?? '')}
                placeholder="https://cdn.example.com/logo.svg"
                onChange={(event) => onChange('logoUrl', event.target.value)}
              />
            </div>
          </Field>
        </motion.div>
      </motion.div>
    </div>
  );
}

function LogoPeek({ tokens, flowIconName }: { tokens: GlobalTokens; flowIconName: FlowIcon }) {
  const url = String(tokens.logoUrl ?? '').trim();
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm"
      style={{
        background: 'linear-gradient(135deg, var(--color-accent), color-mix(in oklab, var(--color-accent) 55%, #06b6d4))',
      }}
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
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <FlowGlyph name={flowIconName} size={18} />
      )}
    </div>
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
