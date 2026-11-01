// studio/src/components/gnapex-studio/canvas/floating-toolbar.tsx
"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  EyeOff,
  Layers,
  MousePointer2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { store } from "@/lib/gnapex-studio/store";
import { toast } from "sonner";
import type { WorkspaceOperation } from "@/lib/contract";

/**
 * Direct manipulation executor.
 * Modifies the Zustand document state optimistically and queues operations for autosave.
 */
function dispatchCanvasAction(action: "up" | "down" | "dup" | "hide" | "del") {
  const state = store.getState();
  const { pageKey, instanceId } = state.selection;

  if (!pageKey || !instanceId || !state.document) return;

  const layouts = [...(state.document.pageLayouts?.[pageKey] ?? [])];
  const idx = layouts.findIndex((i) => i.instanceId === instanceId);
  if (idx === -1) return;

  const current = layouts[idx];
  let pendingOp: WorkspaceOperation | null = null;

  if (action === "del") {
    layouts.splice(idx, 1);
    pendingOp = { op: "node.remove", pageKey, instanceId };
    store.getState().clearInstanceSelection();
    toast("Block removed. Press Ctrl+Z to undo.");
  } else if (action === "up" && idx > 0) {
    const temp = layouts[idx];
    layouts[idx] = layouts[idx - 1];
    layouts[idx - 1] = temp;
    pendingOp = {
      op: "node.move",
      pageKey,
      instanceId,
      to: { pageKey, index: idx - 1 },
    };
  } else if (action === "down" && idx < layouts.length - 1) {
    const temp = layouts[idx];
    layouts[idx] = layouts[idx + 1];
    layouts[idx + 1] = temp;
    pendingOp = {
      op: "node.move",
      pageKey,
      instanceId,
      to: { pageKey, index: idx + 1 },
    };
  } else if (action === "dup") {
    // Generate a collision-resistant ID suffix
    const newId = `${current.componentId}-${Math.random().toString(36).slice(2, 8)}`;
    const clone = JSON.parse(JSON.stringify(current));
    clone.instanceId = newId;
    layouts.splice(idx + 1, 0, clone);
    pendingOp = {
      op: "node.duplicate",
      pageKey,
      instanceId,
      newInstanceId: newId,
    };
    store.getState().selectInstance(pageKey, newId);
    toast("Block duplicated.");
  } else if (action === "hide") {
    const isHidden = Boolean(
      current.layout?.hideOnDesktop && current.layout?.hideOnMobile,
    );
    const newLayout = {
      ...current.layout,
      hideOnDesktop: !isHidden,
      hideOnMobile: !isHidden,
    };
    layouts[idx] = { ...current, layout: newLayout };
    pendingOp = {
      op: "node.setVisibility",
      pageKey,
      instanceId,
      visible: isHidden,
    };
    toast(
      isHidden
        ? "Block is now visible."
        : "Block hidden. Bring it back from Layers.",
    );
  }

  if (pendingOp) {
    store.setState({
      document: {
        ...state.document,
        pageLayouts: { ...state.document.pageLayouts, [pageKey]: layouts },
        isDirty: true,
      },
      pendingOps: [...state.pendingOps, pendingOp],
    });
  }
}

export function FloatingToolbar() {
  const selection = store((s) => s.selection);
  const bounds = store((s) => s.bounds);
  const bridgeStatus = store((s) => s.bridgeStatus);

  const isActive = useMemo(() => {
    return (
      bridgeStatus === "active" &&
      selection.scope === "component" &&
      selection.instanceId &&
      bounds[selection.instanceId]
    );
  }, [bridgeStatus, selection.scope, selection.instanceId, bounds]);

  if (!isActive || !selection.instanceId) return null;

  const b = bounds[selection.instanceId];
  const top = Math.max(b.y - 48, 8);
  const left = b.x + b.width / 2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.16, ease: [0.25, 0.8, 0.25, 1] }}
        className="pointer-events-auto absolute z-[20] -translate-x-1/2"
        style={{ top, left }}
      >
        <div className="studio-glass flex items-center gap-0.5 rounded-xl border border-border px-1.5 py-1.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.45)]">
          <ToolbarBtn
            icon={<MousePointer2 className="size-3.5" />}
            title="Select"
            active
          />
          <Divider />
          <ToolbarBtn
            icon={<ArrowUp className="size-3.5" />}
            title="Move Up"
            onClick={() => dispatchCanvasAction("up")}
          />
          <ToolbarBtn
            icon={<ArrowDown className="size-3.5" />}
            title="Move Down"
            onClick={() => dispatchCanvasAction("down")}
          />
          <ToolbarBtn
            icon={<Copy className="size-3.5" />}
            title="Duplicate"
            onClick={() => dispatchCanvasAction("dup")}
          />
          <Divider />
          <ToolbarBtn
            icon={<Sparkles className="size-3.5" />}
            title="AI Rewrite"
            onClick={() => toast("AI rewrite is part of the full build")}
          />
          <ToolbarBtn
            icon={<Layers className="size-3.5" />}
            title="Layers"
            onClick={() => store.getState().setBottomDrawer("Layers")}
          />
          <Divider />
          <ToolbarBtn
            icon={<EyeOff className="size-3.5" />}
            title="Hide"
            onClick={() => dispatchCanvasAction("hide")}
          />
          <ToolbarBtn
            icon={<Trash2 className="size-3.5" />}
            title="Remove"
            danger
            onClick={() => dispatchCanvasAction("del")}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ToolbarBtn({
  icon,
  title,
  active,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`group relative flex items-center justify-center rounded-lg p-2 transition-all ${
        active
          ? "bg-[var(--active)] text-[var(--brand-text)]"
          : danger
            ? "text-destructive hover:bg-destructive/10"
            : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
      }`}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}
