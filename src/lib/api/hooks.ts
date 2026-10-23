'use client';

// studio/src/lib/api/hooks.ts
//
// React Query wrappers around the workspace API.
//
// Kept separate from the raw API module so that every call site gets the same
// caching, retry and error behaviour without repeating query keys. Query keys
// are centralised here for the same reason: a key built inline in a component
// is a cache-invalidation bug waiting to happen.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  discardDraft,
  fetchDiff,
  fetchDocument,
  fetchGallery,
  fetchHistory,
  fetchManifest,
  fetchRevision,
  fetchSyncStatus,
  mintPreviewToken,
  publishWorkspace,
  revertToRevision,
  selectTemplate,
} from './workspace';
import { fetchProjects, fetchViewer } from './projects';
import { isUnsignedIn } from '../errors';

/**
 * A missing session does not fix itself between retries — the client already
 * traded the root-domain refresh cookie for a token on the first 401. Keep
 * retrying genuine blips, fail instantly on an absent session, and let the UI
 * say what is actually wrong.
 */
const retryUnlessSignedOut = (failureCount: number, error: unknown): boolean =>
  !isUnsignedIn(error) && failureCount < 3;

export const workspaceKeys = {
  all: (projectId: string) => ['workspace', projectId] as const,
  manifest: (projectId: string) => ['workspace', projectId, 'manifest'] as const,
  document: (projectId: string) => ['workspace', projectId, 'document'] as const,
  sync: (projectId: string) => ['workspace', projectId, 'sync'] as const,
  history: (projectId: string, kind?: string) =>
    ['workspace', projectId, 'history', kind ?? 'all'] as const,
  revision: (projectId: string, revision: number) =>
    ['workspace', projectId, 'revision', revision] as const,
  diff: (projectId: string, from: number, to: number) =>
    ['workspace', projectId, 'diff', from, to] as const,
  gallery: (projectId: string, category?: string) =>
    ['workspace', projectId, 'gallery', category ?? 'all'] as const,
};

export function useManifest(projectId: string) {
  return useQuery({
    queryKey: workspaceKeys.manifest(projectId),
    queryFn: () => fetchManifest(projectId),
    retry: retryUnlessSignedOut,
    // Manifests are code-owned and only change on deploy, so they are the one
    // thing worth caching aggressively within a session.
    staleTime: 10 * 60_000,
  });
}

export function useWorkspaceDocument(projectId: string, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.document(projectId),
    queryFn: () => fetchDocument(projectId),
    retry: retryUnlessSignedOut,
    enabled,
  });
}

export function useSyncStatus(projectId: string) {
  return useQuery({
    queryKey: workspaceKeys.sync(projectId),
    queryFn: () => fetchSyncStatus(projectId),
    refetchInterval: 20_000,
  });
}

export function useHistory(projectId: string, kind?: string, enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.history(projectId, kind),
    queryFn: () => fetchHistory(projectId, { limit: 60, kind }),
    enabled,
  });
}

export function useRevision(projectId: string, revision: number | null) {
  return useQuery({
    queryKey: workspaceKeys.revision(projectId, revision ?? 0),
    queryFn: () => fetchRevision(projectId, revision as number),
    enabled: revision !== null,
  });
}

export function useDiff(projectId: string, from: number | null, to: number | null) {
  return useQuery({
    queryKey: workspaceKeys.diff(projectId, from ?? 0, to ?? 0),
    queryFn: () => fetchDiff(projectId, from as number, to as number),
    enabled: from !== null && from !== undefined && to !== null && to !== undefined,
  });
}

export function useGallery(projectId: string, category: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: workspaceKeys.gallery(projectId, category),
    queryFn: () => fetchGallery(projectId, category),
    retry: retryUnlessSignedOut,
    enabled,
  });
}

export function useProjects() {
  // Gated on the viewer query: the launcher mounts both at once, and firing
  // `/projects` before an access token exists just poisons the query with a
  // 401 that would otherwise need manual refetching after sign-in.
  const viewer = useViewer();
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    retry: false,
    enabled: viewer.isSuccess,
  });
}

export function useViewer() {
  return useQuery({
    queryKey: ['viewer'],
    queryFn: fetchViewer,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function usePublish(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message?: string) => publishWorkspace(projectId, message),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Published. Visitors are now seeing this version.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRevertToRevision(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ revision, message }: { revision: number; message?: string }) =>
      revertToRevision(projectId, revision, message),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.all(projectId) });
      toast.success(`Live rolled back to revision ${variables.revision}.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDiscardDraft(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => discardDraft(projectId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.all(projectId) });
      toast.success('Draft discarded. The live site was never touched.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useSelectTemplate(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      publishImmediately,
    }: {
      templateId: string;
      publishImmediately?: boolean;
    }) => selectTemplate(projectId, templateId, publishImmediately ?? false),
    onSuccess: (result, variables) => {
      void qc.invalidateQueries({ queryKey: workspaceKeys.all(projectId) });
      toast.success(
        variables.publishImmediately
          ? 'Template applied and published.'
          : 'Template loaded into your draft. Review it, then publish.',
      );
      return result;
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useMintPreviewToken(projectId: string) {
  return useMutation({
    mutationFn: () => mintPreviewToken(projectId),
    onError: (error: Error) => toast.error(error.message),
  });
}
