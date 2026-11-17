import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, getGame, type GameId } from './registry.ts';
import { GAME_COMPONENTS } from './components.ts';

test('Game Registry: Every registry entry has a corresponding component and vice versa', () => {
  const registryIds = new Set(GAMES.map((g) => g.id));
  const componentKeys = new Set(Object.keys(GAME_COMPONENTS) as GameId[]);

  // 1. Every game in the registry must have a component
  for (const game of GAMES) {
    assert.ok(
      game.id in GAME_COMPONENTS,
      `Registry game "${game.id}" is missing a component mapping in GAME_COMPONENTS`
    );
    assert.ok(
      GAME_COMPONENTS[game.id],
      `Component for game "${game.id}" must be defined`
    );
  }

  // 2. Every component in GAME_COMPONENTS must have a registry entry
  for (const key of Object.keys(GAME_COMPONENTS) as GameId[]) {
    assert.ok(
      registryIds.has(key),
      `GAME_COMPONENTS key "${key}" has no corresponding entry in GAMES registry`
    );
  }

  // 3. Counts must match exactly
  assert.equal(
    registryIds.size,
    componentKeys.size,
    `Registry size (${registryIds.size}) must match components map size (${componentKeys.size})`
  );

  // 4. Verification of getGame helper
  for (const game of GAMES) {
    const fetched = getGame(game.id);
    assert.ok(fetched, `getGame("${game.id}") should return game metadata`);
    assert.equal(fetched.id, game.id);
    assert.equal(fetched.status, 'playable');
  }

  // 5. Unknown game id handling
  assert.equal(getGame('non_existent_game'), undefined);
});
