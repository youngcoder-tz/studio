'use client';

// studio/src/components/palette/palette.tsx
//
// THE COMPONENT PALETTE.
//
// Populated entirely from the manifest the backend sends. There is no
// hard-coded component list here on purpose: adding a component to the registry
// must be a backend-only change, and the moment the Studio keeps its own copy
// of that list the two will drift.
//
// The filter field searches name, description, category and id, because when an
// author has forty components and knows what they want ("testimonial") the
// fastest path is typing it.

import { Search, Plus, CornerDownLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { desktopSpan, type ComponentManifest } from '@/lib/contract';
import { cn, titleCase, truncate } from '@/lib/utils';
import { TextInput } from '@/components/ui/input';
import { Badge, EmptyState } from '@/components/ui/primitives';

export function Palette({
  categories,
  onAdd,
  disabled,
}: {
  categories: { category: string; components: ComponentManifest[] }[];
  onAdd: (manifest: ComponentManifest) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return categories;
    return categories
      .map((group) => ({
        ...group,
        components: group.components.filter((component) =>
          [component.name, component.description, component.id, component.category]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(needle)),
        ),
      }))
      .filter((group) => group.components.length > 0);
  }, [categories, query]);

  const total = useMemo(
    () => filtered.reduce((sum, group) => sum + group.components.length, 0),
    [filtered],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative shrink-0 border-b border-[var(--color-line)] p-2.5">
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-[var(--color-ink-faint)]"
        />
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search components…"
          className="pl-8"
        />
      </div>

      <div className="scroll-y min-h-0 flex-1 p-2">
        {total === 0 ? (
          <EmptyState
            icon={<Search size={18} />}
            title="Nothing matches"
            message="Try a shorter search, or clear it to browse every category."
          />
        ) : null}

        {filtered.map((group) => {
          const isCollapsed = collapsed.includes(group.category) && !query;
          return (
            <div key={group.category} className="mb-2">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) =>
                    prev.includes(group.category)
                      ? prev.filter((c) => c !== group.category)
                      : [...prev, group.category],
                  )
                }
                className="focus-ring flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase hover:text-[var(--color-ink-dim)]"
              >
                <span>{titleCase(group.category)}</span>
                <span className="text-[10px]">{group.components.length}</span>
              </button>

              {isCollapsed ? null : (
                <div className="space-y-1">
                  {group.components.map((component) => (
                    <button
                      key={component.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onAdd(component)}
                      title={component.description}
                      className={cn(
                        'focus-ring group flex w-full items-start gap-2.5 rounded-lg border border-transparent p-2 text-left transition-colors',
                        'hover:border-[var(--color-line)] hover:bg-[var(--color-panel-2)]',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-panel-2)] text-[var(--color-ink-faint)] group-hover:text-[var(--color-accent)]">
                        <Plus size={12} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-medium">
                            {component.name}
                          </span>
                          {desktopSpan(component) != null ? (
                            <Badge>{desktopSpan(component)}/12</Badge>
                          ) : null}
                        </span>
                        {component.description ? (
                          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-ink-faint)]">
                            {truncate(component.description, 90)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <footer className="flex shrink-0 items-center gap-1.5 border-t border-[var(--color-line)] px-3 py-2 text-[10px] text-[var(--color-ink-faint)]">
        <CornerDownLeft size={11} />
        Click a component to append it to the current page.
      </footer>
    </div>
  );
}
