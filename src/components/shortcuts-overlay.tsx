'use client';

import { STUDIO_SHORTCUTS } from '@/lib/shortcuts';
import { Modal } from '@/components/ui/modal';

export function ShortcutsOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const groups = ['Edit', 'Navigate', 'Preview', 'Tools'] as const;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="The Studio is built to stay on the keyboard. These are the ones that matter."
      size="md"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group} className="space-y-2">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--color-ink-faint)] uppercase">
              {group}
            </p>
            <ul className="space-y-1.5">
              {STUDIO_SHORTCUTS.filter((item) => item.group === group).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--color-ink-dim)]">{item.label}</span>
                  <kbd className="kbd">{item.keys}</kbd>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
