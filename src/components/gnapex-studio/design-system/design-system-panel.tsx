// studio/src/components/gnapex-studio/design-system/design-system-panel.tsx
//
// THE DESIGN SYSTEM PANEL.
//
// Full token editing for the Workspace Design scope. Tokens flow through
// inheritance: Workspace → Page → Section → Component. The panel lets the
// client sculpt their brand with live token swatches and human-friendly
// controls, without exposing CSS variables or class names.

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Droplets,
  Image as ImageIcon,
  Lock,
  Palette,
  Sparkles,
  Type as TypeIcon,
} from 'lucide-react';

import { store } from '@/lib/gnapex-studio/store';
import { CANONICAL_TOKEN_KINDS, TOKEN_GROUPS } from '@/lib/contract';

export function DesignSystemPanel() {
  const document_ = store((s) => s.document);
  const tokens = document_?.globalTokens ?? {};

  const [expanded, setExpanded] = useState<string[]>(['Brand colours']);

  const toggle = (group: string) => {
    setExpanded((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="size-4 text-primary dark:text-brand-text" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
              Design System
            </h2>
            <p className="text-[11px] text-muted-foreground/70">
              Workspace Identity
            </p>
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Changes propagate across every page of your provisioned OS. These are
          semantic tokens, not raw CSS.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-gradient-to-b from-primary/10 to-transparent p-4">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary dark:text-brand-text" />
          <div>
            <p className="text-[12px] font-medium text-foreground">
              Token editing in active development
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Full live token application with instant canvas updates lands in
              the next iteration. Current values are visible below.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {TOKEN_GROUPS.map((group) => {
          const isExpanded = expanded.includes(group.label);
          const Icon =
            group.label === 'Brand colours'
              ? Palette
              : group.label === 'Typography'
                ? TypeIcon
                : group.label === 'Identity & locale'
                  ? ImageIcon
                  : Droplets;

          return (
            <div
              key={group.label}
              className="overflow-hidden rounded-xl border border-border bg-secondary"
            >
              <button
                type="button"
                onClick={() => toggle(group.label)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">
                    {group.label}
                  </span>
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70">
                    {group.keys.filter((k) => tokens[k] !== undefined).length}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="size-4 text-muted-foreground/70" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isExpanded ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-border p-3">
                      {group.keys.map((key) => {
                        const value = tokens[key];
                        if (value === undefined) return null;
                        const kind = CANONICAL_TOKEN_KINDS[key];

                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-3 py-2.5 transition-all hover:border-border hover:bg-accent"
                          >
                            <div className="min-w-0">
                              <p className="text-[12px] text-foreground">
                                {key
                                  .replace(/([A-Z])/g, ' $1')
                                  .replace(/^./, (c) => c.toUpperCase())}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground/70">
                                {key}
                              </p>
                            </div>
                            {kind === 'color' && typeof value === 'string' ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="size-7 rounded-lg border border-border shadow-sm"
                                  style={{
                                    backgroundColor: value,
                                    boxShadow: `0 4px 12px ${value}33`,
                                  }}
                                />
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {value}
                                </span>
                              </div>
                            ) : (
                              <span className="max-w-[50%] truncate rounded-md bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">
                                {String(value)}
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
