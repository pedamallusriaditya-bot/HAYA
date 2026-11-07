import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
if (mock && typeof mock.module === 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mock as any).module('./supabase.ts', {
    namedExports: {
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
          upsert: () => Promise.resolve({ error: null }),
        }),
      },
    },
  });
}
const { normalizeDifficulty } = await import('./useHighScore.ts');
test('useHighScore: normalizeDifficulty converts nullish and empty values to default', () => {
  assert.equal(normalizeDifficulty(null), 'default');
  assert.equal(normalizeDifficulty(undefined), 'default');
  assert.equal(normalizeDifficulty(), 'default');
  assert.equal(normalizeDifficulty(''), 'default');
  assert.equal(normalizeDifficulty('   '), 'default');
  assert.equal(normalizeDifficulty('\t\n'), 'default');
  assert.equal(normalizeDifficulty('easy'), 'easy');
  assert.equal(normalizeDifficulty('medium'), 'medium');
  assert.equal(normalizeDifficulty('hard'), 'hard');
  assert.equal(normalizeDifficulty('expert'), 'expert');
  assert.equal(normalizeDifficulty('default'), 'default');
  assert.equal(normalizeDifficulty('  Amateur  '), 'Amateur');
  assert.equal(normalizeDifficulty('Tier 7 (Master)'), 'Tier 7 (Master)');
});

test('useHighScore: query and payload normalization contract for 2048 and other games', () => {
  // Simulate game submission payloads like 2048 (passes null) vs Sudoku (passes string)
  const games: Array<{ game: string; rawDifficulty: string | null | undefined; expected: string }> = [
    { game: '2048', rawDifficulty: null, expected: 'default' },
    { game: '2048', rawDifficulty: undefined, expected: 'default' },
    { game: 'sudoku', rawDifficulty: 'easy', expected: 'easy' },
    { game: 'minesweeper', rawDifficulty: 'hard', expected: 'hard' },
    { game: 'maze', rawDifficulty: '', expected: 'default' },
  ];

  for (const { game, rawDifficulty, expected } of games) {
    const normalized = normalizeDifficulty(rawDifficulty);
    assert.equal(
      normalized,
      expected,
      `Expected game "${game}" with difficulty "${rawDifficulty}" to normalize to "${expected}"`
    );
    assert.notEqual(
      normalized,
      null,
      `Normalized difficulty for game "${game}" must never be null`
    );
  }
});