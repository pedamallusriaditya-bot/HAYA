import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import type { GameRecord } from './supabase.ts';

const TEST_UID = '00000000-0000-0000-0000-000000000001';

// Mock localStorage for Node test environment
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

// In-memory mock database for game_records
const remoteDb: GameRecord[] = [];
let shouldFailInsert = false;
let failInsertError = { message: 'Network connection lost', code: '500' };

if (mock && typeof mock.module === 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mock as any).module('./supabase.ts', {
    namedExports: {
      supabase: {
        from: (table: string) => {
          if (table === 'game_records') {
            return {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              insert: (records: any[]) => {
                if (shouldFailInsert) {
                  return {
                    select: () => ({
                      maybeSingle: () => Promise.resolve({ data: null, error: failInsertError }),
                    }),
                  };
                }

                // Check unique constraint on (user_id, match_id)
                for (const r of records) {
                  if (r.match_id) {
                    const exists = remoteDb.some(
                      (row) => row.user_id === r.user_id && row.match_id === r.match_id
                    );
                    if (exists) {
                      return {
                        select: () => ({
                          maybeSingle: () =>
                            Promise.resolve({
                              data: null,
                              error: {
                                code: '23505',
                                message:
                                  'duplicate key value violates unique constraint "game_records_user_match_unique"',
                              },
                            }),
                        }),
                      };
                    }
                  }
                }

                const inserted = records.map((r, idx) => ({
                  ...r,
                  id: r.id || `remote_id_${Date.now()}_${idx}`,
                }));
                remoteDb.push(...inserted);

                return {
                  select: () => ({
                    maybeSingle: () => Promise.resolve({ data: inserted[0], error: null }),
                  }),
                };
              },
              select: () => {
                let currentRecords = [...remoteDb];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const chain: any = {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  eq: (col: string, val: any) => {
                    if (col === 'user_id') {
                      currentRecords = currentRecords.filter((r) => r.user_id === val);
                    }
                    return chain;
                  },
                  order: () => chain,
                  limit: (n: number) => {
                    currentRecords = currentRecords.slice(0, n);
                    return chain;
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  then: (resolve: any) =>
                    Promise.resolve({ data: currentRecords, error: null }).then(resolve),
                };
                return chain;
              },
            };
          }
          return {};
        },
      },
    },
  });
}

const {
  recordGameResult,
  fetchUserGameHistory,
  flushUnsyncedRecords,
  getLocalRecords,
  saveLocalRecords,
  getUnsyncedRecords,
  addToUnsyncedQueue,
  mergeGameRecords,
  _resetSubmittedMatches,
  MAX_LOCAL_RECORDS,
} = await import('./gameRecordsService.ts');

test('Game Records Service: Failed insert is queued and retried', async () => {
  storage.clear();
  remoteDb.length = 0;
  _resetSubmittedMatches();

  const matchRecord: GameRecord = {
    user_id: TEST_UID,
    game: 'chess',
    mode: 'bot',
    result: 'win',
    score: 1,
    match_id: 'match_failed_retry_1',
  };

  // 1. Simulate network failure during insert
  shouldFailInsert = true;
  failInsertError = { message: 'Network connection lost', code: '500' };

  const firstResult = await recordGameResult(matchRecord);
  assert.equal(firstResult.success, true);
  assert.equal(firstResult.synced, false, 'Failed remote insert must report synced: false');
  assert.equal(firstResult.error, 'Network connection lost');

  // Verify record was saved in local cache
  const local = getLocalRecords(TEST_UID);
  assert.equal(local.length, 1);
  assert.equal(local[0].match_id, 'match_failed_retry_1');

  // Verify record was added to the persistent unsynced queue
  const unsynced = getUnsyncedRecords(TEST_UID);
  assert.equal(unsynced.length, 1);
  assert.equal(unsynced[0].match_id, 'match_failed_retry_1');

  // 2. Network recovers: retrying the same match must NOT be blocked by submittedMatches
  shouldFailInsert = false;

  const retryResult = await recordGameResult(matchRecord);
  assert.equal(retryResult.success, true);
  assert.equal(retryResult.synced, true, 'Retry must succeed and report synced: true');
  assert.equal(retryResult.error, undefined);

  // Verify unsynced queue is now cleared for this match
  const unsyncedAfter = getUnsyncedRecords(TEST_UID);
  assert.equal(unsyncedAfter.length, 0, 'Successfully retried match must be removed from unsynced queue');

  // Verify the match exists in the remote DB
  assert.equal(
    remoteDb.some((r) => r.match_id === 'match_failed_retry_1'),
    true,
    'Retried match must be present in remote DB'
  );
});

test('Game Records Service: Duplicate match_id is not double-counted', async () => {
  storage.clear();
  remoteDb.length = 0;
  _resetSubmittedMatches();

  const record: GameRecord = {
    user_id: TEST_UID,
    game: 'connect4',
    mode: 'bot',
    result: 'win',
    score: 1,
    match_id: 'match_dup_100',
  };

  // 1. First record submission
  shouldFailInsert = false;
  const res1 = await recordGameResult(record);
  assert.equal(res1.success, true);
  assert.equal(res1.synced, true);

  const remoteCount1 = remoteDb.filter((r) => r.match_id === 'match_dup_100').length;
  assert.equal(remoteCount1, 1);

  // 2. Immediate duplicate call with same match_id in same session
  const res2 = await recordGameResult(record);
  assert.equal(res2.success, true);
  assert.equal(res2.synced, true);

  const remoteCount2 = remoteDb.filter((r) => r.match_id === 'match_dup_100').length;
  assert.equal(remoteCount2, 1, 'Duplicate match_id must not insert a second row');

  // 3. Unique violation handling (e.g. from another tab or previous session)
  _resetSubmittedMatches(); // Clear in-memory dedupe set so it attempts insert
  const res3 = await recordGameResult(record);
  assert.equal(res3.success, true);
  assert.equal(res3.synced, true, 'Unique violation on (user_id, match_id) must be treated as synced: true');

  // 4. mergeGameRecords eliminates duplicate match_ids
  const duplicateList = [record, { ...record, id: 'some_other_id' }];
  const merged = mergeGameRecords(duplicateList, duplicateList);
  assert.equal(merged.length, 1, 'mergeGameRecords must deduplicate rows by match_id');
});

test('Game Records Service: Merge keeps unsynced records when fetching remote history', async () => {
  storage.clear();
  remoteDb.length = 0;
  _resetSubmittedMatches();

  // Populate remote DB with existing records
  const remoteRecord1: GameRecord = {
    id: 'rem_1',
    user_id: TEST_UID,
    game: '2048',
    mode: 'single',
    result: 'completed',
    score: 1024,
    match_id: 'rem_match_1',
    created_at: new Date('2026-11-01T10:00:00Z').toISOString(),
  };
  const remoteRecord2: GameRecord = {
    id: 'rem_2',
    user_id: TEST_UID,
    game: 'minesweeper',
    mode: 'single',
    result: 'win',
    score: 45,
    match_id: 'rem_match_2',
    created_at: new Date('2026-11-02T10:00:00Z').toISOString(),
  };
  remoteDb.push(remoteRecord1, remoteRecord2);

  // User played an offline game that has not synced yet
  const unsyncedRecord: GameRecord = {
    user_id: TEST_UID,
    game: 'chess',
    mode: 'bot',
    result: 'win',
    score: 1,
    match_id: 'unsynced_offline_match_3',
    created_at: new Date('2026-11-03T10:00:00Z').toISOString(), // Newest
  };

  saveLocalRecords(TEST_UID, [unsyncedRecord]);
  addToUnsyncedQueue(TEST_UID, unsyncedRecord);

  // Fetch history (pulls remote rows and merges with local rows)
  const historyResult = await fetchUserGameHistory(TEST_UID, 50);
  assert.equal(historyResult.fromCache, false);
  assert.equal(historyResult.records.length, 3, 'History must contain both remote records and unsynced local record');

  // Verify sort order is created_at descending
  assert.equal(historyResult.records[0].match_id, 'unsynced_offline_match_3');
  assert.equal(historyResult.records[1].match_id, 'rem_match_2');
  assert.equal(historyResult.records[2].match_id, 'rem_match_1');

  // Verify local cache kept the unsynced record
  const localCache = getLocalRecords(TEST_UID);
  assert.equal(
    localCache.some((r) => r.match_id === 'unsynced_offline_match_3'),
    true,
    'Local cache must retain unsynced records after remote fetch'
  );
});

test('Game Records Service: flushUnsyncedRecords retries queued records and clears queue', async () => {
  storage.clear();
  remoteDb.length = 0;
  _resetSubmittedMatches();
  shouldFailInsert = false;

  const queueItem1: GameRecord = {
    user_id: TEST_UID,
    game: 'carrom',
    mode: 'bot',
    result: 'win',
    score: 25,
    match_id: 'flush_match_1',
    created_at: new Date().toISOString(),
  };

  const queueItem2: GameRecord = {
    user_id: TEST_UID,
    game: 'sudoku',
    mode: 'single',
    result: 'win',
    score: 120,
    match_id: 'flush_match_2',
    created_at: new Date().toISOString(),
  };

  addToUnsyncedQueue(TEST_UID, queueItem1);
  addToUnsyncedQueue(TEST_UID, queueItem2);

  const initialQueue = getUnsyncedRecords(TEST_UID);
  assert.equal(initialQueue.length, 2);

  // Flush the queue
  const flushResult = await flushUnsyncedRecords(TEST_UID);
  assert.equal(flushResult.flushed, 2);
  assert.equal(flushResult.remaining, 0);

  // Queue must now be completely empty
  const queueAfter = getUnsyncedRecords(TEST_UID);
  assert.equal(queueAfter.length, 0);

  // Both items must exist in remoteDb
  assert.equal(remoteDb.some((r) => r.match_id === 'flush_match_1'), true);
  assert.equal(remoteDb.some((r) => r.match_id === 'flush_match_2'), true);

  // Test unique violation during flush is treated as success
  addToUnsyncedQueue(TEST_UID, queueItem1); // Re-queue already inserted record
  assert.equal(getUnsyncedRecords(TEST_UID).length, 1);

  const flushDupResult = await flushUnsyncedRecords(TEST_UID);
  assert.equal(flushDupResult.flushed, 1, 'Unique violation must count as flushed');
  assert.equal(flushDupResult.remaining, 0);
  assert.equal(getUnsyncedRecords(TEST_UID).length, 0, 'Unique violation must clear the record from queue');
});

test('Game Records Service: Resilient JSON parsing and cache size capping', () => {
  storage.clear();

  // 1. Corrupted JSON string in localStorage should not crash
  storage.set(`haya_game_records_${TEST_UID}`, '{ corrupted: json[');
  const corruptedLocal = getLocalRecords(TEST_UID);
  assert.deepEqual(corruptedLocal, []);

  storage.set(`haya_unsynced_records_${TEST_UID}`, 'not an array');
  const corruptedUnsynced = getUnsyncedRecords(TEST_UID);
  assert.deepEqual(corruptedUnsynced, []);

  // 2. Cap local records at MAX_LOCAL_RECORDS (100)
  const manyRecords: GameRecord[] = Array.from({ length: 150 }, (_, i) => ({
    user_id: TEST_UID,
    game: 'chess',
    mode: 'bot',
    result: 'win',
    score: 1,
    match_id: `cap_match_${i}`,
    created_at: new Date().toISOString(),
  }));

  saveLocalRecords(TEST_UID, manyRecords);
  const capped = getLocalRecords(TEST_UID);
  assert.equal(capped.length, MAX_LOCAL_RECORDS);
  assert.equal(capped[0].match_id, 'cap_match_0');
  assert.equal(capped[99].match_id, 'cap_match_99');
});

