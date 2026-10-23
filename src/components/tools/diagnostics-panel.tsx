'use client';

import { AlertTriangle, Info } from 'lucide-react';
import type { Diagnostic } from '@/lib/contract';
import { EmptyState } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export function DiagnosticsPanel({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (diagnostics.length === 0) {
    return (
      <EmptyState
        icon={<Info size={18} />}
        title="No compiler notes"
        message="The last save compiled cleanly. Problems from the backend land here instead of disappearing into a toast."
      />
    );
  }

  return (
    <ul className="scroll-y h-full min-h-0 space-y-2 p-3">
      {diagnostics.map((diagnostic, index) => (
        <li
          key={`${diagnostic.path}-${index}`}
          className={cn(
            'glass rounded-2xl p-3',
            diagnostic.severity === 'error' && 'border-[var(--color-danger)]/30',
            diagnostic.severity === 'warning' && 'border-[var(--color-warn)]/30',
          )}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-medium">
            <AlertTriangle
              size={12}
              className={
                diagnostic.severity === 'error'
                  ? 'text-[var(--color-danger)]'
                  : 'text-[var(--color-warn)]'
              }
            />
            {diagnostic.severity}
            {diagnostic.code ? (
              <code className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                {diagnostic.code}
              </code>
            ) : null}
          </p>
          <p className="mt-1 font-mono text-[10px] text-[var(--color-ink-faint)]">
            {diagnostic.path}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-dim)]">
            {diagnostic.message}
          </p>
        </li>
      ))}
    </ul>
  );
}
