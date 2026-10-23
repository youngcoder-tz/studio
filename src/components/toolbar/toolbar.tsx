'use client';

// studio/src/components/toolbar/toolbar.tsx
//
// THE TOOLBAR AND PUBLISH BAR.
//
// This is where the two irreversible actions live, and the design is built
// around making sure an author knows which one they are about to take:
//
//   • **Discard draft** (left, quiet, confirms) — throws away unpublished work.
//     Visitors are unaffected.
//   • **Publish** (right, loud, confirms) — makes the draft the live site.
//     Visitors are affected immediately.
//
// The save indicator between them is deliberately unmissable when there is
// unsaved work, because "did that save?" is the question this bar exists to
// answer without the author having to think about it.

import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  Eye,
  History,
  Loader2,
  Redo2,
  Save,
  Sparkles,
  Undo2,
  UploadCloud,
  X,
} from 'lucide-react';
import { cn, relativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import type { SaveState } from '@/lib/editor/types';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function Toolbar({
  projectName,
  workspaceMode,
  saveState,
  dirty,
  canUndo,
  canRedo,
  liveRevision,
  draftRevision,
  onUndo,
  onRedo,
  onSave,
  onReload,
  onOpenGallery,
  onOpenHistory,
  onOpenTokens,
  onPublish,
  onDiscardDraft,
  previewMode,
  onPreviewModeChange,
  publishing,
  discarding,
}: {
  projectName: string;
  workspaceMode: string;
  saveState: SaveState;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  liveRevision: number;
  draftRevision: number;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onReload: () => void;
  onOpenGallery: () => void;
  onOpenHistory: () => void;
  onOpenTokens: () => void;
  onPublish: () => void;
  onDiscardDraft: () => void;
  previewMode: 'draft' | 'live';
  onPreviewModeChange: (mode: 'draft' | 'live') => void;
  publishing: boolean;
  discarding: boolean;
}) {
  const unpublished = draftRevision !== liveRevision || dirty;
  const canPublish = unpublished && !publishing && saveState.status !== 'saving';
  const canDiscard = unpublished && !discarding && saveState.status !== 'saving';

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-line)] px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(165,180,252,0.4),transparent)]" />
      <div className="absolute inset-0 bg-[var(--color-panel)] backdrop-blur-[18px] saturate-[120%]" />
      <div className="relative flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[color-mix(in_oklab,var(--color-accent)_55%,#312e81)] shadow-[0_18px_50px_-24px_var(--color-accent-glow)]">
          <Sparkles size={14} className="text-[var(--color-accent-foreground)]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium tracking-tight">{projectName}</p>
            <Badge tone="accent">{workspaceMode}</Badge>
          </div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--color-ink-faint)]">
            Workspace Studio
          </p>
        </div>
      </div>

      <div className="relative ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={14} />
        </Button>
        <div className="mx-1 h-5 w-px bg-[var(--color-line)]" />
        <Button variant="secondary" size="sm" onClick={onOpenGallery}>
          <Sparkles size={14} />
          Gallery
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenHistory}>
          <History size={14} />
          History
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenTokens}>
          <Eye size={14} />
          Tokens
        </Button>
        <div className="mx-1 h-5 w-px bg-[var(--color-line)]" />
        <SaveIndicator state={saveState} dirty={dirty} onSave={onSave} onReload={onReload} />
        <div className="mx-1 h-5 w-px bg-[var(--color-line)]" />
        <PreviewToggle mode={previewMode} onChange={onPreviewModeChange} />
        <ThemeToggle />
        <div className="mx-1 h-5 w-px bg-[var(--color-line)]" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onDiscardDraft}
          disabled={!canDiscard}
        >
          {discarding ? <Loader2 size={14} className="animate-spin" /> : null}
          Discard draft
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onPublish}
          disabled={!canPublish}
        >
          {publishing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
          Publish
          {unpublished ? (
            <span className="ml-1 rounded-full bg-[var(--color-accent-foreground)]/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest">
              draft
            </span>
          ) : null}
        </Button>
      </div>
    </header>
  );
}

function SaveIndicator({
  state,
  dirty,
  onSave,
  onReload,
}: {
  state: SaveState;
  dirty: boolean;
  onSave: () => void;
  onReload: () => void;
}) {
  if (state.status === 'conflict') {
    return (
      <div className="flex items-center gap-2 rounded-full border border-[var(--color-warn)]/40 bg-[color-mix(in_oklab,var(--color-warn)_12%,transparent)] px-2.5 py-1 text-[11px] text-[var(--color-warn)]">
        <AlertTriangle size={12} />
        Conflict
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-2 rounded-full border border-[var(--color-danger)]/40 bg-[color-mix(in_oklab,var(--color-danger)_12%,transparent)] px-2.5 py-1 text-[11px] text-[var(--color-danger)]"
      >
        <CloudOff size={12} />
        Retry save
      </button>
    );
  }

  if (state.status === 'saving') {
    return (
      <div className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] text-[var(--color-ink-faint)]">
        <Loader2 size={12} className="animate-spin" />
        Saving…
      </div>
    );
  }

  if (dirty) {
    return (
      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-2 rounded-full border border-[var(--color-accent)]/40 bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)] px-2.5 py-1 text-[11px] text-[var(--color-ink-dim)]"
      >
        <Save size={12} />
        Unsaved changes
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onReload}
      className="group flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink-dim)]"
      title={state.status === 'saved' && state.at ? relativeTime(new Date(state.at).toISOString()) : undefined}
    >
      <Check size={12} className="text-[var(--color-success)]" />
      Synced
      <Cloud size={12} className="opacity-60" />
    </button>
  );
}

function PreviewToggle({
  mode,
  onChange,
}: {
  mode: 'draft' | 'live';
  onChange: (mode: 'draft' | 'live') => void;
}) {
  return (
    <div className="relative flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1">
      <button
        type="button"
        onClick={() => onChange('draft')}
        className={cn(
          'relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-colors',
          mode === 'draft'
            ? 'text-[var(--color-accent-foreground)]'
            : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]',
        )}
      >
        {mode === 'draft' ? (
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[color-mix(in_oklab,var(--color-accent)_70%,#312e81)]" />
        ) : null}
        <Eye size={12} className="relative" />
        <span className="relative">Draft</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('live')}
        className={cn(
          'relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-colors',
          mode === 'live'
            ? 'text-[var(--color-accent-foreground)]'
            : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]',
        )}
      >
        {mode === 'live' ? (
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[color-mix(in_oklab,var(--color-accent)_70%,#312e81)]" />
        ) : null}
        <span className="relative">Live</span>
      </button>
    </div>
  );
}

export function DiagnosticsBar({
  diagnostics,
  onDismiss,
}: {
  diagnostics: Array<{ path: string; code?: string; severity: string; message: string }>;
  onDismiss: () => void;
}) {
  if (diagnostics.length === 0) return null;
  const first = diagnostics[0];
  const count = diagnostics.length;
  return (
    <div className="relative flex shrink-0 items-center gap-2 border-b border-[var(--color-line)] px-3 py-1.5">
      <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)]" />
      <AlertTriangle size={13} className="relative text-[var(--color-warn)]" />
      <div className="relative min-w-0 flex-1 text-[11px]">
        {first.code ? <span className="font-medium text-[var(--color-ink)]">{first.code}</span> : null}
        <span className={cn(first.code ? "ml-1" : "", "text-[var(--color-ink-dim)]")}>{first.message}</span>
        {count > 1 ? (
          <span className="ml-2 text-[var(--color-ink-faint)]">
            +{count - 1} more
          </span>
        ) : null}
      </div>
      <Button variant="ghost" size="icon" onClick={onDismiss} aria-label="Dismiss">
        <X size={13} />
      </Button>
    </div>
  );
}
