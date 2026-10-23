'use client';

import { Command } from 'lucide-react';

export function StatusBar({
  pageKey,
  instanceCount,
  pendingCount,
  draftRevision,
  liveRevision,
  diagnosticsCount,
  device,
  zoom,
}: {
  pageKey: string;
  instanceCount: number;
  pendingCount: number;
  draftRevision: number;
  liveRevision: number;
  diagnosticsCount: number;
  device: string;
  zoom: number;
}) {
  return (
    <footer className="glass-bar flex h-8 shrink-0 items-center justify-between gap-3 border-t border-[var(--color-line)] px-3 text-[10px] text-[var(--color-ink-faint)]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate font-mono">/{pageKey}</span>
        <span>{instanceCount} layers</span>
        {pendingCount > 0 ? (
          <span className="text-[var(--color-warn)]">{pendingCount} unsaved</span>
        ) : null}
        {diagnosticsCount > 0 ? (
          <span className="text-[var(--color-danger)]">{diagnosticsCount} notes</span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <span>
          draft r{draftRevision} · live r{liveRevision}
        </span>
        <span>
          {device} · {zoom}%
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Command size={10} />
          K
        </span>
      </div>
    </footer>
  );
}
