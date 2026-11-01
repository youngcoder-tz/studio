// studio/src/app/login/page.tsx
//
// The backend's Google failure path is shared with the console and points at
// `/login?reason=google_…`. The Studio keeps its only credential form on the
// launcher, so this alias validates the reason and forwards it there instead
// of growing a second sign-in screen.

import { redirect } from "next/navigation";

import { buildLauncherUrl } from "@/lib/auth/return-to";

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function LoginAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const reason = first(query.reason);

  redirect(
    buildLauncherUrl({
      reason: reason?.startsWith("google_") ? reason : null,
    }),
  );
}
