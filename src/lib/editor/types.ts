// studio/src/lib/editor/types.ts

import type {
  Diagnostic,
  GlobalTokens,
  LayoutInstance,
  PageLayouts,
  PageSeoConfig,
  WorkspaceOperation,
} from '../contract';

export interface EditorDocument {
  pageLayouts: PageLayouts;
  globalTokens: GlobalTokens;
  seo: Record<string, PageSeoConfig>;
  i18n: Record<string, Record<string, string>>;
}

/**
 * A locally-applied operation plus enough bookkeeping to show the author what
 * is unsaved and to send a single coherent batch.
 *
 * `optimistic` operations are ones the Studio has already applied to its local
 * copy but not yet confirmed with the server. They are the draft of the draft.
 */
export interface PendingOperation {
  id: string;
  operation: WorkspaceOperation;
  /** Human label shown in the "unsaved changes" list. */
  label: string;
  createdAt: number;
}

export interface EditorSnapshot {
  document: EditorDocument;
  /**
   * Inverse operations, newest last. Undo pops one and applies the inverse
   * locally; redo re-applies the original. Snapshots are recorded alongside so
   * that redo survives a page reload of the history — but the primary mechanism
   * is operation replay, which is what the backend records anyway.
   */
  undoStack: PendingOperation[];
  redoStack: PendingOperation[];
}

export type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; at: number; revision: number }
  | { status: 'error'; message: string; diagnostics: Diagnostic[] }
  | { status: 'conflict'; message: string };

export type Selection =
  | { kind: 'none' }
  | { kind: 'page'; pageKey: string }
  | { kind: 'instance'; pageKey: string; instanceId: string }
  | { kind: 'tokens' }
  | { kind: 'seo'; pageKey: string }
  | { kind: 'i18n' };

export interface EditorState {
  projectId: string;
  document: EditorDocument;
  /** Server revision the local document is based on. */
  baseRevision: number;
  pending: PendingOperation[];
  undoStack: PendingOperation[];
  redoStack: PendingOperation[];
  saveState: SaveState;
  selection: Selection;
  activePageKey: string;
  /** Instance ids currently collapsed in the layer list. */
  collapsed: string[];
  /** Live diagnostics from the last dry-run/save. */
  diagnostics: Diagnostic[];
  /** True while the local document is known to diverge from the server. */
  dirty: boolean;
}

export type EditorAction =
  | { type: 'load'; document: EditorDocument; revision: number; activePageKey: string }
  | { type: 'apply'; operation: WorkspaceOperation; label: string; inverse?: WorkspaceOperation[] }
  | { type: 'applyLocal'; patch: Partial<EditorDocument>; label: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'select'; selection: Selection }
  | { type: 'setActivePage'; pageKey: string }
  | { type: 'toggleCollapse'; instanceId: string }
  | { type: 'saveStart' }
  | { type: 'saveSuccess'; revision: number; document: EditorDocument; diagnostics: Diagnostic[] }
  | { type: 'saveError'; message: string; diagnostics: Diagnostic[] }
  | { type: 'saveConflict'; message: string }
  | { type: 'adoptServerDocument'; document: EditorDocument; revision: number }
  | { type: 'clearDiagnostics' }
  | { type: 'markPristine' };

export type { LayoutInstance };
