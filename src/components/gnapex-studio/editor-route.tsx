// studio/src/components/gnapex-studio/editor-route.tsx
//
// Shared server entry for both editor URL shapes:
//   /studio/[projectId]/editor
//   /studio/[projectId]/editor/[...path]
//
// The path is forwarded to the client so the explorer can restore a folder or
// file before the shell paints. The client still treats window.location as the
// source of truth for native back/forward navigation.

import EditorClient from "./editor-client";
import { isActiveStation } from "@/lib/gnapex-studio/store";

export interface EditorRouteProps {
  params: Promise<{ projectId: string; path?: string[] }>;
  searchParams: Promise<{ station?: string | string[] }>;
}

export async function EditorRoute({ params, searchParams }: EditorRouteProps) {
  const [{ projectId, path }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const requested = Array.isArray(query.station)
    ? query.station[0]
    : query.station;
  const initialStation = isActiveStation(requested) ? requested : "explorer";

  return (
    <EditorClient
      projectId={projectId}
      initialStation={initialStation}
      initialExplorerPath={path ?? []}
    />
  );
}
