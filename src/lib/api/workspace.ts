// studio/src/lib/api/workspace.ts
//
// One typed function per backend endpoint the Studio uses.
//
// Paths are taken verbatim from the controllers:
//   • backend/src/workspace/controllers/workspace-authoring.controller.ts
//     → `/workspace/:projectId/*`
//   • backend/src/workspace/controllers/workspace-service.controller.ts
//     → `/projects/:projectId/workspace-template/*`
//
// Endpoints the Studio calls under `/workspace/...` are the authoring API.
// Endpoints it calls under `/projects/.../workspace-template/...` are the ones
// that are also part of the shipped SDK's contract (gallery, select, publish,
// revert, preview-token) — calling the SDK's own path keeps the Studio and any
// scripted client on exactly one code path.

import { http, API_BASE_URL } from './client';
import type {
  GalleryResponse,
  GlobalTokens,
  HistoryPage,
  LayoutInstance,
  PageLayouts,
  RevisionDetail,
  RevisionDiff,
  StudioManifest,
  SyncStatus,
  WorkspaceDocument,
  WorkspaceOperation,
  WriteResult,
  Diagnostic,
} from '../contract';

// ─── AUTHORING ───────────────────────────────────────────────────────────────

export function fetchManifest(projectId: string): Promise<StudioManifest> {
  return http.get<StudioManifest>(`/workspace/${projectId}/manifest`);
}

export function fetchDocument(projectId: string): Promise<WorkspaceDocument> {
  return http.get<WorkspaceDocument>(`/workspace/${projectId}/document`);
}

export function fetchSyncStatus(projectId: string): Promise<SyncStatus> {
  return http.get<SyncStatus>(`/workspace/${projectId}/sync-status`);
}

/**
 * Applies a typed operation batch. The primary editing path.
 *
 * `baseRevision` is the optimistic-concurrency guard: if the server's draft
 * has moved on, this rejects with 409 rather than clobbering another author.
 */
export function applyOperations(
  projectId: string,
  payload: {
    operations: WorkspaceOperation[];
    baseRevision?: number;
    message?: string;
  },
): Promise<WriteResult> {
  return http.post<WriteResult>(`/workspace/${projectId}/operations`, payload);
}

export function replaceDocument(
  projectId: string,
  payload: {
    pageLayouts?: PageLayouts;
    globalTokens?: GlobalTokens;
    seo?: Record<string, unknown>;
    i18n?: Record<string, Record<string, string>>;
    baseRevision?: number;
    message?: string;
  },
): Promise<WriteResult> {
  return http.put<WriteResult>(`/workspace/${projectId}/document`, payload);
}

export function publishWorkspace(
  projectId: string,
  message?: string,
): Promise<WriteResult> {
  return http.post<WriteResult>(`/workspace/${projectId}/publish`, { message });
}

/** Rolls *live* back to an older revision, published forward as a ROLLBACK. */
export function revertToRevision(
  projectId: string,
  revision: number,
  message?: string,
): Promise<WriteResult> {
  return http.post<WriteResult>(`/workspace/${projectId}/revert`, {
    revision,
    message,
  });
}

export function fetchHistory(
  projectId: string,
  params: { limit?: number; cursor?: number; kind?: string } = {},
): Promise<HistoryPage> {
  return http.get<HistoryPage>(`/workspace/${projectId}/history`, { params });
}

export function fetchRevision(
  projectId: string,
  revision: number,
): Promise<RevisionDetail> {
  return http.get<RevisionDetail>(
    `/workspace/${projectId}/history/${revision}`,
  );
}

export function fetchDiff(
  projectId: string,
  from: number,
  to: number,
): Promise<RevisionDiff> {
  return http.get<RevisionDiff>(`/workspace/${projectId}/diff`, {
    params: { from, to },
  });
}

/** Dry-run compilation. Used while typing so errors precede a save. */
export function validateDocument(
  projectId: string,
  payload: {
    pageLayouts?: PageLayouts;
    globalTokens?: GlobalTokens;
    seo?: Record<string, unknown>;
    i18n?: Record<string, Record<string, string>>;
  },
): Promise<{ ok: boolean; diagnostics: Diagnostic[]; usedComponentIds: string[] }> {
  return http.post(`/workspace/${projectId}/validate`, payload);
}

export function validateTokens(
  projectId: string,
  tokens: GlobalTokens,
): Promise<
  | { ok: true; tokens: GlobalTokens }
  | { ok: false; issues: { path: string; message: string }[] }
> {
  return http.post(`/workspace/${projectId}/validate-tokens`, { tokens });
}

// ─── SDK-CONTRACT SURFACE ────────────────────────────────────────────────────

export function fetchGallery(
  projectId: string,
  category?: string,
): Promise<GalleryResponse> {
  return http.get<GalleryResponse>(
    `/projects/${projectId}/workspace-template/gallery`,
    { params: { category } },
  );
}

export function selectTemplate(
  projectId: string,
  templateId: string,
  publishImmediately = false,
): Promise<WriteResult & { templateId: string }> {
  return http.post(`/projects/${projectId}/workspace-template/select`, {
    templateId,
    publishImmediately,
  });
}

/**
 * Discards the draft and restores the live document.
 *
 * Distinct from `revertToRevision`: this is the SDK's `revertDraft()` and it
 * never changes what a visitor sees.
 */
export function discardDraft(projectId: string): Promise<WriteResult> {
  return http.post<WriteResult>(
    `/projects/${projectId}/workspace-template/revert`,
    {},
  );
}

export function mintPreviewToken(projectId: string): Promise<{
  ok: boolean;
  token?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  previewPath?: string;
  reason?: string;
}> {
  return http.post(`/projects/${projectId}/workspace-template/preview-token`, {});
}

// ─── SSE ─────────────────────────────────────────────────────────────────────

/**
 * Subscribes to the workspace event stream.
 *
 * `EventSource` cannot set an Authorization header, so the token is passed as a
 * query parameter. The backend's SSE route is guarded by
 * `ProjectPermissionsGuard`, which reads the bearer header or a JWT — when the
 * Studio is cookie-authenticated (same parent domain) this works directly; when
 * it is token-authenticated the stream may be rejected, which the caller treats
 * as "live updates unavailable" and falls back to polling rather than failing.
 */
/**
 * Opens the authoring SSE stream.
 *
 * Authentication is **cookie-only**, and that is not an oversight: `EventSource`
 * cannot attach an `Authorization` header. The backend accepts the HttpOnly
 * `accessToken`/`session` cookie (`JwtStrategy` checks the header first, then the
 * cookies), so this works when the Studio and the API share a site — which is
 * the documented deployment (same parent domain, or both on localhost in dev).
 *
 * A token is deliberately *not* appended as a query parameter: a JWT in a URL
 * ends up in access logs, proxy logs and browser history, and the backend does
 * not accept one there anyway.
 *
 * The polling fallback in the editor store keeps working if the stream cannot be
 * established, so a failed connection degrades rather than breaks.
 */
export function openEventStream(
  projectId: string,
  handlers: {
    onEvent: (event: Record<string, unknown>) => void;
    onError?: () => void;
  },
): () => void {
  const url = new URL(`${API_BASE_URL}/workspace/${projectId}/stream`);
  const source = new EventSource(url.toString(), { withCredentials: true });
  source.onmessage = (event) => {
    try {
      handlers.onEvent(JSON.parse(event.data) as Record<string, unknown>);
    } catch {
      /* heartbeat ping or malformed frame — ignore */
    }
  };
  source.onerror = () => handlers.onError?.();

  return () => source.close();
}

export type { LayoutInstance, WorkspaceOperation };
