// studio/src/components/gnapex-studio/shell/layers-panel.tsx
// The ordered document structure of the framed page, in contract terms.
'use client';

import { Blocks, ShieldAlert } from 'lucide-react';

import type { StudioManifest, WorkspaceDocument } from '@/lib/contract';
import { store } from '@/lib/gnapex-studio/store';
import { buildPageIR } from '@/lib/gnapex-studio/visual-ir';
import { cn } from '@/lib/utils';

export function LayersPanel({
  pageKey,
  manifest,
  document: document_,
}: {
  pageKey: string;
  manifest: StudioManifest;
  document: WorkspaceDocument;
}) {
  const selection = store((s) => s.selection);
  const hoverInstanceId = store((s) => s.hoverInstanceId);
  const selectInstance = store((s) => s.selectInstance);
  const setHover = store((s) => s.setHover);

  const ir = buildPageIR(manifest, document_, pageKey);

  if (ir.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <div className="grid size-10 place-items-center rounded-xl bg-secondary">
          <Blocks className="size-5 text-muted-foreground" />
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">This page has no sections in the draft yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-px pb-8" role="list">
      {ir.nodes.map((node) => {
        const active = selection.instanceId === node.instanceId;
        const hovered = hoverInstanceId === node.instanceId;
        return (
          <li key={node.orderKey}>
            <button
              type="button"
              onClick={() => selectInstance(pageKey, node.instanceId)}
              onMouseEnter={() => setHover(node.instanceId)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                'flex w-full items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-primary/30',
                active ? 'bg-primary/10 text-primary dark:text-brand-text' : hovered ? 'bg-accent' : 'hover:bg-accent',
              )}
            >
              <Blocks className={cn('size-3.5 shrink-0', active ? '' : 'text-muted-foreground')} />
              <span className="flex-1 truncate">{node.componentName}</span>
              {!node.contractKnown ? (
                <ShieldAlert className="size-3 shrink-0 text-warning" aria-label="Component not in contract" />
              ) : (
                <span className="shrink-0 text-[11px] text-muted-foreground">{node.category}</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
