'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface RailItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

export function ToolRail({
  items,
  active,
  onSelect,
}: {
  items: RailItem[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Studio tools"
      className="glass-rail flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[var(--color-line)] py-2"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          aria-label={item.label}
          aria-current={active === item.id}
          onClick={() => onSelect(item.id)}
          className={cn(
            'relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
            active === item.id
              ? 'bg-[var(--color-accent)]/18 text-[var(--color-accent)] shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--color-accent)_35%,transparent)]'
              : 'text-[var(--color-ink-faint)] hover:bg-[var(--color-panel-2)] hover:text-[var(--color-ink)]',
          )}
        >
          {item.icon}
          {item.badge ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[8px] font-semibold text-[var(--color-accent-ink)]">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}
