'use client';

import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from './theme-provider';
import { cn } from '@/lib/utils';

const options = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Laptop, label: 'System' },
  { value: 'dark', icon: Moon, label: 'Dark' },
] as const;

/** Soft segmented theme switch: light, system, dark. Uses shadcn variables only. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex items-center gap-0.5 rounded-[10px] border border-border bg-secondary p-0.5">
      {options.map((option) => {
        const active = theme === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            aria-label={option.label}
            title={option.label}
            className={cn(
              'flex size-6 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-3 focus-visible:ring-primary/30',
              active ? 'bg-primary/10 text-primary dark:text-brand-text' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
