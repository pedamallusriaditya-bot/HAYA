/**
 * Fixed whitelist and metadata for in-game instant emoji reactions.
 * Single source of truth.
 */

export type ReactionId =
  | 'thumbs_up'
  | 'fire'
  | 'laugh'
  | 'wow'
  | 'cry'
  | 'angry'
  | 'party'
  | 'clap'
  | 'heart'
  | 'handshake'
  | 'cool'
  | 'thinking';

export interface ReactionItem {
  id: ReactionId;
  emoji: string;
  label: string;
}

export const REACTIONS: readonly ReactionItem[] = [
  { id: 'thumbs_up', emoji: '👍', label: 'Thumbs up' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'cry', emoji: '😭', label: 'Cry' },
  { id: 'angry', emoji: '😡', label: 'Angry' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'handshake', emoji: '🤝', label: 'Handshake' },
  { id: 'cool', emoji: '😎', label: 'Cool' },
  { id: 'thinking', emoji: '🤔', label: 'Thinking' },
] as const;

export const TOP_REACTIONS: readonly ReactionItem[] = REACTIONS.slice(0, 6);

const REACTION_SET = new Set<string>(REACTIONS.map((r) => r.id));

/**
 * Validates whether a reaction ID is in the strict whitelist.
 */
export function isWhitelistedReaction(id: string): id is ReactionId {
  return REACTION_SET.has(id);
}

/**
 * Gets the ReactionItem descriptor for a valid reaction ID.
 */
export function getReaction(id: string): ReactionItem | undefined {
  return REACTIONS.find((r) => r.id === id);
}
