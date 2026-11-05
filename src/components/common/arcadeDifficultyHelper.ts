export type UniversalDifficultyItem = {
  level?: number;
  id: string | number;
  name: string;
  badge?: string;
  color?: string;
  description?: string;
  depthOrDetail?: string;
  honestyNote?: string;
};

/**
 * Sorts a copy of difficulties by level ascending (easiest to hardest).
 * Items without a level keep their given order (treated as easiest-first).
 */
export function sortDifficultiesAscending<T extends UniversalDifficultyItem>(
  difficulties: readonly T[] | T[]
): T[] {
  const copy = [...difficulties];
  return copy.sort((a, b) => {
    if (typeof a.level === 'number' && typeof b.level === 'number') {
      return a.level - b.level;
    }
    return 0;
  });
}

/**
 * Calculates percentage position (0%..100%) for a given 0-based index.
 */
export function getPercentForIndex(index: number, maxIndex: number): number {
  if (maxIndex <= 0) return 50;
  const clamped = Math.max(0, Math.min(maxIndex, index));
  return (clamped / maxIndex) * 100;
}

/**
 * Calculates the nearest index from a percentage position (0%..100%).
 */
export function getIndexFromPercent(percent: number, maxIndex: number): number {
  if (maxIndex <= 0) return 0;
  const ratio = Math.max(0, Math.min(100, percent)) / 100;
  return Math.max(0, Math.min(maxIndex, Math.round(ratio * maxIndex)));
}

/**
 * Finds index of an item matching selectedId (by id or level).
 */
export function findDifficultyIndex<T extends UniversalDifficultyItem>(
  items: readonly T[] | T[],
  selectedId: string | number
): number {
  return items.findIndex(
    (d) =>
      String(d.id) === String(selectedId) ||
      (d.level !== undefined && d.level === Number(selectedId))
  );
}

/**
 * Returns the middle index of a list for default fallback selection.
 */
export function getMiddleIndex(length: number): number {
  if (length <= 0) return 0;
  return Math.floor(length / 2);
}

