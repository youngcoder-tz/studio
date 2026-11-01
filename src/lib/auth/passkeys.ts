// gn-apex/src/lib/auth/passkeys.ts//
// Browser-side passkey helpers.
//
// Thin wrappers over @simplewebauthn/browser that add the two things the raw
// library doesn't give us: capability detection (so the login page can decide
// whether to offer a passkey button at all) and error translation (the browser
// throws `NotAllowedError` for "user cancelled", "timeout" and "no credential"
// alike, and we need to tell those apart to say something useful).

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

export { browserSupportsWebAuthn };

/** A translated failure from a WebAuthn ceremony. */
export class PasskeyError extends Error {
  readonly cancelled: boolean;
  constructor(message: string, cancelled = false) {
    super(message);
    this.name = "PasskeyError";
    this.cancelled = cancelled;
  }
}

/**
 * Translate a DOMException from a WebAuthn ceremony into something a human can
 * act on. `NotAllowedError` is the ambiguous one: it covers an explicit cancel,
 * a timeout, and "no matching credential on this device".
 */
function translate(error: unknown): PasskeyError {
  const name = (error as { name?: string })?.name ?? "";
  const message = (error as { message?: string })?.message ?? "";

  switch (name) {
    case "NotAllowedError":
      return new PasskeyError(
        "The passkey request was cancelled or timed out. Please try again.",
        true,
      );
    case "AbortError":
      return new PasskeyError("The passkey request was cancelled.", true);
    case "InvalidStateError":
      return new PasskeyError(
        "This device already has a passkey registered — try signing in with it instead.",
      );
    case "NotSupportedError":
      return new PasskeyError(
        "This device or browser doesn't support passkeys.",
      );
    case "SecurityError":
      return new PasskeyError(
        "Passkeys require a secure connection (HTTPS or localhost).",
      );
    default:
      return new PasskeyError(
        message || "The passkey request failed. Please try again.",
      );
  }
}

/** Is a platform authenticator (Touch ID / Windows Hello) likely available? */
export async function platformPasskeysAvailable(): Promise<boolean> {
  try {
    if (!browserSupportsWebAuthn()) return false;
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}
/** Run the create() ceremony against server-supplied options. */
export async function createPasskey(
  options: PublicKeyCredentialCreationOptionsJSON,
): Promise<unknown> {
  try {
    return await startRegistration({ optionsJSON: options });
  } catch (error) {
    throw translate(error);
  }
}

/** Run the get() ceremony against server-supplied options. */
export async function getPasskeyAssertion(
  options: PublicKeyCredentialRequestOptionsJSON,
): Promise<unknown> {
  try {
    return await startAuthentication({ optionsJSON: options });
  } catch (error) {
    throw translate(error);
  }
}
