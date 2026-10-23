'use client';

// studio/src/components/setup/icon-bridge.tsx
//
// The flow graph speaks in icon *names* so it stays side-effect free. This
// bridge resolves names to lucide components. Because the React-compiler
// ESLint rule flags "component created during render", the lookup is done
// once at module scope into a plain data table, and rendering goes through
// `createElement` — which the compiler treats as a function call, not a
// component construction.

import { createElement } from 'react';
import {
  Award,
  BadgeCheck,
  Bed,
  Bird,
  BookOpen,
  Building2,
  Bus,
  CalendarDays,
  Compass,
  Contrast,
  Globe,
  GraduationCap,
  HandCoins,
  HandHeart,
  Handshake,
  Heart,
  HeartPulse,
  Home,
  IdCard,
  Images,
  Landmark,
  Languages,
  Layers,
  Library,
  Lightbulb,
  Megaphone,
  MonitorPlay,
  Moon,
  Network,
  Palette,
  Presentation,
  Puzzle,
  Repeat,
  School,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Target,
  TreePine,
  Type,
  Utensils,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { FlowIcon } from '@/lib/setup-flow';

const REGISTRY: Record<FlowIcon, LucideIcon> = {
  graduation: GraduationCap,
  heart: Heart,
  store: Store,
  sparkles: Sparkles,
  handshake: Handshake,
  monitor: MonitorPlay,
  school: School,
  'book-open': BookOpen,
  university: Landmark,
  wrench: Wrench,
  home: Home,
  globe: Globe,
  moon: Moon,
  puzzle: Puzzle,
  bed: Bed,
  users: Users,
  megaphone: Megaphone,
  tree: TreePine,
  network: Network,
  'shield-check': ShieldCheck,
  target: Target,
  lightbulb: Lightbulb,
  languages: Languages,
  library: Library,
  bus: Bus,
  utensils: Utensils,
  heartbeat: HeartPulse,
  'hand-coins': HandCoins,
  'hand-heart': HandHeart,
  dove: Bird,
  building: Building2,
  // Setup-step vocabulary
  cap: GraduationCap,
  palette: Palette,
  layers: Layers,
  slides: Presentation,
  images: Images,
  award: Award,
  calendar: CalendarDays,
  identity: IdCard,
  scroll: ScrollText,
  compass: Compass,
  'badge-check': BadgeCheck,
  contrast: Contrast,
  sliders: SlidersHorizontal,
  repeat: Repeat,
  type: Type,
};

export interface GlyphProps {
  name: FlowIcon;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
  'aria-hidden'?: boolean;
}

export function FlowGlyph(props: GlyphProps): React.ReactElement {
  const { name, size = 16, className, style, strokeWidth, 'aria-hidden': ariaHidden } = props;
  const Icon = REGISTRY[name] ?? Sparkles;
  return createElement(Icon, { size, className, style, strokeWidth, 'aria-hidden': ariaHidden });
}

/** Non-component helper: raw lookup for places that need the type itself. */
export function lookupIcon(name: FlowIcon): LucideIcon {
  return REGISTRY[name] ?? Sparkles;
}
