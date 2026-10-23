"use client";

// studio/src/components/layers/layer-list.tsx
//
// THE LAYER LIST.
//
// The doc's §5.2 calls for a "drag-and-drop layer list". This is that, with
// HTML5 drag-and-drop rather than a dependency: the list is flat and ordered
// (the document model is a flat array — nesting is positional), so a native
// drag is sufficient and keeps the bundle small.
//
// Two deliberate behaviours:
//
//   • **Hidden components stay in the list.** A layer that has been hidden on
//     every breakpoint must remain selectable, or hidden content becomes
//     unreachable and effectively deleted. It is dimmed and badged instead.
//   • **Reorder is an operation, not a local mutation.** Dropping a row emits
//     `node.move`, so the reorder is undoable and lands in the revision history
//     like any other edit.

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { ComponentManifest, LayoutInstance } from "@/lib/contract";
import { cn } from "@/lib/utils";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export interface LayerListProps {
  instances: LayoutInstance[];
  manifests: Map<string, ComponentManifest>;
  selectedInstanceId: string | null;
  collapsed: string[];
  disabled?: boolean;
  onSelect: (instanceId: string) => void;
  onToggleCollapse: (instanceId: string) => void;
  onMove: (instanceId: string, toIndex: number) => void;
  onRemove: (instanceId: string) => void;
  onDuplicate: (instanceId: string) => void;
  onToggleVisibility: (instanceId: string, visible: boolean) => void;
}

function isHidden(instance: LayoutInstance): boolean {
  return (
    instance.layout?.hideOnMobile === true ||
    instance.layout?.hideOnDesktop === true
  );
}

export function LayerList({
  instances,
  manifests,
  selectedInstanceId,
  collapsed,
  disabled,
  onSelect,
  onToggleCollapse,
  onMove,
  onRemove,
  onDuplicate,
  onToggleVisibility,
}: LayerListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (instances.length === 0) {
    return (
      <EmptyState
        icon={<GripVertical size={18} />}
        title="This page is empty"
        message="Add a component from the palette to start composing this page."
      />
    );
  }

  return (
    <ul className="space-y-0.5 p-1.5">
      {instances.map((instance, index) => {
        const manifest = manifests.get(instance.componentId);
        const selected = instance.instanceId === selectedInstanceId;
        const hidden = isHidden(instance);
        const isDragging = dragIndex === index;
        const isDropTarget =
          overIndex === index && dragIndex !== null && dragIndex !== index;

        return (
          <li
            key={instance.instanceId ?? `${instance.componentId}-${index}`}
            draggable={!disabled}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                onMove(instances[dragIndex].instanceId ?? "", index);
              }
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={cn(
              "group relative rounded-lg border transition-colors",
              selected
                ? "border-(--color-accent)/50 bg-(--color-accent)/8"
                : "border-transparent hover:border-(--color-line) hover:bg-(--color-panel-2)",
              isDragging && "opacity-40",
              isDropTarget && "border-t-2 border-t-(--color-accent)",
            )}
          >
            <div className="flex items-center gap-1 px-1.5 py-1.5">
              <button
                type="button"
                onClick={() => onToggleCollapse(instance.instanceId ?? "")}
                className="focus-ring shrink-0 rounded p-0.5 text-[var(--color-ink-faint)]"
                aria-label={
                  collapsed.includes(instance.instanceId ?? "")
                    ? "Expand"
                    : "Collapse"
                }
              >
                {collapsed.includes(instance.instanceId ?? "") ? (
                  <ChevronRight size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>

              <span className="shrink-0 cursor-grab text-(--color-ink-faint) active:cursor-grabbing">
                <GripVertical size={13} />
              </span>

              <button
                type="button"
                onClick={() => onSelect(instance.instanceId ?? "")}
                className="focus-ring flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                <span
                  className={cn(
                    "truncate text-xs",
                    hidden && "text-(--color-ink-faint) line-through",
                  )}
                >
                  {manifest?.name ?? instance.componentId}
                </span>
                {!manifest ? (
                  <Badge tone="danger">
                    <TriangleAlert size={9} />
                    unknown
                  </Badge>
                ) : null}
                {hidden ? <Badge tone="warn">hidden</Badge> : null}
              </button>

              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    onToggleVisibility(instance.instanceId ?? "", hidden)
                  }
                  aria-label={hidden ? "Show component" : "Hide component"}
                  title={
                    hidden
                      ? "Show on all breakpoints"
                      : "Hide on all breakpoints"
                  }
                >
                  {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDuplicate(instance.instanceId ?? "")}
                  aria-label="Duplicate component"
                  title="Duplicate"
                >
                  <Copy size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:text-(--color-danger)"
                  onClick={() => onRemove(instance.instanceId ?? "")}
                  aria-label="Remove component"
                  title="Remove"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>

            {!collapsed.includes(instance.instanceId ?? "") &&
            manifest?.slots?.length ? (
              <div className="px-3 pb-2 pl-8 text-[10px] text-(--color-ink-faint)">
                {manifest.slots.length} slot
                {manifest.slots.length === 1 ? "" : "s"}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
