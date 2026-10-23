// studio/src/lib/preview.ts
//
// PREVIEW PATH RESOLUTION.
//
// The portal runtime (`NexusPortalPage` in the client SDK) derives the page key
// from the pathname *after* `/portal/`, falling back to `home`. The Studio has to
// produce paths that resolve back to the same key, or the preview shows the
// wrong page — a genuinely confusing failure, because the page list and the
// preview would disagree while both looking correct in isolation.
//
// Kept as a function rather than inlined so there is exactly one place that
// knows the portal's URL convention.

export const DEFAULT_PAGE_KEY_FALLBACK = 'home';

const PORTAL_BASE_PATH = '/portal';

/**
 * The portal path for a page key.
 *
 * `home` maps to `/portal` (no trailing segment) because that is the route the
 * portal templates actually serve, and `/portal/home` would be a 404 on a
 * conventional Next.js app. Every other key maps to `/portal/<key>`.
 */
export function previewPathFor(pageKey: string): string {
  if (!pageKey || pageKey === DEFAULT_PAGE_KEY_FALLBACK) return PORTAL_BASE_PATH;
  return `${PORTAL_BASE_PATH}/${pageKey}`;
}

/**
 * The inverse: the page key a portal path resolves to. Used to reconcile the
 * Studio's active page when the preview is opened directly at a deep link.
 */
export function pageKeyFromPreviewPath(pathname: string): string {
  if (!pathname.startsWith(PORTAL_BASE_PATH)) return DEFAULT_PAGE_KEY_FALLBACK;
  const rest = pathname.slice(PORTAL_BASE_PATH.length).replace(/^\/+/, '');
  const [segment] = rest.split(/[/?#]/);
  return segment || DEFAULT_PAGE_KEY_FALLBACK;
}
