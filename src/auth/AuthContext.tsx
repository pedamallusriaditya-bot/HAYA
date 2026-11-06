import { useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';
import {
  isAuthorizedEmail,
  getAllowedEmails,
  isMatchActive,
  evaluateInactivity,
  recordUserActivity,
  createFallbackProfile,
  clearMatchActiveState,
  LAST_ACTIVITY_KEY,
  IN_MATCH_KEY,
  LOGOUT_NOTICE_KEY,
} from './authUtils';
import { AuthContext, useAuth, type AuthState } from './useAuth';

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth, type AuthState };

const DEV_ADITYA_UUID = '00000000-0000-0000-0000-000000000001';
const DEV_HARIKA_UUID = '00000000-0000-0000-0000-000000000002';

function getInitialDevSession() {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null;
  try {
    const raw = localStorage.getItem('haya_dev_auth');
    if (!raw) return null;
    const { email, name } = JSON.parse(raw);
    if (!email || !isAuthorizedEmail(email)) return null;

    const allowed = getAllowedEmails();
    const isHarika =
      (allowed.length > 1 && email.toLowerCase() === allowed[1].toLowerCase()) ||
      email.toLowerCase().includes('harika');
    const userId = isHarika ? DEV_HARIKA_UUID : DEV_ADITYA_UUID;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockUser: any = {
      id: userId,
      email,
      user_metadata: { display_name: name },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSession: any = {
      access_token: 'mock-dev-token',
      token_type: 'bearer',
      user: mockUser,
      expires_in: 360000,
      refresh_token: 'mock-dev-refresh',
    };
    const mockProfile: Profile = {
      id: userId,
      email,
      display_name: name,
      is_admin: false,
      preferences: { sound: true, music: true },
    };
    return { session: mockSession, profile: mockProfile };
  } catch {
    return null;
  }
}

// Clear any leftover in-match state on module initialization
clearMatchActiveState();

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialDev = getInitialDevSession();
  const [session, setSession] = useState<Session | null>(() => initialDev?.session ?? null);
  const [profile, setProfile] = useState<Profile | null>(() => initialDev?.profile ?? null);
  const [loading, setLoading] = useState(() => !initialDev);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const notice = localStorage.getItem('haya_logout_notice');
      if (notice) {
        localStorage.removeItem('haya_logout_notice');
        return notice;
      }
    }
    return null;
  });

  const clearLogoutNotice = useCallback(() => {
    setLogoutNotice(null);
  }, []);

  const updateProfileState = useCallback((updated: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updated } : null));
  }, []);

  async function loadProfile(uid: string, emailHint?: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, is_admin, avatar_data, created_at, updated_at')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn('[AuthContext] Profile load warning:', error.message);
        if (emailHint && isAuthorizedEmail(emailHint)) {
          setProfile(createFallbackProfile(uid, emailHint));
        }
        return;
      }

      if (data) {
        setProfile(data as Profile);
      } else if (emailHint && isAuthorizedEmail(emailHint)) {
        // Fallback profile if row hasn't been created yet
        setProfile(createFallbackProfile(uid, emailHint));
      }
    } catch (err) {
      console.warn('[AuthContext] Network error loading profile:', err);
      if (emailHint && isAuthorizedEmail(emailHint)) {
        setProfile(createFallbackProfile(uid, emailHint));
      }
    }
  }

  function devSignIn(email: string, name: string) {
    if (!isAuthorizedEmail(email)) {
      setLogoutNotice('This email is not authorized to use HAYA Games.');
      return;
    }
    localStorage.setItem('haya_dev_auth', JSON.stringify({ email, name }));
    const dev = getInitialDevSession();
    if (dev) {
      setSession(dev.session);
      setProfile(dev.profile);
      setLoading(false);
      localStorage.setItem('haya_last_activity', String(Date.now()));
    }
  }

  const signOut = useCallback(async (reason?: string) => {
    localStorage.removeItem('haya_dev_auth');
    localStorage.removeItem('haya_last_activity');
    clearMatchActiveState(localStorage);
    if (reason) {
      localStorage.setItem('haya_logout_notice', reason);
      setLogoutNotice(reason);
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on signout
    }
    setSession(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Check existing Supabase session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session) {
        const userEmail = data.session.user?.email;
        if (!isAuthorizedEmail(userEmail)) {
          // Reject unauthorized account
          void signOut('Access denied: account not on the HAYA Games allowlist.');
          setLoading(false);
          return;
        }

        setSession(data.session);
        const uid = data.session.user?.id;
        if (uid) {
          loadProfile(uid, userEmail).finally(() => mounted && setLoading(false));
        } else {
          setLoading(false);
        }
      } else if (!initialDev) {
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      if (newSession) {
        const userEmail = newSession.user?.email;
        if (!isAuthorizedEmail(userEmail)) {
          void signOut('Access denied: account not on the HAYA Games allowlist.');
          return;
        }

        setSession(newSession);
        const uid = newSession.user?.id;
        if (uid) {
          void loadProfile(uid, userEmail);
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [initialDev, signOut]);

  // 5-Minute Inactivity Auto-Logout with Cross-Tab Sync and Match-Aware Pause
  useEffect(() => {
    if (!session) return;

    // Set initial activity timestamp if none exists
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      recordUserActivity();
    }

    let lastRecorded = 0;
    const recordActivity = () => {
      const now = Date.now();
      // Throttle rapid input events to at most once per second
      if (now - lastRecorded >= 1000) {
        lastRecorded = now;
        recordUserActivity(localStorage, now);
      }
    };

    const nowInit = Date.now();
    const lastInit = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || nowInit);
    let wasInMatch = isMatchActive(undefined, localStorage, nowInit, lastInit);

    // Check inactivity periodically
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || now);
      const currentInMatch = isMatchActive(undefined, localStorage, now, last);

      // If a match just ended, grant a fresh 5-minute countdown
      if (wasInMatch && !currentInMatch) {
        recordUserActivity();
      }
      wasInMatch = currentInMatch;

      const evaluation = evaluateInactivity(last, now, currentInMatch);

      if (evaluation.shouldLogout) {
        clearInterval(checkInterval);
        void signOut('You were logged out due to 5 minutes of inactivity.');
      }
    }, 5000); // Check every 5 seconds

    // Cross-tab storage listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) {
        // Activity detected in another tab
      } else if (e.key === IN_MATCH_KEY) {
        // Match status updated in another tab
        if (!e.newValue) {
          // Match ended in another tab: restart with fresh 5 minutes
          recordUserActivity();
        }
      } else if (e.key === LOGOUT_NOTICE_KEY && e.newValue) {
        // Logged out in another tab
        void signOut(e.newValue);
      }
    };

    // Route change listener (hashchange) to detect entering or leaving a match
    const handleHashChange = () => {
      const now = Date.now();
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || now);
      const currentInMatch = isMatchActive(undefined, localStorage, now, last);
      if (wasInMatch && !currentInMatch) {
        // Just exited a match: grant a fresh 5-minute countdown
        recordUserActivity();
      }
      wasInMatch = currentInMatch;
      recordActivity();
    };

    // Tab visibility listener (tab becoming visible triggers activity)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recordActivity();
      }
    };

    // Listen to user input events:
    // mousemove, mousedown, keydown, touchstart, scroll, pointerdown, pointermove, wheel
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'pointerdown',
      'pointermove',
      'wheel',
    ];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(checkInterval);
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, signOut]);

  async function signIn(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    if (!isAuthorizedEmail(cleanEmail)) {
      return { error: 'This email is not authorized to use HAYA Games.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { error: translateAuthError(error.message) };
      }

      if (data.session) {
        localStorage.setItem('haya_last_activity', String(Date.now()));
        setSession(data.session);
        if (data.session.user) {
          void loadProfile(data.session.user.id, cleanEmail);
        }
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      return { error: `Connection failed: ${msg}. If offline, select your profile above.` };
    }
  }

  async function signUp(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    if (!isAuthorizedEmail(cleanEmail)) {
      return { error: 'This email is not authorized to use HAYA Games.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) return { error: translateAuthError(error.message) };
      if (!data.session && !data.user) {
        return { error: 'Sign-up was rejected. This email is not authorized.' };
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-up failed';
      return { error: `Sign-up failed: ${msg}` };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        logoutNotice,
        clearLogoutNotice,
        signIn,
        signUp,
        devSignIn,
        signOut,
        updateProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('not authorized')) return 'This email is not authorized to use HAYA Games.';
  if (m.includes('rate limit') || m.includes('for security purposes')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'That account already exists. Try signing in instead.';
  }
  return msg;
}
