// studio/src/hooks/gnapex-studio/use-station-route.ts
//
// The rail is part of the URL. `?station=palette` survives a reload or a
// pasted link, while `explorer` stays the clean default route.
//
// Writes are synchronous history replaces so the URL is accurate the instant
// the rail changes. That survives a reload without a soft navigation, a server
// round-trip, or a lost draft.

"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  isActiveStation,
  store,
  type ActiveStation,
} from "@/lib/gnapex-studio/store";

export const STATION_QUERY_PARAM = "station";

/** Read and validate the station from the current query string. */
export function stationFromParam(value: string | null): ActiveStation | null {
  return isActiveStation(value) ? value : null;
}

/** Read the station directly from the browser URL on first render. */
function stationFromWindow(): ActiveStation | null {
  if (typeof window === "undefined") return null;
  return stationFromParam(
    new URLSearchParams(window.location.search).get(STATION_QUERY_PARAM),
  );
}

export function useStationRoute() {
  const searchParams = useSearchParams();
  const requestedStation = stationFromParam(
    searchParams.get(STATION_QUERY_PARAM),
  );
  const activeStation = store((s) => s.activeStation);

  // Capture the station the page was *opened* with. Reading window.location
  // here is intentional: useSearchParams can still be empty on the first
  // client render during a hard reload, and we must not strip a deep link
  // before it has been restored into the store.
  const [bootStation] = useState<ActiveStation | null>(stationFromWindow);

  // URL → store (first load, pasted links, and browser back/forward). Fall
  // back to the raw browser URL until useSearchParams catches up. A missing
  // `?station=` is the explicit explorer route, so it must restore explorer
  // rather than leaving a stale non-explorer station in the store.
  useEffect(() => {
    const station = requestedStation ?? stationFromWindow() ?? "explorer";
    if (store.getState().activeStation === station) return;
    store.getState().setActiveStation(station);
  }, [requestedStation]);

  // Store → URL. The first pass is skipped when a deep link is still being
  // restored; otherwise it would strip `?station=` before the effect above
  // has moved the store onto that station.
  const routeReady = useRef(false);
  useEffect(() => {
    if (!routeReady.current) {
      routeReady.current = true;
      if (
        bootStation &&
        bootStation !== "explorer" &&
        activeStation === "explorer"
      ) {
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (activeStation === "explorer") {
      params.delete(STATION_QUERY_PARAM);
    } else {
      params.set(STATION_QUERY_PARAM, activeStation);
    }

    const query = params.toString();
    const target = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (current === target) return;

    // Next's native History integration keeps useSearchParams in sync. This
    // is a UI-only change, so there is no reason to request a new RSC payload.
    window.history.replaceState(null, "", target);
  }, [activeStation, bootStation, requestedStation]);

  return {
    activeStation,
    bootStation,
  };
}
