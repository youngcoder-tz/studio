'use client';

import { Minus, Plus, Maximize2 } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function ZoomControls() {
  const [zoom, setZoom] = useState(100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="studio-glass absolute bottom-4 right-4 z-10 flex items-center gap-0.5 rounded-xl border border-border p-1 shadow-[0_6px_20px_rgb(0_0_0/0.12)]"
    >
      <Button variant="ghost" size="icon-xs" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(25, z - 25))} className="text-muted-foreground">
        <Minus />
      </Button>
      <span className="min-w-10 rounded-lg bg-secondary px-2 py-0.5 text-center text-[11px] text-muted-foreground">{zoom}%</span>
      <Button variant="ghost" size="icon-xs" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(200, z + 25))} className="text-muted-foreground">
        <Plus />
      </Button>
      <div className="mx-1 h-4 w-px bg-border" />
      <Button variant="ghost" size="icon-xs" aria-label="Reset zoom" onClick={() => setZoom(100)} className="text-muted-foreground">
        <Maximize2 />
      </Button>
    </motion.div>
  );
}
