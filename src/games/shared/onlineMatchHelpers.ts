/**
 * Formats a realtime match topic string satisfying the Supabase channel policy.
 * Realtime match channels MUST be named `haya-match-${matchId}`.
 */
export function getMatchChannelTopic(matchId: string): string {
  return `haya-match-${matchId}`;
}

/**
 * Validates that an incoming sequence number is strictly greater than the last applied sequence.
 */
export function isNewerSeq(lastAppliedSeq: number, incomingSeq: number): boolean {
  return incomingSeq > lastAppliedSeq;
}

/**
 * Checks whether an incoming sequence number skipped one or more messages (gap).
 */
export function hasSeqGap(lastAppliedSeq: number, incomingSeq: number): boolean {
  return incomingSeq > lastAppliedSeq + 1;
}

/**
 * Validates whether an incoming state snapshot should be adopted.
 * Adopts if incoming sequence is >= last applied sequence.
 */
export function shouldAdoptStateSnapshot(lastAppliedSeq: number, incomingSeq: number): boolean {
  return incomingSeq >= lastAppliedSeq;
}
