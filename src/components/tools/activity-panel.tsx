'use client';

import { History, Layers } from 'lucide-react';
import { humanizeOperation } from '@/lib/editor/store';
import type { PendingOperation } from '@/lib/editor/types';
import { EmptyState } from '@/components/ui/primitives';
import { relativeTime } from '@/lib/utils';

export function ActivityPanel({
  pending,
  undoStack,
}: {
  pending: PendingOperation[];
  undoStack: PendingOperation[];
}) {
  return (
    <div className="scroll-y h-full min-h-0 space-y-5 p-3">
      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-[var(--color-ink-faint)] uppercase">
          <Layers size={11} />
          Unsaved queue
        </p>
        {pending.length === 0 ? (
          <p className="text-[11px] text-[var(--color-ink-faint)]">Nothing waiting to save.</p>
        ) : (
          <ol className="space-y-1">
            {pending.map((entry) => (
              <li
                key={entry.id}
                className="glass rounded-xl px-2.5 py-2"
              >
                <p className="text-xs font-medium">{entry.label}</p>
                <p className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                  {entry.operation.op} · {relativeTime(new Date(entry.createdAt).toISOString())}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-[var(--color-ink-faint)] uppercase">
          <History size={11} />
          Local timeline
        </p>
        {undoStack.length === 0 ? (
          <EmptyState
            icon={<History size={16} />}
            title="No local edits yet"
            message="Every operation you apply lands here so undo is a replay, not a snapshot."
          />
        ) : (
          <ol className="space-y-1">
            {[...undoStack].reverse().slice(0, 40).map((entry) => (
              <li key={entry.id} className="rounded-xl px-2.5 py-1.5">
                <p className="text-xs">{entry.label || humanizeOperation(entry.operation)}</p>
                <p className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                  {entry.operation.op}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
