// studio/src/components/gnapex-studio/shell/status-bar.tsx
// Honest, quiet state: bridge health, framed page, viewport, draft + save state.
'use client';

import { Check, CircleAlert, CloudUpload, Loader } from 'lucide-react';

import { store } from '@/lib/gnapex-studio/store';
import { cn } from '@/lib/utils';

export function StatusBar() {
  const bridgeStatus = store((s) => s.bridgeStatus);
  const bridgeError = store((s) => s.bridgeError);
  const previewPageKey = store((s) => s.previewPageKey);
  const document_ = store((s) => s.document);
  const pendingOps = store((s) => s.pendingOps);
  const viewport = store((s) => s.viewport);

  const saving = pendingOps.length > 0;
  const savedAt = document_?.lastSavedAt
    ? new Date(document_.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const tone =
    bridgeStatus === 'active' ? 'text-success' : bridgeStatus === 'connecting' ? 'text-warning' : 'text-destructive';

  return (
    <footer className="relative z-10 flex h-9 shrink-0 items-center justify-between gap-6 border-t border-border px-3 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className={cn('flex items-center gap-1.5 rounded-md px-2 py-1', tone)} title={bridgeError ?? undefined}>
          {bridgeStatus === 'connecting' ? (
            <Loader className="size-3 animate-spin" />
          ) : bridgeStatus === 'active' ? (
            <Check className="size-3" />
          ) : (
            <CircleAlert className="size-3" />
          )}
          {bridgeStatus === 'active' ? 'Bridge live' : bridgeStatus}
        </span>
        {previewPageKey ? <span className="truncate">Framed: {previewPageKey}</span> : null}
        <span className="capitalize">Viewport: {viewport}</span>
      </div>
      <div className="flex items-center gap-3">
        {saving ? (
          <span className="flex items-center gap-1.5 text-warning">
            <Loader className="size-3 animate-spin" /> Saving…
          </span>
        ) : savedAt ? (
          <span className="flex items-center gap-1.5">
            <CloudUpload className="size-3" /> Auto-saved {savedAt}
          </span>
        ) : document_ ? (
          <span>Draft loaded</span>
        ) : null}
        {document_ ? <span>Draft r{document_.draftRevision}</span> : null}
      </div>
    </footer>
  );
}
