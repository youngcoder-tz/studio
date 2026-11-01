// studio/src/components/gnapex-studio/overlays/shortcuts-modal.tsx

'use client';

import { X, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SHORTCUTS = [
  { group: 'General', items: [
    { keys: ['⌘', 'K'], desc: 'Open command palette' },
    { keys: ['⌘', '/'], desc: 'Toggle shortcuts' },
    { keys: ['Esc'], desc: 'Clear selection / Close modals' },
  ]},
  { group: 'Canvas', items: [
    { keys: ['Click'], desc: 'Select element' },
    { keys: ['Double Click'], desc: 'Edit inline text' },
    { keys: ['⌘', 'Z'], desc: 'Undo' },
    { keys: ['⌘', '⇧', 'Z'], desc: 'Redo' },
    { keys: ['⌘', 'D'], desc: 'Duplicate selection' },
    { keys: ['Delete'], desc: 'Remove selection' },
  ]},
  { group: 'Navigation', items: [
    { keys: ['1'], desc: 'Switch to Structure' },
    { keys: ['2'], desc: 'Switch to Layers' },
  ]},
  { group: 'Publishing', items: [
    { keys: ['⌘', '⇧', 'P'], desc: 'Publish workspace' },
  ]},
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.18, ease: [0.25, 0.8, 0.25, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-popover shadow-[0_18px_50px_-12px_rgb(0_0_0/0.35)]"
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Keyboard className="size-4 text-primary dark:text-brand-text" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h3>
                <p className="text-[11px] text-muted-foreground/70">GN-Apex Studio</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
            {SHORTCUTS.map((group) => (
              <div key={group.group} className="space-y-2">
                <h4 className="text-[11px] text-muted-foreground/70">{group.group}</h4>
                <div className="space-y-1">
                  {group.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-secondary">
                      <span className="text-[12px] text-muted-foreground">{item.desc}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, idx) => (
                          <kbd key={idx} className="min-w-[22px] rounded border border-border bg-secondary px-1.5 py-0.5 text-center font-mono text-[10px] text-muted-foreground">{k}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
