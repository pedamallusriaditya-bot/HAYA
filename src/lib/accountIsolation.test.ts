import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthorizedEmail } from '../auth/authUtils.ts';
import { getCachedAvatar, saveUserAvatar } from './avatarStorage.ts';
import {
  getLocalRecords,
  recordGameResult,
  computeUserStats,
  loadUserPreferences,
  saveUserPreferences,
} from './gameRecordsService.ts';

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

const ADITYA_EMAIL = 'pedamallusriaditya@gmail.com';
const HARIKA_EMAIL = 'pasulaharika61@gmail.com';
const ADITYA_UID = '00000000-0000-0000-0000-000000000001';
const HARIKA_UID = '00000000-0000-0000-0000-000000000002';

test('Security Allowlist: Only Aditya and Harika permitted', () => {
  assert.equal(isAuthorizedEmail(ADITYA_EMAIL), true);
  assert.equal(isAuthorizedEmail(HARIKA_EMAIL), true);
  assert.equal(isAuthorizedEmail('PEDAMALLUSRIADITYA@GMAIL.COM'), true);
  assert.equal(isAuthorizedEmail('PASULAHARIKA61@GMAIL.COM'), true);

  assert.equal(isAuthorizedEmail('unknown@gmail.com'), false);
  assert.equal(isAuthorizedEmail('attacker@haya.local'), false);
  assert.equal(isAuthorizedEmail(''), false);
  assert.equal(isAuthorizedEmail(null), false);
  assert.equal(isAuthorizedEmail(undefined), false);
});

test('Avatar System: Independent persistence between Aditya and Harika', async () => {
  const adityaAvatar = getCachedAvatar(ADITYA_EMAIL, 'Aditya');
  const harikaAvatar = getCachedAvatar(HARIKA_EMAIL, 'Harika');

  adityaAvatar.headwear = 'cyber_headband';
  adityaAvatar.clothingColor = '#3b82f6';
  await saveUserAvatar(ADITYA_EMAIL, adityaAvatar, ADITYA_UID);

  harikaAvatar.headwear = 'beanie';
  harikaAvatar.clothingColor = '#ec4899';
  await saveUserAvatar(HARIKA_EMAIL, harikaAvatar, HARIKA_UID);

  const loadedAditya = getCachedAvatar(ADITYA_EMAIL, 'Aditya');
  const loadedHarika = getCachedAvatar(HARIKA_EMAIL, 'Harika');

  assert.equal(loadedAditya.headwear, 'cyber_headband');
  assert.equal(loadedAditya.clothingColor, '#3b82f6');

  assert.equal(loadedHarika.headwear, 'beanie');
  assert.equal(loadedHarika.clothingColor, '#ec4899');
  assert.notEqual(loadedAditya.clothingColor, loadedHarika.clothingColor);
});

test('Game Records & Stats: Strict user data isolation', async () => {
  // Clear any existing records in mock storage
  storage.delete(`haya_game_records_${ADITYA_UID}`);
  storage.delete(`haya_game_records_${HARIKA_UID}`);

  // Aditya records 2 wins in Chess
  await recordGameResult({
    user_id: ADITYA_UID,
    game: 'chess',
    mode: 'bot',
    result: 'win',
    score: 1,
    match_id: 'aditya_match_1',
  });
  await recordGameResult({
    user_id: ADITYA_UID,
    game: 'chess',
    mode: 'bot',
    result: 'win',
    score: 1,
    match_id: 'aditya_match_2',
  });

  // Harika records 1 loss in Connect 4
  await recordGameResult({
    user_id: HARIKA_UID,
    game: 'connect4',
    mode: 'bot',
    result: 'loss',
    score: 0,
    match_id: 'harika_match_1',
  });

  const adityaRecords = getLocalRecords(ADITYA_UID);
  const harikaRecords = getLocalRecords(HARIKA_UID);

  assert.equal(adityaRecords.length, 2);
  assert.equal(harikaRecords.length, 1);
  assert.equal(adityaRecords[0].game, 'chess');
  assert.equal(harikaRecords[0].game, 'connect4');

  const adityaStats = await computeUserStats(ADITYA_UID);
  const harikaStats = await computeUserStats(HARIKA_UID);

  assert.equal(adityaStats.totalPlayed, 2);
  assert.equal(adityaStats.wins, 2);
  assert.equal(adityaStats.losses, 0);
  assert.equal(adityaStats.winPercentage, 100);

  assert.equal(harikaStats.totalPlayed, 1);
  assert.equal(harikaStats.wins, 0);
  assert.equal(harikaStats.losses, 1);
  assert.equal(harikaStats.winPercentage, 0);
});

test('User Preferences: Independent audio and theme configuration', async () => {
  await saveUserPreferences(ADITYA_UID, { sound: true, music: false, theme: 'retro' });
  await saveUserPreferences(HARIKA_UID, { sound: false, music: true, theme: 'neon' });

  const adityaPrefs = await loadUserPreferences(ADITYA_UID);
  const harikaPrefs = await loadUserPreferences(HARIKA_UID);

  assert.equal(adityaPrefs.sound, true);
  assert.equal(adityaPrefs.music, false);

  assert.equal(harikaPrefs.sound, false);
  assert.equal(harikaPrefs.music, true);
});

