// gn-apex/src/components/media/mediaSamples.ts
//
// Procedural starter templates for the Template Library. Nothing here touches
// the network, so the library works offline. Each entry serialises into a real
// `File` the studio can ingest.
//
// All brands, names and artwork are original / fictional – none of them copy a
// real company's trademark.

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type SampleImageKind =
  | "avatar"
  | "logo"
  | "lockup"
  | "icon"
  | "badge"
  | "cover"
  | "background"
  | "social";

export interface SampleImage {
  type: "image";
  id: string;
  name: string;
  label: string;
  meta: string;
  kind: SampleImageKind;
  svg: string;
}

export interface SampleMotion {
  type: "motion";
  id: string;
  name: string;
  label: string;
  meta: string;
  json: Record<string, unknown>;
}

export type SoundWave = "sine" | "triangle" | "square" | "saw";
export type SoundMode = "tone" | "chord" | "arp" | "sweep" | "pulse";

export interface SampleSound {
  type: "sound";
  id: string;
  name: string;
  label: string;
  meta: string;
  freq: number;
  duration: number;
  /** Oscillator shape. Defaults to sine. */
  wave?: SoundWave;
  /** Synthesis mode. Defaults to a single decaying tone. */
  mode?: SoundMode;
  /** Chord / arpeggio notes, or [start, end] frequencies for a sweep. */
  notes?: number[];
}

export type Sample = SampleImage | SampleMotion | SampleSound;

export interface SampleCategory {
  id: string;
  label: string;
  hint: string;
  items: Sample[];
}

// ─────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────

const svgDoc = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

const escapeText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const f2 = (n: number) => Number(n.toFixed(2));

/** Deterministic pseudo-random in [0,1) so templates are stable between renders. */
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const PALETTES: [string, string, string][] = [
  ["#5fcdd9", "#3b6bff", "#0a1016"],
  ["#a78bfa", "#7c3aed", "#0c0a14"],
  ["#f472b6", "#e11d48", "#150a12"],
  ["#fbbf24", "#f97316", "#160f06"],
  ["#34d399", "#0ea5e9", "#04120f"],
  ["#60a5fa", "#818cf8", "#070c18"],
  ["#f87171", "#fb923c", "#150b08"],
  ["#c084fc", "#38bdf8", "#0b0b1a"],
  ["#2dd4bf", "#22c55e", "#04130f"],
  ["#fb7185", "#a855f7", "#14081a"],
  ["#facc15", "#84cc16", "#12140a"],
  ["#38bdf8", "#6366f1", "#060a1c"],
];
const palette = (i: number) =>
  PALETTES[((i % PALETTES.length) + PALETTES.length) % PALETTES.length];

const SANS = "Inter,system-ui,'Segoe UI',sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const ROUND = "'Trebuchet MS','Segoe UI',sans-serif";
const MONO = "'SF Mono','Courier New',monospace";

// ─────────────────────────────────────────────
// AVATARS
// ─────────────────────────────────────────────

type AvatarStyle =
  | "orb"
  | "monogram"
  | "geo"
  | "blob"
  | "halo"
  | "pixel"
  | "bloom"
  | "rings"
  | "duo"
  | "sun"
  | "tri"
  | "wave"
  | "dots"
  | "eye";

interface AvatarSpec {
  id: string;
  label: string;
  style: AvatarStyle;
  initials?: string;
}

const AVATARS: AvatarSpec[] = [
  { id: "avatar-aurora", label: "Aurora", style: "orb" },
  { id: "avatar-nebula", label: "Nebula", style: "bloom" },
  { id: "avatar-orbit", label: "Orbit", style: "halo" },
  {
    id: "avatar-monogram",
    label: "Monogram",
    style: "monogram",
    initials: "AX",
  },
  { id: "avatar-facet", label: "Facet", style: "geo" },
  { id: "avatar-blob", label: "Blob", style: "blob" },
  { id: "avatar-halo", label: "Halo", style: "halo" },
  { id: "avatar-pixels", label: "Pixels", style: "pixel" },
  { id: "avatar-bloom", label: "Bloom", style: "bloom" },
  { id: "avatar-rings", label: "Rings", style: "rings" },
  {
    id: "avatar-initials",
    label: "Initials",
    style: "monogram",
    initials: "K",
  },
  { id: "avatar-rings2", label: "Rings II", style: "rings" },
  { id: "avatar-duo", label: "Duo", style: "duo" },
  { id: "avatar-synth-sun", label: "Synth Sun", style: "sun" },
  { id: "avatar-peak", label: "Prism Peak", style: "tri" },
  { id: "avatar-ripple", label: "Ripple", style: "wave" },
  { id: "avatar-constellation", label: "Constellation", style: "dots" },
  { id: "avatar-vision", label: "Vision", style: "eye" },
  { id: "avatar-mono-nx", label: "Mono NX", style: "monogram", initials: "NX" },
  { id: "avatar-mono-z", label: "Mono Z", style: "monogram", initials: "Z" },
  { id: "avatar-user", label: "Profile", style: "orb" },
  { id: "avatar-pixels2", label: "Pixels II", style: "pixel" },
  { id: "avatar-blob2", label: "Blob II", style: "blob" },
  { id: "avatar-facet2", label: "Facet II", style: "geo" },
];

function avatarBody(spec: AvatarSpec, i: number): string {
  const [a, b, dark] = palette(i);
  const gid = `av${i}`;
  const grad = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs>`;

  switch (spec.style) {
    case "orb":
      return (
        grad +
        `<circle cx="256" cy="256" r="256" fill="url(#${gid})"/>` +
        `<circle cx="256" cy="198" r="86" fill="#f8fafc" opacity="0.94"/>` +
        `<path d="M256 358c-70 0-129 34-155 87 39 45 94 71 155 71s115-26 155-71c-26-53-85-87-155-87z" fill="#f8fafc" opacity="0.9"/>`
      );
    case "monogram":
      return (
        grad +
        `<circle cx="256" cy="256" r="256" fill="url(#${gid})"/>` +
        `<text x="256" y="266" text-anchor="middle" dominant-baseline="middle" font-family="${SANS}" font-size="${(spec.initials ?? "AX").length > 1 ? 180 : 230}" font-weight="800" fill="#ffffff" opacity="0.96">${escapeText(spec.initials ?? "AX")}</text>`
      );
    case "geo":
      return (
        grad +
        `<rect width="512" height="512" rx="120" fill="url(#${gid})"/>` +
        `<path d="M256 96 416 300 256 416 96 300z" fill="${dark}" opacity="0.55"/>` +
        `<path d="M256 150 372 300 256 372 140 300z" fill="#ffffff" opacity="0.92"/>`
      );
    case "blob":
      return (
        grad +
        `<rect width="512" height="512" fill="${dark}"/>` +
        `<path d="M256 64c74 0 150 44 168 118s-38 132-70 178-52 88-98 88-104-52-140-96-62-96-44-164S182 64 256 64z" fill="url(#${gid})"/>` +
        `<circle cx="212" cy="220" r="26" fill="${dark}" opacity="0.7"/><circle cx="300" cy="220" r="26" fill="${dark}" opacity="0.7"/>`
      );
    case "halo":
      return (
        grad +
        `<rect width="512" height="512" fill="${dark}"/>` +
        `<circle cx="256" cy="256" r="180" fill="none" stroke="url(#${gid})" stroke-width="18" opacity="0.9"/>` +
        `<circle cx="256" cy="256" r="120" fill="none" stroke="url(#${gid})" stroke-width="10" opacity="0.6"/>` +
        `<circle cx="256" cy="256" r="60" fill="#ffffff" opacity="0.95"/>`
      );
    case "pixel":
      return (
        `<rect width="512" height="512" fill="${dark}"/>` +
        Array.from({ length: 64 }, (_, k) => {
          const on = (k * 7 + i) % 3 !== 0;
          if (!on) return "";
          const x = (k % 8) * 64;
          const y = Math.floor(k / 8) * 64;
          return `<rect x="${x}" y="${y}" width="64" height="64" fill="${k % 2 ? a : b}" opacity="${(0.3 + (k % 5) * 0.14).toFixed(2)}"/>`;
        }).join("")
      );
    case "bloom":
      return (
        `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="55%" stop-color="${b}"/><stop offset="100%" stop-color="${dark}"/></linearGradient>` +
        `<filter id="bl${i}"><feGaussianBlur stdDeviation="26"/></filter></defs>` +
        `<rect width="512" height="512" fill="${dark}"/>` +
        `<rect width="512" height="512" fill="url(#${gid})"/>` +
        `<circle cx="180" cy="180" r="120" fill="${a}" filter="url(#bl${i})" opacity="0.85"/>` +
        `<circle cx="340" cy="330" r="150" fill="${b}" filter="url(#bl${i})" opacity="0.7"/>`
      );
    case "rings":
      return (
        grad +
        `<rect width="512" height="512" fill="${dark}"/>` +
        [200, 150, 100, 50]
          .map(
            (r, k) =>
              `<circle cx="256" cy="256" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="${14 - k * 2}" opacity="${(0.9 - k * 0.18).toFixed(2)}"/>`,
          )
          .join("") +
        `<circle cx="256" cy="256" r="24" fill="#ffffff"/>`
      );
    case "duo":
      return (
        `<rect width="512" height="512" fill="${dark}"/>` +
        `<circle cx="198" cy="256" r="132" fill="${a}" opacity="0.88"/>` +
        `<circle cx="314" cy="256" r="132" fill="${b}" opacity="0.78"/>` +
        `<circle cx="256" cy="256" r="58" fill="#ffffff" opacity="0.92"/>`
      );
    case "sun":
      return (
        grad +
        `<rect width="512" height="512" fill="url(#${gid})"/>` +
        `<circle cx="256" cy="230" r="104" fill="#fff7ed" opacity="0.96"/>` +
        [0, 1, 2, 3, 4]
          .map(
            (k) =>
              `<rect x="0" y="${330 + k * 38}" width="512" height="${6 + k * 5}" fill="${dark}" opacity="0.6"/>`,
          )
          .join("")
      );
    case "tri":
      return (
        grad +
        `<rect width="512" height="512" fill="${dark}"/>` +
        `<path d="M256 76 442 404H70z" fill="url(#${gid})"/>` +
        `<path d="M256 206 342 358H170z" fill="${dark}" opacity="0.6"/>`
      );
    case "wave":
      return (
        grad +
        `<rect width="512" height="512" fill="url(#${gid})"/>` +
        [0, 1, 2]
          .map(
            (k) =>
              `<path d="M-20 ${230 + k * 60} C80 ${150 + k * 60} 180 ${310 + k * 60} 280 ${230 + k * 60} S480 ${150 + k * 60} 540 ${230 + k * 60}" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round" opacity="${(0.92 - k * 0.26).toFixed(2)}"/>`,
          )
          .join("")
      );
    case "dots":
      return (
        `<rect width="512" height="512" fill="${dark}"/>` +
        Array.from({ length: 9 }, (_, k) => {
          const r = Math.floor(k / 3);
          const c = k % 3;
          const rad = 22 + ((k * 7 + i) % 5) * 9;
          return `<circle cx="${116 + c * 140}" cy="${116 + r * 140}" r="${rad}" fill="${k % 2 ? a : b}" opacity="${(0.5 + (k % 4) * 0.14).toFixed(2)}"/>`;
        }).join("")
      );
    case "eye":
      return (
        grad +
        `<circle cx="256" cy="256" r="256" fill="url(#${gid})"/>` +
        `<path d="M56 256Q256 96 456 256Q256 416 56 256z" fill="#ffffff"/>` +
        `<circle cx="256" cy="256" r="84" fill="${dark}"/>` +
        `<circle cx="256" cy="256" r="40" fill="url(#${gid})"/>` +
        `<circle cx="232" cy="232" r="14" fill="#ffffff"/>`
      );
    default:
      return "";
  }
}

function avatarSVG(spec: AvatarSpec, i: number): string {
  return svgDoc(512, 512, avatarBody(spec, i));
}

// ─────────────────────────────────────────────
// LOGOS – original fictional brands
// ─────────────────────────────────────────────

type LogoStyle =
  | "prism"
  | "orbit"
  | "wave"
  | "spark"
  | "cube"
  | "bolt"
  | "leaf"
  | "matrix"
  | "loop"
  | "pinwheel"
  | "ascend"
  | "shield"
  | "lunar"
  | "summit"
  | "droplet"
  | "triad"
  | "ember"
  | "compass"
  | "echo"
  | "stratum"
  | "solis"
  | "nova"
  | "nucleus"
  | "vista"
  | "jewel"
  | "pulse"
  | "growth"
  | "nimbus";

interface LogoSpec {
  id: string;
  label: string;
  style: LogoStyle;
  /** Fictional brand name used in the lockup. */
  name: string;
  tagline: string;
  font: string;
  upper?: boolean;
}

const LOGOS: LogoSpec[] = [
  {
    id: "logo-prism",
    label: "Prismora",
    style: "prism",
    name: "Prismora",
    tagline: "Design & Motion",
    font: SANS,
  },
  {
    id: "logo-orbit",
    label: "Orbitly",
    style: "orbit",
    name: "Orbitly",
    tagline: "Cloud Platform",
    font: ROUND,
  },
  {
    id: "logo-waveform",
    label: "Wavelength",
    style: "wave",
    name: "Wavelength",
    tagline: "Audio Studio",
    font: SANS,
  },
  {
    id: "logo-spark",
    label: "Sparkline",
    style: "spark",
    name: "Sparkline",
    tagline: "Ideas Agency",
    font: SERIF,
  },
  {
    id: "logo-cube",
    label: "Cuboid",
    style: "cube",
    name: "Cuboid",
    tagline: "Build Systems",
    font: SANS,
    upper: true,
  },
  {
    id: "logo-voltage",
    label: "Voltaic",
    style: "bolt",
    name: "Voltaic",
    tagline: "Clean Energy",
    font: SANS,
  },
  {
    id: "logo-verdant",
    label: "Verdant",
    style: "leaf",
    name: "Verdant",
    tagline: "Organic Goods",
    font: SERIF,
  },
  {
    id: "logo-matrix",
    label: "Gridline",
    style: "matrix",
    name: "Gridline",
    tagline: "Data Analytics",
    font: MONO,
  },
  {
    id: "logo-loop",
    label: "Loopwise",
    style: "loop",
    name: "Loopwise",
    tagline: "Growth Partners",
    font: ROUND,
  },
  {
    id: "logo-whirl",
    label: "Whirl",
    style: "pinwheel",
    name: "Whirl",
    tagline: "Play & Learn",
    font: ROUND,
  },
  {
    id: "logo-ascend",
    label: "Ascendo",
    style: "ascend",
    name: "Ascendo",
    tagline: "Career Coaching",
    font: SANS,
  },
  {
    id: "logo-bastion",
    label: "Bastion",
    style: "shield",
    name: "Bastion",
    tagline: "Cyber Security",
    font: SANS,
    upper: true,
  },
  {
    id: "logo-lunaris",
    label: "Lunaris",
    style: "lunar",
    name: "Lunaris",
    tagline: "Sleep Wellness",
    font: SERIF,
  },
  {
    id: "logo-highpeak",
    label: "Highpeak",
    style: "summit",
    name: "Highpeak",
    tagline: "Outdoor Gear",
    font: SANS,
    upper: true,
  },
  {
    id: "logo-dropwell",
    label: "Dropwell",
    style: "droplet",
    name: "Dropwell",
    tagline: "Pure Water",
    font: ROUND,
  },
  {
    id: "logo-triad",
    label: "Triad",
    style: "triad",
    name: "Triad",
    tagline: "Consulting Group",
    font: SERIF,
    upper: true,
  },
  {
    id: "logo-emberly",
    label: "Emberly",
    style: "ember",
    name: "Emberly",
    tagline: "Wood-Fired Kitchen",
    font: SERIF,
  },
  {
    id: "logo-wayfinder",
    label: "Wayfinder",
    style: "compass",
    name: "Wayfinder",
    tagline: "Travel Co.",
    font: SERIF,
  },
  {
    id: "logo-echoline",
    label: "Echoline",
    style: "echo",
    name: "Echoline",
    tagline: "Team Messaging",
    font: ROUND,
  },
  {
    id: "logo-stratify",
    label: "Stratify",
    style: "stratum",
    name: "Stratify",
    tagline: "Product Analytics",
    font: SANS,
  },
  {
    id: "logo-solenne",
    label: "Solenne",
    style: "solis",
    name: "Solenne",
    tagline: "Solar Systems",
    font: SANS,
  },
  {
    id: "logo-novanet",
    label: "Novanet",
    style: "nova",
    name: "Novanet",
    tagline: "Fiber Internet",
    font: SANS,
    upper: true,
  },
  {
    id: "logo-nucleon",
    label: "Nucleon",
    style: "nucleus",
    name: "Nucleon",
    tagline: "Research Labs",
    font: MONO,
  },
  {
    id: "logo-lookout",
    label: "Lookout",
    style: "vista",
    name: "Lookout",
    tagline: "Vision Care",
    font: SANS,
  },
  {
    id: "logo-facetti",
    label: "Facetti",
    style: "jewel",
    name: "Facetti",
    tagline: "Fine Jewelry",
    font: SERIF,
    upper: true,
  },
  {
    id: "logo-pulsecare",
    label: "Pulsecare",
    style: "pulse",
    name: "Pulsecare",
    tagline: "Health Clinic",
    font: SANS,
  },
  {
    id: "logo-ledgerly",
    label: "Ledgerly",
    style: "growth",
    name: "Ledgerly",
    tagline: "Finance Tools",
    font: SANS,
  },
  {
    id: "logo-nimbly",
    label: "Nimbly",
    style: "nimbus",
    name: "Nimbly",
    tagline: "Cloud Storage",
    font: ROUND,
  },
];

/**
 * Draws a mark centred on (0,0), roughly ±130 units.
 *  P  – main paint (gradient ref or white)
 *  D  – detail colour that contrasts with P
 *  BG – colour of the card behind it (for cut-outs)
 */
function logoMark(style: LogoStyle, P: string, D: string, BG: string): string {
  const S = `fill="none" stroke="${P}" stroke-linecap="round" stroke-linejoin="round"`;
  switch (style) {
    case "prism":
      return `<path d="M0-118 102-59 102 59 0 118-102 59-102-59z" ${S} stroke-width="18"/><path d="M0-52 46 28H-46z" fill="${P}"/>`;
    case "orbit":
      return `<circle r="64" ${S} stroke-width="18"/><ellipse rx="142" ry="52" transform="rotate(-24)" ${S} stroke-width="12" opacity="0.7"/><circle cx="130" cy="-58" r="18" fill="${D}"/>`;
    case "wave":
      return [40, 100, 160, 210, 160, 100, 40]
        .map(
          (h, k) =>
            `<rect x="${-108 + k * 36}" y="${-h / 2}" width="24" height="${h}" rx="12" fill="${P}" opacity="${k === 3 ? 1 : 0.85}"/>`,
        )
        .join("");
    case "spark":
      return `<path d="M0-130Q12-12 130 0Q12 12 0 130Q-12 12-130 0Q-12-12 0-130z" fill="${P}"/><circle cx="76" cy="-76" r="12" fill="${P}" opacity="0.7"/>`;
    case "cube":
      return `<g stroke="${BG}" stroke-width="7" stroke-linejoin="round"><path d="M0-122 106-61 0 0-106-61z" fill="${P}"/><path d="M-106-61 0 0V122L-106 61z" fill="${P}" opacity="0.7"/><path d="M106-61 0 0V122L106 61z" fill="${P}" opacity="0.45"/></g>`;
    case "bolt":
      return `<path d="M30-132 -72 12H-8L-30 132 74-24H10z" fill="${P}"/>`;
    case "leaf":
      return `<path d="M-90 90C-112-22-20-112 102-102 112 20 20 112-90 90z" fill="${P}"/><path d="M-90 90 46-46" stroke="${D}" stroke-width="9" stroke-linecap="round" fill="none"/>`;
    case "matrix":
      return [
        [-112, -112, 1],
        [8, -112, 0.65],
        [-112, 8, 0.65],
        [8, 8, 0.35],
      ]
        .map(
          ([x, y, o]) =>
            `<rect x="${x}" y="${y}" width="104" height="104" rx="30" fill="${P}" opacity="${o}"/>`,
        )
        .join("");
    case "loop":
      return `<path d="M0 0C40-72 124-72 124 0C124 72 40 72 0 0C-40-72-124-72-124 0C-124 72-40 72 0 0z" ${S} stroke-width="22"/>`;
    case "pinwheel":
      return [0, 1, 2, 3]
        .map(
          (k) =>
            `<path d="M8-8V-118A110 110 0 0 1 118-8z" fill="${P}" opacity="${[1, 0.75, 0.5, 0.3][k]}" transform="rotate(${k * 90})"/>`,
        )
        .join("");
    case "ascend":
      return [0, 1, 2]
        .map(
          (k) =>
            `<path d="M-96 ${-56 + k * 56 + 34}L0 ${-56 + k * 56 - 34}L96 ${-56 + k * 56 + 34}" ${S} stroke-width="24" opacity="${[1, 0.62, 0.3][k]}"/>`,
        )
        .join("");
    case "shield":
      return `<path d="M0-126 102-86V10C102 72 52 110 0 132-52 110-102 72-102 10V-86z" fill="${P}"/><path d="M-42 6 -12 38 46-24" fill="none" stroke="${D}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>`;
    case "lunar":
      return `<g transform="translate(34 0)"><path d="M50-95A100 100 0 1 0 50 95A110 110 0 0 1 50-95z" fill="${P}"/></g><circle cx="78" cy="-52" r="13" fill="${P}"/><circle cx="108" cy="8" r="8" fill="${P}" opacity="0.7"/>`;
    case "summit":
      return `<path d="M-130 100-20-92 90 100z" fill="${P}"/><path d="M-12 100 70-30 140 100z" fill="${P}" opacity="0.6"/><path d="M-20-92-50-42-33-50-20-34-5-50 10-42z" fill="${D}"/>`;
    case "droplet":
      return `<path d="M0-126C60-40 100 10 100 50 100 105 55 132 0 132-55 132-100 105-100 50-100 10-60-40 0-126z" fill="${P}"/><path d="M-52 42C-52 72-32 92-6 98" fill="none" stroke="${D}" stroke-width="12" stroke-linecap="round" opacity="0.55"/>`;
    case "triad":
      return `<circle cx="0" cy="-48" r="72" fill="${P}" opacity="0.9"/><circle cx="-52" cy="42" r="72" fill="${P}" opacity="0.6"/><circle cx="52" cy="42" r="72" fill="${P}" opacity="0.35"/>`;
    case "ember":
      return `<path d="M0-132C20-80 96-50 96 28 96 92 52 132 0 132-52 132-96 92-96 28-96-6-78-34-52-58-46-28-30-14-16-30-14-70-10-100 0-132z" fill="${P}"/><path d="M0 30C22 56 42 72 42 96 42 118 22 132 0 132-22 132-42 118-42 96-42 72-22 56 0 30z" fill="${D}" opacity="0.92"/>`;
    case "compass":
      return `<circle r="104" ${S} stroke-width="14"/><g transform="rotate(40)"><path d="M0-76 24 0H-24z" fill="${P}"/><path d="M0 76 24 0H-24z" fill="${D}" opacity="0.85"/></g><circle r="9" fill="${BG}"/>`;
    case "echo":
      return `<path d="M-102-58Q-102-102-58-102H58Q102-102 102-58V28Q102 72 58 72H-6L-58 120V72Q-102 72-102 28z" fill="${P}"/><circle cx="-40" cy="-14" r="12" fill="${D}"/><circle cx="0" cy="-14" r="12" fill="${D}"/><circle cx="40" cy="-14" r="12" fill="${D}"/>`;
    case "stratum":
      return `<path d="M0-92 116-34 0 24-116-34z" fill="${P}"/><path d="M-116 8 0 66 116 8" ${S} stroke-width="16" opacity="0.7"/><path d="M-116 46 0 104 116 46" ${S} stroke-width="16" opacity="0.4"/>`;
    case "solis":
      return (
        `<circle r="54" fill="${P}"/>` +
        Array.from(
          { length: 12 },
          (_, k) =>
            `<line x1="0" y1="-84" x2="0" y2="${k % 2 ? -110 : -124}" stroke="${P}" stroke-width="14" stroke-linecap="round" transform="rotate(${k * 30})"/>`,
        ).join("")
      );
    case "nova":
      return `<path d="M-75 100V-100H-33L33 40V-100H75V100H33L-33-40V100z" fill="${P}"/>`;
    case "nucleus":
      return (
        [0, 60, 120]
          .map(
            (r) =>
              `<ellipse rx="130" ry="46" transform="rotate(${r})" ${S} stroke-width="10" opacity="${r ? 0.75 : 1}"/>`,
          )
          .join("") + `<circle r="22" fill="${P}"/>`
      );
    case "vista":
      return `<path d="M-130 0Q0-104 130 0Q0 104-130 0z" ${S} stroke-width="16"/><circle r="40" fill="${P}"/><circle r="14" fill="${D}"/>`;
    case "jewel":
      return `<path d="M-80-60H80L122-10 0 124-122-10z" ${S} stroke-width="14"/><path d="M-122-10H122M-40-60-22-10 0 124M40-60 22-10 0 124M-22-10 0-60 22-10" ${S} stroke-width="10" opacity="0.65"/>`;
    case "pulse":
      return `<path d="M-130 8H-62L-36-58 2 78 32-28 48 8H130" ${S} stroke-width="20"/>`;
    case "growth":
      return (
        [
          [-90, 80, 0.45],
          [-30, 130, 0.72],
          [30, 190, 1],
        ]
          .map(
            ([x, h, o]) =>
              `<rect x="${x}" y="${100 - h}" width="46" height="${h}" rx="12" fill="${P}" opacity="${o}"/>`,
          )
          .join("") + `<circle cx="53" cy="-108" r="14" fill="${D}"/>`
      );
    case "nimbus":
      return `<path d="M-72 82H70C118 82 130 18 86-8 90-60 22-92-22-58-52-90-112-66-100-14-140-4-128 82-72 82z" fill="${P}"/>`;
    default:
      return "";
  }
}

/** Square mark on a dark card. */
function logoSVG(spec: LogoSpec, i: number): string {
  const [a, b] = palette(i + 2);
  return svgDoc(
    512,
    512,
    `<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs>` +
      `<rect width="512" height="512" rx="96" fill="#0b0f11"/>` +
      `<g transform="translate(256 256) scale(1.18)">${logoMark(spec.style, "url(#lg)", "#ffffff", "#0b0f11")}</g>`,
  );
}

/** Wide brand lockup: mark + wordmark + tagline. */
function lockupSVG(spec: LogoSpec, i: number): string {
  const [a, b, dark] = palette(i + 2);
  const onGrad = i % 3 === 1;
  const stacked = i % 4 === 3;
  const P = onGrad ? "#ffffff" : "url(#lg)";
  const D = onGrad ? dark : "#ffffff";
  const BG = onGrad ? dark : "#0b0f11";
  const name = spec.upper ? spec.name.toUpperCase() : spec.name;
  const fs = spec.upper ? 66 : spec.name.length > 9 ? 80 : 92;
  const ls = spec.upper ? 10 : -1;
  const tagFill = onGrad
    ? `fill="#ffffff" fill-opacity="0.8"`
    : `fill="#94a3b8"`;

  const defs =
    `<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient>` +
    `<linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs>`;
  const card = `<rect width="1024" height="512" rx="56" fill="${onGrad ? "url(#bgg)" : "#0b0f11"}"/>`;

  const nameEl = (x: number, y: number, anchor: string) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${spec.font}" font-size="${fs}" font-weight="800" letter-spacing="${ls}" fill="#ffffff">${escapeText(name)}</text>`;
  const tagEl = (x: number, y: number, anchor: string) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="6" ${tagFill}>${escapeText(spec.tagline.toUpperCase())}</text>`;

  const body = stacked
    ? `<g transform="translate(512 150) scale(0.6)">${logoMark(spec.style, P, D, BG)}</g>${nameEl(512, 352, "middle")}${tagEl(512, 412, "middle")}`
    : `<g transform="translate(236 256) scale(0.92)">${logoMark(spec.style, P, D, BG)}</g>${nameEl(400, 266, "start")}${tagEl(404, 322, "start")}`;

  return svgDoc(1024, 512, defs + card + body);
}

/** Gradient app-icon tile with a white glyph. */
function iconSVG(spec: LogoSpec, i: number): string {
  const [a, b, dark] = palette(i + 5);
  return svgDoc(
    512,
    512,
    `<defs><linearGradient id="ig" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient>` +
      `<linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/><stop offset="55%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
      `<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.28"/></filter></defs>` +
      `<rect width="512" height="512" rx="116" fill="url(#ig)"/>` +
      `<rect width="512" height="512" rx="116" fill="url(#hg)"/>` +
      `<g filter="url(#sh)" transform="translate(256 256) scale(1.02)">${logoMark(spec.style, "#ffffff", dark, dark)}</g>`,
  );
}

// ─────────────────────────────────────────────
// BADGES / STICKERS
// ─────────────────────────────────────────────

type BadgeStyle = "seal" | "ring" | "ribbon" | "shield";

interface BadgeSpec {
  id: string;
  label: string;
  style: BadgeStyle;
  lines: string[];
  sub?: string;
  top?: string;
  bottom?: string;
}

const BADGE_SPECS: BadgeSpec[] = [
  {
    id: "badge-premium",
    label: "Premium",
    style: "seal",
    lines: ["PREMIUM"],
    sub: "★ ★ ★ ★ ★",
  },
  {
    id: "badge-bestseller",
    label: "Best Seller",
    style: "seal",
    lines: ["BEST", "SELLER"],
    sub: "TOP CHOICE",
  },
  {
    id: "badge-organic",
    label: "100% Organic",
    style: "seal",
    lines: ["100%", "ORGANIC"],
    sub: "CERTIFIED",
  },
  {
    id: "badge-award",
    label: "Award Winner",
    style: "ring",
    top: "OFFICIAL SELECTION",
    bottom: "AWARD WINNER 2026",
    lines: ["★"],
  },
  {
    id: "badge-verified",
    label: "Verified",
    style: "ring",
    top: "TRUSTED & VERIFIED",
    bottom: "SECURE CHECKOUT",
    lines: ["✔"],
  },
  {
    id: "badge-est",
    label: "Established",
    style: "ring",
    top: "FAMILY OWNED",
    bottom: "HANDCRAFTED",
    lines: ["EST.", "2026"],
  },
  {
    id: "badge-new",
    label: "New Arrival",
    style: "ribbon",
    lines: ["NEW ARRIVAL"],
  },
  { id: "badge-sale", label: "Sale", style: "ribbon", lines: ["SALE -50%"] },
  {
    id: "badge-shipping",
    label: "Free Shipping",
    style: "ribbon",
    lines: ["FREE SHIPPING"],
  },
  {
    id: "badge-pro",
    label: "Pro",
    style: "shield",
    lines: ["PRO"],
    sub: "MEMBER",
  },
  {
    id: "badge-toprated",
    label: "Top Rated",
    style: "shield",
    lines: ["TOP", "RATED"],
    sub: "★★★★★",
  },
  {
    id: "badge-limited",
    label: "Limited",
    style: "shield",
    lines: ["LIMITED"],
    sub: "EDITION",
  },
];

function sealPath(
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  n: number,
): string {
  const pts: string[] = [];
  for (let k = 0; k < n * 2; k++) {
    const ang = (Math.PI * k) / n - Math.PI / 2;
    const r = k % 2 ? rIn : rOut;
    pts.push(`${f2(cx + r * Math.cos(ang))} ${f2(cy + r * Math.sin(ang))}`);
  }
  return `M${pts.join("L")}z`;
}

function badgeLines(
  lines: string[],
  fs: number,
  cy: number,
  fill = "#ffffff",
): string {
  return lines
    .map((s, k) => {
      const y = cy + (k - (lines.length - 1) / 2) * fs * 1.08;
      return `<text x="256" y="${f2(y)}" text-anchor="middle" dominant-baseline="middle" font-family="${SANS}" font-size="${fs}" font-weight="900" letter-spacing="1" fill="${fill}">${escapeText(s)}</text>`;
    })
    .join("");
}

function badgeSVG(spec: BadgeSpec, i: number): string {
  const [a, b, dark] = palette(i + 1);
  const defs =
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient>` +
    `<filter id="ds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/></filter></defs>`;

  switch (spec.style) {
    case "seal": {
      const fs = spec.lines.length > 1 ? 62 : 58;
      return svgDoc(
        512,
        512,
        defs +
          `<g filter="url(#ds)"><path d="${sealPath(256, 256, 232, 212, 28)}" fill="url(#bg)"/></g>` +
          `<circle cx="256" cy="256" r="176" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="5"/>` +
          `<circle cx="256" cy="256" r="164" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="2"/>` +
          badgeLines(spec.lines, fs, spec.sub ? 244 : 256) +
          (spec.sub
            ? `<text x="256" y="${spec.lines.length > 1 ? 346 : 316}" text-anchor="middle" font-family="${SANS}" font-size="26" font-weight="700" letter-spacing="4" fill="#fff" fill-opacity="0.9">${escapeText(spec.sub)}</text>`
            : ""),
      );
    }
    case "ring":
      return svgDoc(
        512,
        512,
        defs +
          `<g filter="url(#ds)"><circle cx="256" cy="256" r="240" fill="url(#bg)"/></g>` +
          `<circle cx="256" cy="256" r="226" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="3"/>` +
          `<circle cx="256" cy="256" r="150" fill="${dark}"/>` +
          `<circle cx="256" cy="256" r="150" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="3"/>` +
          `<path id="tp${i}" d="M80 256A176 176 0 0 1 432 256" fill="none"/>` +
          `<path id="bp${i}" d="M50 256A206 206 0 0 0 462 256" fill="none"/>` +
          `<text font-family="${SANS}" font-size="32" font-weight="800" letter-spacing="6" fill="#fff" text-anchor="middle"><textPath href="#tp${i}" startOffset="50%">${escapeText(spec.top ?? "")}</textPath></text>` +
          `<text font-family="${SANS}" font-size="32" font-weight="800" letter-spacing="6" fill="#fff" text-anchor="middle"><textPath href="#bp${i}" startOffset="50%">${escapeText(spec.bottom ?? "")}</textPath></text>` +
          badgeLines(spec.lines, spec.lines.length > 1 ? 56 : 120, 256, a),
      );
    case "ribbon": {
      const long = spec.lines[0].length > 10;
      return svgDoc(
        512,
        512,
        defs +
          `<g filter="url(#ds)"><path d="M20 172H492L446 256 492 340H20L66 256z" fill="url(#bg)"/></g>` +
          `<path d="M92 196H420M92 316H420" stroke="#fff" stroke-opacity="0.45" stroke-width="3"/>` +
          badgeLines(spec.lines, long ? 46 : 58, 256),
      );
    }
    case "shield":
      return svgDoc(
        512,
        512,
        defs +
          `<g filter="url(#ds)"><path d="M256 28 448 94V250C448 366 356 446 256 488 156 446 64 366 64 250V94z" fill="url(#bg)"/></g>` +
          `<path d="M256 62 414 116V250C414 344 340 412 256 448 172 412 98 344 98 250V116z" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="5"/>` +
          `<text x="256" y="142" text-anchor="middle" font-family="${SANS}" font-size="40" fill="#fff">★</text>` +
          badgeLines(spec.lines, spec.lines.length > 1 ? 66 : 84, 262) +
          (spec.sub
            ? `<text x="256" y="${spec.lines.length > 1 ? 376 : 342}" text-anchor="middle" font-family="${SANS}" font-size="26" font-weight="700" letter-spacing="4" fill="#fff" fill-opacity="0.9">${escapeText(spec.sub)}</text>`
            : ""),
      );
  }
}

// ─────────────────────────────────────────────
// COVERS
// ─────────────────────────────────────────────

type CoverStyle =
  | "dunes"
  | "city"
  | "ridge"
  | "aurora"
  | "mesh"
  | "horizon"
  | "waves"
  | "sunset"
  | "neon"
  | "ocean"
  | "forest"
  | "space"
  | "geometric"
  | "bokeh"
  | "circuit"
  | "pastel";

interface CoverSpec {
  id: string;
  label: string;
  style: CoverStyle;
}

const COVERS: CoverSpec[] = [
  { id: "cover-dunes", label: "Dunes", style: "dunes" },
  { id: "cover-night-city", label: "Night City", style: "city" },
  { id: "cover-pine-ridge", label: "Pine Ridge", style: "ridge" },
  { id: "cover-aurora", label: "Aurora", style: "aurora" },
  { id: "cover-mesh", label: "Mesh Flow", style: "mesh" },
  { id: "cover-horizon", label: "Grid Horizon", style: "horizon" },
  { id: "cover-waves", label: "Deep Waves", style: "waves" },
  { id: "cover-sunset", label: "Sunset", style: "sunset" },
  { id: "cover-neon", label: "Neon Drive", style: "neon" },
  { id: "cover-ocean", label: "Open Ocean", style: "ocean" },
  { id: "cover-forest", label: "Evergreen", style: "forest" },
  { id: "cover-space", label: "Deep Space", style: "space" },
  { id: "cover-geometric", label: "Low Poly", style: "geometric" },
  { id: "cover-bokeh", label: "Bokeh Lights", style: "bokeh" },
  { id: "cover-circuit", label: "Circuit Board", style: "circuit" },
  { id: "cover-pastel", label: "Pastel Glow", style: "pastel" },
];

function coverSVG(spec: CoverSpec, i: number): string {
  const [a, b, dark] = palette(i + 4);
  const W = 1800;
  const H = 900;
  switch (spec.style) {
    case "dunes":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#f97316"/></linearGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          `<path d="M0 620 Q450 480 900 600 T1800 560 V900 H0z" fill="#b45309" opacity="0.85"/>` +
          `<path d="M0 720 Q500 580 1000 700 T1800 680 V900 H0z" fill="#7c2d12" opacity="0.9"/>` +
          `<circle cx="1350" cy="250" r="120" fill="#fffbeb" opacity="0.95"/>`,
      );
    case "city":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e1b4b"/></linearGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          Array.from({ length: 24 }, (_, k) => {
            const bw = 40 + ((k * 37) % 70);
            const bh = 160 + ((k * 61) % 420);
            const x = 30 + k * 74;
            return (
              `<rect x="${x}" y="${H - bh}" width="${bw}" height="${bh}" fill="#0b1120"/>` +
              Array.from({ length: 5 }, (_, r) =>
                Array.from({ length: 3 }, (_, c) =>
                  (r + c + k) % 3 === 0
                    ? `<rect x="${x + 8 + c * 14}" y="${H - bh + 18 + r * 26}" width="8" height="12" fill="${a}" opacity="0.7"/>`
                    : "",
                ).join(""),
              ).join("")
            );
          }).join("") +
          `<circle cx="1500" cy="180" r="70" fill="#e0e7ff" opacity="0.9"/>`,
      );
    case "ridge":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#064e3b"/></linearGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          `<path d="M0 800 L300 420 L560 640 L820 300 L1120 620 L1400 360 L1800 760 V900 H0z" fill="#052e2b"/>` +
          `<path d="M0 860 L340 560 L640 760 L900 500 L1240 780 L1500 560 L1800 820 V900 H0z" fill="#022c22"/>`,
      );
    case "aurora":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#020617"/><stop offset="100%" stop-color="#0b1120"/></linearGradient><filter id="bl"><feGaussianBlur stdDeviation="42"/></filter></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          `<path d="M-100 400 C400 120 900 620 1900 260" stroke="#22d3ee" stroke-width="90" fill="none" filter="url(#bl)" opacity="0.7"/>` +
          `<path d="M-100 520 C500 260 1000 720 1900 380" stroke="#a78bfa" stroke-width="70" fill="none" filter="url(#bl)" opacity="0.6"/>` +
          [220, 560, 980, 1400, 1680]
            .map(
              (x) =>
                `<circle cx="${x}" cy="${120 + (x % 90)}" r="3" fill="#fff"/>`,
            )
            .join(""),
      );
    case "mesh":
      return svgDoc(
        W,
        H,
        `<defs><filter id="bl"><feGaussianBlur stdDeviation="80"/></filter></defs>` +
          `<rect width="${W}" height="${H}" fill="${dark}"/>` +
          `<circle cx="400" cy="300" r="320" fill="${a}" filter="url(#bl)" opacity="0.85"/>` +
          `<circle cx="1300" cy="600" r="380" fill="${b}" filter="url(#bl)" opacity="0.8"/>` +
          `<circle cx="1000" cy="200" r="220" fill="#ffffff" filter="url(#bl)" opacity="0.22"/>`,
      );
    case "horizon":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#0b1020"/></linearGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          Array.from({ length: 26 }, (_, k) => {
            const x = (k / 25) * W;
            const nx = (x - W / 2) * 2.6 + W / 2;
            return `<line x1="${x}" y1="0" x2="${nx}" y2="${H}" stroke="${a}" stroke-width="1.5" opacity="0.35"/>`;
          }).join("") +
          Array.from({ length: 14 }, (_, k) => {
            const y = (k / 13) * H;
            return `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${b}" stroke-width="1.5" opacity="0.35"/>`;
          }).join("") +
          `<circle cx="900" cy="330" r="90" fill="${a}" opacity="0.9"/>`,
      );
    case "waves":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${dark}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          [0, 1, 2, 3]
            .map(
              (k) =>
                `<path d="M0 ${450 + k * 90} Q450 ${330 + k * 90} 900 ${450 + k * 90} T1800 ${450 + k * 90}" stroke="${a}" stroke-width="8" fill="none" opacity="${(0.85 - k * 0.18).toFixed(2)}"/>`,
            )
            .join(""),
      );
    case "sunset":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7c3aed"/><stop offset="55%" stop-color="#f472b6"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          `<circle cx="900" cy="620" r="200" fill="#fff7ed" opacity="0.95"/>` +
          `<rect y="720" width="${W}" height="180" fill="#1c1917" opacity="0.55"/>` +
          `<path d="M700 440 Q900 380 1100 440" stroke="#fff" stroke-width="10" fill="none" opacity="0.7"/>` +
          `<path d="M740 500 Q900 450 1060 500" stroke="#fff" stroke-width="8" fill="none" opacity="0.5"/>`,
      );
    case "neon":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#14052e"/><stop offset="100%" stop-color="#4a0d5c"/></linearGradient>` +
          `<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#ec4899"/></linearGradient>` +
          `<mask id="m"><rect width="${W}" height="${H}" fill="#fff"/>${[
            0, 1, 2, 3, 4, 5,
          ]
            .map(
              (k) =>
                `<rect x="600" y="${380 + k * 34}" width="600" height="${4 + k * 3}" fill="#000"/>`,
            )
            .join("")}</mask></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          `<circle cx="900" cy="360" r="190" fill="url(#sun)" mask="url(#m)"/>` +
          `<rect y="540" width="${W}" height="360" fill="#12052b"/>` +
          `<rect y="536" width="${W}" height="8" fill="#f472b6" opacity="0.8"/>` +
          Array.from(
            { length: 9 },
            (_, k) =>
              `<line x1="0" y1="${f2(540 + k * k * 5.6)}" x2="${W}" y2="${f2(540 + k * k * 5.6)}" stroke="#f472b6" stroke-width="2" opacity="0.5"/>`,
          ).join("") +
          Array.from({ length: 25 }, (_, k) => {
            const x = -900 + k * 150;
            return `<line x1="${f2(900 + (x - 900) * 0.08)}" y1="540" x2="${x}" y2="${H}" stroke="#f472b6" stroke-width="2" opacity="0.5"/>`;
          }).join(""),
      );
    case "ocean":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${dark}"/><stop offset="100%" stop-color="${a}" stop-opacity="0.8"/></linearGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          `<circle cx="1300" cy="400" r="110" fill="#fff7ed" opacity="0.9"/>` +
          [0, 1, 2, 3, 4]
            .map((k) => {
              const y = 520 + k * 90;
              return `<path d="M0 ${y} Q225 ${y - 56} 450 ${y} T900 ${y} T1350 ${y} T1800 ${y} V900 H0z" fill="${k % 2 ? b : dark}" opacity="${(0.35 + k * 0.14).toFixed(2)}"/>`;
            })
            .join(""),
      );
    case "forest":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b1d33"/><stop offset="100%" stop-color="#1f6b5a"/></linearGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/>` +
          `<circle cx="1400" cy="190" r="72" fill="#f1f5f9" opacity="0.92"/>` +
          ["#1f6f5c", "#0f4a3c", "#06261f"]
            .map((col, l) =>
              Array.from({ length: 17 }, (_, k) => {
                const x = k * 110 + l * 37 - 50;
                const h = 220 + rnd(k + l * 20) * 200 - l * 20;
                return `<path d="M${x} ${H} L${x + 75} ${f2(H - h)} L${x + 150} ${H}z" fill="${col}"/>`;
              }).join(""),
            )
            .join(""),
      );
    case "space":
      return svgDoc(
        W,
        H,
        `<defs><radialGradient id="g" cx="0.3" cy="0.4" r="1"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#020617"/></radialGradient>` +
          `<linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient>` +
          `<radialGradient id="sh" cx="0.35" cy="0.3" r="0.8"><stop offset="40%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.65"/></radialGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#g)"/>` +
          Array.from(
            { length: 90 },
            (_, k) =>
              `<circle cx="${f2(rnd(k + 1) * W)}" cy="${f2(rnd(k + 200) * H)}" r="${f2(0.8 + rnd(k + 400) * 1.8)}" fill="#fff" opacity="${f2(0.35 + rnd(k + 600) * 0.65)}"/>`,
          ).join("") +
          `<circle cx="1380" cy="640" r="280" fill="url(#p)"/>` +
          `<circle cx="1380" cy="640" r="280" fill="url(#sh)"/>` +
          `<ellipse cx="1380" cy="640" rx="430" ry="86" transform="rotate(-18 1380 640)" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="8"/>`,
      );
    case "geometric":
      return svgDoc(
        W,
        H,
        `<rect width="${W}" height="${H}" fill="${dark}"/>` +
          Array.from({ length: 50 }, (_, k) => {
            const c = k % 10;
            const r = Math.floor(k / 10);
            const x = c * 180;
            const y = r * 180;
            const o1 = f2(0.12 + rnd(k + 1) * 0.6);
            const o2 = f2(0.12 + rnd(k + 77) * 0.6);
            return (
              `<path d="M${x} ${y}H${x + 180}L${x} ${y + 180}z" fill="${(k + r) % 2 ? a : b}" opacity="${o1}"/>` +
              `<path d="M${x + 180} ${y}V${y + 180}H${x}z" fill="${(k + r) % 2 ? b : a}" opacity="${o2}"/>`
            );
          }).join(""),
      );
    case "bokeh":
      return svgDoc(
        W,
        H,
        `<defs><filter id="bk"><feGaussianBlur stdDeviation="5"/></filter></defs>` +
          `<rect width="${W}" height="${H}" fill="${dark}"/>` +
          Array.from(
            { length: 28 },
            (_, k) =>
              `<circle cx="${f2(rnd(k * 3 + 1) * W)}" cy="${f2(rnd(k * 3 + 2) * H)}" r="${f2(30 + rnd(k * 3 + 3) * 90)}" fill="${[a, b, "#ffffff"][k % 3]}" opacity="${f2(0.14 + rnd(k + 9) * 0.34)}" filter="url(#bk)"/>`,
          ).join(""),
      );
    case "circuit": {
      const paths = [
        "M0 160H320L400 240H760L820 180H1180",
        "M0 330H220L300 410H640L720 330H1020L1100 410H1500",
        "M300 900V700L380 620H900L980 540H1400L1480 460H1800",
        "M1800 120H1500L1420 200H1100",
        "M0 560H260L340 640H520",
        "M1000 900V760L1060 700H1400L1460 760H1800",
        "M600 0V120L660 180H900",
      ];
      const nodes = [
        [1180, 180],
        [1500, 410],
        [1800, 460],
        [1100, 200],
        [520, 640],
        [1800, 760],
        [900, 180],
        [380, 620],
        [1060, 700],
      ];
      return svgDoc(
        W,
        H,
        `<rect width="${W}" height="${H}" fill="${dark}"/>` +
          paths
            .map(
              (d) =>
                `<path d="${d}" fill="none" stroke="${a}" stroke-width="4" opacity="0.75" stroke-linejoin="round"/>`,
            )
            .join("") +
          nodes
            .map(
              ([x, y]) =>
                `<circle cx="${x}" cy="${y}" r="11" fill="${dark}" stroke="${b}" stroke-width="4"/>`,
            )
            .join(""),
      );
    }
    case "pastel":
      return svgDoc(
        W,
        H,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="50%" stop-color="#f0abfc"/><stop offset="100%" stop-color="${b}"/></linearGradient>` +
          `<radialGradient id="r" cx="0.2" cy="0.2" r="0.6"><stop offset="0%" stop-color="#fff" stop-opacity="0.55"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#s)"/><rect width="${W}" height="${H}" fill="url(#r)"/>`,
      );
    default:
      return svgDoc(W, H, `<rect width="${W}" height="${H}" fill="${dark}"/>`);
  }
}

// ─────────────────────────────────────────────
// BACKGROUNDS
// ─────────────────────────────────────────────

type BackgroundStyle =
  | "mesh"
  | "dots"
  | "stripes"
  | "topo"
  | "grain"
  | "beams"
  | "waves"
  | "hexgrid"
  | "circles"
  | "spotlight"
  | "blobs"
  | "checker"
  | "zigzag"
  | "confetti"
  | "crosshatch"
  | "noise";

interface BackgroundSpec {
  id: string;
  label: string;
  style: BackgroundStyle;
}

const BACKGROUNDS: BackgroundSpec[] = [
  { id: "background-mesh", label: "Soft Mesh", style: "mesh" },
  { id: "background-dots", label: "Dot Grid", style: "dots" },
  { id: "background-stripes", label: "Stripes", style: "stripes" },
  { id: "background-topo", label: "Topographic", style: "topo" },
  { id: "background-grain", label: "Film Grain", style: "grain" },
  { id: "background-beams", label: "Light Beams", style: "beams" },
  { id: "background-waves", label: "Layered Waves", style: "waves" },
  { id: "background-hexgrid", label: "Honeycomb", style: "hexgrid" },
  { id: "background-circles", label: "Concentric", style: "circles" },
  { id: "background-spotlight", label: "Spotlight", style: "spotlight" },
  { id: "background-blobs", label: "Organic Blobs", style: "blobs" },
  { id: "background-checker", label: "Checker", style: "checker" },
  { id: "background-zigzag", label: "Zigzag", style: "zigzag" },
  { id: "background-confetti", label: "Confetti", style: "confetti" },
  { id: "background-crosshatch", label: "Crosshatch", style: "crosshatch" },
  { id: "background-noise", label: "Dark Noise", style: "noise" },
];

function hexPath(cx: number, cy: number, r: number): string {
  const w = 0.866 * r;
  return `M${f2(cx)} ${f2(cy - r)}L${f2(cx + w)} ${f2(cy - r / 2)}L${f2(cx + w)} ${f2(cy + r / 2)}L${f2(cx)} ${f2(cy + r)}L${f2(cx - w)} ${f2(cy + r / 2)}L${f2(cx - w)} ${f2(cy - r / 2)}z`;
}

function backgroundSVG(spec: BackgroundSpec, i: number): string {
  const [a, b, dark] = palette(i + 6);
  const S = 1200;
  switch (spec.style) {
    case "mesh":
      return svgDoc(
        S,
        S,
        `<defs><filter id="bl"><feGaussianBlur stdDeviation="80"/></filter></defs>` +
          `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          `<circle cx="320" cy="300" r="300" fill="${a}" filter="url(#bl)" opacity="0.85"/>` +
          `<circle cx="880" cy="760" r="340" fill="${b}" filter="url(#bl)" opacity="0.8"/>` +
          `<circle cx="900" cy="280" r="200" fill="#ffffff" filter="url(#bl)" opacity="0.2"/>`,
      );
    case "dots":
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          `<defs><pattern id="d" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="30" cy="30" r="3" fill="${a}" opacity="0.6"/></pattern></defs>` +
          `<rect width="${S}" height="${S}" fill="url(#d)"/>` +
          `<circle cx="600" cy="600" r="260" fill="${b}" opacity="0.16"/>`,
      );
    case "stripes":
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          `<defs><pattern id="st" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="24" height="48" fill="${a}" opacity="0.45"/></pattern></defs>` +
          `<rect width="${S}" height="${S}" fill="url(#st)"/>` +
          `<rect width="${S}" height="${S}" fill="${b}" opacity="0.12"/>`,
      );
    case "topo":
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          Array.from({ length: 12 }, (_, k) => {
            const r = 80 + k * 46;
            return `<ellipse cx="600" cy="600" rx="${r}" ry="${f2(r * 0.72)}" fill="none" stroke="${k % 2 ? a : b}" stroke-width="3" opacity="${(0.55 - k * 0.03).toFixed(2)}"/>`;
          }).join("") +
          `<circle cx="600" cy="600" r="14" fill="${a}"/>`,
      );
    case "grain":
      return svgDoc(
        S,
        S,
        `<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient>` +
          `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs>` +
          `<rect width="${S}" height="${S}" fill="url(#s)" opacity="0.85"/>` +
          `<rect width="${S}" height="${S}" filter="url(#n)" opacity="0.35"/>`,
      );
    case "beams":
      return svgDoc(
        S,
        S,
        `<defs><linearGradient id="bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>` +
          `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          Array.from({ length: 7 }, (_, k) => {
            const x = 100 + k * 150;
            return `<path d="M${x} 0 L${x + 90} 0 L${x - 120} ${S} L${x - 210} ${S}z" fill="url(#bm)" opacity="${(0.5 - k * 0.045).toFixed(2)}"/>`;
          }).join("") +
          `<rect width="${S}" height="${S}" fill="${a}" opacity="0.12"/>`,
      );
    case "waves":
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          [0, 1, 2, 3, 4, 5]
            .map((k) => {
              const y = 300 + k * 140;
              return `<path d="M0 ${y} Q150 ${y - 70} 300 ${y} T600 ${y} T900 ${y} T1200 ${y} V${S} H0z" fill="${k % 2 ? b : a}" opacity="${(0.14 + k * 0.1).toFixed(2)}"/>`;
            })
            .join(""),
      );
    case "hexgrid": {
      const r = 40;
      const w = 1.732 * r;
      const h = 3 * r;
      const cells = [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
        [w / 2, h / 2],
      ]
        .map(([cx, cy]) => hexPath(cx, cy, r - 3))
        .join("");
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          `<defs><pattern id="hx" width="${f2(w)}" height="${h}" patternUnits="userSpaceOnUse"><path d="${cells}" fill="none" stroke="${a}" stroke-width="2.5" opacity="0.55"/></pattern></defs>` +
          `<rect width="${S}" height="${S}" fill="url(#hx)"/>` +
          `<circle cx="900" cy="300" r="320" fill="${b}" opacity="0.14"/>`,
      );
    }
    case "circles":
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          Array.from(
            { length: 11 },
            (_, k) =>
              `<circle cx="820" cy="400" r="${90 + k * 62}" fill="none" stroke="${k % 2 ? a : b}" stroke-width="2.5" opacity="${(0.7 - k * 0.055).toFixed(2)}"/>`,
          ).join("") +
          `<circle cx="820" cy="400" r="46" fill="${a}"/>`,
      );
    case "spotlight":
      return svgDoc(
        S,
        S,
        `<defs><radialGradient id="sp" cx="0.5" cy="0.25" r="0.75"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="55%" stop-color="${a}" stop-opacity="0.18"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient></defs>` +
          `<rect width="${S}" height="${S}" fill="${dark}"/><rect width="${S}" height="${S}" fill="url(#sp)"/>`,
      );
    case "blobs":
      return svgDoc(
        S,
        S,
        `<defs><linearGradient id="b1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs>` +
          `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          `<path transform="translate(40 40)" d="M320 120C520 40 720 160 700 340 680 520 480 580 320 520 160 460 120 200 320 120z" fill="url(#b1)" opacity="0.9"/>` +
          `<path transform="translate(520 560) scale(0.8)" d="M320 120C520 40 720 160 700 340 680 520 480 580 320 520 160 460 120 200 320 120z" fill="${b}" opacity="0.55"/>` +
          `<path transform="translate(700 -20) scale(0.5)" d="M320 120C520 40 720 160 700 340 680 520 480 580 320 520 160 460 120 200 320 120z" fill="${a}" opacity="0.5"/>`,
      );
    case "checker":
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          `<defs><pattern id="ck" width="120" height="120" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="${a}" opacity="0.28"/><rect x="60" y="60" width="60" height="60" fill="${b}" opacity="0.28"/></pattern></defs>` +
          `<rect width="${S}" height="${S}" fill="url(#ck)"/>`,
      );
    case "zigzag":
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          `<defs><pattern id="zz" width="60" height="40" patternUnits="userSpaceOnUse"><path d="M0 30 15 10 30 30 45 10 60 30" fill="none" stroke="${a}" stroke-width="4" stroke-linejoin="round" opacity="0.6"/></pattern></defs>` +
          `<rect width="${S}" height="${S}" fill="url(#zz)"/>`,
      );
    case "confetti":
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          Array.from({ length: 90 }, (_, k) => {
            const col = [a, b, "#ffffff", "#fbbf24"][k % 4];
            return `<rect x="${f2(rnd(k + 1) * S)}" y="${f2(rnd(k + 301) * S)}" width="${f2(12 + rnd(k + 5) * 20)}" height="${f2(6 + rnd(k + 9) * 8)}" rx="3" fill="${col}" opacity="${f2(0.5 + rnd(k + 11) * 0.5)}" transform="rotate(${f2(rnd(k + 17) * 360)} ${f2(rnd(k + 1) * S)} ${f2(rnd(k + 301) * S)})"/>`;
          }).join(""),
      );
    case "crosshatch":
      return svgDoc(
        S,
        S,
        `<rect width="${S}" height="${S}" fill="${dark}"/>` +
          `<defs><pattern id="ch" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M0 0 36 36M36 0 0 36" stroke="${a}" stroke-width="1.5" opacity="0.4"/></pattern></defs>` +
          `<rect width="${S}" height="${S}" fill="url(#ch)"/><rect width="${S}" height="${S}" fill="${b}" opacity="0.1"/>`,
      );
    case "noise":
      return svgDoc(
        S,
        S,
        `<defs><radialGradient id="vg" cx="0.5" cy="0.5" r="0.75"><stop offset="40%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.6"/></radialGradient>` +
          `<filter id="n2"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs>` +
          `<rect width="${S}" height="${S}" fill="${dark}"/><rect width="${S}" height="${S}" filter="url(#n2)" opacity="0.28"/><rect width="${S}" height="${S}" fill="url(#vg)"/>`,
      );
    default:
      return svgDoc(S, S, `<rect width="${S}" height="${S}" fill="${dark}"/>`);
  }
}

// ─────────────────────────────────────────────
// SOCIAL (1200×630)
// ─────────────────────────────────────────────

type SocialStyle =
  | "gradient"
  | "split"
  | "minimal"
  | "mesh"
  | "stripe"
  | "circle"
  | "grid"
  | "neon";

interface SocialSpec {
  id: string;
  label: string;
  style: SocialStyle;
}

const SOCIALS: SocialSpec[] = [
  { id: "social-gradient", label: "Gradient Headline", style: "gradient" },
  { id: "social-split", label: "Split Panel", style: "split" },
  { id: "social-minimal", label: "Minimal Light", style: "minimal" },
  { id: "social-mesh", label: "Mesh Centered", style: "mesh" },
  { id: "social-stripe", label: "Stripe Band", style: "stripe" },
  { id: "social-circle", label: "Circle Focus", style: "circle" },
  { id: "social-grid", label: "Tech Grid", style: "grid" },
  { id: "social-neon", label: "Neon Night", style: "neon" },
];

function socialSVG(spec: SocialSpec, i: number): string {
  const [a, b, dark] = palette(i + 3);
  const W = 1200;
  const H = 630;
  const t = (
    x: number,
    y: number,
    s: string,
    size: number,
    weight: number,
    fill: string,
    anchor = "start",
    extra = "",
  ) =>
    `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${extra}>${escapeText(s)}</text>`;
  const lg = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient>`;

  switch (spec.style) {
    case "gradient":
      return svgDoc(
        W,
        H,
        `<defs>${lg}</defs><rect width="${W}" height="${H}" fill="url(#g)"/>` +
          `<circle cx="1000" cy="130" r="300" fill="#fff" opacity="0.08"/><circle cx="1120" cy="560" r="200" fill="#fff" opacity="0.08"/>` +
          t(80, 270, "Your headline", 96, 800, "#fff") +
          t(80, 375, "goes right here", 96, 800, "#fff") +
          t(
            84,
            470,
            "yourbrand.com",
            34,
            500,
            "#fff",
            "start",
            `fill-opacity="0.8"`,
          ),
      );
    case "split":
      return svgDoc(
        W,
        H,
        `<defs>${lg}</defs><rect width="${W}" height="${H}" fill="${dark}"/>` +
          `<path d="M660 0H1200V630H520z" fill="url(#g)"/><circle cx="930" cy="315" r="130" fill="#fff" opacity="0.14"/><circle cx="930" cy="315" r="60" fill="#fff" opacity="0.28"/>` +
          t(70, 250, "Your headline", 80, 800, "#fff") +
          t(70, 345, "goes here", 80, 800, a) +
          t(74, 430, "yourbrand.com", 30, 500, "#94a3b8"),
      );
    case "minimal":
      return svgDoc(
        W,
        H,
        `<rect width="${W}" height="${H}" fill="#f8fafc"/><rect x="80" y="170" width="90" height="10" rx="5" fill="${a}"/>` +
          `<circle cx="990" cy="315" r="170" fill="none" stroke="${a}" stroke-width="16" opacity="0.8"/><circle cx="1040" cy="355" r="110" fill="${b}" opacity="0.25"/>` +
          t(80, 290, "Your headline", 88, 800, "#0f172a") +
          t(80, 385, "goes right here", 88, 800, "#0f172a") +
          t(84, 470, "yourbrand.com", 32, 500, "#64748b"),
      );
    case "mesh":
      return svgDoc(
        W,
        H,
        `<defs><filter id="bl"><feGaussianBlur stdDeviation="70"/></filter></defs><rect width="${W}" height="${H}" fill="${dark}"/>` +
          `<circle cx="260" cy="170" r="260" fill="${a}" filter="url(#bl)" opacity="0.85"/><circle cx="980" cy="470" r="300" fill="${b}" filter="url(#bl)" opacity="0.8"/>` +
          t(600, 300, "Your headline goes here", 74, 800, "#fff", "middle") +
          t(
            600,
            385,
            "A short supporting line for your post",
            32,
            500,
            "#fff",
            "middle",
            `fill-opacity="0.8"`,
          ) +
          t(
            600,
            520,
            "yourbrand.com",
            28,
            600,
            "#fff",
            "middle",
            `letter-spacing="4" fill-opacity="0.7"`,
          ),
      );
    case "stripe":
      return svgDoc(
        W,
        H,
        `<rect width="${W}" height="${H}" fill="${dark}"/>` +
          `<defs><pattern id="st" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="22" height="46" fill="${a}" opacity="0.35"/></pattern></defs>` +
          `<rect width="${W}" height="${H}" fill="url(#st)"/><rect y="170" width="${W}" height="290" fill="${dark}" opacity="0.88"/><rect y="170" width="14" height="290" fill="${b}"/>` +
          t(80, 290, "Your headline goes here", 72, 800, "#fff") +
          t(84, 370, "yourbrand.com", 32, 500, a),
      );
    case "circle":
      return svgDoc(
        W,
        H,
        `<defs>${lg}</defs><rect width="${W}" height="${H}" fill="${dark}"/>` +
          `<circle cx="880" cy="315" r="270" fill="url(#g)"/><circle cx="880" cy="315" r="170" fill="${dark}" opacity="0.28"/>` +
          t(70, 270, "Your headline", 84, 800, "#fff") +
          t(70, 365, "goes here", 84, 800, "#fff") +
          t(74, 445, "yourbrand.com", 30, 500, "#94a3b8"),
      );
    case "grid":
      return svgDoc(
        W,
        H,
        `<defs><radialGradient id="gl" cx="0.5" cy="0.5" r="0.6"><stop offset="0%" stop-color="${a}" stop-opacity="0.4"/><stop offset="100%" stop-color="${a}" stop-opacity="0"/></radialGradient>` +
          `<pattern id="gp" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="${a}" stroke-width="1" opacity="0.28"/></pattern></defs>` +
          `<rect width="${W}" height="${H}" fill="${dark}"/><rect width="${W}" height="${H}" fill="url(#gp)"/><rect width="${W}" height="${H}" fill="url(#gl)"/>` +
          t(600, 290, "Your headline goes here", 74, 800, "#fff", "middle") +
          t(
            600,
            370,
            "yourbrand.com",
            30,
            500,
            a,
            "middle",
            `letter-spacing="3"`,
          ),
      );
    case "neon":
      return svgDoc(
        W,
        H,
        `<defs><filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
          `<rect width="${W}" height="${H}" fill="#05060a"/>` +
          `<rect x="60" y="60" width="1080" height="510" rx="28" fill="none" stroke="${b}" stroke-width="5" filter="url(#gl)"/>` +
          t(
            600,
            300,
            "YOUR HEADLINE",
            92,
            900,
            "#fff",
            "middle",
            `letter-spacing="6" filter="url(#gl)"`,
          ) +
          t(
            600,
            390,
            "GOES HERE",
            92,
            900,
            a,
            "middle",
            `letter-spacing="6" filter="url(#gl)"`,
          ) +
          t(
            600,
            500,
            "yourbrand.com",
            28,
            600,
            "#94a3b8",
            "middle",
            `letter-spacing="4"`,
          ),
      );
    default:
      return svgDoc(W, H, `<rect width="${W}" height="${H}" fill="${dark}"/>`);
  }
}

// ─────────────────────────────────────────────
// MOTION (Lottie JSON)
// ─────────────────────────────────────────────

type MotionStyle =
  | "orbit"
  | "arc"
  | "equalizer"
  | "breathe"
  | "dots"
  | "ripple"
  | "bounce"
  | "heart"
  | "flip"
  | "trio"
  | "pendulum";

interface MotionSpec {
  id: string;
  label: string;
  style: MotionStyle;
  color: string;
  frames: number;
}

const MOTIONS: MotionSpec[] = [
  {
    id: "motion-pulse-orbit",
    label: "Pulse Orbit",
    style: "orbit",
    color: "#5fcdd9",
    frames: 90,
  },
  {
    id: "motion-spinner",
    label: "Arc Spinner",
    style: "arc",
    color: "#a78bfa",
    frames: 60,
  },
  {
    id: "motion-equalizer",
    label: "Equalizer",
    style: "equalizer",
    color: "#34d399",
    frames: 60,
  },
  {
    id: "motion-breathe",
    label: "Breathe",
    style: "breathe",
    color: "#f472b6",
    frames: 80,
  },
  {
    id: "motion-dots",
    label: "Bouncing Dots",
    style: "dots",
    color: "#fbbf24",
    frames: 60,
  },
  {
    id: "motion-ripple",
    label: "Ripple",
    style: "ripple",
    color: "#38bdf8",
    frames: 90,
  },
  {
    id: "motion-bounce",
    label: "Bouncing Ball",
    style: "bounce",
    color: "#fb7185",
    frames: 60,
  },
  {
    id: "motion-heartbeat",
    label: "Heartbeat",
    style: "heart",
    color: "#f43f5e",
    frames: 60,
  },
  {
    id: "motion-flip",
    label: "Flip Square",
    style: "flip",
    color: "#818cf8",
    frames: 60,
  },
  {
    id: "motion-trio",
    label: "Orbit Trio",
    style: "trio",
    color: "#2dd4bf",
    frames: 120,
  },
  {
    id: "motion-pendulum",
    label: "Pendulum",
    style: "pendulum",
    color: "#f97316",
    frames: 90,
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

const EASE_SMOOTH = { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] } };
const EASE_LINEAR = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } };
const EASE_IN = { i: { x: [0.68], y: [0.53] }, o: { x: [0.55], y: [0.085] } };
const EASE_OUT = { i: { x: [0.45], y: [0.94] }, o: { x: [0.25], y: [0.46] } };
type EaseKind = "smooth" | "linear" | "in" | "out";
const EASES = {
  smooth: EASE_SMOOTH,
  linear: EASE_LINEAR,
  in: EASE_IN,
  out: EASE_OUT,
};

/** Builds an animated Lottie property. Each frame: [time, value[], easing-to-next]. */
const anim = (frames: [number, number[], EaseKind?][]) => {
  const clean = frames.filter(
    (f, idx) => idx === 0 || f[0] > frames[idx - 1][0],
  );
  return {
    a: 1,
    k: clean.map(([t, s, ease], idx) => {
      const next = clean[idx + 1];
      return next ? { t, s, e: next[1], ...EASES[ease ?? "smooth"] } : { t, s };
    }),
  };
};
const still = (k: unknown) => ({ a: 0, k });

function motionJSON(spec: MotionSpec): Record<string, unknown> {
  const [r, g, b] = hexToRgb(spec.color).map((v) => Number(v.toFixed(4)));
  const color = [r, g, b, 1];
  const fr = 30;
  const op = spec.frames;

  let ind = 0;
  const layer = (
    nm: string,
    shapes: unknown[],
    ks: Record<string, unknown> = {},
  ) => ({
    ddd: 0,
    ind: ++ind,
    ty: 4,
    nm,
    sr: 1,
    ks: {
      o: still(100),
      r: still(0),
      p: still([512, 512, 0]),
      a: still([0, 0, 0]),
      s: still([100, 100, 100]),
      ...ks,
    },
    ao: 0,
    shapes,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  });

  const group = (items: unknown[], tr: Record<string, unknown> = {}) => ({
    ty: "gr",
    it: [
      ...items,
      {
        ty: "tr",
        p: still([0, 0]),
        a: still([0, 0]),
        s: still([100, 100]),
        r: still(0),
        o: still(100),
        ...tr,
      },
    ],
  });
  const ellipse = (w: number, h: number, x = 0, y = 0) => ({
    ty: "el",
    p: still([x, y]),
    s: still([w, h]),
  });
  const rect = (w: number, h: number, x = 0, y = 0, rad = 0) => ({
    ty: "rc",
    p: still([x, y]),
    s: still([w, h]),
    r: still(rad),
  });
  const stroke = (w: number, o = 100) => ({
    ty: "st",
    c: still(color),
    o: still(o),
    w: still(w),
    lc: 2,
    lj: 2,
  });
  const fill = (o = 100) => ({ ty: "fl", c: still(color), o: still(o) });
  const trim = (end: number) => ({
    ty: "tm",
    s: still(0),
    e: still(end),
    o: still(0),
    m: 1,
  });

  const layers: unknown[] = [];
  const lin = (from: number, to: number): Record<string, unknown> => ({
    r: anim([
      [0, [from], "linear"],
      [op, [to]],
    ]),
  });

  switch (spec.style) {
    case "orbit":
      layers.push(
        layer("Dot", [group([ellipse(40, 40, 120, 0), fill()])], lin(0, 360)),
      );
      layers.push(layer("Ring", [group([ellipse(240, 240), stroke(12, 35)])]));
      layers.push(
        layer("Core", [group([ellipse(70, 70), fill()])], {
          s: anim([
            [0, [90, 90, 100]],
            [op / 2, [120, 120, 100]],
            [op, [90, 90, 100]],
          ]),
        }),
      );
      break;
    case "arc":
      layers.push(
        layer(
          "Arc",
          [group([ellipse(220, 220), stroke(26), trim(30)])],
          lin(0, 360),
        ),
      );
      layers.push(layer("Track", [group([ellipse(220, 220), stroke(26, 18)])]));
      break;
    case "equalizer":
      for (let k = 0; k < 5; k++) {
        const dl = k * 6;
        layers.push(
          layer(`Bar ${k + 1}`, [group([rect(38, 200, 0, -100, 14), fill()])], {
            p: still([512 + (k - 2) * 66, 612, 0]),
            s: anim([
              [0, [100, 35, 100]],
              [dl, [100, 35, 100]],
              [dl + 15, [100, 100, 100]],
              [dl + 30, [100, 35, 100]],
              [op, [100, 35, 100]],
            ]),
          }),
        );
      }
      break;
    case "breathe":
      layers.push(
        layer("Glow", [group([ellipse(260, 260), fill(30)])], {
          s: anim([
            [0, [120, 120, 100]],
            [op / 2, [90, 90, 100]],
            [op, [120, 120, 100]],
          ]),
        }),
      );
      layers.push(
        layer("Orb", [group([ellipse(180, 180), fill()])], {
          s: anim([
            [0, [90, 90, 100]],
            [op / 2, [115, 115, 100]],
            [op, [90, 90, 100]],
          ]),
        }),
      );
      break;
    case "dots":
      for (let k = 0; k < 3; k++) {
        const dl = k * 10;
        layers.push(
          layer(`Dot ${k + 1}`, [group([ellipse(56, 56), fill()])], {
            p: still([512 + (k - 1) * 90, 512, 0]),
            s: anim([
              [0, [60, 60, 100]],
              [dl, [60, 60, 100]],
              [dl + 15, [130, 130, 100]],
              [dl + 30, [60, 60, 100]],
              [op, [60, 60, 100]],
            ]),
          }),
        );
      }
      break;
    case "ripple":
      layers.push(layer("Core", [group([ellipse(60, 60), fill()])]));
      layers.push(
        layer("Ring A", [group([ellipse(300, 300), stroke(10)])], {
          s: anim([
            [0, [20, 20, 100], "out"],
            [op, [110, 110, 100]],
          ]),
          o: anim([
            [0, [100]],
            [op, [0]],
          ]),
        }),
      );
      layers.push(
        layer("Ring B", [group([ellipse(300, 300), stroke(10)])], {
          s: anim([
            [0, [65, 65, 100], "out"],
            [op / 2, [110, 110, 100], "linear"],
            [op / 2 + 1, [20, 20, 100], "out"],
            [op, [65, 65, 100]],
          ]),
          o: anim([
            [0, [50]],
            [op / 2, [0], "linear"],
            [op / 2 + 1, [100]],
            [op, [50]],
          ]),
        }),
      );
      break;
    case "bounce":
      layers.push(
        layer("Ball", [group([ellipse(90, 90), fill()])], {
          p: anim([
            [0, [512, 290, 0], "in"],
            [op / 2, [512, 690, 0], "out"],
            [op, [512, 290, 0]],
          ]),
          s: anim([
            [0, [100, 100, 100]],
            [op / 2 - 4, [90, 115, 100]],
            [op / 2, [125, 75, 100]],
            [op / 2 + 6, [90, 115, 100]],
            [op, [100, 100, 100]],
          ]),
        }),
      );
      layers.push(
        layer("Shadow", [group([ellipse(120, 24), fill(30)])], {
          p: still([512, 760, 0]),
          s: anim([
            [0, [40, 40, 100], "out"],
            [op / 2, [100, 100, 100], "in"],
            [op, [40, 40, 100]],
          ]),
        }),
      );
      break;
    case "heart":
      layers.push(
        layer(
          "Heart",
          [
            group([rect(150, 150), fill()], { r: still(45) }),
            group([ellipse(150, 150, -53, -53), fill()], { p: still([0, 0]) }),
            group([ellipse(150, 150, 53, -53), fill()], { p: still([0, 0]) }),
          ],
          {
            p: still([512, 540, 0]),
            s: anim([
              [0, [100, 100, 100]],
              [8, [122, 122, 100]],
              [14, [100, 100, 100]],
              [22, [114, 114, 100]],
              [30, [100, 100, 100]],
              [op, [100, 100, 100]],
            ]),
          },
        ),
      );
      break;
    case "flip":
      layers.push(
        layer("Square", [group([rect(160, 160, 0, 0, 36), fill()])], {
          r: anim([
            [0, [0]],
            [op / 2, [180]],
            [op, [360]],
          ]),
          s: anim([
            [0, [100, 100, 100]],
            [op / 4, [70, 70, 100]],
            [op / 2, [100, 100, 100]],
            [(3 * op) / 4, [70, 70, 100]],
            [op, [100, 100, 100]],
          ]),
        }),
      );
      break;
    case "trio":
      layers.push(
        layer("Rings", [
          group([ellipse(140, 140), stroke(6, 20)]),
          group([ellipse(220, 220), stroke(6, 20)]),
          group([ellipse(300, 300), stroke(6, 20)]),
        ]),
      );
      [70, 110, 150].forEach((rad, k) => {
        layers.push(
          layer(
            `Orbit ${k + 1}`,
            [group([ellipse(36, 36, rad, 0), fill()])],
            lin(k * 60, k * 60 + (k === 1 ? -720 : 360) * (k === 2 ? 1 : 1)),
          ),
        );
      });
      break;
    case "pendulum":
      layers.push(
        layer(
          "Pendulum",
          [
            group([
              {
                ty: "sh",
                ks: {
                  a: 0,
                  k: {
                    c: false,
                    v: [
                      [0, 0],
                      [0, 260],
                    ],
                    i: [
                      [0, 0],
                      [0, 0],
                    ],
                    o: [
                      [0, 0],
                      [0, 0],
                    ],
                  },
                },
              },
              stroke(8),
            ]),
            group([ellipse(84, 84, 0, 296), fill()]),
            group([ellipse(26, 26, 0, 0), fill()]),
          ],
          {
            p: still([512, 220, 0]),
            r: anim([
              [0, [-35]],
              [op / 2, [35]],
              [op, [-35]],
            ]),
          },
        ),
      );
      break;
  }

  return {
    v: "5.12.2",
    fr,
    ip: 0,
    op,
    w: 1024,
    h: 1024,
    nm: spec.label,
    ddd: 0,
    assets: [],
    layers,
  };
}

// ─────────────────────────────────────────────
// SOUND (WAV)
// ─────────────────────────────────────────────

interface SoundSpec {
  id: string;
  label: string;
  freq: number;
  duration: number;
  meta: string;
  wave?: SoundWave;
  mode?: SoundMode;
  notes?: number[];
}

const SOUNDS: SoundSpec[] = [
  {
    id: "sound-arpeggio",
    label: "Arpeggio",
    freq: 523.25,
    duration: 2,
    meta: "Arpeggio · 2 s",
    mode: "arp",
    wave: "triangle",
    notes: [523.25, 659.25, 783.99, 1046.5],
  },
  {
    id: "sound-bass",
    label: "Sub Bass",
    freq: 87.31,
    duration: 1.5,
    meta: "Tone · 1.5 s",
  },
  {
    id: "sound-bell",
    label: "Bell",
    freq: 987.77,
    duration: 1.2,
    meta: "Tone · 1.2 s",
  },
  {
    id: "sound-chime",
    label: "Chime",
    freq: 783.99,
    duration: 1.8,
    meta: "Tone · 1.8 s",
  },
  {
    id: "sound-major",
    label: "Major Chord",
    freq: 261.63,
    duration: 2.2,
    meta: "Chord · 2.2 s",
    mode: "chord",
    notes: [261.63, 329.63, 392],
  },
  {
    id: "sound-minor",
    label: "Minor Chord",
    freq: 261.63,
    duration: 2.2,
    meta: "Chord · 2.2 s",
    mode: "chord",
    notes: [261.63, 311.13, 392],
  },
  {
    id: "sound-pad",
    label: "Soft Pad",
    freq: 220,
    duration: 3,
    meta: "Chord · 3 s",
    mode: "chord",
    wave: "triangle",
    notes: [220, 277.18, 329.63, 440],
  },
  {
    id: "sound-rise",
    label: "Rising Sweep",
    freq: 200,
    duration: 1.6,
    meta: "Sweep · 1.6 s",
    mode: "sweep",
    wave: "saw",
    notes: [200, 1800],
  },
  {
    id: "sound-fall",
    label: "Falling Sweep",
    freq: 1600,
    duration: 1.4,
    meta: "Sweep · 1.4 s",
    mode: "sweep",
    wave: "sine",
    notes: [1600, 150],
  },
  {
    id: "sound-beep",
    label: "Pulse Beep",
    freq: 880,
    duration: 1.5,
    meta: "Pulse · 1.5 s",
    mode: "pulse",
    wave: "square",
  },
  {
    id: "sound-notify",
    label: "Notification",
    freq: 880,
    duration: 0.7,
    meta: "Alert · 0.7 s",
    mode: "arp",
    wave: "sine",
    notes: [880, 1318.5],
  },
  {
    id: "sound-success",
    label: "Success",
    freq: 523.25,
    duration: 0.9,
    meta: "Alert · 0.9 s",
    mode: "arp",
    wave: "triangle",
    notes: [523.25, 659.25, 783.99],
  },
  {
    id: "sound-error",
    label: "Error Buzz",
    freq: 196,
    duration: 0.6,
    meta: "Alert · 0.6 s",
    mode: "arp",
    wave: "square",
    notes: [196, 146.83],
  },
  {
    id: "sound-kick",
    label: "Kick Drum",
    freq: 160,
    duration: 0.5,
    meta: "Drum · 0.5 s",
    mode: "sweep",
    wave: "sine",
    notes: [160, 45],
  },
  {
    id: "sound-laser",
    label: "Laser Zap",
    freq: 2000,
    duration: 0.35,
    meta: "FX · 0.35 s",
    mode: "sweep",
    wave: "square",
    notes: [2000, 160],
  },
  {
    id: "sound-ding",
    label: "Ding",
    freq: 1318.51,
    duration: 0.8,
    meta: "Tone · 0.8 s",
    wave: "triangle",
  },
];

const osc = (w: SoundWave, p: number): number => {
  const f = p - Math.floor(p);
  switch (w) {
    case "sine":
      return Math.sin(2 * Math.PI * f);
    case "triangle":
      return 1 - 4 * Math.abs(f - 0.5);
    case "square":
      return f < 0.5 ? 1 : -1;
    case "saw":
      return 2 * f - 1;
  }
};

// ─────────────────────────────────────────────
// SERIALISATION
// ─────────────────────────────────────────────

function makeFile(parts: BlobPart[], name: string, type: string): File {
  return new File(parts, name, { type });
}

export function svgToFile(sample: SampleImage): File {
  return makeFile([sample.svg], `${sample.name}.svg`, "image/svg+xml");
}

export function lottieToFile(sample: SampleMotion): File {
  return makeFile(
    [JSON.stringify(sample.json, null, 2)],
    `${sample.name}.json`,
    "application/json",
  );
}

export function wavToFile(sample: SampleSound): File {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * sample.duration);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let pos = 0;
  const put = (s: string) => {
    for (let k = 0; k < s.length; k++) view.setUint8(pos++, s.charCodeAt(k));
  };

  put("RIFF");
  view.setUint32(pos, 36 + dataSize, true);
  pos += 4;
  put("WAVE");
  put("fmt ");
  view.setUint32(pos, 16, true);
  pos += 4;
  view.setUint16(pos, 1, true);
  pos += 2;
  view.setUint16(pos, 1, true);
  pos += 2;
  view.setUint32(pos, sampleRate, true);
  pos += 4;
  view.setUint32(pos, sampleRate * 2, true);
  pos += 4;
  view.setUint16(pos, 2, true);
  pos += 2;
  view.setUint16(pos, 16, true);
  pos += 2;
  put("data");
  view.setUint32(pos, dataSize, true);
  pos += 4;

  const wave = sample.wave ?? "sine";
  const mode = sample.mode ?? "tone";
  const notes = sample.notes?.length ? sample.notes : [sample.freq];
  const dur = sample.duration;
  let sweepPhase = 0;

  for (let k = 0; k < numSamples; k++) {
    const t = k / sampleRate;
    const attack = Math.min(1, t * 40);
    const tail = Math.min(1, (dur - t) * 40); // avoid a click at the very end
    let v = 0;

    if (mode === "tone") {
      const decay = Math.pow(Math.max(0, 1 - t / dur), 1.5);
      v =
        (osc(wave, sample.freq * t) * 0.7 +
          osc("sine", sample.freq * 2 * t) * 0.15) *
        attack *
        decay;
    } else if (mode === "chord") {
      const decay = Math.pow(Math.max(0, 1 - t / dur), 1.2);
      let sum = 0;
      for (const n of notes) sum += osc(wave, n * t);
      v = (sum / notes.length) * 0.9 * attack * decay;
    } else if (mode === "arp") {
      const slice = dur / notes.length;
      const idx = Math.min(Math.floor(t / slice), notes.length - 1);
      const lt = t - idx * slice;
      const env =
        Math.min(1, lt * 120) * Math.pow(Math.max(0, 1 - lt / slice), 1.2);
      v = osc(wave, notes[idx] * lt) * env;
    } else if (mode === "sweep") {
      const f0 = notes[0];
      const f1 = notes[1] ?? notes[0];
      const f = f0 * Math.pow(f1 / f0, t / dur);
      sweepPhase += f / sampleRate;
      const decay = Math.pow(Math.max(0, 1 - t / dur), 0.8);
      v = osc(wave, sweepPhase) * attack * decay;
    } else {
      // pulse – gated beeps at 6 Hz
      const rate = 6;
      const period = 1 / (rate * 2);
      const lt = t % period;
      const on = Math.floor(t / period) % 2 === 0;
      const gate = on
        ? Math.min(1, lt * 300) * Math.min(1, (period - lt) * 300)
        : 0;
      v = osc(wave, sample.freq * t) * gate * Math.max(0, 1 - t / dur);
    }

    const s = Math.max(-1, Math.min(1, v * 0.32 * tail));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return makeFile([buffer], `${sample.name}.wav`, "audio/wav");
}

export function sampleToFile(s: Sample): File {
  if (s.type === "image") return svgToFile(s);
  if (s.type === "motion") return lottieToFile(s);
  return wavToFile(s);
}

// ─────────────────────────────────────────────
// PUBLIC CATALOGUE
// ─────────────────────────────────────────────

const IMAGE_META: Record<SampleImageKind, string> = {
  avatar: "Avatar · round",
  logo: "Logo · mark",
  lockup: "Logo · lockup",
  icon: "App icon · square",
  badge: "Badge · sticker",
  cover: "Cover · 2:1",
  background: "Background · square",
  social: "Social · 1200×630",
};

const img = (
  kind: SampleImageKind,
  id: string,
  label: string,
  svg: string,
): SampleImage => ({
  type: "image",
  id,
  name: id,
  label,
  meta: IMAGE_META[kind],
  kind,
  svg,
});

let imageCache: SampleImage[] | null = null;

function buildImages(): SampleImage[] {
  if (imageCache) return imageCache;
  imageCache = [
    ...AVATARS.map((s, i) => img("avatar", s.id, s.label, avatarSVG(s, i))),
    ...LOGOS.map((s, i) => img("logo", s.id, s.label, logoSVG(s, i))),
    ...LOGOS.map((s, i) =>
      img(
        "lockup",
        `lockup-${s.id.replace("logo-", "")}`,
        s.name,
        lockupSVG(s, i),
      ),
    ),
    ...LOGOS.map((s, i) =>
      img("icon", `icon-${s.id.replace("logo-", "")}`, s.name, iconSVG(s, i)),
    ),
    ...BADGE_SPECS.map((s, i) => img("badge", s.id, s.label, badgeSVG(s, i))),
    ...COVERS.map((s, i) => img("cover", s.id, s.label, coverSVG(s, i))),
    ...BACKGROUNDS.map((s, i) =>
      img("background", s.id, s.label, backgroundSVG(s, i)),
    ),
    ...SOCIALS.map((s, i) => img("social", s.id, s.label, socialSVG(s, i))),
  ];
  return imageCache;
}

function buildMotion(): SampleMotion[] {
  return MOTIONS.map((spec) => ({
    type: "motion" as const,
    id: spec.id,
    name: spec.id,
    label: spec.label,
    meta: `Lottie · ${(spec.frames / 30).toFixed(1)} s`,
    json: motionJSON(spec),
  }));
}

function buildSounds(): SampleSound[] {
  return SOUNDS.map((spec) => ({
    type: "sound" as const,
    id: spec.id,
    name: spec.id,
    label: spec.label,
    meta: spec.meta,
    freq: spec.freq,
    duration: spec.duration,
    wave: spec.wave,
    mode: spec.mode,
    notes: spec.notes,
  }));
}

/** Whole catalogue grouped for the sheet. */
export function getTemplateCategories(): SampleCategory[] {
  const images = buildImages();
  const of = (k: SampleImageKind) => images.filter((s) => s.kind === k);
  return [
    {
      id: "avatar",
      label: "Avatars",
      hint: "Round profile art, ready to crop to a circle.",
      items: of("avatar"),
    },
    {
      id: "logo",
      label: "Logos",
      hint: "Brand marks on a dark card — original, fictional brands.",
      items: of("logo"),
    },
    {
      id: "lockup",
      label: "Brand Lockups",
      hint: "Mark + wordmark + tagline, 1024×512.",
      items: of("lockup"),
    },
    {
      id: "icon",
      label: "App Icons",
      hint: "Gradient squircle tiles with a white glyph.",
      items: of("icon"),
    },
    {
      id: "badge",
      label: "Badges",
      hint: "Seals, ribbons and shields for products and promos.",
      items: of("badge"),
    },
    {
      id: "cover",
      label: "Covers",
      hint: "Wide banners rendered at 1800×900.",
      items: of("cover"),
    },
    {
      id: "background",
      label: "Backgrounds",
      hint: "Square textures and patterns for composites and fills.",
      items: of("background"),
    },
    {
      id: "social",
      label: "Social Cards",
      hint: "Link-preview and post templates at 1200×630.",
      items: of("social"),
    },
    {
      id: "motion",
      label: "Motion",
      hint: "Lottie JSON animations you can re-time.",
      items: buildMotion(),
    },
    {
      id: "sound",
      label: "Sound",
      hint: "Tones, chords, alerts and FX to test the audio studio.",
      items: buildSounds(),
    },
  ];
}

/** Flat list of every image template (kept for convenience). */
export function makeSampleImages(): SampleImage[] {
  return buildImages();
}

/** Motion + sound only. */
export function makeMotionSoundSamples(): (SampleMotion | SampleSound)[] {
  return [...buildMotion(), ...buildSounds()];
}

export const TEMPLATE_COUNT =
  buildImages().length + MOTIONS.length + SOUNDS.length;

export const LOTTIE_SAMPLE_DATA = motionJSON(MOTIONS[0]);
