'use client';

import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from './theme-provider';
import { cn } from '@/lib/utils';

const options = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Laptop, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="relative flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-soft)]">
      {options.map((option) => {
        const active = theme === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              'focus-ring relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200',
              active
                ? 'text-[var(--color-accent-foreground)]'
                : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]',
            )}
            aria-label={option.label}
            title={option.label}
          >
            {active ? (
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[color-mix(in_oklab,var(--color-accent)_70%,#312e81)] shadow-[0_10px_40px_-18px_var(--color-accent-glow)]" />
            ) : null}
            <Icon size={14} className="relative" />
          </button>
        );
      })}
    </div>
  );
}
