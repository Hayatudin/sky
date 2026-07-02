/**
 * Central API helper for the frontend to communicate with the standalone backend.
 * Attaches the better-auth session cookie via credentials:include for same-domain,
 * and also reads the token from cookie storage as a fallback Authorization header
 * for cross-domain deployments (Vercel frontend → cPanel backend).
 */

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:4000').replace(/\/$/, '');

function getSessionToken(): string | null {
  if (typeof document === 'undefined') return null;
  // better-auth stores the session token in a cookie named 'better-auth.session_token'
  const match = document.cookie.match(/(?:^|;\s*)better-auth\.session_token=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  // Also try without dot prefix (some versions use underscore)
  const match2 = document.cookie.match(/(?:^|;\s*)better-auth_session_token=([^;]+)/);
  if (match2) return decodeURIComponent(match2[1]);
  return null;
}

export async function api(path: string, options: RequestInit = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${cleanPath}`;
  
  const isFormData = options.body instanceof FormData;

  // Try to get session token for Authorization header (cross-domain fallback)
  const token = getSessionToken();

  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      // Always include Authorization header if token is available
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  };

  console.log(`[API] ${options.method || 'GET'} ${url}`, token ? '(token attached)' : '(no token)');
  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || errorData.message || `API error: ${response.status} ${response.statusText}`;
    console.error(`[API] Error ${response.status} on ${options.method || 'GET'} ${url}:`, message);
    throw new Error(message);
  }

  return response;
}
