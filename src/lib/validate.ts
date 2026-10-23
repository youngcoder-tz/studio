// studio/src/lib/validate.ts
//
// CLIENT-SIDE MIRRORS OF THE BACKEND'S TOKEN RULES.
//
// These exist for one reason: latency of feedback. A token value is injected
// into every visitor's page as a CSS custom property, so the backend rejects
// dangerous values — but an author should learn that the moment they type it,
// not on the next autosave.
//
// The rules are copied from
// backend/src/workspace/registry/token-schema.ts and must stay in lockstep. They
// are deliberately *not* a reimplementation with extra opinions: anything the
// backend accepts, this accepts, and vice versa. When they disagree the backend
// wins (the save rejects and the diagnostics land inline), so a drift here
// causes a confusing UX, never a security gap.

const MAX_VALUE_LENGTH = 512;
const MAX_KEY_LENGTH = 64;

/** Characters that let a value escape a CSS declaration when interpolated. */
const FORBIDDEN_VALUE_CHARS = /[;{}\n\r]/;

/** Must survive the SDK's camelCase→kebab conversion into a custom property. */
export const TOKEN_KEY_REGEX = /^[A-Za-z][A-Za-z0-9]*$/;

const TOKEN_COLOR_VALUE =
  /^(#[0-9A-Fa-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|oklch\([\d\s.,%/]+\)|lab\([\d\s.,%/]+\)|lch\([\d\s.,%deg]+\)|var\(--[a-zA-Z0-9-]+\)|transparent|currentColor|inherit|initial|unset)$/;

const TOKEN_LENGTH_VALUE =
  /^(0|[0-9]*\.?[0-9]+(px|rem|em|%|vw|vh|vmin|vmax|ch|pt)|var\(--[a-zA-Z0-9-]+\)|calc\([^;{}]+\))$/;

const TOKEN_FONT_VALUE = /^[A-Za-z0-9 ,'"\-_+]{1,160}$/;

const TOKEN_URL_VALUE = /^(https:\/\/|\/)/;

const RADIUS_PRESETS = ['none', 'soft', 'rounded', 'pill'];

/**
 * Semantic validators for the recognised tokens, keyed by token name.
 * Each returns an error message or `null`.
 */
const SEMANTIC: Record<string, (value: string | number) => string | null> = {
  ...Object.fromEntries(
    [
      'primaryColor',
      'secondaryColor',
      'accentColor',
      'backgroundColor',
      'surfaceColor',
      'textColor',
      'borderColor',
      'successColor',
      'warningColor',
      'dangerColor',
      'mutedTextColor',
    ].map((key) => [
      key,
      (value: string | number) =>
        typeof value === 'number'
          ? 'Expected a CSS colour, got a number.'
          : TOKEN_COLOR_VALUE.test(value)
            ? null
            : 'Invalid colour. Use #hex, rgb()/hsl()/oklch()/lab()/lch(), var(--x), or a CSS colour keyword.',
    ]),
  ),

  ...Object.fromEntries(
    ['fontHeading', 'fontBody', 'fontMono'].map((key) => [
      key,
      (value: string | number) =>
        typeof value === 'number'
          ? 'Expected a font stack, got a number.'
          : TOKEN_FONT_VALUE.test(value)
            ? null
            : 'Invalid font stack. Letters, digits, spaces, commas, quotes and hyphens only.',
    ]),
  ),

  borderRadius: (value: string | number) => {
    const text = String(value);
    if (RADIUS_PRESETS.includes(text)) return null;
    if (typeof value === 'string' && TOKEN_LENGTH_VALUE.test(value)) return null;
    return 'Invalid radius. Use none/soft/rounded/pill, or a length like 8px or 0.5rem.';
  },

  contentMaxWidth: lengthValidator,
  sectionSpacing: lengthValidator,
  gridGutter: lengthValidator,

  theme: (value) =>
    ['light', 'dark', 'system'].includes(String(value))
      ? null
      : 'Theme must be light, dark or system.',

  direction: (value) =>
    ['ltr', 'rtl'].includes(String(value)) ? null : 'Direction must be ltr or rtl.',

  siteName: (value) =>
    String(value).length > 120 ? 'Site name must be at most 120 characters.' : null,

  tagline: (value) =>
    String(value).length > 240 ? 'Tagline must be at most 240 characters.' : null,

  ogImage: (value) => {
    const text = String(value);
    if (text.length > 2048) return 'Share image URL is too long.';
    return TOKEN_URL_VALUE.test(text)
      ? null
      : 'Share image must be an https:// URL or root-relative path.';
  },

  locale: (value) =>
    String(value).length > 20 ? 'Locale must be at most 20 characters.' : null,

  currency: (value) =>
    /^[A-Z]{3}$/.test(String(value))
      ? null
      : 'Currency must be a 3-letter ISO code, e.g. USD.',
};

function lengthValidator(value: string | number): string | null {
  if (typeof value === 'number') return value === 0 ? null : 'Expected a length like 72rem.';
  return TOKEN_LENGTH_VALUE.test(value)
    ? null
    : 'Invalid length. Use px/rem/em/%/vw/vh, var(--x), or calc(…).';
}

/**
 * Validates a payload value *before* it is attached to a key. Returns the first
 * problem, or `null` when the value passes the primitive guard.
 */
export function validateTokenValue(key: string, value: string | number): string | null {
  if (typeof value === 'number') return null;

  if (value.length > MAX_VALUE_LENGTH) {
    return `Token values must be at most ${MAX_VALUE_LENGTH} characters.`;
  }
  if (FORBIDDEN_VALUE_CHARS.test(value)) {
    return 'Token values must not contain ";", "{", "}" or newlines.';
  }
  if (value.startsWith('javascript:')) {
    return 'Unsupported token value.';
  }

  const semantic = SEMANTIC[key];
  return semantic ? semantic(value) : null;
}

/** Validates a token *key*. Returns an error message or `null`. */
export function validateTokenKey(key: string): string | null {
  if (key.length > MAX_KEY_LENGTH) {
    return `Token keys must be at most ${MAX_KEY_LENGTH} characters.`;
  }
  if (!TOKEN_KEY_REGEX.test(key)) {
    return 'Token keys must start with a letter and contain only letters and digits — they become --portal-* CSS variables.';
  }
  return null;
}

/**
 * Validates a whole token map, mirroring the backend's `validateTokens`.
 * Used by the publish/revert bar to refuse a publish that would be rejected.
 */
export function validateTokens(
  tokens: Record<string, string | number>,
): { ok: true } | { ok: false; issues: { path: string; message: string }[] } {
  const issues: { path: string; message: string }[] = [];

  if (Object.keys(tokens).length > 250) {
    issues.push({
      path: '(tokens)',
      message: `A workspace may define at most 250 design tokens (received ${Object.keys(tokens).length}).`,
    });
    return { ok: false, issues };
  }

  for (const [key, value] of Object.entries(tokens)) {
    const keyProblem = validateTokenKey(key);
    if (keyProblem) {
      issues.push({ path: key, message: keyProblem });
      continue;
    }
    const valueProblem = validateTokenValue(key, value);
    if (valueProblem) issues.push({ path: key, message: valueProblem });
  }

  return issues.length ? { ok: false, issues } : { ok: true };
}

/**
 * A CSS-ready preview value for a token, used to paint the token panel's live
 * swatches. Returns `undefined` for anything that is not a colour so the caller
 * can fall back rather than injecting an invalid declaration.
 */
export function previewColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (TOKEN_COLOR_VALUE.test(trimmed)) return trimmed;
  return undefined;
}
