"use client";

// studio/src/components/auth/google-sign-in-button.tsx
//
// "Continue with Google" for the Studio launcher.
//
// Mirrors the gn-apex button: it probes `/auth/providers` first so a
// deployment without a Google client hides the button instead of offering a
// dead end, then performs a full-page navigation to `${API_URL}/auth/google`
// — the OAuth round trip has to start on the API host, where the redirect
// URI and client secret live.

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getGoogleAuthUrl, type GoogleAuthIntent } from "@/lib/auth/google";
import { Button } from "@/components/ui/button";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** The official Google "G" mark — four brand colours, one path each. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.21 7.21 0 0 1 4.9 12c0-.79.14-1.56.37-2.29V6.62H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l3.99-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  intent?: GoogleAuthIntent;
  from?: string | null;
  label?: string;
  className?: string;
}

export function GoogleSignInButton({
  intent = "login",
  from,
  label,
  className,
}: GoogleSignInButtonProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_URL.replace(/\/+$/, "")}/auth/providers`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (cancelled) return;

        if (!res.ok) {
          // The endpoint exists but is unhappy — still let the user try.
          setAvailable(true);
          return;
        }

        const data = (await res.json()) as {
          google?: { enabled?: boolean };
        };
        setAvailable(data.google?.enabled === true);
      } catch {
        if (!cancelled) setAvailable(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (available === false) return null;

  const start = () => {
    setBusy(true);
    try {
      window.location.href = getGoogleAuthUrl(from, intent);
    } catch (err) {
      setBusy(false);
      toast.error("Could not start Google sign-in. Please try again.");
      console.error(err);
    }
  };

  return (
    <Button
      type="button"
      onClick={start}
      disabled={busy}
      aria-busy={busy}
      className={
        className ??
        "h-11 w-full justify-center gap-2.5 rounded-full border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-panel)_80%,transparent)] font-medium text-[var(--color-ink)] transition-colors hover:bg-[color-mix(in_oklab,var(--color-panel-2)_80%,transparent)]"
      }
    >
      <GoogleMark className="h-4 w-4 shrink-0" />
      <span aria-live={busy ? "polite" : undefined}>
        {busy ? "Redirecting to Google…" : label ?? "Continue with Google"}
      </span>
    </Button>
  );
}
