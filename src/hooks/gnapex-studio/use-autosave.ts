// studio/src/hooks/gnapex-studio/use-autosave.ts

"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/errors";
import { applyOperations } from "@/lib/api/workspace";
import { workspaceKeys } from "@/lib/api/hooks";
import { store } from "@/lib/gnapex-studio/store";

const AUTOSAVE_DEBOUNCE_MS = 1400;

export function useAutosave(projectId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const pendingOps = store((s) => s.pendingOps);

  useEffect(() => {
    if (!enabled) return;
    if (!pendingOps || pendingOps.length === 0) return;

    const timeout = window.setTimeout(async () => {
      try {
        const operations = store.getState().takePendingOps();
        if (!operations || operations.length === 0) return;

        const baseRevision = store.getState().document?.draftRevision;
        const result = await applyOperations(projectId, {
          operations,
          baseRevision,
          message: "GN-Apex Studio edit",
        });
        store.getState().adoptServerDocument(result.document, Date.now());
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined;
        if (status === 409) {
          try {
            store.getState().clearSaveError?.();
          } catch {}
          toast.error("Draft changed in another session", {
            description: "Unsaved edits were dropped; the latest draft was reloaded.",
          });
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: workspaceKeys.document(projectId) }),
            queryClient.invalidateQueries({ queryKey: workspaceKeys.sync(projectId) }),
          ]);
        } else {
          toast.error("Failed to save draft");
        }
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
    // Deliberately dep'd on length, not the array identity, so appending an op
    // inside the same tick re-arms the debounce without resetting on churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pendingOps?.length, projectId, queryClient]);
}
