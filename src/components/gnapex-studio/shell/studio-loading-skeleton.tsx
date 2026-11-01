// studio/src/components/gnapex-studio/shell/studio-loading-skeleton.tsx
//
// Route-level loading UI. The server streams a neutral shell first; once the
// page segment resolves, its own Suspense fallback supplies the station-aware
// skeleton. Keeping a client station reader here also covers soft transitions.

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { isActiveStation } from "@/lib/gnapex-studio/store";
import { StudioBootSkeleton } from "./studio-boot-skeleton";

function StationSkeleton() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("station");
  const station = isActiveStation(requested) ? requested : "explorer";

  return <StudioBootSkeleton station={station} />;
}

export function StudioLoadingSkeleton() {
  return (
    <Suspense fallback={<StudioBootSkeleton station={null} />}>
      <StationSkeleton />
    </Suspense>
  );
}
