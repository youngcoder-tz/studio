'use client';

// studio/src/components/panels/seo-panel.tsx
//
// PER-PAGE SEO.
//
// SEO is per page, not per site, because the renderer applies it per route — and
// the fields here are exactly the ones the SDK's `applySeoToDocument` reads. The
// panel shows the *resolved* title and description alongside the authored ones,
// because "why does the preview show a different title than I typed" is the
// single most common SEO confusion, and the answer (a missing page title falls
// back to the site name token) is only obvious when both are visible.

import { Badge } from '@/components/ui/primitives';
import { Field, TextArea, TextInput } from '@/components/ui/input';
import { Switch } from '@/components/ui/controls';
import type { GlobalTokens, PageSeoConfig } from '@/lib/contract';

export function SeoPanel({
  pageKey,
  seo,
  tokens,
  disabled,
  onChange,
}: {
  pageKey: string;
  seo: PageSeoConfig;
  tokens: GlobalTokens;
  disabled?: boolean;
  onChange: (patch: Partial<PageSeoConfig>) => void;
}) {
  const siteName = typeof tokens.siteName === 'string' ? tokens.siteName : 'GN-Apex Workspace';
  const resolvedTitle = seo.title?.trim() || siteName;
  const resolvedDescription =
    seo.description?.trim() ||
    (typeof tokens.tagline === 'string' ? tokens.tagline : '');
  const resolvedImage =
    seo.ogImage?.trim() || (typeof tokens.ogImage === 'string' ? tokens.ogImage : '');

  return (
    <div className="scroll-y h-full space-y-5 p-3">
      <header className="space-y-1">
        <h3 className="text-xs font-semibold tracking-wide text-[var(--color-ink-dim)] uppercase">
          Search & social
        </h3>
        <p className="text-[10px] text-[var(--color-ink-faint)]">
          Applies to <code className="font-mono">/{pageKey}</code> only.
        </p>
      </header>

      {/* A live SERP-style preview. Cheaper than an explanation, and it catches
          the over-long title before a crawler does. */}
      <div className="surface-2 space-y-1 rounded-lg p-3">
        <p className="text-[10px] tracking-wide text-[var(--color-ink-faint)] uppercase">
          Search preview
        </p>
        <p className="truncate text-sm text-[#8ab4f8]">
          {resolvedTitle.length > 60
            ? `${resolvedTitle.slice(0, 57)}…`
            : resolvedTitle}
        </p>
        <p className="truncate font-mono text-[10px] text-[#34a853]">
          https://example.com/portal/{pageKey}
        </p>
        <p className="line-clamp-2 text-[11px] leading-snug text-[var(--color-ink-dim)]">
          {resolvedDescription || 'No description set — search engines will infer one.'}
        </p>
        {seo.noIndex ? (
          <Badge tone="warn">noindex — excluded from search</Badge>
        ) : null}
      </div>

      <fieldset disabled={disabled} className="space-y-4">
        <Field
          label="Title"
          hint={
            seo.title
              ? `${seo.title.length} characters. Under 60 reads best in results.`
              : `Empty — falls back to "${siteName}".`
          }
          error={
            seo.title && seo.title.length > 200
              ? 'Titles must be at most 200 characters.'
              : null
          }
        >
          <TextInput
            value={seo.title ?? ''}
            onChange={(event) => onChange({ title: event.target.value || undefined })}
            placeholder={siteName}
          />
        </Field>

        <Field
          label="Meta description"
          hint={
            seo.description
              ? `${seo.description.length} characters. 120–160 is the sweet spot.`
              : 'Empty — falls back to the site tagline token.'
          }
          error={
            seo.description && seo.description.length > 500
              ? 'Descriptions must be at most 500 characters.'
              : null
          }
        >
          <TextArea
            value={seo.description ?? ''}
            onChange={(event) =>
              onChange({ description: event.target.value || undefined })
            }
            placeholder={resolvedDescription || 'A short summary of this page.'}
            rows={3}
          />
        </Field>

        <Field
          label="Keywords"
          hint="Comma-separated. A hint, not a ranking factor."
        >
          <TextInput
            value={(seo.keywords ?? []).join(', ')}
            onChange={(event) => {
              const keywords = event.target.value
                .split(',')
                .map((word) => word.trim())
                .filter(Boolean);
              onChange({ keywords: keywords.length ? keywords : undefined });
            }}
            placeholder="admissions, curriculum, fees"
          />
        </Field>

        <Field
          label="Canonical URL"
          hint="Set when this page is reachable from more than one address."
          error={
            seo.canonicalUrl && !/^(https:\/\/|\/)/.test(seo.canonicalUrl)
              ? 'Canonical URLs must be https:// or root-relative.'
              : null
          }
        >
          <TextInput
            value={seo.canonicalUrl ?? ''}
            onChange={(event) =>
              onChange({ canonicalUrl: event.target.value || undefined })
            }
            placeholder="https://example.com/portal/about"
            className="font-mono text-xs"
          />
        </Field>

        <Field
          label="Share image"
          hint="Used by social cards. Falls back to the ogImage token."
        >
          <TextInput
            value={seo.ogImage ?? ''}
            onChange={(event) => onChange({ ogImage: event.target.value || undefined })}
            placeholder={resolvedImage || 'https://…/share.png'}
            className="font-mono text-xs"
          />
        </Field>

        <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-line)] p-2.5">
          <span className="min-w-0">
            <span className="block text-xs font-medium">Hide from search engines</span>
            <span className="block text-[10px] text-[var(--color-ink-faint)]">
              Adds a <code className="font-mono">noindex</code> directive.
            </span>
          </span>
          <Switch
            checked={seo.noIndex === true}
            onChange={(checked) => onChange({ noIndex: checked || undefined })}
            label="Hide from search engines"
          />
        </label>

        <Field
          label="Schema.org type"
          hint="Structured-data type, e.g. Article, Product, Course, FAQPage."
        >
          <TextInput
            value={seo.structuredDataType ?? ''}
            onChange={(event) =>
              onChange({ structuredDataType: event.target.value || undefined })
            }
            placeholder="WebPage"
          />
        </Field>
      </fieldset>
    </div>
  );
}
