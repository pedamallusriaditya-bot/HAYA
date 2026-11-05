/**
 * Inactivity timeout duration: 5 minutes (in milliseconds).
 */
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

export const LAST_ACTIVITY_KEY = 'haya_last_activity';
export const IN_MATCH_KEY = 'haya_in_match';
export const LOGOUT_NOTICE_KEY = 'haya_logout_notice';

/**
 * Retrieves the authorized email addresses from the VITE_ALLOWED_EMAILS environment variable.
 * Expects a comma-separated list of emails.
 */
export function getAllowedEmails(): string[] {
  const raw =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALLOWED_EMAILS) ||
    (typeof process !== 'undefined' && process.env?.VITE_ALLOWED_EMAILS) ||
    '';

  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Validates whether an email is in the authorized allowlist.
 * Optionally accepts a custom allowlist (useful for isolated unit testing).
 */
export function isAuthorizedEmail(
  email: string | null | undefined,
  customAllowed?: readonly string[] | string[]
): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const allowed =
    customAllowed && customAllowed.length > 0
      ? customAllowed.map((e) => e.trim().toLowerCase())
      : getAllowedEmails();
  return allowed.includes(clean);
}

/**
 * Determines whether a game match is actively running.
 * Checks route path (e.g. /play/carrom), an explicit match flag, or localStorage.
 */
export function isMatchActive(path?: string, inMatchFlag?: boolean): boolean {
  if (inMatchFlag) return true;
  if (path && (path.startsWith('/play/') || path.includes('/play/'))) return true;

  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    if (hash.startsWith('#/play/') || hash.includes('/play/')) return true;

    try {
      if (window.localStorage && window.localStorage.getItem(IN_MATCH_KEY) === 'true') {
        return true;
      }
    } catch {
      // Storage access may be restricted in sandboxed iframes
    }
  }

  return false;
}

export type InactivityEvaluation = {
  shouldLogout: boolean;
  isPaused: boolean;
  idleTimeMs: number;
  remainingMs: number;
};

/**
 * Evaluates session inactivity state.
 * If a match is active, the inactivity timer is paused and cannot trigger logout.
 *
 * @param lastActivityMs - Epoch timestamp of last recorded user activity.
 * @param now - Current epoch timestamp.
 * @param isMatch - Whether a match is active (pauses timer).
 * @param timeoutMs - Timeout threshold in ms (defaults to 5 minutes).
 */
export function evaluateInactivity(
  lastActivityMs: number,
  now: number,
  isMatch: boolean,
  timeoutMs: number = INACTIVITY_TIMEOUT_MS
): InactivityEvaluation {
  if (isMatch) {
    return {
      shouldLogout: false,
      isPaused: true,
      idleTimeMs: 0,
      remainingMs: timeoutMs,
    };
  }

  const idleTimeMs = Math.max(0, now - (lastActivityMs || now));
  const remainingMs = Math.max(0, timeoutMs - idleTimeMs);
  const shouldLogout = idleTimeMs >= timeoutMs;

  return {
    shouldLogout,
    isPaused: false,
    idleTimeMs,
    remainingMs,
  };
}

/**
 * Records user activity by updating the last activity timestamp in storage.
 */
export function recordUserActivity(
  storage: Pick<Storage, 'setItem'> = typeof localStorage !== 'undefined' ? localStorage : { setItem: () => {} },
  now: number = Date.now()
): void {
  try {
    storage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Sets or clears the in-match state in storage.
 * When the match ends, it refreshes the last activity timestamp so the player receives
 * a fresh 5 minutes of inactivity grace time.
 */
export function setMatchActiveState(
  inMatch: boolean,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = typeof localStorage !== 'undefined' ? localStorage : { setItem: () => {}, removeItem: () => {} },
  now: number = Date.now()
): void {
  try {
    if (inMatch) {
      storage.setItem(IN_MATCH_KEY, 'true');
    } else {
      storage.removeItem(IN_MATCH_KEY);
      // Restart with a fresh 5 minutes when the match ends
      storage.setItem(LAST_ACTIVITY_KEY, String(now));
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export type FallbackProfile = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  preferences: { sound: boolean; music: boolean };
};

/**
 * Creates a safe fallback profile for an authorized user when their remote profile
 * record cannot be loaded. Always sets is_admin: false to strictly prevent privilege elevation.
 */
export function createFallbackProfile(
  uid: string,
  emailHint: string
): FallbackProfile {
  const allowed = getAllowedEmails();
  const isSecond =
    (allowed.length > 1 && emailHint.toLowerCase() === allowed[1].toLowerCase()) ||
    emailHint.toLowerCase().includes('harika');

  return {
    id: uid,
    email: emailHint,
    display_name: isSecond ? 'Harika' : 'Aditya',
    is_admin: false,
    preferences: { sound: true, music: true },
  };
}
