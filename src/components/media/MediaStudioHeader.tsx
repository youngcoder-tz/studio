// gn-apex/src/components/media/MediaStudioHeader.tsx
"use client";

import React from "react";
import { Sparkles, LayoutTemplate } from "lucide-react";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MediaLibrarySheet } from "./MediaLibrarySheet";

export interface MediaStudioHeaderProps {
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: string;
  onSelectTemplateFile?: (file: File) => void;
  extraRight?: React.ReactNode;
  className?: string;
}

export function MediaStudioHeader({
  icon,
  title = "Apex Media Engine",
  subtitle,
  badge,
  onSelectTemplateFile,
  extraRight,
  className,
}: MediaStudioHeaderProps) {
  return (
    <DialogHeader
      className={`shrink-0 border-b border-white/8 px-6 py-4 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className=" border border-primary/20 bg-linear-to-br from-cyan-500 to-purple-500 p-2 shadow">
            {icon ?? <Sparkles className="h-4 w-4 text-white" />}
          </div>
          <div>
            <DialogTitle className="text-base font-bold tracking-tight">
              {title}
            </DialogTitle>
            {subtitle && (
              <DialogDescription className="mt-0 text-[11px] text-muted-foreground">
                {subtitle}
              </DialogDescription>
            )}
          </div>
          {badge && (
            <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5">
            <MediaLibrarySheet onSelectFile={onSelectTemplateFile}>
              <button className="rounded-full bg-foreground text-background px-3 py-2 text-xs font-medium  hover:text-foreground flex items-center gap-1.5">
                <LayoutTemplate size={12} />
                Templates
              </button>
            </MediaLibrarySheet>
          </div>
          {extraRight}
        </div>
      </div>
    </DialogHeader>
  );
}
