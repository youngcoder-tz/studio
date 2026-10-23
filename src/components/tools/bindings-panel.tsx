'use client';

import { Database, Unplug } from 'lucide-react';
import type { ComponentManifest, DataSourceDefinition, LayoutInstance } from '@/lib/contract';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

interface BindingRow {
  pageKey: string;
  instanceId: string;
  componentId: string;
  name: string;
  endpoint: string;
  targets: string[];
}

export function BindingsPanel({
  pageLayouts,
  manifests,
  dataSources,
  disabled,
  onSelect,
  onClear,
}: {
  pageLayouts: Record<string, LayoutInstance[]>;
  manifests: Map<string, ComponentManifest>;
  dataSources: DataSourceDefinition[];
  disabled?: boolean;
  onSelect: (pageKey: string, instanceId: string) => void;
  onClear: (pageKey: string, instanceId: string) => void;
}) {
  const rows: BindingRow[] = [];
  for (const [pageKey, instances] of Object.entries(pageLayouts)) {
    for (const instance of instances) {
      if (!instance.binding) continue;
      rows.push({
        pageKey,
        instanceId: instance.instanceId ?? '',
        componentId: instance.componentId,
        name: manifests.get(instance.componentId)?.name ?? instance.componentId,
        endpoint: instance.binding.endpoint,
        targets: instance.binding.targets ?? [],
      });
    }
  }

  const unused = dataSources.filter(
    (source) => !rows.some((row) => row.endpoint === source.endpoint),
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Database size={18} />}
        title="No live bindings"
        message="Components that declare bindable props can pull portal data instead of static copy."
      />
    );
  }

  return (
    <div className="scroll-y h-full min-h-0 space-y-4 p-3">
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={`${row.pageKey}-${row.instanceId}`} className="glass space-y-2 rounded-2xl p-3">
            <button
              type="button"
              onClick={() => onSelect(row.pageKey, row.instanceId)}
              className="block w-full text-left"
            >
              <p className="text-xs font-medium">{row.name}</p>
              <p className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                /{row.pageKey} · {row.endpoint}
              </p>
            </button>
            <div className="flex flex-wrap gap-1">
              {row.targets.map((target) => (
                <Badge key={target}>{target}</Badge>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onClear(row.pageKey, row.instanceId)}
            >
              <Unplug size={12} />
              Unbind
            </Button>
          </li>
        ))}
      </ul>

      {unused.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--color-ink-faint)] uppercase">
            Unused sources
          </p>
          {unused.map((source) => (
            <p key={source.endpoint} className="font-mono text-[11px] text-[var(--color-ink-dim)]">
              {source.endpoint}
              <span className="ml-2 text-[var(--color-ink-faint)]">{source.label}</span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
