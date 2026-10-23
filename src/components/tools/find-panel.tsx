'use client';

import { useMemo, useState } from 'react';
import { FileText, Layers, Palette, Search, Type } from 'lucide-react';
import type { ComponentManifest, LayoutInstance } from '@/lib/contract';
import { EmptyState } from '@/components/ui/primitives';
import { TextInput } from '@/components/ui/input';

export type FindHit =
  | { kind: 'page'; pageKey: string; label: string }
  | { kind: 'instance'; pageKey: string; instanceId: string; label: string; hint: string }
  | { kind: 'token'; key: string; label: string }
  | { kind: 'copy'; locale: string; key: string; label: string };

export function FindPanel({
  pageLayouts,
  tokens,
  i18n,
  manifests,
  onOpenPage,
  onOpenInstance,
  onOpenTokens,
  onOpenI18n,
}: {
  pageLayouts: Record<string, LayoutInstance[]>;
  tokens: Record<string, string | number>;
  i18n: Record<string, Record<string, string>>;
  manifests: Map<string, ComponentManifest>;
  onOpenPage: (pageKey: string) => void;
  onOpenInstance: (pageKey: string, instanceId: string) => void;
  onOpenTokens: () => void;
  onOpenI18n: () => void;
}) {
  const [query, setQuery] = useState('');

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 1) return [] as FindHit[];
    const out: FindHit[] = [];

    for (const pageKey of Object.keys(pageLayouts)) {
      if (pageKey.toLowerCase().includes(needle)) {
        out.push({ kind: 'page', pageKey, label: `/${pageKey}` });
      }
      for (const instance of pageLayouts[pageKey] ?? []) {
        const name = manifests.get(instance.componentId)?.name ?? instance.componentId;
        const blob = JSON.stringify(instance.props ?? {}).toLowerCase();
        if (
          name.toLowerCase().includes(needle) ||
          instance.componentId.toLowerCase().includes(needle) ||
          (instance.instanceId ?? '').toLowerCase().includes(needle) ||
          blob.includes(needle)
        ) {
          out.push({
            kind: 'instance',
            pageKey,
            instanceId: instance.instanceId ?? '',
            label: name,
            hint: `/${pageKey}`,
          });
        }
      }
    }

    for (const [key, value] of Object.entries(tokens)) {
      if (
        key.toLowerCase().includes(needle) ||
        String(value).toLowerCase().includes(needle)
      ) {
        out.push({ kind: 'token', key, label: `${key} = ${String(value)}` });
      }
    }

    for (const [locale, strings] of Object.entries(i18n)) {
      for (const [key, value] of Object.entries(strings)) {
        if (
          key.toLowerCase().includes(needle) ||
          value.toLowerCase().includes(needle) ||
          locale.toLowerCase().includes(needle)
        ) {
          out.push({
            kind: 'copy',
            locale,
            key,
            label: `${locale}:${key}`,
          });
        }
      }
    }

    return out.slice(0, 80);
  }, [query, pageLayouts, tokens, i18n, manifests]);

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
          placeholder="Find pages, layers, tokens, copy…"
          className="pl-8"
          autoFocus
        />
      </div>
      <div className="scroll-y min-h-0 flex-1 p-2">
        {query.trim() === '' ? (
          <EmptyState
            icon={<Search size={18} />}
            title="Search the workspace document"
            message="Looks through pages, component props, design tokens and locale strings."
          />
        ) : hits.length === 0 ? (
          <EmptyState icon={<Search size={18} />} title="No matches" />
        ) : (
          <ul className="space-y-1">
            {hits.map((hit, index) => (
              <li key={`${hit.kind}-${index}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (hit.kind === 'page') onOpenPage(hit.pageKey);
                    if (hit.kind === 'instance') onOpenInstance(hit.pageKey, hit.instanceId);
                    if (hit.kind === 'token') onOpenTokens();
                    if (hit.kind === 'copy') onOpenI18n();
                  }}
                  className="glass-hover flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left"
                >
                  <span className="mt-0.5 text-[var(--color-ink-faint)]">
                    {hit.kind === 'page' ? <FileText size={13} /> : null}
                    {hit.kind === 'instance' ? <Layers size={13} /> : null}
                    {hit.kind === 'token' ? <Palette size={13} /> : null}
                    {hit.kind === 'copy' ? <Type size={13} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{hit.label}</span>
                    <span className="block truncate text-[10px] text-[var(--color-ink-faint)]">
                      {hit.kind === 'instance' ? hit.hint : hit.kind}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
