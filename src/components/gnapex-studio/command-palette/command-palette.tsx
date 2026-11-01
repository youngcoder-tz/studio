// studio/src/components/gnapex-studio/command-palette/command-palette.tsx
//
// THE COMMAND PALETTE.
//
// Jump anywhere in the provisioned OS at lightning speed: pages, sections,
// workspace design, panels, viewport, publish, preview. Powered by cmdk.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import {
  ArrowRight,
  Command as CommandIcon,
  Download,
  LayoutGrid,
  Monitor,
  Paintbrush,
  Search,
  Smartphone,
  TabletSmartphone,
} from 'lucide-react';

import { useManifest } from '@/lib/api/hooks';
import { store } from '@/lib/gnapex-studio/store';
import { buildDirectory } from '@/lib/gnapex-studio/visual-ir';
import { buildVFS, findVfsFile } from '@/lib/gnapex-studio/vfs';
import { VIEWPORTS, type ViewportKey } from '@/lib/gnapex-studio/types';

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  // Self-sufficient: the palette sources the workspace structure itself so the
  // shell stays a thin composer (same pattern as the contextual inspector).
  const meta = store((s) => s.meta);
  const document_ = store((s) => s.document);
  const { data: manifest } = useManifest(meta?.projectId ?? '');
  const groups =
    manifest && document_ ? buildDirectory(manifest, document_) : [];
  const vfs = useMemo(
    () => (manifest ? buildVFS(manifest.pageCatalog) : null),
    [manifest],
  );

  const close = useCallback(() => {
    setQuery('');
    onOpenChange(false);
  }, [onOpenChange]);

  const openPage = useCallback(
    (pageKey: string) => {
      const location = vfs ? findVfsFile(vfs, pageKey) : null;
      if (location) {
        store
          .getState()
          .openFile(location.folderPath, location.file.id);
        return;
      }
      store.getState().selectPage(pageKey);
    },
    [vfs],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange, open, close]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/40 pt-[18vh] backdrop-blur-sm">
      <div
        className="studio-popover studio-popover-lift w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="[&_[cmdk-input-wrapper]_svg]:text-muted-foreground [&_[cmdk-item]]:aria-selected:bg-accent" loop>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Jump to pages, sections, design, actions..."
              className="h-12 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70"
            />
            <div className="flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70">
              <CommandIcon className="size-3" />
              K
            </div>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-[12px] text-muted-foreground/70">
              Nothing matches &quot;{query}&quot;
            </Command.Empty>

            <Command.Group
              heading="Workspace Design"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
            >
              <Command.Item
                onSelect={() => {
                  store.getState().setActiveStation('palette');
                  close();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-foreground aria-selected:text-foreground"
              >
                <Paintbrush className="size-4 text-primary dark:text-brand-text" />
                <span className="flex-1">Open Workspace Design</span>
                <ArrowRight className="size-3 text-muted-foreground/70" />
              </Command.Item>
            </Command.Group>

            {groups
              .filter((g) => !g.area.design)
              .map((group) => (
                <Command.Group
                  key={group.area.key}
                  heading={group.area.label}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
                >
                  {group.entries.map((entry) => {
                    const location = vfs
                      ? findVfsFile(vfs, entry.page.key)
                      : null;
                    return (
                      <Command.Item
                        key={entry.page.key}
                        onSelect={() => {
                          openPage(entry.page.key);
                          close();
                        }}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-foreground aria-selected:text-foreground"
                      >
                        <LayoutGrid className="size-4 text-muted-foreground" />
                        <span className="flex-1 truncate">
                          {entry.page.label}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/70">
                          {location
                            ? `/${location.urlPath.join('/')}`
                            : entry.page.key}
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}

            <Command.Group
              heading="Viewport"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
            >
              {(['desktop', 'tablet', 'mobile'] as ViewportKey[]).map((key) => {
                const Icon =
                  key === 'desktop'
                    ? Monitor
                    : key === 'tablet'
                      ? TabletSmartphone
                      : Smartphone;
                return (
                  <Command.Item
                    key={key}
                    onSelect={() => {
                      store.getState().setViewport(key);
                      close();
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-foreground aria-selected:text-foreground"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1">Switch to {VIEWPORTS[key].label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      {VIEWPORTS[key].width}px
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70"
            >
              <Command.Item
                onSelect={() => onOpenChange(false)}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-foreground aria-selected:text-foreground"
              >
                <Download className="size-4 text-muted-foreground" />
                <span className="flex-1">Publish workspace</span>
                <span className="text-[10px] font-mono text-muted-foreground/70">⌘⇧P</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
      <div className="absolute inset-0" onClick={() => onOpenChange(false)} />
    </div>
  );
}
