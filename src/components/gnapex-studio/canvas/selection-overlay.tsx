// THE OVERLAY LAYER.
// Pure presentation: draws selected/hover outlines from bridge-reported bounds.
'use client';

import { store } from '@/lib/gnapex-studio/store';

export function SelectionOverlay() {
  const bridgeStatus = store((s) => s.bridgeStatus);
  const selection = store((s) => s.selection);
  const hoverInstanceId = store((s) => s.hoverInstanceId);
  const bounds = store((s) => s.bounds);

  if (bridgeStatus !== 'active') return null;
  if (selection.scope === 'workspace') return null;

  const selectedBounds = selection.scope === 'component' && selection.instanceId ? bounds[selection.instanceId] : undefined;
  const hoverBounds = hoverInstanceId ? bounds[hoverInstanceId] : undefined;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" role="presentation">
      {hoverBounds && hoverInstanceId !== selection.instanceId ? (
        <div
          className="absolute rounded-[3px] border border-primary/50"
          style={{ left: hoverBounds.x, top: hoverBounds.y, width: hoverBounds.width, height: hoverBounds.height }}
        />
      ) : null}

      {selectedBounds && selection.instanceId ? (
        <>
          <div
            className="absolute rounded-[3px] outline-2 outline-offset-2 outline-primary"
            style={{ left: selectedBounds.x, top: selectedBounds.y, width: selectedBounds.width, height: selectedBounds.height }}
          />
          {[
            [selectedBounds.x, selectedBounds.y],
            [selectedBounds.x + selectedBounds.width, selectedBounds.y],
            [selectedBounds.x, selectedBounds.y + selectedBounds.height],
            [selectedBounds.x + selectedBounds.width, selectedBounds.y + selectedBounds.height],
          ].map(([x, y]) => (
            <span
              key={`${x}-${y}`}
              className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border-[1.5px] border-primary bg-white"
              style={{ left: x, top: y }}
            />
          ))}
          <div
            className="absolute -translate-y-full rounded-[5px] bg-primary px-1.5 py-px text-[10px] font-medium text-primary-foreground"
            style={{ left: selectedBounds.x, top: Math.max(selectedBounds.y - 6, 18) }}
          >
            Selected
          </div>
        </>
      ) : null}
    </div>
  );
}
