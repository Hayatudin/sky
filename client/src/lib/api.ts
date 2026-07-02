/**
 * Central API helper — cross-domain auth (Vercel frontend → cPanel backend).
 *
 * Strategy:
 * 1. Read token from better-auth cookie if readable (not HttpOnly)
 * 2. Fall back to getSession() API call for the fresh token
 * 3. Cache the token for 4 minutes to avoid hammering the auth endpoint
 * 4. On 401: force a live getSession() call bypassing all caches, then retry
 * 5. Proactive refresh: refresh token every 3 minutes in the background
 */

import { getSession } from './auth-client';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
  'http://localhost:4000'
).replace(/\/$/, '');

// ── Token cache ───────────────────────────────────────────────────────────────
const CACHE_TTL_MS   = 4 * 60 * 1000;   // 4 min normal cache
const REFRESH_MS     = 3 * 60 * 1000;   // proactive refresh every 3 min

let cachedToken:   string | null = null;
let cacheExpiry:   number        = 0;
let refreshTimer:  ReturnType<typeof setTimeout> | null = null;
let pendingFetch:  Promise<string | null> | null = null;

// ── Cookie reader ─────────────────────────────────────────────────────────────
function readSessionCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const patterns = [
    /(?:^|;\s*)better-auth\.session_token=([^;]+)/,
    /(?:^|;\s*)better-auth_session_token=([^;]+)/,
    /(?:^|;\s*)__Secure-better-auth\.session_token=([^;]+)/,
    /(?:^|;\s*)session_token=([^;]+)/,
  ];
  for (const re of patterns) {
    const m = document.cookie.match(re);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

// ── Force a live session fetch (bypasses all caches) ─────────────────────────
async function fetchFreshToken(): Promise<string | null> {
  try {
    // Force a live HTTP call — no-store bypasses better-auth's cookie cache
    const sessionData = await getSession({
      fetchOptions: { cache: 'no-store' } as any,
    });
    return (sessionData?.data as any)?.session?.token ?? null;
  } catch {
    return null;
  }
}

// ── Main token getter ─────────────────────────────────────────────────────────
async function getAuthToken(forceRefresh = false): Promise<string | null> {
  // Return cached if still fresh and not forced
  if (!forceRefresh && cachedToken && Date.now() < cacheExpiry) {
    return cachedToken;
  }

  // De-duplicate concurrent requests
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    try {
      let token: string | null = null;

      if (!forceRefresh) {
        // Try cookie first (fast, no network)
        token = readSessionCookie();
      }

      if (!token) {
        // Either forced refresh or cookie not readable — hit the server
        token = await fetchFreshToken();
      }

      if (token) {
        cachedToken = token;
        cacheExpiry = Date.now() + CACHE_TTL_MS;
        scheduleProactiveRefresh();
      } else {
        // No token — clear cache
        cachedToken = null;
        cacheExpiry = 0;
      }

      return token;
    } catch {
      return null;
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

// ── Proactive background refresh ──────────────────────────────────────────────
function scheduleProactiveRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    // Silently refresh in the background before the cache expires
    const fresh = await fetchFreshToken();
    if (fresh) {
      cachedToken = fresh;
      cacheExpiry = Date.now() + CACHE_TTL_MS;
      scheduleProactiveRefresh(); // schedule next refresh
    }
  }, REFRESH_MS);
}

/** Force clear — called on signout */
export function clearAuthTokenCache() {
  cachedToken = null;
  cacheExpiry = 0;
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
}

// ── Main API call ─────────────────────────────────────────────────────────────
export async function api(path: string, options: RequestInit = {}): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;
  const isFormData = options.body instanceof FormData;

  const makeRequest = async (token: string | null): Promise<Response> => {
    const opts: RequestInit = {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
    };
    return fetch(url, opts);
  };

  const token = await getAuthToken();
  console.log(`[API] ${options.method || 'GET'} ${url}`, token ? '(token)' : '(no token)');

  let response = await makeRequest(token);

  // On 401: force a live server session refresh and retry once
  if (response.status === 401) {
    console.warn(`[API] 401 on ${url} — forcing live session refresh...`);
    const freshToken = await getAuthToken(true); // force = true → bypasses cache, hits server
    if (freshToken) {
      response = await makeRequest(freshToken);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.error || errorData.message || `API error: ${response.status} ${response.statusText}`;
    console.error(`[API] Error ${response.status} on ${options.method || 'GET'} ${url}:`, message);
    throw new Error(message);
  }

  return response;
}
