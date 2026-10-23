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
  Bed,
  BookOpen,
  Building2,
  Bus,
  HandCoins,
  Heart,
  HeartHandshake,
  HeartPulse,
  Home,
  Landmark,
  Languages,
  Library,
  Lightbulb,
  MonitorPlay,
  Moon,
  Network,
  Puzzle,
  School,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  TreePine,
  Utensils,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { FlowIcon } from '@/lib/setup-flow';

const REGISTRY: Record<FlowIcon, LucideIcon> = {
  graduation: School,
  heart: Heart,
  store: Store,
  sparkles: Sparkles,
  handshake: HeartHandshake,
  monitor: MonitorPlay,
  school: School,
  'book-open': BookOpen,
  university: Landmark,
  wrench: Wrench,
  home: Home,
  globe: Languages,
  moon: Moon,
  puzzle: Puzzle,
  bed: Bed,
  users: Users,
  megaphone: Target,
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
  'hand-heart': Heart,
  dove: TreePine,
  building: Building2,
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
