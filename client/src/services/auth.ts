// Authentication service — handles token storage and user state.
// Tokens arrive via the OAuth callback redirect (?token=...) and are stored in localStorage.

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'cashflow.auth.token';
const USER_KEY = 'cashflow.auth.user';

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

/**
 * Fetch the current user profile from the /auth/me endpoint using the stored
 * access token. Returns null if not authenticated or token is invalid/expired.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearAuth();
      return null;
    }
    const data = await res.json();
    // The backend wraps in { success, data: { sub, email, roles } }
    const raw = data?.data || data?.user || data;
    const user: AuthUser = {
      id: raw.id || raw.sub || raw._id || '',
      email: raw.email || '',
      roles: raw.roles || [],
    };
    if (user.id && user.email) {
      setStoredUser(user);
      return user;
    }
    clearAuth();
    return null;
  } catch {
    return null;
  }
}

/** Decode a base64url string (JWT segments) to a UTF-8 string. */
function base64UrlDecode(segment: string): string {
  // Convert base64url -> base64 and pad
  let b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const decoded = atob(b64);
  // Handle UTF-8 characters correctly
  try {
    return decodeURIComponent(
      decoded
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  } catch {
    return decoded;
  }
}

/** Decode a JWT payload into an AuthUser (no signature verification — display only). */
export function decodeToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (!payload?.email) return null;
    // Reject expired tokens
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return {
      id: payload.sub || payload.id || '',
      email: payload.email,
      roles: payload.roles || [],
    };
  } catch {
    return null;
  }
}

/**
 * Extract an OAuth token (or error) from the current URL. Checks the main
 * query string AND the hash query string, so it works regardless of whether
 * the redirect landed on `?token=` or `/#/auth/callback?token=`.
 */
export function extractOAuthTokenFromUrl(): { token?: string; error?: string } {
  const fromSearch = new URLSearchParams(window.location.search);
  let token = fromSearch.get('token') || undefined;
  let error = fromSearch.get('error') || undefined;

  if (!token && !error) {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx !== -1) {
      const fromHash = new URLSearchParams(hash.slice(qIdx));
      token = fromHash.get('token') || undefined;
      error = fromHash.get('error') || undefined;
    }
  }
  return { token, error };
}

/** Remove token/error params from the visible URL without reloading. */
export function cleanOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  url.searchParams.delete('error');

  let hash = window.location.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx !== -1) {
    const base = hash.slice(0, qIdx);
    const hp = new URLSearchParams(hash.slice(qIdx));
    hp.delete('token');
    hp.delete('error');
    const rest = hp.toString();
    hash = rest ? `${base}?${rest}` : base;
  }
  // Default to the app home hash so the router lands somewhere valid
  const finalHash = hash && hash !== '#' ? hash : '#/';
  window.history.replaceState({}, document.title, url.origin + url.pathname + finalHash);
}

/** Initiates Google OAuth login by redirecting to the backend OAuth route. */
export function loginWithGoogle(): void {
  window.location.href = `${API_BASE_URL}/auth/google`;
}

/** Logout — call the backend and clear local state. */
export async function logout(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
    } catch {}
  }
  clearAuth();
}
