// studio/src/app/preview/route.ts
//
// THE PREVIEW PROXY (Dynamic Same-Origin Gateway).
//
// Allows Studio Canvas to frame live portal runtimes across different
// origins (or behind strict X-Frame-Options / frame-ancestors policies)
// while rewriting asset paths via <base href="..."> so that CSS, fonts,
// and Next.js static bundles load flawlessly.

import { NextRequest, NextResponse } from "next/server";

/**
 * Validates whether the incoming target origin is an authorized portal instance.
 * Accepts:
 *   - The Studio's own host origin.
 *   - Any localhost development port (e.g. :3000, :3001, :3010).
 *   - Production GN-Apex domains (*.gnapex.com, *.gnapex.run).
 *   - CDN and Vercel preview origins (*.vercel.app, *.workers.dev).
 *   - Any explicitly defined PREVIEW_ORIGINS from environment.
 */
function isAllowedOrigin(targetOrigin: string, studioOrigin: string): boolean {
  if (targetOrigin === studioOrigin) return true;

  // Localhost development matching
  if (/^https?:\/\/localhost(:\d+)?$/.test(targetOrigin)) {
    return true;
  }

  // GN-Apex infrastructure & edge delivery domains
  if (
    /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:gnapex\.com|gnapex\.run|workers\.dev|vercel\.app)$/.test(
      targetOrigin,
    )
  ) {
    return true;
  }

  // Explicit environment overrides (if specified)
  const envOrigins = (process.env.NEXT_PUBLIC_PREVIEW_ORIGIN || "")
    .split(",")
    .map((v) => v.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (envOrigins.includes(targetOrigin)) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("src");
  const studioOrigin = request.nextUrl.origin;

  if (!target) {
    return new NextResponse("Missing `src` parameter.", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target, studioOrigin);
  } catch {
    return new NextResponse("`src` is not a valid URL.", { status: 400 });
  }

  // Enforce domain whitelist security
  if (!isAllowedOrigin(parsed.origin, studioOrigin)) {
    return new NextResponse(
      `Security Exception: Refusing to frame unauthorized origin: ${parsed.origin}.`,
      { status: 403 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        // Forward preview cookies & session identity to live portal runtime
        cookie: request.headers.get("cookie") ?? "",
        accept: "text/html,application/xhtml+xml",
        "x-gn-apex-preview": "true",
        "x-request-id": request.headers.get("x-request-id") ?? "",
      },
      cache: "no-store",
      redirect: "follow",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Could not reach the portal runtime: ${errorMsg}`, {
      status: 502,
    });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const isHtml = contentType.includes("text/html");

  const rawBody = await upstream.arrayBuffer();
  const body: BodyInit = isHtml
    ? injectBaseHref(Buffer.from(rawBody).toString("utf8"), parsed.origin)
    : rawBody;

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": isHtml ? "text/html; charset=utf-8" : contentType,
      // Relax frame restrictions for the Studio shell while preventing third-party embedding
      "x-frame-options": "SAMEORIGIN",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "frame-ancestors 'self'",
    },
  });
}

/**
 * Injects a <base href="..."> element into the HTML head so that all root-relative
 * assets (/_next/static/..., fonts, stylesheets) are fetched from the actual
 * portal origin rather than 404ing against the Studio's port.
 */
function injectBaseHref(html: string, origin: string): string {
  if (/<base[\s>]/i.test(html)) return html;

  const baseTag = `<base href="${origin}/">`;
  const headMatch = /<head(?:\s[^>]*)?>/i.exec(html);
  if (!headMatch) return html;

  const insertAt = headMatch.index + headMatch[0].length;
  return `${html.slice(0, insertAt)}${baseTag}${html.slice(insertAt)}`;
}
