import { supabase, type GameRecord, type UserPreferences } from './supabase.ts';

const RECORDS_STORAGE_PREFIX = 'haya_game_records_';
const PREFS_STORAGE_PREFIX = 'haya_prefs_';

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

/**
 * Returns locally cached game records for a user.
 */
export function getLocalRecords(userId: string): GameRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${RECORDS_STORAGE_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[gameRecordsService] Local records read error:', err);
  }
  return [];
}

/**
 * Saves game records to local storage cache.
 */
function saveLocalRecords(userId: string, records: GameRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${RECORDS_STORAGE_PREFIX}${userId}`,
      JSON.stringify(records.slice(0, 100))
    );
  } catch (err) {
    console.warn('[gameRecordsService] Local records write error:', err);
  }
}

// Track matches already submitted in memory to prevent duplicate submissions
const submittedMatches = new Set<string>();

/**
 * Records a completed game result (single-player, bot, or multiplayer).
 * Persists to Supabase and keeps local cache synchronized.
 */
export async function recordGameResult(
  record: GameRecord
): Promise<{ success: boolean; record: GameRecord; error?: string }> {
  // Prevent duplicate submissions in same session
  if (record.match_id) {
    const dedupeKey = `${record.user_id}_${record.match_id}`;
    if (submittedMatches.has(dedupeKey)) {
      console.log('[gameRecordsService] Match already recorded, skipping dedupe:', dedupeKey);
      return { success: true, record };
    }
    submittedMatches.add(dedupeKey);
  }

  const normalizedRecord: GameRecord = {
    ...record,
    score_type: record.score_type || 'score',
    opponent_type: record.opponent_type || 'none',
    created_at: record.created_at || new Date().toISOString(),
  };

  // 1. Instantly update local cache for zero-latency UI updates
  const local = getLocalRecords(record.user_id);
  // Avoid duplicate by match_id
  const filtered = local.filter(
    (r) => !record.match_id || r.match_id !== record.match_id
  );
  saveLocalRecords(record.user_id, [normalizedRecord, ...filtered]);

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
      console.warn('[gameRecordsService] Supabase insert warning:', error.message);
      return { success: true, record: normalizedRecord, error: error.message };
    }

    return { success: true, record: (data as GameRecord) || normalizedRecord };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error';
    console.warn('[gameRecordsService] Remote sync fallback to local cache:', msg);
    return { success: true, record: normalizedRecord, error: msg };
  }
}

/**
 * Fetches match history for a user, combining Supabase and local cache.
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

    if (data && data.length > 0) {
      const remoteRecords = data as GameRecord[];
      // Sync local cache
      saveLocalRecords(userId, remoteRecords);
      return { records: remoteRecords, fromCache: false };
    }
  } catch (err) {
    console.warn('[gameRecordsService] Network error fetching history:', err);
  }

  return { records: local.slice(0, limit), fromCache: true };
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
  const defaultPrefs: UserPreferences = { sound: true, music: true };

  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(`${PREFS_STORAGE_PREFIX}${userId}`);
      if (local) {
        return { ...defaultPrefs, ...JSON.parse(local) };
      }
    } catch {
      // Ignore
    }
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data?.preferences) {
      const prefs = { ...defaultPrefs, ...data.preferences };
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
      .from('profiles')
      .update({
        preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

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

