// studio/src/lib/gnapex-studio/bridge-protocol.ts
//
// GN-APEX STUDIO — PREVIEW BRIDGE PROTOCOL (STUDIO SIDE).
//
// The formal, typed contract between the Studio and the real preview runtime
// (the portal rendering inside an iframe). The preview side lives in the
// GN-Apex SDK (`packages/client-sdk/src/workspace/studio-bridge.ts`); this file
// is the Studio's mirror of it, following the same deliberate duplication
// policy as `lib/contract.ts`: the two sides agree on channel + version and
// validate identity + origin on every envelope, so drift fails loudly instead
// of silently corrupting the session.
//
// Locked architecture: the Studio never guesses from the DOM. Selection,
// hover and geometry all arrive through these envelopes.

// ─────────────────────────────────────────────────────────────────────────────
// ENVELOPE
// ─────────────────────────────────────────────────────────────────────────────

export const STUDIO_BRIDGE_CHANNEL = 'gnapex:studio';
export const STUDIO_BRIDGE_VERSION = 1;

/** Axis-aligned box of a node, in the preview's viewport coordinates. */
export interface StudioNodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StudioNodeInfo {
  instanceId: string;
  componentId: string;
  componentName?: string;
}

export type StudioViewportKey = 'desktop' | 'tablet' | 'mobile';

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

/** Messages the Studio sends into the preview frame. */
export type StudioToPreviewMessage =
  | { kind: 'studio:selectNode'; instanceId: string | null }
  | { kind: 'studio:hoverNode'; instanceId: string | null }
  | { kind: 'studio:setViewport'; viewport: StudioViewportKey }
  | { kind: 'studio:setPreviewState'; pageKey: string; state: string | null }
  | {
      kind: 'studio:setDraftValues';
      instanceId: string;
      props: Record<string, unknown>;
    }
  | { kind: 'studio:requestNodeBounds'; instanceId: string }
  | { kind: 'studio:requestTree' };

/** Messages the preview frame reports back to the Studio. */
export type PreviewToStudioMessage =
  | { kind: 'preview:ready'; pageKey: string; nodes: StudioNodeInfo[] }
  | {
      kind: 'preview:hovered';
      instanceId: string | null;
      bounds: StudioNodeBounds | null;
      node: StudioNodeInfo | null;
    }
  | {
      kind: 'preview:selected';
      instanceId: string;
      bounds: StudioNodeBounds;
      node: StudioNodeInfo;
    }
  | {
      kind: 'preview:bounds';
      instanceId: string;
      bounds: StudioNodeBounds | null;
      node: StudioNodeInfo | null;
    }
  | { kind: 'preview:cleared' }
  | { kind: 'preview:error'; message: string }
  | { kind: 'preview:tree'; nodes: StudioNodeInfo[] };

/**
 * Every message travels inside a validated envelope. The Studio rejects any
 * envelope whose origin, channel, version, projectId or direction fails to
 * match what it opened.
 */
export interface StudioBridgeEnvelope {
  direction: 'studio' | 'preview';
  projectId: string;
  pageKey: string | null;
  revision: number | null;
  message:
    | StudioToPreviewMessage
    | PreviewToStudioMessage
    | { kind: string }
    | unknown;
}

export interface IncomingBridgeEnvelope extends Omit<
  StudioBridgeEnvelope,
  'message'
> {
  channel?: string;
  v?: number;
  message: PreviewToStudioMessage | { kind: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface EnvelopeExpectation {
  channel: string;
  version: number;
  projectId: string;
}

/**
 * Validates a raw `window.message` datum against the Studio's expectation.
 * Returns the parsed preview message, or null when the datum is not for us.
 * Anything a hostile frame sends never reaches the editor state.
 */
export function parseIncomingEnvelope(
  data: unknown,
  expect: EnvelopeExpectation,
): { message: PreviewToStudioMessage; revision: number | null } | null {
  if (!data || typeof data !== 'object') return null;
  const envelope = data as Partial<IncomingBridgeEnvelope>;
  if (envelope.channel !== expect.channel) return null;
  if (envelope.v !== expect.version) return null;
  if (envelope.direction !== 'preview') return null;
  if (!envelope.message || typeof envelope.message !== 'object') return null;
  const message = envelope.message as PreviewToStudioMessage;
  if (typeof message.kind !== 'string') return null;
  if (!message.kind.startsWith('preview:')) return null;
  if (envelope.projectId !== expect.projectId) return null;
  return { message, revision: envelope.revision ?? null };
}

/**
 * The portal origin the Studio frames. One place knows the default so the
 * canvas, the bridge origin check and diagnostics agree.
 */
export function portalOrigin(configured?: string | null): string {
  return (configured || process.env.NEXT_PUBLIC_PORTAL_ORIGIN || '')
    .replace(/\/$/, '');
}
