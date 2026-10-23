// studio/src/app/preview/route.ts
//
// THE PREVIEW PROXY (same-origin fallback).
//
// The Studio previews the *real* client portal — the same React app the
// project's own visitors get — inside an iframe. It never re-implements the
// renderer: the whole point of the draft/live split is that what the author sees
// is literally what the runtime would render for `?preview=draft`.
//
// In the normal deployment the iframe points straight at the portal's origin
// (`NEXT_PUBLIC_PREVIEW_ORIGIN`) or at a same-origin `/portal` behind the same
// reverse proxy. This route exists for the remaining case: a portal that sends
// `X-Frame-Options` or `Content-Security-Policy: frame-ancestors` that would
// make a cross-origin iframe impossible. It fetches the document server-side and
// re-serves it from the Studio's own origin, so the browser sees a same-origin
// document and framing is permitted.
//
// Two hazards this route must not introduce, and how it handles each:
//
//   • **Open redirect / clickjacking.** `src` is resolved and checked against an
//     allow-list on every request. Without that, a link to `/preview?src=…` could
//     frame anything in front of an author, including a convincing fake login.
//
//   • **Broken assets.** A re-served Next.js document references `/_next/...`
//     root-relative assets; from the Studio's origin those URLs would hit the
//     Studio's build and 404. Injecting `<base href="<portalOrigin>/">` restores
//     the correct origin for every relative and root-relative URL. That one tag
//     is the difference between a working proxy and a white page.

import { NextRequest, NextResponse } from 'next/server';

/**
 * Origins the Studio is willing to frame.
 *
 * In order of precedence:
 *   1. `NEXT_PUBLIC_PREVIEW_ORIGIN` — the explicit override for a deployment
 *      where the portal lives on its own host (comma-separate several).
 *   2. The Studio's own origin — the default when the portal is proxied behind
 *      the same host.
 *
 * Anything else is rejected. There is deliberately no wildcard: framing an
 * arbitrary origin is exactly the capability that makes a preview pane a
 * security problem.
 */
function allowedOrigins(studioOrigin: string): string[] {
  const configured = (process.env.NEXT_PUBLIC_PREVIEW_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return configured.length ? configured : [studioOrigin];
}

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get('src');
  const studioOrigin = request.nextUrl.origin;

  if (!target) {
    return new NextResponse('Missing `src` parameter.', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target, studioOrigin);
  } catch {
    return new NextResponse('`src` is not a valid URL.', { status: 400 });
  }

  const allowList = allowedOrigins(studioOrigin);
  if (!allowList.includes(parsed.origin)) {
    return new NextResponse(
      `Refusing to frame ${parsed.origin}. Allowed: ${allowList.join(', ')}.`,
      { status: 403 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        // Forward the author's cookies so a portal that gates draft preview
        // behind a session keeps working.
        cookie: request.headers.get('cookie') ?? '',
        accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
      redirect: 'follow',
    });
  } catch {
    return new NextResponse('Could not reach the preview target.', {
      status: 502,
    });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  const isHtml = contentType.includes('text/html');

  const rawBody = await upstream.arrayBuffer();
  const body: BodyInit = isHtml
    ? injectBaseHref(Buffer.from(rawBody).toString('utf8'), parsed.origin)
    : rawBody;

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'content-type': isHtml ? 'text/html; charset=utf-8' : contentType,
      // The previewed document is untrusted (it is the client's site). These
      // headers keep it from escalating: it cannot be framed by anyone else,
      // cannot be MIME-sniffed into something executable, and cannot send a
      // referrer back to the Studio.
      'x-frame-options': 'SAMEORIGIN',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "frame-ancestors 'self'",
    },
  });
}

/**
 * Inserts a `<base>` element so a re-served document keeps resolving its assets
 * against the portal's origin.
 *
 * Conservative on purpose: a document that already declares a base is returned
 * untouched, as is a fragment with no `<head>` — guessing at either would be
 * more likely to break the page than to fix it.
 */
function injectBaseHref(html: string, origin: string): string {
  if (/<base[\s>]/i.test(html)) return html;

  const baseTag = `<base href="${origin}/">`;
  const headMatch = /<head(?:\s[^>]*)?>/i.exec(html);
  if (!headMatch) return html;

  const insertAt = headMatch.index + headMatch[0].length;
  return `${html.slice(0, insertAt)}${baseTag}${html.slice(insertAt)}`;
}
