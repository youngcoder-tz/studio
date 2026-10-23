// studio/src/lib/editor/reducer.ts
//
// LOCAL DOCUMENT REDUCTION.
//
// The Studio applies operations locally first (so the canvas updates the instant
// an author drags a component) and reconciles with the server on the next
// autosave. That means it needs its own, much simpler, evaluator for the same
// operation union the backend evaluates.
//
// Two rules keep this honest:
//
//   1. **The backend is authoritative.** This evaluator never has the last word;
//      it produces a candidate document, and the server recompiles it. If they
//      disagree, the server's version wins and the UI adopts it (`adoptServerDocument`).
//   2. **The evaluator mirrors the backend's semantics exactly.** Where the
//      backend has subtle behaviour (a `null` prop value deleting a key, a
//      `beforeInstanceId` position), it is replicated here with a comment tied
//      back to the backend source, so the two are auditable side by side.

import type {
  GlobalTokens,
  LayoutInstance,
  PageLayouts,
  PageSeoConfig,
  WorkspaceOperation,
} from '../contract';
import { newInstanceId, setPath, stableStringify } from '../utils';
import type { EditorDocument } from './types';

type Document = EditorDocument;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Resolves an insertion position.
 *
 * Mirrors `WorkspaceCompilerService.resolveIndex`: `beforeInstanceId` wins when
 * present, otherwise `index`, otherwise append. A dangling `beforeInstanceId`
 * (the target was deleted in the same batch) appends rather than throwing, which
 * matches the backend's tolerant behaviour.
 */
function resolveIndex(page: LayoutInstance[], position?: { beforeInstanceId?: string; index?: number }): number {
  if (position?.beforeInstanceId) {
    const found = page.findIndex((i) => i.instanceId === position.beforeInstanceId);
    if (found !== -1) return found;
  }
  if (typeof position?.index === 'number') {
    return Math.max(0, Math.min(position.index, page.length));
  }
  return page.length;
}

/**
 * Applies a single operation to a *copy* of the document and returns the new
 * document. Returns the original reference unchanged when the operation is a
 * no-op against this document (e.g. removing an already-absent instance), so
 * React can skip a re-render.
 */
export function applyOperationLocal(
  document: Document,
  operation: WorkspaceOperation,
): Document {
  const next: Document = {
    pageLayouts: document.pageLayouts,
    globalTokens: document.globalTokens,
    seo: document.seo,
    i18n: document.i18n,
  };

  const withPages = (): PageLayouts => {
    if (next.pageLayouts === document.pageLayouts) {
      next.pageLayouts = clone(document.pageLayouts);
    }
    return next.pageLayouts;
  };
  const withTokens = (): GlobalTokens => {
    if (next.globalTokens === document.globalTokens) {
      next.globalTokens = { ...document.globalTokens };
    }
    return next.globalTokens;
  };

  switch (operation.op) {
    case 'node.insert': {
      const pages = withPages();
      const page = [...(pages[operation.pageKey] ?? [])];
      const instance: LayoutInstance = {
        ...operation.instance,
        instanceId: operation.instance.instanceId || newInstanceId(operation.instance.componentId),
        props: { ...operation.instance.props },
      };
      page.splice(resolveIndex(page, operation.position), 0, instance);
      pages[operation.pageKey] = page;
      break;
    }

    case 'node.remove': {
      const pages = withPages();
      const page = pages[operation.pageKey];
      if (!page) break;
      const filtered = page.filter((i) => i.instanceId !== operation.instanceId);
      if (filtered.length === page.length) break;
      pages[operation.pageKey] = filtered;
      break;
    }

    case 'node.move': {
      const pages = withPages();
      const page = pages[operation.pageKey] ? [...pages[operation.pageKey]] : [];
      const from = page.findIndex((i) => i.instanceId === operation.instanceId);
      if (from === -1) break;
      const [moved] = page.splice(from, 1);
      // Re-resolve *after* removal — removing shifts every later index, which is
      // the same off-by-one the backend comments on.
      page.splice(resolveIndex(page, operation.to), 0, moved);
      pages[operation.pageKey] = page;
      break;
    }

    case 'node.updateProps': {
      const pages = withPages();
      const page = pages[operation.pageKey];
      if (!page) break;
      pages[operation.pageKey] = page.map((instance) => {
        if (instance.instanceId !== operation.instanceId) return instance;
        let props = { ...instance.props };
        for (const [key, value] of Object.entries(operation.props)) {
          // A `null` value deletes the key — the backend documents this.
          if (value === null) {
            delete props[key];
          } else {
            props = setPath(props, key, value);
          }
        }
        return { ...instance, props };
      });
      break;
    }

    case 'node.replace': {
      const pages = withPages();
      const page = pages[operation.pageKey];
      if (!page) break;
      pages[operation.pageKey] = page.map((instance) =>
        instance.instanceId === operation.instanceId
          ? {
              ...operation.instance,
              instanceId: instance.instanceId,
              props: { ...operation.instance.props },
            }
          : instance,
      );
      break;
    }

    case 'node.setLayout': {
      const pages = withPages();
      const page = pages[operation.pageKey];
      if (!page) break;
      pages[operation.pageKey] = page.map((instance) =>
        instance.instanceId === operation.instanceId
          ? { ...instance, layout: { ...instance.layout, ...operation.layout } }
          : instance,
      );
      break;
    }

    case 'node.setVisibility': {
      const pages = withPages();
      const page = pages[operation.pageKey];
      if (!page) break;
      pages[operation.pageKey] = page.map((instance) => {
        if (instance.instanceId !== operation.instanceId) return instance;
        // There is no single `hidden` flag: visibility is per breakpoint.
        // "Hidden" means hidden on both, exactly as the backend implements it.
        const layout = { ...instance.layout };
        if (operation.visible) {
          delete layout.hideOnMobile;
          delete layout.hideOnDesktop;
        } else {
          layout.hideOnMobile = true;
          layout.hideOnDesktop = true;
        }
        return { ...instance, layout };
      });
      break;
    }

    case 'node.setBinding': {
      const pages = withPages();
      const page = pages[operation.pageKey];
      if (!page) break;
      pages[operation.pageKey] = page.map((instance) => {
        if (instance.instanceId !== operation.instanceId) return instance;
        const updated = { ...instance };
        if (operation.binding === null) delete updated.binding;
        else updated.binding = { ...operation.binding };
        return updated;
      });
      break;
    }

    case 'node.duplicate': {
      const pages = withPages();
      const page = pages[operation.pageKey] ? [...pages[operation.pageKey]] : [];
      const index = page.findIndex((i) => i.instanceId === operation.instanceId);
      if (index === -1) break;
      const copy = clone(page[index]);
      copy.instanceId = operation.newInstanceId;
      page.splice(index + 1, 0, copy);
      pages[operation.pageKey] = page;
      break;
    }

    case 'page.create': {
      const pages = withPages();
      if (pages[operation.pageKey]) break;
      pages[operation.pageKey] = clone(operation.instances).map((instance) => ({
        ...instance,
        instanceId: instance.instanceId || newInstanceId(instance.componentId),
        props: { ...instance.props },
      }));
      break;
    }

    case 'page.rename': {
      const pages = withPages();
      if (!pages[operation.from] || pages[operation.to]) break;
      const reordered: PageLayouts = {};
      for (const [key, value] of Object.entries(pages)) {
        reordered[key === operation.from ? operation.to : key] = value;
      }
      next.pageLayouts = reordered;
      break;
    }

    case 'page.delete': {
      const pages = withPages();
      if (!pages[operation.pageKey]) break;
      delete pages[operation.pageKey];
      break;
    }

    case 'page.reorder': {
      const pages = withPages();
      const reordered: PageLayouts = {};
      for (const key of operation.order) {
        if (pages[key]) reordered[key] = pages[key];
      }
      // Retain any page the caller omitted rather than silently dropping it.
      for (const [key, value] of Object.entries(pages)) {
        if (!(key in reordered)) reordered[key] = value;
      }
      next.pageLayouts = reordered;
      break;
    }

    case 'token.update': {
      withTokens()[operation.key] = operation.value;
      break;
    }

    case 'token.remove': {
      const tokens = withTokens();
      delete tokens[operation.key];
      break;
    }

    case 'token.bulkUpdate': {
      next.globalTokens = { ...document.globalTokens, ...operation.tokens };
      break;
    }

    case 'seo.update': {
      next.seo = {
        ...document.seo,
        [operation.pageKey]: {
          ...(document.seo[operation.pageKey] ?? {}),
          ...operation.seo,
        } as PageSeoConfig,
      };
      break;
    }

    case 'i18n.update': {
      next.i18n = {
        ...document.i18n,
        [operation.locale]: {
          ...(document.i18n[operation.locale] ?? {}),
          ...operation.strings,
        },
      };
      break;
    }

    case 'i18n.remove': {
      const nextI18n = { ...document.i18n };
      delete nextI18n[operation.locale];
      next.i18n = nextI18n;
      break;
    }

    case 'document.meta':
      // Registry/meta changes are server-side only; nothing to mutate locally.
      break;

    default:
      break;
  }

  return next;
}

/**
 * Computes the inverse of an operation against the document state *before* it
 * was applied.
 *
 * This mirrors `computeInverse` in the backend's operations.ts closely enough
 * for the Studio's local undo stack. Where the backend has richer information
 * (it can express a page restore as a create + re-inserts), this returns the
 * operations that reconstitute the same document. Returns `null` when no
 * faithful inverse can be produced locally — the caller then falls back to
 * reloading the server document rather than guessing.
 */
export function computeInverseLocal(
  before: Document,
  operation: WorkspaceOperation,
): WorkspaceOperation[] | null {
  switch (operation.op) {
    case 'node.insert':
      return before.pageLayouts[operation.pageKey]?.some(
        (i) => i.instanceId === operation.instance.instanceId,
      )
        ? null // the insert overwrote an existing id — not invertible locally
        : [
            {
              op: 'node.remove',
              pageKey: operation.pageKey,
              instanceId: operation.instance.instanceId ?? '',
            },
          ];

    case 'node.remove': {
      const page = before.pageLayouts[operation.pageKey];
      const index = page?.findIndex((i) => i.instanceId === operation.instanceId) ?? -1;
      if (!page || index === -1) return null;
      return [
        {
          op: 'node.insert',
          pageKey: operation.pageKey,
          instance: clone(page[index]),
          position: { pageKey: operation.pageKey, index },
        },
      ];
    }

    case 'node.move': {
      const page = before.pageLayouts[operation.pageKey];
      const from = page?.findIndex((i) => i.instanceId === operation.instanceId) ?? -1;
      if (!page || from === -1) return null;
      const beforeId = page[from + 1]?.instanceId;
      return [
        {
          op: 'node.move',
          pageKey: operation.pageKey,
          instanceId: operation.instanceId,
          to: beforeId
            ? { pageKey: operation.pageKey, beforeInstanceId: beforeId }
            : { pageKey: operation.pageKey, index: from },
        },
      ];
    }

    case 'node.updateProps': {
      const page = before.pageLayouts[operation.pageKey];
      const instance = page?.find((i) => i.instanceId === operation.instanceId);
      if (!instance) return null;
      const previous: Record<string, unknown> = {};
      for (const key of Object.keys(operation.props)) {
        const existing = instance.props[key];
        previous[key] = existing === undefined ? null : existing;
      }
      return [
        {
          op: 'node.updateProps',
          pageKey: operation.pageKey,
          instanceId: operation.instanceId,
          props: previous,
        },
      ];
    }

    case 'node.replace': {
      const page = before.pageLayouts[operation.pageKey];
      const instance = page?.find((i) => i.instanceId === operation.instanceId);
      if (!instance) return null;
      return [
        {
          op: 'node.replace',
          pageKey: operation.pageKey,
          instanceId: operation.instanceId,
          instance: clone(instance),
        },
      ];
    }

    case 'node.setLayout': {
      const page = before.pageLayouts[operation.pageKey];
      const instance = page?.find((i) => i.instanceId === operation.instanceId);
      if (!instance) return null;
      // Restore the full prior layout, which the merge semantics make exact.
      return [
        {
          op: 'node.setLayout',
          pageKey: operation.pageKey,
          instanceId: operation.instanceId,
          layout: { ...(instance.layout ?? {}) },
        },
      ];
    }

    case 'node.setVisibility': {
      const page = before.pageLayouts[operation.pageKey];
      const instance = page?.find((i) => i.instanceId === operation.instanceId);
      if (!instance) return null;
      const wasHidden =
        instance.layout?.hideOnMobile === true || instance.layout?.hideOnDesktop === true;
      return [
        {
          op: 'node.setVisibility',
          pageKey: operation.pageKey,
          instanceId: operation.instanceId,
          visible: !wasHidden,
        },
      ];
    }

    case 'node.setBinding': {
      const page = before.pageLayouts[operation.pageKey];
      const instance = page?.find((i) => i.instanceId === operation.instanceId);
      if (!instance) return null;
      return [
        {
          op: 'node.setBinding',
          pageKey: operation.pageKey,
          instanceId: operation.instanceId,
          binding: instance.binding ? clone(instance.binding) : null,
        },
      ];
    }

    case 'node.duplicate':
      return [
        {
          op: 'node.remove',
          pageKey: operation.pageKey,
          instanceId: operation.newInstanceId,
        },
      ];

    case 'page.create':
      return [{ op: 'page.delete', pageKey: operation.pageKey }];

    case 'page.delete': {
      const page = before.pageLayouts[operation.pageKey];
      if (!page) return null;
      return [
        {
          op: 'page.create',
          pageKey: operation.pageKey,
          instances: clone(page),
        },
      ];
    }

    case 'page.rename':
      return [{ op: 'page.rename', from: operation.to, to: operation.from }];

    case 'page.reorder':
      return [
        {
          op: 'page.reorder',
          order: Object.keys(before.pageLayouts),
        },
      ];

    case 'token.update': {
      const tokens = Object.keys(before.globalTokens);
      if (!(operation.key in before.globalTokens)) {
        // The key was newly added; undo means removing it.
        return tokens.includes(operation.key)
          ? [{ op: 'token.remove', key: operation.key }]
          : [{ op: 'token.remove', key: operation.key }];
      }
      return [
        {
          op: 'token.update',
          key: operation.key,
          value: before.globalTokens[operation.key],
        },
      ];
    }

    case 'token.remove':
      if (!(operation.key in before.globalTokens)) return null;
      return [
        {
          op: 'token.update',
          key: operation.key,
          value: before.globalTokens[operation.key],
        },
      ];

    case 'token.bulkUpdate': {
      const previous: GlobalTokens = {};
      for (const key of Object.keys(operation.tokens)) {
        if (key in before.globalTokens) previous[key] = before.globalTokens[key];
      }
      const removals = Object.keys(operation.tokens).filter(
        (key) => !(key in before.globalTokens),
      );
      const inverse: WorkspaceOperation[] = [];
      if (Object.keys(previous).length) {
        inverse.push({ op: 'token.bulkUpdate', tokens: previous });
      }
      for (const key of removals) inverse.push({ op: 'token.remove', key });
      return inverse;
    }

    case 'seo.update': {
      const previous = before.seo[operation.pageKey] ?? {};
      return [
        {
          op: 'seo.update',
          pageKey: operation.pageKey,
          seo: clone(previous) as Record<string, unknown>,
        },
      ];
    }

    case 'i18n.update': {
      const previous = before.i18n[operation.locale] ?? {};
      return [
        {
          op: 'i18n.update',
          locale: operation.locale,
          strings: clone(previous),
        },
      ];
    }

    case 'i18n.remove': {
      const previous = before.i18n[operation.locale];
      if (previous === undefined) return null;
      return [
        {
          op: 'i18n.update',
          locale: operation.locale,
          strings: clone(previous),
        },
      ];
    }

    default:
      return null;
  }
}

/** Stable identity for change detection between two documents. */
export function documentsEqual(a: Document, b: Document): boolean {
  return stableStringify(a) === stableStringify(b);
}
