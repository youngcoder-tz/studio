// studio/src/lib/api/client.ts
//
// The Studio's HTTP client.
//
// It mirrors the console app's client on purpose: same refresh-on-401
// behaviour, same CSRF handling, same `http.get/post/patch/put/delete` shape.
// The one meaningful difference is where the access token lives.
//
// The console is same-origin with its login flow and can lean on an httpOnly
// refresh cookie. The Studio is a standalone deployment, so it is explicit
// about the two ways it can be authenticated:
//
//   1. **Bearer token** — a dashboard JWT, either persisted from a token
//      exchange or pasted in during development. Sent as
//      `Authorization: Bearer …`.
//   2. **Ambient cookies** — `credentials: 'include'` is still set, so if the
//      Studio is deployed behind the same parent domain as the API (the
//      recommended production setup, see the README) a session cookie works
//      with no token handling at all.
//
// Refresh is attempted once per 401, de-duplicated across concurrent requests,
// and never attempted against an auth endpoint (which would loop).

import { ApiError } from '../errors';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const TOKEN_STORAGE_KEY = 'gnapex.studio.accessToken';

// ─── Token store ─────────────────────────────────────────────────────────────

let memoryAccessToken: string | null = null;

export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;
  if (typeof window === 'undefined') return null;
  try {
    memoryAccessToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    memoryAccessToken = null;
  }
  return memoryAccessToken;
}

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
  if (typeof window === 'undefined') return;
  try {
    if (token) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — memory only */
  }
}

const getCsrfToken = () =>
  typeof document !== 'undefined'
    ? decodeURIComponent(
        document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] ?? '',
      )
    : '';

// ─── Refresh ─────────────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshSubscribers: ((ok: boolean) => void)[] = [];

function onRefreshed(ok: boolean) {
  refreshSubscribers.forEach((cb) => cb(ok));
  refreshSubscribers = [];
}

/**
 * Trade the dashboard's root-domain session cookies for a Studio bearer token.
 *
 * The console and the Studio are separate deployments, but the API writes its
 * `accessToken`/`refreshToken` cookies to the shared root domain, so a signed-in
 * dashboard session is already proof of identity — it just has to be asked.
 * Callers use this before concluding anybody is anonymous.
 */
export function refreshSessionFromCookie(): Promise<boolean> {
  return refreshAccessToken();
}

async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise((resolve) => refreshSubscribers.push(resolve));
  }
  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      },
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        accessToken?: string;
      };
      if (data.accessToken) setAccessToken(data.accessToken);
      onRefreshed(true);
      return true;
    }
    setAccessToken(null);
    onRefreshed(false);
    return false;
  } catch {
    onRefreshed(false);
    return false;
  } finally {
    isRefreshing = false;
  }
}

// ─── Request ─────────────────────────────────────────────────────────────────

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Skip the transparent refresh attempt (used by auth calls themselves). */
  skipRefresh?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers: customHeaders, skipRefresh, ...rest } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const buildHeaders = (): Record<string, string> => {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(customHeaders as Record<string, string>),
    };
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
    return headers;
  };

  let response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: buildHeaders(),
    ...rest,
  });

  if (response.status === 401 && !skipRefresh && !endpoint.includes('/auth/')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store',
        headers: buildHeaders(),
        ...rest,
      });
    }
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const raw = json as {
      message?: string | string[];
      error?: { message?: string; code?: string } | string;
      code?: string;
      diagnostics?: unknown;
    };
    // The auth service nests its machine-readable code inside `error`, while
    // workspace endpoints put it at the top level — read whichever the
    // endpoint used so callers can classify the failure.
    const nested = typeof raw?.error === 'object' ? raw.error : undefined;
    const errorMsg =
      raw?.message ||
      nested?.message ||
      raw?.error ||
      `Request failed with status ${response.status}`;
    throw new ApiError(
      Array.isArray(errorMsg) ? errorMsg.join(', ') : String(errorMsg),
      response.status,
      raw?.code ?? nested?.code,
      raw?.diagnostics,
    );
  }

  return json as T;
}

export const http = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'GET', ...options }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      ...options,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
      ...options,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { method: 'DELETE', ...options }),
};
