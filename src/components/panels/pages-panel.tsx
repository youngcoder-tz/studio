'use client';

// studio/src/components/panels/pages-panel.tsx
//
// PAGE MANAGEMENT.
//
// The page catalog is server-owned (`WORKSPACE_PAGE_CATALOG`), and that is a
// deliberate constraint rather than an oversight: the portal runtime derives the
// page key from the URL after `/portal/`, so a page the catalog does not know
// about is a page no visitor can reach. The Studio therefore presents the
// catalog as a starting point and only allows pages the mode declares, plus an
// explicitly-typed custom key for anything the client's portal adds later.
//
// Required pages cannot be deleted. The backend enforces that too — this just
// removes the affordance so the error is never reached.

import { useState } from 'react';
import {
  AlertCircle,
  FileText,
  LayoutList,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import type { PageDefinition } from '@/lib/contract';
import { cn, titleCase } from '@/lib/utils';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export function PagesPanel({
  pageCatalog,
  pageKeys,
  activePageKey,
  instanceCounts,
  disabled,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  pageCatalog: PageDefinition[];
  pageKeys: string[];
  activePageKey: string;
  instanceCounts: Record<string, number>;
  disabled?: boolean;
  onSelect: (pageKey: string) => void;
  onCreate: (pageKey: string) => void;
  onRename: (from: string, to: string) => void;
  onDelete: (pageKey: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const catalogByKey = new Map(pageCatalog.map((page) => [page.key, page]));
  // Custom pages: present in the document but absent from the catalog.
  const customKeys = pageKeys.filter((key) => !catalogByKey.has(key));
  const unusedCatalog = pageCatalog.filter((page) => !pageKeys.includes(page.key));

  const normalise = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-line)] px-3 py-2.5">
        <h3 className="text-xs font-semibold tracking-wide text-[var(--color-ink-dim)] uppercase">
          Pages
        </h3>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => setCreating((v) => !v)}
        >
          <Plus size={12} />
          New
        </Button>
      </header>

      <div className="scroll-y min-h-0 flex-1 p-2">
        <ul className="space-y-0.5">
          {pageKeys.map((key) => {
            const definition = catalogByKey.get(key);
            const isActive = key === activePageKey;
            const count = instanceCounts[key] ?? 0;
            return (
              <li key={key}>
                <div
                  className={cn(
                    'group flex items-center gap-1 rounded-lg border px-1.5 py-1.5 transition-colors',
                    isActive
                      ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/8'
                      : 'border-transparent hover:border-[var(--color-line)] hover:bg-[var(--color-panel-2)]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(key)}
                    className="focus-ring flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <FileText size={13} className="shrink-0 text-[var(--color-ink-faint)]" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium">
                          {definition?.label ?? titleCase(key)}
                        </span>
                        {definition?.required ? (
                          <Lock size={9} className="text-[var(--color-ink-faint)]" />
                        ) : null}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-[var(--color-ink-faint)]">
                        /{key} · {count} component{count === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={disabled}
                      onClick={() => {
                        setRenaming(key);
                        setRenameValue(key);
                      }}
                      aria-label="Rename page"
                    >
                      <LayoutList size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:text-[var(--color-danger)]"
                      disabled={disabled || definition?.required}
                      onClick={() => setConfirmDelete(key)}
                      title={
                        definition?.required
                          ? 'Required pages cannot be deleted'
                          : 'Delete page'
                      }
                      aria-label="Delete page"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {customKeys.length === 0 && unusedCatalog.length > 0 ? (
          <div className="mt-4 space-y-1.5">
            <p className="px-2 text-[10px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
              Available in this mode
            </p>
            {unusedCatalog.map((page) => (
              <button
                key={page.key}
                type="button"
                disabled={disabled}
                onClick={() => onCreate(page.key)}
                className="focus-ring flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--color-line)] px-2 py-1.5 text-left hover:border-[var(--color-ink-faint)] disabled:opacity-50"
              >
                <span className="truncate text-xs">{page.label}</span>
                <Badge>{page.required ? 'required' : 'optional'}</Badge>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add a page"
        description="Pages must match the routes your portal serves. The mode's catalog is offered as a starting point."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!normalise(newKey) || pageKeys.includes(normalise(newKey))}
              onClick={() => {
                onCreate(normalise(newKey));
                setNewKey('');
                setCreating(false);
              }}
            >
              Create page
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Page key"
            hint="Lowercase, hyphenated. Becomes the URL segment under /portal/."
          >
            <TextInput
              value={newKey}
              autoFocus
              onChange={(event) => setNewKey(event.target.value)}
              placeholder="careers"
              className="font-mono"
            />
          </Field>

          {unusedCatalog.length ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold tracking-wider text-[var(--color-ink-faint)] uppercase">
                Suggested
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unusedCatalog.map((page) => (
                  <button
                    key={page.key}
                    type="button"
                    onClick={() => setNewKey(page.key)}
                    className="focus-ring rounded-md border border-[var(--color-line)] px-2 py-1 text-xs hover:border-[var(--color-ink-faint)]"
                  >
                    {page.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {pageKeys.includes(normalise(newKey)) && normalise(newKey) ? (
            <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-warn)]">
              <AlertCircle size={12} />
              That page already exists.
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Rename page"
        description="Renaming changes the page's URL. Links to the old path will stop working."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={
                !normalise(renameValue) ||
                normalise(renameValue) === renaming ||
                pageKeys.includes(normalise(renameValue))
              }
              onClick={() => {
                if (renaming) onRename(renaming, normalise(renameValue));
                setRenaming(null);
              }}
            >
              Rename
            </Button>
          </>
        }
      >
        <Field label="New page key" hint={`Currently /${renaming ?? ''}`}>
          <TextInput
            value={renameValue}
            autoFocus
            onChange={(event) => setRenameValue(event.target.value)}
            className="font-mono"
          />
        </Field>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this page?"
        description="Every component on the page is removed. This is undoable until you publish."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) onDelete(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete page
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-[var(--color-ink-dim)]">
          <code className="font-mono text-[var(--color-ink)]">{confirmDelete}</code> holds{' '}
          {instanceCounts[confirmDelete ?? ''] ?? 0} component
          {(instanceCounts[confirmDelete ?? ''] ?? 0) === 1 ? '' : 's'}.
        </p>
      </Modal>
    </div>
  );
}
