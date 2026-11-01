// studio/src/lib/gnapex-studio/store.ts
import { create } from "zustand";
import type { WorkspaceDocument, WorkspaceOperation } from "../contract";
import type { EditorSelection, ViewportKey } from "./types";
import type { StudioNodeBounds } from "./bridge-protocol";

export type BridgeStatus = "connecting" | "active" | "unavailable";
export type ExplorerTab = "structure" | "layers";

/** The rail stations. `explorer` is the Pages surface; the rest are workspaces. */
export const ACTIVE_STATIONS = [
  "explorer",
  "setups",
  "palette",
  "library",
  "states",
  "gora",
  "assets",
  "revisions",
  "settings",
] as const;

export type ActiveStation = (typeof ACTIVE_STATIONS)[number];

/** Validate an arbitrary query-string value before it reaches the store. */
export function isActiveStation(value: unknown): value is ActiveStation {
  return (
    typeof value === "string" &&
    (ACTIVE_STATIONS as readonly string[]).includes(value)
  );
}

/** Page-explorer stage: the folder overview vs. an open page canvas. */
export type StageMode = "DIRECTORY_OVERVIEW" | "CANVAS_EDIT";

/** Site-user state simulation, mirrored into the preview frame via the bridge. */
export type SimulationState =
  | "normal"
  | "loading"
  | "empty"
  | "validation_error"
  | "auth_error"
  | "offline";

export interface EditorMeta {
  projectId: string;
  projectName: string;
  workspaceMode: string;
}

/**
 * Which sub-view of a station is showing. The station sidebar sets it; the
 * stage renders it. One flat field keeps rail→panel→stage wiring obvious.
 */
export type StationPanelKey = string | null;

export interface EditorStore {
  // ── boot data ──
  meta: EditorMeta | null;
  document: WorkspaceDocument | null;

  // ── rail & stage ──
  activeStation: ActiveStation;
  stageMode: StageMode;
  stationPanelKey: StationPanelKey;
  activeTemplateIndex: number;

  // ── directory & VFS navigation ──
  activeDirectoryId: string | null;
  activeFileKey: string | null;
  vfsPath: string[];

  // ── selection & canvas ──
  selection: EditorSelection;
  hoverInstanceId: string | null;
  viewport: ViewportKey;
  bridgeStatus: BridgeStatus;
  bridgeError: string | null;
  previewPageKey: string | null;
  bounds: Record<string, StudioNodeBounds>;
  frameNonce: number;

  // ── simulator ──
  simulationState: SimulationState;

  // ── panels ──
  explorerTab: ExplorerTab;
  bottomDrawer: "Layers" | "Console" | "Accessibility" | null;

  // ── edits ──
  pendingOps: WorkspaceOperation[];
  lastSavedAt: number | null;
  saveError: string | null;
  previewNodeCatalog: Record<string, string>;

  // ── actions: rail & stage ──
  setActiveStation: (station: ActiveStation) => void;
  setStageMode: (mode: StageMode) => void;
  setStationPanelKey: (key: StationPanelKey) => void;

  // ── actions: simulator ──
  setSimulationState: (state: SimulationState) => void;

  // ── actions: directory & VFS navigation ──
  navigateToDirectory: (dirId: string | null) => void;
  openPageCanvas: (pageKey: string) => void;
  navToOverview: () => void;
  navToFolder: (path: string[]) => void;
  openFile: (path: string[], fileKey: string) => void;
  restoreExplorerLocation: (path: string[], fileKey: string | null) => void;

  // ── actions: boot data ──
  setMeta: (meta: EditorMeta) => void;
  hydrateDocument: (document: WorkspaceDocument) => void;
  adoptServerDocument: (document: WorkspaceDocument, savedAt: number) => void;

  // ── actions: selection ──
  selectWorkspace: () => void;
  selectPage: (pageKey: string) => void;
  selectInstance: (pageKey: string, instanceId: string) => void;
  clearInstanceSelection: () => void;
  setHover: (instanceId: string | null) => void;
  selectFromPreview: (pageKey: string | null, instanceId: string) => void;

  // ── actions: canvas ──
  setViewport: (viewport: ViewportKey) => void;
  setBridgeStatus: (status: BridgeStatus, error?: string) => void;
  setPreviewPageKey: (pageKey: string) => void;
  recordBounds: (instanceId: string, bounds: StudioNodeBounds | null) => void;
  clearBounds: () => void;
  bumpFrame: () => void;
  setExplorerTab: (tab: ExplorerTab) => void;
  setBottomDrawer: (
    drawer: "Layers" | "Console" | "Accessibility" | null,
  ) => void;

  setPreviewNodeCatalog: (
    entries: { instanceId: string; componentId: string }[],
  ) => void;

  stageProps: (
    pageKey: string,
    instanceId: string,
    props: Record<string, unknown>,
  ) => void;
  takePendingOps: () => WorkspaceOperation[];
  clearSaveError: () => void;
  invalidateAll: () => void;
}

export const store = create<EditorStore>((set, get) => ({
  meta: null,
  document: null,

  activeStation: "explorer",
  stageMode: "DIRECTORY_OVERVIEW",
  stationPanelKey: null,
  activeTemplateIndex: 0,

  activeDirectoryId: null,
  activeFileKey: null,
  vfsPath: [],

  selection: { scope: "workspace", pageKey: null, instanceId: null },
  hoverInstanceId: null,
  viewport: "desktop",
  bridgeStatus: "connecting",
  bridgeError: null,
  previewPageKey: null,
  bounds: {},
  frameNonce: 0,

  simulationState: "normal",

  explorerTab: "structure",
  bottomDrawer: null,

  pendingOps: [],
  lastSavedAt: null,
  saveError: null,
  previewNodeCatalog: {},

  setActiveStation: (station) =>
    set({ activeStation: station, stationPanelKey: null }),

  setStageMode: (mode) => set({ stageMode: mode }),

  setStationPanelKey: (key) => set({ stationPanelKey: key }),

  setSimulationState: (simulationState) =>
    set({ simulationState, bottomDrawer: null }),

  navigateToDirectory: (dirId) =>
    set({
      activeStation: "explorer",
      stageMode: "DIRECTORY_OVERVIEW",
      activeDirectoryId: dirId,
      activeFileKey: null,
      previewPageKey: null,
      vfsPath: dirId ? [dirId] : [],
      selection: {
        scope: dirId ? "page" : "workspace",
        pageKey: dirId,
        instanceId: null,
      },
    }),

  openPageCanvas: (pageKey) =>
    set({
      activeStation: "explorer",
      stageMode: "CANVAS_EDIT",
      activeFileKey: pageKey,
      previewPageKey: pageKey,
      selection: {
        scope: "page",
        pageKey,
        instanceId: null,
      },
    }),

  navToOverview: () =>
    set({
      activeStation: "explorer",
      stageMode: "DIRECTORY_OVERVIEW",
      activeDirectoryId: null,
      activeFileKey: null,
      previewPageKey: null,
      vfsPath: [],
      selection: { scope: "workspace", pageKey: null, instanceId: null },
    }),

  navToFolder: (path) => {
    const dirId = path[path.length - 1] ?? null;
    set({
      activeStation: "explorer",
      stageMode: "DIRECTORY_OVERVIEW",
      activeDirectoryId: dirId,
      activeFileKey: null,
      vfsPath: path,
      selection: { scope: "page", pageKey: dirId, instanceId: null },
    });
  },

  openFile: (path, fileKey) =>
    set({
      activeStation: "explorer",
      stageMode: "CANVAS_EDIT",
      activeDirectoryId: path[path.length - 1] ?? null,
      activeFileKey: fileKey,
      previewPageKey: fileKey,
      vfsPath: path,
      selection: { scope: "page", pageKey: fileKey, instanceId: null },
    }),

  // URL restoration must not steal the active station. A link such as
  // `/editor/auth/login?station=palette` restores the Pages location underneath
  // Palette, so clicking Pages returns to that exact folder/file.
  restoreExplorerLocation: (path, fileKey) => {
    const directoryId = path[path.length - 1] ?? null;
    set({
      stageMode: fileKey ? "CANVAS_EDIT" : "DIRECTORY_OVERVIEW",
      activeDirectoryId: directoryId,
      activeFileKey: fileKey,
      previewPageKey: fileKey,
      vfsPath: path,
      selection: fileKey
        ? { scope: "page", pageKey: fileKey, instanceId: null }
        : path.length
          ? { scope: "page", pageKey: directoryId, instanceId: null }
          : { scope: "workspace", pageKey: null, instanceId: null },
    });
  },

  setMeta: (meta) => set({ meta }),

  hydrateDocument: (document) => {
    const state = get();
    set({
      document,
      meta:
        state.meta ??
        ({
          projectId: document.projectId,
          projectName: document.projectId,
          workspaceMode: document.workspaceMode,
        } satisfies EditorMeta),
    });
  },

  adoptServerDocument: (document, savedAt) =>
    set({
      document,
      lastSavedAt: savedAt,
      saveError: null,
    }),

  selectWorkspace: () =>
    set({
      activeStation: "explorer",
      stageMode: "DIRECTORY_OVERVIEW",
      activeDirectoryId: null,
      activeFileKey: null,
      previewPageKey: null,
      vfsPath: [],
      selection: { scope: "workspace", pageKey: null, instanceId: null },
      hoverInstanceId: null,
    }),

  selectPage: (pageKey) =>
    set({
      activeStation: "explorer",
      stageMode: "CANVAS_EDIT",
      activeFileKey: pageKey,
      previewPageKey: pageKey,
      selection: { scope: "page", pageKey, instanceId: null },
      hoverInstanceId: null,
    }),

  selectInstance: (pageKey, instanceId) =>
    set({
      selection: { scope: "component", pageKey, instanceId },
    }),

  clearInstanceSelection: () => {
    const { selection } = get();
    set({
      selection: {
        scope: "page",
        pageKey: selection.pageKey,
        instanceId: null,
      },
    });
  },

  setHover: (instanceId) => set({ hoverInstanceId: instanceId }),

  selectFromPreview: (pageKey, instanceId) => {
    const state = get();
    const settled = pageKey ?? state.selection.pageKey;
    set({
      selection: { scope: "component", pageKey: settled, instanceId },
      explorerTab: "layers",
    });
  },

  setViewport: (viewport) => set({ viewport }),
  setBridgeStatus: (status, error) =>
    set({ bridgeStatus: status, bridgeError: error ?? null }),
  setPreviewPageKey: (pageKey) => set({ previewPageKey: pageKey }),
  recordBounds: (instanceId, bounds) => {
    if (bounds) set({ bounds: { ...get().bounds, [instanceId]: bounds } });
  },
  clearBounds: () => set({ bounds: {} }),
  bumpFrame: () => set((s) => ({ frameNonce: s.frameNonce + 1 })),
  setExplorerTab: (tab) => set({ explorerTab: tab }),
  setBottomDrawer: (bottomDrawer) => set({ bottomDrawer }),

  setPreviewNodeCatalog: (entries) =>
    set({
      previewNodeCatalog: Object.fromEntries(
        entries.map((e) => [e.instanceId, e.componentId]),
      ),
    }),

  stageProps: (pageKey, instanceId, props) => {
    const state = get();
    const document = state.document;
    if (!document) return;
    const layout = [...(document.pageLayouts?.[pageKey] ?? [])];
    const index = layout.findIndex(
      (i) => (i.instanceId ?? `${pageKey}#${layout.indexOf(i)}`) === instanceId,
    );
    if (index < 0) return;
    const current = layout[index];
    layout[index] = {
      ...current,
      props: { ...current.props, ...props },
    };

    set({
      document: {
        ...document,
        pageLayouts: { ...document.pageLayouts, [pageKey]: layout },
        isDirty: true,
      },
      pendingOps: [
        ...state.pendingOps,
        { op: "node.updateProps", pageKey, instanceId, props },
      ],
    });
  },

  takePendingOps: () => {
    const ops = get().pendingOps;
    set({ pendingOps: [] });
    return ops;
  },

  clearSaveError: () => set({ saveError: null }),

  invalidateAll: () =>
    set({
      pendingOps: [],
      bounds: {},
      lastSavedAt: Date.now(),
    }),
}));

export function getSelection(): EditorSelection & {
  bounds: Record<string, StudioNodeBounds>;
} {
  const state = store.getState();
  return { ...state.selection, bounds: state.bounds };
}
