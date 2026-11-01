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

import type { GlobalTokens, TemplateAccent, WorkspaceMode } from "./contract";

// ─── Icon vocabulary ─────────────────────────────────────────────────────────

export type FlowIcon =
  | "graduation"
  | "heart"
  | "store"
  | "sparkles"
  | "handshake"
  | "monitor"
  | "school"
  | "book-open"
  | "university"
  | "wrench"
  | "home"
  | "globe"
  | "moon"
  | "puzzle"
  | "bed"
  | "users"
  | "megaphone"
  | "tree"
  | "network"
  | "shield-check"
  | "target"
  | "lightbulb"
  | "languages"
  | "library"
  | "bus"
  | "utensils"
  | "heartbeat"
  | "hand-coins"
  | "hand-heart"
  | "dove"
  | "building"
  | "newspaper"
  | "plane"
  | "flower"
  | "baby"
  | "sprout"
  | "coins"
  | "access"
  | "scale"
  | "tent"
  | "paw"
  | "laptop"
  | "dumbbell"
  | "sunrise"
  | "cap"
  | "palette"
  | "layers"
  | "slides"
  | "images"
  | "award"
  | "calendar"
  | "identity"
  | "scroll"
  | "compass"
  | "badge-check"
  | "contrast"
  | "sliders"
  | "repeat"
  | "type";

export type SplashMotif =
  | "campus"
  | "pulse"
  | "ledger"
  | "network"
  | "constellation";

export type FlowFieldType =
  | "text"
  | "textarea"
  | "url"
  | "color"
  | "select"
  | "email"
  | "tel";

export interface FlowField {
  key: string;
  label: string;
  hint?: string;
  type: FlowFieldType;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  options?: { value: string; label: string }[];
}

export interface FlowTrack {
  id: string;
  label: string;
  description: string;
  icon: FlowIcon;
  accent: { primary: string; secondary: string };
  features?: FlowFeature[];
  fields?: FlowField[];
  templateKeys?: string[];
  search?: string[];
}

export interface FlowFeature {
  key: string;
  label: string;
  description: string;
  icon: FlowIcon;
}

export interface FlowOriginOption {
  id: string;
  label: string;
  description: string;
  icon: FlowIcon;
  accent: { primary: string; secondary: string };
  tracks?: string[];
  fields?: FlowField[];
  credentialsTitle?: string;
  credentialsHint?: string;
  recommends?: string[];
  templateKeys?: string[];
  trackTitle?: string;
  trackDescription?: string;
  operationalTitle?: string;
  operationalFields?: FlowField[];
  examples?: { name: string; tagline: string };
}

export interface FlowOrigin {
  title: string;
  description: string;
  note?: string;
  options: FlowOriginOption[];
}

export interface FlowPreset {
  key: string;
  label: string;
  description: string;
  accent: TemplateAccent;
  tokens: GlobalTokens;
}

export interface ModeFlow {
  key: WorkspaceMode;
  icon: FlowIcon;
  osName: string;
  splashMotif: SplashMotif;
  accent: { primary: string; secondary: string; surface: string };
  splashLines: string[];
  brandTitle: string;
  brandTagline: string;
  origin?: FlowOrigin;
  trackTitle: string;
  trackDescription: string;
  tracks: FlowTrack[];
  operationalTitle?: string;
  operationalFields?: FlowField[];
  featuresTitle?: string;
  featuresHint?: string;
  templateTitle?: string;
  templateHint?: string;
  presets: FlowPreset[];
  paletteTitle: string;
  paletteHint: string;
  runtimeSurfaces: string[];
  spine: { id: StepId; label: string; icon: FlowIcon }[];
}

const preset = (
  key: string,
  label: string,
  description: string,
  accent: TemplateAccent,
  tokens: GlobalTokens,
): FlowPreset => ({ key, label, description, accent, tokens });

function midnight(mode: WorkspaceMode): FlowPreset {
  const trio: Record<WorkspaceMode, [string, string, string]> = {
    EDUCATION: ["#7dd3fc", "#c4b5fd", "#fbbf24"],
    NON_PROFIT: ["#fdba74", "#fca5a5", "#fde047"],
    E_COMMERCE: ["#67e8f9", "#a5b4fc", "#fda4af"],
    GENERAL: ["#a5b4fc", "#67e8f9", "#fbbf24"],
    PARTNER: ["#93c5fd", "#c4b5fd", "#fcd34d"],
  };
  const [primary, secondary, accent] = trio[mode];
  return preset(
    "midnight",
    "Midnight",
    "Deep navy surfaces, luminous accents. Premium and evening-first.",
    { primary: "#0b1120", secondary: accent, surface: "#0f172a" },
    {
      theme: "dark",
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      backgroundColor: "#080b14",
      surfaceColor: "#111827",
      textColor: "#e5e7eb",
      mutedTextColor: "#94a3b8",
      borderColor: "#25324a",
      borderRadius: "rounded",
      fontHeading: "Geist, system-ui, sans-serif",
      fontBody: "Geist, system-ui, sans-serif",
    },
  );
}

function paper(): FlowPreset {
  return preset(
    "paper",
    "Warm paper",
    "Off-white paper, ink type, one confident accent. Editorial and calm.",
    { primary: "#292524", secondary: "#b45309", surface: "#faf7f2" },
    {
      theme: "light",
      primaryColor: "#292524",
      secondaryColor: "#b45309",
      accentColor: "#b45309",
      backgroundColor: "#faf7f2",
      surfaceColor: "#f2ece2",
      textColor: "#1c1917",
      mutedTextColor: "#78716c",
      borderColor: "#e7e1d8",
      borderRadius: "soft",
      fontHeading: "Georgia, Times New Roman, serif",
      fontBody: "Georgia, Times New Roman, serif",
    },
  );
}

function pickFeature(pool: FlowFeature[], keys: string[]): FlowFeature[] {
  return keys
    .map((key) => pool.find((f) => f.key === key))
    .filter((f): f is FlowFeature => Boolean(f));
}

function tiles(pool: FlowFeature[], keys: string[]): FlowFeature[] {
  return pickFeature(pool, keys);
}

// ═════════════════════════════════════════════════════════════════════════════
// EDUCATION (EduOS ERP)
// ═════════════════════════════════════════════════════════════════════════════

const EDU_INSTITUTION_FIELDS: FlowField[] = [
  {
    key: "institutionType",
    label: "What the register calls you",
    type: "select",
    options: [
      { value: "public", label: "Public / government" },
      { value: "private", label: "Private" },
      { value: "faith", label: "Faith-based" },
      { value: "aided", label: "Government-aided" },
    ],
  },
  {
    key: "registrationAuthority",
    label: "Registering or accrediting body",
    type: "select",
    options: [
      { value: "ministry", label: "Ministry / department of education" },
      { value: "county", label: "County or state board" },
      { value: "national", label: "National accreditor" },
      { value: "international", label: "International body (CIS, WASC, IB)" },
      { value: "other", label: "Something else" },
    ],
  },
  {
    key: "registrationNumber",
    label: "Registration / code number",
    type: "text",
    hint: "Exactly as printed on your certificate. Shown on admissions pages only.",
    placeholder: "e.g. 215/10/401",
  },
  {
    key: "foundedYear",
    label: "Year founded",
    type: "text",
    placeholder: "1984",
    maxLength: 4,
  },
  {
    key: "campusSetting",
    label: "Campus",
    type: "select",
    options: [
      { value: "urban", label: "Urban" },
      { value: "suburban", label: "Suburban" },
      { value: "rural", label: "Rural" },
      { value: "multi", label: "Multi-campus" },
    ],
  },
];

const EDU_FEATURES: FlowFeature[] = [
  {
    key: "resultsOnline",
    label: "Online results",
    description: "Students view grades the day they publish.",
    icon: "monitor",
  },
  {
    key: "feeStatements",
    label: "Fee statements",
    description: "Per-term invoices with instalments.",
    icon: "hand-coins",
  },
  {
    key: "timetable",
    label: "Timetables",
    description: "Class and room schedules, calendar feeds.",
    icon: "calendar",
  },
  {
    key: "staffDirectory",
    label: "Staff directory",
    description: "Protected profiles with roles and rooms.",
    icon: "users",
  },
  {
    key: "admissions",
    label: "Admissions portal",
    description: "Public steps plus enquiry routes.",
    icon: "school",
  },
  {
    key: "library",
    label: "Library card",
    description: "Catalogue plus borrowed-item renewals.",
    icon: "library",
  },
  {
    key: "transport",
    label: "Transport",
    description: "Routes, stops, driver contacts.",
    icon: "bus",
  },
  {
    key: "meals",
    label: "Meals menu",
    description: "Weekly menu and dietary flags.",
    icon: "utensils",
  },
  {
    key: "certificates",
    label: "Certificates",
    description: "Signed, verifiable completion slips.",
    icon: "award",
  },
  {
    key: "liveTutoring",
    label: "Live classes",
    description: "Streaming sessions with replay.",
    icon: "slides",
  },
  {
    key: "progressTracking",
    label: "Progress tracking",
    description: "Per-learner pace, streaks and gaps.",
    icon: "target",
  },
  {
    key: "cohorts",
    label: "Cohorts",
    description: "Date-driven groups with shared milestones.",
    icon: "users",
  },
  {
    key: "courseCatalog",
    label: "Course catalogue",
    description: "Subjects, levels and what each one covers.",
    icon: "layers",
  },
  {
    key: "assessments",
    label: "Assessments",
    description: "Quizzes with instant, explain-the-answer feedback.",
    icon: "badge-check",
  },
  {
    key: "enrolment",
    label: "Online enrolment",
    description: "Self-serve sign-up with a seat count.",
    icon: "compass",
  },
  {
    key: "payments",
    label: "Course payments",
    description: "Per-course or per-cohort invoicing.",
    icon: "hand-coins",
  },
];

export const EDUCATION_FLOW: ModeFlow = {
  key: "EDUCATION",
  icon: "graduation",
  osName: "EduOS",
  splashMotif: "campus",
  accent: { primary: "#4f46e5", secondary: "#22d3ee", surface: "#eef2ff" },
  splashLines: [
    "Opening the EduOS shelf",
    "Mapping campus and cohort surfaces",
    "Dressing results, fees and timetables",
    "Launching your studio",
  ],
  brandTitle: "Welcome to EduOS",
  brandTagline:
    "gives a school, an academy or a learning programme a living portal — results, fees and timetables stay wired to the systems that already run them.",
  origin: {
    title: "First — what is this, exactly?",
    description:
      "EduOS runs three distinct operations. Pick the one that matches reality — a government-registered school, a standalone e-learning platform, or a learning programme led outside the registered-school frame by someone of any kind.",
    note: "This choice strictly routes the EduOS path. It changes which questions follow and which evidence we ask for, without locking features you can enable later.",
    options: [
      {
        id: "institution",
        label: "A registered school, college or institution",
        description:
          "On a government register or accredited by an education body. Has a campus/term calendar and often publishes results/fees.",
        icon: "school",
        accent: { primary: "#1e3a8a", secondary: "#f59e0b" },
        trackTitle: "What kind of institution is it?",
        trackDescription:
          "The type decides which houses, reports and feature pages EduOS dresses first.",
        tracks: [
          "primary",
          "secondary",
          "a-level",
          "k12",
          "boarding",
          "international",
          "madrasah",
          "higher-ed",
          "vocational",
          "special-needs",
          "nursery",
        ],
        fields: EDU_INSTITUTION_FIELDS,
        credentialsTitle: "Required details for a legitimate institution",
        credentialsHint:
          "As printed on your registration/certificate. These appear on admissions/about pages as presentation tokens — EduOS displays them, it never verifies them.",
        recommends: [
          "resultsOnline",
          "feeStatements",
          "timetable",
          "admissions",
        ],
        templateKeys: ["edu-os-enterprise"],
        examples: {
          name: "Riverside Academy",
          tagline: "Learning with purpose, leading with care.",
        },
      },
      {
        id: "online",
        label: "An e-learning platform / online academy",
        description:
          "Courses, cohorts and certificates delivered online. Typically no campus roll, no national results slip.",
        icon: "monitor",
        accent: { primary: "#4f46e5", secondary: "#22d3ee" },
        trackTitle: "What kind of online academy is it?",
        trackDescription:
          "The delivery shape decides which learner surfaces appear — catalogue, cohort calendar, tutoring or corporate training.",
        tracks: [
          "course-library",
          "cohort-academy",
          "exam-prep",
          "tutoring",
          "corporate-training",
          "micro-credentials",
          "language-school",
          "bootcamp-academy",
        ],
        recommends: [
          "certificates",
          "progressTracking",
          "cohorts",
          "courseCatalog",
        ],
        templateKeys: ["edu-os-enterprise"],
        examples: {
          name: "Northstar Learning",
          tagline: "Career skills, taught live and finished on time.",
        },
      },
      {
        id: "programme",
        label: "A learning programme, outside the registered-school route",
        description:
          "Anyone can run learning here — an enterprise training arm, an association, a collective, an independent academy or a public initiative. No campus roll or national results slip is needed; the programme reports to its own learners and funders.",
        icon: "hand-heart",
        accent: { primary: "#0f766e", secondary: "#fbbf24" },
        trackTitle: "What kind of programme is it?",
        trackDescription:
          "Programmes report to funders and learners, so EduOS dresses completion and reach instead of campus machinery.",
        tracks: [
          "open-programme",
          "trainer-network",
          "micro-credentials",
          "community-training",
        ],
        recommends: ["certificates", "progressTracking", "cohorts"],
        templateKeys: ["edu-os-enterprise"],
        examples: {
          name: "Open Skills Initiative",
          tagline: "Free, verified training for health workers on the coast.",
        },
      },
    ],
  },
  trackTitle: "What kind of school is this?",
  trackDescription:
    "Pick the closest fit — each track tunes which feature pages appear next.",
  tracks: [
    {
      id: "primary",
      label: "Primary school",
      description: "Young learners, warm guardians, friendly reporting.",
      icon: "school",
      accent: { primary: "#0ea5e9", secondary: "#22c55e" },
      features: tiles(EDU_FEATURES, [
        "timetable",
        "feeStatements",
        "meals",
        "transport",
      ]),
      search: ["elementary", "young learners", "junior"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "secondary",
      label: "Secondary school (O-Level)",
      description: "Ordinary levels, exams day and a strong house identity.",
      icon: "book-open",
      accent: { primary: "#7c3aed", secondary: "#f59e0b" },
      features: tiles(EDU_FEATURES, [
        "resultsOnline",
        "feeStatements",
        "timetable",
        "staffDirectory",
      ]),
      search: ["high school", "teens", "olevel", "ordinary level", "o-levels"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "a-level",
      label: "High school / A-Level",
      description: "Advanced level subjects leading to university entry.",
      icon: "university",
      accent: { primary: "#4338ca", secondary: "#f59e0b" },
      features: tiles(EDU_FEATURES, [
        "resultsOnline",
        "assessments",
        "enrolment",
        "staffDirectory",
      ]),
      search: [
        "advanced level",
        "alevel",
        "as level",
        "sixth form",
        "hsc",
        "university entry",
      ],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "k12",
      label: "K–12 unified",
      description: "All levels on one campus, one report card engine.",
      icon: "university",
      accent: { primary: "#2563eb", secondary: "#10b981" },
      features: tiles(EDU_FEATURES, [
        "resultsOnline",
        "feeStatements",
        "timetable",
        "staffDirectory",
        "admissions",
        "library",
      ]),
      search: ["all-through", "combined", "full school"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "boarding",
      label: "Boarding school",
      description: "Hostel, houses, meals and transport all day-long.",
      icon: "bed",
      accent: { primary: "#64748b", secondary: "#38bdf8" },
      features: tiles(EDU_FEATURES, [
        "meals",
        "transport",
        "staffDirectory",
        "feeStatements",
      ]),
      search: ["hostel", "dorm", "houses", "residential"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "international",
      label: "International school",
      description: "IB / IGCSE routes, multilingual, global intake.",
      icon: "globe",
      accent: { primary: "#06b6d4", secondary: "#a855f7" },
      features: tiles(EDU_FEATURES, [
        "admissions",
        "timetable",
        "feeStatements",
        "transport",
      ]),
      search: ["ib", "igcse", "cambridge", "ex-pat"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "madrasah",
      label: "Madrasah / Islamic",
      description: "Quran, Arabic and Islamic studies alongside academics.",
      icon: "moon",
      accent: { primary: "#22c55e", secondary: "#f59e0b" },
      features: tiles(EDU_FEATURES, ["timetable", "staffDirectory", "library"]),
      search: ["islamic", "quran", "arabic", "hifz", "muslim"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "higher-ed",
      label: "College / university",
      description: "Departments, transcripts, and module enrolment.",
      icon: "university",
      accent: { primary: "#1d4ed8", secondary: "#a78bfa" },
      features: tiles(EDU_FEATURES, [
        "resultsOnline",
        "staffDirectory",
        "library",
        "admissions",
        "feeStatements",
      ]),
      search: ["college", "degree", "campus", "faculty"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "vocational",
      label: "Vocational / TVET",
      description: "Trades, practicals and industry placements.",
      icon: "wrench",
      accent: { primary: "#ea580c", secondary: "#22d3ee" },
      features: tiles(EDU_FEATURES, [
        "timetable",
        "staffDirectory",
        "admissions",
        "certificates",
      ]),
      search: ["trades", "technical", "apprentice", "artisan"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "special-needs",
      label: "Inclusive / special needs",
      description: "Individual plans and therapy tracking.",
      icon: "heartbeat",
      accent: { primary: "#ec4899", secondary: "#22d3ee" },
      features: tiles(EDU_FEATURES, ["timetable", "staffDirectory", "library"]),
      search: ["sen", "inclusive", "therapy", "autism"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "course-library",
      label: "Self-paced course library",
      description: "A catalogue people join any day, at their own speed.",
      icon: "library",
      accent: { primary: "#4f46e5", secondary: "#22d3ee" },
      features: tiles(EDU_FEATURES, [
        "courseCatalog",
        "assessments",
        "certificates",
        "progressTracking",
        "payments",
      ]),
      search: ["self-paced", "on-demand", "catalogue", "anytime"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "cohort-academy",
      label: "Cohort academy",
      description:
        "Live classes on a calendar, with a tutor and a finish line.",
      icon: "slides",
      accent: { primary: "#7c3aed", secondary: "#fbbf24" },
      features: tiles(EDU_FEATURES, [
        "liveTutoring",
        "cohorts",
        "progressTracking",
        "certificates",
        "enrolment",
      ]),
      search: ["live", "calendar", "finish line"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "exam-prep",
      label: "Exam prep & tuition centre",
      description: "Past papers, drills and predicted grades.",
      icon: "badge-check",
      accent: { primary: "#0ea5e9", secondary: "#f59e0b" },
      features: tiles(EDU_FEATURES, [
        "assessments",
        "liveTutoring",
        "progressTracking",
        "feeStatements",
      ]),
      search: ["tuition centre", "past papers", "mock exams", "cram", "kcse"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "tutoring",
      label: "1-to-1 / small group tutoring",
      description: "Booked sessions, matched tutors, per-learner plans.",
      icon: "users",
      accent: { primary: "#ec4899", secondary: "#38bdf8" },
      features: tiles(EDU_FEATURES, [
        "liveTutoring",
        "enrolment",
        "payments",
        "progressTracking",
      ]),
      search: ["1-on-1", "private tutor", "small group", "mentor"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "corporate-training",
      label: "Corporate & team training",
      description: "Departments, seat licences, completion reporting.",
      icon: "building",
      accent: { primary: "#0f766e", secondary: "#a5b4fc" },
      features: tiles(EDU_FEATURES, [
        "courseCatalog",
        "progressTracking",
        "certificates",
        "assessments",
      ]),
      search: ["workplace", "upskilling", "hr", "onboarding"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "micro-credentials",
      label: "Micro-credentials & badges",
      description: "Short, stackable, verifiable certificates.",
      icon: "award",
      accent: { primary: "#b45309", secondary: "#22d3ee" },
      features: tiles(EDU_FEATURES, [
        "certificates",
        "assessments",
        "courseCatalog",
        "enrolment",
      ]),
      search: ["badges", "stackable", "short course"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "open-programme",
      label: "Open learning programme",
      description: "Anyone can join; completion and reach are what count.",
      icon: "compass",
      accent: { primary: "#0f766e", secondary: "#fbbf24" },
      features: tiles(EDU_FEATURES, [
        "courseCatalog",
        "progressTracking",
        "certificates",
      ]),
      search: ["open enrolment", "funders"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "trainer-network",
      label: "Trainer & practitioner network",
      description: "People trained to deliver the work, then kept current.",
      icon: "network",
      accent: { primary: "#1d4ed8", secondary: "#34d399" },
      features: tiles(EDU_FEATURES, [
        "staffDirectory",
        "liveTutoring",
        "progressTracking",
        "certificates",
      ]),
      search: ["tot", "practitioners"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "community-training",
      label: "Community & outreach classes",
      description: "Sessions run where the people already are.",
      icon: "home",
      accent: { primary: "#15803d", secondary: "#facc15" },
      features: tiles(EDU_FEATURES, [
        "enrolment",
        "cohorts",
        "progressTracking",
      ]),
      search: ["outreach", "evening", "village"],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "nursery",
      label: "Nursery / kindergarten",
      description: "Early years — play, naps and guardian voice notes.",
      icon: "baby",
      accent: { primary: "#db2777", secondary: "#fbbf24" },
      features: tiles(EDU_FEATURES, [
        "timetable",
        "meals",
        "transport",
        "staffDirectory",
      ]),
      search: [
        "ecd",
        "early childhood",
        "pre-school",
        "daycare",
        "playgroup",
        "reception",
      ],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "language-school",
      label: "Language school",
      description: "CEFR levels, placement tests and speaking clubs.",
      icon: "languages",
      accent: { primary: "#0d9488", secondary: "#facc15" },
      features: tiles(EDU_FEATURES, [
        "courseCatalog",
        "assessments",
        "liveTutoring",
        "certificates",
      ]),
      search: [
        "esl",
        "english course",
        "french",
        "swahili",
        "cefr",
        "toefl",
        "ielts",
        "translation",
        "evening classes",
      ],
      templateKeys: ["edu-os-enterprise"],
    },
    {
      id: "bootcamp-academy",
      label: "Bootcamp / intensive academy",
      description: "Full-time sprints with demo days and job prep.",
      icon: "target",
      accent: { primary: "#ea580c", secondary: "#7c3aed" },
      features: tiles(EDU_FEATURES, [
        "liveTutoring",
        "cohorts",
        "certificates",
        "progressTracking",
      ]),
      search: [
        "hackathon",
        "demo day",
        "job placement",
        "accelerator",
        "immersive",
        "career switch",
        "sprint",
      ],
      templateKeys: ["edu-os-enterprise"],
    },
  ],
  featuresTitle: "Which EduOS modules should shine?",
  featuresHint:
    "We surface the matching panels in the Studio so the noisy ones stay out of view — nothing new gets built.",
  presets: [
    preset(
      "campus-blue",
      "Campus blue",
      "Trustworthy navy, warm gold, crisp paper. The default academic palette.",
      { primary: "#1e3a8a", secondary: "#f59e0b", surface: "#f1f5f9" },
      {
        theme: "light",
        primaryColor: "#1e3a8a",
        secondaryColor: "#f59e0b",
        accentColor: "#f59e0b",
        backgroundColor: "#ffffff",
        surfaceColor: "#f1f5f9",
        textColor: "#0f172a",
        mutedTextColor: "#475569",
        borderColor: "#cbd5e1",
        borderRadius: "rounded",
        fontHeading: "Bricolage Grotesque, Georgia, serif",
        fontBody: "Geist, system-ui, sans-serif",
      },
    ),
    midnight("EDUCATION"),
    paper(),
  ],
  paletteTitle: "The palette every page inherits",
  paletteHint:
    "Tune later in the Studio token panel — this is the global starting point.",
  runtimeSurfaces: [
    "Student results & grade history",
    "Fee statements & payment plans",
    "Class timetables",
    "Staff directory",
  ],
  templateTitle: "Your EduOS Enterprise portal",
  templateHint:
    "EduOS ships with one first-class template — the glass enterprise portal. It loads into your draft and the wizard dresses it; your live portal keeps serving whatever is published today.",
  spine: [
    { id: "welcome", label: "EduOS", icon: "graduation" },
    { id: "identity", label: "Brand", icon: "sparkles" },
    { id: "origin", label: "Operation", icon: "compass" },
    { id: "track", label: "Setting", icon: "target" },
    { id: "features", label: "Modules", icon: "lightbulb" },
    { id: "credentials", label: "Register", icon: "identity" },
    { id: "template", label: "Template", icon: "images" },
    { id: "style", label: "Palette", icon: "palette" },
    { id: "review", label: "Review", icon: "badge-check" },
  ],
};

// ═════════════════════════════════════════════════════════════════════════════
// NON-PROFIT (NGO OS)
// ═════════════════════════════════════════════════════════════════════════════

const NGO_CAUSES: FlowFeature[] = [
  {
    key: "cleanWater",
    label: "Clean water",
    description: "Boreholes, filters, sanitation.",
    icon: "heartbeat",
  },
  {
    key: "education",
    label: "Education",
    description: "Scholarships and after-school support.",
    icon: "school",
  },
  {
    key: "healthcare",
    label: "Healthcare",
    description: "Clinics, outreach, maternal care.",
    icon: "heartbeat",
  },
  {
    key: "disaster",
    label: "Emergency relief",
    description: "Rapid response and recovery.",
    icon: "shield-check",
  },
  {
    key: "environment",
    label: "Environment",
    description: "Conservation and rewilding.",
    icon: "tree",
  },
  {
    key: "advocacy",
    label: "Advocacy",
    description: "Policy, research, campaigns.",
    icon: "megaphone",
  },
  {
    key: "community",
    label: "Community",
    description: "Local partnerships and training.",
    icon: "users",
  },
  {
    key: "animals",
    label: "Animal welfare",
    description: "Rescue and care programmes.",
    icon: "dove",
  },
  {
    key: "women",
    label: "Women & girls",
    description: "Safety, leadership and equality.",
    icon: "flower",
  },
  {
    key: "children",
    label: "Children & youth",
    description: "Protection, learning, play.",
    icon: "baby",
  },
  {
    key: "food",
    label: "Food & farming",
    description: "Meals, farms and rural markets.",
    icon: "sprout",
  },
  {
    key: "livelihoods",
    label: "Jobs & livelihoods",
    description: "Savings groups and business skills.",
    icon: "coins",
  },
  {
    key: "media",
    label: "Media & journalism",
    description: "Independent reporting and training.",
    icon: "newspaper",
  },
  {
    key: "tourism",
    label: "Culture & tourism",
    description: "Heritage, crafts and community tours.",
    icon: "plane",
  },
  {
    key: "disability",
    label: "Disability inclusion",
    description: "Assistive access and employment.",
    icon: "access",
  },
  {
    key: "legal",
    label: "Legal aid",
    description: "Counselling and representation.",
    icon: "scale",
  },
  {
    key: "shelter",
    label: "Housing & shelter",
    description: "Homes, camps and rebuilding.",
    icon: "tent",
  },
  {
    key: "wildlife",
    label: "Wildlife protection",
    description: "Anti-poaching and habitat rescue.",
    icon: "paw",
  },
  {
    key: "digital",
    label: "Digital inclusion",
    description: "Computer labs and online safety.",
    icon: "laptop",
  },
  {
    key: "sports",
    label: "Sports development",
    description: "Leagues and life-skills coaching.",
    icon: "dumbbell",
  },
  {
    key: "donations",
    label: "Donations & monthly giving",
    description: "One-off and recurring gifts with receipts.",
    icon: "hand-coins",
  },
  {
    key: "sponsorship",
    label: "Sponsorship",
    description: "Child, scholar and project sponsors.",
    icon: "handshake",
  },
  {
    key: "volunteers",
    label: "Volunteers",
    description: "Sign-ups, shifts and served hours.",
    icon: "users",
  },
  {
    key: "campaigns",
    label: "Fundraising campaigns",
    description: "Goal meters and appeal pages.",
    icon: "megaphone",
  },
  {
    key: "events",
    label: "Events & galas",
    description: "Ticketed walks, dinners and auctions.",
    icon: "calendar",
  },
  {
    key: "grants",
    label: "Grants & funders",
    description: "Proposal pipeline and funder reports.",
    icon: "shield-check",
  },
  {
    key: "inKind",
    label: "In-kind giving",
    description: "Goods drives, logistics and handover.",
    icon: "tent",
  },
  {
    key: "ledger",
    label: "Impact ledger",
    description: "A public money-to-mission trail.",
    icon: "scroll",
  },
];

export const NON_PROFIT_FLOW: ModeFlow = {
  key: "NON_PROFIT",
  icon: "heart",
  osName: "NGO OS",
  splashMotif: "pulse",
  accent: { primary: "#b91c1c", secondary: "#f97316", surface: "#fef2f2" },
  splashLines: [
    "Shaping the giving story",
    "Dressing campaign & impact pages",
    "Wiring donation forms safely",
    "Launching your studio",
  ],
  brandTitle: "Welcome to NGO OS",
  brandTagline:
    "turns your mission into a portal people trust — donation forms and donor walls stay wired to the systems that already process them.",
  trackTitle: "What kind of work does this NGO do?",
  trackDescription:
    "The focus changes which impact pages, campaigns and donor tones appear next.",
  tracks: [
    {
      id: "humanitarian",
      label: "Humanitarian aid",
      description: "Emergency response, logistics and dignity.",
      icon: "hand-heart",
      accent: { primary: "#c2410c", secondary: "#f97316" },
      search: [
        "disaster",
        "emergency",
        "famine",
        "first aid",
        "logistics",
        "crisis",
      ],
      features: [
        "disaster",
        "community",
        "advocacy",
        "donations",
        "volunteers",
        "inKind",
      ].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: "clean-water",
      label: "Water & sanitation",
      description: "Boreholes, wells and hygiene.",
      icon: "heartbeat",
      accent: { primary: "#0891b2", secondary: "#22d3ee" },
      search: ["boreholes", "wells", "sanitation", "toilets", "hygiene"],
      features: [
        "cleanWater",
        "community",
        "education",
        "donations",
        "ledger",
        "sponsorship",
      ].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: "education-charity",
      label: "Education charity",
      description: "Scholarships and school partnerships.",
      icon: "school",
      accent: { primary: "#7c3aed", secondary: "#22d3ee" },
      search: ["scholarship", "schools", "literacy", "tuition"],
      features: [
        "education",
        "community",
        "advocacy",
        "sponsorship",
        "donations",
        "volunteers",
      ].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: "health-charity",
      label: "Health & wellbeing",
      description: "Clinics, screenings and outreach.",
      icon: "heartbeat",
      accent: { primary: "#e11d48", secondary: "#fbbf24" },
      search: ["clinics", "hospitals", "vaccination", "disease"],
      features: [
        "healthcare",
        "community",
        "campaigns",
        "donations",
        "ledger",
      ].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
    {
      id: "environment",
      label: "Environment & climate",
      description: "Rewilding, conservation, and research.",
      icon: "tree",
      accent: { primary: "#15803d", secondary: "#84cc16" },
      search: ["climate", "trees", "rewilding", "planting", "sustainability"],
      features: [
        "environment",
        "advocacy",
        "community",
        "campaigns",
        "ledger",
        "volunteers",
      ].map((k) => pickFeature(NGO_CAUSES, [k])[0]!),
    },
  ],
  featuresTitle: "Which giving surfaces matter most?",
  featuresHint:
    "We order the Studio pages and admin panels around these — nothing new gets built.",
  presets: [
    preset(
      "impact-red",
      "Impact red",
      "Urgent red and orange. Built to convert attention into action.",
      { primary: "#b91c1c", secondary: "#f97316", surface: "#fef2f2" },
      {
        theme: "light",
        primaryColor: "#b91c1c",
        secondaryColor: "#f97316",
        accentColor: "#f97316",
        backgroundColor: "#ffffff",
        surfaceColor: "#fef2f2",
        textColor: "#1c1917",
        mutedTextColor: "#78716c",
        borderColor: "#fecaca",
        borderRadius: "rounded",
      },
    ),
    midnight("NON_PROFIT"),
    paper(),
  ],
  paletteTitle: "The palette donors see",
  paletteHint:
    "Campaign tokens and receipt colours stay in NGO OS — this is the presentation layer.",
  runtimeSurfaces: [
    "Campaign progress ledger",
    "Impact statistics",
    "Donor wall (anonymity respected)",
    "Volunteer sign-ups",
  ],
  templateTitle: "Choose the giving experience to open with",
  templateHint:
    "A template is data. Installing one fills your draft; the live site is untouched until you publish.",
  spine: [
    { id: "welcome", label: "NGO OS", icon: "heart" },
    { id: "identity", label: "Brand", icon: "sparkles" },
    { id: "track", label: "Cause", icon: "target" },
    { id: "features", label: "Giving", icon: "hand-heart" },
    { id: "template", label: "Template", icon: "images" },
    { id: "style", label: "Palette", icon: "palette" },
    { id: "review", label: "Review", icon: "badge-check" },
  ],
};

// ─── Shelf search copy ───────────────────────────────────────────────────────

export interface GalleryCopy {
  unit: string;
  placeholder: string;
  suggestions: string[];
}

const NGO_GALLERY: GalleryCopy = {
  unit: "causes",
  placeholder:
    "Describe the mission — “press”, “kids after school”, “wildlife”…",
  suggestions: [
    "press",
    "kids",
    "farm",
    "wildlife",
    "savings",
    "refugees",
    "gyms",
    "tech",
  ],
};

const EDU_GALLERY: GalleryCopy = {
  unit: "settings",
  placeholder:
    "Describe the setting — “boarding”, “exams”, “live cohorts”, “arabic”…",
  suggestions: [
    "boarding",
    "exams",
    "live",
    "tutoring",
    "trades",
    "arabic",
    "degrees",
  ],
};

const COMMERCE_GALLERY: GalleryCopy = {
  unit: "stores",
  placeholder: "Describe the store — “downloads”, “bundles”, “bookable”…",
  suggestions: [
    "downloads",
    "bundles",
    "subscriptions",
    "services",
    "wholesale",
  ],
};

const GENERAL_GALLERY: GalleryCopy = {
  unit: "shapes",
  placeholder: "Describe the site — “docs”, “portfolio”, “community”…",
  suggestions: ["saas", "agency", "community", "consultant", "corporate"],
};

export function galleryCopyFor(mode: WorkspaceMode): GalleryCopy {
  switch (mode) {
    case "EDUCATION":
      return EDU_GALLERY;
    case "NON_PROFIT":
      return NGO_GALLERY;
    case "E_COMMERCE":
      return COMMERCE_GALLERY;
    case "GENERAL":
      return GENERAL_GALLERY;
    default:
      return {
        unit: "options",
        placeholder: "Search the options — a plain word is enough…",
        suggestions: [],
      };
  }
}

export const E_COMMERCE_FLOW: ModeFlow = {
  key: "E_COMMERCE",
  icon: "store",
  osName: "Commerce OS",
  splashMotif: "ledger",
  accent: { primary: "#0f766e", secondary: "#06b6d4", surface: "#f0fdfa" },
  splashLines: [
    "Connecting Storefront Engine",
    "Wiring Checkout Pipeline",
    "Launching Studio",
  ],
  brandTitle: "Welcome to Commerce OS",
  brandTagline: "gives your storefront a customer experience that converts.",
  trackTitle: "What kind of store is this?",
  trackDescription:
    "Catalogue shape decides which product surfaces and admin panels surface.",
  tracks: [
    {
      id: "retail",
      label: "Retail Storefront",
      description: "Physical items, inventory, and delivery checkout.",
      icon: "building",
      accent: { primary: "#0f766e", secondary: "#06b6d4" },
    },
  ],
  presets: [midnight("E_COMMERCE")],
  paletteTitle: "Storefront Palette",
  paletteHint: "Button and card accents.",
  runtimeSurfaces: ["Checkout Gateway", "Order Tracking Portal"],
  spine: [
    { id: "welcome", label: "Commerce", icon: "store" },
    { id: "identity", label: "Brand", icon: "sparkles" },
    { id: "template", label: "Template", icon: "images" },
    { id: "style", label: "Palette", icon: "palette" },
    { id: "review", label: "Review", icon: "badge-check" },
  ],
};

export const GENERAL_FLOW: ModeFlow = {
  key: "GENERAL",
  icon: "sparkles",
  osName: "Workspace",
  splashMotif: "constellation",
  accent: { primary: "#4f46e5", secondary: "#06b6d4", surface: "#eef2ff" },
  splashLines: ["Initializing Workspace", "Launching Studio"],
  brandTitle: "Welcome to the Workspace",
  brandTagline: "gives your organisation a portal that feels exactly like you.",
  trackTitle: "What kind of site is this?",
  trackDescription: "The shape decides which pages surface and how they read.",
  tracks: [
    {
      id: "agency",
      label: "Agency / Studio",
      description: "Services-led with case studies.",
      icon: "lightbulb",
      accent: { primary: "#4f46e5", secondary: "#22d3ee" },
    },
  ],
  presets: [midnight("GENERAL")],
  paletteTitle: "Theme Colors",
  paletteHint: "Portal color variables.",
  runtimeSurfaces: ["Client Collaboration Portal"],
  spine: [
    { id: "welcome", label: "Workspace", icon: "sparkles" },
    { id: "identity", label: "Brand", icon: "sparkles" },
    { id: "template", label: "Template", icon: "images" },
    { id: "style", label: "Palette", icon: "palette" },
    { id: "review", label: "Review", icon: "badge-check" },
  ],
};

export const PARTNER_FLOW: ModeFlow = {
  ...GENERAL_FLOW,
  key: "PARTNER",
  osName: "Partner OS",
  icon: "handshake",
};

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

export type StepId =
  | "welcome"
  | "identity"
  | "origin"
  | "track"
  | "features"
  | "credentials"
  | "operations"
  | "template"
  | "style"
  | "review";

export function resolveSteps(
  flow: ModeFlow,
  origin: FlowOriginOption | null,
  track: FlowTrack | null,
): StepId[] {
  return flow.spine
    .map((entry) => entry.id)
    .filter((id) => {
      if (id === "origin") return Boolean(flow.origin);
      if (id === "credentials")
        return origin?.id === "institution" && Boolean(origin?.fields?.length);
      if (id === "features") return Boolean(track?.features?.length);
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

export function findOrigin(
  flow: ModeFlow,
  id: string | null,
): FlowOriginOption | null {
  if (!flow.origin || !id) return null;
  return flow.origin.options.find((option) => option.id === id) ?? null;
}

export function findTrack(flow: ModeFlow, id: string | null): FlowTrack | null {
  if (!id) return null;
  return flow.tracks.find((candidate) => candidate.id === id) ?? null;
}

export function tracksForOrigin(
  flow: ModeFlow,
  origin: FlowOriginOption | null,
): FlowTrack[] {
  if (!origin?.tracks) return flow.tracks;
  return origin.tracks
    .map((id) => flow.tracks.find((track) => track.id === id))
    .filter((track): track is FlowTrack => Boolean(track));
}

export function detailFieldsFor(
  flow: ModeFlow,
  origin: FlowOriginOption | null,
  track: FlowTrack | null,
): FlowField[] {
  const base = origin?.operationalFields ?? flow.operationalFields;
  const extra = track?.fields ?? [];
  return [...(base ?? []), ...extra];
}

export function operationalTitleFor(
  flow: ModeFlow,
  origin: FlowOriginOption | null,
): string {
  return origin?.operationalTitle ?? flow.operationalTitle ?? "Details";
}

export function recommendedFeatureKeys(
  origin: FlowOriginOption | null,
  track: FlowTrack | null,
): string[] {
  const pool = new Set((track?.features ?? []).map((feature) => feature.key));
  return (origin?.recommends ?? []).filter((key) => pool.has(key));
}

export function preferredTemplateKeys(
  origin: FlowOriginOption | null,
  track: FlowTrack | null,
): string[] {
  return [
    ...new Set([
      ...(track?.templateKeys ?? []),
      ...(origin?.templateKeys ?? []),
    ]),
  ];
}

export function identityExamplesFor(
  flow: ModeFlow,
  origin: FlowOriginOption | null,
): { name: string; tagline: string } {
  return (
    origin?.examples ?? {
      name: "Your Organisation",
      tagline: "Delivering excellence through unified systems.",
    }
  );
}

export const WORKSPACE_SEED_NAMES: ReadonlySet<string> = new Set([
  "Your Company",
  "Our School",
  "Our Foundation",
]);

export function setupTokenKey(base: string): string {
  return `setup${base}`.replace(/[^a-zA-Z0-9]/g, "");
}

export const SETUP_TOKENS = {
  origin: setupTokenKey("Origin"),
  track: setupTokenKey("Track"),
  features: (trackId: string) => setupTokenKey(`Track_${trackId}_Features`),
  template: setupTokenKey("TemplateChosen"),
  paletteSource: setupTokenKey("PaletteSource"),
};

export function isFlowIcon(value: unknown): value is FlowIcon {
  return typeof value === "string";
}

export function templateKeyLabel(key: string | null | undefined): string {
  if (!key) return "";
  return key.replace(/[-_]/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
