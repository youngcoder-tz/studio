// studio/src/lib/auth/return-to.ts
//
// Where a signed-out author should land, and where they should go afterwards.
//
// The editor never handles credentials. When its workspace queries come back
// 401 it hands the browser to the launcher with the current location attached,
// and the launcher sends them straight back once a session exists. That makes
// `from` an attacker-controlled string on an auth boundary, so it is validated
// with the same rules as the backend's `isSafeFrom`: app-internal, absolute
// paths only, no scheme, host, backslashes, control characters or whitespace.
//
// The Studio only owns `/studio/...`, so a valid return target must live under
// that prefix. A bare `/studio` is rejected as well — returning to the page we
// are already on would just loop.

export const STUDIO_LAUNCHER = "/studio";

/** Reasons the launcher knows how to explain in its sign-in card. */
export type LauncherReason =
  | "session-expired"
  | "signed-out"
  | "switched"
  | "google-failed";

const MAX_RETURN_LENGTH = 2_048;

/**
 * Validate and normalise a `from` value received from the URL.
 *
 * Returns a path (`/studio/<project>/editor/...`) that is safe to pass to
 * `router.replace`, or `null` when the value must be ignored.
 */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const candidate = value.trim();
  if (!candidate || candidate.length > MAX_RETURN_LENGTH) return null;

  // Only absolute paths on this origin. `//host` and `/\host` are protocol
  // relative URLs in disguise and are never studio routes.
  if (!candidate.startsWith("/")) return null;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return null;
  if (candidate.includes("\\")) return null;

  // Whitespace and control characters have no business in a URL path and are
  // how header-splitting and normalisation tricks tend to sneak in.
  for (const char of candidate) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f) return null;
    if (/\s/u.test(char)) return null;
  }

  let url: URL;
  try {
    url = new URL(candidate, "http://studio.invalid");
  } catch {
    return null;
  }

  // Belt and braces: a WHATWG URL would already have turned a protocol
  // relative value into another origin, but pinning the origin makes the
  // invariant explicit for future readers.
  if (url.origin !== "http://studio.invalid") return null;
  if (url.username || url.password) return null;

  // Stay inside the Studio. Accept the editor and setup routes, never the
  // launcher itself.
  if (url.pathname === STUDIO_LAUNCHER || url.pathname === `${STUDIO_LAUNCHER}/`) {
    return null;
  }
  if (!url.pathname.startsWith(`${STUDIO_LAUNCHER}/`)) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Build a launcher URL that remembers where the author came from. */
export function buildLauncherUrl({
  from,
  reason,
}: {
  from?: string | null;
  reason?: LauncherReason | string | null;
} = {}): string {
  const params = new URLSearchParams();
  const safeFrom = safeReturnTo(from);
  if (safeFrom) params.set("from", safeFrom);
  if (reason) params.set("reason", reason);
  const query = params.toString();
  return query ? `${STUDIO_LAUNCHER}?${query}` : STUDIO_LAUNCHER;
}

/** A short, human-readable rendition of a validated return target. */
export function describeReturnTarget(from: string): string {
  const withoutMarker = from.replace(/^\/studio\/?/, "");
  if (!withoutMarker) return "the workspace";
  return `/${withoutMarker}`;
}
