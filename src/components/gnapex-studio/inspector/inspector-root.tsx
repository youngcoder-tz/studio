// studio/src/components/gnapex-studio/inspector/inspector-root.tsx
//
// The right-hand inspector rail. Renders on the token system (light + dark):
// translucent cards, border-border lines and brand accents — no hardcoded
// night palette.
"use client";

import React, { useState } from "react";
import {
  Box,
  ChevronDown,
  Copy,
  LayoutGrid,
  Lock,
  MousePointerClick,
  Palette,
  Sparkles,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { useManifest } from "@/lib/api/hooks";
import { store } from "@/lib/gnapex-studio/store";
import { buildPageIR } from "@/lib/gnapex-studio/visual-ir";
import type { IRNode } from "@/lib/gnapex-studio/types";
import { FieldControl } from "./field-controls";

const groupCard = "rounded-xl border border-border bg-card/60";

export function InspectorRoot() {
  const selection = store((s) => s.selection);
  const meta = store((s) => s.meta);
  const document_ = store((s) => s.document);

  return (
    <div className="flex h-full flex-col overflow-hidden text-foreground">
      <div className="studio-scroll flex-1 overflow-y-auto">
        {selection.scope === "component" ? (
          <ComponentInspector selection={selection} />
        ) : selection.scope === "page" ? (
          <PageInspector pageKey={selection.pageKey} />
        ) : (
          <WorkspaceInspector />
        )}
      </div>
      {meta ? (
        <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3">
          <p className="truncate text-[10px] text-muted-foreground">
            {document_?.isDirty ? "Unsaved draft" : "Auto-saved"} · Branch: main
          </p>
          <span className="studio-chip !font-mono !text-[9px]">
            {selection.scope}
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT SCOPE (The Native Editor)
// ─────────────────────────────────────────────────────────────────────────────

function ComponentInspector({
  selection,
}: {
  selection: { pageKey: string | null; instanceId: string | null };
}) {
  const projectId = store((s) => s.meta?.projectId);
  const document_ = store((s) => s.document);
  const manifest = useManifest(projectId ?? "");

  const [tab, setTab] = useState<"Design" | "Prototype" | "Inspect">("Design");

  let node: IRNode | null = null;
  if (manifest.data && document_ && selection.pageKey && selection.instanceId) {
    const ir = buildPageIR(manifest.data, document_, selection.pageKey);
    node = ir.nodes.find((n) => n.instanceId === selection.instanceId) ?? null;
  }

  if (!selection.instanceId) {
    return (
      <div className="p-4">
        <div className={`p-4 text-center ${groupCard}`}>
          <MousePointerClick className="mx-auto mb-2 size-5 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">No selection</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Click anything on the canvas to edit.
          </p>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="p-4 text-xs text-[var(--warning)]">
        Component removed from draft.
      </div>
    );
  }

  const categoryIcon =
    node.category === "Content" ? (
      <Type className="size-4" />
    ) : node.category === "Layout" ? (
      <LayoutGrid className="size-4" />
    ) : (
      <Box className="size-4" />
    );

  const safePageKey = selection.pageKey ?? "";

  return (
    <div className="flex flex-col">
      {/* ── HEADER ── */}
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--active)] text-[var(--brand-text)]">
            {categoryIcon}
          </div>
          <div className="min-w-0 flex-1">
            <b className="block truncate text-xs font-semibold text-foreground">
              {node.componentName}
            </b>
            <div className="truncate text-[10px] leading-snug text-muted-foreground">
              {node.componentDescription || "Schema-driven component"}
            </div>
          </div>
          <button
            type="button"
            className="studio-action !min-h-0 !rounded-lg !px-2 !py-1 !text-[10px]"
          >
            ↰ Parent
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 border-b border-border p-1.5 px-3">
        {(["Design", "Prototype", "Inspect"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
              tab === t
                ? "bg-[var(--active)] text-[var(--brand-text)]"
                : "text-muted-foreground hover:bg-[var(--hover)] hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 p-3">
        {tab === "Design" && (
          <div className="space-y-3">
            {!node.contractKnown && (
              <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-[11px] text-[var(--warning)]">
                <Lock className="mb-1 size-3.5" />
                Component not in contract.
              </div>
            )}

            {node.protectedNotice && (
              <div className="rounded-xl border border-[var(--brand-text)]/25 bg-[var(--active)] p-3 text-[11px] text-[var(--brand-text)]">
                <Lock className="mb-1 size-3.5" />
                {node.protectedNotice}
              </div>
            )}

            {node.contentFields.length > 0 && (
              <InspectorGroup title="Content" defaultOpen>
                {node.contentFields.map((f) => (
                  <FieldControl
                    key={f.key}
                    field={f}
                    value={node!.props[f.key]}
                    pageKey={safePageKey}
                    instanceId={node!.instanceId}
                  />
                ))}
              </InspectorGroup>
            )}

            {node.appearanceFields.length > 0 && (
              <InspectorGroup title="Appearance" defaultOpen>
                {node.appearanceFields.map((f) => (
                  <FieldControl
                    key={f.key}
                    field={f}
                    value={node!.props[f.key]}
                    pageKey={safePageKey}
                    instanceId={node!.instanceId}
                  />
                ))}
              </InspectorGroup>
            )}

            {node.settingFields.length > 0 && (
              <InspectorGroup title="Settings" defaultOpen>
                {node.settingFields.map((f) => (
                  <FieldControl
                    key={f.key}
                    field={f}
                    value={node!.props[f.key]}
                    pageKey={safePageKey}
                    instanceId={node!.instanceId}
                  />
                ))}
              </InspectorGroup>
            )}

            <InspectorGroup title="Visibility" defaultOpen={false}>
              <div className="flex items-center justify-between rounded-lg bg-[var(--soft)] px-3 py-2 text-xs">
                <span>Hide on Mobile</span>
                <Switch
                  checked={node.layout?.hideOnMobile ?? false}
                  onChange={(v) =>
                    store.getState().stageProps(safePageKey, node!.instanceId, {
                      layout: { ...node!.layout, hideOnMobile: v },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--soft)] px-3 py-2 text-xs">
                <span>Hide on Desktop</span>
                <Switch
                  checked={node.layout?.hideOnDesktop ?? false}
                  onChange={(v) =>
                    store.getState().stageProps(safePageKey, node!.instanceId, {
                      layout: { ...node!.layout, hideOnDesktop: v },
                    })
                  }
                />
              </div>
            </InspectorGroup>

            <InspectorGroup title="AI Helper">
              <button
                type="button"
                onClick={() => toast.info("AI field rewriting arrives with the GORA write-back upgrade")}
                className="mb-2 w-full rounded-lg border border-border bg-[var(--soft)] px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
              >
                <Sparkles className="mr-1.5 inline size-3 text-[var(--brand-text)]" />
                Rewrite with AI
              </button>
              <button
                type="button"
                onClick={() => toast.info("AI translation arrives with the GORA write-back upgrade")}
                className="w-full rounded-lg border border-border bg-[var(--soft)] px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
              >
                <Sparkles className="mr-1.5 inline size-3 text-[var(--brand-text)]" />
                Translate to Kiswahili
              </button>
            </InspectorGroup>
          </div>
        )}

        {tab === "Prototype" && (
          <div className="space-y-2">
            <div className={`p-3 text-xs ${groupCard}`}>
              <b className="text-foreground">On Click</b>
              <p className="mt-1 text-[11px] text-muted-foreground">Go to /dashboard</p>
              <span className="studio-chip mt-2">Smooth slide</span>
            </div>
            <button
              type="button"
              onClick={() => toast.info("Interaction authoring arrives with the prototype writer")}
              className="w-full rounded-lg border border-border bg-[var(--soft)] py-2 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
            >
              ＋ Add an action
            </button>
          </div>
        )}

        {tab === "Inspect" && (
          <div className="space-y-3">
            <pre className="studio-scroll max-h-64 overflow-y-auto rounded-xl border border-border bg-[var(--soft)] p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
              {`/* Component ID: ${node.componentId} */\n/* Instance ID: ${node.instanceId} */\n\n${JSON.stringify(node.props, null, 2)}`}
            </pre>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(JSON.stringify(node!.props, null, 2));
                toast("Props JSON copied");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--active)] py-2 text-xs font-medium text-[var(--brand-text)] transition-colors hover:brightness-105"
            >
              <Copy className="size-3.5" /> Copy JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE + WORKSPACE SCOPE
// ─────────────────────────────────────────────────────────────────────────────

function PageInspector({ pageKey }: { pageKey: string | null }) {
  const document_ = store((s) => s.document);
  const setActiveStation = store((s) => s.setActiveStation);
  const layout = pageKey ? document_?.pageLayouts?.[pageKey] : undefined;
  const seo = pageKey && document_?.seo ? document_.seo[pageKey] : undefined;

  return (
    <div className="space-y-3 p-4 text-xs">
      <section className={`p-3 ${groupCard}`}>
        <b className="text-foreground">Page</b>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">/{pageKey ?? "unknown"}</p>
        <dl className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          <div className="flex justify-between">
            <dt>Sections</dt>
            <dd className="text-foreground">{layout?.length ?? 0}</dd>
          </div>
          <div className="flex justify-between">
            <dt>SEO title</dt>
            <dd className="max-w-[130px] truncate text-foreground">{seo?.title ?? "default"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>SEO description</dt>
            <dd className={seo?.description ? "text-[var(--success)]" : "text-[var(--warning)]"}>
              {seo?.description ? "set" : "missing"}
            </dd>
          </div>
        </dl>
      </section>
      <button
        type="button"
        onClick={() => setActiveStation("setups")}
        className="w-full rounded-lg border border-border bg-[var(--soft)] px-3 py-2 text-left text-[11px] text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
      >
        Validate this page against the contract → Setup
      </button>
    </div>
  );
}

function WorkspaceInspector() {
  const setActiveStation = store((s) => s.setActiveStation);
  const document_ = store((s) => s.document);
  const tokenCount = Object.keys(document_?.globalTokens ?? {}).length;

  return (
    <div className="space-y-3 p-4 text-xs">
      <section className={`p-3 ${groupCard}`}>
        <b className="text-foreground">Workspace</b>
        <p className="mt-1 text-[11px] text-muted-foreground">
          The whole-surface design system lives in the Palette station — {tokenCount} global
          tokens are live right now.
        </p>
      </section>
      <button
        type="button"
        onClick={() => setActiveStation("palette")}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-[var(--soft)] px-3 py-2 text-left text-[11px] text-muted-foreground transition-colors hover:bg-[var(--hover)] hover:text-foreground"
      >
        <Palette className="size-3.5 text-[var(--brand-text)]" />
        Open the Palette studio
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function InspectorGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={groupCard}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-[var(--hover)]"
      >
        <span className="text-[11px] font-bold text-foreground">{title}</span>
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${!open ? "-rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="grid gap-3 border-t border-border p-3">
          {children}
        </div>
      )}
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-4 w-7 rounded-full transition-colors ${
        checked ? "bg-[var(--brand-text)]" : "bg-[var(--soft)] border border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 size-3 rounded-full bg-background border border-border shadow-sm transition-transform ${checked ? "translate-x-3.5" : "translate-x-0.5"}`}
      />
    </button>
  );
}
