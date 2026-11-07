/**
 * Inactivity timeout duration: 5 minutes (in milliseconds).
 */
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Maximum duration an online match can pause inactivity without user activity: 2 hours (in milliseconds).
 * If a match flag remains active for 2 hours or more with no activity, it is treated as stale.
 */
export const MAX_MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

export const LAST_ACTIVITY_KEY = 'haya_last_activity';
export const IN_MATCH_KEY = 'haya_in_match';
export const IN_MATCH_TIME_KEY = 'haya_in_match_since';
export const LOGOUT_NOTICE_KEY = 'haya_logout_notice';
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
 * Determines whether an ONLINE multiplayer match is actively running.
 * Returns true ONLY when an online match is active (via haya_in_match flag or activeMatch).
 * Generic /play/ routes (solo and bot games) do NOT pause the timer and return false.
 * If the match has been set for more than 2 hours without activity, it is treated as stale.
 */
export function isMatchActive(
  activeMatchOrFlag?: unknown,
  inMatchFlagOrStorage?: boolean | Pick<Storage, 'getItem' | 'removeItem'>,
  storageOrNow?: Pick<Storage, 'getItem' | 'removeItem'> | number,
  nowOrLastActivity?: number,
  lastActivityMsParam?: number
): boolean {
  // Resolve storage
  let storage: Pick<Storage, 'getItem' | 'removeItem'> | undefined;
  if (
    inMatchFlagOrStorage &&
    typeof inMatchFlagOrStorage === 'object' &&
    'getItem' in inMatchFlagOrStorage
  ) {
    storage = inMatchFlagOrStorage;
  } else if (
    storageOrNow &&
    typeof storageOrNow === 'object' &&
    'getItem' in storageOrNow
  ) {
    storage = storageOrNow;
  } else if (typeof window !== 'undefined' && window.localStorage) {
    storage = window.localStorage;
  }

  // Resolve now
  let now = Date.now();
  if (typeof storageOrNow === 'number') {
    now = storageOrNow;
  } else if (typeof nowOrLastActivity === 'number' && typeof lastActivityMsParam === 'number') {
    now = nowOrLastActivity;
  } else if (
    typeof nowOrLastActivity === 'number' &&
    typeof inMatchFlagOrStorage !== 'boolean'
  ) {
    now = nowOrLastActivity;
  }

  // Resolve lastActivityMs
  let lastActivityMs: number | undefined;
  if (typeof lastActivityMsParam === 'number') {
    lastActivityMs = lastActivityMsParam;
  } else if (
    typeof nowOrLastActivity === 'number' &&
    typeof storageOrNow === 'number'
  ) {
    lastActivityMs = nowOrLastActivity;
  } else if (storage) {
    try {
      const stored = storage.getItem(LAST_ACTIVITY_KEY);
      if (stored && !isNaN(Number(stored))) {
        lastActivityMs = Number(stored);
      }
    } catch {
      // Ignore storage read errors
    }
  }

  // Check if active match is indicated via parameter
  let hasActiveMatchParam = false;
  let hasInMatchFlagParam = false;

  if (typeof activeMatchOrFlag === 'boolean') {
    hasActiveMatchParam = activeMatchOrFlag;
  } else if (
    activeMatchOrFlag &&
    typeof activeMatchOrFlag === 'object' &&
    !Array.isArray(activeMatchOrFlag)
  ) {
    const obj = activeMatchOrFlag as {
      activeMatch?: unknown;
      inMatchFlag?: boolean;
      storage?: Pick<Storage, 'getItem' | 'removeItem'>;
      now?: number;
      lastActivityMs?: number;
    };
    if (obj.storage) storage = obj.storage;
    if (obj.now !== undefined) now = obj.now;
    if (obj.lastActivityMs !== undefined) lastActivityMs = obj.lastActivityMs;

    if ('activeMatch' in obj) {
      hasActiveMatchParam = Boolean(obj.activeMatch);
    } else if ('inMatchFlag' in obj) {
      hasInMatchFlagParam = Boolean(obj.inMatchFlag);
    } else {
      // It's an activeMatch object (e.g. { matchId: string, gameId: string, ... })
      hasActiveMatchParam = true;
    }
  }

  if (typeof inMatchFlagOrStorage === 'boolean') {
    hasInMatchFlagParam = inMatchFlagOrStorage;
  }

  // Check storage flag
  let hasStorageFlag = false;
  if (storage) {
    try {
      const val = storage.getItem(IN_MATCH_KEY);
      hasStorageFlag = val === 'true' || (val !== null && !isNaN(Number(val)) && Number(val) > 0);
    } catch {
      // Ignore storage errors
    }
  }

  const isMatch = hasActiveMatchParam || hasInMatchFlagParam || hasStorageFlag;
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
 * Evaluates session inactivity state.
 * If an online match is active, the inactivity timer is paused and cannot trigger logout,
 * capped at MAX_MATCH_DURATION_MS (2 hours) without user activity.
 * If the match has been inactive for >= 2 hours, it is treated as stale and triggers logout.
 * Solo and bot games are NOT active matches and time out normally after timeoutMs (5 minutes).
 *
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
      // Stale online match (> 2 hours without activity): cap the pause and logout
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
export function setMatchActiveState(
  inMatch: boolean,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = typeof localStorage !== 'undefined' ? localStorage : { setItem: () => {}, removeItem: () => {} },
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
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Clears the in-match state from storage.
 * Called on application startup and on user logout.
 */
export function clearMatchActiveState(
  storage: Pick<Storage, 'removeItem'> = typeof localStorage !== 'undefined'
    ? localStorage
    : { removeItem: () => {} }
): void {
  try {
    storage.removeItem(IN_MATCH_KEY);
    storage.removeItem(IN_MATCH_TIME_KEY);
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
