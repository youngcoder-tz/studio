// studio/src/components/gnapex-studio/editor-client.tsx
// THE EDITOR BOOT ROOT.

"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ActiveStation } from "@/lib/gnapex-studio/store";
import { StudioBootSkeleton } from "./shell/studio-boot-skeleton";

const EditorShellInner = dynamic(() => import("./editor-shell-inner"), {
  ssr: false,
});

export default function EditorClient({
  projectId,
  initialStation = "explorer",
  initialExplorerPath = [],
}: {
  projectId: string;
  initialStation?: ActiveStation;
  initialExplorerPath?: string[];
}) {
  // Provide a local QueryClient instance to prevent 'reading inst of null'
  // if QueryClientProvider is missing from the parent layout root.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<StudioBootSkeleton station={initialStation} />}>
        <EditorShellInner
          projectId={projectId}
          initialExplorerPath={initialExplorerPath}
        />
      </Suspense>
    </QueryClientProvider>
  );
}
