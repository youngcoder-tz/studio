"use client";

// studio/src/app/studio/page.tsx
//
// THE LAUNCHER.
//
// The studio shell at /[projectId] needs a real backend project id; nothing
// else in this app hardcodes one. This page is the only place a signed-in
// author lands without one, so its job is small: confirm the identity, list
// the projects they can open, and hand off. It is also the only place with a
// password form — the editor never handles credentials, just the token this
// page puts in storage.

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Building2,
  Fingerprint,
  GraduationCap,
  HeartHandshake,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
} from "recharts";
import { useProjects, useViewer } from "@/lib/api/hooks";
import type { StudioProject } from "@/lib/api/projects";
import { http, setAccessToken, API_BASE_URL } from "@/lib/api/client";
import { isForbidden, isUnsignedIn } from "@/lib/errors";
import { describeReturnTarget, safeReturnTo } from "@/lib/auth/return-to";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import {
  AuthAlert,
  classifyAuthError,
  type AuthAlertContent,
} from "@/components/auth/auth-alert";
import { AuthPasswordField, AuthTextField } from "@/components/auth/auth-field";
import { WORKSPACE_MODE_LABELS, type WorkspaceMode } from "@/lib/contract";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import {
  browserSupportsWebAuthn,
  getPasskeyAssertion,
  platformPasskeysAvailable,
} from "@/lib/auth/passkeys";
import {
  getPasskeyLoginOptions,
  verifyPasskeyLogin,
} from "@/lib/auth/passkey-api";

export default function LauncherPage() {
  return (
    <Suspense fallback={<LauncherLoading />}>
      <LauncherContent />
    </Suspense>
  );
}

function LauncherLoading() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background text-foreground">
      <div
        aria-hidden
        className="studio-glow pointer-events-none absolute inset-0"
      />
      <div className="relative flex items-center gap-2.5 text-[var(--color-ink-faint)]">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs">Opening the Studio…</span>
      </div>
    </main>
  );
}

function LauncherContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewer = useViewer();
  const projects = useProjects();
  const queryClient = useQueryClient();

  // `from` is attacker-controlled URL state; only a validated studio path is
  // ever handed to the router. `reason` is only used for display copy.
  const from = safeReturnTo(searchParams.get("from"));
  const reason = searchParams.get("reason");

  const [cancelReturn, setCancelReturn] = useState(false);
  const [returning, setReturning] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const authenticated = viewer.isSuccess;
  const showReturning = Boolean(
    from && (returning || (viewer.isSuccess && !cancelReturn)),
  );

  const goToReturnTarget = useCallback(() => {
    if (!from) return false;
    setReturning(true);
    // The editor owns its own QueryClient, but clearing anything cached here
    // means a freshly signed-in return never replays a 401-shaped result.
    queryClient.removeQueries({ queryKey: ["workspace"] });
    router.replace(from);
    return true;
  }, [from, queryClient, router]);

  const stayOnLauncher = useCallback(() => {
    setCancelReturn(true);
    setReturning(false);
    // Drop the return instructions so a subsequent reload does not bounce the
    // author away from the project list they just asked for.
    router.replace("/studio");
  }, [router]);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        }).catch(() => undefined);
      } catch {}
      try {
        await http.post("/auth/logout").catch(() => undefined);
      } catch {}
    } finally {
      setAccessToken(null);
      queryClient.removeQueries({ queryKey: ["viewer"] });
      queryClient.removeQueries({ queryKey: ["projects"] });
      setSigningOut(false);
      router.replace("/studio?reason=signed-out");
    }
  }, [queryClient, router]);

  // A valid session may already exist (ambient shared cookie, Google callback,
  // or simply pressing Back from the editor). Once the viewer confirms it, the
  // only useful thing the launcher can do is finish the journey.
  useEffect(() => {
    if (!from || cancelReturn || !viewer.isSuccess) return;

    const timer = window.setTimeout(() => {
      queryClient.removeQueries({ queryKey: ["workspace"] });
      router.replace(from);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [cancelReturn, from, queryClient, router, viewer.isSuccess]);

  return (
    <main className="relative flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="studio-glass flex h-9 w-9 items-center justify-center rounded-xl border border-border">
            <Sparkles size={15} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Workspace Studio
            </p>
            <p className="text-[10px] text-[var(--color-ink-faint)]">
              Schema-driven UI/UX composer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {authenticated && viewer.data?.user?.email ? (
            <span className="hidden font-mono text-[10px] text-[var(--color-ink-faint)] sm:inline">
              {viewer.data.user.email}
            </span>
          ) : null}
          <ThemeToggle />
          {authenticated ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={signingOut}
              aria-busy={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <LogOut size={12} />
              )}
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          ) : null}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 pb-16">
        {showReturning && from ? (
          <ReturningToWorkspace from={from} onStay={stayOnLauncher} />
        ) : viewer.isPending ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[var(--color-ink-faint)]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Checking your dashboard session…</span>
          </div>
        ) : viewer.isError ? (
          isUnsignedIn(viewer.error) ? (
            <SignInPrompt
              key={`${from ?? "direct"}:${reason ?? "fresh"}`}
              from={from}
              reason={reason}
              onSignedIn={() => {
                if (!goToReturnTarget()) void viewer.refetch();
              }}
            />
          ) : (
            <SessionProblem
              content={
                isForbidden(viewer.error)
                  ? {
                      kind: "notice",
                      title: "Signed in, but not allowed here",
                      description:
                        "This account is signed in but is not allowed to open the Studio.",
                    }
                  : classifyAuthError(
                      viewer.error,
                      "The workspace API could not be reached.",
                    )
              }
              onRetry={() => {
                void viewer.refetch();
              }}
              onSignIn={() => {
                setAccessToken(null);
                void viewer.refetch();
              }}
            />
          )
        ) : (
          <ProjectList
            projects={projects.data}
            isLoading={projects.isPending}
            isError={projects.isError}
            error={projects.error as Error | null}
          />
        )}
      </section>
    </main>
  );
}

// ─── Return hand-off ────────────────────────────────────────────────────────

function ReturningToWorkspace({
  from,
  onStay,
}: {
  from: string;
  onStay: () => void;
}) {
  return (
    <div className="surface-glass studio-popover-lift mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-[0_32px_90px_-36px_rgba(15,16,38,0.55)]">
      <div className="h-0.5 overflow-hidden bg-[var(--soft)]">
        <div className="shimmer h-full w-full" />
      </div>

      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
            <Sparkles size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight">
              Session restored
            </h1>
            <p className="text-[11px] text-[var(--color-ink-dim)]">
              Taking you back to your workspace…
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--soft)] px-3 py-2.5">
          <ArrowUpRight
            size={13}
            className="shrink-0 text-[var(--color-ink-faint)]"
          />
          <code className="min-w-0 truncate font-mono text-[10.5px] text-[var(--color-ink-dim)]">
            {describeReturnTarget(from)}
          </code>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[11px] text-[var(--color-ink-faint)]">
            <Loader2 size={13} className="animate-spin" />
            Returning in a moment…
          </span>
          <Button variant="ghost" size="sm" onClick={onStay}>
            Stay here
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Sign-in ─────────────────────────────────────────────────────────────────

function reasonToAlert(
  reason: string | null,
  from: string | null,
): AuthAlertContent | null {
  if (!reason) return null;

  if (reason.startsWith("google_")) {
    const descriptions: Record<string, string> = {
      google_account_suspended:
        "This Google account is suspended. Contact your administrator.",
      google_account_terminated:
        "This Google account has been terminated and cannot sign in.",
      google_account_inactive:
        "This account is inactive. Ask an administrator to reactivate it.",
      google_not_configured:
        "Google sign-in is not configured for this deployment. Use your password instead.",
      google_sign_in_failed:
        "Google could not complete the sign-in. Try again, or use your password.",
    };
    return {
      kind: "generic",
      title: "Google sign-in didn't finish",
      description:
        descriptions[reason] ??
        "The Google round trip was cancelled or failed. Try again, or use your password.",
    };
  }

  switch (reason) {
    case "session-expired":
      return {
        kind: "session_expired",
        title: "Your session expired",
        description: from
          ? `Sign in again to return to ${describeReturnTarget(from)}. Nothing you saved is lost.`
          : "Sign in again to continue where you left off. Nothing you saved is lost.",
      };
    // case "signed-out":
    //   return {
    //     kind: "notice",
    //     title: "You're signed out",
    //     description: "Sign in to open a workspace and pick up where you left off.",
    //   };
    case "switched":
      return {
        kind: "notice",
        title: "Ready for another account",
        description: "Sign in with an identity that can open this workspace.",
      };
    default:
      return null;
  }
}

function SignInPrompt({
  onSignedIn,
  from,
  reason,
}: {
  onSignedIn: () => void;
  from: string | null;
  reason: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState<"" | "pw" | "pk">("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [alert, setAlert] = useState<AuthAlertContent | null>(() =>
    reasonToAlert(reason, from),
  );

  // WebAuthn support is a client-only fact; useSyncExternalStore avoids a
  // hydration mismatch, exactly as the gn-apex login does.
  const passkeysSupported = useSyncExternalStore(
    () => () => {},
    () => browserSupportsWebAuthn(),
    () => false,
  );
  const [platformAvailable, setPlatformAvailable] = useState(false);

  useEffect(() => {
    if (!passkeysSupported) return;
    let cancelled = false;
    void platformPasskeysAvailable().then((available) => {
      if (!cancelled) setPlatformAvailable(available);
    });
    return () => {
      cancelled = true;
    };
  }, [passkeysSupported]);

  const submit = async () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = "Enter the email you sign in with.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      errors.email = "That does not look like an email address.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy("pw");
    setAlert(null);
    try {
      const result = (await http.post("/auth/login", {
        email: email.trim(),
        password,
        remember,
      })) as {
        status?: string;
        accessToken?: string;
        message?: string;
      };
      if (result.status === "mfa_required") {
        setAlert({
          kind: "notice",
          title: "This account uses two-factor authentication",
          description:
            "The Studio does not answer MFA challenges. Sign in through the dashboard and come back — the shared session cookie will already be here.",
        });
        setBusy("");
        return;
      }
      if (result.status === "password_reset_required") {
        setAlert({
          kind: "notice",
          title: "This account must set a new password first",
          description:
            "Reset it in the dashboard, then sign in again with the new password.",
        });
        setBusy("");
        return;
      }
      if (!result.accessToken) {
        setAlert({
          kind: "generic",
          title: "Sign-in returned no session token",
          description: result.message,
        });
        setBusy("");
        return;
      }
      setAccessToken(result.accessToken);
      onSignedIn();
    } catch (caught) {
      setAlert(classifyAuthError(caught));
      setBusy("");
    }
  };

  const signInWithPasskey = async () => {
    if (!passkeysSupported) return;
    setBusy("pk");
    setAlert(null);
    try {
      const emailTrim = email.trim() || undefined;
      const { ceremonyId, options } = await getPasskeyLoginOptions(emailTrim);
      const assertion = await getPasskeyAssertion(options);
      const result = await verifyPasskeyLogin(ceremonyId, assertion);
      if (result.accessToken) {
        setAccessToken(result.accessToken);
        onSignedIn();
        return;
      }
      // The verify response also set session cookies on the shared root
      // domain — trade them for a Studio bearer token before giving up.
      const { refreshSessionFromCookie } = await import("@/lib/api/client");
      if (await refreshSessionFromCookie()) {
        onSignedIn();
        return;
      }
      setAlert({
        kind: "generic",
        title: "Passkey verified, but no session was issued",
        description:
          "The portal accepted the passkey yet returned no session token. Try again, or sign in with your password.",
      });
    } catch (caught) {
      setAlert(classifyAuthError(caught));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm space-y-5 px-5 py-1 sm:px-6">
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight">
          {from ? "Sign in to return" : "Sign in to continue"}
        </h1>
        <p className="text-xs leading-relaxed text-(--color-ink-dim)">
          {from ? (
            <>
              Your workspace is ready and waiting. Sign in and the Studio will
              reopen where you left off.
            </>
          ) : (
            <>
              The Studio needs a dashboard identity — the same account that sees
              the project in the console. Everything under{" "}
              <code className="font-mono text-[10px]">/workspace/*</code> is
              guarded by your user, deliberately.
            </>
          )}
        </p>
      </div>

      <AuthAlert content={alert} />

      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <AuthTextField
          id="studio-email"
          label="Email"
          icon={<Mail size={15} />}
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldErrors.email)
              setFieldErrors((e) => ({ ...e, email: undefined }));
          }}
          placeholder="you@organisation.dev"
          autoComplete="email"
          disabled={!!busy}
          error={fieldErrors.email}
        />

        <AuthPasswordField
          id="studio-password"
          label="Password"
          icon={<KeyRound size={15} />}
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldErrors.password)
              setFieldErrors((e) => ({ ...e, password: undefined }));
          }}
          placeholder="Enter your password"
          autoComplete="current-password"
          disabled={!!busy}
          error={fieldErrors.password}
        />

        <label className="flex cursor-pointer items-center gap-2 pl-1 text-[11px] text-[var(--color-ink-dim)]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            disabled={!!busy}
            className="h-3.5 w-3.5 rounded accent-[var(--color-accent)]"
          />
          Keep me signed in on this device
        </label>

        <Button
          type="submit"
          className="h-11 w-full justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground shadow-[0_10px_24px_-14px_var(--primary)] transition hover:brightness-110"
          disabled={!!busy}
          aria-busy={busy === "pw"}
        >
          {busy === "pw" ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : null}
          <span aria-live={busy === "pw" ? "polite" : undefined}>
            {busy === "pw" ? "Signing in…" : "Sign in"}
          </span>
        </Button>
      </form>

      {/* The divider is two rules and a word in a flex row, so no background
          masking is needed and screen readers announce it as a separator. */}
      <div
        className="flex items-center gap-3"
        role="separator"
        aria-orientation="horizontal"
        aria-label="or continue with"
      >
        <span aria-hidden className="h-px flex-1 bg-(--color-line)" />
        <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-(--color-ink-dim)">
          or continue with
        </span>
        <span aria-hidden className="h-px flex-1 bg-(--color-line)" />
      </div>

      <div className="space-y-2">
        <GoogleSignInButton
          intent="login"
          from={from}
          label="Continue with Google"
        />
        {passkeysSupported ? (
          <Button
            type="button"
            className="h-11 w-full justify-center gap-2 rounded-full border border-(--color-line) bg-[color-mix(in_oklab,var(--color-panel)_80%,transparent)] text-[var(--color-ink)] transition-colors hover:bg-[color-mix(in_oklab,var(--color-panel-2)_80%,transparent)]"
            disabled={!!busy}
            aria-busy={busy === "pk"}
            onClick={() => void signInWithPasskey()}
          >
            {busy === "pk" ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <Fingerprint size={15} aria-hidden />
            )}
            <span aria-live="polite">
              {busy === "pk"
                ? "Waiting for your passkey…"
                : platformAvailable
                  ? "Sign in with a passkey"
                  : "Sign in with a security key"}
            </span>
          </Button>
        ) : null}
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl bg-[color-mix(in_oklab,var(--color-ink-faint)_12%,transparent)] px-4 py-3 text-[11px] leading-relaxed text-[var(--color-ink-dim)]">
        <Info size={13} className="mt-0.5 shrink-0 opacity-70" />
        <span>
          Already signed in to the dashboard on this machine? The Studio reads
          that session from the shared root domain — reload this page and it
          should be here without a password.
        </span>
      </div>
    </div>
  );
}

// ─── When a session exists elsewhere, or the API is simply not answering ─────

function SessionProblem({
  content,
  onRetry,
  onSignIn,
}: {
  content: AuthAlertContent;
  onRetry: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="surface-glass mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-[var(--color-line)] p-6 shadow-[0_32px_90px_-36px_rgba(15,16,38,0.55)]">
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight">
          No session to read
        </h1>
      </div>
      <AuthAlert content={content} />
      <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
        The Studio has no accounts of its own. It signs in through the dashboard
        session the API writes to the shared root domain, so opening{" "}
        <span className="font-mono text-[10px]">{API_BASE_URL}</span> and
        signing in there is enough — this page picks it up on the next check.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Check again
        </Button>
        <Button variant="ghost" size="sm" onClick={onSignIn}>
          Sign in with a password instead
        </Button>
      </div>
    </div>
  );
}

// ─── Project list ────────────────────────────────────────────────────────────

function getProjectLogo(project: StudioProject): string | null {
  const logo =
    (project.profile as any)?.logoUrl ??
    (project as any).logoUrl ??
    (project as any).logo ??
    null;
  if (typeof logo === "string" && logo.trim().length > 0) {
    return logo;
  }
  return null;
}

const sparkData = [
  { v: 12 },
  { v: 18 },
  { v: 14 },
  { v: 26 },
  { v: 22 },
  { v: 34 },
  { v: 28 },
];

function ProjectList({
  projects,
  isLoading,
  isError,
  error,
}: {
  projects?: StudioProject[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="h-5 w-40 animate-pulse rounded bg-[var(--color-line)]/40" />
          <div className="h-3 w-14 animate-pulse rounded bg-[var(--color-line)]/30" />
        </div>
        <div className="grid gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)]/70 p-4"
            >
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-[var(--color-line)]/40" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/5 animate-pulse rounded bg-[var(--color-line)]/40" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--color-line)]/30" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--color-line)]/30" />
                <div className="hidden h-3 w-10 animate-pulse rounded bg-[var(--color-line)]/25 sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto space-y-2 rounded-xl border border-[var(--color-danger)]/30 p-6 text-center">
        <TriangleAlert
          size={18}
          className="mx-auto text-[var(--color-danger)]"
        />
        <p className="text-sm font-medium">Could not load projects</p>
        <p className="text-[11px] text-[var(--color-ink-dim)]">
          {error?.message ?? "Unknown error."}
        </p>
      </div>
    );
  }

  const supportedModes = new Set<WorkspaceMode>([
    "EDUCATION" as WorkspaceMode,
    "NON_PROFIT" as WorkspaceMode,
  ]);

  const filteredProjects = (projects ?? []).filter((project) =>
    supportedModes.has(project.workspaceMode as WorkspaceMode),
  );

  if (!filteredProjects || filteredProjects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold tracking-tight">
            Choose a workspace
          </h1>
        </div>
        <EmptyState
          icon={<Boxes size={20} />}
          title="No supported workspaces yet"
          message="Only EDUCATION and NON_PROFIT workspace modes are currently supported in the Studio. Create or switch a project to one of these modes in the dashboard."
        />
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-line)]/70 bg-[var(--color-panel)]/40 px-3 py-2 text-center">
          <Info size={13} className="text-[var(--color-ink-faint)]" />
          <p className="text-[10px] text-[var(--color-ink-faint)]">
            Currently supported workspace modes: Education, Non-Profit
          </p>
        </div>
      </div>
    );
  }

  const educationCount = filteredProjects.filter(
    (p) => p.workspaceMode === ("EDUCATION" as WorkspaceMode),
  ).length;
  const nonprofitCount = filteredProjects.filter(
    (p) => p.workspaceMode === ("NON_PROFIT" as WorkspaceMode),
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Choose a workspace
          </h1>
          <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
            Focused on Education and Non-Profit workspaces with live activity
            insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[10px] text-[var(--color-ink-dim)]">
            <GraduationCap size={12} className="text-[var(--color-accent)]" />
            <span>{educationCount}</span>
            <span className="text-[var(--color-ink-faint)]">Education</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[10px] text-[var(--color-ink-dim)]">
            <HeartHandshake size={12} className="text-emerald-400" />
            <span>{nonprofitCount}</span>
            <span className="text-[var(--color-ink-faint)]">Non-Profit</span>
          </div>
          <span className="rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[10px] text-[var(--color-ink-faint)]">
            {filteredProjects.length} project
            {filteredProjects.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--color-accent)_10%,transparent),_transparent_55%),var(--color-panel)] shadow-[0_40px_90px_-50px_rgba(15,16,38,0.8)]">
        <div className="grid gap-4 p-4 sm:grid-cols-[1.2fr_1fr] sm:p-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-ink-dim)]">
              <BarChart3 size={13} className="text-[var(--color-accent)]" />
              <span>Workspace activity pulse</span>
            </div>
            <p className="text-sm font-medium">
              Live momentum across your supported workspaces
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
              Track engagement at a glance with real-time signals from your
              Education and Non-Profit projects.
            </p>
          </div>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-accent)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="v" hide />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--color-accent)"
                  strokeWidth={1.6}
                  fill="url(#spark)"
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <ul className="grid gap-2.5">
        {filteredProjects.map((project) => {
          const logo = getProjectLogo(project);
          const isEducation =
            project.workspaceMode === ("EDUCATION" as WorkspaceMode);
          const accentClass = isEducation
            ? "text-[var(--color-accent)] bg-[var(--color-accent)]/14"
            : "text-emerald-400 bg-emerald-400/12";
          const barColor = isEducation
            ? "var(--color-accent)"
            : "rgb(52 211 153)";

          return (
            <li key={project.id}>
              <Link
                href={`/studio/${project.id}/editor`}
                className={cn(
                  "group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[var(--color-line)] p-4",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)]/40 hover:shadow-[0_30px_70px_-40px_rgba(59,130,246,0.9)]",
                  "hover:bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--color-accent)_6%,transparent),_transparent_60%),var(--color-panel-2)]",
                )}
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                />
                {logo ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--color-line)]/80 bg-[var(--color-panel)] shadow-inner">
                    <img
                      src={logo}
                      alt={`${project.name} logo`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      accentClass,
                    )}
                  >
                    {isEducation ? (
                      <GraduationCap size={20} />
                    ) : (
                      <HeartHandshake size={20} />
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold tracking-tight">
                      {project.name}
                    </p>
                    <Badge tone="accent">
                      {WORKSPACE_MODE_LABELS[
                        project.workspaceMode as WorkspaceMode
                      ] ?? project.workspaceMode}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-[var(--color-ink-faint)]">
                    {project.organization?.name ?? project.subdomain} ·{" "}
                    {project.subdomain}
                  </p>
                </div>
                <div className="hidden h-10 w-24 sm:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sparkData}>
                      <Bar
                        dataKey="v"
                        radius={[3, 3, 0, 0]}
                        fill={barColor}
                        opacity={0.6}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {project.updatedAt ? (
                    <span className="hidden text-[10px] text-[var(--color-ink-faint)] md:inline">
                      Updated {relativeTime(project.updatedAt)}
                    </span>
                  ) : null}
                  <div className="flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2 py-1 text-[10px] text-[var(--color-ink-dim)] transition-colors group-hover:border-[var(--color-accent)]/40 group-hover:text-[var(--color-ink)]">
                    <span>Open Studio</span>
                    <ArrowRight
                      size={13}
                      className="text-[var(--color-ink-faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]"
                    />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-line)]/70 bg-[var(--color-panel)]/40 px-3 py-2 text-center">
        <Info size={13} className="text-[var(--color-ink-faint)]" />
        <p className="text-[10px] text-[var(--color-ink-faint)]">
          Currently supported workspace modes: Education, Non-Profit
        </p>
      </div>
    </div>
  );
}
