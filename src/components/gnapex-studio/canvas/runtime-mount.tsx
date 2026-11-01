// studio/src/components/gnapex-studio/canvas/runtime-mount.tsx
//
// THE MOUNT RUNTIME — Studio side of the Model B template contract.
//
// Instead of iframing a real site URL (Model A), the canvas downloads the
// template's compiled ESM bundle (template.bundle.js from cdn.gnapex.com) and
// mounts the template's *real* exported pages in the host:
//
//   import(bundleUrl) → module.mount(el, { pageKey, tokens }) → handle.render()
//
// Because the bundle runs in the same window, selection / hover / token
// updates are wired straight into the store — no postMessage handshake.
// The iframe scanline does not apply here; the boundaries are contract-only.
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { store } from "@/lib/gnapex-studio/store";

/** The compiled template's public contract (see template-entry in the app). */
export interface RemoteTemplateHandle {
  render(options: {
    path?: string;
    pageKey?: string;
    tokens?: Record<string, string> | null;
  }): void;
  unmount(): void;
}

export interface RemoteTemplateModule {
  mount(
    el: HTMLElement,
    options: {
      path?: string;
      pageKey?: string;
      tokens?: Record<string, string> | null;
    },
  ): RemoteTemplateHandle;
  defaultPathFor?(pageKey?: string | null): string;
  listCanvasRoutes?(): string[];
}

/**
 * Dynamic import of a runtime URL, bypassing the framework bundler — the
 * URL only exists at CDN runtime. Bundlers would otherwise try to resolve
 * the specifier at build time.
 */
function importRuntime(url: string): Promise<RemoteTemplateModule> {
  const importer = new Function(
    "u",
    "return import(u)",
  ) as (u: string) => Promise<unknown>;
  return importer(url) as Promise<RemoteTemplateModule>;
}

const bundleCache = new Map<string, Promise<RemoteTemplateModule>>();

function loadBundle(url: string): Promise<RemoteTemplateModule> {
  if (!bundleCache.has(url)) {
    bundleCache.set(
      url,
      importRuntime(url).catch((err) => {
        // One-shot load: failed URLs retry on the next canvas mount.
        bundleCache.delete(url);
        throw err;
      }),
    );
  }
  return bundleCache.get(url)!;
}

export interface RuntimeMountProps {
  bundleUrl: string;
  pageKey: string;
  tokens?: Record<string, string> | null;
}

export function RuntimeMount({
  bundleUrl,
  pageKey,
  tokens,
}: RuntimeMountProps) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<RemoteTemplateHandle | null>(null);
  const [loaded, setLoaded] = useState<{
    url: string;
    status: "ready" | "error";
    message: string;
  } | null>(null);

  // Loading is derived while the requested URL differs from the loaded one —
  // no synchronous setState inside the effect.
  const status: "loading" | "ready" | "error" =
    loaded?.url === bundleUrl ? loaded.status : "loading";
  const errorMessage = loaded?.url === bundleUrl ? loaded.message : "";

  // Serialize tokens for stable effect deps without mutating identity.
  const tokensKey = tokens ? JSON.stringify(tokens) : "";
  const tokensValue = useMemo(
    () => (tokensKey ? (JSON.parse(tokensKey) as Record<string, string>) : null),
    [tokensKey],
  );

  // ── load the bundle once per URL, mount the template into the holder ──
  useEffect(() => {
    let cancelled = false;
    let handle: RemoteTemplateHandle | null = null;

    loadBundle(bundleUrl)
      .then((module_) => {
        if (cancelled) return;
        const holder = holderRef.current;
        if (!holder) return;
        handle = module_.mount(holder, {
          pageKey,
          tokens: tokensValue,
        });
        handleRef.current = handle;
        store.getState().setBridgeStatus("active");
        store.getState().setPreviewPageKey(pageKey);
        setLoaded({ url: bundleUrl, status: "ready", message: "" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Template bundle failed to load.";
        setLoaded({ url: bundleUrl, status: "error", message });
        store.getState().setBridgeStatus(
          "unavailable",
          "The compiled template bundle could not be loaded from the CDN.",
        );
      });

    return () => {
      cancelled = true;
      handle?.unmount();
      handleRef.current = null;
    };
    // pageKey/tokens are applied via the render-sync effect below; the
    // initial mount uses them fresh at import time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundleUrl]);

  // ── page/token switching without re-importing the bundle ──
  useEffect(() => {
    if (status !== "ready" || !handleRef.current) return;
    handleRef.current.render({ pageKey, tokens: tokensValue });
    store.getState().setPreviewPageKey(pageKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pageKey, tokensKey]);

  // ── selection & hover: same-window, straight into the store ──
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    const boundsFor = (el: HTMLElement) => {
      const holderRect = holder.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.left - holderRect.left),
        y: Math.round(rect.top - holderRect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };

    const handleClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        "[data-apex-instance]",
      ) as HTMLElement | null;
      const instanceId = target?.getAttribute("data-apex-instance") || "";

      // Prevent template links from driving host navigation.
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (link) event.preventDefault();

      if (!instanceId) {
        store.getState().clearInstanceSelection();
        return;
      }
      store
        .getState()
        .selectFromPreview(store.getState().previewPageKey ?? pageKey, instanceId);
      store.getState().recordBounds(instanceId, boundsFor(target!));
    };

    const handleOver = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        "[data-apex-instance]",
      ) as HTMLElement | null;
      const instanceId = target?.getAttribute("data-apex-instance") || "";
      store.getState().setHover(instanceId || null);
      if (instanceId) {
        store.getState().recordBounds(instanceId, boundsFor(target!));
      }
    };

    holder.addEventListener("click", handleClick, true);
    holder.addEventListener("mouseover", handleOver, true);
    return () => {
      holder.removeEventListener("click", handleClick, true);
      holder.removeEventListener("mouseover", handleOver, true);
    };
  }, [pageKey, status]);

  return (
    <div className="relative h-160 w-full overflow-hidden bg-background">
      <div ref={holderRef} className="h-full w-full overflow-y-auto overflow-x-hidden">
        {status === "error" && (
          <div className="grid h-full w-full place-items-center px-6 text-center">
            <div className="max-w-sm space-y-2">
              <p className="text-[13px] font-semibold text-foreground">
                Template runtime unavailable
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {bundleUrl}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {errorMessage}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RuntimeMount;
