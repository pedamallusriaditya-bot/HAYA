import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const TEST_EMAIL_1 = 'test.player1@haya.local';
const TEST_EMAIL_2 = 'test.player2@haya.local';
const TEST_UID_1 = '00000000-0000-0000-0000-000000000001';
const TEST_UID_2 = '00000000-0000-0000-0000-000000000002';

// Configure test environment variable for allowed emails
process.env.VITE_ALLOWED_EMAILS = `${TEST_EMAIL_1},${TEST_EMAIL_2}`;

// Mock localStorage for node environment
const storage = new Map<string, string>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = {
  dispatchEvent: () => true,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

// Mock Supabase module to prevent network calls and bypass credentials check in unit tests
const userPreferencesDb = new Map<string, { user_id: string; sound: boolean; music: boolean; theme?: string }>();

if (mock && typeof mock.module === 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable = (table?: string): any => {
    let filterId: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = {
      select: () => obj,
      insert: () => obj,
      update: () => obj,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      upsert: (record: any) => {
        if (table === 'user_preferences' && record?.user_id) {
          userPreferencesDb.set(record.user_id, { ...record });
        }
        return obj;
      },
      delete: () => obj,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eq: (col: string, val: any) => {
        if (col === 'user_id' || col === 'id') {
          filterId = val;
        }
        return obj;
      },
      neq: () => obj,
      order: () => obj,
      limit: () => obj,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => {
        if (table === 'user_preferences' && filterId && userPreferencesDb.has(filterId)) {
          const row = userPreferencesDb.get(filterId)!;
          return Promise.resolve({
            data: { sound: row.sound, music: row.music, theme: row.theme },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return obj;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mock as any).module('./supabase.ts', {
    namedExports: {
      supabase: {
        from: (tableName: string) => chainable(tableName),
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          signOut: () => Promise.resolve({ error: null }),
        },
      },
    },
  });
}

import { isAuthorizedEmail } from '../auth/authUtils.ts';
const { getCachedAvatar, saveUserAvatar } = await import('./avatarStorage.ts');
const {
  getLocalRecords,
  recordGameResult,
  computeUserStats,
  loadUserPreferences,
  saveUserPreferences,
} = await import('./gameRecordsService.ts');

test('Security Allowlist: Only configured authorized accounts permitted', () => {
  assert.equal(isAuthorizedEmail(TEST_EMAIL_1), true);
  assert.equal(isAuthorizedEmail(TEST_EMAIL_2), true);
  assert.equal(isAuthorizedEmail(TEST_EMAIL_1.toUpperCase()), true);
  assert.equal(isAuthorizedEmail(TEST_EMAIL_2.toUpperCase()), true);

  assert.equal(isAuthorizedEmail('unknown@example.com'), false);
  assert.equal(isAuthorizedEmail('attacker@haya.local'), false);
  assert.equal(isAuthorizedEmail(''), false);
  assert.equal(isAuthorizedEmail(null), false);
  assert.equal(isAuthorizedEmail(undefined), false);
});

test('Avatar System: Independent persistence between Player 1 and Player 2', async () => {
  const p1Avatar = getCachedAvatar(TEST_EMAIL_1, 'Aditya');
  const p2Avatar = getCachedAvatar(TEST_EMAIL_2, 'Harika');

  p1Avatar.headwear = 'cyber_headband';
  p1Avatar.clothingColor = '#3b82f6';
  await saveUserAvatar(TEST_EMAIL_1, p1Avatar, TEST_UID_1);

  p2Avatar.headwear = 'beanie';
  p2Avatar.clothingColor = '#ec4899';
  await saveUserAvatar(TEST_EMAIL_2, p2Avatar, TEST_UID_2);

  const loadedP1 = getCachedAvatar(TEST_EMAIL_1, 'Aditya');
  const loadedP2 = getCachedAvatar(TEST_EMAIL_2, 'Harika');

  assert.equal(loadedP1.headwear, 'cyber_headband');
  assert.equal(loadedP1.clothingColor, '#3b82f6');

  assert.equal(loadedP2.headwear, 'beanie');
  assert.equal(loadedP2.clothingColor, '#ec4899');
  assert.notEqual(loadedP1.clothingColor, loadedP2.clothingColor);
});

test('Game Records & Stats: Strict user data isolation', async () => {
  // Clear any existing records in mock storage
  storage.delete(`haya_game_records_${TEST_UID_1}`);
  storage.delete(`haya_game_records_${TEST_UID_2}`);

  // Player 1 records 2 wins in Chess
  await recordGameResult({
    user_id: TEST_UID_1,
    game: 'chess',
    mode: 'bot',
    result: 'win',
    score: 1,
    match_id: 'p1_match_1',
  });
  await recordGameResult({
    user_id: TEST_UID_1,
    game: 'chess',
    mode: 'bot',
    result: 'win',
    score: 1,
    match_id: 'p1_match_2',
  });

  // Player 2 records 1 loss in Connect 4
  await recordGameResult({
    user_id: TEST_UID_2,
    game: 'connect4',
    mode: 'bot',
    result: 'loss',
    score: 0,
    match_id: 'p2_match_1',
  });

  const p1Records = getLocalRecords(TEST_UID_1);
  const p2Records = getLocalRecords(TEST_UID_2);

  assert.equal(p1Records.length, 2);
  assert.equal(p2Records.length, 1);
  assert.equal(p1Records[0].game, 'chess');
  assert.equal(p2Records[0].game, 'connect4');

  const p1Stats = await computeUserStats(TEST_UID_1);
  const p2Stats = await computeUserStats(TEST_UID_2);

  assert.equal(p1Stats.totalPlayed, 2);
  assert.equal(p1Stats.wins, 2);
  assert.equal(p1Stats.losses, 0);
  assert.equal(p1Stats.winPercentage, 100);

  assert.equal(p2Stats.totalPlayed, 1);
  assert.equal(p2Stats.wins, 0);
  assert.equal(p2Stats.losses, 1);
  assert.equal(p2Stats.winPercentage, 0);
});

test('User Preferences: Independent audio and theme configuration', async () => {
  await saveUserPreferences(TEST_UID_1, { sound: true, music: false, theme: 'retro' });
  await saveUserPreferences(TEST_UID_2, { sound: false, music: true, theme: 'neon' });

  // 1. Verify preferences loaded from cache/memory
  const p1Prefs = await loadUserPreferences(TEST_UID_1);
  const p2Prefs = await loadUserPreferences(TEST_UID_2);

  assert.equal(p1Prefs.sound, true);
  assert.equal(p1Prefs.music, false);
  assert.equal(p1Prefs.theme, 'retro');

  assert.equal(p2Prefs.sound, false);
  assert.equal(p2Prefs.music, true);
  assert.equal(p2Prefs.theme, 'neon');

  // 2. Clear localStorage cache to verify remote user_preferences DB fallback
  storage.delete(`haya_prefs_${TEST_UID_1}`);
  storage.delete(`haya_prefs_${TEST_UID_2}`);

  const p1DbPrefs = await loadUserPreferences(TEST_UID_1);
  const p2DbPrefs = await loadUserPreferences(TEST_UID_2);

  assert.equal(p1DbPrefs.sound, true);
  assert.equal(p1DbPrefs.music, false);
  assert.equal(p1DbPrefs.theme, 'retro');

  assert.equal(p2DbPrefs.sound, false);
  assert.equal(p2DbPrefs.music, true);
  assert.equal(p2DbPrefs.theme, 'neon');
});
