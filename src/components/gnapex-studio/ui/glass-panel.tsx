// studio/src/components/gnapex-studio/ui/glass-panel.tsx
//
// Soft frosted surface used across the studio. Follows shadcn variables, so it
// reads correctly in light and dark with no per-theme overrides.

import { cn } from '@/lib/utils';

export function GlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_50px_-24px_rgb(0_0_0/0.25)] backdrop-blur-xl', className)}>
      {children}
    </div>
  );
}
