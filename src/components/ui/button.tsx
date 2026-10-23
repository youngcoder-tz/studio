'use client';

import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-110 font-medium shadow-[inset_0_1px_0_color-mix(in_oklch,white_28%,transparent)]',
  secondary:
    'surface-2 text-[var(--color-ink)] hover:border-[color-mix(in_oklch,var(--color-ink-faint)_50%,transparent)]',
  ghost: 'text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]',
  danger:
    'bg-[var(--color-danger)]/15 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25 border border-[var(--color-danger)]/30',
  subtle:
    'bg-[var(--color-panel-2)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  icon: 'h-8 w-8 rounded-md justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'focus-ring inline-flex items-center transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </button>
  );
}
