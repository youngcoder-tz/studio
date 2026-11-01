// studio/src/components/gnapex-studio/editor-shell-inner.tsx
//
// THE EDITOR BOOT ROOT.
//
// Dynamically resolves preview paths, tokens, and CDN origin directly from the
// backend workspace response. No static NEXT_PUBLIC_PORTAL_ORIGIN needed.

"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { DoorOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useManifest, useWorkspaceDocument } from "@/lib/api/hooks";
import { mintPreviewToken } from "@/lib/api/workspace";
import { store } from "@/lib/gnapex-studio/store";
import { resolveInitialPageKey } from "@/lib/gnapex-studio/visual-ir";
import { useAutosave } from "@/hooks/gnapex-studio/use-autosave";
import { useExplorerRoute } from "@/hooks/gnapex-studio/use-explorer-route";
import { useStationRoute } from "@/hooks/gnapex-studio/use-station-route";
import { StudioShell } from "@/components/gnapex-studio/shell/studio-shell";
import { StudioBootSkeleton } from "@/components/gnapex-studio/shell/studio-boot-skeleton";
import { WorkspaceBootError } from "@/components/gnapex-studio/shell/workspace-boot-error";

export default function EditorShellInner({
  projectId,
  initialExplorerPath = [],
}: {
  projectId: string;
  initialExplorerPath?: string[];
}) {
  const manifestQuery = useManifest(projectId);
  const documentQuery = useWorkspaceDocument(projectId, true);
  const selectionPageKey = store((s) => s.selection?.pageKey);
  const hasTemplate = !!documentQuery.data?.templateId;
  const { activeStation, bootStation } = useStationRoute();

  useExplorerRoute({
    projectId,
    manifest: manifestQuery.data ?? null,
    initialPath: initialExplorerPath,
  });

  useAutosave(projectId, hasTemplate);

  const initialPageKey = useMemo(() => {
    if (!manifestQuery.data) return null;
    if (!documentQuery.data) return manifestQuery.data.defaultPageKey ?? null;
    try {
      return resolveInitialPageKey(manifestQuery.data, documentQuery.data);
    } catch {
      return manifestQuery.data.defaultPageKey ?? null;
    }
  }, [documentQuery.data, manifestQuery.data]);

  // Fetches signed preview session token directly from backend
  const tokenQuery = useQuery({
    queryKey: ["gnapex-preview-token", projectId],
    queryFn: async () => {
      const res = await mintPreviewToken(projectId);
      if (!res?.ok || !res?.token) {
        throw new Error(res?.reason || "Could not mint preview token.");
      }
      return {
        token: res.token as string,
        previewPath: res.previewPath ?? null,
      };
    },
    enabled: hasTemplate,
    retry: false,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  useEffect(() => {
    if (manifestQuery.data && projectId) {
      try {
        store.getState().setMeta({
          projectId,
          projectName: manifestQuery.data.projectName,
          workspaceMode: manifestQuery.data.workspaceMode,
        });
      } catch {}
    }
  }, [manifestQuery.data, projectId]);

  useEffect(() => {
    if (documentQuery.data) {
      try {
        store.getState().hydrateDocument(documentQuery.data);
      } catch {}
    }
  }, [documentQuery.data]);

  const isPending = manifestQuery.isPending || documentQuery.isPending;

  // A failed *background* refresh is not a failed boot: if the shell already
  // has data, keep editing with the document it has. Only a query that has no
  // data to fall back on is fatal.
  const manifestFailure =
    manifestQuery.isError && !manifestQuery.data ? manifestQuery.error : null;
  const documentFailure =
    documentQuery.isError && !documentQuery.data ? documentQuery.error : null;
  const bootError = manifestFailure ?? documentFailure;

  const notCommissioned = !isPending && !bootError && !hasTemplate;

  if (isPending) {
    return <StudioBootSkeleton station={bootStation ?? activeStation} />;
  }

  if (bootError) {
    return (
      <WorkspaceBootError
        projectId={projectId}
        error={bootError}
        onRetry={async () => {
          await Promise.all([
            manifestQuery.refetch(),
            documentQuery.refetch(),
          ]);
        }}
      />
    );
  }

  // Defensive: the queries are settled and online, so a manifest should exist.
  // Rendering the skeleton is safer than handing `undefined` to the shell.
  if (!manifestQuery.data) {
    return <StudioBootSkeleton station={bootStation ?? activeStation} />;
  }

  if (notCommissioned) {
    return (
      <div className="studio-glow flex h-dvh flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary dark:text-brand-text"><DoorOpen className="size-6" /></div>
        <p className="text-[14px] font-semibold">
          This workspace has not been commissioned yet
        </p>
        <p className="max-w-sm text-center text-[13px] leading-relaxed text-muted-foreground">
          The Studio customizes a provisioned operational workspace. Run the
          setup wizard to choose an initial template.
        </p>
        <Link
          href={`/studio/${projectId}/setup`}
          className="inline-flex h-9 items-center rounded-[10px] bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-[0_8px_20px_-10px_var(--primary)] outline-none transition hover:brightness-110 focus-visible:ring-3 focus-visible:ring-primary/30"
        >
          Open Setup Wizard
        </Link>
      </div>
    );
  }

  // 🌟 DYNAMIC RESOLUTION:
  // If the backend template provides an explicit CDN bundleUrl, extract its origin,
  // else fall back to the browser window origin (for same-domain or local dev).
  const bundleUrl = documentQuery.data?.templateRuntime?.bundleUrl;
  let dynamicOrigin = "";
  if (bundleUrl && bundleUrl.startsWith("http")) {
    try {
      dynamicOrigin = new URL(bundleUrl).origin;
    } catch {
      dynamicOrigin =
        typeof window !== "undefined" ? window.location.origin : "";
    }
  } else {
    dynamicOrigin = typeof window !== "undefined" ? window.location.origin : "";
  }

  const framedPageKey = selectionPageKey ?? initialPageKey ?? "auth-login";

  return (
    <>
      <StudioShell
        projectId={projectId}
        manifest={manifestQuery.data}
        document={documentQuery.data ?? null}
        previewToken={tokenQuery.data?.token ?? null}
        previewOrigin={dynamicOrigin}
        framedPageKey={framedPageKey}
        templateRuntime={documentQuery.data?.templateRuntime ?? null}
      />
    </>
  );
}
