// studio/src/lib/contract.ts
//
// THE STUDIO'S COPY OF THE BACKEND CONTRACT.
//
// Every type here is a mirror of something the backend already owns:
//
//   • manifest shapes   ← backend/src/workspace/registry/component-manifest.registry.ts
//   • operation shapes  ← backend/src/workspace/registry/operations.ts
//   • document shapes   ← backend/src/workspace/registry/layout-schema.ts
//   • read-model shapes ← backend/src/workspace/workspace.service.ts
//
// It is duplicated rather than imported because the Studio is a standalone
// project with no build-time dependency on the backend's TS source (the backend
// is a NestJS app; importing its Zod-kernel modules into a Next.js bundle would
// drag Prisma and @nestjs/* into the browser). The duplication is deliberate and
// bounded:
//
//   • Anything the backend can *reject* is validated by the backend. The types
//     here only need to be good enough to render a form and build a request.
//   • Anything the Studio *mis-shapes* fails loudly at the API boundary with a
//     compiler diagnostic naming the field, which the UI surfaces inline.
//
// So a drift here produces a visible error, never silent corruption.

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE MODES
// ─────────────────────────────────────────────────────────────────────────────

export type WorkspaceMode =
  | 'GENERAL'
  | 'E_COMMERCE'
  | 'NON_PROFIT'
  | 'EDUCATION'
  | 'PARTNER';

export const WORKSPACE_MODE_LABELS: Record<WorkspaceMode, string> = {
  GENERAL: 'General',
  E_COMMERCE: 'E-Commerce',
  NON_PROFIT: 'Non-Profit / NGO',
  EDUCATION: 'Education',
  PARTNER: 'Partner',
};

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export type TokenValue = string | number;
export type GlobalTokens = Record<string, TokenValue>;

/**
 * A token key/value pair as the inspector sees it. `origin` records whether the
 * value was authored in this project or inherited from the template's defaults,
 * which is what lets the UI offer an accurate "reset to inherited" action.
 */
export interface TokenRow {
  key: string;
  value: TokenValue;
  origin: 'authored' | 'inherited';
  /** Present when `key` is a recognised token with a stricter validator. */
  kind?: TokenKind;
}

export type TokenKind =
  | 'color'
  | 'font'
  | 'length'
  | 'radius'
  | 'theme'
  | 'direction'
  | 'text'
  | 'url'
  | 'locale'
  | 'currency'
  | 'unknown';

/**
 * The recognised tokens and their editor kind. Mirrors
 * backend/src/workspace/registry/token-schema.ts's CANONICAL_TOKEN_VALIDATORS.
 * Ordering here is the order the Studio renders the token panel in.
 */
export const CANONICAL_TOKEN_KINDS: Record<string, TokenKind> = {
  primaryColor: 'color',
  secondaryColor: 'color',
  accentColor: 'color',
  backgroundColor: 'color',
  surfaceColor: 'color',
  textColor: 'color',
  borderColor: 'color',
  successColor: 'color',
  warningColor: 'color',
  dangerColor: 'color',
  mutedTextColor: 'color',

  fontHeading: 'font',
  fontBody: 'font',
  fontMono: 'font',

  borderRadius: 'radius',
  contentMaxWidth: 'length',
  sectionSpacing: 'length',
  gridGutter: 'length',

  theme: 'theme',
  direction: 'direction',
  siteName: 'text',
  tagline: 'text',
  logoUrl: 'url',
  ogImage: 'url',
  locale: 'locale',
  currency: 'currency',
};

/** Token keys grouped for the panel, in render order. */
export const TOKEN_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: 'Brand colours',
    keys: ['primaryColor', 'secondaryColor', 'accentColor'],
  },
  {
    label: 'Surface & text',
    keys: [
      'backgroundColor',
      'surfaceColor',
      'textColor',
      'mutedTextColor',
      'borderColor',
    ],
  },
  {
    label: 'Status',
    keys: ['successColor', 'warningColor', 'dangerColor'],
  },
  {
    label: 'Typography',
    keys: ['fontHeading', 'fontBody', 'fontMono'],
  },
  {
    label: 'Layout',
    keys: ['borderRadius', 'contentMaxWidth', 'sectionSpacing', 'gridGutter'],
  },
  {
    label: 'Identity & locale',
    keys: ['siteName', 'tagline', 'logoUrl', 'ogImage', 'theme', 'direction', 'locale', 'currency'],
  },
];

export const BORDER_RADIUS_PRESETS = ['none', 'soft', 'rounded', 'pill'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT INSTANCES
// ─────────────────────────────────────────────────────────────────────────────

export type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface LayoutMeta {
  colSpan?: { mobile?: GridSpan; tablet?: GridSpan; desktop?: GridSpan };
  surface?: 'flat' | 'elevated' | 'glassmorphic' | 'bordered' | 'gradient';
  animation?: 'none' | 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'zoom-in';
  requiredRoles?: string[];
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  customClassName?: string;
}

export interface DataBinding {
  endpoint: string;
  targets: string[];
  select?: string;
}

export interface LayoutInstance {
  /** Assigned client-side on insert; the backend accepts it verbatim. */
  instanceId?: string;
  componentId: string;
  props: Record<string, unknown>;
  layout?: LayoutMeta;
  binding?: DataBinding;
}

/** Flat, ordered. Nesting is positional, expressed via container components. */
export type PageLayouts = Record<string, LayoutInstance[]>;

export interface PageSeoConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
  structuredDataType?: string;
  structuredDataPayload?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MANIFESTS
// ─────────────────────────────────────────────────────────────────────────────

export type ManifestFieldType =
  | 'TEXT'
  | 'TEXT_LONG'
  | 'RICH_TEXT'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'COLOR'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'IMAGE'
  | 'URL'
  | 'DATE'
  | 'LIST'
  | 'KEY_VALUE'
  | 'REFERENCE'
  | 'CODE';

export interface ManifestField {
  key: string;
  label: string;
  type: ManifestFieldType;
  helpText: string | null;
  options: { value: string; label: string; hint?: string }[];
  accept: 'image' | 'video' | 'audio' | 'document' | 'any' | null;
  minItems: number | null;
  maxItems: number | null;
  itemFields: ManifestField[];
}

export interface ManifestSlot {
  key: string;
  label: string;
  maxChildren: number;
  allowedComponents: string[] | '*';
}

export interface ComponentManifest {
  id: string;
  version: string;
  aliases: string[];
  name: string;
  description: string;
  category: string;
  modes: WorkspaceMode[];
  capabilities: string[];
  supportedSpans: number[];
  /** Responsive column hint. Objects are the wire truth (`{mobile, tablet, desktop}`); flat numbers come from older clients. */
  preferredSpan: { mobile: number; tablet: number; desktop: number } | number | null;
  defaultProps: Record<string, unknown>;
  fields: ManifestField[];
  dataBinding: { endpoints: string[]; bindableProps: string[] } | null;
  actions: { key: string; label: string; dangerous?: boolean }[];
  slots: ManifestSlot[];
  compatibility: { runtimeRange: string; schemaVersion: string };
}

/** The column span a manifest prefers on desktop, for badges and inspectors. */
export function desktopSpan(
  component: Pick<ComponentManifest, 'preferredSpan'> | null | undefined,
): number | null {
  const span = component?.preferredSpan;
  if (span == null) return null;
  return typeof span === 'object' ? (span.desktop ?? null) : span;
}

export interface PageDefinition {
  key: string;
  label: string;
  required: boolean;
}

export interface DataSourceDefinition {
  endpoint: string;
  label: string;
  requiresSiteUser: boolean;
  responseKey: string;
}

export interface TemplateAccent {
  primary: string;
  secondary: string;
  surface: string;
}

export interface BuiltinTemplateRef {
  key: string;
  displayName: string;
  description: string;
  tags: string[];
  accent: TemplateAccent;
}

export interface StudioManifest {
  projectId: string;
  projectName: string;
  workspaceMode: WorkspaceMode;
  capabilities: string[];
  operationKinds: string[];
  pageCatalog: PageDefinition[];
  baseTokens: GlobalTokens;
  componentCount: number;
  categories: { category: string; components: ComponentManifest[] }[];
  components: ComponentManifest[];
  dataSources: DataSourceDefinition[];
  defaultPageKey: string;
  builtinTemplates: BuiltinTemplateRef[];
}

// ─────────────────────────────────────────────────────────────────────────────
// READ MODELS
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceDocument {
  projectId: string;
  templateId: string;
  globalTokens: GlobalTokens;
  pageLayouts: PageLayouts;
  seo: Record<string, PageSeoConfig>;
  i18n: Record<string, Record<string, string>>;
  componentRegistry: Record<string, string>;
  workspaceMode: WorkspaceMode;
  schemaVersion: string;
  liveRevision: number;
  draftRevision: number;
  lastSavedAt: string | null;
  lastPublishedAt: string | null;
  isDirty: boolean;
}

export interface SyncStatus {
  projectId: string;
  liveRevision: number;
  draftRevision: number;
  lastSavedAt: string | null;
  lastPublishedAt: string | null;
  lastPurgedAt: string | null;
  isDirty: boolean;
}

export interface RevisionSummary {
  id: string;
  revision: number;
  kind: 'DRAFT' | 'PUBLISHED' | 'ROLLBACK';
  actorId: string | null;
  actorRole: string | null;
  message: string | null;
  propagatedAt: string | null;
  createdAt: string;
  isLive: boolean;
  isDraft: boolean;
  operationCount: number;
  operationKinds: string[];
  errorCount: number;
  warningCount: number;
}

export interface RevisionDetail extends Omit<RevisionSummary, 'isLive' | 'isDraft' | 'operationCount' | 'operationKinds' | 'errorCount' | 'warningCount'> {
  document: {
    pageLayouts: PageLayouts;
    globalTokens: GlobalTokens;
    seo: Record<string, PageSeoConfig>;
    i18n: Record<string, Record<string, string>>;
  };
  operations: unknown[];
  diagnostics: Diagnostic[];
}

export interface HistoryPage {
  projectId: string;
  liveRevision: number;
  draftRevision: number;
  revisions: RevisionSummary[];
  nextCursor: number | null;
}

/**
 * A template described without installing it.
 *
 * The setup wizard shows a slideshow before anything touches the draft, so the
 * gallery carries enough of a template's own data to render an honest preview:
 * its opening message, its palette, and the sections a visitor scrolls through.
 */
export interface GalleryTemplatePreview {
  hero: {
    eyebrow?: string;
    headline?: string;
    subheadline?: string;
    alignment?: string;
  };
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
  };
  fonts: { heading: string; body: string };
  radius: string;
  pages: string[];
  sections: string[];
}

export interface GalleryTemplate {
  /** Stable marketplace key — this, not an `id`, is what `/select` expects. */
  key: string;
  displayName: string;
  category: WorkspaceMode;
  description?: string;
  tags?: string[];
  accent?: TemplateAccent | null;
  authorName?: string;
  price?: number;
  rating?: number;
  isVerified?: boolean;
  downloads?: number;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  source: 'BUILTIN' | 'MARKETPLACE';
  pageCount?: number;
  componentCount?: number;
  /** Absent on a gallery served by a backend that predates the slideshow. */
  preview?: GalleryTemplatePreview;
}

export interface GalleryResponse {
  templates: GalleryTemplate[];
  categories: WorkspaceMode[];
  installedTemplateKey: string | null;
  installedInstallKind: string | null;
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  path: string;
  message: string;
  code?: string;
  detail?: Record<string, unknown>;
}

export interface WriteResult {
  ok: boolean;
  projectId: string;
  draftRevision: number;
  liveRevision: number;
  diagnostics: Diagnostic[];
  document: WorkspaceDocument;
}

export interface PageDiff {
  pageKey: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  addedInstances: string[];
  removedInstances: string[];
  reordered: boolean;
}

export interface RevisionDiff {
  projectId: string;
  from: number;
  to: number;
  pages: PageDiff[];
  tokens: {
    added: string[];
    removed: string[];
    changed: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface Position {
  pageKey: string;
  beforeInstanceId?: string;
  index?: number;
}

export type WorkspaceOperation =
  | { op: 'node.insert'; pageKey: string; instance: LayoutInstance; position?: Position }
  | { op: 'node.remove'; pageKey: string; instanceId: string }
  | { op: 'node.move'; pageKey: string; instanceId: string; to: Position }
  | { op: 'node.updateProps'; pageKey: string; instanceId: string; props: Record<string, unknown> }
  | { op: 'node.replace'; pageKey: string; instanceId: string; instance: LayoutInstance }
  | { op: 'node.setLayout'; pageKey: string; instanceId: string; layout: Record<string, unknown> }
  | { op: 'node.setVisibility'; pageKey: string; instanceId: string; visible: boolean }
  | { op: 'node.setBinding'; pageKey: string; instanceId: string; binding: DataBinding | null }
  | { op: 'node.duplicate'; pageKey: string; instanceId: string; newInstanceId: string }
  | { op: 'page.create'; pageKey: string; instances: LayoutInstance[] }
  | { op: 'page.rename'; from: string; to: string }
  | { op: 'page.delete'; pageKey: string }
  | { op: 'page.reorder'; order: string[] }
  | { op: 'token.update'; key: string; value: TokenValue }
  | { op: 'token.remove'; key: string }
  | { op: 'token.bulkUpdate'; tokens: GlobalTokens }
  | { op: 'seo.update'; pageKey: string; seo: Record<string, unknown> }
  | { op: 'i18n.update'; locale: string; strings: Record<string, string> }
  | { op: 'i18n.remove'; locale: string }
  | { op: 'document.meta'; componentRegistry?: Record<string, unknown>; message?: string };

export type OperationKind = WorkspaceOperation['op'];

/**
 * Operations whose inverse depends on prior state, so the Studio asks for
 * confirmation. Mirrors backend/src/workspace/registry/operations.ts's
 * DESTRUCTIVE_OPERATIONS.
 */
export const DESTRUCTIVE_OPERATIONS: OperationKind[] = [
  'node.remove',
  'page.delete',
  'token.remove',
];

// ─────────────────────────────────────────────────────────────────────────────
// SSE EVENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceEvent {
  type: string;
  revision?: number;
  liveRevision?: number;
  pageKeys?: string[];
  instanceIds?: string[];
  templateKey?: string;
  actorId?: string;
  message?: string;
  at?: string;
}
