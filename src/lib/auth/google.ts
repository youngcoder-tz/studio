// studio/src/lib/auth/google.ts
export type GoogleAuthIntent = "login" | "signup";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function getGoogleAuthUrl(
  from?: string | null,
  intent: GoogleAuthIntent = "login",
): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  params.set("intent", intent);

  if (typeof window !== "undefined") {
    params.set("appOrigin", window.location.origin);
  }

  return `${API_URL.replace(/\/+$/, "")}/auth/google?${params.toString()}`;
}
