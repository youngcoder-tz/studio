'use client';

// studio/src/components/panels/history-panel.tsx
//
// REVISION HISTORY AND DIFF.
//
// The document is append-only: every save adds a DRAFT revision, publishing adds
// a PUBLISHED one, and a rollback adds a ROLLBACK one that points forward. This
// panel is the author's view of that ledger, and it is deliberately honest about
// the two *different* reversals the system supports, because conflating them is
// the most dangerous mistake a user of this UI can make:
//
//   • **Discard draft** — throws away unpublished work. Visitors are unaffected.
//     Lives in the toolbar, not here.
//   • **Roll back live** — makes the live site match an older revision, then
//     publishes that as a new revision. Live visitors are affected immediately.
//     Lives here, behind a confirmation, on a row explicitly marked as affecting
//     live traffic.
//
// The diff view exists so the second action is informed rather than hopeful.

import { useState } from 'react';
import {
  ArrowRight,
  Clock,
  CornerUpLeft,
  FileClock,
  GitCompare,
  Loader2,
  Minus,
  Plus,
  RotateCw,
} from 'lucide-react';
import type { RevisionDiff, RevisionSummary } from '@/lib/contract';
import { cn, relativeTime } from '@/lib/utils';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Segmented } from '@/components/ui/controls';

const KIND_LABEL: Record<RevisionSummary['kind'], string> = {
  DRAFT: 'Draft save',
  PUBLISHED: 'Published',
  ROLLBACK: 'Rolled back',
};

export function HistoryPanel({
  revisions,
  isLoading,
  liveRevision,
  draftRevision,
  isDirty,
  disabled,
  onRollback,
  diff,
  diffLoading,
  onRequestDiff,
  onClearDiff,
}: {
  revisions: RevisionSummary[];
  isLoading: boolean;
  liveRevision: number;
  draftRevision: number;
  isDirty: boolean;
  disabled?: boolean;
  onRollback: (revision: number) => void;
  diff: RevisionDiff | undefined;
  diffLoading: boolean;
  onRequestDiff: (from: number, to: number) => void;
  onClearDiff: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'published'>('all');
  const [confirmRollback, setConfirmRollback] = useState<RevisionSummary | null>(null);

  const visible =
    filter === 'all' ? revisions : revisions.filter((r) => r.kind !== 'DRAFT');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 space-y-2 border-b border-[var(--color-line)] p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-[var(--color-ink-dim)] uppercase">
            History
          </h3>
          <div className="flex items-center gap-1.5 text-[10px]">
            <Badge tone="ok">live r{liveRevision}</Badge>
            <Badge tone={isDirty ? 'warn' : 'neutral'}>
              draft r{draftRevision}
              {isDirty ? ' *' : ''}
            </Badge>
          </div>
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All changes' },
            { value: 'published', label: 'Releases' },
          ]}
          className="w-full"
        />
      </header>

      {diff ? (
        <DiffBanner diff={diff} loading={diffLoading} onClose={onClearDiff} />
      ) : null}

      <div className="scroll-y min-h-0 flex-1 p-2">
        {isLoading ? (
          <div className="flex justify-center py-10 text-[var(--color-ink-faint)]">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<FileClock size={18} />}
            title="No history yet"
            message="Revisions appear here as you save and publish."
          />
        ) : (
          <ul className="space-y-1">
            {visible.map((revision) => {
              const isLive = revision.revision === liveRevision;
              const isDraft = revision.revision === draftRevision;
              return (
                <li
                  key={revision.id}
                  className={cn(
                    'rounded-lg border p-2.5 transition-colors',
                    isDraft
                      ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/6'
                      : 'border-[var(--color-line)]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded bg-[var(--color-panel-2)] px-1.5 py-0.5 font-mono text-[10px]">
                        r{revision.revision}
                      </span>
                      <KindBadge kind={revision.kind} />
                      {isLive ? <Badge tone="ok">live</Badge> : null}
                      {isDraft && !isLive ? <Badge tone="accent">draft</Badge> : null}
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] text-[var(--color-ink-faint)]">
                      <Clock size={10} />
                      {relativeTime(revision.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1.5 truncate text-[11px] text-[var(--color-ink-dim)]">
                    {revision.message || KIND_LABEL[revision.kind]}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-ink-faint)]">
                      <span>{revision.operationCount} op{revision.operationCount === 1 ? '' : 's'}</span>
                      {revision.errorCount > 0 ? (
                        <span className="text-[var(--color-danger)]">
                          {revision.errorCount} error{revision.errorCount === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      {revision.actorRole ? <span>{revision.actorRole}</span> : null}
                    </div>

                    <div className="flex items-center gap-1">
                      {revision.revision !== liveRevision ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRequestDiff(revision.revision, liveRevision)}
                          title={`Compare r${revision.revision} with live`}
                        >
                          <GitCompare size={11} />
                          Diff
                        </Button>
                      ) : null}
                      {!isLive && revision.kind !== 'DRAFT' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={disabled}
                          onClick={() => setConfirmRollback(revision)}
                          title="Make the live site match this revision"
                        >
                          <CornerUpLeft size={11} />
                          Roll back
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={confirmRollback !== null}
        onClose={() => setConfirmRollback(null)}
        title="Roll the live site back?"
        description="Visitors see the older version immediately. History is preserved — this publishes a new revision rather than erasing anything."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRollback(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmRollback) onRollback(confirmRollback.revision);
                setConfirmRollback(null);
              }}
            >
              <RotateCw size={13} />
              Roll back to r{confirmRollback?.revision}
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-[var(--color-ink-dim)]">
          Live is currently <strong>r{liveRevision}</strong>. Rolling back to{' '}
          <strong>r{confirmRollback?.revision}</strong> publishes a new ROLLBACK
          revision whose content matches it. You can roll forward again from the same
          list.
        </p>
      </Modal>
    </div>
  );
}

function KindBadge({ kind }: { kind: RevisionSummary['kind'] }) {
  if (kind === 'PUBLISHED') return <Badge tone="ok">published</Badge>;
  if (kind === 'ROLLBACK') return <Badge tone="warn">rollback</Badge>;
  return <Badge>draft</Badge>;
}

function DiffBanner({
  diff,
  loading,
  onClose,
}: {
  diff: RevisionDiff;
  loading: boolean;
  onClose: () => void;
}) {
  const changedPages = diff.pages.filter((page) => page.status !== 'unchanged');
  const tokenChanges =
    diff.tokens.added.length + diff.tokens.removed.length + diff.tokens.changed.length;

  return (
    <div className="shrink-0 border-b border-[var(--color-line)] bg-[var(--color-panel-2)] p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium">
          <GitCompare size={12} />
          r{diff.from} <ArrowRight size={10} /> r{diff.to}
          {loading ? <Loader2 size={11} className="animate-spin" /> : null}
        </span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="max-h-40 space-y-1.5 overflow-y-auto">
        {changedPages.length === 0 && tokenChanges === 0 ? (
          <p className="text-[11px] text-[var(--color-ink-faint)]">
            No structural differences between these revisions.
          </p>
        ) : null}

        {changedPages.map((page) => (
          <div key={page.pageKey} className="rounded border border-[var(--color-line)] p-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px]">/{page.pageKey}</span>
              <Badge
                tone={
                  page.status === 'added'
                    ? 'ok'
                    : page.status === 'removed'
                      ? 'danger'
                      : 'warn'
                }
              >
                {page.status}
              </Badge>
            </div>
            {page.addedInstances.length ? (
              <p className="mt-1 flex items-start gap-1 text-[10px] text-[var(--color-ok)]">
                <Plus size={10} className="mt-0.5 shrink-0" />
                <span className="truncate">{page.addedInstances.length} added</span>
              </p>
            ) : null}
            {page.removedInstances.length ? (
              <p className="flex items-start gap-1 text-[10px] text-[var(--color-danger)]">
                <Minus size={10} className="mt-0.5 shrink-0" />
                <span className="truncate">{page.removedInstances.length} removed</span>
              </p>
            ) : null}
            {page.reordered ? (
              <p className="text-[10px] text-[var(--color-ink-faint)]">Reordered</p>
            ) : null}
          </div>
        ))}

        {tokenChanges > 0 ? (
          <div className="rounded border border-[var(--color-line)] p-1.5">
            <p className="text-[10px] font-medium">Design tokens</p>
            <p className="text-[10px] text-[var(--color-ink-faint)]">
              {diff.tokens.added.length} added · {diff.tokens.changed.length} changed ·{' '}
              {diff.tokens.removed.length} removed
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
