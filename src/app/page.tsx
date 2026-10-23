import Link from 'next/link';
import { ArrowRight, Sparkles, Layers3, Palette, MousePointerClick } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const pillars = [
  {
    title: 'Schema-driven composition',
    description: 'Every block is constrained by manifests. No freeform CSS, just intentional, reusable pieces.',
    icon: Layers3,
  },
  {
    title: 'Live preview parity',
    description: 'What you edit is exactly what the runtime renders. Draft and live stay in perfect sync.',
    icon: MousePointerClick,
  },
  {
    title: 'Token-first theming',
    description: 'Design tokens ripple through the entire experience with instant, global updates.',
    icon: Palette,
  },
];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.18),transparent)] blur-[120px]" />
        <div className="absolute bottom-[-320px] right-[-220px] h-[620px] w-[720px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.14),transparent)] blur-[140px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[color-mix(in_oklab,var(--color-accent)_55%,#312e81)] shadow-[0_20px_60px_-30px_var(--color-accent-glow)]">
            <Sparkles size={16} className="text-[var(--color-accent-foreground)]" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">GN-Apex Workspace Studio</p>
            <p className="text-xs text-[var(--color-ink-faint)]">Schema-driven UI/UX composer</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 text-center sm:px-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-ink-faint)] shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          </span>
          Crafted for precision, tuned for velocity
        </div>
        <h1 className="mt-8 max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
          Compose immersive workspace experiences with cinematic clarity
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-[var(--color-ink-dim)]">
          A glassmorphic, theme-aware studio built for education, non-profit, commerce and partner
          workspaces. Edit with intent, preview with parity, publish with confidence.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/studio"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-2.5 text-sm font-medium"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent)] via-[color-mix(in_oklab,var(--color-accent)_80%,#22d3ee)] to-[var(--color-accent)]" />
            <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent)]" />
            <span className="relative text-[var(--color-accent-foreground)]">Enter the studio</span>
            <ArrowRight size={16} className="relative text-[var(--color-accent-foreground)] transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-6 py-2.5 text-sm text-[var(--color-ink-dim)] backdrop-blur-xl">
            Dark + light • Soft glass • Precision UI
          </div>
        </div>
        <div className="mt-16 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="surface-card relative overflow-hidden rounded-3xl border border-[var(--color-line)] p-6 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/80 to-transparent">
                    <Icon size={18} className="text-[var(--color-accent-foreground)]" />
                  </div>
                  <h3 className="text-base font-medium">{pillar.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="relative z-10 flex items-center justify-between px-6 py-6 text-xs text-[var(--color-ink-faint)] sm:px-10">
        <span>Built for the GN-Apex Workspace Mode</span>
        <span>Minimal, cinematic, relentlessly polished</span>
      </footer>
    </main>
  );
}
