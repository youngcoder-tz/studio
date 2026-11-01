// studio/src/components/auth/google-callback-client.tsx
//
// The Studio's half of the Google OAuth return trip.
//
// The backend finishes the exchange on its own host, writes the session
// cookies to the shared root domain, then sends the browser to
// `${studio}/auth/google/callback?from=…`. This page trades those cookies for
// a Studio bearer token and hands the author back to the editor they started
// from. If the trade fails, it explains why and offers a retry instead of
// dropping the user on a 404.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { refreshSessionFromCookie } from "@/lib/api/client";
import {
  buildLauncherUrl,
  describeReturnTarget,
  safeReturnTo,
} from "@/lib/auth/return-to";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "working" | "failed";

export function GoogleCallbackClient({
  from,
  intent,
}: {
  from: string | null;
  intent: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const returnTo = safeReturnTo(from) ?? "/studio";
  const [status, setStatus] = useState<Status>("working");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const exchanged = await refreshSessionFromCookie();
      if (cancelled) return;

      if (!exchanged) {
        setStatus("failed");
        return;
      }

      // A fresh bearer token is in storage. Any 401-shaped workspace result
      // from before the round trip must not survive the navigation.
      queryClient.removeQueries({ queryKey: ["workspace"] });
      queryClient.removeQueries({ queryKey: ["viewer"] });
      queryClient.removeQueries({ queryKey: ["projects"] });
      router.replace(returnTo);
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, queryClient, returnTo, router]);

  const retry = () => {
    setStatus("working");
    setAttempt((value) => value + 1);
  };

  const backHref = buildLauncherUrl({
    from,
    reason: "google_sign_in_failed",
  });

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="studio-glow pointer-events-none absolute inset-0"
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="studio-glass grid size-9 place-items-center rounded-xl border border-border">
            <Sparkles className="size-4 text-[var(--brand-text)]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold tracking-tight">
              GN-Apex Studio
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              Google sign-in
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16 pt-2 sm:px-8">
        <div className="surface-glass studio-popover-lift w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-[0_32px_90px_-36px_rgba(15,16,38,0.55)]">
          {status === "working" ? (
            <>
              <div className="h-0.5 overflow-hidden bg-[var(--soft)]">
                <div className="shimmer h-full w-full" />
              </div>
              <div className="space-y-5 p-6 sm:p-7">
                <div className="flex items-start gap-3.5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
                      Google accepted
                    </p>
                    <h1 className="text-[17px] font-semibold leading-snug tracking-tight">
                      Starting your Studio session
                    </h1>
                  </div>
                </div>

                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Google sign-in completed. We are trading the dashboard session
                  for a Studio token, then reopening{" "}
                  <span className="font-mono text-[11.5px] text-foreground">
                    {describeReturnTarget(returnTo)}
                  </span>
                  .
                </p>

                <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--soft)] px-3.5 py-2.5 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--color-accent)]" />
                  Verifying the session…
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-5 p-6 sm:p-7">
              <div className="flex items-start gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[var(--color-warn)]">
                  <TriangleAlert className="size-5" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--color-warn)]">
                    Session not created
                  </p>
                  <h1 className="text-[17px] font-semibold leading-snug tracking-tight">
                    Google signed you in, but the Studio could not start a
                    session
                  </h1>
                </div>
              </div>

              <p className="text-[13px] leading-relaxed text-muted-foreground">
                The dashboard cookies were not available to this deployment.
                This usually means the cookie domain does not include the Studio
                origin, or the backend restarted between the two halves of the
                round trip. Nothing was changed.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  className="gap-2"
                  onClick={retry}
                >
                  <RefreshCw className="size-3.5" />
                  Try again
                </Button>
                <Link
                  href={backHref}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "md" }),
                    "gap-2 text-muted-foreground",
                  )}
                >
                  <ArrowLeft className="size-3.5" />
                  Back to sign in
                </Link>
              </div>

              <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                {intent === "signup"
                  ? "Your Google account was recognised, but the Studio only opens existing workspace projects."
                  : "You can also sign in with the email and password tied to the dashboard account."}
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="relative z-10 px-5 pb-5 font-mono text-[10px] text-muted-foreground sm:px-8">
        auth / google / callback
      </footer>
    </main>
  );
}
