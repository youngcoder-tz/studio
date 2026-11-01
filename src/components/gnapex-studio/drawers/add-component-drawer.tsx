// studio/src/components/gnapex-studio/drawers/add-component-drawer.tsx
// ADD COMPONENT DRAWER

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Box } from 'lucide-react';

interface ComponentItem {
  id: string;
  name: string;
  category: string;
  description: string;
  allowed: boolean;
}

const COMPONENTS: ComponentItem[] = [
  { id: 'button', name: 'Button', category: 'Actions', description: 'Interactive button element', allowed: true },
  { id: 'card', name: 'Card', category: 'Layout', description: 'Content container', allowed: true },
  { id: 'input', name: 'Input', category: 'Forms', description: 'Text input field', allowed: true },
  { id: 'text', name: 'Text', category: 'Content', description: 'Rich text block', allowed: true },
  { id: 'image', name: 'Image', category: 'Media', description: 'Image with optimization', allowed: true },
  { id: 'badge', name: 'Badge', category: 'Display', description: 'Status indicator', allowed: true },
];

export function AddComponentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(COMPONENTS.map(c => c.category)));
  const filtered = COMPONENTS.filter(c => 
    (!search || c.name.toLowerCase().includes(search.toLowerCase())) &&
    (!selectedCategory || c.category === selectedCategory)
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99997] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 z-[99998] flex h-full w-full max-w-md flex-col border-l border-border bg-popover shadow-[0_18px_50px_-12px_rgb(0_0_0/0.35)] backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Add Component</h2>
            <p className="text-[11px] text-muted-foreground/70">Insert approved components into allowed zones</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <Search className="size-4 text-muted-foreground/70" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search components..."
              className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-lg px-2 py-1 text-[11px] ${selectedCategory === null ? 'bg-primary/10 text-primary dark:text-brand-text' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2 py-1 text-[11px] ${selectedCategory === cat ? 'bg-primary/10 text-primary dark:text-brand-text' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(comp => (
              <motion.button
                key={comp.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative flex flex-col items-start gap-2 rounded-xl border border-border bg-secondary p-3 text-left transition-all hover:border-primary/45 hover:bg-primary/10"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10">
                  <Box className="size-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-foreground">{comp.name}</p>
                  <p className="text-[10px] text-muted-foreground/70">{comp.description}</p>
                </div>
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Plus className="size-3.5 text-primary dark:text-brand-text" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="border-t border-border p-4">
          <p className="text-center text-[10px] text-muted-foreground/70">
            Only contract-approved components can be added
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
