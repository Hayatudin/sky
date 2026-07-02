/**
 * Central API helper for the frontend to communicate with the standalone backend.
 *
 * Authentication strategy for cross-domain (Vercel → cPanel):
 * - Tries to read the session token from better-auth's cookie cache
 * - Falls back to calling getSession() to get a fresh token if cookie read fails
 * - In-memory token cache with 4-minute TTL (refreshes before better-auth's 5-min expiry)
 * - On 401 response: clears token cache and retries once with a fresh token
 */

import { getSession } from './auth-client';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
  'http://localhost:4000'
).replace(/\/$/, '');

// ── In-memory token cache ─────────────────────────────────────────────────────
const TOKEN_TTL_MS = 4 * 60 * 1000; // 4 minutes (less than better-auth's 5-min cache)
let cachedToken: string | null = null;
let cacheExpiry: number = 0;
let fetchingToken: Promise<string | null> | null = null;

/** Read the session token — from memory cache first, then from better-auth */
async function getAuthToken(): Promise<string | null> {
  // Return cached token if still fresh
  if (cachedToken && Date.now() < cacheExpiry) {
    return cachedToken;
  }

  // De-duplicate concurrent refresh requests
  if (fetchingToken) return fetchingToken;

  fetchingToken = (async () => {
    try {
      // 1. Try reading from cookie (works if not HttpOnly)
      const cookieToken = readSessionCookie();
      if (cookieToken) {
        cachedToken = cookieToken;
        cacheExpiry = Date.now() + TOKEN_TTL_MS;
        return cookieToken;
      }

      // 2. Fall back to calling getSession() — makes an API call but gives fresh token
      const sessionData = await getSession();
      const token = (sessionData?.data as any)?.session?.token ?? null;
      if (token) {
        cachedToken = token;
        cacheExpiry = Date.now() + TOKEN_TTL_MS;
      }
      return token;
    } catch {
      return null;
    } finally {
      fetchingToken = null;
    }
  })();

  return fetchingToken;
}

/** Try to read the better-auth session token from document.cookie */
function readSessionCookie(): string | null {
  if (typeof document === 'undefined') return null;
  // better-auth may use various cookie names depending on config
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

/** Invalidate the token cache (called on 401 to force a fresh token on retry) */
function invalidateTokenCache() {
  cachedToken = null;
  cacheExpiry = 0;
  fetchingToken = null;
}

// ── Main API function ─────────────────────────────────────────────────────────
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

  // On 401: clear cache, get a fresh token, retry once
  if (response.status === 401) {
    console.warn(`[API] 401 on ${url} — refreshing session token and retrying...`);
    invalidateTokenCache();
    const freshToken = await getAuthToken();
    if (freshToken && freshToken !== token) {
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
