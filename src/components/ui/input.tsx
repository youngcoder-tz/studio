'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const base =
  'focus-ring w-full rounded-lg border border-[var(--color-line)] bg-[color-mix(in_oklch,var(--color-canvas)_70%,transparent)] px-2.5 py-1.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] disabled:opacity-50';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input ref={ref} {...props} className={cn(base, 'h-8', className)} />;
  },
);

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(base, 'min-h-20 resize-y', className)} />;
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  error,
}: {
  label: string;
  hint?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-center justify-between text-[11px] font-medium tracking-wide text-[var(--color-ink-dim)] uppercase"
      >
        <span>{label}</span>
      </label>
      {children}
      {hint && !error ? (
        <p className="text-[11px] leading-snug text-[var(--color-ink-faint)]">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-[11px] leading-snug text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  );
}

/* ── shadcn-style Input / Textarea (soft studio look, follows shadcn variables) ── */
const softField =
  'w-full rounded-[10px] border border-border bg-secondary px-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...props }, ref) {
    return <input ref={ref} type={type} data-slot="input" {...props} className={cn(softField, 'h-8', className)} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} data-slot="textarea" {...props} className={cn(softField, 'min-h-16 resize-none py-1.5 leading-relaxed', className)} />;
  },
);
