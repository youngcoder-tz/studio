'use client';

// studio/src/components/preview/preview-canvas.tsx
//
// THE PREVIEW CANVAS.
//
// It frames the real portal, nothing else. There is no "approximate renderer" in
// the Studio and there must never be one: the entire value of a live preview is
// that what the author sees is byte-for-byte what the runtime will produce. A
// second renderer would be a second source of truth, and the first thing to
// drift.
//
// Two details that matter more than they look:
//
//   • **The iframe is reloaded by bumping `key`, not by mutating `src`.** A
//     preview that is served with `cache: no-store` still caches inside the
//     frame; changing the key forces a genuinely fresh document, which is what
//     "Refresh preview" must mean or it is a lie.
//   • **The frame URL carries the preview token, not the author's session.**
//     Draft reads are gated server-side on either a signed token or a real
//     dashboard identity. Passing the token keeps the frame's request
//     self-contained and auditable, and it means the preview works even when the
//     portal is on another origin and cannot see the Studio's cookies.

import { useMemo, useState } from 'react';
import {
  ExternalLink,
  Loader2,
  Maximize2,
  Minus,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  Tablet,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/controls';
import { Badge } from '@/components/ui/primitives';

type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTH: Record<Device, number | null> = {
  desktop: null,
  tablet: 834,
  mobile: 390,
};

const DEVICE_ICON = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
} as const;

export function PreviewCanvas({
  projectId,
  pageKey,
  mode,
  device,
  onDeviceChange,
  previewPath,
  previewToken,
  previewError,
  onRequestToken,
  issuingToken,
  frameOrigin,
  useProxy,
  zoom,
  onZoomChange,
}: {
  projectId: string;
  pageKey: string;
  mode: 'draft' | 'live';
  device: Device;
  onDeviceChange: (device: Device) => void;
  /** Path on the portal, e.g. `/portal/about` — from the backend. */
  previewPath: string;
  previewToken: string | null;
  previewError: string | null;
  onRequestToken: () => void;
  issuingToken: boolean;
  /** Optional override origin for the portal. */
  frameOrigin?: string;
  /** Route the frame through the Studio's same-origin `/preview` proxy. */
  useProxy?: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // The frame's real URL.
  //
  // Three deployment shapes, one expression:
  //   • `frameOrigin` set     → frame the portal on its own host, directly.
  //   • no origin, proxy off  → frame a same-origin `/portal/...` (the portal
  //                             sits behind the same reverse proxy as the
  //                             Studio). A relative URL, so it is SSR-safe.
  //   • proxy on              → point at `/preview?src=…`, which re-serves the
  //                             portal document from the Studio's origin. Used
  //                             when the portal sends framing headers that
  //                             would block a cross-origin iframe.
  //
  // Deliberately no `window.location` here: this component is server-rendered
  // for the initial payload, and touching `window` during render crashes that
  // pass. Relative URLs resolve against the document at runtime anyway.
  const frameSrc = useMemo(() => {
    const configured = frameOrigin?.replace(/\/$/, '') ?? '';
    const path = previewPath.startsWith('/') ? previewPath : `/${previewPath}`;

    const params = new URLSearchParams();
    if (mode === 'draft') {
      params.set('preview', 'draft');
      params.set('_preview', 'true');
      if (previewToken) params.set('previewKey', previewToken);
    }
    // Cache-busting is handled by `key`, but a stable-ish query also helps when
    // the frame is a different origin and the key remount races the fetch.
    params.set('_studio', String(nonce));
    const query = params.toString();

    const portalUrl = `${configured}${path}${query ? `?${query}` : ''}`;
    return useProxy
      ? `/preview?src=${encodeURIComponent(portalUrl)}`
      : portalUrl;
  }, [frameOrigin, previewPath, mode, previewToken, nonce, useProxy]);

  const width = DEVICE_WIDTH[device];
  const Icon = DEVICE_ICON[device];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-canvas)]">
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[var(--color-line)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={13} className="shrink-0 text-[var(--color-ink-faint)]" />
          <span className="truncate font-mono text-[11px] text-[var(--color-ink-dim)]">
            {previewPath}
          </span>
          {mode === 'draft' ? (
            <Badge tone="warn">draft</Badge>
          ) : (
            <Badge tone="ok">live</Badge>
          )}
          {device !== 'desktop' && width ? (
            <span className="text-[10px] text-[var(--color-ink-faint)]">{width}px</span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Segmented
            value={device}
            onChange={onDeviceChange}
            options={[
              { value: 'desktop', label: '', icon: <Monitor size={13} /> },
              { value: 'tablet', label: '', icon: <Tablet size={13} /> },
              { value: 'mobile', label: '', icon: <Smartphone size={13} /> },
            ]}
          />
          <div className="hidden items-center gap-0.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel-2)] px-1 md:flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onZoomChange(Math.max(50, zoom - 10))}
              title="Zoom out"
            >
              <Minus size={12} />
            </Button>
            <span className="w-10 text-center font-mono text-[10px] text-[var(--color-ink-dim)]">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onZoomChange(Math.min(150, zoom + 10))}
              title="Zoom in"
            >
              <Plus size={12} />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setLoaded(false);
              setNonce((n) => n + 1);
            }}
            title="Reload the preview"
          >
            <RefreshCw size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              window.open(`${frameSrc.replace(/_studio=\d+/, '')}`, '_blank', 'noopener')
            }
            title="Open in a new tab"
          >
            <ExternalLink size={13} />
          </Button>
        </div>
      </header>

      {previewError ? (
        <div className="flex shrink-0 items-start gap-2 border-b border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 px-3 py-2">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-[var(--color-warn)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-[var(--color-warn)]">
              Preview token unavailable
            </p>
            <p className="text-[10px] leading-relaxed text-[var(--color-ink-dim)]">
              {previewError} The frame may still load because your dashboard
              session also authorises draft reads when the portal is same-origin.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={issuingToken}
            onClick={onRequestToken}
          >
            {issuingToken ? <Loader2 size={12} className="animate-spin" /> : null}
            Get preview link
          </Button>
        </div>
      ) : null}

      <div className="preview-backdrop relative min-h-0 flex-1 overflow-hidden p-3">
        <div
          className={cn(
            'relative mx-auto h-full overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-float)] transition-[width] duration-200',
            width ? 'max-w-full' : 'w-full',
          )}
          style={{
            width: width ?? '100%',
            maxWidth: '100%',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {!loaded ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-panel)]/80">
              <div className="flex flex-col items-center gap-2 text-[var(--color-ink-faint)]">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-[11px]">Loading the portal…</span>
              </div>
            </div>
          ) : null}
          <iframe
            key={`${mode}-${projectId}-${nonce}-${device}`}
            src={frameSrc}
            title={`Portal preview — ${pageKey}`}
            onLoad={() => setLoaded(true)}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-[var(--color-line)] px-3 text-[10px] text-[var(--color-ink-faint)]">
        <span className="flex items-center gap-1.5">
          <Maximize2 size={10} />
          The preview is the real portal — the same code your visitors load.
        </span>
        <span className="font-mono">{projectId.slice(0, 12)}…</span>
      </footer>
    </div>
  );
}

export type { Device };
