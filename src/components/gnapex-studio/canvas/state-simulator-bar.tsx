// studio/src/components/gnapex-studio/canvas/state-simulator-bar.tsx
'use client';

import React from 'react';
import {
  AlertCircle,
  Check,
  FlaskConical,
  Inbox,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { store, type SimulationState } from '@/lib/gnapex-studio/store';

const STATES: { id: SimulationState; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'normal', label: 'Active', icon: Check },
  { id: 'loading', label: 'Loading', icon: Loader2 },
  { id: 'empty', label: 'Empty', icon: Inbox },
  { id: 'validation_error', label: 'Invalid', icon: AlertCircle },
  { id: 'auth_error', label: 'Unauthorized', icon: ShieldAlert },
];

export function StateSimulatorBar() {
  const simulationState = store((s) => s.simulationState);
  const setSimulationState = store((s) => s.setSimulationState);

  return (
    <div
      className="studio-glass flex items-center gap-2 rounded-xl border border-border px-2 py-1.5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)]"
      role="toolbar"
      aria-label="Site-user state simulator"
    >
      <div className="flex items-center gap-1.5 pl-1 pr-2 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        <FlaskConical className="size-3.5 text-[var(--brand-text)]" />
        <span>State</span>
      </div>

      <div className="studio-seg">
        {STATES.map((st) => {
          const Icon = st.icon;
          const isActive = simulationState === st.id;
          return (
            <button
              key={st.id}
              type="button"
              data-active={isActive}
              onClick={() => setSimulationState(st.id)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon
                  className={`size-3 ${st.id === 'loading' && isActive ? 'studio-motion animate-spin' : ''}`}
                  aria-hidden
                />
                {st.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
