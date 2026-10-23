'use client';

// studio/src/components/panels/gallery-modal.tsx
//
// THE TEMPLATE GALLERY.
//
// Tier 1 of the doc's two tiers: swapping the whole shell. Selecting a template
// replaces the *draft* document, never the live one (unless the author opts in),
// which is what makes browsing safe — an author can look at three templates and
// only the last one they accept ends up in the draft.
//
// The warning about discarding work is not decoration. Selecting a template
// overwrites the draft wholesale, so any unpublished edits are lost. That is
// exactly the kind of destructive action that must be confirmed rather than
// discovered.

import { useState } from 'react';
import { AlertTriangle, Check, Loader2, Sparkles, Star } from 'lucide-react';
import type { GalleryTemplate, WorkspaceMode } from '@/lib/contract';
import { WORKSPACE_MODE_LABELS } from '@/lib/contract';
import { cn, truncate } from '@/lib/utils';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Segmented } from '@/components/ui/controls';

export function GalleryModal({
  open,
  onClose,
  templates,
  categories,
  installedTemplateKey,
  installedTemplateKind,
  isLoading,
  currentTemplateId,
  hasUnpublishedChanges,
  workspaceMode,
  onSelect,
  isApplying,
}: {
  open: boolean;
  onClose: () => void;
  templates: GalleryTemplate[];
  categories: WorkspaceMode[];
  installedTemplateKey: string | null;
  installedTemplateKind: string | null;
  isLoading: boolean;
  currentTemplateId: string | null;
  hasUnpublishedChanges: boolean;
  workspaceMode: WorkspaceMode;
  onSelect: (templateKey: string, publishImmediately: boolean) => void;
  isApplying: boolean;
}) {
  const [category, setCategory] = useState<string>('ALL');
  const [pending, setPending] = useState<GalleryTemplate | null>(null);
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Server-owned category list (the five workspace modes), falling back to
  // whatever the fetched rows actually carry — covers a marketplace row in a
  // mode the response predates.
  const categoryOptions = [
    { value: 'ALL', label: 'All' },
    ...(categories.length
      ? categories
      : Array.from(new Set(templates.map((template) => template.category)))
    ).map((value) => ({
      value: value as string,
      label: WORKSPACE_MODE_LABELS[value as WorkspaceMode] ?? value,
    })),
  ];

  const visible = templates.filter(
    (template) => category === 'ALL' || template.category === category,
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="xl"
        title="Template gallery"
        description="Swap the whole starting point. Selecting a template replaces your draft — your live site is untouched until you publish."
      >
        <div className="space-y-4">
          <Segmented
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            className="overflow-x-auto"
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-faint)]">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={18} />}
              title="No templates in this category"
              message="Templates are installed per workspace mode. Try another category."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visible.map((template) => {
                const isCurrent = template.key === currentTemplateId;
                const isInstalled =
                  template.key === installedTemplateKey &&
                  installedTemplateKind !== null;
                const recommended = template.category === workspaceMode;
                const accent = template.accent ?? undefined;
                return (
                  <li
                    key={template.key}
                    className={cn(
                      'surface-2 relative flex flex-col gap-3 overflow-hidden rounded-xl p-3.5',
                      isCurrent && 'border-[var(--color-accent)]/50',
                    )}
                    style={accent ? { borderLeft: `2px solid ${accent}` } : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {template.displayName}
                          {isCurrent ? (
                            <Check size={13} className="shrink-0 text-[var(--color-accent)]" />
                          ) : null}
                        </p>
                        <p className="truncate font-mono text-[10px] text-[var(--color-ink-faint)]">
                          {template.key}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={recommended ? 'accent' : 'neutral'}>
                          {WORKSPACE_MODE_LABELS[template.category] ?? template.category}
                        </Badge>
                        {isCurrent ? (
                          <span className="text-[9px] tracking-wide text-[var(--color-accent)] uppercase">
                            installed
                          </span>
                        ) : isInstalled ? (
                          <span className="text-[9px] tracking-wide text-[var(--color-ink-faint)] uppercase">
                            previously installed
                          </span>
                        ) : recommended ? (
                          <span className="text-[9px] tracking-wide text-[var(--color-accent)] uppercase">
                            matches this workspace
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {template.description ? (
                      <p className="text-[11px] leading-relaxed text-[var(--color-ink-dim)]">
                        {truncate(template.description, 160)}
                      </p>
                    ) : null}

                    {template.tags?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 5).map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-auto space-y-2">
                      {(typeof template.pageCount === 'number' ||
                        typeof template.componentCount === 'number' ||
                        typeof template.downloads === 'number') ? (
                        <div className="flex items-center gap-3 text-[10px] text-[var(--color-ink-faint)]">
                          {typeof template.pageCount === 'number' ? (
                            <span>{template.pageCount} pages</span>
                          ) : null}
                          {typeof template.componentCount === 'number' ? (
                            <span>{template.componentCount} components</span>
                          ) : null}
                          {typeof template.downloads === 'number' && template.downloads > 0 ? (
                            <span>
                              {Intl.NumberFormat('en', { notation: 'compact' }).format(
                                template.downloads,
                              )}{' '}
                              installs
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-[var(--color-ink-faint)]">
                          {typeof template.rating === 'number' ? (
                            <span className="flex items-center gap-1">
                              <Star size={10} className="fill-[var(--color-warn)] text-[var(--color-warn)]" />
                              {template.rating.toFixed(1)}
                            </span>
                          ) : null}
                          {template.authorName ? <span>{template.authorName}</span> : null}
                        </div>
                        <Button
                          variant={isCurrent ? 'ghost' : recommended ? 'primary' : 'secondary'}
                          size="sm"
                          disabled={isCurrent || isApplying}
                          onClick={() => {
                            setPublishImmediately(false);
                            setPending(template);
                          }}
                        >
                          {isCurrent ? 'In use' : 'Use template'}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        size="sm"
        title={`Apply “${pending?.displayName ?? ''}”?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isApplying}
              onClick={() => {
                if (pending) onSelect(pending.key, publishImmediately);
                setPending(null);
              }}
            >
              {isApplying ? <Loader2 size={13} className="animate-spin" /> : null}
              Apply template
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {hasUnpublishedChanges ? (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 p-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--color-warn)]" />
              <p className="text-[11px] leading-relaxed text-[var(--color-ink-dim)]">
                You have unpublished changes. Applying this template replaces the
                entire draft, and those changes will be lost.
              </p>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--color-line)] p-3">
            <input
              type="checkbox"
              checked={publishImmediately}
              onChange={(event) => setPublishImmediately(event.target.checked)}
              className="mt-0.5 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-xs font-medium">Publish immediately</span>
              <span className="block text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
                Visitors see the new template the moment this finishes. Leave unchecked
                to review it as a draft first — recommended.
              </span>
            </span>
          </label>
        </div>
      </Modal>
    </>
  );
}
