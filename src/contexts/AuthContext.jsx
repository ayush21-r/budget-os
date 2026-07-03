import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export const AuthContext = createContext(null);

function getAuthMessage(error) {
  const message = error?.message || '';

  if (/popup/i.test(message) && /closed/i.test(message)) {
    return 'The Google sign-in window was closed before authentication finished.';
  }

  if (/exchange external code|unexpected_failure|server_error/i.test(message)) {
    return 'Google sign-in reached Supabase, but Supabase could not exchange the Google code. Verify this app uses the same Supabase project where the Google provider is configured.';
  }

  if (/network|fetch|failed/i.test(message)) {
    return 'Unable to reach Supabase. Check your connection and try again.';
  }

  return message || 'Authentication failed. Please try again.';
}

function getRedirectError() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const description = params.get('error_description') || hash.get('error_description');
  const code = params.get('error_code') || hash.get('error_code');

  if (!description && !code) return '';

  return getAuthMessage({ message: description || code });
}

function clearAuthParams() {
  const params = new URLSearchParams(window.location.search);
  const hasAuthParams = params.has('code') || params.has('error') || params.has('error_code') || params.has('error_description') || window.location.hash.includes('access_token=');

  if (hasAuthParams) {
    window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      setLoading(true);

      try {
        const redirectError = getRedirectError();
        if (redirectError) {
          setError(redirectError);
          clearAuthParams();
        }

        const params = new URLSearchParams(window.location.search);
        const authCode = params.get('code');

        if (authCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
          if (exchangeError) {
            throw exchangeError;
          }
          clearAuthParams();
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        if (!isMounted) return;

        setSession(data.session);
        setUser(data.session?.user || null);
      } catch (authError) {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setError(getAuthMessage(authError));
        clearAuthParams();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user || null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async () => {
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (signInError) {
        throw signInError;
      }
    } catch (signInError) {
      setError(getAuthMessage(signInError));
    }
  }, []);

  const logout = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      setSession(null);
      setUser(null);
    } catch (signOutError) {
      setError(getAuthMessage(signOutError));
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      error,
      login,
      logout,
    }),
    [error, loading, login, logout, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
