'use client';

// studio/src/components/inspector/inspector.tsx
//
// THE INSPECTOR HOST.
//
// Four tabs, in the order an author actually works:
//
//   *Content* — the props form, generated from the manifest's `fields`. This is
//   the tab that makes the Studio no-code: adding a component to the registry
//   adds a working editor for it with no frontend change.
//
//   *Layout*  — grid spans per breakpoint, surface treatment, animation and
//   per-breakpoint visibility. These are the document's `layout` meta, not
//   component props, which is why they live in their own tab rather than being
//   mixed into the form.
//
//   *Data*    — the binding that points a component at a portal-data endpoint.
//   Only offered for components whose manifest declares bindable props; showing
//   an empty binding editor is noise.
//
//   *Advanced* — the raw component id, instance id and a JSON escape hatch for
//   diagnosing a manifest the Studio renders imperfectly.

import { useMemo, useState } from 'react';
import { Boxes, Database, LayoutGrid, Settings2, TriangleAlert } from 'lucide-react';
import type {
  ComponentManifest,
  DataSourceDefinition,
  LayoutInstance,
} from '@/lib/contract';
import { cn, stableStringify } from '@/lib/utils';
import { Badge } from '@/components/ui/primitives';
import { Switch } from '@/components/ui/controls';
import { Field, TextArea, TextInput } from '@/components/ui/input';
import { FieldRenderer } from './field-renderer';
import { Segmented, Select } from '@/components/ui/controls';

type Tab = 'content' | 'layout' | 'data' | 'advanced';

export function Inspector({
  manifest,
  instance,
  dataSources,
  disabled,
  onChangeProps,
  onChangeLayout,
  onChangeVisibility,
  onChangeBinding,
  swapCandidates,
  onReplace,
}: {
  manifest: ComponentManifest | undefined;
  instance: LayoutInstance | undefined;
  dataSources: DataSourceDefinition[];
  disabled?: boolean;
  onChangeProps: (props: Record<string, unknown>) => void;
  onChangeLayout: (layout: Record<string, unknown>) => void;
  onChangeVisibility: (visible: boolean) => void;
  onChangeBinding: (binding: LayoutInstance['binding'] | null) => void;
  swapCandidates?: ComponentManifest[];
  onReplace?: (next: LayoutInstance) => void;
}) {
  const [tab, setTab] = useState<Tab>('content');

  if (!instance) {
    return (
      <div className="px-4 py-10 text-center text-xs text-[var(--color-ink-faint)]">
        Select a component to edit its properties.
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-[var(--color-danger)]">
              Unknown component
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--color-ink-dim)]">
              <code className="font-mono">{instance.componentId}</code> is not in this
              project&apos;s component registry. It was probably added by a template
              meant for a different workspace mode, or by a newer registry version.
              Saving this workspace will fail until it is replaced or removed.
            </p>
          </div>
        </div>
        <Field label="Raw instance" hint="Read-only.">
          <TextArea readOnly value={JSON.stringify(instance, null, 2)} className="font-mono text-[11px]" />
        </Field>
      </div>
    );
  }

  const tabs: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'content', label: 'Content', icon: <Boxes size={12} /> },
    { value: 'layout', label: 'Layout', icon: <LayoutGrid size={12} /> },
    ...(dataSources.length
      ? [{ value: 'data' as Tab, label: 'Data', icon: <Database size={12} /> }]
      : []),
    { value: 'advanced', label: 'Advanced', icon: <Settings2 size={12} /> },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 space-y-2 border-b border-[var(--color-line)] p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{manifest.name}</h3>
            <p className="truncate font-mono text-[10px] text-[var(--color-ink-faint)]">
              {manifest.id} · v{manifest.version}
            </p>
          </div>
          <Badge>{manifest.category}</Badge>
        </div>
        <Segmented
          value={tab}
          onChange={setTab}
          options={tabs}
          className="w-full justify-start overflow-x-auto"
        />
      </header>

      <div className="scroll-y min-h-0 flex-1 p-3">
        {tab === 'content' ? (
          <ContentTab
            manifest={manifest}
            props={instance.props}
            disabled={disabled}
            onChangeProps={onChangeProps}
          />
        ) : null}

        {tab === 'layout' ? (
          <LayoutTab
            instance={instance}
            disabled={disabled}
            onChangeLayout={onChangeLayout}
            onChangeVisibility={onChangeVisibility}
            supportedSpans={manifest.supportedSpans}
          />
        ) : null}

        {tab === 'data' ? (
          <DataTab
            instance={instance}
            manifest={manifest}
            dataSources={dataSources}
            disabled={disabled}
            onChangeBinding={onChangeBinding}
          />
        ) : null}

        {tab === 'advanced' ? (
          <AdvancedTab
            instance={instance}
            manifest={manifest}
            disabled={disabled}
            swapCandidates={swapCandidates ?? []}
            onReplace={onReplace}
          />
        ) : null}
      </div>
    </div>
  );
}

// ─── Content ─────────────────────────────────────────────────────────────────

function ContentTab({
  manifest,
  props,
  disabled,
  onChangeProps,
}: {
  manifest: ComponentManifest;
  props: Record<string, unknown>;
  disabled?: boolean;
  onChangeProps: (props: Record<string, unknown>) => void;
}) {
  if (manifest.fields.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--color-ink-faint)]">
        This component has no editable props.
      </p>
    );
  }

  return (
    <fieldset disabled={disabled} className="space-y-4">
      {manifest.fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={props[field.key]}
          onChange={(value) => onChangeProps({ [field.key]: value ?? null })}
        />
      ))}
    </fieldset>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function LayoutTab({
  instance,
  disabled,
  onChangeLayout,
  onChangeVisibility,
  supportedSpans,
}: {
  instance: LayoutInstance;
  disabled?: boolean;
  onChangeLayout: (layout: Record<string, unknown>) => void;
  onChangeVisibility: (visible: boolean) => void;
  supportedSpans: number[];
}) {
  const layout = instance.layout ?? {};
  const hidden =
    layout.hideOnMobile === true || layout.hideOnDesktop === true;

  const spans = useMemo(() => {
    const set = new Set<number>(supportedSpans.length ? supportedSpans : [12]);
    return Array.from(set).sort((a, b) => a - b);
  }, [supportedSpans]);

  const colSpan = layout.colSpan ?? {};

  const setSpan = (breakpoint: 'mobile' | 'tablet' | 'desktop', value: number | null) => {
    const next = { ...(colSpan as Record<string, number | undefined>) };
    if (value === null) delete next[breakpoint];
    else next[breakpoint] = value;
    // Removing the last breakpoint should remove the container, not leave `{}`,
    // because an empty colSpan is a different (and meaningless) value.
    const cleaned = Object.keys(next).length ? next : undefined;
    onChangeLayout({ colSpan: cleaned ?? {} });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <h4 className="text-[11px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
          Grid span
        </h4>
        {(['desktop', 'tablet', 'mobile'] as const).map((breakpoint) => (
          <Field key={breakpoint} label={breakpoint}>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setSpan(breakpoint, null)}
                className={cn(
                  'focus-ring h-7 rounded-md border px-2 text-xs',
                  (colSpan as Record<string, number>)[breakpoint] === undefined
                    ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'border-[var(--color-line)] text-[var(--color-ink-faint)]',
                )}
              >
                auto
              </button>
              {spans.map((span) => (
                <button
                  key={span}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSpan(breakpoint, span)}
                  className={cn(
                    'focus-ring h-7 w-7 rounded-md border text-xs',
                    (colSpan as Record<string, number>)[breakpoint] === span
                      ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                      : 'border-[var(--color-line)] text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]',
                  )}
                >
                  {span}
                </button>
              ))}
            </div>
          </Field>
        ))}
      </section>

      <section className="space-y-2.5">
        <h4 className="text-[11px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
          Surface
        </h4>
        <Field label="Treatment">
          <select
            disabled={disabled}
            value={(layout.surface as string) ?? ''}
            onChange={(event) =>
              onChangeLayout({ surface: event.target.value || undefined })
            }
            className="focus-ring h-8 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-2 text-sm"
          >
            <option value="">Default</option>
            <option value="flat">Flat</option>
            <option value="elevated">Elevated</option>
            <option value="glassmorphic">Glassmorphic</option>
            <option value="bordered">Bordered</option>
            <option value="gradient">Gradient</option>
          </select>
        </Field>

        <Field label="Animation">
          <select
            disabled={disabled}
            value={(layout.animation as string) ?? ''}
            onChange={(event) =>
              onChangeLayout({ animation: event.target.value || undefined })
            }
            className="focus-ring h-8 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-2 text-sm"
          >
            <option value="">None</option>
            <option value="fade-up">Fade up</option>
            <option value="fade-in">Fade in</option>
            <option value="slide-left">Slide from left</option>
            <option value="slide-right">Slide from right</option>
            <option value="zoom-in">Zoom in</option>
          </select>
        </Field>
      </section>

      <section className="space-y-2.5">
        <h4 className="text-[11px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
          Visibility
        </h4>
        <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-line)] p-2.5">
          <span className="min-w-0">
            <span className="block text-xs font-medium">Visible</span>
            <span className="block text-[10px] text-[var(--color-ink-faint)]">
              Off hides the component on every breakpoint.
            </span>
          </span>
          <Switch
            checked={!hidden}
            onChange={(checked) => onChangeVisibility(checked)}
            label="Visible"
          />
        </label>
      </section>
    </div>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────

function DataTab({
  instance,
  manifest,
  dataSources,
  disabled,
  onChangeBinding,
}: {
  instance: LayoutInstance;
  manifest: ComponentManifest;
  dataSources: DataSourceDefinition[];
  disabled?: boolean;
  onChangeBinding: (binding: LayoutInstance['binding'] | null) => void;
}) {
  const binding = instance.binding;
  const bindable = manifest.dataBinding;

  return (
    <div className="space-y-4">
      {!bindable ? (
        <p className="rounded-md border border-[var(--color-line)] p-2.5 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
          This component renders static content. It has no bindable props, so there
          is nothing to connect to a data source.
        </p>
      ) : (
        <>
          <Field
            label="Data source"
            hint="Points the component at a live endpoint, resolved by the portal runtime."
          >
            <select
              disabled={disabled}
              value={binding?.endpoint ?? ''}
              onChange={(event) =>
                onChangeBinding(
                  event.target.value
                    ? {
                        endpoint: event.target.value,
                        targets: binding?.targets ?? bindable.bindableProps,
                        select: binding?.select,
                      }
                    : null,
                )
              }
              className="focus-ring h-8 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)] px-2 text-sm"
            >
              <option value="">Not bound</option>
              {dataSources
                .filter((source) => bindable.endpoints.includes(source.endpoint))
                .map((source) => (
                  <option key={source.endpoint} value={source.endpoint}>
                    {source.label}
                  </option>
                ))}
              {dataSources
                .filter((source) => !bindable.endpoints.includes(source.endpoint))
                .map((source) => (
                  <option key={source.endpoint} value={source.endpoint}>
                    {source.label} (not declared for this component)
                  </option>
                ))}
            </select>
          </Field>

          {binding ? (
            <>
              <Field
                label="Props to fill"
                hint="Which of this component's props the data lands in."
              >
                <div className="space-y-1 rounded-md border border-[var(--color-line)] p-2">
                  {bindable.bindableProps.length === 0 ? (
                    <p className="text-[11px] text-[var(--color-ink-faint)]">
                      This component declares no bindable props.
                    </p>
                  ) : (
                    bindable.bindableProps.map((prop) => {
                      const checked = binding.targets.includes(prop);
                      return (
                        <label
                          key={prop}
                          className="flex cursor-pointer items-center gap-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={checked}
                            onChange={() => {
                              const targets = checked
                                ? binding.targets.filter((t) => t !== prop)
                                : [...binding.targets, prop];
                              onChangeBinding({ ...binding, targets });
                            }}
                            className="accent-[var(--color-accent)]"
                          />
                          <span className="font-mono text-[11px]">{prop}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </Field>

              <Field
                label="Select expression"
                hint="Optional. Narrow the payload, e.g. `items[0..4]`."
              >
                <TextInput
                  disabled={disabled}
                  value={binding.select ?? ''}
                  onChange={(event) =>
                    onChangeBinding({
                      ...binding,
                      select: event.target.value || undefined,
                    })
                  }
                  className="font-mono text-xs"
                />
              </Field>
            </>
          ) : null}
        </>
      )}

      <div className="rounded-md border border-[var(--color-line)] p-2.5">
        <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
          Available sources
        </p>
        <ul className="space-y-1">
          {dataSources.map((source) => (
            <li key={source.endpoint} className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px]">{source.label}</span>
              <code className="shrink-0 font-mono text-[10px] text-[var(--color-ink-faint)]">
                {source.endpoint}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Advanced ────────────────────────────────────────────────────────────────

function AdvancedTab({
  instance,
  manifest,
  disabled,
  swapCandidates,
  onReplace,
}: {
  instance: LayoutInstance;
  manifest: ComponentManifest;
  disabled?: boolean;
  swapCandidates: ComponentManifest[];
  onReplace?: (next: LayoutInstance) => void;
}) {
  return (
    <div className="space-y-4">
      {onReplace && swapCandidates.length > 0 ? (
        <Field
          label="Swap component"
          hint="Keeps this placement, layout and binding. Props that do not exist on the new type are dropped on the next compile."
        >
          <Select
            value={manifest.id}
            onChange={(id) => {
              const next = swapCandidates.find((item) => item.id === id);
              if (!next || next.id === manifest.id) return;
              onReplace({
                ...instance,
                componentId: next.id,
                props: { ...next.defaultProps, ...instance.props },
              });
            }}
            options={swapCandidates.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            className={disabled ? 'pointer-events-none opacity-50' : undefined}
          />
        </Field>
      ) : null}
      <Field label="Component id" hint="Stable. Changes when the registry migrates a component.">
        <TextInput readOnly value={manifest.id} className="font-mono text-xs" />
      </Field>
      <Field label="Instance id" hint="Identifies this placement within the page.">
        <TextInput readOnly value={instance.instanceId ?? ''} className="font-mono text-xs" />
      </Field>
      <Field
        label="Default props"
        hint="What the manifest supplies before any author edits."
      >
        <TextArea
          readOnly
          value={JSON.stringify(manifest.defaultProps, null, 2)}
          className="font-mono text-[11px]"
        />
      </Field>
      <Field label="Instance JSON" hint="Read-only view of the stored instance.">
        <TextArea
          readOnly
          value={stableJson(instance)}
          className="font-mono text-[11px]"
        />
      </Field>
    </div>
  );
}

function stableJson(value: unknown): string {
  try {
    return JSON.stringify(JSON.parse(stableStringify(value)), null, 2);
  } catch {
    return '';
  }
}
