'use client';

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

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Boxes,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import {
  useProjects,
  useViewer,
} from '@/lib/api/hooks';
import type { StudioProject } from '@/lib/api/projects';
import { http, setAccessToken, API_BASE_URL } from '@/lib/api/client';
import { isForbidden, isUnsignedIn } from '@/lib/errors';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import {
  AuthAlert,
  classifyAuthError,
  type AuthAlertContent,
} from '@/components/auth/auth-alert';
import {
  AuthPasswordField,
  AuthTextField,
} from '@/components/auth/auth-field';
import {
  WORKSPACE_MODE_LABELS,
  type WorkspaceMode,
} from '@/lib/contract';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/utils';

export default function LauncherPage() {
  const viewer = useViewer();
  const projects = useProjects();
  const queryClient = useQueryClient();

  const authenticated = viewer.isSuccess;

  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="glass flex h-9 w-9 items-center justify-center rounded-xl">
            <Sparkles size={15} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Workspace Studio</p>
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
              onClick={() => {
                setAccessToken(null);
                queryClient.removeQueries({ queryKey: ['viewer'] });
                queryClient.removeQueries({ queryKey: ['projects'] });
                // The refresh cookie belongs to the API; clearing it there is
                // best-effort — the launcher only needs the local identity gone.
                void http.post('/auth/logout').catch(() => undefined);
                void viewer.refetch();
              }}
            >
              <LogOut size={12} />
              Sign out
            </Button>
          ) : null}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 pb-16">
        {viewer.isPending ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[var(--color-ink-faint)]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Checking your dashboard session…</span>
          </div>
        ) : viewer.isError ? (
          isUnsignedIn(viewer.error) ? (
            <SignInPrompt
              onSignedIn={() => {
                void viewer.refetch();
              }}
            />
          ) : (
            <SessionProblem
              content={
                isForbidden(viewer.error)
                  ? {
                      kind: 'notice',
                      title: 'Signed in, but not allowed here',
                      description:
                        'This account is signed in but is not allowed to open the Studio.',
                    }
                  : classifyAuthError(
                      viewer.error,
                      'The workspace API could not be reached.',
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

// ─── Sign-in ─────────────────────────────────────────────────────────────────

function SignInPrompt({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [alert, setAlert] = useState<AuthAlertContent | null>(null);

  const submit = async () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Enter the email you sign in with.';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      errors.email = 'That does not look like an email address.';
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    setAlert(null);
    try {
      const result = (await http.post('/auth/login', {
        email: email.trim(),
        password,
        remember,
      })) as {
        status?: string;
        accessToken?: string;
        message?: string;
      };
      if (result.status === 'mfa_required') {
        setAlert({
          kind: 'notice',
          title: 'This account uses two-factor authentication',
          description:
            'The Studio does not answer MFA challenges. Sign in through the dashboard and come back — the shared session cookie will already be here.',
        });
        return;
      }
      if (result.status === 'password_reset_required') {
        setAlert({
          kind: 'notice',
          title: 'This account must set a new password first',
          description:
            'Reset it in the dashboard, then sign in again with the new password.',
        });
        return;
      }
      if (!result.accessToken) {
        setAlert({
          kind: 'generic',
          title: 'Sign-in returned no session token',
          description: result.message,
        });
        return;
      }
      setAccessToken(result.accessToken);
      onSignedIn();
    } catch (caught) {
      setAlert(classifyAuthError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass mx-auto w-full max-w-sm space-y-5 rounded-2xl p-6 px-5 sm:px-6">
      <div className="space-y-1.5 border-b border-[var(--color-line)] pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Sign in to continue</h1>
        <p className="text-xs leading-relaxed text-[var(--color-ink-dim)]">
          The Studio needs a dashboard identity — the same account that sees the
          project in the console. Everything under{' '}
          <code className="font-mono text-[10px]">/workspace/*</code> is guarded by
          your user, deliberately.
        </p>
      </div>

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
            if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
          }}
          placeholder="you@organisation.dev"
          autoComplete="email"
          disabled={busy}
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
          disabled={busy}
          error={fieldErrors.password}
        />

        <label className="flex cursor-pointer items-center gap-2 pl-1 text-[11px] text-[var(--color-ink-dim)]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            disabled={busy}
            className="h-3.5 w-3.5 rounded accent-[var(--color-accent)]"
          />
          Keep me signed in on this device
        </label>

        <AuthAlert content={alert} />

        <Button
          type="submit"
          variant="primary"
          className="h-10 w-full rounded-full font-semibold"
          disabled={busy}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

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
    <div className="glass mx-auto w-full max-w-sm space-y-4 rounded-2xl p-6">
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight">No session to read</h1>
      </div>
      <AuthAlert content={content} />
      <p className="text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
        The Studio has no accounts of its own. It signs in through the dashboard
        session the API writes to the shared root domain, so opening{' '}
        <span className="font-mono text-[10px]">{API_BASE_URL}</span> and signing
        in there is enough — this page picks it up on the next check.
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
      <div className="flex items-center justify-center gap-2 py-20 text-[var(--color-ink-faint)]">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs">Loading your workspaces…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto space-y-2 rounded-xl border border-[var(--color-danger)]/30 p-6 text-center">
        <TriangleAlert size={18} className="mx-auto text-[var(--color-danger)]" />
        <p className="text-sm font-medium">Could not load projects</p>
        <p className="text-[11px] text-[var(--color-ink-dim)]">
          {error?.message ?? 'Unknown error.'}
        </p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <EmptyState
        icon={<Boxes size={20} />}
        title="No workspaces yet"
        message="Create a project in the dashboard first — the Studio edits existing workspace-mode projects."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Choose a workspace</h1>
        <span className="text-[10px] text-[var(--color-ink-faint)]">
          {projects.length} project{projects.length === 1 ? '' : 's'}
        </span>
      </div>

      <ul className="space-y-2.5">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/studio/${project.id}`}
              className={cn(
                'group flex items-center gap-3 rounded-2xl border border-[var(--color-line)] p-4',
                'transition-colors hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-panel-2)]',
              )}
            >
              <div
                aria-hidden
                className="h-9 w-9 shrink-0 rounded-xl bg-[var(--color-accent)]/14 p-2 text-[var(--color-accent)]"
              >
                <Boxes size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{project.name}</p>
                <p className="truncate font-mono text-[10px] text-[var(--color-ink-faint)]">
                  {project.organization?.name ?? project.subdomain} ·{' '}
                  {project.subdomain}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Badge tone="accent">
                  {WORKSPACE_MODE_LABELS[project.workspaceMode as WorkspaceMode] ??
                    project.workspaceMode}
                </Badge>
                {project.updatedAt ? (
                  <span className="hidden text-[10px] text-[var(--color-ink-faint)] sm:inline">
                    {relativeTime(project.updatedAt)}
                  </span>
                ) : null}
                <ArrowRight
                  size={15}
                  className="text-[var(--color-ink-faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-accent)]"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
