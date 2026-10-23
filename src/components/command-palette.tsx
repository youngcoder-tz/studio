'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextInput } from '@/components/ui/input';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  keywords?: string;
  icon?: ReactNode;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.label} ${item.hint ?? ''} ${item.group} ${item.keywords ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const run = (item: CommandItem) => {
    item.run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_oklch,var(--color-canvas)_55%,transparent)] backdrop-blur-md"
        aria-label="Close command palette"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="glass relative z-10 flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl shadow-[var(--shadow-float)]"
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-3 py-2.5">
          <Command size={14} className="text-[var(--color-ink-faint)]" />
          <TextInput
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, components, tokens, actions…"
            className="border-0 bg-transparent px-0 shadow-none"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((n) => Math.min(n + 1, Math.max(filtered.length - 1, 0)));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((n) => Math.max(n - 1, 0));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const item = filtered[active];
                if (item) run(item);
              }
            }}
          />
          <kbd className="kbd">esc</kbd>
        </div>

        <div ref={listRef} className="scroll-y min-h-0 flex-1 p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-[var(--color-ink-faint)]">
              Nothing matches that search.
            </p>
          ) : null}

          {groups.map(([group, groupItems]) => (
            <div key={group} className="mb-2">
              <p className="px-2 py-1 text-[10px] font-semibold tracking-[0.16em] text-[var(--color-ink-faint)] uppercase">
                {group}
              </p>
              {groupItems.map((item) => {
                const index = filtered.indexOf(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => run(item)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left',
                      index === active
                        ? 'bg-[var(--color-accent)]/14 text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-dim)] hover:bg-[var(--color-panel-2)]',
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-panel-2)] text-[var(--color-ink-faint)]">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{item.label}</span>
                      {item.hint ? (
                        <span className="block truncate text-[10px] text-[var(--color-ink-faint)]">
                          {item.hint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
