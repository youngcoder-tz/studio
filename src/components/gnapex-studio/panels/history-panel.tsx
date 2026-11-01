// studio/src/components/gnapex-studio/panels/history-panel.tsx

'use client';

import { Clock, GitBranch } from 'lucide-react';
import { store } from '@/lib/gnapex-studio/store';

export function HistoryPanel() {
  const document_ = store((s) => s.document);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-[13px] font-semibold text-foreground">History</h3>
        <p className="text-[11px] text-muted-foreground/70">Revisions</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          <div className="flex items-start gap-2 rounded-lg bg-primary/10 px-2 py-2">
            <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-primary/10">
              <GitBranch className="size-3 text-primary dark:text-brand-text" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-foreground">Draft revision</p>
                <span className="font-mono text-[10px] text-primary dark:text-brand-text">r{document_?.draftRevision ?? 0}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">Current working copy</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg px-2 py-2 opacity-60">
            <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-secondary">
              <Clock className="size-3 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-muted-foreground">Live revision</p>
                <span className="font-mono text-[10px] text-muted-foreground/70">r{document_?.liveRevision ?? 0}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">Published</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
