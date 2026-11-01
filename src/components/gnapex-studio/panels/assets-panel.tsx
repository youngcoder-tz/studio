// studio/src/components/gnapex-studio/panels/assets-panel.tsx

'use client';

import { Image as ImageIcon, Upload, Search } from 'lucide-react';
import { useState } from 'react';

export function AssetsPanel() {
  const [query, setQuery] = useState('');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-[13px] font-semibold text-foreground">Assets</h3>
        <p className="text-[11px] text-muted-foreground/70">Media Library</p>
      </div>
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-2 py-1.5">
          <Search className="size-3.5 text-muted-foreground/70" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assets..." className="flex-1 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground/70" />
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary">
          <ImageIcon className="size-5 text-muted-foreground/70" />
        </div>
        <p className="text-[12px] font-medium text-muted-foreground">No assets yet</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">Upload images, logos or icons to use across your workspace</p>
        <button className="mt-2 flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-[11px] text-foreground hover:bg-accent">
          <Upload className="size-3.5" /> Upload asset
        </button>
      </div>
    </div>
  );
}
