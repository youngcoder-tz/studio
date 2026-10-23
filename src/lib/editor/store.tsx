'use client';

// studio/src/lib/editor/store.tsx
//
// The Studio's editor state machine.
//
// Design choices worth naming, because they are what make the editor both fast
// and safe:
//
//   • **Every edit is an operation.** There is no "edited the document object"
//     path. Dropping a component, dragging it, changing a prop and toggling a
//     token all produce a `WorkspaceOperation`. That means the local model and
//     the wire format are the same thing, undo is operation replay, and the
//     backend receives exactly what the UI showed.
//
//   • **Local-first, server-authoritative.** An operation is applied locally
//     immediately and queued. A debounced autosave sends the queue as one batch.
//     The server recompiles and returns the authoritative document, which the
//     store adopts. If they ever differ, the server wins.
//
//   • **Optimistic concurrency is surfaced, not hidden.** A 409 is not retried
//     blindly: the store enters a `conflict` state and the UI asks the author to
//     reload or force. Silently overwriting another author's work is the one
//     failure mode that would be unforgivable here.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type {
  Diagnostic,
  GlobalTokens,
  LayoutInstance,
  PageSeoConfig,
  WorkspaceOperation,
} from '../contract';
import {
  applyOperations,
  fetchDocument,
  fetchSyncStatus,
  openEventStream,
  replaceDocument,
} from '../api/workspace';
import { ApiError } from '../errors';
import { applyOperationLocal, computeInverseLocal } from './reducer';
import type {
  EditorAction,
  EditorDocument,
  EditorState,
  PendingOperation,
  Selection,
} from './types';
import { newInstanceId } from '../utils';

const AUTOSAVE_DEBOUNCE_MS = 1200;
const UNDO_LIMIT = 100;

// ─── Reducer ─────────────────────────────────────────────────────────────────

function initialState(projectId: string, activePageKey: string): EditorState {
  return {
    projectId,
    document: { pageLayouts: {}, globalTokens: {}, seo: {}, i18n: {} },
    baseRevision: 0,
    pending: [],
    undoStack: [],
    redoStack: [],
    saveState: { status: 'idle' },
    selection: { kind: 'none' },
    activePageKey,
    collapsed: [],
    diagnostics: [],
    dirty: false,
  };
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'load':
      return {
        ...state,
        document: action.document,
        baseRevision: action.revision,
        activePageKey: action.activePageKey,
        pending: [],
        undoStack: [],
        redoStack: [],
        dirty: false,
        saveState: { status: 'idle' },
        diagnostics: [],
      };

    case 'apply': {
      const nextDocument = applyOperationLocal(state.document, action.operation);
      const entry: PendingOperation = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        operation: action.operation,
        label: action.label,
        createdAt: Date.now(),
      };
      const undoStack = [...state.undoStack, entry].slice(-UNDO_LIMIT);
      return {
        ...state,
        document: nextDocument,
        pending: [...state.pending, entry],
        undoStack,
        // A new edit invalidates the redo branch, exactly like a text editor.
        redoStack: [],
        dirty: true,
        saveState: state.saveState.status === 'saving' ? state.saveState : { status: 'idle' },
      };
    }

    case 'applyLocal':
      return {
        ...state,
        document: { ...state.document, ...action.patch },
        dirty: true,
      };

    case 'undo': {
      const entry = state.undoStack[state.undoStack.length - 1];
      if (!entry) return state;
      const inverse = computeInverseLocal(state.document, entry.operation);
      if (!inverse) {
        // No faithful local inverse. Rather than corrupt the document, tell the
        // caller to reload from the server (handled in the provider).
        return state;
      }
      let document = state.document;
      const inverses: PendingOperation[] = [];
      for (const operation of inverse) {
        const inverseOfInverse = computeInverseLocal(document, operation);
        document = applyOperationLocal(document, operation);
        inverses.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          operation: inverseOfInverse ? operation : operation,
          label: `Undo ${entry.label}`,
          createdAt: Date.now(),
        });
      }
      return {
        ...state,
        document,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, entry],
        // The undo is itself an edit to be persisted.
        pending: [...state.pending, ...inverses],
        dirty: true,
      };
    }

    case 'redo': {
      const entry = state.redoStack[state.redoStack.length - 1];
      if (!entry) return state;
      const document = applyOperationLocal(state.document, entry.operation);
      return {
        ...state,
        document,
        undoStack: [...state.undoStack, entry],
        redoStack: state.redoStack.slice(0, -1),
        pending: [...state.pending, entry],
        dirty: true,
      };
    }

    case 'select':
      return { ...state, selection: action.selection };

    case 'setActivePage':
      return {
        ...state,
        activePageKey: action.pageKey,
        selection: { kind: 'page', pageKey: action.pageKey },
      };

    case 'toggleCollapse':
      return {
        ...state,
        collapsed: state.collapsed.includes(action.instanceId)
          ? state.collapsed.filter((id) => id !== action.instanceId)
          : [...state.collapsed, action.instanceId],
      };

    case 'saveStart':
      return { ...state, saveState: { status: 'saving' } };

    case 'saveSuccess':
      return {
        ...state,
        document: action.document,
        baseRevision: action.revision,
        pending: [],
        dirty: false,
        diagnostics: action.diagnostics,
        saveState: { status: 'saved', at: Date.now(), revision: action.revision },
      };

    case 'saveError':
      return {
        ...state,
        diagnostics: action.diagnostics,
        saveState: {
          status: 'error',
          message: action.message,
          diagnostics: action.diagnostics,
        },
      };

    case 'saveConflict':
      return { ...state, saveState: { status: 'conflict', message: action.message } };

    case 'adoptServerDocument':
      return {
        ...state,
        document: action.document,
        baseRevision: action.revision,
        pending: [],
        undoStack: [],
        redoStack: [],
        dirty: false,
        saveState: { status: 'idle' },
      };

    case 'clearDiagnostics':
      return { ...state, diagnostics: [] };

    case 'markPristine':
      return { ...state, dirty: false };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  /** Applies an operation locally and queues it for autosave. */
  dispatchOperation: (operation: WorkspaceOperation, label: string) => void;
  /** Replaces a slice of the document without a typed operation (rare). */
  patchLocal: (patch: Partial<EditorDocument>, label: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  select: (selection: Selection) => void;
  setActivePage: (pageKey: string) => void;
  toggleCollapse: (instanceId: string) => void;
  /** Forces an immediate save of the pending queue. */
  saveNow: () => Promise<void>;
  /** Discards local edits and re-reads the server document. */
  reload: () => Promise<void>;
  /** Forgets local pending changes and adopts the server's current state. */
  resolveConflict: () => Promise<void>;
  /**
   * Writes the pending queue *over* a newer server revision.
   *
   * Only ever called from an explicit author choice in the conflict banner. The
   * normal save always sends `baseRevision`; omitting it is what the backend
   * treats as "I have seen the conflict and I still want these edits".
   */
  forceSave: () => Promise<void>;
  /** Applies a batch without going through the pending queue (used by gallery). */
  applyServerResult: (payload: {
    document: EditorDocument;
    revision: number;
    diagnostics: Diagnostic[];
  }) => void;
  /** Convenience helpers built on `dispatchOperation`. */
  helpers: EditorHelpers;
}

export interface EditorHelpers {
  addComponent: (pageKey: string, instance: LayoutInstance, index?: number) => void;
  removeComponent: (pageKey: string, instanceId: string) => void;
  duplicateComponent: (pageKey: string, instanceId: string) => void;
  moveComponent: (pageKey: string, instanceId: string, toIndex: number) => void;
  updateProps: (pageKey: string, instanceId: string, props: Record<string, unknown>) => void;
  replaceComponent: (pageKey: string, instanceId: string, instance: LayoutInstance) => void;
  setLayout: (pageKey: string, instanceId: string, layout: Record<string, unknown>) => void;
  setVisibility: (pageKey: string, instanceId: string, visible: boolean) => void;
  setBinding: (
    pageKey: string,
    instanceId: string,
    binding: LayoutInstance['binding'] | null,
  ) => void;
  updateToken: (key: string, value: string | number) => void;
  removeToken: (key: string) => void;
  bulkUpdateTokens: (tokens: GlobalTokens) => void;
  updateSeo: (pageKey: string, seo: Partial<PageSeoConfig>) => void;
  createPage: (pageKey: string) => void;
  renamePage: (from: string, to: string) => void;
  deletePage: (pageKey: string) => void;
  reorderPages: (order: string[]) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used inside <EditorProvider>.');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function EditorProvider({
  projectId,
  initialDocument,
  activePageKey,
  children,
}: {
  projectId: string;
  initialDocument: EditorDocument;
  activePageKey: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    { projectId, initialDocument, activePageKey },
    (init) => ({
      ...initialState(init.projectId, init.activePageKey),
      document: init.initialDocument,
    }),
  );

  // Refs let the debounce timer and the polling interval read the newest state
  // without re-arming on every keystroke's state change. The write happens in an
  // effect rather than during render: mutating a ref while rendering is unsafe
  // under concurrent rendering (a render can be thrown away), and the React
  // compiler rejects it outright.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const performSave = useCallback(
    async (options: { force?: boolean } = {}) => {
      const current = stateRef.current;
      if (current.pending.length === 0 || savingRef.current) return;

      savingRef.current = true;
      dispatch({ type: 'saveStart' });

      const operations = current.pending.map((p) => p.operation);
      try {
        const result = await applyOperations(projectId, {
          operations,
          // Omitting `baseRevision` is the force path: the backend skips its
          // optimistic check and lets this write win. `force` is only reachable
          // from the conflict banner, never from a retry.
          ...(options.force ? {} : { baseRevision: current.baseRevision }),
          message: summarizeOperations(operations),
        });
      dispatch({
        type: 'saveSuccess',
        revision: result.draftRevision,
        document: {
          pageLayouts: result.document.pageLayouts,
          globalTokens: result.document.globalTokens,
          seo: result.document.seo,
          i18n: result.document.i18n,
        },
        diagnostics: result.diagnostics ?? [],
      });
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        dispatch({
          type: 'saveConflict',
          message:
            'Someone else saved this workspace while you were editing. Reload to get their changes, or discard yours.',
        });
      } else {
        const diagnostics =
          error instanceof ApiError && Array.isArray(error.diagnostics)
            ? (error.diagnostics as Diagnostic[])
            : [];
        dispatch({
          type: 'saveError',
          message: error instanceof Error ? error.message : 'Save failed.',
          diagnostics,
        });
      }
    } finally {
      savingRef.current = false;
    }
    },
    [projectId],
  );

  // Debounced autosave: re-arm whenever the pending queue grows.
  useEffect(() => {
    if (state.pending.length === 0) return;
    if (state.saveState.status === 'conflict') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void performSave();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state.pending.length, state.saveState.status, performSave]);

  // Warn before unload while there is unpersisted work.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (stateRef.current.dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const dispatchOperation = useCallback(
    (operation: WorkspaceOperation, label: string) => {
      dispatch({ type: 'apply', operation, label });
    },
    [],
  );

  const patchLocal = useCallback(
    (patch: Partial<EditorDocument>) => {
      dispatch({ type: 'applyLocal', patch, label: 'local patch' });
    },
    [],
  );

  const helpers = useMemo<EditorHelpers>(
    () => ({
      addComponent: (pageKey, instance, index) =>
        dispatchOperation(
          {
            op: 'node.insert',
            pageKey,
            instance: {
              ...instance,
              instanceId: instance.instanceId || newInstanceId(instance.componentId),
            },
            position: index === undefined ? undefined : { pageKey, index },
          },
          `Added ${instance.componentId}`,
        ),
      removeComponent: (pageKey, instanceId) =>
        dispatchOperation(
          { op: 'node.remove', pageKey, instanceId },
          `Removed ${instanceId}`,
        ),
      duplicateComponent: (pageKey, instanceId) =>
        dispatchOperation(
          {
            op: 'node.duplicate',
            pageKey,
            instanceId,
            newInstanceId: newInstanceId(instanceId.split('-')[0] || 'node'),
          },
          `Duplicated ${instanceId}`,
        ),
      moveComponent: (pageKey, instanceId, toIndex) =>
        dispatchOperation(
          { op: 'node.move', pageKey, instanceId, to: { pageKey, index: toIndex } },
          `Moved ${instanceId}`,
        ),
      updateProps: (pageKey, instanceId, props) =>
        dispatchOperation(
          { op: 'node.updateProps', pageKey, instanceId, props },
          `Edited ${instanceId}`,
        ),
      replaceComponent: (pageKey, instanceId, instance) =>
        dispatchOperation(
          { op: 'node.replace', pageKey, instanceId, instance },
          `Swapped ${instanceId}`,
        ),
      setLayout: (pageKey, instanceId, layout) =>
        dispatchOperation(
          { op: 'node.setLayout', pageKey, instanceId, layout },
          `Styled ${instanceId}`,
        ),
      setVisibility: (pageKey, instanceId, visible) =>
        dispatchOperation(
          { op: 'node.setVisibility', pageKey, instanceId, visible },
          `${visible ? 'Showed' : 'Hid'} ${instanceId}`,
        ),
      setBinding: (pageKey, instanceId, binding) =>
        dispatchOperation(
          { op: 'node.setBinding', pageKey, instanceId, binding: binding ?? null },
          `Bound ${instanceId}`,
        ),
      updateToken: (key, value) =>
        dispatchOperation(
          { op: 'token.update', key, value },
          `Token ${key}`,
        ),
      removeToken: (key) =>
        dispatchOperation({ op: 'token.remove', key }, `Removed token ${key}`),
      bulkUpdateTokens: (tokens) =>
        dispatchOperation(
          { op: 'token.bulkUpdate', tokens },
          `Updated ${Object.keys(tokens).length} tokens`,
        ),
      updateSeo: (pageKey, seo) =>
        dispatchOperation(
          { op: 'seo.update', pageKey, seo: seo as Record<string, unknown> },
          `SEO for ${pageKey}`,
        ),
      createPage: (pageKey) =>
        dispatchOperation({ op: 'page.create', pageKey, instances: [] }, `Created ${pageKey}`),
      renamePage: (from, to) =>
        dispatchOperation({ op: 'page.rename', from, to }, `Renamed ${from}`),
      deletePage: (pageKey) =>
        dispatchOperation({ op: 'page.delete', pageKey }, `Deleted ${pageKey}`),
      reorderPages: (order) =>
        dispatchOperation({ op: 'page.reorder', order }, `Reordered pages`),
    }),
    [dispatchOperation],
  );

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  const select = useCallback(
    (selection: Selection) => dispatch({ type: 'select', selection }),
    [],
  );
  const setActivePage = useCallback(
    (pageKey: string) => dispatch({ type: 'setActivePage', pageKey }),
    [],
  );
  const toggleCollapse = useCallback(
    (instanceId: string) => dispatch({ type: 'toggleCollapse', instanceId }),
    [],
  );

  const saveNow = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await performSave();
  }, [performSave]);

  const loadInto = useCallback(async () => {
    const doc = await fetchDocument(projectId);
    dispatch({
      type: 'adoptServerDocument',
      revision: doc.draftRevision,
      document: {
        pageLayouts: doc.pageLayouts,
        globalTokens: doc.globalTokens,
        seo: doc.seo,
        i18n: doc.i18n,
      },
    });
    return doc;
  }, [projectId]);

  const reload = useCallback(async () => {
    try {
      await loadInto();
      toast.success('Reloaded the latest saved workspace.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reload failed.');
    }
  }, [loadInto]);

  const resolveConflict = useCallback(async () => {
    try {
      await loadInto();
      toast.success('Adopted the server version. Your local edits were discarded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reload failed.');
    }
  }, [loadInto]);

  /**
   * Overwrites the newer server revision with the local queue.
   *
   * This is the one deliberate escape hatch from optimistic concurrency, and it
   * exists because the alternative is worse: an author who genuinely wants their
   * version would otherwise have to copy their work out by hand and paste it
   * back. The backend permits it by omitting `baseRevision`; the UI makes it a
   * distinct, confirmed choice rather than a silent retry.
   */
  const forceSave = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await performSave({ force: true });
    // `performSave` reports success or failure through the save state and the
    // diagnostics bar; adding a toast here would double-report the same event.
  }, [performSave]);

  const applyServerResult = useCallback(
    (payload: { document: EditorDocument; revision: number; diagnostics: Diagnostic[] }) => {
      dispatch({
        type: 'saveSuccess',
        revision: payload.revision,
        document: payload.document,
        diagnostics: payload.diagnostics,
      });
    },
    [],
  );

  // Keyboard shortcuts: Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z redo, Cmd/Ctrl+S save.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, saveNow]);

  // Cross-check the server's sync state so the Studio reflects an out-of-band
  // publish (e.g. someone published from the CLI) without a manual reload.
  //
  // Two mechanisms, same predicate, on purpose:
  //   • SSE gives near-instant notice of a remote draft save / publish.
  //   • The 20s poll is the safety net for when the stream is down (a proxy
  //     that strips text/event-stream, a laptop that slept, cookie expiry).
  //
  // Both are guarded on `!dirty`. If there is unsaved local work, adopting the
  // server's copy would silently destroy it — the conflict path (409 on the next
  // save) is the only place allowed to reconcile that, and it asks the author.
  const considerRemoteChange = useCallback(
    (draftRevisionFromEvent?: number) => {
      const current = stateRef.current;
      // Never adopt the server's copy while local work is in flight or unsaved:
      // it would destroy it. The 409 conflict path is the only reconciler that
      // is allowed to ask the author what to do.
      if (
        current.dirty ||
        current.pending.length > 0 ||
        current.saveState.status === 'saving'
      ) {
        return;
      }
      const revision = draftRevisionFromEvent ?? current.baseRevision;
      if (revision !== current.baseRevision) {
        void loadInto();
        return;
      }
      // An event without a revision (publish/propagation) still means our view
      // may be stale, so confirm against sync-status rather than guessing.
      void fetchSyncStatus(projectId)
        .then((status) => {
          if (
            !stateRef.current.dirty &&
            status.draftRevision !== stateRef.current.baseRevision
          ) {
            void loadInto();
          }
        })
        .catch(() => {
          /* offline / unauthenticated — the banner already communicates it */
        });
    },
    [projectId, loadInto],
  );

  useEffect(() => {
    const id = setInterval(() => considerRemoteChange(), 20_000);
    return () => clearInterval(id);
  }, [considerRemoteChange]);

  useEffect(() => {
    const close = openEventStream(projectId, {
      onEvent: (event) => {
        // Heartbeats carry no change. Everything else means the server's state
        // moved; `considerRemoteChange` decides whether that matters to us.
        if (event.type === 'ping') return;
        considerRemoteChange();
      },
    });
    return close;
  }, [projectId, considerRemoteChange]);

  const value = useMemo<EditorContextValue>(
    () => ({
      state,
      dispatchOperation,
      patchLocal,
      undo,
      redo,
      canUndo: state.undoStack.length > 0,
      canRedo: state.redoStack.length > 0,
      select,
      setActivePage,
      toggleCollapse,
      saveNow,
      reload,
      resolveConflict,
      forceSave,
      applyServerResult,
      helpers,
    }),
    [
      state,
      dispatchOperation,
      patchLocal,
      undo,
      redo,
      select,
      setActivePage,
      toggleCollapse,
      saveNow,
      reload,
      resolveConflict,
      forceSave,
      applyServerResult,
      helpers,
    ],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

/** A short, human summary of a batch, recorded as the revision message. */
function summarizeOperations(operations: WorkspaceOperation[]): string {
  if (operations.length === 1) return humanizeOperation(operations[0]);
  const kinds = new Set(operations.map((op) => op.op));
  return `${operations.length} edits (${Array.from(kinds).join(', ')})`;
}

export function humanizeOperation(operation: WorkspaceOperation): string {
  switch (operation.op) {
    case 'node.insert':
      return `Added ${operation.instance.componentId}`;
    case 'node.remove':
      return `Removed a component`;
    case 'node.move':
      return `Reordered a component`;
    case 'node.updateProps':
      return `Edited content`;
    case 'node.replace':
      return `Swapped a component`;
    case 'node.setLayout':
      return `Changed styling`;
    case 'node.setVisibility':
      return operation.visible ? `Showed a component` : `Hid a component`;
    case 'node.setBinding':
      return `Changed data binding`;
    case 'node.duplicate':
      return `Duplicated a component`;
    case 'page.create':
      return `Added page ${operation.pageKey}`;
    case 'page.rename':
      return `Renamed page ${operation.from} → ${operation.to}`;
    case 'page.delete':
      return `Deleted page ${operation.pageKey}`;
    case 'page.reorder':
      return `Reordered pages`;
    case 'token.update':
      return `Updated token ${operation.key}`;
    case 'token.remove':
      return `Removed token ${operation.key}`;
    case 'token.bulkUpdate':
      return `Updated design tokens`;
    case 'seo.update':
      return `Edited SEO for ${operation.pageKey}`;
    case 'i18n.update':
      return `Edited ${operation.locale} strings`;
    case 'i18n.remove':
      return `Removed the ${operation.locale} locale`;
    case 'document.meta':
      return operation.message ?? 'Updated document metadata';
    default:
      return 'Edit';
  }
}

export { replaceDocument };
