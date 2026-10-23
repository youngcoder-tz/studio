'use client';

// studio/src/components/panels/i18n-panel.tsx
//
// LOCALISATION STRINGS.
//
// The document stores `locale → { key → string }`. The panel does not try to
// enumerate which keys exist (nothing in the manifest declares translatable
// copy), so it presents the strings the author has actually authored plus an
// add-key affordance. That is honest about what the format supports: a
// translation is keyed by whatever the templates and components reference, and
// inventing a key list here would be fiction.
//
// The locale seed list is the one piece of product opinion in this panel. A
// workspace with no locales still needs a place to start, and typing `en-US`
// into an empty box every time is friction with no benefit.
//
// Two details that are otherwise easy to get wrong:
//   • The "new string key" field is per locale. One shared field would mirror
//     what you type into every locale section at once, which looks like a bug
//     because it is one.
//   • Removing a locale is a real operation (`i18n.remove`), not "write an empty
//     dictionary". An empty locale still exists — it shows up in a language
//     switcher and has to be cleaned up by hand.

import { useState } from 'react';
import { Globe2, Plus, Trash2 } from 'lucide-react';
import { Badge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/input';
import { Select } from '@/components/ui/controls';
import { Modal } from '@/components/ui/modal';

const COMMON_LOCALES = [
  { value: 'en', label: 'en — English' },
  { value: 'en-US', label: 'en-US — English (United States)' },
  { value: 'en-GB', label: 'en-GB — English (United Kingdom)' },
  { value: 'fr', label: 'fr — French' },
  { value: 'es', label: 'es — Spanish' },
  { value: 'de', label: 'de — German' },
  { value: 'pt-BR', label: 'pt-BR — Portuguese (Brazil)' },
  { value: 'ar', label: 'ar — Arabic' },
  { value: 'hi', label: 'hi — Hindi' },
  { value: 'sw', label: 'sw — Swahili' },
  { value: 'zh-CN', label: 'zh-CN — Chinese (Simplified)' },
];

export function I18nPanel({
  i18n,
  defaultLocale,
  disabled,
  onChange,
  onRemoveLocale,
}: {
  i18n: Record<string, Record<string, string>>;
  defaultLocale: string;
  disabled?: boolean;
  onChange: (locale: string, strings: Record<string, string>) => void;
  onRemoveLocale: (locale: string) => void;
}) {
  const locales = Object.keys(i18n);
  const [addingLocale, setAddingLocale] = useState(false);
  const [newLocale, setNewLocale] = useState('');
  // Keyed by locale so typing in one section does not appear in every other.
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const addLocale = () => {
    const locale = newLocale.trim();
    if (!locale) return;
    // `i18n.update` creates the locale as a side effect of merging into it, so
    // seeding it with an empty dictionary is all that is needed.
    onChange(locale, { ...(i18n[locale] ?? {}) });
    setNewLocale('');
    setAddingLocale(false);
  };

  const draftKeyFor = (locale: string) => draftKeys[locale] ?? '';
  const setDraftKeyFor = (locale: string, value: string) =>
    setDraftKeys((current) => ({ ...current, [locale]: value }));

  const addString = (locale: string, strings: Record<string, string>) => {
    const key = draftKeyFor(locale).trim();
    if (!key) return;
    onChange(locale, { ...strings, [key]: strings[key] ?? '' });
    setDraftKeyFor(locale, '');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-line)] px-3 py-2.5">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-[var(--color-ink-dim)] uppercase">
            Localisation
          </h3>
          <p className="text-[10px] text-[var(--color-ink-faint)]">
            Default locale: <span className="font-mono">{defaultLocale}</span>
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => setAddingLocale((v) => !v)}
        >
          <Plus size={12} />
          Locale
        </Button>
      </header>

      <div className="scroll-y min-h-0 flex-1 space-y-5 p-3">
        {addingLocale ? (
          <div className="surface-2 space-y-2 rounded-lg p-3">
            <Field label="Locale code" hint="BCP-47, e.g. fr-CA.">
              <Select
                value={newLocale}
                onChange={setNewLocale}
                options={COMMON_LOCALES.filter((l) => !locales.includes(l.value))}
                placeholder="Choose or type below…"
              />
            </Field>
            <TextInput
              value={newLocale}
              onChange={(event) => setNewLocale(event.target.value)}
              placeholder="fr-CA"
              className="font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAddingLocale(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={addLocale}
                disabled={!newLocale.trim() || !!i18n[newLocale.trim()]}
              >
                Add locale
              </Button>
            </div>
          </div>
        ) : null}

        {locales.length === 0 && !addingLocale ? (
          <EmptyState
            icon={<Globe2 size={18} />}
            title="Single language"
            message="Add a locale to translate this workspace. Strings are keyed by whatever your templates reference."
          />
        ) : null}

        {locales.map((locale) => {
          const strings = i18n[locale] ?? {};
          const keys = Object.keys(strings);
          return (
            <section
              key={locale}
              className="space-y-2 rounded-lg border border-[var(--color-line)] p-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe2 size={13} className="text-[var(--color-ink-faint)]" />
                  <span className="font-mono text-xs font-medium">{locale}</span>
                  {locale === defaultLocale ? (
                    <Badge tone="accent">default</Badge>
                  ) : null}
                  <Badge>{keys.length}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:text-[var(--color-danger)]"
                  disabled={disabled || locale === defaultLocale}
                  onClick={() => setConfirmRemove(locale)}
                  title={
                    locale === defaultLocale
                      ? 'The default locale cannot be removed'
                      : `Remove ${locale}`
                  }
                  aria-label={`Remove ${locale}`}
                >
                  <Trash2 size={12} />
                </Button>
              </div>

              {keys.length === 0 ? (
                <p className="px-0.5 text-[11px] text-[var(--color-ink-faint)]">
                  No strings yet. Add the keys your templates reference.
                </p>
              ) : null}

              {keys.map((key) => (
                <div key={key} className="flex items-start gap-1.5">
                  <span className="w-32 shrink-0 truncate pt-1.5 font-mono text-[10px] text-[var(--color-ink-faint)]">
                    {key}
                  </span>
                  <TextInput
                    disabled={disabled}
                    value={strings[key] ?? ''}
                    onChange={(event) =>
                      onChange(locale, { ...strings, [key]: event.target.value })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-[var(--color-danger)]"
                    disabled={disabled}
                    onClick={() => {
                      const next = { ...strings };
                      delete next[key];
                      // Removing the last key cannot delete the locale itself —
                      // `i18n.update` merges. That is exactly why the locale
                      // removal above is a separate operation.
                      onChange(locale, next);
                    }}
                    aria-label={`Remove ${key}`}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-1.5 pt-1">
                <TextInput
                  value={draftKeyFor(locale)}
                  disabled={disabled}
                  onChange={(event) => setDraftKeyFor(locale, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addString(locale, strings);
                    }
                  }}
                  placeholder="string key, e.g. nav.about"
                  className="font-mono text-[11px]"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={disabled || !draftKeyFor(locale).trim()}
                  onClick={() => addString(locale, strings)}
                >
                  <Plus size={12} />
                  Add
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      <Modal
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        title={`Remove ${confirmRemove ?? ''}?`}
        description="The locale and all of its strings are deleted from this draft. Undo restores them; publishing makes the removal live."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmRemove) onRemoveLocale(confirmRemove);
                setConfirmRemove(null);
              }}
            >
              <Trash2 size={13} />
              Remove locale
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-[var(--color-ink-dim)]">
          <code className="font-mono text-[var(--color-ink)]">{confirmRemove}</code> has{' '}
          {Object.keys(i18n[confirmRemove ?? ''] ?? {}).length} string
          {Object.keys(i18n[confirmRemove ?? ''] ?? {}).length === 1 ? '' : 's'}.
        </p>
      </Modal>
    </div>
  );
}
