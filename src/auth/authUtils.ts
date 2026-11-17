export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
export const MAX_MATCH_DURATION_MS = 2 * 60 * 60 * 1000;
export const LAST_ACTIVITY_KEY = 'haya_last_activity';
export const IN_MATCH_KEY = 'haya_in_match';
export const IN_MATCH_TIME_KEY = 'haya_in_match_since';
export const LOGOUT_NOTICE_KEY = 'haya_logout_notice';
export function translateAuthError(msg: string): string {
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
export type IsMatchActiveOptions = {
  activeMatch?: unknown;
  inMatchFlag?: boolean;
  storage?: Pick<Storage, 'getItem' | 'removeItem'>;
  now?: number;
  lastActivityMs?: number;
};

export function isMatchActive(opts: IsMatchActiveOptions = {}): boolean {
  let storage = opts.storage;
  if (!storage && typeof window !== 'undefined' && window.localStorage) {
    storage = window.localStorage;
  }

  const now = opts.now ?? Date.now();
  let lastActivityMs = opts.lastActivityMs;

  if (lastActivityMs === undefined && storage) {
    try {
      const stored = storage.getItem(LAST_ACTIVITY_KEY);
      if (stored && !isNaN(Number(stored))) {
        lastActivityMs = Number(stored);
      }
    } catch {
      // Ignore
    }
  }

  const hasActiveMatch = Boolean(opts.activeMatch);
  const hasInMatchFlag = Boolean(opts.inMatchFlag);

  let hasStorageFlag = false;
  if (storage) {
    try {
      const val = storage.getItem(IN_MATCH_KEY);
      hasStorageFlag = val === 'true' || (val !== null && !isNaN(Number(val)) && Number(val) > 0);
    } catch {
      // Ignore
    }
  }

  const isMatch = hasActiveMatch || hasInMatchFlag || hasStorageFlag;
  if (!isMatch) {
    return false;
  }

  // Check 2-hour staleness cap:
  // If the flag has been set for more than 2 hours without activity, treat it as stale.
  const idleMs =
    lastActivityMs !== undefined && lastActivityMs > 0
      ? now - lastActivityMs
      : undefined;

  let flagDurationMs: number | undefined;
  if (storage) {
    try {
      const flagSince = storage.getItem(IN_MATCH_TIME_KEY);
      if (flagSince && !isNaN(Number(flagSince))) {
        flagDurationMs = now - Number(flagSince);
      }
    } catch {
      // Ignore
    }
  }

  const isStaleByActivity = idleMs !== undefined && idleMs >= MAX_MATCH_DURATION_MS;
  const isStaleByDurationWithoutActivity =
    flagDurationMs !== undefined &&
    flagDurationMs >= MAX_MATCH_DURATION_MS &&
    (idleMs === undefined || idleMs >= MAX_MATCH_DURATION_MS);

  if (isStaleByActivity || isStaleByDurationWithoutActivity) {
    // Treat as stale: clear from storage and return false
    if (storage) {
      try {
        storage.removeItem(IN_MATCH_KEY);
        storage.removeItem(IN_MATCH_TIME_KEY);
      } catch {
        // Ignore
      }
    }
    return false;
  }

  return true;
}
export type InactivityEvaluation = {
  shouldLogout: boolean;
  isPaused: boolean;
  idleTimeMs: number;
  remainingMs: number;
};
/**
 * @param lastActivityMs - Epoch timestamp of last recorded user activity.
 * @param now - Current epoch timestamp.
 * @param isMatch - Whether an online multiplayer match is active.
 * @param timeoutMs - Timeout threshold in ms (defaults to 5 minutes).
 */
export function evaluateInactivity(
  lastActivityMs: number,
  now: number,
  isMatch: boolean,
  timeoutMs: number = INACTIVITY_TIMEOUT_MS
): InactivityEvaluation {
  const idleTimeMs = Math.max(0, now - (lastActivityMs || now));
  if (isMatch) {
    if (idleTimeMs >= MAX_MATCH_DURATION_MS) {
      return {
        shouldLogout: true,
        isPaused: false,
        idleTimeMs,
        remainingMs: 0,
      };
    }
    return {
      shouldLogout: false,
      isPaused: true,
      idleTimeMs: 0,
      remainingMs: timeoutMs,
    };
  }
  const remainingMs = Math.max(0, timeoutMs - idleTimeMs);
  const shouldLogout = idleTimeMs >= timeoutMs;
  return {
    shouldLogout,
    isPaused: false,
    idleTimeMs,
    remainingMs,
  };
}
export function recordUserActivity(
  storage: Pick<Storage, 'setItem'> = typeof localStorage !== 'undefined' ? localStorage : { setItem: () => { } },
  now: number = Date.now()
): void {
  try {
    storage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {
    /* ignore storage error */
  }
}
export function setMatchActiveState(
  inMatch: boolean,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = typeof localStorage !== 'undefined' ? localStorage : { setItem: () => { }, removeItem: () => { } },
  now: number = Date.now()
): void {
  try {
    if (inMatch) {
      storage.setItem(IN_MATCH_KEY, 'true');
      storage.setItem(IN_MATCH_TIME_KEY, String(now));
    } else {
      storage.removeItem(IN_MATCH_KEY);
      storage.removeItem(IN_MATCH_TIME_KEY);
      storage.setItem(LAST_ACTIVITY_KEY, String(now));
    }
  } catch {
    /* ignore storage error */
  }
}
export function clearMatchActiveState(
  storage: Pick<Storage, 'removeItem'> = typeof localStorage !== 'undefined'
    ? localStorage
    : { removeItem: () => { } }
): void {
  try {
    storage.removeItem(IN_MATCH_KEY);
    storage.removeItem(IN_MATCH_TIME_KEY);
  } catch {
    /* ignore storage error */
  }
}
export type FallbackProfile = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
};
export function createFallbackProfile(
  uid: string,
  emailHint: string
): FallbackProfile {
  const isSecond = emailHint.toLowerCase().includes('harika');
  return {
    id: uid,
    email: emailHint,
    display_name: isSecond ? 'Harika' : 'Aditya',
    is_admin: false,
  };
}