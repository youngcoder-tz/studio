// studio/src/components/gnapex-studio/shell/design-sheets.tsx
//
// The sidebar's design card and the two studio sheets under it:
//
//  · Templates — the setup gallery (`TemplateShowcase`) opened over the live
//    workspace. Selecting a template loads it into the *draft* through the
//    same backend the setup wizard uses; publishing stays explicit, so this
//    never touches what visitors see without a review.
//  · Palette — the setup palette bench (`PaletteStudio`) wired to the real
//    global tokens. `onChange` writes into the working draft; the sheet's
//    save button validates against the contract and commits with the same
//    `token.bulkUpdate` op the Palette station uses.
//
// Everything reads real backend data. Nothing is a mock.

"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  Layers,
  LayoutTemplate,
  Loader2,
  Palette,
  PanelLeft,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  TemplateShowcase,
  CoverArt,
} from "@/components/setup/template-showcase";
import { PaletteStudio } from "@/components/setup/palette-studio";
import { useGallery, useSelectTemplate } from "@/lib/api/hooks";
import { applyOperations, validateTokens } from "@/lib/api/workspace";
import { store } from "@/lib/gnapex-studio/store";
import { asHex } from "@/lib/palette";
import type { GlobalTokens } from "@/lib/contract";
import type {
  GalleryResponse,
  GalleryTemplate,
  WorkspaceDocument,
} from "@/lib/contract";

type SheetMode = "templates" | "palette" | null;

/* ─────────────────────────────────────────────────────────────────────────── */
/* The sidebar card                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

export function TemplatePaletteCard({
  projectId,
  className = "",
}: {
  projectId?: string | null;
  className?: string;
}) {
  const doc = store((s) => s.document);
  const [mode, setMode] = useState<SheetMode>(null);

  const gallery = useGallery(projectId ?? "", undefined, !!projectId);
  const templates = gallery.data?.templates ?? [];
  const current = doc?.templateId
    ? (templates.find((t) => t.key === doc.templateId) ?? null)
    : null;

  const accent = useMemo(() => {
    const tokens = doc?.globalTokens ?? {};
    return {
      primary: asHex(
        tokens.primaryColor,
        current?.accent?.primary ?? "#4f46e5",
      ),
      secondary: asHex(
        tokens.secondaryColor,
        current?.accent?.secondary ?? "#22d3ee",
      ),
    };
  }, [doc?.globalTokens, current]);

  const tokenKeyCount = Object.keys(doc?.globalTokens ?? {}).length;
  const draftRev = doc?.draftRevision ?? null;

  return (
    <>
      <section
        className={`overflow-hidden rounded-2xl border border-border bg-card/70 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)] backdrop-blur-sm ${className}`}
        aria-label="Workspace design"
      >
        {/* Cover band — the template's own brand gradient */}
        <div
          className="relative h-20 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
          {current && current.preview ? (
            <CoverArt
              template={current}
              preview={current.preview}
              compact
              className="h-full"
            />
          ) : (
            <div className="absolute right-2 top-2 flex gap-1 opacity-80">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block h-8 w-4 rounded-[3px] bg-white/45 shadow-sm"
                  style={{ borderRadius: i === 2 ? "999px" : undefined }}
                />
              ))}
            </div>
          )}
          <span className="absolute bottom-1.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
            <LayoutTemplate className="size-3" />
            Template
          </span>
        </div>

        {/* Body */}
        <div className="px-3 pt-2.5 pb-2">
          <div className="flex items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-foreground">
              {current?.displayName ?? doc?.templateId ?? "No template yet"}
            </p>
            {current?.isVerified || current?.isOfficial ? (
              <BadgeCheck className="size-3.5 shrink-0 text-[var(--brand-text)]" />
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--soft)] px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
              <Layers className="size-2.5" />
              {doc?.templateId ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--soft)] px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
              {tokenKeyCount} tokens · r{draftRev ?? "—"}
            </span>
          </div>

          {/* The two openers */}
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setMode("templates")}
              className="group flex items-center justify-center gap-1.5 rounded-lg border border-border bg-[var(--soft)] px-2 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-[var(--brand-text)]/40 hover:bg-[var(--hover)]"
            >
              <LayoutTemplate className="size-3.5 text-[var(--brand-text)]" />
              Templates
            </button>
            <button
              type="button"
              onClick={() => setMode("palette")}
              className="group flex items-center justify-center gap-1.5 rounded-lg border border-border bg-[var(--soft)] px-2 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:border-[var(--brand-text)]/40 hover:bg-[var(--hover)]"
            >
              <Palette className="size-3.5 text-[var(--brand-text)]" />
              Palette
            </button>
          </div>
        </div>
      </section>

      {projectId ? (
        <StudioDesignSheets
          projectId={projectId}
          doc={doc}
          gallery={gallery.data ?? null}
          loadingGallery={gallery.isLoading}
          mode={mode}
          onOpenChange={setMode}
        />
      ) : null}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* The two sheets                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

function StudioDesignSheets({
  projectId,
  doc,
  gallery,
  loadingGallery,
  mode,
  onOpenChange,
}: {
  projectId: string;
  doc: WorkspaceDocument | null;
  gallery: GalleryResponse | null;
  loadingGallery: boolean;
  mode: SheetMode;
  onOpenChange: (mode: SheetMode) => void;
}) {
  return (
    <Sheet
      open={mode !== null}
      onOpenChange={(next) => onOpenChange(next ? mode : null)}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-label={
          mode === "templates" ? "Template gallery" : "The palette studio"
        }
        // No background class on purpose — the sheet keeps the component's
        // own `bg-popover` default. Match base specificity to override the cap.
        className="w-full p-0 data-[side=right]:w-full data-[side=right]:max-w-full data-[side=right]:sm:max-w-5xl"
      >
        {mode === "templates" ? (
          <TemplatesSheetBody
            projectId={projectId}
            doc={doc}
            gallery={gallery}
            loadingGallery={loadingGallery}
            onClose={() => onOpenChange(null)}
            onCustomize={() => onOpenChange("palette")}
          />
        ) : mode === "palette" ? (
          <PaletteSheetBody projectId={projectId} doc={doc} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/* ── Templates sheet ───────────────────────────────────────────────────────── */

function TemplatesSheetBody({
  projectId,
  doc,
  gallery,
  loadingGallery,
  onClose,
  onCustomize,
}: {
  projectId: string;
  doc: WorkspaceDocument | null;
  gallery: GalleryResponse | null;
  loadingGallery: boolean;
  onClose: () => void;
  onCustomize: () => void;
}) {
  const selectTemplate = useSelectTemplate(projectId);
  /* Confirm state: the showcase's onInstall parks a candidate here and gets
     `false` back (its slide stays put); the dialog finishes the flow. */
  const [confirm, setConfirm] = useState<GalleryTemplate | null>(null);

  const install = useCallback(
    async (templateKey: string): Promise<boolean> => {
      if (templateKey === (doc?.templateId ?? null)) {
        toast.info("That template is already the active one", {
          description: "Your draft continues with its current content.",
        });
        return false;
      }
      const template = gallery?.templates.find((t) => t.key === templateKey);
      if (template) setConfirm(template);
      return false;
    },
    [doc?.templateId, gallery?.templates],
  );

  const runInstall = useCallback(async () => {
    if (!confirm) return;
    setConfirm(null);
    try {
      await selectTemplate.mutateAsync({
        templateId: confirm.key,
        publishImmediately: false,
      });
    } catch {
      /* the mutation already toasted */
    }
  }, [confirm, selectTemplate]);

  const busy = loadingGallery || selectTemplate.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Sheet header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-linear-to-br from-[var(--brand-text)] to-indigo-500 text-white shadow-sm">
            <LayoutTemplate className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Workspace design
            </p>
            <p className="text-[14px] font-semibold tracking-tight text-foreground">
              Templates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-[10px]"
            onClick={onCustomize}
          >
            <Palette className="size-3.5" />
            Open palette
          </Button>
          <Button size="sm" className="h-8 rounded-[10px]" onClick={onClose}>
            <Check className="size-3.5" />
            Done
          </Button>
        </div>
      </div>

      {/* Body */}
      {loadingGallery || !gallery ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
          {loadingGallery ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <p className="text-[12px]">Loading the template shelf…</p>
            </>
          ) : (
            <p className="text-[12px]">
              The template shelf is unavailable right now.
            </p>
          )}
        </div>
      ) : (
        <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
          <TemplateShowcase
            templates={gallery.templates}
            installedKey={doc?.templateId ?? null}
            busy={busy}
            preferredKeys={gallery.templates
              .filter((t) => t.source === "BUILTIN" || t.isOfficial)
              .map((t) => t.key)}
            accent={{
              primary: asHex(doc?.globalTokens?.primaryColor, "#4f46e5"),
              secondary: asHex(doc?.globalTokens?.secondaryColor, "#22d3ee"),
            }}
            onInstall={install}
            onContinue={onClose}
            onCustomize={onCustomize}
          />
        </div>
      )}

      {/* Install confirm */}
      <Dialog
        open={confirm !== null}
        onOpenChange={(next) => {
          if (!next) setConfirm(null);
        }}
      >
        <DialogContent className="max-w-md  rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[14px]">
              <LayoutTemplate className="size-4 shrink-0 text-[var(--brand-text)]" />
              Load “{confirm?.displayName ?? "this template"}” into the draft?
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              Your current draft content (r{doc?.draftRevision ?? "—"}) is
              replaced with the template&rsquo;s provisioned pages. Nothing live
              changes — publishing stays an explicit, separate step, and the
              swap is recorded as a real revision in History.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-[10px]"
              onClick={() => setConfirm(null)}
            >
              Stay with my draft
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-[10px]"
              onClick={() => void runInstall()}
              disabled={selectTemplate.isPending}
            >
              {selectTemplate.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArrowUpRight className="size-3.5" />
              )}
              Load into draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Palette sheet ─────────────────────────────────────────────────────────── */

function PaletteSheetBody({
  projectId,
  doc,
}: {
  projectId: string;
  doc: WorkspaceDocument | null;
}) {
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const tokens: GlobalTokens = useMemo(
    () => doc?.globalTokens ?? {},
    [doc?.globalTokens],
  );

  /** Local-draft write: the sheet authors into the working document. */
  const onChange = useCallback((patch: GlobalTokens) => {
    const current = store.getState().document;
    if (!current) return;
    setTouched(true);
    store.getState().hydrateDocument({
      ...current,
      globalTokens: { ...current.globalTokens, ...patch },
      isDirty: true,
    });
  }, []);

  /** Commit exactly like the Palette station: validate, then bulkUpdate. */
  const saveToDraft = useCallback(async () => {
    if (!doc) return;
    setSaving(true);
    try {
      const check = await validateTokens(projectId, tokens);
      if (!check.ok) {
        toast.error("Fix token issues first", {
          description: check.issues
            .slice(0, 2)
            .map((i) => i.message)
            .join(" · "),
        });
        return;
      }
      await applyOperations(projectId, {
        operations: [{ op: "token.bulkUpdate", tokens }],
        baseRevision: doc.draftRevision,
        message: "Palette studio sheet: global token update",
      });
      store.getState().hydrateDocument({
        ...doc,
        globalTokens: tokens,
        isDirty: false,
      });
      setTouched(false);
      toast.success("Palette saved to draft", {
        description: "Review on the pages, publish when ready.",
      });
    } catch (error) {
      toast.error("Save failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, tokens, doc]);

  const accent = {
    primary: asHex(tokens.primaryColor, "#4f46e5"),
    secondary: asHex(tokens.secondaryColor, "#22d3ee"),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Sheet header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-red px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-xl text-white shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})`,
            }}
          >
            <Palette className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              The setup bench, in-studio
            </p>
            <p className="text-[14px] font-semibold tracking-tight text-foreground">
              Palette studio
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-8 rounded-[10px]"
          onClick={() => void saveToDraft()}
          disabled={saving || !doc || !touched}
          title={
            touched
              ? "Validate and write this palette into the draft"
              : "Change a token to enable saving"
          }
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Save to draft
        </Button>
      </div>

      {/* Body */}
      <div className="studio-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <PaletteStudio
          tokens={tokens}
          onChange={onChange}
          seedCandidates={[]}
          accent={accent}
        />
        <p className="mt-3 flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
          <PanelLeft className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-text)]" />
          Edits here write into the working draft. &ldquo;Save to draft&rdquo;
          validates against the contract and records a real revision —
          publishing stays explicit, exactly like the Palette station.
        </p>
      </div>
    </div>
  );
}
