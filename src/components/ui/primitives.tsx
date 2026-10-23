'use client';

import { cn } from '@/lib/utils';

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'ok';
  className?: string;
}) {
  const resolvedTone = tone === 'ok' ? 'success' : tone === 'danger' ? 'warn' : tone;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.24em]',
        resolvedTone === 'accent' &&
          'border-[var(--color-accent)]/40 bg-[color-mix(in_oklab,var(--color-accent)_14%,transparent)] text-[var(--color-ink-dim)]',
        resolvedTone === 'success' &&
          'border-[var(--color-success)]/40 bg-[color-mix(in_oklab,var(--color-success)_12%,transparent)] text-[var(--color-ink-dim)]',
        resolvedTone === 'warn' &&
          'border-[var(--color-warn)]/40 bg-[color-mix(in_oklab,var(--color-warn)_12%,transparent)] text-[var(--color-ink-dim)]',
        resolvedTone === 'neutral' &&
          'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-faint)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      {icon ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-faint)]">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium">{title}</p>
      {message ? (
        <p className="max-w-xs text-xs leading-relaxed text-[var(--color-ink-faint)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[var(--color-ink-faint)]">
      {children}
    </kbd>
  );
}
