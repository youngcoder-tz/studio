// studio/src/components/gnapex-studio/context-menu/context-menu.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ClipboardPaste,
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

// Memory for copied block styles/props
let styleClipboard: Record<string, unknown> | null = null;

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  divider?: boolean;
}

export function CanvasContextMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  // Monitor the global store to know if a component is actively selected
  const selection = store((s) => s.selection);
  const hasSelection =
    selection.scope === "component" && selection.instanceId !== null;

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Prevent default context menu everywhere inside the canvas/stage area
      const target = e.target as HTMLElement;
      if (target.closest("[data-gnapex-canvas]") || target.closest("aside")) {
        e.preventDefault();

        // Ensure menu doesn't overflow off-screen
        let x = e.clientX;
        let y = e.clientY;
        if (x + 220 > window.innerWidth) x = window.innerWidth - 230;
        if (y + 320 > window.innerHeight) y = window.innerHeight - 330;

        setPos({ x, y });
        setOpen(true);
      }
    };

    const closeMenu = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const dispatchAction = (action: "up" | "down" | "dup" | "del") => {
    const state = store.getState();
    const { pageKey, instanceId } = state.selection;
    if (!pageKey || !instanceId || !state.document) return;

    const layouts = [...(state.document.pageLayouts?.[pageKey] ?? [])];
    const idx = layouts.findIndex((i) => i.instanceId === instanceId);
    if (idx === -1) return;

    let pendingOp: WorkspaceOperation | null = null;

    if (action === "del") {
      layouts.splice(idx, 1);
      pendingOp = { op: "node.remove", pageKey, instanceId };
      store.getState().clearInstanceSelection();
      toast("Block removed.");
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
      const newId = `${layouts[idx].componentId}-${Math.random().toString(36).slice(2, 8)}`;
      const clone = JSON.parse(JSON.stringify(layouts[idx]));
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
  };

  const handleCopyStyle = () => {
    const state = store.getState();
    const { pageKey, instanceId } = state.selection;
    if (!pageKey || !instanceId || !state.document) return;

    const layout = state.document.pageLayouts?.[pageKey]?.find(
      (i) => i.instanceId === instanceId,
    );
    if (layout) {
      styleClipboard = JSON.parse(JSON.stringify(layout.layout || {}));
      toast.success("Style copied to clipboard");
    }
  };

  const handlePasteStyle = () => {
    const state = store.getState();
    const { pageKey, instanceId } = state.selection;
    if (!pageKey || !instanceId || !state.document || !styleClipboard) return;

    store
      .getState()
      .stageProps(pageKey, instanceId, { layout: styleClipboard });
    toast.success("Style pasted");
  };

  const items: MenuItem[] = [
    {
      label: "Select element",
      icon: <MousePointer2 className="size-3.5" />,
      shortcut: "Click",
    },
    {
      label: "Rewrite with AI",
      icon: <Sparkles className="size-3.5" />,
      onClick: () => toast("AI rewrite is part of the full build"),
      divider: true,
    },

    {
      label: "Move Up",
      icon: <ArrowUp className="size-3.5" />,
      disabled: !hasSelection,
      onClick: () => dispatchAction("up"),
    },
    {
      label: "Move Down",
      icon: <ArrowDown className="size-3.5" />,
      disabled: !hasSelection,
      onClick: () => dispatchAction("down"),
    },
    {
      label: "Duplicate",
      icon: <Copy className="size-3.5" />,
      disabled: !hasSelection,
      shortcut: "⌘D",
      onClick: () => dispatchAction("dup"),
    },

    {
      label: "Copy Style",
      icon: <Copy className="size-3.5" />,
      disabled: !hasSelection,
      divider: true,
      onClick: handleCopyStyle,
    },
    {
      label: "Paste Style",
      icon: <ClipboardPaste className="size-3.5" />,
      disabled: !hasSelection || !styleClipboard,
      onClick: handlePasteStyle,
    },

    {
      label: "View in layers",
      icon: <Layers className="size-3.5" />,
      divider: true,
      onClick: () => store.getState().setBottomDrawer("Layers"),
    },
    {
      label: "Hide",
      icon: <EyeOff className="size-3.5" />,
      disabled: !hasSelection,
      onClick: () => toast("Hidden. Bring it back from Layers."),
    },
    {
      label: "Delete",
      icon: <Trash2 className="size-3.5" />,
      disabled: !hasSelection,
      shortcut: "Del",
      danger: true,
      onClick: () => dispatchAction("del"),
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.98, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -5 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="studio-popover fixed z-[99998] min-w-[220px] overflow-hidden rounded-xl p-1.5"
          style={{ left: pos.x, top: pos.y }}
        >
          {items.map((item, i) => (
            <div key={i}>
              {item.divider && <div className="mx-1 my-1.5 h-px bg-border" />}
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.danger
                    ? "text-red-400 hover:bg-red-500/15"
                    : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
                }`}
              >
                {item.icon}
                <span className="flex-1 font-medium">{item.label}</span>
                {item.shortcut && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {item.shortcut}
                  </span>
                )}
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
