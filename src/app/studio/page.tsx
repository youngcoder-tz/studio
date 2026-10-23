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
  Loader2,
  LogOut,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import {
  useProjects,
  useViewer,
} from '@/lib/api/hooks';
import type { StudioProject } from '@/lib/api/projects';
import { http, setAccessToken } from '@/lib/api/client';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/input';
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
            <span className="text-xs">Checking session…</span>
          </div>
        ) : viewer.isError ? (
          <SignInPrompt
            onSignedIn={() => {
              void viewer.refetch();
            }}
          />
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = (await http.post('/auth/login', { email, password })) as {
        status?: string;
        accessToken?: string;
        message?: string;
      };
      if (result.status === 'mfa_required') {
        setError(
          'This account has multi-factor auth. The Studio does not handle MFA challenges — sign in through the dashboard and let the shared cookie carry the session.',
        );
        return;
      }
      if (result.status === 'password_reset_required') {
        setError(
          'This account must reset its password before it can be used here. Reset it in the dashboard, then sign in again.',
        );
        return;
      }
      if (!result.accessToken) {
        setError(result.message ?? 'Sign-in returned no session token.');
        return;
      }
      setAccessToken(result.accessToken);
      onSignedIn();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Sign-in failed. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass mx-auto w-full max-w-sm space-y-5 rounded-2xl p-6">
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight">Sign in to continue</h1>
        <p className="text-xs leading-relaxed text-[var(--color-ink-dim)]">
          The Studio needs a dashboard identity — the same account that sees the
          project in the console. Everything under{' '}
          <code className="font-mono text-[10px]">/workspace/*</code> is guarded by
          your user, deliberately.
        </p>
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextInput
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@organisation.dev"
          autoComplete="email"
        />
        <TextInput
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete="current-password"
        />
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 p-2.5">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-[var(--color-warn)]" />
          <p className="text-[10px] leading-relaxed text-[var(--color-ink-dim)]">{error}</p>
        </div>
      ) : null}
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
