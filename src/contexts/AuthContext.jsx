import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export const AuthContext = createContext(null);

function getAuthMessage(error) {
  const message = error?.message || '';

  if (/popup/i.test(message) && /closed/i.test(message)) {
    return 'The Google sign-in window was closed before authentication finished.';
  }

  if (/network|fetch|failed/i.test(message)) {
    return 'Unable to reach Supabase. Check your connection and try again.';
  }

  return message || 'Authentication failed. Please try again.';
}

// Module-level global state to avoid state loss during Strict Mode unmount/remount cycles.
let currentSession = null;
let currentUser = null;
let currentLoading = true;
let globalSubscription = null;
const globalListeners = new Set();

function registerGlobalListener() {
  if (globalSubscription) return;

  console.log('[AuthContext Global] Registering onAuthStateChange listener');
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
    console.log('[AuthContext Global] Event:', event, 'session:', nextSession);
    
    currentSession = nextSession;
    if (nextSession) {
      currentUser = nextSession.user;
      
      // Broadcast current state to all active listeners immediately
      for (const listener of globalListeners) {
        listener(event, currentSession, currentUser);
      }

      // Fetch fresh, verified user details from the server to enrich metadata
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          currentUser = userData.user;
          for (const listener of globalListeners) {
            listener(event, currentSession, currentUser);
          }
        }
      } catch (err) {
        console.error('[AuthContext Global] getUser error:', err);
      }
    } else {
      currentUser = null;
      for (const listener of globalListeners) {
        listener(event, currentSession, currentUser);
      }
    }
    
    currentLoading = false;
  });

  globalSubscription = subscription;

  // Trigger getSession explicitly to start hash parsing and restore cached session
  supabase.auth.getSession().then(({ data: { session } }) => {
    console.log('[AuthContext Global] getSession resolved:', session);
    if (session) {
      currentSession = session;
      currentUser = session.user;
      currentLoading = false;
      for (const listener of globalListeners) {
        listener('INITIAL_SESSION', currentSession, currentUser);
      }
    } else {
      // If there is an active OAuth redirect in the hash, do NOT terminate the loading state yet.
      // Let the onAuthStateChange SIGNED_IN event handle it.
      const hasHash = typeof window !== 'undefined' && window.location.hash.includes('access_token=');
      if (!hasHash) {
        currentLoading = false;
        for (const listener of globalListeners) {
          listener('INITIAL_SESSION', null, null);
        }
      }
    }
  }).catch((err) => {
    console.error('[AuthContext Global] getSession failed:', err);
    currentLoading = false;
    for (const listener of globalListeners) {
      listener('INITIAL_SESSION', null, null);
    }
  });
}

// Register listener once at module import time
registerGlobalListener();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(currentSession);
  const [user, setUser] = useState(currentUser);
  const [loading, setLoading] = useState(currentLoading);
  const [error, setError] = useState('');

  useEffect(() => {
    const listener = (event, nextSession, nextUser) => {
      console.log('[AuthContext Component] State update triggered by event:', event);
      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);
    };

    globalListeners.add(listener);

    // Sync state if it was updated globally during mount
    if (session !== currentSession || user !== currentUser || loading !== currentLoading) {
      setSession(currentSession);
      setUser(currentUser);
      setLoading(currentLoading);
    }

    return () => {
      globalListeners.delete(listener);
    };
  }, [session, user, loading]);

  const login = useCallback(async () => {
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
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
      currentSession = null;
      currentUser = null;
      currentLoading = false;
      
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
