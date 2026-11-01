// studio/src/hooks/gnapex-studio/use-preview-bridge.ts
//
// THE PREVIEW BRIDGE — STUDIO SIDE.
//
// Owns the live connection to the portal frame: registers the message
// listener, validates every envelope (origin, channel, version, project
// identity, direction), feeds the store, and exposes typed senders.
//
// Degraded mode is a first-class outcome: if the frame never reports `ready`
// (older SDK on the portal origin, blocked third-party context, …), the canvas
// keeps rendering and the shell surfaces honest "editing surface inactive"
// state instead of pretending selection works.

'use client';

import { useEffect, useRef, type RefObject } from 'react';
import {
  applyOperations,
} from '@/lib/api/workspace';
import { store } from '@/lib/gnapex-studio/store';
import {
  STUDIO_BRIDGE_CHANNEL,
  STUDIO_BRIDGE_VERSION,
  parseIncomingEnvelope,
  portalOrigin,
  type StudioToPreviewMessage,
} from '@/lib/gnapex-studio/bridge-protocol';

const HANDSHAKE_TIMEOUT_MS = 10_000;

export interface PreviewBridgeOptions {
  projectId: string;
  /** Page key the frame was opened for. */
  pageKey: string;
  /** The portal origin the iframe is actually pointed at. */
  previewOrigin: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  enabled: boolean;
}

function send(window_: Window | null, message: StudioToPreviewMessage) {
  if (!window_) return;
  const state = store.getState();
  const envelope = {
    channel: STUDIO_BRIDGE_CHANNEL,
    v: STUDIO_BRIDGE_VERSION,
    direction: 'studio' as const,
    projectId: state.meta?.projectId ?? '',
    pageKey: state.selection.pageKey ?? state.previewPageKey,
    revision: state.document?.draftRevision ?? null,
    message,
  };
  window_.postMessage(envelope, '*');
}

export function usePreviewBridge({
  projectId,
  pageKey,
  previewOrigin,
  frameRef,
  enabled,
}: PreviewBridgeOptions) {
  const expectedOrigin = useRef<string | null>(null);

  useEffect(() => {
    expectedOrigin.current = portalOrigin(previewOrigin) || null;
  }, [previewOrigin]);

  useEffect(() => {
    if (!enabled) return;

    // ── handshake watchdog ──
    const timeout = window.setTimeout(() => {
      const state = store.getState();
      if (state.bridgeStatus !== 'active') {
        store.getState().setBridgeStatus(
          'unavailable',
          'The live frame did not report a GN-Apex bridge handshake. Selection is disabled until the preview runtime answers.',
        );
      }
    }, HANDSHAKE_TIMEOUT_MS);

    // ── inbound ──
    function onMessage(event: MessageEvent) {
      const expect = expectedOrigin.current;
      if (!expect || event.origin !== expect) return;

      const state = store.getState();
      const expected = parseIncomingEnvelope(event.data, {
        channel: STUDIO_BRIDGE_CHANNEL,
        version: STUDIO_BRIDGE_VERSION,
        projectId,
      });
      if (!expected) return;

      const { message } = expected;
      switch (message.kind) {
        case 'preview:ready': {
          store.getState().setBridgeStatus('active');
          store.getState().setPreviewPageKey(message.pageKey || pageKey);
          store.getState().setPreviewNodeCatalog(message.nodes);
          // Tell the frame our viewport + current selection, if any.
          send(frameRef.current?.contentWindow ?? null, {
            kind: 'studio:setViewport',
            viewport: store.getState().viewport,
          });
          const sel = store.getState().selection;
          if (sel.scope === 'component' && sel.instanceId) {
            send(frameRef.current?.contentWindow ?? null, {
              kind: 'studio:selectNode',
              instanceId: sel.instanceId,
            });
          }
          break;
        }
        case 'preview:selected': {
          store.getState().selectFromPreview(state.previewPageKey, message.instanceId);
          store.getState().recordBounds(message.instanceId, message.bounds);
          break;
        }
        case 'preview:bounds': {
          if (message.bounds) {
            store.getState().recordBounds(message.instanceId, message.bounds);
          } else {
            // Dead node (stale selection vs reloaded frame): release it.
            store.getState().selectFromPreview(
              state.previewPageKey,
              message.instanceId,
            );
            store.getState().clearInstanceSelection();
          }
          break;
        }
        case 'preview:hovered': {
          store.getState().setHover(message.instanceId);
          if (message.instanceId && message.bounds) {
            store.getState().recordBounds(message.instanceId, message.bounds);
          }
          break;
        }
        case 'preview:cleared': {
          store.getState().clearInstanceSelection();
          break;
        }
        case 'preview:error': {
          store.getState().setBridgeStatus('active', message.message);
          break;
        }
        case 'preview:tree': {
          store.getState().setPreviewNodeCatalog(message.nodes);
          break;
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    };
  }, [enabled, frameRef, pageKey, previewOrigin, projectId]);

  // ── outbound: mirror store selection to the frame ──
  const selectionScope = store((s) => s.selection.scope);
  const selectionKey = `${store((s) => s.selection.pageKey)}:${store((s) => s.selection.instanceId)}`;
  useEffect(() => {
    if (!enabled) return;
    const state = store.getState();
    if (state.bridgeStatus !== 'active') return;
    if (state.previewPageKey && state.selection.pageKey && state.previewPageKey !== state.selection.pageKey) {
      return; // selection lives on a different page than the framed one
    }
    send(frameRef.current?.contentWindow ?? null, {
      kind: 'studio:selectNode',
      instanceId: state.selection.instanceId,
    });
  }, [enabled, selectionScope, selectionKey, frameRef]);

  // ── outbound: hover ──
  const hoverId = store((s) => s.hoverInstanceId);
  useEffect(() => {
    if (!enabled) return;
    const state = store.getState();
    if (state.bridgeStatus !== 'active') return;
    send(frameRef.current?.contentWindow ?? null, {
      kind: 'studio:hoverNode',
      instanceId: hoverId,
    });
  }, [enabled, hoverId, frameRef]);

  // ── outbound: viewport ──
  const viewport = store((s) => s.viewport);
  useEffect(() => {
    if (!enabled) return;
    const state = store.getState();
    if (state.bridgeStatus !== 'active') return;
    send(frameRef.current?.contentWindow ?? null, {
      kind: 'studio:setViewport',
      viewport,
    });
  }, [enabled, viewport, frameRef]);

  // ── outbound: site-user simulation state (states station + simulator bar) ──
  const simulationState = store((s) => s.simulationState);
  const previewPageKey = store((s) => s.previewPageKey);
  useEffect(() => {
    if (!enabled) return;
    const state = store.getState();
    if (state.bridgeStatus !== 'active') return;
    send(frameRef.current?.contentWindow ?? null, {
      kind: 'studio:setPreviewState',
      pageKey: previewPageKey ?? '',
      state: simulationState === 'normal' ? null : simulationState,
    });
  }, [enabled, simulationState, previewPageKey, frameRef]);

  return null;
}

/**
 * Applies staged operations to the backend draft. Central hook so both the
 * inspector and the canvas push into one debounce + one revision guard.
 */
export function useApplyOperations(projectId: string) {
  return {
    async flush(operations: Parameters<typeof applyOperations>[1]['operations']) {
      const baseRevision = store.getState().document?.draftRevision;
      return applyOperations(projectId, {
        operations,
        baseRevision,
        message: 'GN-Apex Studio edit',
      });
    },
  };
}
