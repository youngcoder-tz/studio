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
// wizard maps names to lucide components in one place (MODE_ICONS).

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
  | 'building';

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
}

export interface FlowFeature {
  key: string;
  label: string;
  description: string;
  icon: FlowIcon;
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
  accent: { primary: string; secondary: string; surface: string };
  /** Splash script: short lines the loader narrates while it warms up. */
  splashLines: string[];
  /** Hero copy on card 1. */
  brandTitle: string;
  brandTagline: string;
  /** The "what kind of X" question. */
  trackTitle: string;
  trackDescription: string;
  tracks: FlowTrack[];
  /** Label for the children refinement card (e.g. "Levels served"). */
  childFieldLabel?: string;
  childFieldHint?: string;
  /** Define 2–3 levels of child keys per selected track (empty = skip card). */
  childrenCatalog?: Record<string, { value: string; label: string; description?: string }[]>;
  /** Operational questions, in presentation order. */
  operationalTitle: string;
  operationalFields: FlowField[];
  /** Feature card settings */
  featuresTitle?: string;
  featuresHint?: string;
  /** Style card settings */
  presets: FlowPreset[];
  paletteTitle: string;
  paletteHint: string;
  /** Pages the runtime will mount for this mode (displayed at review). */
  runtimeSurfaces: string[];
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

// ═════════════════════════════════════════════════════════════════════════════
// EDUCATION
// ═════════════════════════════════════════════════════════════════════════════

const EDU_LEVELS = [
  { value: 'preschool', label: 'Preschool / Nursery', description: 'Ages 3–5, play led' },
  { value: 'lower-primary', label: 'Lower primary', description: 'Grades 1–3' },
  { value: 'upper-primary', label: 'Upper primary', description: 'Grades 4–6' },
  { value: 'junior-secondary', label: 'Junior secondary', description: 'Grades 7–9' },
  { value: 'senior-secondary', label: 'Senior secondary', description: 'Grades 10–12' },
  { value: 'tertiary', label: 'Tertiary', description: 'Diploma & degree' },
];

const EDU_CERT_FIELDS: FlowField[] = [
  {
    key: 'certificateName',
    label: 'Certificate title',
    type: 'text',
    placeholder: 'Certificate of Completion',
  },
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

const EDU_FEATURES: FlowFeature[] = [
  { key: 'resultsOnline', label: 'Online results', description: 'Students view grades the day they publish.', icon: 'monitor' },
  { key: 'feeStatements', label: 'Fee statements', description: 'Per-term invoices with instalments.', icon: 'hand-coins' },
  { key: 'timetable', label: 'Timetables', description: 'Class and room schedules, calendar feeds.', icon: 'book-open' },
  { key: 'staffDirectory', label: 'Staff directory', description: 'Protected profiles with roles and rooms.', icon: 'users' },
  { key: 'admissions', label: 'Admissions portal', description: 'Public steps plus enquiry routes.', icon: 'school' },
  { key: 'library', label: 'Library card', description: 'Catalogue plus borrowed-item renewals.', icon: 'library' },
  { key: 'transport', label: 'Transport', description: 'Routes, stops, driver contacts.', icon: 'bus' },
  { key: 'meals', label: 'Meals menu', description: 'Weekly menu and dietary flags.', icon: 'utensils' },
];

export const EDUCATION_FLOW: ModeFlow = {
  key: 'EDUCATION',
  icon: 'graduation',
  accent: { primary: '#4f46e5', secondary: '#22d3ee', surface: '#eef2ff' },
  splashLines: [
    'Mapping campus surfaces',
    'Dressing EduOS contract pages',
    'Wiring results & fees safely',
    'Launching your studio',
  ],
  brandTitle: 'Welcome to EduOS',
  brandTagline: 'gives your school a living portal — results, fees and timetables stay wired to the systems that already run them.',
  trackTitle: 'What kind of school is this?',
  trackDescription: 'Pick the closest fit — each track tunes which levels, features and operational fields appear next.',
  tracks: [
    {
      id: 'elearning',
      label: 'eLearning platform',
      description: 'Courses, cohorts and certificates — no campus timetable.',
      icon: 'monitor',
      accent: { primary: '#4f46e5', secondary: '#22d3ee' },
      features: ['certificates', 'liveTutoring', 'progressTracking', 'cohorts'].map(
        (key) => pickFeature(EDU_FEATURES, [key])[0]!,
      ),
      fields: EDU_CERT_FIELDS,
    },
    {
      id: 'primary',
      label: 'Primary school',
      description: 'Young learners, warm guardians, friendly reporting.',
      icon: 'school',
      accent: { primary: '#0ea5e9', secondary: '#22c55e' },
      children: EDU_LEVELS.slice(0, 4).map((l) => l.value),
      features: ['timetable', 'feeStatements', 'meals', 'transport'].map(
        (key) => pickFeature(EDU_FEATURES, [key])[0]!,
      ),
    },
    {
      id: 'secondary',
      label: 'Secondary school',
      description: 'Exams, results, and a strong house identity.',
      icon: 'book-open',
      accent: { primary: '#7c3aed', secondary: '#f59e0b' },
      children: EDU_LEVELS.slice(3, 5).map((l) => l.value),
      features: ['resultsOnline', 'feeStatements', 'timetable', 'staffDirectory'].map(
        (key) => pickFeature(EDU_FEATURES, [key])[0]!,
      ),
      fields: EDU_TIMETABLE_FIELDS,
    },
    {
      id: 'k12',
      label: 'K–12 unified',
      description: 'All levels on one campus, one report card engine.',
      icon: 'university',
      accent: { primary: '#2563eb', secondary: '#10b981' },
      children: EDU_LEVELS.slice(0, 5).map((l) => l.value),
      features: EDU_FEATURES.slice(0, 6),
    },
    {
      id: 'higher-ed',
      label: 'College / university',
      description: 'Departments, transcripts, and module enrolment.',
      icon: 'university',
      accent: { primary: '#1d4ed8', secondary: '#a78bfa' },
      children: [EDU_LEVELS[5]].map((l) => l.value),
      features: ['resultsOnline', 'staffDirectory', 'library', 'admissions'].map(
        (key) => pickFeature(EDU_FEATURES, [key])[0]!,
      ),
    },
    {
      id: 'vocational',
      label: 'Vocational / TVET',
      description: 'Trades, practicals and industry placements.',
      icon: 'wrench',
      accent: { primary: '#ea580c', secondary: '#22d3ee' },
      features: ['timetable', 'staffDirectory', 'admissions'].map(
        (key) => pickFeature(EDU_FEATURES, [key])[0]!,
      ),
    },
    {
      id: 'boarding',
      label: 'Boarding school',
      description: 'Hostel, houses, meals and transport all day-long.',
      icon: 'bed',
      accent: { primary: '#64748b', secondary: '#38bdf8' },
      children: ['junior-secondary', 'senior-secondary'].map((v) => v),
      features: ['meals', 'transport', 'staffDirectory', 'feeStatements'].map(
        (key) => pickFeature(EDU_FEATURES, [key])[0]!,
      ),
      fields: EDU_HOSTEL_FIELDS,
    },
    {
      id: 'special-needs',
      label: 'Inclusive / special needs',
      description: 'Individual plans and therapy tracking.',
      icon: 'heartbeat',
      accent: { primary: '#ec4899', secondary: '#22d3ee' },
      features: ['timetable', 'staffDirectory', 'library'].map(
        (key) => pickFeature(EDU_FEATURES, [key])[0]!,
      ),
    },
    {
      id: 'international',
      label: 'International school',
      description: 'IB / IGCSE routes, multilingual, global intake.',
      icon: 'globe',
      accent: { primary: '#06b6d4', secondary: '#a855f7' },
      children: EDU_LEVELS.slice(0, 5).map((l) => l.value),
      features: ['admissions', 'timetable', 'feeStatements', 'transport'].map(
        (key) => pickFeature(EDU_FEATURES, [key])[0]!,
      ),
      fields: [
        {
          key: 'curriculumModel',
          label: 'Curriculum',
          type: 'select',
          options: [
            { value: 'ib', label: 'IB (PYP / MYP / DP)' },
            { value: 'igcse', label: ' Cambridge IGCSE / A-Level' },
            { value: 'mixed', label: 'Mixed / blend' },
          ],
        },
      ],
    },
    {
      id: 'madrasah',
      label: 'Madrasah / Islamic',
      description: 'Quran, Arabic and Islamic studies alongside academics.',
      icon: 'moon',
      accent: { primary: '#22c55e', secondary: '#f59e0b' },
      children: EDU_LEVELS.slice(0, 5).map((l) => l.value),
      features: ['timetable', 'staffDirectory', 'library'].map(
        (key) => pickFeature(EDU_FEATURES, [key])[0]!,
      ),
    },
  ],
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

/** Wizard step definition — the graph is a linear spine with branchy cards. */
export type StepId = 'welcome' | 'identity' | 'track' | 'levels' | 'features' | 'operations' | 'style' | 'review';

export const STEP_ORDER: StepId[] = [
  'welcome',
  'identity',
  'track',
  'levels',
  'features',
  'operations',
  'style',
  'review',
];

/** Icon names are strings; features above may hold a filler placeholder. */
export function isFlowIcon(value: unknown): value is FlowIcon {
  return typeof value === 'string';
}
