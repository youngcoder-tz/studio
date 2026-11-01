// studio/src/lib/preview.ts
//
// PREVIEW PATH RESOLUTION FOR WORKSPACE ERP SURFACES.
//
// Maps the canonical page keys (from WORKSPACE_PAGE_CATALOG) to their actual
// Next.js ERP routes in the live portal runtime.

export const DEFAULT_PAGE_KEY_FALLBACK = "auth-login";

const PORTAL_BASE_PATH = "/portal";

/**
 * Explicit route map for managed ERP surfaces.
 * This guarantees the iframe loads the exact page rather than 404ing on a naive slug.
 */
const MANAGED_ROUTE_MAP: Record<string, string> = {
  // ── Authentication ──
  "auth-login": "/portal/login",
  "auth-forgot-password": "/portal/forgot-password",
  "auth-reset-password": "/portal/reset-password",

  // ── Public Utilities (Injected into Live Website) ──
  "public-bus-tracking": "/utilities/track-bus",
  "public-result-verify": "/utilities/verify-result",
  "public-admissions-apply": "/admissions/apply",
  "public-admissions-track": "/admissions/track",
  "public-donate-checkout": "/donate",
  "public-campaign-progress": "/campaigns/progress",
  "public-donor-wall": "/donors",
  "public-volunteer-apply": "/volunteer/apply",
  checkout: "/checkout",

  // ── Student Portal ──
  "portal-student-dashboard": "/portal/student",
  "portal-student-results": "/portal/student/results",
  "portal-student-fees": "/portal/student/fees",
  "portal-student-timetable": "/portal/student/timetable",
  "portal-student-attendance": "/portal/student/attendance",

  // ── Parent Portal ──
  "portal-parent-dashboard": "/portal/parent",

  // ── Staff Portal ──
  "portal-staff-dashboard": "/portal/staff",

  // ── Contributor / Member Portals ──
  "portal-donor-giving": "/portal/donor",
  "portal-volunteer-tasks": "/portal/volunteer",
  "portal-orders": "/portal/orders",
  "portal-client-dashboard": "/portal",
  "portal-partner-dashboard": "/portal/partner",
};

/**
 * Returns the exact preview path for a given page key.
 */
export function previewPathFor(pageKey: string): string {
  if (!pageKey)
    return MANAGED_ROUTE_MAP[DEFAULT_PAGE_KEY_FALLBACK] || "/portal/login";

  if (MANAGED_ROUTE_MAP[pageKey]) {
    return MANAGED_ROUTE_MAP[pageKey];
  }

  // Fallback pattern for any newly created custom page key
  if (pageKey.startsWith("/")) return pageKey;
  return `${PORTAL_BASE_PATH}/${pageKey}`;
}

/**
 * Inverse: Maps a browser URL pathname back into the canonical Studio page key.
 */
export function pageKeyFromPreviewPath(pathname: string): string {
  const clean = pathname.split(/[?#]/)[0].replace(/\/$/, "");

  for (const [key, route] of Object.entries(MANAGED_ROUTE_MAP)) {
    if (clean === route || clean === `${route}/`) {
      return key;
    }
  }

  if (clean.startsWith(PORTAL_BASE_PATH)) {
    const segment = clean.slice(PORTAL_BASE_PATH.length).replace(/^\/+/, "");
    return segment || DEFAULT_PAGE_KEY_FALLBACK;
  }

  return DEFAULT_PAGE_KEY_FALLBACK;
}
