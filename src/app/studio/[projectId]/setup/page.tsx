'use client';

// studio/src/app/studio/[projectId]/setup/page.tsx
//
// THE MODE-AWARE ONBOARDING WIZARD.
//
// A cinematic, non-form client commissioning journey. It is a graph of cards,
// not a wall of inputs — every card answers one question, every choice
// narrows what the next card asks, and the [Continue] button always carries
// you forward.
//
//   1. WELCOME — the mode's voice. "Welcome to EduOS".
//   2. IDENTITY — who is this? name, tagline, logo.
//   3. TRACK — what kind of school / foundation / store / site is this?
//   4. LEVELS — per track: a multi-select of levels served / sub-focusses.
//   5. FEATURES — per track: module tiles that tell EduOS what to surface.
//   6. OPERATIONS — the operational questions that follow from the track.
//   7. STYLE — palette presets, global CSS variables.
//   8. REVIEW — snapshot, or publish.
//
// Behind the curtain the wizard writes ordinary design tokens into the draft
// through the normal workspace API. There is no "setup mode" on the backend
// and no second document: the wizard is the editor reading its own contract.
//
// A cinematic `ModeSplash` covers the initial manifest + document fetch, then
// slides away into the welcome card.

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { TriangleAlert, Loader2, Sparkles } from 'lucide-react';

import {
  useGallery,
  useManifest,
  useWorkspaceDocument,
} from '@/lib/api/hooks';
import {
  fetchDocument,
  publishWorkspace,
  replaceDocument,
  selectTemplate,
} from '@/lib/api/workspace';
import { ApiError } from '@/lib/errors';
import type {
  GalleryTemplate,
  GlobalTokens,
  StudioManifest,
  WorkspaceDocument,
} from '@/lib/contract';
import { WORKSPACE_MODE_LABELS } from '@/lib/contract';
import {
  getModeFlow,
  STEP_ORDER,
  type FlowIcon as FlowIconName,
  type FlowTrack,
  type StepId,
} from '@/lib/setup-flow';
import { cn, truncate } from '@/lib/utils';

import { FlowGlyph } from '@/components/setup/icon-bridge';
import {
  AuroraBackdrop,
  ContinueButton,
  FeatureTile,
  LevelChip,
  Panel,
  ProgressSpine,
  StepHeading,
  TrackCard,
} from '@/components/setup/setup-visuals';
import { IdentityCard, OperationsCard } from '@/components/setup/identity-cards';
import { ReviewSummary } from '@/components/setup/review-summary';
import { ModeSplash } from '@/components/splash/mode-splash';
import { ThemeToggle } from '@/components/theme/theme-toggle';

type BusyState = 'select' | 'save' | 'publish' | null;

const SPI: { id: StepId; label: string; icon?: FlowIconName }[] = [
  { id: 'welcome', label: 'Welcome', icon: 'sparkles' },
  { id: 'identity', label: 'Identity', icon: 'home' },
  { id: 'track', label: 'Focus', icon: 'target' },
  { id: 'levels', label: 'Levels', icon: 'puzzle' },
  { id: 'features', label: 'Modules', icon: 'lightbulb' },
  { id: 'operations', label: 'Details', icon: 'shield-check' },
  { id: 'style', label: 'Style', icon: 'school' },
  { id: 'review', label: 'Review', icon: 'hand-coins' },
];

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

  // Error handling: queries can fail (auth, permissions).
  if (manifest.isError || documentQuery.isError) {
    const error = (manifest.error ?? documentQuery.error) as Error;
    return (
      <main className="relative min-h-screen">
        <div className="flex items-center justify-center px-6 py-24">
          <Panel className="max-w-md space-y-4 p-6 text-center">
            <TriangleAlert size={22} className="mx-auto text-[var(--color-warn)]" />
            <div className="space-y-1">
              <h1 className="text-base font-semibold">Could not open setup</h1>
              <p className="text-xs leading-relaxed text-[var(--color-ink-faint)]">
                {error?.message ?? 'Unknown error.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="focus-ring rounded-full bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-[var(--color-accent-foreground)]"
            >
              Try again
            </button>
            <Link
              href="/studio"
              className="block text-[11px] text-[var(--color-ink-faint)] underline-offset-2 hover:underline"
            >
              Back to projects
            </Link>
          </Panel>
        </div>
      </main>
    );
  }

  const flow = getModeFlow(manifest.data?.workspaceMode ?? 'GENERAL');
  const splashPhase: 'run' | 'exit' = ready && minFloorElapsed ? 'exit' : 'run';

  return (
    <main
      className={cn(
        'relative min-h-screen overflow-hidden',
        ready && 'transition-opacity duration-500',
      )}
    >
      <ModeSplash
        flow={flow}
        mode={manifest.data?.workspaceMode ?? 'GENERAL'}
        phase={splashPhase}
        projectName={manifest.data?.projectName ?? ''}
      />

      {/* Mount the wizard only once the curtain is ready to leave, so the
          first card animates in as the splash fades out instead of before. */}
      {ready && manifest.data && documentQuery.data ? (
        <SetupWizard
          projectId={projectId}
          manifest={manifest.data}
          initialDocument={documentQuery.data}
          gallery={gallery.data?.templates ?? []}
          galleryLoading={gallery.isPending}
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
  galleryLoading,
  router,
}: {
  projectId: string;
  manifest: StudioManifest;
  initialDocument: WorkspaceDocument;
  gallery: GalleryTemplate[];
  galleryLoading: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const flow = useMemo(() => getModeFlow(manifest.workspaceMode), [manifest]);

  const [step, setStep] = useState<StepId>('welcome');
  const [reached, setReached] = useState(0);
  const [document, setDocument] = useState(initialDocument);
  const [tokens, setTokens] = useState<GlobalTokens>({
    ...manifest.baseTokens,
    ...initialDocument.globalTokens,
  });
  const [track, setTrack] = useState<FlowTrack | null>(null);
  const [levels, setLevels] = useState<string[]>([]);
  const [features, setFeatures] = useState<FlowFeatureToId>([]);
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEP_ORDER.indexOf(step);

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

  /** Install a template as the draft document; used from the welcome-card
   *  template chips. Replaces the draft, never the live site. */
  const installTemplate = async (templateKey: string) => {
    setBusy('select');
    setError(null);
    try {
      const result = await selectTemplate(projectId, templateKey, false);
      setDocument(result.document);
      setTokens({ ...manifest.baseTokens, ...result.document.globalTokens });
      setTrack(null);
      setLevels([]);
      setFeatures([]);
      toast.success(`${result.document.templateId} is now the draft.`);
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
      setBusy('save');
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
            const merged: GlobalTokens = { ...latest.globalTokens, ...tokensRef.current };
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
    setBusy('publish');
    setError(null);
    try {
      await persistDraft('Workspace setup final review');
      await publishWorkspace(projectId, `Workspace setup: ${manifest.projectName} commissioned.`);
      toast.success('Published. Your portal is live.');
      router.push(`/studio/${projectId}`);
    } catch (caught) {
      setError(messageOf(caught));
      setBusy(null);
    }
  };

  const saveDraftAndOpen = async () => {
    await persistDraft('Workspace setup: ready to launch');
    if (!error) router.push(`/studio/${projectId}`);
  };

  const skipSetup = async () => {
    await persistDraft('Workspace setup skipped');
    sessionStorage.setItem(`workspace-setup-complete:${projectId}`, '1');
    router.push(`/studio/${projectId}`);
  };

  // ─── Navigation ────────────────────────────────────────────────────────────

  const goTo = (next: StepId) => {
    const nextIndex = STEP_ORDER.indexOf(next);
    setStep(next);
    setReached((current) => Math.max(current, nextIndex));
    setError(null);
  };

  const nextStep = (): StepId => {
    const at = stepIndex;
    if (at < 0 || at >= STEP_ORDER.length - 1) return 'review';
    return STEP_ORDER[at + 1];
  };

  const advance = () => {
    const next = nextStep();
    // Levels is optional depending on track, so we skip if there is none.
    if (next === 'levels' && !(track?.children?.length ?? 0)) {
      goTo('features');
    } else if (next === 'features' && !(track?.features?.length ?? 0)) {
      goTo('operations');
    } else {
      goTo(next);
    }
  };

  const advanceWithSave = async () => {
    // Every meaningful transition persists the draft — so closing the tab
    // mid-setup never loses work. The save uses the cached document, and the
    // wizard is the only thing holding these values while they are in flux.
    const ok = await persistDraft(
      `Workspace setup: ${stepLabel(step)} completed`,
    );
    if (ok) advance();
  };

  const stepLabel = (step: StepId) =>
    SPI.find((s) => s.id === step)?.label ?? step;

  const toggleFeature = (featureKey: string) => {
    setFeatures((current) =>
      current.includes(featureKey)
        ? current.filter((f) => f !== featureKey)
        : [...current, featureKey],
    );
  };

  // ─── Choice persistence: the pre-style steps leave tokens unmodified; the
  // track / levels / features only affect which fields the *next* card shows.
  // Style step writes real tokens via the shared token map.

  // We need track-level metadata written to the doc to survive refresh
  // (without dedicated path). We will persist as token keys, which the
  // backend accepts thanks to the open token map.
  const customKey = (base: string) => `setup${base}`.replace(/[^a-zA-Z0-9]/g, '');

  const commitTrack = (next: FlowTrack | null) => {
    setTrack(next);
    setLevels([]);
    setFeatures([]);
    if (next) {
      setTokens((current) => ({
        ...current,
        [customKey('Track')]: next.id,
      }));
    }
  };

  const commitLevels = (selected: string[]) => {
    setLevels(selected);
    if (track) {
      setTokens((current) => ({
        ...current,
        [customKey(`Track_${track.id}_Levels`)]: selected.join(','),
      }));
    }
  };

  const toggleFeatureAndCommit = (featureKey: string) => {
    toggleFeature(featureKey);
    if (track) {
      setTokens((current) => ({
        ...current,
        [customKey(`Track_${track.id}_Features`)]:
          current[customKey(`Track_${track.id}_Features`)] === undefined
            ? featureKey
            : current[customKey(`Track_${track.id}_Features`)] === featureKey
              ? ''
              : `${current[customKey(`Track_${track.id}_Features`)]},${featureKey}`,
      }));
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AuroraBackdrop
        primary={flow.accent.primary}
        secondary={flow.accent.secondary}
        surface={flow.accent.surface}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="surface-glass flex h-9 w-9 items-center justify-center rounded-xl">
            <Sparkles size={15} className="text-[var(--color-accent)]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">{manifest.projectName}</p>
            <p className="text-[10px] text-[var(--color-ink-faint)]">
              {WORKSPACE_MODE_LABELS[manifest.workspaceMode]} · {flow.brandTitle}
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
              'focus-ring rounded-full border border-[var(--color-line)] px-3 py-1.5 text-[11px] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-line-strong)]',
              busy !== null && 'opacity-50',
            )}
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Progress spine */}
      <div className="relative z-10 px-4">
        <ProgressSpine
          steps={SPI.map((s) => ({ id: s.id, label: s.label, icon: s.icon as never }))}
          current={stepIndex}
          reached={reached}
          onJump={(index) => goTo(STEP_ORDER[index])}
        />
      </div>

      {/* Error strip */}
      {error ? (
        <div className="relative z-10 mx-auto mt-3 max-w-3xl px-5">
          <div className="flex items-start gap-2 rounded-xl border border-[var(--color-danger)]/30 bg-[color-mix(in_oklab,var(--color-danger)_10%,transparent)] px-3 py-2.5">
            <TriangleAlert size={14} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
            <p className="text-[11px] leading-relaxed text-[var(--color-ink-dim)]">{error}</p>
          </div>
        </div>
      ) : null}

      {/* Card stage */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {step === 'welcome' ? (
              <WelcomeCard
                flow={flow}
                manifest={manifest}
                document={document}
                busy={busy}
                gallery={gallery}
                galleryLoading={galleryLoading}
                installTemplate={installTemplate}
                onContinue={advance}
                onOpenStudio={() => router.push(`/studio/${projectId}`)}
              />
            ) : null}

            {step === 'identity' ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={`Step ${stepIndex + 1} of ${STEP_ORDER.length}`}
                  title="Who is this portal for?"
                  description="Name, tagline and a logo — the identity every page inherits."
                  accent={flow.accent.primary}
                />
                <div className="mt-6 max-w-lg">
                  <IdentityCard flow={flow} tokens={tokens} onChange={(key, value) => { setTokens((current) => ({ ...current, [key]: value })); }} />
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Continue"
                    hint="Saved as draft between every step."
                    disabled={busy !== null || !String(tokens.siteName ?? '').trim()}
                    busy={busy === 'save'}
                    accent={flow.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === 'track' ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={`Step ${stepIndex + 1} of ${STEP_ORDER.length}`}
                  title={flow.trackTitle}
                  description={flow.trackDescription}
                  accent={flow.accent.primary}
                />
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {flow.tracks.map((trackOption, index) => (
                    <motion.div
                      key={trackOption.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.045, duration: 0.4 }}
                      style={{ minHeight: '100%' }}
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
                    label={track ? `Continue as ${track.label}` : 'Pick a focus to continue'}
                    disabled={!track || busy !== null}
                    busy={busy === 'save'}
                    accent={track?.accent ?? flow.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === 'levels' && track?.children?.length ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={`Step ${stepIndex + 1} of ${STEP_ORDER.length}`}
                  title={flow.childFieldLabel ?? 'Which subset?'}
                  description={flow.childFieldHint ?? 'Pick all that apply.'}
                  accent={track.accent.primary}
                />
                <div className="mt-5 flex flex-wrap gap-2">
                  {levelOptionsFor(flow, track).map((level, index) => (
                    <LevelChip
                      key={level.value}
                      label={level.label}
                      description={level.description}
                      selected={levels.includes(level.value)}
                      delay={index * 0.04}
                      onToggle={() =>
                        commitLevels(
                          levels.includes(level.value)
                            ? levels.filter((l) => l !== level.value)
                            : [...levels, level.value],
                        )
                      }
                    />
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Continue"
                    hint="Optional — you can refine later."
                    busy={busy === 'save'}
                    accent={track.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === 'features' && track?.features?.length ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={`Step ${stepIndex + 1} of ${STEP_ORDER.length}`}
                  title={flow.featuresTitle ?? 'What matters most?'}
                  description={flow.featuresHint ?? 'Toggle on the tiles you want visible.'}
                  accent={track.accent.primary}
                />
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {track.features.map((feature, index) => (
                    <FeatureTile
                      key={feature.key}
                      feature={feature}
                      enabled={features.includes(feature.key)}
                      delay={index * 0.045}
                      onToggle={() => toggleFeatureAndCommit(feature.key)}
                    />
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Continue"
                    hint="Optional — the Studio can surface or hide these later."
                    busy={busy === 'save'}
                    accent={track.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === 'operations' ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={`Step ${stepIndex + 1} of ${STEP_ORDER.length}`}
                  title={flow.operationalTitle}
                  description="These become safe design tokens. They never touch business logic."
                  accent={flow.accent.primary}
                />
                <div className="mt-6 max-w-2xl">
                  <OperationsCard
                    fields={track?.fields
                      ? [...track.fields, ...flow.operationalFields]
                      : flow.operationalFields}
                    tokens={tokens}
                    onChange={(key, value) => {
                      setTokens((current) => ({ ...current, [key]: value }));
                      ;
                    }}
                  />
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Continue"
                    busy={busy === 'save'}
                    accent={flow.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === 'style' ? (
              <Panel className="p-5 sm:p-6">
                <StepHeading
                  step={`Step ${stepIndex + 1} of ${STEP_ORDER.length}`}
                  title={flow.paletteTitle}
                  description={flow.paletteHint}
                  accent={flow.accent.primary}
                />
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {flow.presets.map((preset, index) => (
                    <motion.button
                      key={preset.key}
                      type="button"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.045 }}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setTokens((current) => ({ ...current, ...preset.tokens }));
                        ;
                      }}
                      className={cn(
                        'focus-ring rounded-2xl border p-3.5 text-left transition-colors',
                        String(tokens.primaryColor ?? '') === String(preset.tokens.primaryColor ?? '')
                          ? 'border-[var(--color-accent)]/55 bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]'
                          : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                      )}
                    >
                      <div className="flex gap-1">
                        {[preset.accent.primary, preset.accent.secondary, preset.accent.surface].map(
                          (color, index2) => (
                            <span
                              key={`${preset.key}-${index2}`}
                              className="h-3.5 w-3.5 rounded-full border border-black/10"
                              style={{ background: color }}
                            />
                          ),
                        )}
                      </div>
                      <p className="mt-2.5 text-[12px] font-semibold leading-snug">{preset.label}</p>
                      <p className="mt-0.5 text-[10px] leading-snug text-[var(--color-ink-faint)]">
                        {truncate(preset.description, 80)}
                      </p>
                    </motion.button>
                  ))}
                </div>
                <div className="mt-6 flex justify-center">
                  <ContinueButton
                    label="Continue"
                    busy={busy === 'save'}
                    accent={flow.accent}
                    onClick={() => void advanceWithSave()}
                  />
                </div>
              </Panel>
            ) : null}

            {step === 'review' ? (
              <ReviewSummary
                flow={flow}
                track={track}
                enabledFeatures={
                  track?.features?.filter((f) => features.includes(f.key)) ?? []
                }
                tokens={tokens}
                manifest={manifest}
                templateName={document.templateId}
                busy={busy === 'save' ? 'save' : busy === 'publish' ? 'publish' : null}
                onBack={() => goTo('style')}
                onOpenStudio={() => router.push(`/studio/${projectId}`)}
                onSaveDraft={() => void saveDraftAndOpen()}
                onPublish={() => void publishAndOpen()}
                onPickPreset={(presetTokens) => {
                  setTokens((current) => ({ ...current, ...presetTokens }));
                  ;
                }}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer note */}
      <footer className="relative z-10 pb-6 pt-2 text-center">
        <p className="text-[10px] text-[var(--color-ink-faint)]">
          Applying changes replaces the draft only · Your live site keeps serving the current version.
        </p>
      </footer>
    </main>
  );
}

// ─── Welcome card ────────────────────────────────────────────────────────────

function WelcomeCard({
  flow,
  manifest,
  document,
  busy,
  gallery,
  galleryLoading,
  installTemplate,
  onContinue,
  onOpenStudio,
}: {
  flow: ReturnType<typeof getModeFlow>;
  manifest: StudioManifest;
  document: WorkspaceDocument;
  busy: BusyState;
  gallery: GalleryTemplate[];
  galleryLoading: boolean;
  installTemplate: (key: string) => Promise<void>;
  onContinue: () => void;
  onOpenStudio: () => void;
}) {
  const modeTemplates = gallery.filter((t) => t.category === manifest.workspaceMode);

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
            <FlowGlyph name={flow.icon} size={13} style={{ color: flow.accent.primary }} />
            <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
              {WORKSPACE_MODE_LABELS[manifest.workspaceMode]}
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

          {/* Template mosaic (visual, instantly readable) */}
          {modeTemplates.length ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-5"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
                Starting points for {WORKSPACE_MODE_LABELS[manifest.workspaceMode]}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {modeTemplates.slice(0, 4).map((template) => {
                  const accent = template.accent ?? flow.accent;
                  const isCurrent = template.key === document.templateId;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      disabled={isCurrent || busy === 'select'}
                      onClick={() => void installTemplate(template.key)}
                      title={isCurrent ? 'Currently installed' : `Switch to ${template.displayName}`}
                      className={cn(
                        'focus-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-all hover:scale-[1.04] disabled:cursor-default disabled:hover:scale-100',
                        isCurrent
                          ? 'border-[var(--color-accent)]/60 bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)]'
                          : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]',
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: accent.primary }}
                      />
                      {template.displayName}
                      {isCurrent ? (
                        <span className="ml-0.5 text-[9px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                          current
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {galleryLoading ? (
                <p className="mt-1.5 text-[10px] text-[var(--color-ink-faint)]">
                  <Loader2 size={10} className="mr-1 animate-spin inline" />
                  loading marketplace…
                </p>
              ) : null}
            </motion.div>
          ) : null}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-7"
          >
            <ContinueButton
              label="Start commissioning"
              hint="Takes about 90 seconds."
              busy={busy === 'select'}
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
function ModeHeroGlyph({ flow }: { flow: ReturnType<typeof getModeFlow> }) {
  return (
    <div className="relative aspect-square w-full max-w-[280px] mx-auto">
      <div
        className="pulse-ring absolute inset-0 rounded-[34px]"
        style={{
          background: `linear-gradient(135deg, ${flow.accent.primary}, ${flow.accent.secondary})`,
          color: flow.accent.secondary,
          boxShadow: `0 30px 80px -30px ${flow.accent.primary}cc`,
        }}
      >
        <motion.div
          className="flex h-full w-full items-center justify-center text-white/95 float-slow"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        >
          <FlowGlyph name={flow.icon} size={92} strokeWidth={1.1} />
        </motion.div>
      </div>
      {/* Orbit dashes */}
      <svg
        aria-hidden
        className="absolute -inset-8 orbit-slow"
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
        className="absolute -inset-14 orbit-slow-rev"
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

/** Resolve the levels/sub-choices from the track's `children` list. */
function levelOptionsFor(
  flow: ReturnType<typeof getModeFlow>,
  track: FlowTrack,
): { value: string; label: string; description?: string }[] {
  const catalog = flow.childrenCatalog ?? DEFAULT_CHILDREN[flow.key] ?? {};
  return (track.children ?? [])
    .map((childKey) => catalog[childKey])
    .filter(Boolean) as { value: string; label: string; description?: string }[];
}

const DEFAULT_CHILDREN: Record<string, Record<string, { value: string; label: string; description?: string }>> = {
  EDUCATION: {
    preschool: { value: 'preschool', label: 'Preschool / Nursery', description: 'Ages 3–5, play led' },
    'lower-primary': { value: 'lower-primary', label: 'Lower primary', description: 'Grades 1–3' },
    'upper-primary': { value: 'upper-primary', label: 'Upper primary', description: 'Grades 4–6' },
    'junior-secondary': { value: 'junior-secondary', label: 'Junior secondary', description: 'Grades 7–9' },
    'senior-secondary': { value: 'senior-secondary', label: 'Senior secondary', description: 'Grades 10–12' },
    tertiary: { value: 'tertiary', label: 'Tertiary', description: 'Diploma & degree' },
  },
};

function messageOf(caught: unknown): string {
  if (caught instanceof Error) return caught.message;
  if (typeof caught === 'string') return caught;
  return 'Something went wrong. Please try again.';
}

type FlowFeatureToId = string[];
