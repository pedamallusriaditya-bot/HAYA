import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';
import { AUTHORIZED_EMAILS, isAuthorizedEmail } from './authUtils';

export { AUTHORIZED_EMAILS, isAuthorizedEmail };

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  logoutNotice: string | null;
  clearLogoutNotice: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  devSignIn: (email: string, name: string) => void;
  signOut: (reason?: string) => Promise<void>;
  updateProfileState: (updated: Partial<Profile>) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const DEV_ADITYA_UUID = '00000000-0000-0000-0000-000000000001';
const DEV_HARIKA_UUID = '00000000-0000-0000-0000-000000000002';

function getInitialDevSession() {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return null;
  try {
    const raw = localStorage.getItem('haya_dev_auth');
    if (!raw) return null;
    const { email, name } = JSON.parse(raw);
    if (!email || !isAuthorizedEmail(email)) return null;

    const isHarika = email.toLowerCase() === 'pasulaharika61@gmail.com';
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
      is_admin: true,
      preferences: { sound: true, music: true },
    };
    return { session: mockSession, profile: mockProfile };
  } catch {
    return null;
  }
}

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
        .select('id, email, display_name, is_admin, avatar_data, preferences, created_at, updated_at')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.warn('[AuthContext] Profile load warning:', error.message);
        if (emailHint && isAuthorizedEmail(emailHint)) {
          setProfile({
            id: uid,
            email: emailHint,
            display_name: emailHint.includes('harika') ? 'Harika' : 'Aditya',
            is_admin: true,
            preferences: { sound: true, music: true },
          });
        }
        return;
      }

      if (data) {
        setProfile(data as Profile);
      } else if (emailHint && isAuthorizedEmail(emailHint)) {
        // Fallback profile if row hasn't been created yet
        setProfile({
          id: uid,
          email: emailHint,
          display_name: emailHint.includes('harika') ? 'Harika' : 'Aditya',
          is_admin: true,
          preferences: { sound: true, music: true },
        });
      }
    } catch (err) {
      console.warn('[AuthContext] Network error loading profile:', err);
      if (emailHint && isAuthorizedEmail(emailHint)) {
        setProfile({
          id: uid,
          email: emailHint,
          display_name: emailHint.includes('harika') ? 'Harika' : 'Aditya',
          is_admin: true,
          preferences: { sound: true, music: true },
        });
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

  // 5-Minute Inactivity Auto-Logout with Cross-Tab Sync
  useEffect(() => {
    if (!session) return;

    const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (300,000 ms)

    // Set initial activity timestamp if none exists
    if (!localStorage.getItem('haya_last_activity')) {
      localStorage.setItem('haya_last_activity', String(Date.now()));
    }

    const recordActivity = () => {
      localStorage.setItem('haya_last_activity', String(Date.now()));
    };

    // Check inactivity periodically
    const checkInterval = setInterval(() => {
      const last = Number(localStorage.getItem('haya_last_activity') || Date.now());
      const idleTime = Date.now() - last;
      if (idleTime >= INACTIVITY_TIMEOUT_MS) {
        clearInterval(checkInterval);
        void signOut('You were logged out due to 5 minutes of inactivity.');
      }
    }, 10000); // Check every 10 seconds

    // Cross-tab storage listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'haya_last_activity') {
        // Activity detected in another tab
      } else if (e.key === 'haya_logout_notice' && e.newValue) {
        // Logged out in another tab
        void signOut(e.newValue);
      }
    };

    // Listen to genuine user input events only (not background polling or heartbeats)
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(checkInterval);
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      window.removeEventListener('storage', handleStorageChange);
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
