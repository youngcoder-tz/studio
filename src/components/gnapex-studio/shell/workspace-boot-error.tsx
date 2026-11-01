// studio/src/components/gnapex-studio/shell/workspace-boot-error.tsx
//
// The editor's failure surface for the two workspace boot queries.
//
// A bare "check your permissions" line was doing three different jobs badly:
// an expired session, an account that genuinely may not open the project, and
// an API that never answered all looked identical. They have different fixes,
// so they get different states here:
//
//   401 → hand the browser to the launcher with the current location attached
//   403 → explain that the session is fine but this workspace is not theirs
//   5xx / network → offer a retry and the technical detail, never a login form
//
// The card reuses the Studio's glass language so a failure still looks like the
// product rather than a browser error page.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  HardDrive,
  Loader2,
  LogIn,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  UserRoundCog,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";

import { ApiError, isForbidden, isUnsignedIn } from "@/lib/errors";
import {
  buildLauncherUrl,
  describeReturnTarget,
} from "@/lib/auth/return-to";
import { http, setAccessToken } from "@/lib/api/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

type BootFailure =
  | { kind: "session" }
  | { kind: "forbidden"; message: string }
  | { kind: "not-found"; message: string }
  | {
      kind: "server";
      status: number;
      message: string;
      code?: string;
      diagnostics?: unknown;
    }
  | { kind: "network"; message: string }
  | { kind: "unknown"; status?: number; message: string; code?: string };

function classifyBootFailure(error: unknown): BootFailure {
  if (isUnsignedIn(error)) return { kind: "session" };
  if (isForbidden(error)) {
    return {
      kind: "forbidden",
      message:
        error instanceof Error
          ? error.message
          : "This account is not on the workspace's team.",
    };
  }

  if (error instanceof ApiError) {
    if (error.status === 404) {
      return { kind: "not-found", message: error.message };
    }
    if (error.status >= 500) {
      return {
        kind: "server",
        status: error.status,
        message: error.message,
        code: error.code,
        diagnostics: error.diagnostics,
      };
    }
    return {
      kind: "unknown",
      status: error.status,
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof TypeError) {
    return {
      kind: "network",
      message:
        "The Studio could not open a connection to the workspace API. A stopped backend, a dropped network, or a deployment that is still starting will all look like this.",
    };
  }

  return {
    kind: "unknown",
    message:
      error instanceof Error && error.message
        ? error.message
        : "The workspace request failed for an unknown reason.",
  };
}

export function WorkspaceBootError({
  projectId,
  error,
  onRetry,
}: {
  projectId: string;
  error: unknown;
  onRetry: () => Promise<unknown> | void;
}) {
  const failure = classifyBootFailure(error);

  if (failure.kind === "session") {
    return <SessionExpiredCard projectId={projectId} />;
  }

  return (
    <BootErrorShell footer={`project ${projectId}`}>
      {failure.kind === "forbidden" ? (
        <ForbiddenCard message={failure.message} />
      ) : failure.kind === "not-found" ? (
        <NotFoundCard projectId={projectId} message={failure.message} />
      ) : failure.kind === "server" ? (
        <RetryCard
          tone="danger"
          icon={ServerCrash}
          eyebrow="Workspace API error"
          title="The workspace service hit an error"
          description="The API answered, but it could not build this workspace. Retrying usually helps; if it keeps failing, the backend logs will name the exact cause."
          message={failure.message}
          status={failure.status}
          code={failure.code}
          diagnostics={failure.diagnostics}
          onRetry={onRetry}
        />
      ) : failure.kind === "network" ? (
        <RetryCard
          tone="neutral"
          icon={WifiOff}
          eyebrow="Connection problem"
          title="The workspace API is unreachable"
          description={failure.message}
          onRetry={onRetry}
        />
      ) : (
        <RetryCard
          tone="danger"
          icon={TriangleAlert}
          eyebrow="Workspace unavailable"
          title="The workspace could not be loaded"
          description="The API rejected the request before the editor could open it. The technical detail below usually names the permission or parameter that needs attention."
          message={failure.message}
          status={failure.status}
          code={failure.code}
          onRetry={onRetry}
        />
      )}
    </BootErrorShell>
  );
}

/* ── 401: hand off to the launcher, then come straight back ────────────────── */

function SessionExpiredCard({ projectId }: { projectId: string }) {
  const router = useRouter();

  // Read the browser location once, during the first client render. The editor
  // shell is loaded with `ssr: false`, but the guard keeps the component safe
  // if it is ever rendered on the server by a future route.
  const [target] = useState(() => {
    if (typeof window === "undefined") return null;
    const from = `${window.location.pathname}${window.location.search}`;
    return {
      href: buildLauncherUrl({ from, reason: "session-expired" }),
      label: describeReturnTarget(from),
    };
  });

  useEffect(() => {
    if (!target) return;
    // A short beat so the hand-off reads as intentional rather than a flash of
    // the wrong screen. The manual link below is the fallback if a router
    // transition is interrupted.
    const timer = window.setTimeout(() => router.replace(target.href), 550);
    return () => window.clearTimeout(timer);
  }, [router, target]);

  const launcherHref = target?.href ?? null;
  const returnTarget = target?.label ?? null;

  return (
    <BootErrorShell footer={`project ${projectId}`}>
      <div className="surface-glass studio-popover-lift w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-[0_32px_90px_-36px_rgba(15,16,38,0.55)]">
        <div className="h-0.5 overflow-hidden bg-[var(--soft)]">
          <div className="shimmer h-full w-full" />
        </div>

        <div className="space-y-5 p-6 sm:p-7">
          <div className="flex items-start gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[var(--color-warn)]">
              <Clock3 className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--color-warn)]">
                Session expired
              </p>
              <h1 className="text-[17px] font-semibold leading-snug tracking-tight">
                Signing you back in
              </h1>
            </div>
          </div>

          <p className="text-[13px] leading-relaxed text-muted-foreground">
            The workspace session has ended. Sign in again and the Studio will
            bring you straight back
            {returnTarget ? (
              <>
                {" "}
                to{" "}
                <span className="font-mono text-[11.5px] text-foreground">
                  {returnTarget}
                </span>
              </>
            ) : null}
            . Nothing you saved is lost.
          </p>

          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--soft)] px-3.5 py-2.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--color-warn)]" />
            Taking you to the sign-in screen…
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {launcherHref ? (
              <Link
                href={launcherHref}
                className={cn(
                  buttonVariants({ variant: "primary", size: "md" }),
                  "gap-2",
                )}
              >
                <LogIn className="size-3.5" />
                Sign in now
              </Link>
            ) : null}
            <Link
              href="/studio"
              className={cn(
                buttonVariants({ variant: "ghost", size: "md" }),
                "gap-2 text-muted-foreground",
              )}
            >
              <ArrowLeft className="size-3.5" />
              All workspaces
            </Link>
          </div>
        </div>
      </div>
    </BootErrorShell>
  );
}

/* ── 403: signed in, but this workspace is not theirs ─────────────────────── */

function ForbiddenCard({ message }: { message: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const switchAccount = async () => {
    setBusy(true);
    setAccessToken(null);
    // Best effort: clear the shared root-domain cookies too. The local token
    // is already gone, so a failure here cannot keep this identity signed in
    // inside the Studio.
    await http.post("/auth/logout").catch(() => undefined);
    router.replace(buildLauncherUrl({ reason: "switched" }));
  };

  return (
    <div className="surface-glass studio-popover-lift w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-[0_32px_90px_-36px_rgba(15,16,38,0.55)]">
      <div className="space-y-5 p-6 sm:p-7">
        <div className="flex items-start gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[var(--color-warn)]">
            <ShieldAlert className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--color-warn)]">
              Access denied
            </p>
            <h1 className="text-[17px] font-semibold leading-snug tracking-tight">
              This workspace is not available to your account
            </h1>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-muted-foreground">
          You are signed in, but this identity is not on the project&apos;s team.
          Ask an administrator for an invitation, or switch to an account that
          can open it.
        </p>

        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--soft)] px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground">
          <UserRoundCog className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{message}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/studio"
            className={cn(
              buttonVariants({ variant: "primary", size: "md" }),
              "gap-2",
            )}
          >
            <ArrowLeft className="size-3.5" />
            Back to workspaces
          </Link>
          <Button
            variant="ghost"
            size="md"
            className="gap-2 text-muted-foreground"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void switchAccount()}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserRoundCog className="size-3.5" />
            )}
            {busy ? "Switching…" : "Switch account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── 404: the project id no longer resolves ───────────────────────────────── */

function NotFoundCard({
  projectId,
  message,
}: {
  projectId: string;
  message: string;
}) {
  return (
    <div className="surface-glass studio-popover-lift w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-[0_32px_90px_-36px_rgba(15,16,38,0.55)]">
      <div className="space-y-5 p-6 sm:p-7">
        <div className="flex items-start gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[var(--color-line)] bg-[var(--soft)] text-muted-foreground">
            <HardDrive className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Workspace not found
            </p>
            <h1 className="text-[17px] font-semibold leading-snug tracking-tight">
              This project no longer exists
            </h1>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-muted-foreground">
          <span className="font-mono text-[11.5px] text-foreground">
            {projectId}
          </span>{" "}
          did not resolve to a workspace. It may have been deleted, renamed, or
          never finished provisioning.
        </p>

        <p className="break-words rounded-xl border border-[var(--color-line)] bg-[var(--soft)] px-3.5 py-2.5 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
          {message}
        </p>

        <Link
          href="/studio"
          className={cn(
            buttonVariants({ variant: "primary", size: "md" }),
            "gap-2",
          )}
        >
          <ArrowLeft className="size-3.5" />
          Back to workspaces
        </Link>
      </div>
    </div>
  );
}

/* ── Retryable failures ───────────────────────────────────────────────────── */

function RetryCard({
  tone,
  icon: Icon,
  eyebrow,
  title,
  description,
  message,
  status,
  code,
  diagnostics,
  onRetry,
}: {
  tone: "danger" | "neutral";
  icon: typeof WifiOff;
  eyebrow: string;
  title: string;
  description: string;
  message?: string;
  status?: number;
  code?: string;
  diagnostics?: unknown;
  onRetry: () => Promise<unknown> | void;
}) {
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const hasDetails = Boolean(message || status || code || diagnostics);

  return (
    <div className="surface-glass studio-popover-lift w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-[0_32px_90px_-36px_rgba(15,16,38,0.55)]">
      <div className="space-y-5 p-6 sm:p-7">
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-2xl border",
              tone === "danger"
                ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                : "border-[var(--color-line)] bg-[var(--soft)] text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <p
              className={cn(
                "text-[10px] font-medium uppercase tracking-[0.24em]",
                tone === "danger"
                  ? "text-[var(--color-danger)]"
                  : "text-muted-foreground",
              )}
            >
              {eyebrow}
            </p>
            <h1 className="text-[17px] font-semibold leading-snug tracking-tight">
              {title}
            </h1>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>

        {hasDetails ? (
          <details className="group rounded-xl border border-[var(--color-line)] bg-[var(--soft)] px-3.5 py-2.5 text-[11px]">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-muted-foreground outline-none marker:content-none">
              <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
              Technical details
            </summary>
            <dl className="mt-2.5 space-y-1.5 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
              {status ? (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 opacity-60">status</dt>
                  <dd>{status}</dd>
                </div>
              ) : null}
              {code ? (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 opacity-60">code</dt>
                  <dd className="break-all">{code}</dd>
                </div>
              ) : null}
              {message ? (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 opacity-60">message</dt>
                  <dd className="min-w-0 break-words">{message}</dd>
                </div>
              ) : null}
              {diagnostics ? (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 opacity-60">details</dt>
                  <dd className="min-w-0 break-words">
                    {typeof diagnostics === "string"
                      ? diagnostics
                      : JSON.stringify(diagnostics)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </details>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="md"
            className="gap-2"
            disabled={retrying}
            aria-busy={retrying}
            onClick={() => void retry()}
          >
            <RefreshCw
              className={cn("size-3.5", retrying && "animate-spin")}
            />
            {retrying ? "Retrying…" : "Try again"}
          </Button>
          <Link
            href="/studio"
            className={cn(
              buttonVariants({ variant: "ghost", size: "md" }),
              "gap-2 text-muted-foreground",
            )}
          >
            <ArrowLeft className="size-3.5" />
            All workspaces
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Shared chrome ────────────────────────────────────────────────────────── */

function BootErrorShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer: string;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
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
              workspace access
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-8">
        {children}
      </main>

      <footer className="relative z-10 flex items-center justify-between gap-4 px-5 pb-5 font-mono text-[10px] text-muted-foreground sm:px-8">
        <span className="truncate">{footer}</span>
        <span className="hidden shrink-0 items-center gap-1.5 sm:inline-flex">
          <span className="size-1.5 rounded-full bg-[var(--color-warn)]/70" />
          session check
        </span>
      </footer>
    </div>
  );
}
