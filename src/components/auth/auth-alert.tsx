'use client';

// studio/src/components/auth/auth-alert.tsx
//
// The status-driven error surface, mirroring the console's AuthErrorAlert.
//
// The Studio's login call only ever produces a string from the API, which reads
// the same whether the password was wrong, the account is locked, or the
// backend is not running at all. Classifying the failure by its HTTP status (and
// the `code` the auth service attaches) lets the tint and the icon carry the
// severity, so the prose only has to explain what to do next.

import { AlertTriangle, Clock, Info, ShieldAlert, WifiOff } from 'lucide-react';
import type { ComponentType } from 'react';
import { ApiError } from '@/lib/errors';
import { cn } from '@/lib/utils';

export type AuthAlertKind =
  | 'validation'
  | 'invalid_credentials'
  | 'account_locked'
  | 'rate_limited'
  | 'network'
  | 'notice'
  | 'generic';

export interface AuthAlertContent {
  kind: AuthAlertKind;
  title: string;
  description?: string;
}

const TONE: Record<
  AuthAlertKind,
  { wrap: string; icon: string; title: string; body: string }
> = {
  validation: {
    wrap: 'border-[var(--color-warn)]/35 bg-[var(--color-warn)]/10',
    icon: 'text-[var(--color-warn)]',
    title: 'text-[var(--color-warn)]',
    body: 'text-[var(--color-ink-dim)]',
  },
  invalid_credentials: {
    wrap: 'border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10',
    icon: 'text-[var(--color-danger)]',
    title: 'text-[var(--color-danger)]',
    body: 'text-[var(--color-ink-dim)]',
  },
  generic: {
    wrap: 'border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10',
    icon: 'text-[var(--color-danger)]',
    title: 'text-[var(--color-danger)]',
    body: 'text-[var(--color-ink-dim)]',
  },
  account_locked: {
    wrap: 'border-[var(--color-warn)]/35 bg-[var(--color-warn)]/12',
    icon: 'text-[var(--color-warn)]',
    title: 'text-[var(--color-warn)]',
    body: 'text-[var(--color-ink-dim)]',
  },
  rate_limited: {
    wrap: 'border-[var(--color-warn)]/35 bg-[var(--color-warn)]/12',
    icon: 'text-[var(--color-warn)]',
    title: 'text-[var(--color-warn)]',
    body: 'text-[var(--color-ink-dim)]',
  },
  network: {
    wrap: 'border-[var(--color-line-strong)] bg-[var(--color-ink-faint)]/10',
    icon: 'text-[var(--color-ink-dim)]',
    title: 'text-[var(--color-ink)]',
    body: 'text-[var(--color-ink-dim)]',
  },
  notice: {
    wrap: 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10',
    icon: 'text-[var(--color-accent)]',
    title: 'text-[var(--color-ink)]',
    body: 'text-[var(--color-ink-dim)]',
  },
};

const ICON: Record<AuthAlertKind, ComponentType<{ size?: number | string; className?: string }>> =
  {
    validation: AlertTriangle,
    invalid_credentials: ShieldAlert,
    generic: AlertTriangle,
    account_locked: Clock,
    rate_limited: Clock,
    network: WifiOff,
    notice: Info,
  };

/**
 * Turn whatever the login call threw into a classified, human alert.
 *
 * `TypeError` is fetch's signature for "the request never left the browser" —
 * a downed API on :3001 looks identical to a blocked mixed-content call, so it
 * gets the network treatment rather than an invented credential message.
 */
export function classifyAuthError(
  error: unknown,
  fallback = 'Sign-in failed. Try again.',
): AuthAlertContent {
  if (error instanceof ApiError) {
    const message = error.message || fallback;
    if (error.code === 'account_locked' || error.status === 423) {
      return { kind: 'account_locked', title: 'This account is temporarily locked', description: message };
    }
    if (error.status === 429) {
      return {
        kind: 'rate_limited',
        title: 'Too many attempts',
        description: message,
      };
    }
    if (error.status === 401 || error.status === 400) {
      return {
        kind: error.status === 400 ? 'validation' : 'invalid_credentials',
        title:
          error.status === 400
            ? 'Check the details'
            : 'Those credentials were not accepted',
        description: message,
      };
    }
    if (error.status >= 500) {
      return {
        kind: 'network',
        title: 'The workspace API did not answer',
        description: message,
      };
    }
    return { kind: 'generic', title: 'Sign-in failed', description: message };
  }
  if (error instanceof TypeError) {
    return {
      kind: 'network',
      title: 'The workspace API is unreachable',
      description:
        'The Studio could not open a connection. Check that the backend is running and reachable from this origin.',
    };
  }
  return {
    kind: 'generic',
    title: fallback,
    description: error instanceof Error ? error.message : undefined,
  };
}

export function AuthAlert({
  content,
  className,
}: {
  content: AuthAlertContent | null;
  className?: string;
}) {
  if (!content) return null;
  const tone = TONE[content.kind];
  const Icon = ICON[content.kind];
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
        tone.wrap,
        className,
      )}
    >
      <Icon size={15} className={cn('mt-0.5 shrink-0', tone.icon)} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn('font-medium leading-tight', tone.title)}>
          {content.title}
        </p>
        {content.description ? (
          <p className={cn('text-xs leading-relaxed', tone.body)}>
            {content.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
