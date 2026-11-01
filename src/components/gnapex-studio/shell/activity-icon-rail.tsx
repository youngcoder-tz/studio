// studio/src/components/gnapex-studio/shell/activity-icon-rail.tsx
"use client";

import React from "react";
import {
  FolderTree,
  Settings2,
  Palette,
  Boxes,
  FlaskConical,
  Sparkles,
  Image as ImageIcon,
  History,
  Sliders,
} from "lucide-react";
import { store, type ActiveStation } from "@/lib/gnapex-studio/store";

interface StationButton {
  id: ActiveStation;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

const STATIONS: StationButton[] = [
  { id: "explorer", label: "Pages", icon: FolderTree },
  { id: "setups", label: "Setup", icon: Settings2 },
  { id: "palette", label: "Palette", icon: Palette },
  { id: "library", label: "Components", icon: Boxes },
  { id: "states", label: "Playground", icon: FlaskConical },
  { id: "gora", label: "Gora AI", icon: Sparkles, highlight: true },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "revisions", label: "History", icon: History },
  { id: "settings", label: "Studio settings", icon: Sliders },
];

export function ActivityIconRail() {
  const activeStation = store((s) => s.activeStation);
  const setActiveStation = store((s) => s.setActiveStation);

  return (
    <nav
      aria-label="Studio sections"
      className="studio-glass flex w-14 shrink-0 select-none flex-col items-center gap-1 py-3"
    >
      {/* Brand glyph tile */}
      <div
        className="mb-2 grid size-9 place-items-center rounded-xl bg-linear-to-br from-[var(--brand-text)] to-indigo-600 font-bold text-white shadow-sm"
        title="GN-Apex Workspace Studio"
      >
        ✦
      </div>

      {STATIONS.map((station, index) => {
        const Icon = station.icon;
        const isActive = activeStation === station.id;
        // The mockup docks the last rail item ("Studio settings") to the bottom
        // of the rail with a flexible spacer.
        const needsSpacer = index === STATIONS.length - 1;

        return (
          <React.Fragment key={station.id}>
            {needsSpacer ? <div className="flex-1" /> : null}
            <button
              type="button"
              onClick={() => setActiveStation(station.id)}
              aria-label={station.label}
              data-active={isActive}
              className={`studio-rail-button group ${
                isActive
                  ? "studio-rail-button-active"
                  : station.highlight
                    ? "text-[var(--brand-text)]/80 hover:text-[var(--brand-text)]"
                    : ""
              }`}
            >
              <Icon className="size-[17px] transition-transform duration-200 group-hover:scale-110" />
              <span className="studio-tip">{station.label}</span>
            </button>
          </React.Fragment>
        );
      })}

      {/* Spacer before the version tag; settings is docked above via the
          earlier spacer, mirroring the mockup rail. */}
      <span className="text-[9px] font-mono tracking-tighter text-muted-foreground/50">
        v4.2
      </span>
    </nav>
  );
}
