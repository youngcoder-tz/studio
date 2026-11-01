// studio/src/lib/gnapex-studio/types.ts
//
// GN-APEX STUDIO — EDITOR DOMAIN TYPES.
//
// These describe what the Studio itself works with: the derived Visual IR, the
// selection scopes and the canvas state. Shared contract types (manifest,
// document, operations) live in `lib/contract.ts`; this file is strictly the
// editor's own vocabulary.
//
// Naming rule: "GN-Apex" everywhere; never "Nexus Hub".

import type { LayoutMeta, ManifestField, PageDefinition } from '../contract';

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION SCOPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The three editing scopes. The inspector is contextual by scope — this is the
 * "Where am I?" grammar:
 *
 *   workspace   → Workspace Design (tokens, brand, global components)
 *   page        → page-level presentation (background, spacing, SEO)
 *   component   → a concrete instance on a page
 */
export type EditorScope = 'workspace' | 'page' | 'component';

export interface EditorSelection {
  scope: EditorScope;
  pageKey: string | null;
  instanceId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEWPORT
// ─────────────────────────────────────────────────────────────────────────────

export type ViewportKey = 'desktop' | 'tablet' | 'mobile';

export const VIEWPORTS: Record<ViewportKey, { label: string; width: number }> = {
  desktop: { label: 'Desktop', width: 1440 },
  tablet: { label: 'Tablet', width: 834 },
  mobile: { label: 'Mobile', width: 390 },
};

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATION DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One navigation area of the application directory. The client navigates their
 * provisioned OS through these areas — the contract, not generic "Pages".
 * `design: true` marks the virtual "Workspace Design" area, which is not a
 * routable page but a scope entry into the global design system.
 */
export interface DirectoryArea {
  key: string;
  label: string;
  design?: boolean;
}

export interface DirectoryEntry {
  page: PageDefinition;
  /** True when the workspace document actually defines a layout for it. */
  provisioned: boolean;
  areaKey: string;
}

export interface DirectoryGroup {
  area: DirectoryArea;
  entries: DirectoryEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL IR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One node of the Visual IR for a page.
 *
 * Everything here is derived from the backend contract (manifest `fields`,
 * `slots`, `capabilities`, `modes`) plus the workspace document — never from
 * rendered DOM. That derivation is the whole point: the Studio only offers
 * controls the contract explicitly permits.
 */
export interface IRNode {
  instanceId: string;
  /** Stable document-order id — identical to the SDK bridge's fallback. */
  orderKey: string;
  componentId: string;
  componentName: string;
  componentDescription: string | null;
  category: string;
  props: Record<string, unknown>;
  layout: LayoutMeta | undefined;
  /** Manifest exists in this mode's contract. */
  contractKnown: boolean;
  contentFields: ManifestField[];
  appearanceFields: ManifestField[];
  settingFields: ManifestField[];
  /** Human-readable statement of what stays locked for this component. */
  protectedNotice: string;
  protectedTopics: string[];
}

export interface PageIR {
  pageKey: string;
  pageLabel: string;
  required: boolean;
  nodes: IRNode[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD GROUPING
// ─────────────────────────────────────────────────────────────────────────────

/** Field types the inspector renders under "Content". */
export const CONTENT_FIELD_TYPES = new Set([
  'TEXT',
  'TEXT_LONG',
  'RICH_TEXT',
  'IMAGE',
  'URL',
  'DATE',
  'LIST',
  'KEY_VALUE',
  'REFERENCE',
]);

/** Field types the inspector renders under "Appearance". */
export const APPEARANCE_FIELD_TYPES = new Set(['COLOR']);

/** Everything else lands in "Settings" (SELECT, NUMBER, BOOLEAN, …). */
export function classifyField(field: ManifestField): IRNodeGroup {
  if (CONTENT_FIELD_TYPES.has(field.type)) return 'content';
  if (APPEARANCE_FIELD_TYPES.has(field.type)) return 'appearance';
  return 'settings';
}

export type IRNodeGroup = 'content' | 'appearance' | 'settings';
