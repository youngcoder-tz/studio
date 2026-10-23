'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Button } from './button';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  } as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'glass relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl',
          widths[size],
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-3">
          <div className="min-w-0 space-y-0.5">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            {description ? (
              <p className="text-xs leading-relaxed text-[var(--color-ink-faint)]">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={15} />
          </Button>
        </header>

        {children ? <div className="scroll-y min-h-0 flex-1 p-4">{children}</div> : null}

        {footer ? (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--color-line)] bg-[var(--color-panel-2)] px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
