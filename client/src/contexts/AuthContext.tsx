import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AuthUser,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  fetchCurrentUser,
  loginWithGoogle,
  logout as logoutService,
  decodeToken,
  extractOAuthTokenFromUrl,
  cleanOAuthParamsFromUrl,
} from '../services/auth';
import { getClientId } from '../services/watchlist';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  handleOAuthToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  loginWithGoogle: () => {},
  logout: async () => {},
  handleOAuthToken: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function migrateWatchlist(userId: string) {
  try {
    const clientId = getClientId();
    if (userId && clientId) {
      await fetch(`${API_BASE_URL}/watchlist/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, userId }),
      });
    }
  } catch (e) {
    console.warn('[Auth] watchlist migration failed (non-fatal):', e);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((newToken: string): AuthUser | null => {
    setStoredToken(newToken);
    setToken(newToken);
    const u = decodeToken(newToken);
    setUser(u);
    setStoredUser(u);
    return u;
  }, []);

  const handleOAuthToken = useCallback(async (newToken: string) => {
    const u = applyToken(newToken);
    if (u?.id) await migrateWatchlist(u.id);
  }, [applyToken]);

  // On app load: first check the URL for an OAuth token, else validate stored token
  useEffect(() => {
    (async () => {
      const { token: urlToken, error } = extractOAuthTokenFromUrl();

      if (error) {
        console.error('[Auth] OAuth error from server:', error);
        cleanOAuthParamsFromUrl();
      }

      if (urlToken) {
        console.log('[Auth] Token found in URL, signing in…');
        const u = applyToken(urlToken);
        cleanOAuthParamsFromUrl();
        if (u?.id) await migrateWatchlist(u.id);
        setLoading(false);
        return;
      }

      // No URL token — validate any stored token
      const stored = getStoredToken();
      if (stored) {
        const u = decodeToken(stored);
        if (u) {
          setUser(u);
          setStoredUser(u);
        } else {
          // Token expired/invalid — try the API as a last resort, else clear
          const apiUser = await fetchCurrentUser();
          setUser(apiUser);
          if (!apiUser) setToken(null);
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, loginWithGoogle, logout, handleOAuthToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
