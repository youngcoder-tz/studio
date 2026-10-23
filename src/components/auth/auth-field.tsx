'use client';

// studio/src/components/auth/auth-field.tsx
//
// The icon-led pill inputs from the console's sign-in screen, expressed in the
// Studio's token theme. Layout matches gn-apex: label above, a leading icon
// inset in the field, the message for that field underneath it. Keeping the
// error beside its own input (rather than in a banner) is what makes a form
// with two fields feel like it knows which one you got wrong.

import { Eye, EyeOff } from 'lucide-react';
import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

const pill =
  'focus-ring h-11 w-full rounded-full border bg-[color-mix(in_oklch,var(--color-canvas)_70%,transparent)] pr-4 pl-10 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] disabled:opacity-50';

function FieldShell({
  id,
  label,
  icon,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string | null;
  hint?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[13px] font-medium text-[var(--color-ink)]"
      >
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden
          className="absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-[var(--color-ink-faint)]"
        >
          {icon}
        </span>
        {children}
      </div>
      {error ? (
        <p className="pl-4 text-xs leading-snug text-[var(--color-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p className="pl-4 text-[11px] leading-snug text-[var(--color-ink-faint)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface AuthTextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string | null;
  hint?: string | null;
}

export const AuthTextField = forwardRef<HTMLInputElement, AuthTextFieldProps>(
  function AuthTextField(
    { id, label, icon, error, hint, className, ...props },
    ref,
  ) {
    return (
      <FieldShell id={id} label={label} icon={icon} error={error} hint={hint}>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn(
            pill,
            error
              ? 'border-[var(--color-danger)]/60'
              : 'border-[var(--color-line-strong)]',
            className,
          )}
          {...props}
        />
      </FieldShell>
    );
  },
);

/**
 * The password twin: same pill, plus the show/hide control. Grading strength is
 * pointless here — this is an existing password being typed, not chosen.
 */
export function AuthPasswordField({
  id,
  label,
  icon,
  error,
  hint,
  className,
  ...props
}: Omit<AuthTextFieldProps, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} icon={icon} error={error} hint={hint}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        aria-invalid={error ? true : undefined}
        className={cn(
          pill,
          'pr-11',
          error
            ? 'border-[var(--color-danger)]/60'
            : 'border-[var(--color-line-strong)]',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="focus-ring absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </FieldShell>
  );
}
