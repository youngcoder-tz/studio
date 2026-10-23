"use client";

// studio/src/app/studio/[projectId]/setup/page.tsx
//
// THE MODE-AWARE ONBOARDING WIZARD.
//
// A cinematic, non-form client commissioning journey. It is a graph of cards,
// not a wall of inputs — every card answers one question, every choice
// narrows what the next card asks, and the [Continue] button always carries
// you forward.
//
// The card list is *derived* (`resolveSteps`), because two Education projects
// are not the same product. A registered school is asked for its registration
// authority; an online academy is asked about cohorts; an NGO running learning
// programmes is asked about neither. EduOS and NGO OS do not even share a spine.
//
//   WELCOME → IDENTITY → [ORIGIN] → TRACK → [LEVELS] → [MODULES]
//   → [CREDENTIALS] → DETAILS → TEMPLATE → STYLE → REVIEW
//
// Behind the curtain the wizard writes ordinary design tokens into the draft
// through the normal workspace API. There is no "setup mode" on the backend
// and no second document: the wizard is the editor reading its own contract.
// Even the wizard's own answers — which origin, which track, which modules —
// ride in the open token map, so a refresh restores them.
//
// A cinematic `ModeSplash` covers the initial manifest + document fetch, then
// slides away into the welcome card.

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";

import { useGallery, useManifest, useWorkspaceDocument } from "@/lib/api/hooks";
import { refreshSessionFromCookie } from "@/lib/api/client";
import {
  fetchDocument,
  publishWorkspace,
  replaceDocument,
  selectTemplate,
} from "@/lib/api/workspace";
import { ApiError, isUnsignedIn } from "@/lib/errors";
import type {
  GalleryTemplate,
  GlobalTokens,
  StudioManifest,
  WorkspaceDocument,
} from "@/lib/contract";
import { WORKSPACE_MODE_LABELS } from "@/lib/contract";
import { brandFromTokens, type SeedCandidate } from "@/lib/palette";
import {
  SETUP_TOKENS,
  childOptionsFor,
  detailFieldsFor,
  findOrigin,
  findTrack,
  getModeFlow,
  identityExamplesFor,
  operationalTitleFor,
  preferredTemplateKeys,
  recommendedFeatureKeys,
  resolveSteps,
  spineFor,
  tracksForOrigin,
  type FlowIcon,
  type FlowOriginOption,
  type FlowTrack,
  type ModeFlow,
  type StepId,
} from "@/lib/setup-flow";
import { validateTokens } from "@/lib/validate";
import { cn } from "@/lib/utils";

import { FlowGlyph } from "@/components/setup/icon-bridge";
import {
  AuroraBackdrop,
  ContinueButton,
  FeatureTile,
  LevelChip,
  Panel,
  ProgressSpine,
  StepHeading,
  TrackCard,
} from "@/components/setup/setup-visuals";
import {
  IdentityCard,
  OperationsCard,
} from "@/components/setup/identity-cards";
import { PaletteStudio } from "@/components/setup/palette-studio";
import { ReviewSummary } from "@/components/setup/review-summary";
import { TemplateShowcase } from "@/components/setup/template-showcase";
import { ModeSplash } from "@/components/splash/mode-splash";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type BusyState = "select" | "save" | "publish" | null;

export default function WorkspaceSetupPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();

  const manifest = useManifest(projectId);
  const documentQuery = useWorkspaceDocument(projectId);
  const gallery = useGallery(
    projectId,
    manifest.data?.workspaceMode,
    Boolean(manifest.data),
  );

  const ready = Boolean(manifest.data && documentQuery.data);

  // Splash lifecycle: `run` while loading, exit once both queries resolve. A
  // fixed 500ms floor so it never appears as a flash, and the exit animation
  // slides the whole overlay away rather than unmounting it instantly.
  const [minFloorElapsed, setMinFloorElapsed] = useState(false);
  useEffect(() => {
    if (minFloorElapsed) return;
    const timer = window.setTimeout(() => setMinFloorElapsed(true), 500);
    return () => window.clearTimeout(timer);
  }, [minFloorElapsed]);

  // Error handling: queries can fail because there is no session, because this
  // identity may not see the project, or because the API is not answering.
  if (manifest.isError || documentQuery.isError) {
    const error = (manifest.error ?? documentQuery.error) as Error;
    const unsignedIn = isUnsignedIn(manifest.error) || isUnsignedIn(documentQuery.error);

    const retrySession = async () => {
      // A dashboard session on the shared root domain is enough — trade the
      // refresh cookie for a token and re-run the two reads that failed.
      if (await refreshSessionFromCookie()) {
        await Promise.all([manifest.refetch(), documentQuery.refetch()]);
      }
    };

    return (
      <main className="relative min-h-screen">
        <div className="flex items-center justify-center px-6 py-24">
          <Panel className="max-w-md space-y-4 p-6 text-center">
            <TriangleAlert
              size={22}
              className="mx-auto text-[var(--color-warn)]"
            />
            <div className="space-y-1">
              <h1 className="text-base font-semibold">
                {unsignedIn ? "This workspace needs a session" : "Could not open setup"}
              </h1>
              <p className="text-xs leading-relaxed text-[var(--color-ink-faint)]">
                {unsignedIn
                  ? "The Studio signs in through the dashboard session the API writes to the shared root domain. Nothing you answered is lost — the wizard reads its progress back out of your draft."
                  : (error?.message ?? "Unknown error.")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (unsignedIn) {
                  void retrySession();
                  return;
                }
                window.location.reload();
              }}
              className="focus-ring rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-[var(--color-accent-foreground)]"
            >
              {unsignedIn ? "Use my dashboard session" : "Try again"}
            </button>
            <Link
              href="/studio"
              className="block text-[11px] text-[var(--color-ink-faint)] underline-offset-2 hover:underline"
            >
              {unsignedIn ? "Sign in on the launcher instead" : "Back to projects"}
            </Link>
          </Panel>
        </div>
      </main>
    );
  }

  const flow = getModeFlow(manifest.data?.workspaceMode ?? "GENERAL");
  const splashPhase: "run" | "exit" = ready && minFloorElapsed ? "exit" : "run";

  return (
    <main
      className={cn(
        "relative min-h-screen overflow-hidden",
        ready && "transition-opacity duration-500",
      )}
    >
      <ModeSplash
        flow={flow}
        mode={manifest.data?.workspaceMode ?? "GENERAL"}
        phase={splashPhase}
        projectName={manifest.data?.projectName ?? ""}
      />

      {/* Mount the wizard only once the curtain is ready to leave, so the
          first card animates in as the splash fades out instead of before. */}
      {ready && manifest.data && documentQuery.data ? (
        <SetupWizard
          projectId={projectId}
          manifest={manifest.data}
          initialDocument={documentQuery.data}
          gallery={gallery.data?.templates ?? []}
          router={router}
        />
      ) : null}
    </main>
  );
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

function SetupWizard({
  projectId,
  manifest,
  initialDocument,
  gallery,
  router,
}: {
  projectId: string;
  manifest: StudioManifest;
  initialDocument: WorkspaceDocument;
  gallery: GalleryTemplate[];
  router: ReturnType<typeof useRouter>;
}) {
  const flow = useMemo(() => getModeFlow(manifest.workspaceMode), [manifest]);

  // The draft's tokens are the wizard's memory: its own answers (origin,
  // track, levels, modules) are stored there too, so a refresh — or a second
  // device — restores the same answers instead of starting over.
  const baseTokens = useMemo<GlobalTokens>(
    () => ({ ...manifest.baseTokens, ...initialDocument.globalTokens }),
    [manifest, initialDocument],
  );

  const restored = useMemo(() => {
    const originId = textOf(baseTokens[SETUP_TOKENS.origin]);
    const trackId = textOf(baseTokens[SETUP_TOKENS.track]);
    return {
      origin: findOrigin(flow, originId),
      track: findTrack(flow, trackId),
      levels: trackId ? csvOf(baseTokens[SETUP_TOKENS.levels(trackId)]) : [],
      features: trackId
        ? csvOf(baseTokens[SETUP_TOKENS.features(trackId)])
        : [],
      paletteSource: textOf(baseTokens[SETUP_TOKENS.paletteSource]),
    };
  }, [flow, baseTokens]);

  const [step, setStep] = useState<StepId>("welcome");
  const [visited, setVisited] = useState<StepId[]>(["welcome"]);
  const [document, setDocument] = useState(initialDocument);
  const [tokens, setTokens] = useState<GlobalTokens>(baseTokens);
  const [origin, setOrigin] = useState<FlowOriginOption | null>(
    restored.origin,
  );
  const [track, setTrack] = useState<FlowTrack | null>(restored.track);
  const [levels, setLevels] = useState<string[]>(restored.levels);
  const [features, setFeatures] = useState<string[]>(restored.features);
  const [paletteSource, setPaletteSource] = useState<string>(
    restored.paletteSource,
  );
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo(
    () => resolveSteps(flow, origin, track),
    [flow, origin, track],
  );
  const spine = useMemo(() => spineFor(flow, steps), [flow, steps]);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const reachedIndex = steps.reduce(
    (furthest, id, index) =>
      visited.includes(id) ? Math.max(furthest, index) : furthest,
    0,
  );

  // The client's own answers must never produce a document the backend will
  // reject. `validate.ts` mirrors the backend's token rules for exactly this.
  const validation = useMemo(() => validateTokens(tokens), [tokens]);
  const tokenIssues = useMemo(() => {
    if (validation.ok) return {};
    return validation.issues.reduce<Record<string, string>>((acc, issue) => {
      if (!acc[issue.path]) acc[issue.path] = issue.message;
      return acc;
    }, {});
  }, [validation]);

  const detailFields = useMemo(
    () => detailFieldsFor(flow, origin, track),
    [flow, origin, track],
  );
  const credentialFields = origin?.fields ?? [];
  const missingCredentials = credentialFields.filter(
    (field) => field.required && !textOf(tokens[field.key]).trim(),
  );

  // ─── Mutations ─────────────────────────────────────────────────────────────

  // Saves must serialize: two overlapping writes carry the same baseRevision
  // and the second would collide with 409. A promise queue turns that into a
  // strict sequence, and each save reads the *fresh* document from the ref.
  const documentRef = useRef(document);
  const tokensRef = useRef(tokens);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    documentRef.current = document;
    tokensRef.current = tokens;
  }, [document, tokens]);

  /** Install a template as the draft document. Replaces the draft, never the
   *  live site — and it is what the palette step then reads its brand from. */
  const installTemplate = async (templateKey: string) => {
    setBusy("select");
    setError(null);
    try {
      const result = await selectTemplate(projectId, templateKey, false);
      setDocument(result.document);
      setTokens({ ...manifest.baseTokens, ...result.document.globalTokens });
      setPaletteSource(`the ${result.templateId} template`);
      toast.success(`${result.templateId} is now your draft.`);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(null);
    }
  };

  const writeDraftOnce = async (
    message: string,
    base: WorkspaceDocument,
    overTokens: GlobalTokens | null,
  ): Promise<WorkspaceDocument> => {
    const result = await replaceDocument(projectId, {
      pageLayouts: base.pageLayouts,
      globalTokens: overTokens ?? tokensRef.current,
      seo: base.seo,
      i18n: base.i18n,
      baseRevision: base.draftRevision,
      message,
    });
    return result.document;
  };

  const persistDraft = (message: string): Promise<boolean> => {
    const run = async (): Promise<boolean> => {
      setBusy("save");
      setError(null);
      try {
        const fresh = await writeDraftOnce(message, documentRef.current, null);
        documentRef.current = fresh;
        setDocument(fresh);
        return true;
      } catch (caught) {
        // Another author (or an earlier queued save) moved the draft on. Pull
        // the server's latest revision, keep the wizard's answers on top, and
        // retry exactly once before giving up.
        if (caught instanceof ApiError && caught.status === 409) {
          try {
            const latest = await fetchDocument(projectId);
            const merged: GlobalTokens = {
              ...latest.globalTokens,
              ...tokensRef.current,
            };
            const retry = await writeDraftOnce(message, latest, merged);
            documentRef.current = retry;
            setDocument(retry);
            return true;
          } catch (retryCaught) {
            setError(messageOf(retryCaught));
            return false;
          }
        }
        setError(messageOf(caught));
        return false;
      } finally {
        setBusy(null);
      }
    };
    const enqueued = saveQueueRef.current.then(run, run);
    saveQueueRef.current = enqueued.catch(() => null);
    return enqueued;
  };

  const publishAndOpen = async () => {
    if (!validation.ok) {
      setError(
        `The workspace API would reject ${validation.issues.length} token value${validation.issues.length === 1 ? "" : "s"}. They are marked on the Details and Style cards.`,
      );
      return;
    }
    setBusy("publish");
    setError(null);
    try {
      await persistDraft("Workspace setup final review");
      await publishWorkspace(
        projectId,
        `Workspace setup: ${manifest.projectName} commissioned.`,
      );
      toast.success("Published. Your portal is live.");
      sessionStorage.setItem(`workspace-setup-complete:${projectId}`, "1");
      router.push(`/studio/${projectId}`);
    } catch (caught) {
      setError(messageOf(caught));
      setBusy(null);
    }
  };

  const saveDraftAndOpen = async () => {
    await persistDraft("Workspace setup: ready to launch");
    if (!error) {
      sessionStorage.setItem(`workspace-setup-complete:${projectId}`, "1");
      router.push(`/studio/${projectId}`);
    }
  };

  const skipSetup = async () => {
    await persistDraft("Workspace setup skipped");
    sessionStorage.setItem(`workspace-setup-complete:${projectId}`, "1");
    router.push(`/studio/${projectId}`);
  };

  // ─── Navigation ────────────────────────────────────────────────────────────

  const goTo = (next: StepId) => {
    setStep(next);
    setVisited((current) =>
      current.includes(next) ? current : [...current, next],
    );
    setError(null);
  };

  const advance = () => goTo(steps[Math.min(stepIndex + 1, steps.length - 1)]);

  const back = () => goTo(steps[Math.max(0, stepIndex - 1)]);

  // Which card can't be left yet. Levels, modules, template and style are
  // refinements — only the identity, origin, track and credential gates hold,
  // plus a token map the backend would refuse.
  const gateBlocked =
    (step === "identity" && !textOf(tokens.siteName).trim()) ||
    (step === "origin" && !origin) ||
    (step === "track" && !track) ||
    (step === "credentials" && missingCredentials.length > 0);
  const tokenBlocked = !validation.ok && step !== "welcome";
  const blocked = gateBlocked || tokenBlocked;

  const advanceWithSave = async () => {
    if (tokenBlocked) {
      setError(
        `The workspace API would reject ${validation.issues.length} token value${validation.issues.length === 1 ? "" : "s"}. They are marked on this card.`,
      );
      return;
    }
    if (gateBlocked) return;
    // Every meaningful transition persists the draft — so closing the tab
    // mid-setup never loses work.
    const ok = await persistDraft(
      `Workspace setup: ${labelOf(spine, step)} completed`,
    );
    if (ok) advance();
  };

  // ─── Answers ───────────────────────────────────────────────────────────────

  const writeToken = (key: string, value: string | number) =>
    setTokens((current) => ({ ...current, [key]: value }));

  const commitOrigin = (next: FlowOriginOption) => {
    setOrigin(next);
    setTrack(null);
    setLevels([]);
    setFeatures([]);
    setTokens((current) => ({ ...current, [SETUP_TOKENS.origin]: next.id }));
  };

  const commitTrack = (next: FlowTrack) => {
    setTrack(next);
    setLevels([]);
    const recommended = recommendedFeatureKeys(origin, next);
    setFeatures(recommended);
    setTokens((current) => ({
      ...current,
      [SETUP_TOKENS.track]: next.id,
      [SETUP_TOKENS.features(next.id)]: recommended.join(","),
    }));
  };

  const commitLevels = (selected: string[]) => {
    setLevels(selected);
    if (track) {
      setTokens((current) => ({
        ...current,
        [SETUP_TOKENS.levels(track.id)]: selected.join(","),
      }));
    }
  };

  // One source of truth per toggle: the token mirror is rewritten from the new
  // list, so un-checking a module can never append it a second time.
  const toggleFeature = (featureKey: string) => {
    if (!track) return;
    const next = features.includes(featureKey)
      ? features.filter((key) => key !== featureKey)
      : [...features, featureKey];
    setFeatures(next);
    setTokens((current) => ({
      ...current,
      [SETUP_TOKENS.features(track.id)]: next.join(","),
    }));
  };

  const applyPatch = (patch: GlobalTokens) => {
    setTokens((current) => ({ ...current, ...patch }));
    const source = patch[SETUP_TOKENS.paletteSource];
    if (typeof source === "string") setPaletteSource(source);
  };

  // The palette step starts from the strongest real signal available, not a
  // default: what the chosen template carries beats the track's tint, which
  // beats whatever colours the project already had.
  const seedCandidates = useMemo<SeedCandidate[]>(() => {
    const installed = gallery.find(
      (template) => template.key === document.templateId,
    );
    const candidates: SeedCandidate[] = [];
    if (installed?.accent) {
      candidates.push({
        label: `the ${installed.displayName} template you chose`,
        primary: installed.accent.primary,
        secondary: installed.accent.secondary,
        accent: installed.accent.secondary,
        weight: 30,
      });
    }
    if (track) {
      candidates.push({
        label: `the ${track.label} focus`,
        primary: track.accent.primary,
        secondary: track.accent.secondary,
        weight: 20,
      });
    }
    const existing = brandFromTokens(manifest.baseTokens);
    if (existing) {
      candidates.push({
        label: "this project's existing colours",
        ...existing,
        weight: 10,
      });
    }
    return candidates;
  }, [gallery, document.templateId, track, manifest.baseTokens]);

  const modeTemplates = useMemo(
    () =>
      gallery.filter(
        (template) => template.category === manifest.workspaceMode,
      ),
    [gallery, manifest.workspaceMode],
  );

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AuroraBackdrop
        primary={track?.accent.primary ?? flow.accent.primary}
        secondary={track?.accent.secondary ?? flow.accent.secondary}
        surface={flow.accent.surface}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="surface-glass flex h-9 w-9 items-center justify-center rounded-xl">
            <FlowGlyph
              name={flow.icon}
              size={15}
              style={{ color: flow.accent.primary }}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              {manifest.projectName}
            </p>
            <p className="text-[10px] text-[var(--color-ink-faint)]">
              {WORKSPACE_MODE_LABELS[manifest.workspaceMode]} · {flow.osName}
              {origin ? ` · ${origin.label}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => void skipSetup()}
            disabled={busy !== null}
            className={cn(
              "focus-ring rounded-full border border-[var(--color-line)] px-3 py-1.5 text-[11px] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)]",
              busy !== null && "opacity-50",
            )}
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Progress spine */}
      <div className="relative z-10 px-4">
        <ProgressSpine
          steps={spine}
          current={stepIndex}
          reached={reachedIndex}
          onJump={(index) => goTo(steps[index])}
        />
      </div>

      {/* Error / token-rule strip */}
      {error || (!validation.ok && step !== "welcome") ? (
        <div className="relative z-10 mx-auto mt-3 max-w-3xl px-5">
          <div className="flex items-start gap-2 rounded-xl border border-[var(--color-danger)]/30 bg-[color-mix(in_oklab,var(--color-danger)_10%,transparent)] px-3 py-2.5">
            <TriangleAlert
              size={14}
              className="mt-0.5 shrink-0 text-[var(--color-danger)]"
            />
            <div className="space-y-0.5">
              {error ? (
                <p className="text-[11px] leading-relaxed text-[var(--color-ink-dim)]">
                  {error}
                </p>
              ) : null}
              {!validation.ok
                ? validation.issues.slice(0, 3).map((issue) => (
                    <p
                      key={issue.path}
                      className="text-[11px] leading-relaxed text-[var(--color-ink-dim)]"
                    >
                      <span className="font-mono text-[10px]">
                        {issue.path}
                      </span>{" "}
                      — {issue.message}
                    </p>
                  ))
                : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Card stage */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -18, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {step === "welcome" ? (
              <WelcomeCard
                flow={flow}
                spine={spine}
                busy={busy === "select"}
                templateId={document.templateId}
                onContinue={advance}
                onOpenStudio={() => router.push(`/studio/${projectId}`)}
              />
            ) : null}

            {step === "identity" ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={stepProgress(stepIndex, steps.length)}
                  title="Who is this portal for?"
                  description="Name, tagline and a logo — the identity every page inherits."
                  accent={flow.accent.primary}
                />
                <div className="mt-6 max-w-lg">
                  <IdentityCard
                    flow={flow}
                    tokens={tokens}
                    onChange={writeToken}
                    examples={identityExamplesFor(flow, origin)}
                  />
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Continue"
                    hint="Saved as draft between every step."
                    disabled={blocked || busy !== null}
                    busy={busy === "save"}
                    accent={flow.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === "origin" && flow.origin ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={stepProgress(stepIndex, steps.length)}
                  title={flow.origin.title}
                  description={flow.origin.description}
                  accent={flow.accent.primary}
                />
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {flow.origin.options.map((option, index) => (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.4 }}
                      style={{ minHeight: "100%" }}
                    >
                      <TrackCard
                        track={option}
                        selected={origin?.id === option.id}
                        onSelect={() => commitOrigin(option)}
                        hint={option.credentialsHint}
                      />
                    </motion.div>
                  ))}
                </div>
                {flow.origin.note && origin ? (
                  <p className="mt-4 rounded-xl border border-[var(--color-line)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
                    {flow.origin.note}
                  </p>
                ) : null}
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label={
                      origin
                        ? `Continue as ${origin.label}`
                        : "Tell us what this is"
                    }
                    disabled={!origin || busy !== null}
                    busy={busy === "save"}
                    accent={origin?.accent ?? flow.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === "track" ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={stepProgress(stepIndex, steps.length)}
                  title={origin?.trackTitle ?? flow.trackTitle}
                  description={
                    origin?.trackDescription ?? flow.trackDescription
                  }
                  accent={flow.accent.primary}
                />
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {tracksForOrigin(flow, origin).map((trackOption, index) => (
                    <motion.div
                      key={trackOption.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.045, duration: 0.4 }}
                      style={{ minHeight: "100%" }}
                    >
                      <TrackCard
                        track={trackOption}
                        selected={track?.id === trackOption.id}
                        onSelect={() => commitTrack(trackOption)}
                      />
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label={
                      track
                        ? `Continue as ${track.label}`
                        : "Pick a focus to continue"
                    }
                    disabled={!track || busy !== null}
                    busy={busy === "save"}
                    accent={track?.accent ?? flow.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === "levels" && track ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={stepProgress(stepIndex, steps.length)}
                  title={flow.childFieldLabel ?? "Which subset?"}
                  description={flow.childFieldHint ?? "Pick all that apply."}
                  accent={track.accent.primary}
                />
                <div className="mt-5 flex flex-wrap gap-2">
                  {childOptionsFor(flow, track).map((level, index) => (
                    <LevelChip
                      key={level.value}
                      label={level.label}
                      description={level.description}
                      selected={levels.includes(level.value)}
                      delay={index * 0.04}
                      onToggle={() =>
                        commitLevels(
                          levels.includes(level.value)
                            ? levels.filter((value) => value !== level.value)
                            : [...levels, level.value],
                        )
                      }
                    />
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-[var(--color-ink-faint)]">
                  {levels.length
                    ? `${levels.length} level${levels.length === 1 ? "" : "s"} selected — the portal's copy will name them.`
                    : "Nothing selected yet. This card is optional."}
                </p>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Continue"
                    hint="Optional — you can refine later."
                    busy={busy === "save"}
                    accent={track.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === "features" && track ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={stepProgress(stepIndex, steps.length)}
                  title={flow.featuresTitle ?? "What matters most?"}
                  description={
                    origin?.recommends?.length
                      ? `${origin.label} normally runs these. Toggle any off — the Studio can add them back later.`
                      : (flow.featuresHint ??
                        "Toggle on the tiles you want visible.")
                  }
                  accent={track.accent.primary}
                />
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {track.features?.map((feature, index) => (
                    <FeatureTile
                      key={feature.key}
                      feature={feature}
                      enabled={features.includes(feature.key)}
                      delay={index * 0.045}
                      onToggle={() => toggleFeature(feature.key)}
                    />
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-[var(--color-ink-faint)]">
                  {features.length
                    ? `${features.length} module${features.length === 1 ? "" : "s"} switched on.`
                    : "No modules on — the portal keeps the essentials only."}
                </p>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Continue"
                    hint="Optional — the Studio can surface or hide these later."
                    busy={busy === "save"}
                    accent={track.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === "credentials" && origin?.fields?.length ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={stepProgress(stepIndex, steps.length)}
                  title={origin.credentialsTitle ?? "Prove it is legitimate"}
                  description={
                    origin.credentialsHint ??
                    "These describe the institution. They never change how the portal behaves."
                  }
                  accent={origin.accent.primary}
                />
                <div className="mt-6 max-w-2xl">
                  <OperationsCard
                    fields={origin.fields}
                    tokens={tokens}
                    onChange={writeToken}
                    issues={tokenIssues}
                  />
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label={
                      missingCredentials.length
                        ? `${missingCredentials.length} required detail${missingCredentials.length === 1 ? "" : "s"} left`
                        : "Continue"
                    }
                    disabled={missingCredentials.length > 0 || busy !== null}
                    busy={busy === "save"}
                    accent={origin.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === "operations" ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={stepProgress(stepIndex, steps.length)}
                  title={operationalTitleFor(flow, origin)}
                  description="These become safe design tokens. They never touch business logic."
                  accent={flow.accent.primary}
                />
                <div className="mt-6 max-w-2xl">
                  <OperationsCard
                    fields={detailFields}
                    tokens={tokens}
                    onChange={writeToken}
                    issues={tokenIssues}
                  />
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Continue"
                    busy={busy === "save"}
                    disabled={blocked}
                    accent={track?.accent ?? flow.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === "template" ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={stepProgress(stepIndex, steps.length)}
                  title={
                    flow.templateTitle ?? "Pick the look you want to start from"
                  }
                  description={
                    flow.templateHint ??
                    "Real templates, previewed live. Loading one replaces your draft — never your live site."
                  }
                  accent={flow.accent.primary}
                />
                <div className="mt-5">
                  <TemplateShowcase
                    templates={modeTemplates}
                    installedKey={document.templateId ?? null}
                    busy={busy === "select"}
                    preferredKeys={preferredTemplateKeys(origin, track)}
                    accent={{
                      primary: track?.accent.primary ?? flow.accent.primary,
                      secondary:
                        track?.accent.secondary ?? flow.accent.secondary,
                    }}
                    onInstall={(key) => void installTemplate(key)}
                    onContinue={advance}
                  />
                </div>
              </Panel>
            ) : null}

            {step === "style" ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={stepProgress(stepIndex, steps.length)}
                  title={flow.paletteTitle}
                  description={flow.paletteHint}
                  accent={flow.accent.primary}
                />
                <div className="mt-5">
                  <PaletteStudio
                    tokens={tokens}
                    onChange={applyPatch}
                    seedCandidates={seedCandidates}
                    accent={{
                      primary: track?.accent.primary ?? flow.accent.primary,
                      secondary:
                        track?.accent.secondary ?? flow.accent.secondary,
                    }}
                  />
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Review everything"
                    busy={busy === "save"}
                    disabled={blocked}
                    accent={flow.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === "review" ? (
              <ReviewSummary
                flow={flow}
                origin={origin}
                track={track}
                levels={levels}
                enabledFeatures={
                  track?.features?.filter((feature) =>
                    features.includes(feature.key),
                  ) ?? []
                }
                detailFields={detailFields}
                tokens={tokens}
                manifest={manifest}
                templateName={document.templateId}
                paletteSource={paletteSource}
                busy={
                  busy === "save"
                    ? "save"
                    : busy === "publish"
                      ? "publish"
                      : null
                }
                onBack={back}
                onOpenStudio={() => router.push(`/studio/${projectId}`)}
                onSaveDraft={() => void saveDraftAndOpen()}
                onPublish={() => void publishAndOpen()}
                onPickPreset={(presetTokens) => applyPatch(presetTokens)}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer note */}
      <footer className="relative z-10 pb-6 pt-2 text-center">
        <p className="text-[10px] text-[var(--color-ink-faint)]">
          Applying changes replaces the draft only · Your live site keeps
          serving the current version.
        </p>
      </footer>
    </main>
  );
}

// ─── Welcome card ────────────────────────────────────────────────────────────

function WelcomeCard({
  flow,
  spine,
  busy,
  templateId,
  onContinue,
  onOpenStudio,
}: {
  flow: ModeFlow;
  spine: { id: StepId; label: string; icon: FlowIcon }[];
  busy: boolean;
  templateId: string;
  onContinue: () => void;
  onOpenStudio: () => void;
}) {
  const questions = spine.filter(
    (entry) => entry.id !== "welcome" && entry.id !== "review",
  );

  return (
    <Panel className="p-6 sm:p-8" sweep>
      <div className="grid items-center gap-6 sm:grid-cols-[0.85fr_1.15fr]">
        <div className="relative mx-auto w-full max-w-sm">
          <ModeHeroGlyph flow={flow} />
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-2)] px-2.5 py-1"
          >
            <FlowGlyph
              name={flow.icon}
              size={13}
              style={{ color: flow.accent.primary }}
            />
            <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
              {flow.osName}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mt-3 text-balance text-2xl font-semibold tracking-tight sm:text-[28px]"
          >
            {flow.brandTitle}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-ink-dim)]"
          >
            {flow.brandTagline}
          </motion.p>

          {/* The interview, up front: no surprises, no dead ends. */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-5"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              {questions.length} questions, in this order
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {questions.map((entry) => (
                <span
                  key={entry.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[10.5px] text-[var(--color-ink-dim)]"
                >
                  <FlowGlyph
                    name={entry.icon}
                    size={11}
                    style={{ color: flow.accent.primary }}
                  />
                  {entry.label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-[var(--color-ink-faint)]">
              {templateId
                ? `Your draft currently builds on the “${templateId}” template — you will get to change that.`
                : "Nothing you answer is locked in: every card can be revisited from the progress bar."}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-7"
          >
            <ContinueButton
              label="Start commissioning"
              hint="Takes about two minutes. Every answer is saved as you go."
              busy={busy}
              accent={flow.accent}
              onClick={onContinue}
            />
          </motion.div>

          <button
            type="button"
            onClick={onOpenStudio}
            className="focus-ring mt-4 block w-full text-[11px] text-[var(--color-ink-faint)] underline-offset-2 hover:underline"
          >
            Skip — open the Studio directly
          </button>
        </div>
      </div>
    </Panel>
  );
}

/** Stable component wrapper so the compiler never sees a component being
 *  constructed inside render — the shared FlowGlyph in the icon bridge owns
 *  the lookup; this thin alias is only legacy compatibility. */
function ModeHeroGlyph({ flow }: { flow: ModeFlow }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <div
        className="pulse-ring absolute inset-0 rounded-[34px]"
        style={{
          background: `linear-gradient(135deg, ${flow.accent.primary}, ${flow.accent.secondary})`,
          color: flow.accent.secondary,
        }}
      >
        <motion.div
          className="float-slow flex h-full w-full items-center justify-center text-white/95"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <FlowGlyph name={flow.icon} size={92} strokeWidth={1.1} />
        </motion.div>
      </div>
      {/* Orbit dashes */}
      <svg
        aria-hidden
        className="orbit-slow absolute -inset-8"
        viewBox="0 0 320 320"
        fill="none"
      >
        <circle
          cx="160"
          cy="160"
          r="148"
          stroke={flow.accent.secondary}
          strokeOpacity="0.35"
          strokeWidth="1"
          className="dash-flow"
        />
        <circle cx="160" cy="12" r="4" fill={flow.accent.secondary} />
      </svg>
      <svg
        aria-hidden
        className="orbit-slow-rev absolute -inset-14"
        viewBox="0 0 380 380"
        fill="none"
      >
        <circle
          cx="190"
          cy="190"
          r="176"
          stroke={flow.accent.primary}
          strokeOpacity="0.22"
          strokeWidth="1"
          className="dash-flow"
        />
        <circle cx="366" cy="190" r="3" fill={flow.accent.primary} />
      </svg>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stepProgress(index: number, total: number): string {
  return `Step ${index + 1} of ${total}`;
}

function labelOf(spine: { id: StepId; label: string }[], step: StepId): string {
  return spine.find((entry) => entry.id === step)?.label ?? step;
}

function textOf(value: unknown): string {
  return typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : "";
}

function csvOf(value: unknown): string[] {
  return textOf(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function messageOf(caught: unknown): string {
  if (caught instanceof Error) return caught.message;
  if (typeof caught === "string") return caught;
  return "Something went wrong. Please try again.";
}
