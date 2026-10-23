// studio/src/lib/setup-flow.ts
//
// THE SETUP FLOW GRAPH.
//
// The wizard is not a fixed form; it is a graph of questions shaped by the
// workspace mode and, further in, by the answers the client has already given.
// Choosing an education track changes which levels and which operational
// fields follow ("boarding school" asks about houses and wardens; "eLearning
// platform" asks about sequencing and certificates).
//
// This file is the single place those differences live. It owns no logic and
// no I/O: the wizard reads it, the editor reads the same workspace document,
// and every answer still lands in the draft as an ordinary design token —
// the same open token map the compiled portal consumes.

import type { GlobalTokens, TemplateAccent, WorkspaceMode } from './contract';

// ─── Icon vocabulary ─────────────────────────────────────────────────────────
//
// Icon *names*, not components, so this module stays side-effect free. The
// wizard maps names to lucide components in one place (icon-bridge).

export type FlowIcon =
  | 'graduation'
  | 'heart'
  | 'store'
  | 'sparkles'
  | 'handshake'
  // Track / choice icons
  | 'monitor'
  | 'school'
  | 'book-open'
  | 'university'
  | 'wrench'
  | 'home'
  | 'globe'
  | 'moon'
  | 'puzzle'
  | 'bed'
  | 'users'
  | 'megaphone'
  | 'tree'
  | 'network'
  | 'shield-check'
  | 'target'
  | 'lightbulb'
  | 'languages'
  | 'library'
  | 'bus'
  | 'utensils'
  | 'heartbeat'
  | 'hand-coins'
  | 'hand-heart'
  | 'dove'
  | 'building'
  // Setup-step vocabulary
  | 'cap'
  | 'palette'
  | 'layers'
  | 'slides'
  | 'images'
  | 'award'
  | 'calendar'
  | 'identity'
  | 'scroll'
  | 'compass'
  | 'badge-check'
  | 'contrast'
  | 'sliders'
  | 'repeat'
  | 'type';

// ─── Splash signature ────────────────────────────────────────────────────────
//
// Each workspace mode is a different product with a different name, and the
// warm-up is where that is first felt. The motif picks the animation, so
// EduOS never plays NGO OS's heartbeat.

export type SplashMotif = 'campus' | 'pulse' | 'ledger' | 'network' | 'constellation';

// ─── Shared field shape ──────────────────────────────────────────────────────

export type FlowFieldType = 'text' | 'textarea' | 'url' | 'color' | 'select' | 'email' | 'tel';

export interface FlowField {
  /** The design-token key this answer is stored under. */
  key: string;
  label: string;
  hint?: string;
  type: FlowFieldType;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  options?: { value: string; label: string }[];
}

// ─── Track (the "what kind of X is this" choice) ─────────────────────────────

export interface FlowTrack {
  id: string;
  label: string;
  description: string;
  icon: FlowIcon;
  accent: { primary: string; secondary: string };
  /**
   * Second-level refinement choices shown on the next card, when relevant.
   * An education track refines into levels; a campaign focus refines into
   * causes. Kept as flat string keys per track so each mode can interpret
   * them against its own sub-catalog below.
   */
  children?: string[];
  /** Feature tiles the client can toggle on for this track. */
  features?: FlowFeature[];
  /** Extra operational fields only this track asks for. */
  fields?: FlowField[];
  /** Template keys worth putting in front of the slideshow for this track. */
  templateKeys?: string[];
}

export interface FlowFeature {
  key: string;
  label: string;
  description: string;
  icon: FlowIcon;
}

// ─── Origin (the "what actually is this" gate) ───────────────────────────────
//
// A workspace mode is not one operation. An Education project can be a
// registered school, an online academy, or a learning programme run by an NGO
// that has no campus, no fee ledger and no national results slip. Asking that
// question *before* the track card is what lets the rest of the wizard change
// its shape: different tracks, different evidence, different pages.

export interface FlowOriginOption {
  id: string;
  label: string;
  description: string;
  icon: FlowIcon;
  accent: { primary: string; secondary: string };
  /** Track ids offered next. Omitted means "offer the mode's whole shelf". */
  tracks?: string[];
  /** Evidence this origin must collect. Only present, the credentials card shows. */
  fields?: FlowField[];
  credentialsTitle?: string;
  credentialsHint?: string;
  /** Tiles this origin normally wants on; pre-toggled for the client. */
  recommends?: string[];
  /** Template keys shown first in the showcase. */
  templateKeys?: string[];
  /** The shelf question, re-worded for this origin. */
  trackTitle?: string;
  trackDescription?: string;
  /** The details question, re-worded for this origin. */
  operationalTitle?: string;
  /** Replaces the mode's default operational fields when set. */
  operationalFields?: FlowField[];
  /** Example answers, so the identity card stops asking in the abstract. */
  examples?: { name: string; tagline: string };
}

export interface FlowOrigin {
  title: string;
  description: string;
  /** Shown when a client picks an origin whose tracks are not the mode default. */
  note?: string;
  options: FlowOriginOption[];
}

// ─── Style preset ────────────────────────────────────────────────────────────

export interface FlowPreset {
  key: string;
  label: string;
  description: string;
  accent: TemplateAccent;
  tokens: GlobalTokens;
}

// ─── Mode profile ────────────────────────────────────────────────────────────

export interface ModeFlow {
  key: WorkspaceMode;
  /** Splash + hero icon/palette for this mode. */
  icon: FlowIcon;
  /** The product this mode *is*, in its own words. EduOS, NGO OS, … */
  osName: string;
  splashMotif: SplashMotif;
  accent: { primary: string; secondary: string; surface: string };
  /** Splash script: short lines the loader narrates while it warms up. */
  splashLines: string[];
  /** Hero copy on card 1. */
  brandTitle: string;
  brandTagline: string;
  /** The "what actually is this" gate. Absent = go straight to the shelf. */
  origin?: FlowOrigin;
  /** The "what kind of X" question. */
  trackTitle: string;
  trackDescription: string;
  tracks: FlowTrack[];
  /** Label for the children refinement card (e.g. "Levels served"). */
  childFieldLabel?: string;
  childFieldHint?: string;
  /** Lookup table for a track's `children` keys: value → label + description. */
  childrenCatalog?: Record<string, { value: string; label: string; description?: string }>;
  /** Operational questions, in presentation order. */
  operationalTitle: string;
  operationalFields: FlowField[];
  /** Feature card settings */
  featuresTitle?: string;
  featuresHint?: string;
  /** Template showcase settings */
  templateTitle?: string;
  templateHint?: string;
  /** Style card settings */
  presets: FlowPreset[];
  paletteTitle: string;
  paletteHint: string;
  /** Pages the runtime will mount for this mode (displayed at review). */
  runtimeSurfaces: string[];
  /** This mode's own step spine, in order, with the words it uses for each. */
  spine: { id: StepId; label: string; icon: FlowIcon }[];
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

const preset = (
  key: string,
  label: string,
  description: string,
  accent: TemplateAccent,
  tokens: GlobalTokens,
): FlowPreset => ({ key, label, description, accent, tokens });

/** Midnight palette picks its accent trio by mode so the card feels native. */
function midnight(mode: WorkspaceMode): FlowPreset {
  const trio: Record<WorkspaceMode, [string, string, string]> = {
    EDUCATION: ['#7dd3fc', '#c4b5fd', '#fbbf24'],
    NON_PROFIT: ['#fdba74', '#fca5a5', '#fde047'],
    E_COMMERCE: ['#67e8f9', '#a5b4fc', '#fda4af'],
    GENERAL: ['#a5b4fc', '#67e8f9', '#fbbf24'],
    PARTNER: ['#93c5fd', '#c4b5fd', '#fcd34d'],
  };
  const [primary, secondary, accent] = trio[mode];
  return preset(
    'midnight',
    'Midnight',
    'Deep navy surfaces, luminous accents. Premium and evening-first.',
    { primary: '#0b1120', secondary: accent, surface: '#0f172a' },
    {
      theme: 'dark',
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      backgroundColor: '#080b14',
      surfaceColor: '#111827',
      textColor: '#e5e7eb',
      mutedTextColor: '#94a3b8',
      borderColor: '#25324a',
      borderRadius: 'rounded',
      fontHeading: 'Geist, system-ui, sans-serif',
      fontBody: 'Geist, system-ui, sans-serif',
    },
  );
}

function paper(): FlowPreset {
  return preset(
    'paper',
    'Warm paper',
    'Off-white paper, ink type, one confident accent. Editorial and calm.',
    { primary: '#292524', secondary: '#b45309', surface: '#faf7f2' },
    {
      theme: 'light',
      primaryColor: '#292524',
      secondaryColor: '#b45309',
      accentColor: '#b45309',
      backgroundColor: '#faf7f2',
      surfaceColor: '#f2ece2',
      textColor: '#1c1917',
      mutedTextColor: '#78716c',
      borderColor: '#e7e1d8',
      borderRadius: 'soft',
      fontHeading: 'Georgia, Times New Roman, serif',
      fontBody: 'Georgia, Times New Roman, serif',
    },
  );
}

/** Safe lookup — feature keys are hand-written so a typo must not crash the
 *  wizard. An unknown key silently drops the tile instead. */
function pickFeature(pool: FlowFeature[], keys: string[]): FlowFeature[] {
  return keys
    .map((key) => pool.find((f) => f.key === key))
    .filter((f): f is FlowFeature => Boolean(f));
}

/**
 * Tiles for a track, by key.
 *
 * `pickFeature` drops unknown keys quietly, which once left the e-learning
 * track rendering four blank tiles. The mismatch is a data bug, so it is said
 * out loud in development instead of being visible only to a client.
 */
function tiles(pool: FlowFeature[], keys: string[]): FlowFeature[] {
  const picked = pickFeature(pool, keys);
  if (process.env.NODE_ENV !== 'production' && picked.length !== keys.length) {
    const known = new Set(picked.map((feature) => feature.key));
    const missing = keys.filter((key) => !known.has(key));
    console.warn(`[setup-flow] unknown feature key(s): ${missing.join(', ')}`);
  }
  return picked;
}

// ═════════════════════════════════════════════════════════════════════════════
// EDUCATION
// ═════════════════════════════════════════════════════════════════════════════

const EDU_LEVELS = [
  { value: 'preschool', label: 'Preschool / Nursery', description: 'Ages 3–5, play led' },
  { value: 'lower-primary', label: 'Lower primary', description: 'Grades 1–3' },
  { value: 'upper-primary', label: 'Upper primary', description: 'Grades 4–6' },
  { value: 'junior-secondary', label: 'Junior secondary', description: 'Grades 7–9' },
  { value: 'senior-secondary', label: 'Senior secondary', description: 'Grades 10–12' },
  { value: 'sixth-form', label: 'Sixth form', description: 'A-Levels & IB DP' },
  { value: 'tvet', label: 'TVET / trades', description: 'Certificates & diplomas' },
  { value: 'tertiary', label: 'Tertiary', description: 'Diploma & degree' },
  { value: 'undergraduate', label: 'Undergraduate', description: "Bachelor's degree" },
  { value: 'postgraduate', label: 'Postgraduate', description: "Master's & PG diplomas" },
  { value: 'doctoral', label: 'Doctoral & research', description: 'PhD, fellowships' },
  { value: 'professional', label: 'Professional / CPD', description: 'Practising adults' },
  { value: 'adult', label: 'Adult & community', description: 'Lifelong learning' },
];

const EDU_LEVEL_VALUES = EDU_LEVELS.map((level) => level.value);

const EDU_CERT_FIELDS: FlowField[] = [
  {
    key: 'certificateName',
    label: 'Certificate title',
    type: 'text',
    placeholder: 'Certificate of Completion',
  },
];

const EDU_ONLINE_FIELDS: FlowField[] = [
  {
    key: 'learningModel',
    label: 'How the learning is delivered',
    type: 'select',
    options: [
      { value: 'self-paced', label: 'Self-paced library' },
      { value: 'cohort', label: 'Cohorts on a calendar' },
      { value: 'hybrid', label: 'Hybrid — library plus live' },
      { value: '1:1', label: 'One-to-one tutoring' },
    ],
  },
  {
    key: 'cohortSize',
    label: 'Typical cohort size',
    type: 'select',
    options: ['10', '25', '50', '100', 'open'].map((v) => ({
      value: v,
      label: v === 'open' ? 'Open enrolment' : `Up to ${v} learners`,
    })),
  },
  ...EDU_CERT_FIELDS,
];

const EDU_TIMETABLE_FIELDS: FlowField[] = [
  {
    key: 'timetablePeriods',
    label: 'Periods per day',
    type: 'select',
    options: ['4', '6', '8', '10'].map((v) => ({ value: v, label: `${v} periods` })),
  },
];

const EDU_HOSTEL_FIELDS: FlowField[] = [
  {
    key: 'houseSystem',
    label: 'Houses',
    type: 'select',
    options: ['none', '2', '3', '4', '6'].map((v) => ({
      value: v,
      label: v === 'none' ? 'No house system' : `${v} houses`,
    })),
  },
  {
    key: 'boardingPhase',
    label: 'Boarding phase',
    type: 'select',
    options: [
      { value: 'day', label: 'Day school only' },
      { value: 'both', label: 'Day + boarding' },
      { value: 'full', label: 'Full boarding' },
    ],
  },
];

/**
 * The evidence a registered institution is asked for. These are presentation
 * tokens — they render on the admissions and about pages — never a verification
 * claim: the Studio cannot confirm a registration number and does not pretend
 * to, so the copy says "as printed on your certificate".
 */
const EDU_INSTITUTION_FIELDS: FlowField[] = [
  {
    key: 'institutionType',
    label: 'What the register calls you',
    type: 'select',
    options: [
      { value: 'public', label: 'Public / government' },
      { value: 'private', label: 'Private' },
      { value: 'faith', label: 'Faith-based' },
      { value: 'aided', label: 'Government-aided' },
    ],
  },
  {
    key: 'registrationAuthority',
    label: 'Registering or accrediting body',
    type: 'select',
    options: [
      { value: 'ministry', label: 'Ministry / department of education' },
      { value: 'county', label: 'County or state board' },
      { value: 'national', label: 'National accreditor' },
      { value: 'international', label: 'International body (CIS, WASC, IB)' },
      { value: 'other', label: 'Something else' },
    ],
  },
  {
    key: 'registrationNumber',
    label: 'Registration / code number',
    type: 'text',
    hint: 'Exactly as printed on your certificate. Shown on admissions pages only.',
    placeholder: 'e.g. 215/10/401',
  },
  {
    key: 'foundedYear',
    label: 'Year founded',
    type: 'text',
    placeholder: '1984',
    maxLength: 4,
  },
  {
    key: 'campusSetting',
    label: 'Campus',
    type: 'select',
    options: [
      { value: 'urban', label: 'Urban' },
      { value: 'suburban', label: 'Suburban' },
      { value: 'rural', label: 'Rural' },
      { value: 'multi', label: 'Multi-campus' },
    ],
  },
];

/** The lighter evidence a learning programme run by someone else carries. */
const EDU_PROGRAMME_FIELDS: FlowField[] = [
  {
    key: 'hostOrganisation',
    label: 'Who runs this programme',
    type: 'text',
    placeholder: 'Coastal Health Trust',
  },
  {
    key: 'audienceFocus',
    label: 'Who it is for',
    type: 'select',
    options: [
      { value: 'youth', label: 'Out-of-school youth' },
      { value: 'practitioners', label: 'Practitioners & teachers' },
      { value: 'community', label: 'The wider community' },
      { value: 'staff', label: 'Our own staff' },
    ],
  },
  {
    key: 'fundingModel',
    label: 'Who pays',
    type: 'select',
    options: [
      { value: 'sponsored', label: 'Fully sponsored' },
      { value: 'subsidised', label: 'Subsidised / sliding scale' },
      { value: 'self-pay', label: 'Learners pay' },
      { value: 'employer', label: 'Employer-funded' },
    ],
  },
  ...EDU_CERT_FIELDS,
];

const EDU_FEATURES: FlowFeature[] = [
  { key: 'resultsOnline', label: 'Online results', description: 'Students view grades the day they publish.', icon: 'monitor' },
  { key: 'feeStatements', label: 'Fee statements', description: 'Per-term invoices with instalments.', icon: 'hand-coins' },
  { key: 'timetable', label: 'Timetables', description: 'Class and room schedules, calendar feeds.', icon: 'calendar' },
  { key: 'staffDirectory', label: 'Staff directory', description: 'Protected profiles with roles and rooms.', icon: 'users' },
  { key: 'admissions', label: 'Admissions portal', description: 'Public steps plus enquiry routes.', icon: 'school' },
  { key: 'library', label: 'Library card', description: 'Catalogue plus borrowed-item renewals.', icon: 'library' },
  { key: 'transport', label: 'Transport', description: 'Routes, stops, driver contacts.', icon: 'bus' },
  { key: 'meals', label: 'Meals menu', description: 'Weekly menu and dietary flags.', icon: 'utensils' },
  { key: 'certificates', label: 'Certificates', description: 'Signed, verifiable completion slips.', icon: 'award' },
  { key: 'liveTutoring', label: 'Live classes', description: 'Streaming sessions with replay.', icon: 'slides' },
  { key: 'progressTracking', label: 'Progress tracking', description: 'Per-learner pace, streaks and gaps.', icon: 'target' },
  { key: 'cohorts', label: 'Cohorts', description: 'Date-driven groups with shared milestones.', icon: 'users' },
  { key: 'courseCatalog', label: 'Course catalogue', description: 'Subjects, levels and what each one covers.', icon: 'layers' },
  { key: 'assessments', label: 'Assessments', description: 'Quizzes with instant, explain-the-answer feedback.', icon: 'badge-check' },
  { key: 'enrolment', label: 'Online enrolment', description: 'Self-serve sign-up with a seat count.', icon: 'compass' },
  { key: 'payments', label: 'Course payments', description: 'Per-course or per-cohort invoicing.', icon: 'hand-coins' },
];


export const EDUCATION_FLOW: ModeFlow = {
  key: 'EDUCATION',
  icon: 'graduation',
  osName: 'EduOS',
  splashMotif: 'campus',
  accent: { primary: '#4f46e5', secondary: '#22d3ee', surface: '#eef2ff' },
  splashLines: [
    'Opening the EduOS shelf',
    'Mapping campus and cohort surfaces',
    'Dressing results, fees and timetables',
    'Launching your studio',
  ],
  brandTitle: 'Welcome to EduOS',
  brandTagline:
    'gives a school, an academy or a learning programme a living portal — results, fees and timetables stay wired to the systems that already run them.',
  origin: {
    title: 'Before we ask about levels — what is this, exactly?',
    description:
      'EduOS runs three different operations. This choice decides which questions follow, which evidence we ask for and which pages get dressed.',
    note: 'Nothing here locks you in — it changes the order we ask, not what you can turn on later.',
    options: [
      {
        id: 'institution',
        label: 'A registered school or college',
        description:
          'On the government or accreditor register, with a campus, a term calendar and published results.',
        icon: 'school',
        accent: { primary: '#1e3a8a', secondary: '#f59e0b' },
        trackTitle: 'What kind of institution is it?',
        trackDescription:
          'The phase decides which levels, houses and reporting pages EduOS dresses first.',
        tracks: [
          'primary',
          'secondary',
          'k12',
          'boarding',
          'international',
          'madrasah',
          'higher-ed',
          'vocational',
          'special-needs',
        ],
        fields: EDU_INSTITUTION_FIELDS,
        credentialsTitle: 'The details a registered institution publishes',
        credentialsHint:
          'These land on your admissions and about pages as ordinary text. EduOS displays them; it never verifies them.',
        recommends: ['resultsOnline', 'feeStatements', 'timetable', 'admissions'],
        templateKeys: ['edu-campus', 'edu-heritage', 'edu-global'],
        examples: {
          name: 'Riverside Academy',
          tagline: 'Learning with purpose, leading with care.',
        },
      },
      {
        id: 'online',
        label: 'An online academy',
        description:
          'Courses, cohorts and certificates. No campus roll, no fee ledger, no national results slip.',
        icon: 'monitor',
        accent: { primary: '#4f46e5', secondary: '#22d3ee' },
        trackTitle: 'What kind of academy is it?',
        trackDescription:
          'The delivery shape decides which learner surfaces appear — catalogue, cohort calendar or tutoring.',
        tracks: [
          'course-library',
          'cohort-academy',
          'exam-prep',
          'tutoring',
          'corporate-training',
          'micro-credentials',
        ],
        fields: EDU_ONLINE_FIELDS,
        credentialsTitle: 'How the academy runs',
        credentialsHint:
          'Delivery model and cohort size tune the learner pages. Certificate title prints on the completion slip.',
        recommends: ['certificates', 'progressTracking', 'cohorts', 'courseCatalog'],
        templateKeys: ['edu-elearning', 'edu-vibrant', 'edu-campus'],
        operationalTitle: 'How the academy runs',
        operationalFields: [
          {
            key: 'admissionsEmail',
            label: 'Learner support email',
            type: 'email',
            placeholder: 'help@academy.example',
          },
          {
            key: 'teachingTimezone',
            label: 'Live classes run in',
            type: 'select',
            options: [
              { value: 'utc', label: 'UTC' },
              { value: 'eAT', label: 'East Africa (UTC+3)' },
              { value: 'wAT', label: 'West Africa (UTC+1)' },
              { value: 'cet', label: 'Central Europe (UTC+1)' },
              { value: 'est', label: 'US Eastern (UTC-5)' },
            ],
          },
          {
            key: 'courseCurrency',
            label: 'Payment currency',
            type: 'select',
            options: [
              { value: 'USD', label: 'USD — US dollar' },
              { value: 'EUR', label: 'EUR — Euro' },
              { value: 'GBP', label: 'GBP — Pound sterling' },
              { value: 'KES', label: 'KES — Kenyan shilling' },
              { value: 'NGN', label: 'NGN — Nigerian naira' },
            ],
          },
          {
            key: 'nextIntake',
            label: 'Next intake',
            type: 'text',
            placeholder: 'September 2026',
          },
        ],
        examples: {
          name: 'Northstar Learning',
          tagline: 'Career skills, taught live and finished on time.',
        },
      },
      {
        id: 'programme',
        label: "A learning programme run by an organisation that isn't a school",
        description:
          'An NGO, association or company that opened an Education workspace to run training — for staff, communities or scholars.',
        icon: 'hand-heart',
        accent: { primary: '#0f766e', secondary: '#fbbf24' },
        trackTitle: 'What kind of programme is it?',
        trackDescription:
          'Programmes report to funders and learners, so EduOS dresses completion and reach instead of campus machinery.',
        tracks: ['open-programme', 'trainer-network', 'micro-credentials', 'community-training'],
        fields: EDU_PROGRAMME_FIELDS,
        credentialsTitle: 'Who is behind the programme',
        credentialsHint:
          'The host organisation and who it is for appear on the programme pages. Keep it as public as you want it to read.',
        recommends: ['certificates', 'progressTracking', 'cohorts'],
        templateKeys: ['edu-elearning', 'edu-vibrant', 'edu-global'],
        operationalTitle: 'How the programme reports itself',
        operationalFields: [
          {
            key: 'contactEmail',
            label: 'Programme enquiries email',
            type: 'email',
            placeholder: 'learning@organisation.example',
          },
          {
            key: 'cohortCadence',
            label: 'Intakes',
            type: 'select',
            options: [
              { value: 'rolling', label: 'Rolling — join any week' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'cohort', label: 'One scheduled cohort' },
            ],
          },
          {
            key: 'reachTarget',
            label: 'Learners this programme aims to reach',
            type: 'select',
            options: ['100', '500', '2000', '10000'].map((v) => ({
              value: v,
              label: `${v} learners`,
            })),
          },
        ],
        examples: {
          name: 'Open Skills Initiative',
          tagline: 'Free, verified training for health workers on the coast.',
        },
      },
    ],
  },
  trackTitle: 'What kind of school is this?',
  trackDescription:
    'Pick the closest fit — each track tunes which levels, features and operational fields appear next.',
  tracks: [
    // ── Registered institution shelf ──────────────────────────────────────────
    {
      id: 'primary',
      label: 'Primary school',
      description: 'Young learners, warm guardians, friendly reporting.',
      icon: 'school',
      accent: { primary: '#0ea5e9', secondary: '#22c55e' },
      children: EDU_LEVEL_VALUES.slice(0, 3),
      features: tiles(EDU_FEATURES, ['timetable', 'feeStatements', 'meals', 'transport']),
      templateKeys: ['edu-vibrant', 'edu-campus'],
    },
    {
      id: 'secondary',
      label: 'Secondary school',
      description: 'Exams, results, and a strong house identity.',
      icon: 'book-open',
      accent: { primary: '#7c3aed', secondary: '#f59e0b' },
      children: ['junior-secondary', 'senior-secondary', 'sixth-form'],
      features: tiles(EDU_FEATURES, [
        'resultsOnline',
        'feeStatements',
        'timetable',
        'staffDirectory',
      ]),
      fields: EDU_TIMETABLE_FIELDS,
      templateKeys: ['edu-campus', 'edu-heritage'],
    },
    {
      id: 'k12',
      label: 'K–12 unified',
      description: 'All levels on one campus, one report card engine.',
      icon: 'university',
      accent: { primary: '#2563eb', secondary: '#10b981' },
      children: EDU_LEVEL_VALUES.slice(0, 5),
      features: tiles(EDU_FEATURES, [
        'resultsOnline',
        'feeStatements',
        'timetable',
        'staffDirectory',
        'admissions',
        'library',
      ]),
      templateKeys: ['edu-campus', 'edu-global'],
    },
    {
      id: 'boarding',
      label: 'Boarding school',
      description: 'Hostel, houses, meals and transport all day-long.',
      icon: 'bed',
      accent: { primary: '#64748b', secondary: '#38bdf8' },
      children: ['junior-secondary', 'senior-secondary', 'sixth-form'],
      features: tiles(EDU_FEATURES, ['meals', 'transport', 'staffDirectory', 'feeStatements']),
      fields: EDU_HOSTEL_FIELDS,
      templateKeys: ['edu-heritage', 'edu-campus'],
    },
    {
      id: 'international',
      label: 'International school',
      description: 'IB / IGCSE routes, multilingual, global intake.',
      icon: 'globe',
      accent: { primary: '#06b6d4', secondary: '#a855f7' },
      children: EDU_LEVEL_VALUES.slice(0, 6),
      features: tiles(EDU_FEATURES, ['admissions', 'timetable', 'feeStatements', 'transport']),
      fields: [
        {
          key: 'curriculumModel',
          label: 'Curriculum',
          type: 'select',
          options: [
            { value: 'ib', label: 'IB (PYP / MYP / DP)' },
            { value: 'igcse', label: 'Cambridge IGCSE / A-Level' },
            { value: 'mixed', label: 'Mixed / blend' },
          ],
        },
      ],
      templateKeys: ['edu-global', 'edu-campus'],
    },
    {
      id: 'madrasah',
      label: 'Madrasah / Islamic',
      description: 'Quran, Arabic and Islamic studies alongside academics.',
      icon: 'moon',
      accent: { primary: '#22c55e', secondary: '#f59e0b' },
      children: EDU_LEVEL_VALUES.slice(0, 5),
      features: tiles(EDU_FEATURES, ['timetable', 'staffDirectory', 'library']),
      templateKeys: ['edu-heritage', 'edu-campus'],
    },
    {
      id: 'higher-ed',
      label: 'College / university',
      description: 'Departments, transcripts, and module enrolment.',
      icon: 'university',
      accent: { primary: '#1d4ed8', secondary: '#a78bfa' },
      children: ['tertiary', 'undergraduate', 'postgraduate', 'doctoral'],
      features: tiles(EDU_FEATURES, [
        'resultsOnline',
        'staffDirectory',
        'library',
        'admissions',
        'feeStatements',
      ]),
      templateKeys: ['edu-global', 'edu-campus', 'edu-heritage'],
    },
    {
      id: 'vocational',
      label: 'Vocational / TVET',
      description: 'Trades, practicals and industry placements.',
      icon: 'wrench',
      accent: { primary: '#ea580c', secondary: '#22d3ee' },
      children: ['tvet', 'professional'],
      features: tiles(EDU_FEATURES, ['timetable', 'staffDirectory', 'admissions', 'certificates']),
      templateKeys: ['edu-vibrant', 'edu-elearning'],
    },
    {
      id: 'special-needs',
      label: 'Inclusive / special needs',
      description: 'Individual plans and therapy tracking.',
      icon: 'heartbeat',
      accent: { primary: '#ec4899', secondary: '#22d3ee' },
      children: EDU_LEVEL_VALUES.slice(0, 5),
      features: tiles(EDU_FEATURES, ['timetable', 'staffDirectory', 'library']),
      templateKeys: ['edu-vibrant', 'edu-campus'],
    },
    // ── Online academy shelf ──────────────────────────────────────────────────
    {
      id: 'course-library',
      label: 'Self-paced course library',
      description: 'A catalogue people join any day, at their own speed.',
      icon: 'library',
      accent: { primary: '#4f46e5', secondary: '#22d3ee' },
      children: ['tvet', 'undergraduate', 'postgraduate', 'professional', 'adult'],
      features: tiles(EDU_FEATURES, [
        'courseCatalog',
        'assessments',
        'certificates',
        'progressTracking',
        'payments',
      ]),
      fields: EDU_CERT_FIELDS,
      templateKeys: ['edu-elearning', 'edu-campus'],
    },
    {
      id: 'cohort-academy',
      label: 'Cohort academy',
      description: 'Live classes on a calendar, with a tutor and a finish line.',
      icon: 'slides',
      accent: { primary: '#7c3aed', secondary: '#fbbf24' },
      children: ['postgraduate', 'professional', 'adult'],
      features: tiles(EDU_FEATURES, [
        'liveTutoring',
        'cohorts',
        'progressTracking',
        'certificates',
        'enrolment',
      ]),
      fields: [
        {
          key: 'cohortCadence',
          label: 'Cohorts start',
          type: 'select',
          options: [
            { value: 'weekly', label: 'Every week' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'termly', label: 'On a term calendar' },
            { value: 'bespoke', label: 'When a group forms' },
          ],
        },
        ...EDU_CERT_FIELDS,
      ],
      templateKeys: ['edu-elearning', 'edu-global'],
    },
    {
      id: 'exam-prep',
      label: 'Exam prep & tuition centre',
      description: 'Past papers, drills and predicted grades.',
      icon: 'badge-check',
      accent: { primary: '#0ea5e9', secondary: '#f59e0b' },
      children: ['junior-secondary', 'senior-secondary', 'sixth-form'],
      features: tiles(EDU_FEATURES, [
        'assessments',
        'liveTutoring',
        'progressTracking',
        'feeStatements',
      ]),
      templateKeys: ['edu-campus', 'edu-elearning'],
    },
    {
      id: 'tutoring',
      label: '1-to-1 / small group tutoring',
      description: 'Booked sessions, matched tutors, per-learner plans.',
      icon: 'users',
      accent: { primary: '#ec4899', secondary: '#38bdf8' },
      children: EDU_LEVEL_VALUES.slice(1, 6),
      features: tiles(EDU_FEATURES, ['liveTutoring', 'enrolment', 'payments', 'progressTracking']),
      templateKeys: ['edu-vibrant', 'edu-elearning'],
    },
    {
      id: 'corporate-training',
      label: 'Corporate & team training',
      description: 'Departments, seat licences, completion reporting.',
      icon: 'building',
      accent: { primary: '#0f766e', secondary: '#a5b4fc' },
      children: ['professional', 'postgraduate'],
      features: tiles(EDU_FEATURES, [
        'courseCatalog',
        'progressTracking',
        'certificates',
        'assessments',
      ]),
      fields: [
        {
          key: 'licenceModel',
          label: 'How seats are bought',
          type: 'select',
          options: [
            { value: 'per-seat', label: 'Per seat' },
            { value: 'per-team', label: 'Per team' },
            { value: 'enterprise', label: 'Enterprise licence' },
          ],
        },
      ],
      templateKeys: ['edu-global', 'edu-elearning'],
    },
    {
      id: 'micro-credentials',
      label: 'Micro-credentials & badges',
      description: 'Short, stackable, verifiable certificates.',
      icon: 'award',
      accent: { primary: '#b45309', secondary: '#22d3ee' },
      children: ['tvet', 'undergraduate', 'postgraduate', 'professional', 'adult'],
      features: tiles(EDU_FEATURES, ['certificates', 'assessments', 'courseCatalog', 'enrolment']),
      fields: EDU_CERT_FIELDS,
      templateKeys: ['edu-elearning', 'edu-vibrant'],
    },
    // ── Programme shelf ───────────────────────────────────────────────────────
    {
      id: 'open-programme',
      label: 'Open learning programme',
      description: 'Anyone can join; completion and reach are what count.',
      icon: 'compass',
      accent: { primary: '#0f766e', secondary: '#fbbf24' },
      children: ['tvet', 'professional', 'adult'],
      features: tiles(EDU_FEATURES, ['courseCatalog', 'progressTracking', 'certificates']),
      templateKeys: ['edu-elearning', 'edu-vibrant'],
    },
    {
      id: 'trainer-network',
      label: 'Trainer & practitioner network',
      description: 'People trained to deliver the work, then kept current.',
      icon: 'network',
      accent: { primary: '#1d4ed8', secondary: '#34d399' },
      children: ['professional', 'postgraduate'],
      features: tiles(EDU_FEATURES, [
        'staffDirectory',
        'liveTutoring',
        'progressTracking',
        'certificates',
      ]),
      templateKeys: ['edu-global', 'edu-campus'],
    },
    {
      id: 'community-training',
      label: 'Community & outreach classes',
      description: 'Sessions run where the people already are.',
      icon: 'home',
      accent: { primary: '#15803d', secondary: '#facc15' },
      children: ['adult', 'tvet'],
      features: tiles(EDU_FEATURES, ['enrolment', 'cohorts', 'progressTracking']),
      templateKeys: ['edu-vibrant', 'edu-elearning'],
    },
  ],
  childrenCatalog: Object.fromEntries(EDU_LEVELS.map((level) => [level.value, level])),
  childFieldLabel: 'Which levels do you serve?',
  childFieldHint: 'Multi-select. The label feeds tone and the pages that mention levels.',
  operationalTitle: 'How your school runs',
  operationalFields: [
    {
      key: 'academicYear',
      label: 'Current academic year',
      type: 'text',
      placeholder: '2026 / 2027',
      required: true,
    },
    {
      key: 'admissionsEmail',
      label: 'Admissions email',
      type: 'email',
      placeholder: 'admissions@school.example',
    },
    {
      key: 'phone',
      label: 'Front office phone',
      type: 'tel',
      placeholder: '+1 555 0100',
    },
    {
      key: 'admissionsOpen',
      label: 'Admissions status',
      type: 'select',
      options: [
        { value: 'open', label: 'Open now' },
        { value: 'waitlist', label: 'Waitlist' },
        { value: 'closed', label: 'Closed for this year' },
      ],
    },
    {
      key: 'termName',
      label: 'Current term',
      type: 'select',
      options: [
        { value: 'term1', label: 'Term 1' },
        { value: 'term2', label: 'Term 2' },
        { value: 'term3', label: 'Term 3' },
        { value: 'semester1', label: 'Semester 1' },
        { value: 'semester2', label: 'Semester 2' },
      ],
    },
  ],
  featuresTitle: 'Which EduOS modules should shine?',
  featuresHint: 'We surface the matching panels in the Studio so the noisy ones stay out of view — nothing new gets built.',
  presets: [
    preset(
      'campus-blue',
      'Campus blue',
      'Trustworthy navy, warm gold, crisp paper. The default academic palette.',
      { primary: '#1e3a8a', secondary: '#f59e0b', surface: '#f1f5f9' },
      {
        theme: 'light',
        primaryColor: '#1e3a8a',
        secondaryColor: '#f59e0b',
        accentColor: '#f59e0b',
        backgroundColor: '#ffffff',
        surfaceColor: '#f1f5f9',
        textColor: '#0f172a',
        mutedTextColor: '#475569',
        borderColor: '#cbd5e1',
        borderRadius: 'rounded',
        fontHeading: 'Bricolage Grotesque, Georgia, serif',
        fontBody: 'Geist, system-ui, sans-serif',
      },
    ),
    preset(
      'heritage',
      'Heritage',
      'Maroon, gold, serif voice, square corners.',
      { primary: '#7f1d1d', secondary: '#ca8a04', surface: '#fffdf7' },
      {
        theme: 'light',
        primaryColor: '#7f1d1d',
        secondaryColor: '#ca8a04',
        accentColor: '#ca8a04',
        backgroundColor: '#fffdf7',
        surfaceColor: '#faf5eb',
        textColor: '#292524',
        mutedTextColor: '#78716c',
        borderColor: '#e7e5e4',
        borderRadius: 'none',
        fontHeading: 'Georgia, Times New Roman, serif',
        fontBody: 'Georgia, Times New Roman, serif',
      },
    ),
    preset(
      'vibrant',
      'Vibrant campus',
      'Teal, coral, pill shapes, energetic and friendly.',
      { primary: '#0f766e', secondary: '#f97316', surface: '#f0fdfa' },
      {
        theme: 'light',
        primaryColor: '#0f766e',
        secondaryColor: '#f97316',
        accentColor: '#06b6d4',
        backgroundColor: '#f0fdfa',
        surfaceColor: '#ccfbf1',
        textColor: '#042f2e',
        mutedTextColor: '#115e59',
        borderColor: '#99f6e4',
        borderRadius: 'pill',
        fontHeading: 'Bricolage Grotesque, system-ui, sans-serif',
        fontBody: 'Geist, system-ui, sans-serif',
      },
    ),
    midnight('EDUCATION'),
  ],
  paletteTitle: 'The palette every page inherits',
  paletteHint: 'Tune later in the Studio token panel — this is the global starting point.',
  runtimeSurfaces: [
    'Student results & grade history',
    'Fee statements & payment plans',
    'Class timetables',
    'Staff directory',
  ],
  templateTitle: 'Pick the portal you want to start inside',
  templateHint:
    'Every card is a real workspace document. Installing one loads it into your draft, then the wizard dresses it — your live portal keeps serving whatever is published today.',
  spine: [
    { id: 'welcome', label: 'EduOS', icon: 'graduation' },
    { id: 'identity', label: 'Brand', icon: 'sparkles' },
    { id: 'origin', label: 'Operation', icon: 'compass' },
    { id: 'track', label: 'Setting', icon: 'target' },
    { id: 'levels', label: 'Levels', icon: 'layers' },
    { id: 'features', label: 'Modules', icon: 'lightbulb' },
    { id: 'credentials', label: 'Register', icon: 'identity' },
    { id: 'operations', label: 'Details', icon: 'scroll' },
    { id: 'template', label: 'Template', icon: 'images' },
    { id: 'style', label: 'Palette', icon: 'palette' },
    { id: 'review', label: 'Review', icon: 'badge-check' },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// NON-PROFIT
// ═════════════════════════════════════════════════════════════════════════════

const NGO_CAUSES: FlowFeature[] = [
  { key: 'cleanWater', label: 'Clean water', description: 'Boreholes, filters, sanitation.', icon: 'heartbeat' },
  { key: 'education', label: 'Education', description: 'Scholarships and after-school support.', icon: 'school' },
  { key: 'healthcare', label: 'Healthcare', description: 'Clinics, outreach, maternal care.', icon: 'heartbeat' },
  { key: 'disaster', label: 'Emergency relief', description: 'Rapid response and recovery.', icon: 'shield-check' },
  { key: 'environment', label: 'Environment', description: 'Conservation and rewilding.', icon: 'tree' },
  { key: 'advocacy', label: 'Advocacy', description: 'Policy, research, campaigns.', icon: 'megaphone' },
  { key: 'community', label: 'Community', description: 'Local partnerships and training.', icon: 'users' },
  { key: 'animals', label: 'Animal welfare', description: 'Rescue and care programmes.', icon: 'dove' },
];

const NGO_MONEY_FIELDS: FlowField[] = [
  {
    key: 'donationModel',
    label: 'Primary donation model',
    type: 'select',
    options: [
      { value: 'one-off', label: 'One-off gifts' },
      { value: 'monthly', label: 'Monthly giving' },
      { value: 'campaigns', label: 'Time-boxed campaigns' },
      { value: 'balanced', label: 'All of the above' },
    ],
  },
  {
    key: 'donationCurrency',
    label: 'Donation currency',
    type: 'select',
    options: [
      { value: 'USD', label: 'USD — US dollar' },
      { value: 'EUR', label: 'EUR — Euro' },
      { value: 'GBP', label: 'GBP — Pound sterling' },
      { value: 'KES', label: 'KES — Kenyan shilling' },
      { value: 'NGN', label: 'NGN — Nigerian naira' },
    ],
  },
];

export const NON_PROFIT_FLOW: ModeFlow = {
  key: 'NON_PROFIT',
  icon: 'heart',
  osName: 'NGO OS',
  splashMotif: 'pulse',
  accent: { primary: '#b91c1c', secondary: '#f97316', surface: '#fef2f2' },
  splashLines: [
    'Shaping the giving story',
    'Dressing campaign & impact pages',
    'Wiring donation forms safely',
    'Launching your studio',
  ],
  brandTitle: 'Welcome to NGO OS',
  brandTagline: 'turns your mission into a portal people trust — donation forms and donor walls stay wired to the systems that already process them.',
  trackTitle: 'What kind of work does this NGO do?',
  trackDescription: 'The focus changes which impact pages, campaigns and donor tones appear next.',
  tracks: [
    {
      id: 'humanitarian',
      label: 'Humanitarian aid',
      description: 'Emergency response, logistics and dignity.',
      icon: 'hand-heart',
      accent: { primary: '#c2410c', secondary: '#f97316' },
      features: ['disaster', 'community', 'advocacy'].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
      fields: NGO_MONEY_FIELDS,
    },
    {
      id: 'clean-water',
      label: 'Water & sanitation',
      description: 'Boreholes, wells and hygiene.',
      icon: 'heartbeat',
      accent: { primary: '#0891b2', secondary: '#22d3ee' },
      features: ['cleanWater', 'community', 'education'].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: 'education-charity',
      label: 'Education charity',
      description: 'Scholarships and school partnerships.',
      icon: 'school',
      accent: { primary: '#7c3aed', secondary: '#22d3ee' },
      features: ['education', 'community', 'advocacy'].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: 'health-charity',
      label: 'Health & wellbeing',
      description: 'Clinics, screenings and outreach.',
      icon: 'heartbeat',
      accent: { primary: '#e11d48', secondary: '#fbbf24' },
      features: ['healthcare', 'community'].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: 'environment',
      label: 'Environment & climate',
      description: 'Rewilding, conservation, and research.',
      icon: 'tree',
      accent: { primary: '#15803d', secondary: '#84cc16' },
      features: ['environment', 'advocacy', 'community'].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: 'advocacy',
      label: 'Advocacy & policy',
      description: 'Research-led campaigns that shift the needle.',
      icon: 'megaphone',
      accent: { primary: '#4338ca', secondary: '#f59e0b' },
      features: ['advocacy', 'community'].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: 'animal',
      label: 'Animal welfare',
      description: 'Rescue centres and rehoming.',
      icon: 'dove',
      accent: { primary: '#b45309', secondary: '#a3e635' },
      features: ['animals', 'community'].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: 'faith',
      label: 'Faith-based work',
      description: 'Congregations leading local and global service.',
      icon: 'moon',
      accent: { primary: '#065f46', secondary: '#fbbf24' },
      features: ['community', 'cleanWater', 'education'].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
  ],
  operationalTitle: 'How your foundation presents itself',
  operationalFields: [
    {
      key: 'registrationNumber',
      label: 'Charity / registration number',
      type: 'text',
      placeholder: 'EIN, RCT or equivalent',
    },
    {
      key: 'contactEmail',
      label: 'Programme enquiries email',
      type: 'email',
      placeholder: 'hello@foundation.example',
    },
    {
      key: 'fundingFocus',
      label: 'One-line focus',
      type: 'text',
      placeholder: 'Locally-led water access',
    },
    {
      key: 'fiscalYearEnd',
      label: 'Fiscal year end',
      type: 'select',
      options: [
        { value: 'june', label: 'June' },
        { value: 'september', label: 'September' },
        { value: 'december', label: 'December' },
      ],
    },
  ],
  featuresTitle: 'Which giving surfaces matter most?',
  featuresHint: 'We order the Studio pages and admin panels around these — nothing new gets built.',
  presets: [
    preset(
      'impact-red',
      'Impact red',
      'Urgent red and orange. Built to convert attention into action.',
      { primary: '#b91c1c', secondary: '#f97316', surface: '#fef2f2' },
      {
        theme: 'light',
        primaryColor: '#b91c1c',
        secondaryColor: '#f97316',
        accentColor: '#f97316',
        backgroundColor: '#ffffff',
        surfaceColor: '#fef2f2',
        textColor: '#1c1917',
        mutedTextColor: '#78716c',
        borderColor: '#fecaca',
        borderRadius: 'rounded',
        fontHeading: 'Bricolage Grotesque, Georgia, serif',
        fontBody: 'Geist, system-ui, sans-serif',
      },
    ),
    preset(
      'warm-give',
      'Warm giving',
      'Amber paper and forest green. Personal and monthly-giving friendly.',
      { primary: '#9a3412', secondary: '#f59e0b', surface: '#fffbeb' },
      {
        theme: 'light',
        primaryColor: '#9a3412',
        secondaryColor: '#f59e0b',
        accentColor: '#16a34a',
        backgroundColor: '#fffbeb',
        surfaceColor: '#fef3c7',
        textColor: '#1c1917',
        mutedTextColor: '#78716c',
        borderColor: '#fed7aa',
        borderRadius: 'soft',
        fontHeading: 'Bricolage Grotesque, Georgia, serif',
        fontBody: 'Georgia, Times New Roman, serif',
      },
    ),
    preset(
      'trust',
      'Institutional trust',
      'Slate, sky and an evidence-led hierarchy.',
      { primary: '#0f172a', secondary: '#0ea5e9', surface: '#f8fafc' },
      {
        theme: 'light',
        primaryColor: '#0f172a',
        secondaryColor: '#0ea5e9',
        accentColor: '#38bdf8',
        backgroundColor: '#f8fafc',
        surfaceColor: '#e2e8f0',
        textColor: '#0f172a',
        mutedTextColor: '#475569',
        borderColor: '#cbd5e1',
        borderRadius: 'rounded',
        fontHeading: 'Geist, system-ui, sans-serif',
        fontBody: 'Geist, system-ui, sans-serif',
      },
    ),
    midnight('NON_PROFIT'),
  ],
  paletteTitle: 'The palette donors see',
  paletteHint: 'Campaign tokens and receipt colours stay in NGO OS — this is the presentation layer.',
  runtimeSurfaces: [
    'Campaign progress ledger',
    'Impact statistics',
    'Donor wall (anonymity respected)',
    'Volunteer sign-ups',
  ],
  templateTitle: 'Choose the giving experience to open with',
  templateHint:
    'A template is data, not a deployment. Installing one fills your draft; the live site is untouched until you publish.',
  spine: [
    { id: 'welcome', label: 'NGO OS', icon: 'heart' },
    { id: 'identity', label: 'Brand', icon: 'sparkles' },
    { id: 'track', label: 'Cause', icon: 'target' },
    { id: 'features', label: 'Giving', icon: 'hand-heart' },
    { id: 'operations', label: 'Details', icon: 'scroll' },
    { id: 'template', label: 'Template', icon: 'images' },
    { id: 'style', label: 'Palette', icon: 'palette' },
    { id: 'review', label: 'Review', icon: 'badge-check' },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// COMMERCE
// ═════════════════════════════════════════════════════════════════════════════

const COMMERCE_SHAPES: FlowFeature[] = [
  { key: 'catalog', label: 'Rich catalogue', description: 'Collections, variants, filters.', icon: 'library' },
  { key: 'bundles', label: 'Bundles & kits', description: 'Grouped SKUs with savings.', icon: 'puzzle' },
  { key: 'digital', label: 'Digital goods', description: 'Downloads and licence keys.', icon: 'monitor' },
  { key: 'subscriptions', label: 'Subscriptions', description: 'Recurring orders and portals.', icon: 'network' },
  { key: 'services', label: 'Services', description: 'Bookable appointments and packages.', icon: 'bed' },
  { key: 'wholesale', label: 'Wholesale', description: 'Tiered pricing for trade accounts.', icon: 'users' },
];

export const E_COMMERCE_FLOW: ModeFlow = {
  key: 'E_COMMERCE',
  icon: 'store',
  osName: 'Commerce OS',
  splashMotif: 'ledger',
  accent: { primary: '#0f766e', secondary: '#06b6d4', surface: '#f0fdfa' },
  splashLines: [
    'Rolling out the storefront',
    'Dressing catalogue & checkout',
    'Binding product surfaces',
    'Launching your studio',
  ],
  brandTitle: 'Welcome to Commerce OS',
  brandTagline: 'gives your storefront a customer experience that converts — the checkout stays wired to the systems that already move stock.',
  trackTitle: 'What kind of store is this?',
  trackDescription: 'Catalogue shape decides which product surfaces and admin panels surface.',
  tracks: [
    {
      id: 'retail',
      label: 'Retail goods',
      description: 'Classic catalogue with variants and stock.',
      icon: 'building',
      accent: { primary: '#0f766e', secondary: '#06b6d4' },
      features: ['catalog', 'bundles'].map((k) => pickFeature(COMMERCE_SHAPES, [k])[0]!),
    },
    {
      id: 'digital',
      label: 'Digital products',
      description: 'Downloads, licences, memberships.',
      icon: 'monitor',
      accent: { primary: '#4f46e5', secondary: '#22d3ee' },
      features: ['digital', 'subscriptions'].map((k) => pickFeature(COMMERCE_SHAPES, [k])[0]!),
    },
    {
      id: 'subscription',
      label: 'Subscription box',
      description: 'Recurring plans, swaps and skip months.',
      icon: 'network',
      accent: { primary: '#7c3aed', secondary: '#fbbf24' },
      features: ['subscriptions', 'catalog'].map((k) => pickFeature(COMMERCE_SHAPES, [k])[0]!),
    },
    {
      id: 'bespoke',
      label: 'Services & bespoke',
      description: 'Bookable work, quotations and packages.',
      icon: 'wrench',
      accent: { primary: '#ea580c', secondary: '#38bdf8' },
      features: ['services', 'bundles'].map((k) => pickFeature(COMMERCE_SHAPES, [k])[0]!),
    },
    {
      id: 'wholesale',
      label: 'Wholesale / trade',
      description: 'Tiered accounts and account-guided buying.',
      icon: 'users',
      accent: { primary: '#64748b', secondary: '#a78bfa' },
      features: ['wholesale', 'catalog'].map((k) => pickFeature(COMMERCE_SHAPES, [k])[0]!),
    },
  ],
  operationalTitle: 'How your store presents itself',
  operationalFields: [
    {
      key: 'supportEmail',
      label: 'Support email',
      type: 'email',
      placeholder: 'support@store.example',
    },
    {
      key: 'supportPhone',
      label: 'Support phone',
      type: 'tel',
      placeholder: '+1 555 0130',
    },
    {
      key: 'currency',
      label: 'Store currency',
      type: 'select',
      options: [
        { value: 'USD', label: 'USD — US dollar' },
        { value: 'EUR', label: 'EUR — Euro' },
        { value: 'GBP', label: 'GBP — Pound sterling' },
        { value: 'KES', label: 'KES — Kenyan shilling' },
        { value: 'NGN', label: 'NGN — Nigerian naira' },
      ],
    },
    {
      key: 'returnPolicy',
      label: 'Return window',
      type: 'select',
      options: [
        { value: '7', label: '7 days' },
        { value: '14', label: '14 days' },
        { value: '30', label: '30 days' },
        { value: '60', label: '60 days' },
      ],
    },
  ],
  featuresTitle: 'Which Commerce OS surfaces should shine?',
  featuresHint: 'We surface matching panels — nothing new gets built.',
  presets: [
    preset(
      'commerce-default',
      'Clean commerce',
      'Cyan on white. Familiar, fast, product-first.',
      { primary: '#0f172a', secondary: '#06b6d4', surface: '#f8fafc' },
      {
        theme: 'light',
        primaryColor: '#0f172a',
        secondaryColor: '#06b6d4',
        accentColor: '#06b6d4',
        backgroundColor: '#ffffff',
        surfaceColor: '#f8fafc',
        textColor: '#0f172a',
        mutedTextColor: '#64748b',
        borderColor: '#e2e8f0',
        borderRadius: 'soft',
        fontHeading: 'Geist, system-ui, sans-serif',
        fontBody: 'Geist, system-ui, sans-serif',
      },
    ),
    preset(
      'boutique',
      'Boutique',
      'Ink, brass and serif display. Fewer products, more story.',
      { primary: '#292524', secondary: '#a16207', surface: '#faf7f2' },
      {
        theme: 'light',
        primaryColor: '#292524',
        secondaryColor: '#a16207',
        accentColor: '#ca8a04',
        backgroundColor: '#faf7f2',
        surfaceColor: '#f2ece2',
        textColor: '#1c1917',
        mutedTextColor: '#78716c',
        borderColor: '#e7e1d8',
        borderRadius: 'soft',
        fontHeading: 'Georgia, Times New Roman, serif',
        fontBody: 'Geist, system-ui, sans-serif',
      },
    ),
    preset(
      'electric',
      'Electric',
      'Saturated indigo and pink. Loud, young, direct.',
      { primary: '#4338ca', secondary: '#ec4899', surface: '#eef2ff' },
      {
        theme: 'light',
        primaryColor: '#4338ca',
        secondaryColor: '#ec4899',
        accentColor: '#ec4899',
        backgroundColor: '#f8fafc',
        surfaceColor: '#eef2ff',
        textColor: '#111827',
        mutedTextColor: '#6b7280',
        borderColor: '#c7d2fe',
        borderRadius: 'pill',
        fontHeading: 'Bricolage Grotesque, system-ui, sans-serif',
        fontBody: 'Inter, system-ui, sans-serif',
      },
    ),
    midnight('E_COMMERCE'),
  ],
  paletteTitle: 'The palette customers browse in',
  paletteHint: 'Checkout fields and payment providers stay in Commerce OS — this is presentation.',
  runtimeSurfaces: [
    'Order history & tracking',
    'Saved addresses',
    'Wishlist',
    'Returns & refunds',
  ],
  templateTitle: 'Open with the storefront that fits',
  templateHint:
    'Catalogue and checkout logic stay in Commerce OS. This chooses the pages you start editing.',
  spine: [
    { id: 'welcome', label: 'Commerce', icon: 'store' },
    { id: 'identity', label: 'Brand', icon: 'sparkles' },
    { id: 'track', label: 'Shape', icon: 'target' },
    { id: 'features', label: 'Surfaces', icon: 'layers' },
    { id: 'operations', label: 'Details', icon: 'scroll' },
    { id: 'template', label: 'Template', icon: 'images' },
    { id: 'style', label: 'Palette', icon: 'palette' },
    { id: 'review', label: 'Review', icon: 'badge-check' },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// PARTNER
// ═════════════════════════════════════════════════════════════════════════════

const PARTNER_SHAPES: FlowFeature[] = [
  { key: 'accreditation', label: 'Accreditation', description: 'Tiered certification levels.', icon: 'shield-check' },
  { key: 'training', label: 'Training', description: 'Partner academies and resources.', icon: 'book-open' },
  { key: 'referrals', label: 'Referrals', description: 'Lead routing and tracking.', icon: 'network' },
  { key: 'marketplace', label: 'Marketplace', description: 'Co-sell listings.', icon: 'building' },
  { key: 'support', label: 'Partner support', description: 'Help desk with SLAs.', icon: 'heartbeat' },
  { key: 'events', label: 'Events', description: 'Partner summits and webinars.', icon: 'megaphone' },
];

export const PARTNER_FLOW: ModeFlow = {
  key: 'PARTNER',
  icon: 'handshake',
  osName: 'Partner OS',
  splashMotif: 'network',
  accent: { primary: '#1d4ed8', secondary: '#0ea5e9', surface: '#eff6ff' },
  splashLines: [
    'Shaping the partner journey',
    'Dressing directory & applications',
    'Binding partner surfaces',
    'Launching your studio',
  ],
  brandTitle: 'Welcome to Partner OS',
  brandTagline: 'shows prospective partners who you are before they apply — directory and applications stay wired to the partner service.',
  trackTitle: 'What kind of network is this?',
  trackDescription: 'The network shape decides which partner surfaces appear.',
  tracks: [
    {
      id: 'consultancy',
      label: 'Consultancy network',
      description: 'Certified experts delivering engagements.',
      icon: 'lightbulb',
      accent: { primary: '#0f766e', secondary: '#f59e0b' },
      features: ['accreditation', 'training', 'referrals'].map((k) => pickFeature(PARTNER_SHAPES, [k])[0]!),
    },
    {
      id: 'reseller',
      label: 'Reseller / channel',
      description: 'Tiered resellers with pricing bands.',
      icon: 'network',
      accent: { primary: '#0ea5e9', secondary: '#22c55e' },
      features: ['referrals', 'marketplace', 'support'].map((k) => pickFeature(PARTNER_SHAPES, [k])[0]!),
    },
    {
      id: 'franchise',
      label: 'Franchise',
      description: 'Local operators under one brand.',
      icon: 'building',
      accent: { primary: '#1d4ed8', secondary: '#fbbf24' },
      features: ['accreditation', 'training', 'support'].map((k) => pickFeature(PARTNER_SHAPES, [k])[0]!),
    },
    {
      id: 'ngo-alliance',
      label: 'NGO alliance',
      description: 'Members delivering a shared programme.',
      icon: 'handshake',
      accent: { primary: '#7c3aed', secondary: '#22d3ee' },
      features: ['accreditation', 'training', 'events'].map((k) => pickFeature(PARTNER_SHAPES, [k])[0]!),
    },
  ],
  operationalTitle: 'How the network presents itself',
  operationalFields: [
    {
      key: 'contactEmail',
      label: 'Partnerships email',
      type: 'email',
      placeholder: 'partners@network.example',
    },
    {
      key: 'tierCount',
      label: 'Partner tiers',
      type: 'select',
      options: [
        { value: '1', label: 'Single tier' },
        { value: '2', label: 'Two tiers' },
        { value: '3', label: 'Three tiers (classic)' },
      ],
    },
  ],
  featuresTitle: 'Which partner surfaces matter most?',
  featuresHint: 'We surface matching panels — nothing new gets built.',
  presets: [
    preset(
      'network',
      'Network blue',
      'Confident blue, crisp borders, professional and open.',
      { primary: '#1d4ed8', secondary: '#0ea5e9', surface: '#f8fafc' },
      {
        theme: 'light',
        primaryColor: '#1d4ed8',
        secondaryColor: '#0ea5e9',
        accentColor: '#0ea5e9',
        backgroundColor: '#ffffff',
        surfaceColor: '#f8fafc',
        textColor: '#0f172a',
        mutedTextColor: '#64748b',
        borderColor: '#dbeafe',
        borderRadius: 'soft',
        fontHeading: 'Geist, system-ui, sans-serif',
        fontBody: 'Geist, system-ui, sans-serif',
      },
    ),
    paper(),
    midnight('PARTNER'),
  ],
  paletteTitle: 'The palette partners apply under',
  paletteHint: 'Application data and tier logic stay in Partner OS — this is the presentation layer.',
  runtimeSurfaces: [
    'Partner directory',
    'Application review status',
  ],
  templateTitle: 'Start the network with a directory you can fill',
  templateHint:
    'Applications and tier logic stay in Partner OS. This chooses the pages your partners land on.',
  spine: [
    { id: 'welcome', label: 'Partner OS', icon: 'handshake' },
    { id: 'identity', label: 'Brand', icon: 'sparkles' },
    { id: 'track', label: 'Network', icon: 'target' },
    { id: 'features', label: 'Surfaces', icon: 'layers' },
    { id: 'operations', label: 'Details', icon: 'scroll' },
    { id: 'template', label: 'Template', icon: 'images' },
    { id: 'style', label: 'Palette', icon: 'palette' },
    { id: 'review', label: 'Review', icon: 'badge-check' },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// GENERAL
// ═════════════════════════════════════════════════════════════════════════════

const GENERAL_SHAPES: FlowFeature[] = [
  { key: 'blog', label: 'Editorial / blog', description: 'Long-form content with authors.', icon: 'book-open' },
  { key: 'portfolio', label: 'Portfolio', description: 'Case studies and galleries.', icon: 'library' },
  { key: 'docs', label: 'Documentation', description: 'Product docs and guides.', icon: 'book-open' },
  { key: 'community', label: 'Community', description: 'Forum, updates, changelog.', icon: 'users' },
  { key: 'finance', label: 'Investor / finance', description: 'Reports and statements.', icon: 'hand-coins' },
];

export const GENERAL_FLOW: ModeFlow = {
  key: 'GENERAL',
  icon: 'sparkles',
  osName: 'Workspace',
  splashMotif: 'constellation',
  accent: { primary: '#4f46e5', secondary: '#06b6d4', surface: '#eef2ff' },
  splashLines: [
    'Shaping the site',
    'Dressing marketing pages',
    'Binding form actions safely',
    'Launching your studio',
  ],
  brandTitle: 'Welcome to the Workspace',
  brandTagline: 'gives your organisation a portal that feels exactly like you — the forms and integrations stay wired to the SDK gateway.',
  trackTitle: 'What kind of site is this?',
  trackDescription: 'The shape decides which pages surface and how they read.',
  tracks: [
    {
      id: 'agency',
      label: 'Agency / studio',
      description: 'Services-led with case studies.',
      icon: 'lightbulb',
      accent: { primary: '#4f46e5', secondary: '#22d3ee' },
      features: ['portfolio', 'blog'].map((k) => pickFeature(GENERAL_SHAPES, [k])[0]!),
    },
    {
      id: 'saas',
      label: 'SaaS / product',
      description: 'Feature-led with docs and pricing.',
      icon: 'monitor',
      accent: { primary: '#0ea5e9', secondary: '#a855f7' },
      features: ['docs', 'blog'].map((k) => pickFeature(GENERAL_SHAPES, [k])[0]!),
    },
    {
      id: 'consultant',
      label: 'Consultant / personal',
      description: 'Thought leadership and bookings.',
      icon: 'users',
      accent: { primary: '#292524', secondary: '#b45309' },
      features: ['blog', 'portfolio'].map((k) => pickFeature(GENERAL_SHAPES, [k])[0]!),
    },
    {
      id: 'community',
      label: 'Community / non-profit-lite',
      description: 'Members, events, updates.',
      icon: 'home',
      accent: { primary: '#15803d', secondary: '#84cc16' },
      features: ['community', 'blog'].map((k) => pickFeature(GENERAL_SHAPES, [k])[0]!),
    },
    {
      id: 'corporate',
      label: 'Corporate',
      description: 'Investors, careers, compliance.',
      icon: 'building',
      accent: { primary: '#1e3a8a', secondary: '#64748b' },
      features: ['finance', 'docs'].map((k) => pickFeature(GENERAL_SHAPES, [k])[0]!),
    },
  ],
  operationalTitle: 'How your site presents itself',
  operationalFields: [
    {
      key: 'contactEmail',
      label: 'Contact email',
      type: 'email',
      placeholder: 'hello@company.example',
    },
    {
      key: 'locale',
      label: 'Primary locale',
      type: 'select',
      options: [
        { value: 'en', label: 'English' },
        { value: 'fr', label: 'Français' },
        { value: 'es', label: 'Español' },
        { value: 'ar', label: 'العربية (RTL)' },
      ],
    },
  ],
  featuresTitle: 'Which content surfaces should shine?',
  featuresHint: 'We surface matching edit panels — nothing new gets built.',
  presets: [
    preset(
      'mono',
      'Modern minimal',
      'Near-black ink, cyan accent, generous whitespace.',
      { primary: '#0f172a', secondary: '#06b6d4', surface: '#f8fafc' },
      {
        theme: 'light',
        primaryColor: '#0f172a',
        secondaryColor: '#06b6d4',
        accentColor: '#06b6d4',
        backgroundColor: '#ffffff',
        surfaceColor: '#f8fafc',
        textColor: '#0f172a',
        mutedTextColor: '#64748b',
        borderColor: '#e2e8f0',
        borderRadius: 'soft',
        fontHeading: 'Geist, system-ui, sans-serif',
        fontBody: 'Geist, system-ui, sans-serif',
      },
    ),
    paper(),
    preset(
      'electric',
      'Electric',
      'Indigo and pink. Product-launch energy.',
      { primary: '#4338ca', secondary: '#ec4899', surface: '#eef2ff' },
      {
        theme: 'light',
        primaryColor: '#4338ca',
        secondaryColor: '#ec4899',
        accentColor: '#ec4899',
        backgroundColor: '#f8fafc',
        surfaceColor: '#eef2ff',
        textColor: '#111827',
        mutedTextColor: '#6b7280',
        borderColor: '#c7d2fe',
        borderRadius: 'pill',
        fontHeading: 'Bricolage Grotesque, system-ui, sans-serif',
        fontBody: 'Inter, system-ui, sans-serif',
      },
    ),
    midnight('GENERAL'),
  ],
  paletteTitle: 'The palette every page inherits',
  paletteHint: 'These become CSS variables on the public site.',
  runtimeSurfaces: [],
  templateTitle: 'Open with a page set you can rewrite',
  templateHint:
    'Installing a template copies its document into your draft. Nothing is published until you say so.',
  spine: [
    { id: 'welcome', label: 'Workspace', icon: 'sparkles' },
    { id: 'identity', label: 'Brand', icon: 'sparkles' },
    { id: 'track', label: 'Shape', icon: 'target' },
    { id: 'features', label: 'Surfaces', icon: 'layers' },
    { id: 'operations', label: 'Details', icon: 'scroll' },
    { id: 'template', label: 'Template', icon: 'images' },
    { id: 'style', label: 'Palette', icon: 'palette' },
    { id: 'review', label: 'Review', icon: 'badge-check' },
  ],
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const MODE_FLOWS: Record<WorkspaceMode, ModeFlow> = {
  EDUCATION: EDUCATION_FLOW,
  NON_PROFIT: NON_PROFIT_FLOW,
  E_COMMERCE: E_COMMERCE_FLOW,
  GENERAL: GENERAL_FLOW,
  PARTNER: PARTNER_FLOW,
};

export function getModeFlow(mode: WorkspaceMode): ModeFlow {
  return MODE_FLOWS[mode] ?? MODE_FLOWS.GENERAL;
}

// ─── Steps ───────────────────────────────────────────────────────────────────

/** Wizard step definition — the graph is a per-mode spine with branchy cards. */
export type StepId =
  | 'welcome'
  | 'identity'
  | 'origin'
  | 'track'
  | 'levels'
  | 'features'
  | 'credentials'
  | 'operations'
  | 'template'
  | 'style'
  | 'review';

/**
 * The spine, narrowed to what this client is actually being asked.
 *
 * EduOS can show eleven cards and NGO OS eight; an online academy never sees
 * the register card. Because the list is derived, the progress spine and the
 * [Continue] target can never disagree with the answers given so far.
 */
export function resolveSteps(
  flow: ModeFlow,
  origin: FlowOriginOption | null,
  track: FlowTrack | null,
): StepId[] {
  return flow.spine
    .map((entry) => entry.id)
    .filter((id) => {
      if (id === 'origin') return Boolean(flow.origin);
      if (id === 'credentials') return Boolean(origin?.fields?.length);
      if (id === 'levels') return Boolean(track?.children?.length);
      if (id === 'features') return Boolean(track?.features?.length);
      return true;
    });
}

export function spineFor(
  flow: ModeFlow,
  steps: StepId[],
): { id: StepId; label: string; icon: FlowIcon }[] {
  return steps.map((id) => {
    const entry = flow.spine.find((candidate) => candidate.id === id);
    return entry ?? { id, label: id, icon: flow.icon };
  });
}

// ─── Reading the graph ───────────────────────────────────────────────────────

export function findOrigin(flow: ModeFlow, id: string | null): FlowOriginOption | null {
  if (!flow.origin || !id) return null;
  return flow.origin.options.find((option) => option.id === id) ?? null;
}

export function findTrack(flow: ModeFlow, id: string | null): FlowTrack | null {
  if (!id) return null;
  return flow.tracks.find((candidate) => candidate.id === id) ?? null;
}

/** The shelf offered by an origin, in the order the origin lists it. */
export function tracksForOrigin(flow: ModeFlow, origin: FlowOriginOption | null): FlowTrack[] {
  if (!origin?.tracks) return flow.tracks;
  return origin.tracks
    .map((id) => flow.tracks.find((track) => track.id === id))
    .filter((track): track is FlowTrack => Boolean(track));
}

/** Labels and descriptions for a track's `children` keys. */
export function childOptionsFor(
  flow: ModeFlow,
  track: FlowTrack,
): { value: string; label: string; description?: string }[] {
  const catalog = flow.childrenCatalog ?? {};
  return (track.children ?? [])
    .map((childKey) => catalog[childKey])
    .filter((entry): entry is { value: string; label: string; description?: string } =>
      Boolean(entry),
    );
}

/**
 * The detail card's fields: the origin's own questions first (a school is not
 * an academy), then whatever the track adds. Keys are de-duplicated because
 * two levels of the graph can legitimately ask about the same token.
 */
export function detailFieldsFor(
  flow: ModeFlow,
  origin: FlowOriginOption | null,
  track: FlowTrack | null,
): FlowField[] {
  const base = origin?.operationalFields ?? flow.operationalFields;
  const extra = track?.fields ?? [];
  const seen = new Set<string>();
  return [...base, ...extra].filter((field) => {
    if (seen.has(field.key)) return false;
    seen.add(field.key);
    return true;
  });
}

export function operationalTitleFor(flow: ModeFlow, origin: FlowOriginOption | null): string {
  return origin?.operationalTitle ?? flow.operationalTitle;
}

/** Tiles switched on for this origin — the client still gets to uncheck them. */
export function recommendedFeatureKeys(
  origin: FlowOriginOption | null,
  track: FlowTrack | null,
): string[] {
  const pool = new Set((track?.features ?? []).map((feature) => feature.key));
  return (origin?.recommends ?? []).filter((key) => pool.has(key));
}

/** Which template keys the showcase should float to the front. */
export function preferredTemplateKeys(
  origin: FlowOriginOption | null,
  track: FlowTrack | null,
): string[] {
  return [...(track?.templateKeys ?? []), ...(origin?.templateKeys ?? [])];
}

export function identityExamplesFor(
  flow: ModeFlow,
  origin: FlowOriginOption | null,
): { name: string; tagline: string } {
  return (
    origin?.examples ?? {
      name: 'Your organisation',
      tagline: 'Say what you do, in the voice your audience already trusts.',
    }
  );
}

// ─── Persistence keys ────────────────────────────────────────────────────────

/**
 * The wizard's own answers ride in the open token map, so a refresh (or a
 * second device) can put the client back on the card they were reading. Keys
 * stay inside the backend's token charset.
 */
export function setupTokenKey(base: string): string {
  return `setup${base}`.replace(/[^a-zA-Z0-9]/g, '');
}

export const SETUP_TOKENS = {
  origin: setupTokenKey('Origin'),
  track: setupTokenKey('Track'),
  levels: (trackId: string) => setupTokenKey(`Track_${trackId}_Levels`),
  features: (trackId: string) => setupTokenKey(`Track_${trackId}_Features`),
  template: setupTokenKey('TemplateChosen'),
  paletteSource: setupTokenKey('PaletteSource'),
};

/** Icon names are strings; features above may hold a filler placeholder. */
export function isFlowIcon(value: unknown): value is FlowIcon {
  return typeof value === 'string';
}
