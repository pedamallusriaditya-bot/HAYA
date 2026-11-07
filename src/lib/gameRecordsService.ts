import { supabase, type GameRecord, type UserPreferences } from './supabase.ts';

const RECORDS_STORAGE_PREFIX = 'haya_game_records_';
const UNSYNCED_STORAGE_PREFIX = 'haya_unsynced_records_';
const PREFS_STORAGE_PREFIX = 'haya_prefs_';

export const MAX_LOCAL_RECORDS = 100;
export const MAX_UNSYNCED_RECORDS = 100;

export type UserGameStats = {
  totalPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winPercentage: number;
  byGame: Record<
    string,
    {
      played: number;
      wins: number;
      losses: number;
      draws: number;
      bestScore: number | null;
      scoreType: 'score' | 'time';
    }
  >;
  recentMatches: GameRecord[];
};

export type RecordGameResultResponse = {
  success: boolean;
  synced: boolean;
  record: GameRecord;
  error?: string;
};

/**
 * Safely parses a JSON string or returns null.
 */
function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn('[gameRecordsService] JSON parse error:', err);
    return null;
  }
}

/**
 * Returns locally cached game records for a user.
 */
export function getLocalRecords(userId: string): GameRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${RECORDS_STORAGE_PREFIX}${userId}`);
    const parsed = safeJsonParse<GameRecord[]>(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[gameRecordsService] Local records read error:', err);
  }
  return [];
}

/**
 * Saves game records to local storage cache, capping at MAX_LOCAL_RECORDS.
 */
export function saveLocalRecords(userId: string, records: GameRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${RECORDS_STORAGE_PREFIX}${userId}`,
      JSON.stringify(records.slice(0, MAX_LOCAL_RECORDS))
    );
  } catch (err) {
    console.warn('[gameRecordsService] Local records write error:', err);
  }
}

/**
 * Returns locally queued unsynced game records for a user.
 */
export function getUnsyncedRecords(userId: string): GameRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${UNSYNCED_STORAGE_PREFIX}${userId}`);
    const parsed = safeJsonParse<GameRecord[]>(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[gameRecordsService] Unsynced records read error:', err);
  }
  return [];
}

/**
 * Saves unsynced game records to the persistent queue in localStorage.
 */
export function saveUnsyncedRecords(userId: string, records: GameRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${UNSYNCED_STORAGE_PREFIX}${userId}`,
      JSON.stringify(records.slice(0, MAX_UNSYNCED_RECORDS))
    );
  } catch (err) {
    console.warn('[gameRecordsService] Unsynced records write error:', err);
  }
}

/**
 * Adds a game record to the persistent unsynced queue, avoiding duplicates.
 */
export function addToUnsyncedQueue(userId: string, record: GameRecord): void {
  const current = getUnsyncedRecords(userId);
  const filtered = current.filter((r) => {
    if (record.match_id && r.match_id) {
      return r.match_id !== record.match_id;
    }
    if (record.id && r.id) {
      return r.id !== record.id;
    }
    return true;
  });
  saveUnsyncedRecords(userId, [record, ...filtered]);
}

/**
 * Removes a record from the persistent unsynced queue by match_id or id.
 */
export function removeFromUnsyncedQueue(userId: string, matchIdOrId: string): void {
  const current = getUnsyncedRecords(userId);
  const filtered = current.filter(
    (r) => r.match_id !== matchIdOrId && r.id !== matchIdOrId
  );
  saveUnsyncedRecords(userId, filtered);
}

/**
 * Checks whether an error represents a unique constraint violation.
 */
export function isUniqueViolation(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object') {
    const errObj = error as { code?: string; message?: string; details?: string };
    if (errObj.code === '23505') return true;
    const msg = `${errObj.message || ''} ${errObj.details || ''}`.toLowerCase();
    return (
      msg.includes('unique constraint') ||
      msg.includes('duplicate key') ||
      msg.includes('already exists') ||
      msg.includes('23505')
    );
  }
  return false;
}

/**
 * Merges remote and local records by match_id (falling back to id) and sorts by created_at descending.
 * Remote records take precedence for common identifiers.
 */
export function mergeGameRecords(remote: GameRecord[], local: GameRecord[]): GameRecord[] {
  const seenKeys = new Set<string>();
  const merged: GameRecord[] = [];

  const getRecordKey = (r: GameRecord): string | null => {
    if (r.match_id) return `match:${r.match_id}`;
    if (r.id) return `id:${r.id}`;
    return null;
  };

  // Remote records are authoritative; add them first
  for (const r of remote) {
    const key = getRecordKey(r);
    if (key) {
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        merged.push(r);
      }
    } else {
      merged.push(r);
    }
  }

  // Local records: add any that are not already present in remote
  for (const r of local) {
    const key = getRecordKey(r);
    if (key) {
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        merged.push(r);
      }
    } else {
      merged.push(r);
    }
  }

  // Sort by created_at descending
  merged.sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  return merged;
}

// Track matches already submitted in memory to prevent duplicate submissions
const submittedMatches = new Set<string>();

/**
 * Resets in-memory submitted matches set. Useful for isolated testing.
 */
export function _resetSubmittedMatches(): void {
  submittedMatches.clear();
}

/**
 * Records a completed game result (single-player, bot, or multiplayer).
 * Persists to Supabase and keeps local cache synchronized.
 */
export async function recordGameResult(
  record: GameRecord
): Promise<RecordGameResultResponse> {
  const dedupeKey = record.match_id ? `${record.user_id}_${record.match_id}` : null;

  // Prevent duplicate submissions in same session IF already successfully submitted
  if (dedupeKey && submittedMatches.has(dedupeKey)) {
    console.log('[gameRecordsService] Match already recorded, skipping dedupe:', dedupeKey);
    return { success: true, synced: true, record };
  }

  const normalizedRecord: GameRecord = {
    ...record,
    score_type: record.score_type || 'score',
    opponent_type: record.opponent_type || 'none',
    created_at: record.created_at || new Date().toISOString(),
  };

  // 1. Instantly update local cache for zero-latency UI updates
  const local = getLocalRecords(record.user_id);
  const merged = mergeGameRecords([normalizedRecord], local);
  saveLocalRecords(record.user_id, merged);

  // Broadcast event for live UI reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('haya_game_record_added', { detail: normalizedRecord })
    );
  }

  // 2. Persist to Supabase
  try {
    const { data, error } = await supabase
      .from('game_records')
      .insert([
        {
          user_id: normalizedRecord.user_id,
          game: normalizedRecord.game,
          mode: normalizedRecord.mode,
          result: normalizedRecord.result,
          score: normalizedRecord.score,
          score_type: normalizedRecord.score_type,
          opponent_type: normalizedRecord.opponent_type,
          opponent_name: normalizedRecord.opponent_name || null,
          bot_difficulty: normalizedRecord.bot_difficulty || null,
          duration_seconds: normalizedRecord.duration_seconds || null,
          match_id: normalizedRecord.match_id || null,
          created_at: normalizedRecord.created_at,
        },
      ])
      .select()
      .maybeSingle();

    if (error) {
      if (isUniqueViolation(error)) {
        // Unique violation means this match already exists in Supabase: treat as success!
        if (dedupeKey) {
          submittedMatches.add(dedupeKey);
        }
        if (record.match_id) {
          removeFromUnsyncedQueue(record.user_id, record.match_id);
        }
        return { success: true, synced: true, record: normalizedRecord };
      }

      console.warn('[gameRecordsService] Supabase insert warning:', error.message);
      addToUnsyncedQueue(record.user_id, normalizedRecord);
      return { success: true, synced: false, record: normalizedRecord, error: error.message };
    }

    if (dedupeKey) {
      submittedMatches.add(dedupeKey);
    }
    if (record.match_id) {
      removeFromUnsyncedQueue(record.user_id, record.match_id);
    }
    const saved = (data as GameRecord) || normalizedRecord;
    return { success: true, synced: true, record: saved };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error';
    console.warn('[gameRecordsService] Remote sync fallback to local cache:', msg);
    addToUnsyncedQueue(record.user_id, normalizedRecord);
    return { success: true, synced: false, record: normalizedRecord, error: msg };
  }
}

/**
 * Fetches match history for a user, combining Supabase and local cache.
 * Preserves any unsynced local records by merging them with remote rows.
 */
export async function fetchUserGameHistory(
  userId: string,
  limit = 50
): Promise<{ records: GameRecord[]; fromCache: boolean; error?: string }> {
  const local = getLocalRecords(userId);

  try {
    const { data, error } = await supabase
      .from('game_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[gameRecordsService] Could not load remote history, using local cache:', error.message);
      return { records: local.slice(0, limit), fromCache: true, error: error.message };
    }

    const remoteRecords = (data as GameRecord[]) || [];
    // Merge remote and local records by match_id (fall back to id), and sort by created_at descending
    const merged = mergeGameRecords(remoteRecords, local);
    saveLocalRecords(userId, merged);

    // If any remote record has match_id or id matching an unsynced queue item, prune it
    if (remoteRecords.length > 0) {
      const unsynced = getUnsyncedRecords(userId);
      if (unsynced.length > 0) {
        const remoteMatchIds = new Set(remoteRecords.map((r) => r.match_id).filter(Boolean));
        const remoteIds = new Set(remoteRecords.map((r) => r.id).filter(Boolean));
        const stillUnsynced = unsynced.filter((r) => {
          if (r.match_id && remoteMatchIds.has(r.match_id)) return false;
          if (r.id && remoteIds.has(r.id)) return false;
          return true;
        });
        if (stillUnsynced.length !== unsynced.length) {
          saveUnsyncedRecords(userId, stillUnsynced);
        }
      }
    }

    return { records: merged.slice(0, limit), fromCache: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    console.warn('[gameRecordsService] Network error fetching history:', msg);
    return { records: local.slice(0, limit), fromCache: true, error: msg };
  }
}

/**
 * Flushes queued unsynced game records by retrying inserts into Supabase.
 * Unique-violations on (user_id, match_id) are treated as success.
 */
export async function flushUnsyncedRecords(
  userId: string
): Promise<{ flushed: number; remaining: number; errors?: string[] }> {
  if (!userId) return { flushed: 0, remaining: 0 };
  const queue = getUnsyncedRecords(userId);
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  let flushed = 0;
  const remainingQueue: GameRecord[] = [];
  const errors: string[] = [];

  for (const r of queue) {
    const dedupeKey = r.match_id ? `${r.user_id}_${r.match_id}` : null;
    try {
      const { data, error } = await supabase
        .from('game_records')
        .insert([
          {
            user_id: r.user_id,
            game: r.game,
            mode: r.mode,
            result: r.result,
            score: r.score,
            score_type: r.score_type || 'score',
            opponent_type: r.opponent_type || 'none',
            opponent_name: r.opponent_name || null,
            bot_difficulty: r.bot_difficulty || null,
            duration_seconds: r.duration_seconds || null,
            match_id: r.match_id || null,
            created_at: r.created_at,
          },
        ])
        .select()
        .maybeSingle();

      if (error) {
        if (isUniqueViolation(error)) {
          // Unique violation: record already exists in database, treat as success!
          flushed++;
          if (dedupeKey) {
            submittedMatches.add(dedupeKey);
          }
        } else {
          remainingQueue.push(r);
          errors.push(error.message);
        }
      } else {
        flushed++;
        if (dedupeKey) {
          submittedMatches.add(dedupeKey);
        }
        if (data?.id) {
          const local = getLocalRecords(userId);
          const updatedLocal = local.map((loc) =>
            loc.match_id && loc.match_id === r.match_id ? { ...loc, id: data.id } : loc
          );
          saveLocalRecords(userId, updatedLocal);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      remainingQueue.push(r);
      errors.push(msg);
    }
  }

  saveUnsyncedRecords(userId, remainingQueue);

  return {
    flushed,
    remaining: remainingQueue.length,
    ...(errors.length > 0 ? { errors } : {}),
  };
}

/**
 * Computes comprehensive statistics for a user from match history and high scores.
 */
export async function computeUserStats(userId: string): Promise<UserGameStats> {
  const { records } = await fetchUserGameHistory(userId, 200);

  let wins = 0;
  let losses = 0;
  let draws = 0;
  const byGame: UserGameStats['byGame'] = {};

  for (const r of records) {
    if (r.result === 'win') wins++;
    else if (r.result === 'loss') losses++;
    else if (r.result === 'draw') draws++;

    if (!byGame[r.game]) {
      byGame[r.game] = {
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        bestScore: null,
        scoreType: r.score_type || 'score',
      };
    }

    const g = byGame[r.game];
    g.played++;
    if (r.result === 'win') g.wins++;
    else if (r.result === 'loss') g.losses++;
    else if (r.result === 'draw') g.draws++;

    if (r.score !== undefined && r.score !== null) {
      if (g.bestScore === null) {
        g.bestScore = r.score;
      } else {
        g.bestScore =
          g.scoreType === 'time'
            ? Math.min(g.bestScore, r.score)
            : Math.max(g.bestScore, r.score);
      }
    }
  }

  const totalPlayed = records.length;
  const winPercentage = totalPlayed > 0 ? Math.round((wins / totalPlayed) * 100) : 0;

  return {
    totalPlayed,
    wins,
    losses,
    draws,
    winPercentage,
    byGame,
    recentMatches: records.slice(0, 15),
  };
}

/**
 * Loads user preferences from Supabase or local storage fallback.
 */
export async function loadUserPreferences(
  userId: string
): Promise<UserPreferences> {
  const defaultPrefs: UserPreferences = { sound: true, music: true, theme: 'arcade' };

  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(`${PREFS_STORAGE_PREFIX}${userId}`);
      if (local) {
        const parsed = safeJsonParse<Partial<UserPreferences>>(local);
        if (parsed && typeof parsed === 'object') {
          return { ...defaultPrefs, ...parsed };
        }
      }
    } catch {
      // Ignore
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('sound, music, theme')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      const prefs: UserPreferences = {
        sound: typeof data.sound === 'boolean' ? data.sound : true,
        music: typeof data.music === 'boolean' ? data.music : true,
        theme: data.theme || 'arcade',
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${PREFS_STORAGE_PREFIX}${userId}`, JSON.stringify(prefs));
      }
      return prefs;
    }
  } catch (err) {
    console.warn('[gameRecordsService] Could not fetch remote preferences:', err);
  }

  return defaultPrefs;
}

/**
 * Saves user preferences to Supabase and local cache.
 */
export async function saveUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${PREFS_STORAGE_PREFIX}${userId}`, JSON.stringify(preferences));
      window.dispatchEvent(
        new CustomEvent('haya_preferences_updated', { detail: preferences })
      );
    } catch {
      // Ignore
    }
  }

  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          sound: preferences.sound,
          music: preferences.music,
          theme: preferences.theme || 'arcade',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.warn('[gameRecordsService] Remote prefs update error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Preferences save error';
    console.warn('[gameRecordsService] Preferences remote sync warning:', msg);
    return { success: false, error: msg };
  }
}
