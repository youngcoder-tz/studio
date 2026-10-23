'use client';

import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { EditorDocument } from '@/lib/editor/types';
import { Button } from '@/components/ui/button';
import { TextArea } from '@/components/ui/input';

export function DocumentJsonPanel({ document }: { document: EditorDocument }) {
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(document, null, 2), [document]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-line)] px-3 py-2">
        <p className="text-[11px] text-[var(--color-ink-faint)]">
          Read-only document. Edits still go through operations.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(json);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <TextArea readOnly value={json} className="h-full min-h-full font-mono text-[11px]" />
      </div>
    </div>
  );
}
