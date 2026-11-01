// studio/src/app/auth/google/callback/page.tsx
//
// Where the backend lands the browser after a Google sign-in. It is a server
// component only so the query string can be read before the client boots;
// the exchange itself has to happen in the browser, where the cookies live.

import type { Metadata } from "next";

import { GoogleCallbackClient } from "@/components/auth/google-callback-client";

export const metadata: Metadata = {
  title: "Signing in · GN-Apex Studio",
  description: "Completing Google sign-in for the GN-Apex Workspace Studio.",
};

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function GoogleCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;

  return (
    <GoogleCallbackClient
      from={first(query.from)}
      intent={first(query.intent)}
    />
  );
}
