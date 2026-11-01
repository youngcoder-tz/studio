// studio/src/lib/auth/passkey-api.ts
//
// The Studio's passkey network calls, shaped after gn-apex's auth api. The
// backend's `/auth/passkey/login/verify` sets session cookies *and* returns a
// bearer token, so either auth path works afterwards.

import { http } from '@/lib/api/client';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';

export type PasskeyLoginResult = {
  status: 'ok';
  user: unknown;
  accessToken: string;
  deviceId: string;
};

export async function getPasskeyLoginOptions(email?: string): Promise<{
  ceremonyId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}> {
  const data = await http.post<{
    ceremonyId: string;
    options: PublicKeyCredentialRequestOptionsJSON;
  }>('/auth/passkey/login/options', { email });
  return data;
}

export async function verifyPasskeyLogin(
  ceremonyId: string,
  assertion: unknown,
): Promise<PasskeyLoginResult> {
  const data = await http.post<PasskeyLoginResult>(
    '/auth/passkey/login/verify',
    { ceremonyId, response: assertion },
  );
  return data;
}
