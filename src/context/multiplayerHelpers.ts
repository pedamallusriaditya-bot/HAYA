export type ActiveMatch = {
  matchId: string;
  gameId: string;
  role: 'host' | 'guest';
  opponentName: string;
};

/**
 * Determines whether a host should transition to an active match.
 * Idempotent: returns false if the match is already active.
 */
export function shouldStartHostMatch(
  currentActiveMatchId: string | undefined | null,
  incomingMatchId: string
): boolean {
  if (!incomingMatchId || !incomingMatchId.trim()) return false;
  return currentActiveMatchId !== incomingMatchId;
}

/**
 * Creates an ActiveMatch descriptor with host role.
 */
export function createHostMatch(
  matchId: string,
  gameId: string,
  opponentName: string
): ActiveMatch {
  return {
    matchId,
    gameId,
    role: 'host',
    opponentName: opponentName || 'Friend',
  };
}

/**
 * Creates an ActiveMatch descriptor with guest role.
 */
export function createGuestMatch(
  matchId: string,
  gameId: string,
  opponentName: string
): ActiveMatch {
  return {
    matchId,
    gameId,
    role: 'guest',
    opponentName: opponentName || 'Friend',
  };
}

/**
 * Validates whether an incoming invitation is directed to the current user
 * and has not yet expired.
 */
export function isValidIncomingInvite(
  inviteToEmail: string | undefined | null,
  myEmail: string | undefined | null,
  expiresAt: number,
  now: number = Date.now()
): boolean {
  if (!inviteToEmail || !myEmail) return false;
  if (inviteToEmail.toLowerCase().trim() !== myEmail.toLowerCase().trim()) return false;
  return now < expiresAt;
}
