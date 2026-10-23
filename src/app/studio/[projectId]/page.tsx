'use client';

// studio/src/app/studio/[projectId]/page.tsx
//
// THE STUDIO SHELL.
//
// Layout, left to right:
//
//   ┌──────────────────────────────────────────────────────────────────────────┐
//   │ toolbar: identity · undo/redo · panels · save state · publish/discard    │
//   ├────────────┬──────────────┬────────────────────────────┬────────────────┤
//   │ rail       │ pages /      │  preview canvas            │ inspector /     │
//   │            │ layers /     │  (the real portal)         │ tokens / seo /  │
//   │ palette    │ outline      │                            │ history         │
//   └────────────┴──────────────┴────────────────────────────┴────────────────┘
//
// The right panel is a single tabbed surface rather than four stacked panels,
// because at the sizes this tool is actually used an author is doing exactly one
// of: picking a component, styling a token, editing SEO, or reviewing history.
// Stacking them would halve the usable height of the one that matters.
//
// Everything below reads its data from two places only: the manifest (server)
// and the editor store (local + server). There is no third source of state, which
// is what stops the UI quietly disagreeing with the document.

import { use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  Braces,
  Boxes,
  Database,
  Eye,
  FileClock,
  FileText,
  Focus,
  Keyboard,
  Layers,
  LayoutTemplate,
  Loader2,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Redo2,
  Rocket,
  Save,
  Search,
  Settings2,
  Smartphone,
  SlidersHorizontal,
  Tablet,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import {
  useDiscardDraft,
  useGallery,
  useHistory,
  useManifest,
  useMintPreviewToken,
  usePublish,
  useRevertToRevision,
  useSelectTemplate,
  useWorkspaceDocument,
  useDiff,
  useSyncStatus,
} from '@/lib/api/hooks';
import { EditorProvider, useEditor } from '@/lib/editor/store';
import type { EditorDocument } from '@/lib/editor/types';
import {
  DEFAULT_PAGE_KEY_FALLBACK,
  previewPathFor,
} from '@/lib/preview';
import { cn } from '@/lib/utils';
import { isTypingTarget } from '@/lib/shortcuts';
import { useTheme } from '@/lib/theme';
import { Palette } from '@/components/palette/palette';
import { LayerList } from '@/components/layers/layer-list';
import { Inspector } from '@/components/inspector/inspector';
import { TokenPanel } from '@/components/panels/token-panel';
import { PagesPanel } from '@/components/panels/pages-panel';
import { SeoPanel } from '@/components/panels/seo-panel';
import { I18nPanel } from '@/components/panels/i18n-panel';
import { GalleryModal } from '@/components/panels/gallery-modal';
import { HistoryPanel } from '@/components/panels/history-panel';
import { PreviewCanvas, type Device } from '@/components/preview/preview-canvas';
import { CommandPalette, type CommandItem } from '@/components/command-palette';
import { ShortcutsOverlay } from '@/components/shortcuts-overlay';
import { StatusBar } from '@/components/status-bar';
import { ToolRail } from '@/components/tools/tool-rail';
import { FindPanel } from '@/components/tools/find-panel';
import { BindingsPanel } from '@/components/tools/bindings-panel';
import { DiagnosticsPanel } from '@/components/tools/diagnostics-panel';
import { ActivityPanel } from '@/components/tools/activity-panel';
import { DocumentJsonPanel } from '@/components/tools/document-json-panel';
import {
  DiagnosticsBar,
  Toolbar,
} from '@/components/toolbar/toolbar';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/controls';

type LeftTab = 'pages' | 'layers';
type RightTab = 'inspector' | 'tokens' | 'seo' | 'i18n' | 'history';
type ToolId = 'find' | 'bindings' | 'diagnostics' | 'activity' | 'json';

export default function StudioPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  const manifest = useManifest(projectId);
  const document = useWorkspaceDocument(projectId);

  const defaultPageKey =
    manifest.data?.defaultPageKey ?? DEFAULT_PAGE_KEY_FALLBACK;

  if (manifest.isPending || document.isPending) {
    return <FullPageLoader label="Loading the workspace…" />;
  }

  if (manifest.isError || document.isError) {
    const error = (manifest.error ?? document.error) as Error;
    return (
      <FullPageError
        title="Could not open this workspace"
        message={error?.message ?? 'Unknown error.'}
        projectId={projectId}
      />
    );
  }

  const doc: EditorDocument = {
    pageLayouts: document.data.pageLayouts ?? {},
    globalTokens: document.data.globalTokens ?? {},
    seo: document.data.seo ?? {},
    i18n: document.data.i18n ?? {},
  };

  // The manifest's default page is the *intended* entry point, but a workspace
  // document can legitimately lack it (e.g. a template that ships only
  // `about` + `contact`, or a page renamed before the manifest refreshed). If we
  // trusted the default blindly the layer list would be empty and the first
  // "add component" would target a page the compiler has never heard of. Fall
  // back to whatever page the document actually has.
  const documentPageKeys = Object.keys(doc.pageLayouts);
  const initialPageKey = documentPageKeys.includes(defaultPageKey)
    ? defaultPageKey
    : (documentPageKeys[0] ?? defaultPageKey);

  return (
    <EditorProvider
      projectId={projectId}
      initialDocument={doc}
      activePageKey={initialPageKey}
    >
      <StudioWorkspace
        projectId={projectId}
        manifest={manifest.data}
        liveRevision={document.data.liveRevision}
        draftRevision={document.data.draftRevision}
        templateId={document.data.templateId}
      />
    </EditorProvider>
  );
}

// ─── Workspace (inside the provider) ─────────────────────────────────────────

function StudioWorkspace({
  projectId,
  manifest,
  liveRevision,
  draftRevision,
  templateId,
}: {
  projectId: string;
  manifest: NonNullable<ReturnType<typeof useManifest>['data']>;
  liveRevision: number;
  draftRevision: number;
  templateId: string;
}) {
  const editor = useEditor();
  const [leftTab, setLeftTab] = useState<LeftTab>('layers');
  const [rightTab, setRightTab] = useState<RightTab>('inspector');
  const [rightOpen, setRightOpen] = useState(true);
  const [device, setDevice] = useState<Device>('desktop');
  const [previewMode, setPreviewMode] = useState<'draft' | 'live'>('draft');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [diffPair, setDiffPair] = useState<{ from: number; to: number } | null>(null);
  const [zoom, setZoom] = useState(100);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const theme = useTheme();

  const publish = usePublish(projectId);
  const discard = useDiscardDraft(projectId);
  const revert = useRevertToRevision(projectId);
  const selectTemplate = useSelectTemplate(projectId);
  const mintToken = useMintPreviewToken(projectId);
  const history = useHistory(projectId, undefined, galleryOpen === false);
  const gallery = useGallery(projectId, undefined, galleryOpen);
  const diff = useDiff(projectId, diffPair?.from ?? null, diffPair?.to ?? null);
  const sync = useSyncStatus(projectId);

  // ── Current revisions ──────────────────────────────────────────────────────
  //
  // The revisions in the document payload are a snapshot from page load. Using
  // them directly in the toolbar made it lie after the first save or publish:
  // "Publish" stayed disabled because draft === live when the page opened, and
  // "Discard draft" stayed armed after a discard. These two values are the live
  // truth, with three sources in order of freshness:
  //
  //   1. `useSyncStatus` — invalidated by every authoring mutation and polled.
  //   2. `editor.state.baseRevision` — the draft revision the store last adopted
  //      from the server; it advances on every autosave, which sync-status does
  //      not (autosave bypasses the query cache).
  //   3. The payload snapshot — first paint before either query has resolved.
  //
  // `Math.max` for the draft is deliberate: a save in flight can briefly leave
  // sync-status behind the store, and the toolbar must never claim the draft is
  // older than the copy on screen.
  const liveRevisionNow = sync.data?.liveRevision ?? liveRevision;
  const draftRevisionNow = Math.max(
    editor.state.baseRevision,
    sync.data?.draftRevision ?? draftRevision,
  );
  const conflict = editor.state.saveState.status === 'conflict';

  // ── Diagnostics dismissal ─────────────────────────────────────────────────
  //
  // Dismissal is tracked by signature, not by a boolean: a sticky "hidden" flag
  // would swallow the next, different warning. Comparing the serialised list
  // means the bar reappears exactly when the diagnostics actually change.
  const diagnosticsSignature = JSON.stringify(editor.state.diagnostics);
  const [dismissedDiagnostics, setDismissedDiagnostics] = useState<string | null>(null);
  const showDiagnostics =
    editor.state.diagnostics.length > 0 && dismissedDiagnostics !== diagnosticsSignature;

  // Look up manifests by id once; every list and the inspector need this.
  const manifestsById = useMemo(
    () => new Map(manifest.components.map((component) => [component.id, component])),
    [manifest.components],
  );

  const pageKeys = useMemo(() => Object.keys(editor.state.document.pageLayouts), [
    editor.state.document.pageLayouts,
  ]);

  const instanceCounts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(editor.state.document.pageLayouts).map(([key, list]) => [
          key,
          list.length,
        ]),
      ),
    [editor.state.document.pageLayouts],
  );

  const activeInstances = useMemo(
    () => editor.state.document.pageLayouts[editor.state.activePageKey] ?? [],
    [editor.state.document.pageLayouts, editor.state.activePageKey],
  );

  const selectedInstance = useMemo(() => {
    const selection = editor.state.selection;
    if (selection.kind !== 'instance') return undefined;
    const { instanceId } = selection;
    return activeInstances.find((instance) => instance.instanceId === instanceId);
  }, [editor.state.selection, activeInstances]);

  const selectedManifest =
    editor.state.selection.kind === 'instance' && selectedInstance
      ? manifestsById.get(selectedInstance.componentId)
      : undefined;

  const selectedInstanceId =
    editor.state.selection.kind === 'instance' && selectedInstance
      ? selectedInstance.instanceId
      : null;

  // Ask for a preview token the first time a draft preview is requested.
  //
  // A token is the *portable* way to authorise a draft read: it survives the
  // iframe being on another origin, where the Studio's session cookie is not
  // sent. It is still attempted when the Studio is cookie-authenticated, because
  // "cookie auth" and "the frame is cross-origin" are independent facts — the
  // engine route is public and the portal's request carries no Studio cookie.
  //
  // Minting can legitimately fail (no project secret key). That must not block
  // the preview: the frame may still load via the dashboard session when the
  // portal is same-origin. So the failure is a dismissible notice, not a wall.
  useEffect(() => {
    if (previewMode !== 'draft' || previewToken) return;
    let cancelled = false;
    void mintToken
      .mutateAsync()
      .then((result) => {
        if (cancelled) return;
        if (result.ok && result.token) setPreviewToken(result.token);
        else setPreviewError(result.reason ?? 'Could not mint a preview link.');
      })
      .catch((error: Error) => {
        if (!cancelled) setPreviewError(error.message);
      });
    return () => {
      cancelled = true;
    };
    // `mintToken` is stable per project; re-running on token change is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, projectId, previewToken]);

  // Keyboard. Two layers, deliberately:
  //
  //   • Meta combos (⌘K, ⌘F, ⌘D) work even while an input is focused — that is
  //     where an author looks for them, and the browser's own ⌘D bookmark dialog
  //     is only suppressed when there is actually something to duplicate.
  //   • Plain keys (⌫, 1, 2, ⇧F, ?) and Escape are ignored while typing; a
  //     Backspace in a text field must never delete a component.
  //
  // Undo/redo/save stay registered in the editor store; they operate on the
  // document and are page-agnostic.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      const lower = event.key.toLowerCase();

      if (meta && lower === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (meta && lower === 'f') {
        event.preventDefault();
        setFocusMode(false);
        setTool('find');
        return;
      }
      if (meta && lower === 'd' && selectedInstanceId) {
        event.preventDefault();
        editor.helpers.duplicateComponent(
          editor.state.activePageKey,
          selectedInstanceId,
        );
        return;
      }

      if (event.key === 'Escape') {
        // Close topmost first: palette → shortcuts → focus → tool → selection.
        if (paletteOpen) {
          setPaletteOpen(false);
          return;
        }
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (focusMode) {
          setFocusMode(false);
          return;
        }
        if (tool) {
          setTool(null);
          return;
        }
        editor.select({ kind: 'none' });
        return;
      }
      if (isTypingTarget(event.target)) return;

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedInstanceId) {
        event.preventDefault();
        editor.helpers.removeComponent(editor.state.activePageKey, selectedInstanceId);
        return;
      }
      if (event.key === '?') {
        setShortcutsOpen(true);
        return;
      }
      if (event.shiftKey && !meta && lower === 'f') {
        setFocusMode((mode) => !mode);
        return;
      }
      if (!event.shiftKey && !meta && event.key === '1') {
        setPreviewMode('draft');
        return;
      }
      if (!event.shiftKey && !meta && event.key === '2') {
        setPreviewMode('live');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    editor,
    selectedInstanceId,
    paletteOpen,
    shortcutsOpen,
    focusMode,
    tool,
  ]);

  // Command palette inventory. Built fresh on state that its items read; the
  // palette itself filters, so a generous list is cheap.
  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    const activePageKey = editor.state.activePageKey;
    const conflict = editor.state.saveState.status === 'conflict';

    for (const pageKey of pageKeys) {
      items.push({
        id: `page-${pageKey}`,
        label: `Go to /${pageKey}`,
        hint: `${instanceCounts[pageKey] ?? 0} layers`,
        group: 'Pages',
        icon: <FileText size={13} />,
        keywords: 'page navigate goto',
        run: () => editor.setActivePage(pageKey),
      });
    }

    for (const component of manifest.components) {
      items.push({
        id: `insert-${component.id}`,
        label: `Add ${component.name}`,
        hint: component.id,
        group: 'Insert',
        icon: <Plus size={13} />,
        keywords: `insert add ${component.category}`,
        run: () => {
          editor.helpers.addComponent(activePageKey, {
            componentId: component.id,
            props: {},
          });
          toast.success(`Added ${component.name}`, {
            description: `Dropped onto /${activePageKey}`,
          });
        },
      });
    }

    items.push(
      {
        id: 'tile-desktop',
        label: 'Preview: Desktop',
        group: 'Preview',
        icon: <Monitor size={13} />,
        keywords: 'device responsive width',
        run: () => setDevice('desktop'),
      },
      {
        id: 'tile-tablet',
        label: 'Preview: Tablet',
        group: 'Preview',
        icon: <Tablet size={13} />,
        keywords: 'device responsive width',
        run: () => setDevice('tablet'),
      },
      {
        id: 'tile-mobile',
        label: 'Preview: Mobile',
        group: 'Preview',
        icon: <Smartphone size={13} />,
        keywords: 'device responsive width',
        run: () => setDevice('mobile'),
      },
      {
        id: 'mode-draft',
        label: 'Preview: Draft revision',
        group: 'Preview',
        icon: <Eye size={13} />,
        keywords: 'draft unpublished render',
        run: () => setPreviewMode('draft'),
      },
      {
        id: 'mode-live',
        label: 'Preview: Live revision',
        group: 'Preview',
        icon: <Eye size={13} />,
        keywords: 'live published render visitors',
        run: () => setPreviewMode('live'),
      },
      {
        id: 'focus',
        label: focusMode ? 'Exit focus mode' : 'Focus the preview',
        hint: '⇧F',
        group: 'Preview',
        icon: <Focus size={13} />,
        keywords: 'zen fullscreen hide panels',
        run: () => setFocusMode((mode) => !mode),
      },
      {
        id: 'theme',
        label: theme.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        group: 'Preview',
        icon: <Settings2 size={13} />,
        keywords: 'dark light appearance',
        run: theme.toggle,
      },
    );

    items.push(
      {
        id: 'tool-find',
        label: 'Find in workspace',
        hint: '⌘F',
        group: 'Tools',
        icon: <Search size={13} />,
        keywords: 'search text props tokens copy',
        run: () => {
          setFocusMode(false);
          setTool('find');
        },
      },
      {
        id: 'tool-bindings',
        label: 'Data bindings',
        group: 'Tools',
        icon: <Database size={13} />,
        keywords: 'binding data source endpoint',
        run: () => setTool('bindings'),
      },
      {
        id: 'tool-diagnostics',
        label: `Compiler diagnostics${
          editor.state.diagnostics.length > 0 ? ` (${editor.state.diagnostics.length})` : ''
        }`,
        group: 'Tools',
        icon: <TriangleAlert size={13} />,
        keywords: 'errors warnings compiler notes',
        run: () => setTool('diagnostics'),
      },
      {
        id: 'tool-activity',
        label: 'Edit activity',
        group: 'Tools',
        icon: <Activity size={13} />,
        keywords: 'pending queue unsaved timeline',
        run: () => setTool('activity'),
      },
      {
        id: 'tool-json',
        label: 'Document JSON',
        group: 'Tools',
        icon: <Braces size={13} />,
        keywords: 'raw export document',
        run: () => setTool('json'),
      },
      {
        id: 'tool-shortcuts',
        label: 'Keyboard shortcuts',
        hint: '?',
        group: 'Tools',
        icon: <Keyboard size={13} />,
        keywords: 'help keys',
        run: () => setShortcutsOpen(true),
      },
    );

    items.push(
      {
        id: 'act-undo',
        label: 'Undo',
        hint: '⌘Z',
        group: 'Actions',
        icon: <Undo2 size={13} />,
        keywords: 'reverse revert',
        run: () => editor.undo(),
      },
      {
        id: 'act-redo',
        label: 'Redo',
        hint: '⇧⌘Z',
        group: 'Actions',
        icon: <Redo2 size={13} />,
        keywords: 'reapply',
        run: () => editor.redo(),
      },
      {
        id: 'act-save',
        label: 'Save now',
        hint: '⌘S',
        group: 'Actions',
        icon: <Save size={13} />,
        keywords: 'commit flush',
        run: () => void editor.saveNow(),
      },
      {
        id: 'act-gallery',
        label: 'Open template gallery',
        group: 'Actions',
        icon: <LayoutTemplate size={13} />,
        keywords: 'templates themes marketplace starter',
        run: () => setGalleryOpen(true),
      },
      {
        id: 'act-history',
        label: 'Open revision history',
        group: 'Actions',
        icon: <FileClock size={13} />,
        keywords: 'revisions diff rollback audit',
        run: () => {
          setRightTab('history');
          setRightOpen(true);
        },
      },
      {
        id: 'act-tokens',
        label: 'Open design tokens',
        group: 'Actions',
        icon: <SlidersHorizontal size={13} />,
        keywords: 'colours theme styles',
        run: () => {
          setRightTab('tokens');
          setRightOpen(true);
        },
      },
      {
        id: 'act-publish',
        label: 'Publish draft',
        hint: conflict ? 'resolve the conflict first' : undefined,
        group: 'Actions',
        icon: <Rocket size={13} />,
        keywords: 'ship deploy live release',
        run: () => handlePublish(),
      },
    );

    return items;
  }, [
    editor,
    pageKeys,
    instanceCounts,
    manifest.components,
    theme.theme,
    theme.toggle,
    focusMode,
  ]);

  const previewPath = previewPathFor(editor.state.activePageKey);

  const handlePublish = () => {
    void publish
      .mutateAsync(undefined)
      .then(() => {
        setPreviewMode('live');
        void editor.reload();
      })
      .catch(() => {
        /* toast already shown by the hook */
      });
  };

  const handleDiscard = () => {
    void discard
      .mutateAsync()
      .then(() => editor.reload())
      .catch(() => undefined);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <Toolbar
        projectName={manifest.projectName}
        workspaceMode={manifest.workspaceMode}
        saveState={editor.state.saveState}
        dirty={editor.state.dirty}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        liveRevision={liveRevisionNow}
        draftRevision={draftRevisionNow}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onSave={() => void editor.saveNow()}
        onReload={() => void editor.reload()}
        onOpenGallery={() => setGalleryOpen(true)}
        onOpenHistory={() => {
          setRightTab('history');
          setRightOpen(true);
        }}
        onOpenTokens={() => {
          setRightTab('tokens');
          setRightOpen(true);
        }}
        onPublish={handlePublish}
        onDiscardDraft={handleDiscard}
        previewMode={previewMode}
        onPreviewModeChange={setPreviewMode}
        publishing={publish.isPending}
        discarding={discard.isPending}
      />

        {showDiagnostics ? (
          <DiagnosticsBar
            diagnostics={editor.state.diagnostics}
            onDismiss={() => setDismissedDiagnostics(diagnosticsSignature)}
          />
        ) : null}

      {editor.state.saveState.status === 'conflict' ? (
        <ConflictBanner
          message={editor.state.saveState.message}
          onTakeTheirs={() => void editor.resolveConflict()}
          onKeepMine={() => void editor.forceSave()}
        />
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Tool rail: find / bindings / diagnostics / activity / json / focus.
            Stays visible in focus mode — it is how you get back out. */}
        <ToolRail
          active={[tool, focusMode ? 'focus' : null].find(Boolean) ?? ''}
          onSelect={(id) =>
            setTool((current) => (current === id ? null : (id as ToolId)))
          }
          items={[
            { id: 'find', label: 'Find in workspace', icon: <Search size={16} /> },
            {
              id: 'bindings',
              label: 'Data bindings',
              icon: <Database size={16} />,
            },
            {
              id: 'diagnostics',
              label: 'Compiler diagnostics',
              icon: <TriangleAlert size={16} />,
              badge: editor.state.diagnostics.length,
            },
            {
              id: 'activity',
              label: 'Edit activity',
              icon: <Activity size={16} />,
              badge: editor.state.pending.length,
            },
            { id: 'json', label: 'Document JSON', icon: <Braces size={16} /> },
            { id: 'focus', label: 'Focus preview', icon: <Focus size={16} /> },
          ]}
        />

        {/* Transient tool column — one tool at a time. */}
        {tool ? (
          <aside className="hidden w-80 shrink-0 flex-col overflow-hidden border-r border-[var(--color-line)] bg-[var(--color-panel)] lg:flex">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-line)] px-3 py-2">
              <h3 className="text-xs font-semibold tracking-wide text-[var(--color-ink-dim)] uppercase">
                {tool === 'find'
                  ? 'Find'
                  : tool === 'bindings'
                    ? 'Bindings'
                    : tool === 'diagnostics'
                      ? 'Diagnostics'
                      : tool === 'activity'
                        ? 'Activity'
                        : 'Document JSON'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close tool"
                onClick={() => setTool(null)}
              >
                <PanelRightClose size={14} />
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              {tool === 'find' ? (
                <FindPanel
                  pageLayouts={editor.state.document.pageLayouts}
                  tokens={editor.state.document.globalTokens}
                  i18n={editor.state.document.i18n}
                  manifests={manifestsById}
                  onOpenPage={(pageKey) => editor.setActivePage(pageKey)}
                  onOpenInstance={(pageKey, instanceId) => {
                    editor.setActivePage(pageKey);
                    editor.select({ kind: 'instance', pageKey, instanceId });
                  }}
                  onOpenTokens={() => {
                    setRightTab('tokens');
                    setRightOpen(true);
                  }}
                  onOpenI18n={() => {
                    setRightTab('i18n');
                    setRightOpen(true);
                  }}
                />
              ) : null}
              {tool === 'bindings' ? (
                <BindingsPanel
                  pageLayouts={editor.state.document.pageLayouts}
                  manifests={manifestsById}
                  dataSources={manifest.dataSources}
                  disabled={conflict}
                  onSelect={(pageKey, instanceId) => {
                    editor.setActivePage(pageKey);
                    editor.select({ kind: 'instance', pageKey, instanceId });
                  }}
                  onClear={(pageKey, instanceId) =>
                    editor.helpers.setBinding(pageKey, instanceId, null)
                  }
                />
              ) : null}
              {tool === 'diagnostics' ? (
                <DiagnosticsPanel diagnostics={editor.state.diagnostics} />
              ) : null}
              {tool === 'activity' ? (
                <ActivityPanel
                  pending={editor.state.pending}
                  undoStack={editor.state.undoStack}
                />
              ) : null}
              {tool === 'json' ? (
                <DocumentJsonPanel document={editor.state.document} />
              ) : null}
            </div>
          </aside>
        ) : null}

        {/* Palette rail */}
        {!focusMode ? (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-panel)] xl:flex">
          <div className="border-b border-[var(--color-line)] px-3 py-2.5">
            <h3 className="text-xs font-semibold tracking-wide text-[var(--color-ink-dim)] uppercase">
              Components
            </h3>
            <p className="text-[10px] text-[var(--color-ink-faint)]">
              {manifest.componentCount} available in this mode
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <Palette
              categories={manifest.categories}
              onAdd={(component) => {
                editor.helpers.addComponent(editor.state.activePageKey, {
                  componentId: component.id,
                  props: {},
                });
                toast.success(`Added ${component.name}`);
              }}
            />
          </div>
        </aside>
        ) : null}

        {/* Middle column: pages + layers */}
        {!focusMode ? (
        <section className="hidden w-72 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-panel)] lg:flex">
          <div className="shrink-0 border-b border-[var(--color-line)] p-2">
            <Segmented
              value={leftTab}
              onChange={setLeftTab}
              options={[
                { value: 'pages', label: 'Pages', icon: <Boxes size={12} /> },
                { value: 'layers', label: 'Layers', icon: <SlidersHorizontal size={12} /> },
              ]}
              className="w-full"
            />
          </div>

          <div className="min-h-0 flex-1">
            {leftTab === 'pages' ? (
              <PagesPanel
                pageCatalog={manifest.pageCatalog}
                pageKeys={pageKeys}
                activePageKey={editor.state.activePageKey}
                instanceCounts={instanceCounts}
                disabled={editor.state.saveState.status === 'conflict'}
                onSelect={(pageKey) => editor.setActivePage(pageKey)}
                onCreate={editor.helpers.createPage}
                onRename={editor.helpers.renamePage}
                onDelete={(pageKey) => {
                  editor.helpers.deletePage(pageKey);
                  if (editor.state.activePageKey === pageKey) {
                    const fallback = pageKeys.find((key) => key !== pageKey);
                    if (fallback) editor.setActivePage(fallback);
                  }
                }}
              />
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-line)] px-3 py-2">
                  <span className="font-mono text-[11px] text-[var(--color-ink-dim)]">
                    /{editor.state.activePageKey}
                  </span>
                  <Badge>{activeInstances.length}</Badge>
                </header>
                <div className="scroll-y min-h-0 flex-1">
                  <LayerList
                    instances={activeInstances}
                    manifests={manifestsById}
                    selectedInstanceId={
                      editor.state.selection.kind === 'instance'
                        ? editor.state.selection.instanceId
                        : null
                    }
                    collapsed={editor.state.collapsed}
                    disabled={editor.state.saveState.status === 'conflict'}
                    onSelect={(instanceId) =>
                      editor.select({
                        kind: 'instance',
                        pageKey: editor.state.activePageKey,
                        instanceId,
                      })
                    }
                    onToggleCollapse={editor.toggleCollapse}
                    onMove={(instanceId, toIndex) =>
                      editor.helpers.moveComponent(
                        editor.state.activePageKey,
                        instanceId,
                        toIndex,
                      )
                    }
                    onRemove={(instanceId) =>
                      editor.helpers.removeComponent(editor.state.activePageKey, instanceId)
                    }
                    onDuplicate={(instanceId) =>
                      editor.helpers.duplicateComponent(editor.state.activePageKey, instanceId)
                    }
                    onToggleVisibility={(instanceId, visible) =>
                      editor.helpers.setVisibility(
                        editor.state.activePageKey,
                        instanceId,
                        visible,
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </section>
        ) : null}

        {/* Preview */}
        <main className="min-w-0 flex-1">
          <PreviewCanvas
            projectId={projectId}
            pageKey={editor.state.activePageKey}
            mode={previewMode}
            device={device}
            onDeviceChange={setDevice}
            previewPath={previewPath}
            previewToken={previewToken}
            previewError={previewError}
            issuingToken={mintToken.isPending}
            onRequestToken={() => {
              setPreviewError(null);
              setPreviewToken(null);
            }}
            frameOrigin={process.env.NEXT_PUBLIC_PREVIEW_ORIGIN}
            useProxy={process.env.NEXT_PUBLIC_PREVIEW_PROXY === '1'}
            zoom={zoom}
            onZoomChange={setZoom}
          />
        </main>

        {/* Right column */}
        {!focusMode ? (
        <aside
          className={cn(
            'flex shrink-0 flex-col border-l border-[var(--color-line)] bg-[var(--color-panel)] transition-[width]',
            rightOpen ? 'w-80' : 'w-10',
          )}
        >
          {rightOpen ? (
            <>
              <div className="flex shrink-0 items-center gap-1 border-b border-[var(--color-line)] p-2">
                <RightTabs value={rightTab} onChange={setRightTab} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRightOpen(false)}
                  aria-label="Collapse panel"
                >
                  <PanelRightClose size={14} />
                </Button>
              </div>

              <div className="min-h-0 flex-1">
                {rightTab === 'inspector' ? (
                  <Inspector
                    manifest={selectedManifest}
                    instance={selectedInstance}
                    dataSources={manifest.dataSources}
                    disabled={editor.state.saveState.status === 'conflict'}
                    onChangeProps={(props) => {
                      if (selectedInstance?.instanceId) {
                        editor.helpers.updateProps(
                          editor.state.activePageKey,
                          selectedInstance.instanceId,
                          props,
                        );
                      }
                    }}
                    onChangeLayout={(layout) => {
                      if (selectedInstance?.instanceId) {
                        editor.helpers.setLayout(
                          editor.state.activePageKey,
                          selectedInstance.instanceId,
                          layout,
                        );
                      }
                    }}
                    onChangeVisibility={(visible) => {
                      if (selectedInstance?.instanceId) {
                        editor.helpers.setVisibility(
                          editor.state.activePageKey,
                          selectedInstance.instanceId,
                          visible,
                        );
                      }
                    }}
                    onChangeBinding={(binding) => {
                      if (selectedInstance?.instanceId) {
                        editor.helpers.setBinding(
                          editor.state.activePageKey,
                          selectedInstance.instanceId,
                          binding,
                        );
                      }
                    }}
                  />
                ) : null}

                {rightTab === 'tokens' ? (
                  <TokenPanel
                    tokens={editor.state.document.globalTokens}
                    baseTokens={manifest.baseTokens}
                    disabled={editor.state.saveState.status === 'conflict'}
                    onChange={editor.helpers.updateToken}
                    onRemove={editor.helpers.removeToken}
                    onBulkUpdate={editor.helpers.bulkUpdateTokens}
                  />
                ) : null}

                {rightTab === 'seo' ? (
                  <SeoPanel
                    pageKey={editor.state.activePageKey}
                    seo={editor.state.document.seo[editor.state.activePageKey] ?? {}}
                    tokens={editor.state.document.globalTokens}
                    disabled={editor.state.saveState.status === 'conflict'}
                    onChange={(patch) =>
                      editor.helpers.updateSeo(editor.state.activePageKey, patch)
                    }
                  />
                ) : null}

                {rightTab === 'i18n' ? (
                  <I18nPanel
                    i18n={editor.state.document.i18n}
                    defaultLocale={
                      typeof editor.state.document.globalTokens.locale === 'string'
                        ? editor.state.document.globalTokens.locale
                        : 'en'
                    }
                    disabled={editor.state.saveState.status === 'conflict'}
                    onChange={(locale, strings) =>
                      editor.dispatchOperation(
                        { op: 'i18n.update', locale, strings },
                        `Edited ${locale} strings`,
                      )
                    }
                    onRemoveLocale={(locale) =>
                      editor.dispatchOperation(
                        { op: 'i18n.remove', locale },
                        `Removed the ${locale} locale`,
                      )
                    }
                  />
                ) : null}

                {rightTab === 'history' ? (
                  <HistoryPanel
                    revisions={history.data?.revisions ?? []}
                    isLoading={history.isPending}
                    liveRevision={history.data?.liveRevision ?? liveRevisionNow}
                    draftRevision={history.data?.draftRevision ?? draftRevisionNow}
                    isDirty={editor.state.dirty}
                    disabled={revert.isPending}
                    onRollback={(revision) =>
                      void revert
                        .mutateAsync({ revision })
                        .then(() => editor.reload())
                        .catch(() => undefined)
                    }
                    diff={diff.data}
                    diffLoading={diff.isFetching}
                    onRequestDiff={(from, to) => setDiffPair({ from, to })}
                    onClearDiff={() => setDiffPair(null)}
                  />
                ) : null}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setRightOpen(true)}
              className="focus-ring flex h-full w-full flex-col items-center gap-2 pt-3 text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]"
              aria-label="Expand panel"
            >
              <PanelRightOpen size={14} />
              <span
                className="text-[10px] tracking-wider uppercase"
                style={{ writingMode: 'vertical-rl' }}
              >
                {rightTab}
              </span>
            </button>
          )}
        </aside>
        ) : null}
      </div>

      <StatusBar
        pageKey={editor.state.activePageKey}
        instanceCount={activeInstances.length}
        pendingCount={editor.state.pending.length}
        draftRevision={draftRevisionNow}
        liveRevision={liveRevisionNow}
        diagnosticsCount={editor.state.diagnostics.length}
        device={device}
        zoom={zoom}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={commandItems}
      />
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <GalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        templates={gallery.data?.templates ?? []}
        categories={gallery.data?.categories ?? []}
        installedTemplateKey={gallery.data?.installedTemplateKey ?? null}
        installedTemplateKind={gallery.data?.installedInstallKind ?? null}
        isLoading={gallery.isPending}
        currentTemplateId={templateId}
        hasUnpublishedChanges={draftRevisionNow !== liveRevisionNow || editor.state.dirty}
        workspaceMode={manifest.workspaceMode}
        isApplying={selectTemplate.isPending}
        onSelect={(templateId_, publishImmediately) =>
          void selectTemplate
            .mutateAsync({ templateId: templateId_, publishImmediately })
            .then(() => {
              setGalleryOpen(false);
              void editor.reload();
            })
            .catch(() => undefined)
        }
      />
    </div>
  );
}

function RightTabs({
  value,
  onChange,
}: {
  value: RightTab;
  onChange: (tab: RightTab) => void;
}) {
  const tabs: { value: RightTab; icon: React.ReactNode; label: string }[] = [
    { value: 'inspector', icon: <Settings2 size={13} />, label: 'Style' },
    { value: 'tokens', icon: <SlidersHorizontal size={13} />, label: 'Tokens' },
    { value: 'seo', icon: <Search size={13} />, label: 'SEO' },
    { value: 'i18n', icon: <Boxes size={13} />, label: 'i18n' },
    { value: 'history', icon: <FileClock size={13} />, label: 'History' },
  ];
  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          title={tab.label}
          aria-label={tab.label}
          className={cn(
            'focus-ring flex flex-1 items-center justify-center rounded-md py-1.5',
            value === tab.value
              ? 'bg-[var(--color-panel-2)] text-[var(--color-ink)]'
              : 'text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]',
          )}
        >
          {tab.icon}
        </button>
      ))}
    </div>
  );
}

function ConflictBanner({
  message,
  onTakeTheirs,
  onKeepMine,
}: {
  message: string;
  onTakeTheirs: () => void;
  onKeepMine: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start gap-2 border-b border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 px-3 py-2">
      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--color-warn)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-[var(--color-warn)]">
          Your edits are paused — the workspace changed elsewhere
        </p>
        <p className="text-[10px] leading-relaxed text-[var(--color-ink-dim)]">
          {message} Autosave is stopped until you choose; nothing is retried behind
          your back.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="secondary" size="sm" onClick={onTakeTheirs}>
          Use their version
        </Button>
        <Button variant="danger" size="sm" onClick={onKeepMine}>
          Overwrite with mine
        </Button>
      </div>
    </div>
  );
}

function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-[var(--color-ink-faint)]">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-xs">{label}</span>
      </div>
    </div>
  );
}

function FullPageError({
  title,
  message,
  projectId,
}: {
  title: string;
  message: string;
  projectId: string;
}) {
  return (
    <div className="flex h-screen items-center justify-center p-6">
      <div className="surface max-w-lg rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          <div className="space-y-2">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs leading-relaxed text-[var(--color-ink-dim)]">{message}</p>
            <p className="font-mono text-[10px] text-[var(--color-ink-faint)]">
              project {projectId}
            </p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
