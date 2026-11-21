import { isWhitelistedReaction, type ReactionId } from './reactions.ts';
export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  ts: number;
}
export interface ReactionMessage {
  id: string;
  reactionId: ReactionId;
  from: string;
  ts: number;
}
export interface FloatingReaction extends ReactionMessage {
  addedAt: number;
}
export const QUICK_CHAT_PHRASES = [
  'GG',
  'Nice!',
  'Oops',
  'Your turn',
  'Rematch?',
  'Good game',
] as const;
export function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
export function sanitizeChatText(raw: string): string {
  if (typeof raw !== 'string') return '';
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if ((code >= 0x00 && code <= 0x1f) || (code >= 0x7f && code <= 0x9f)) {
      continue;
    }
    result += raw[i];
  }
  return result.trim();
}
export function isValidChatText(text: string): boolean {
  const sanitized = sanitizeChatText(text);
  return sanitized.length >= 1 && sanitized.length <= 200;
}
export function isValidChatMessage(msg: unknown): msg is ChatMessage {
  if (!msg || typeof msg !== 'object') return false;
  const candidate = msg as Partial<ChatMessage>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.from === 'string' &&
    candidate.from.trim().length > 0 &&
    typeof candidate.text === 'string' &&
    isValidChatText(candidate.text) &&
    typeof candidate.ts === 'number' &&
    Number.isFinite(candidate.ts)
  );
}
export function isValidReactionMessage(msg: unknown): msg is ReactionMessage {
  if (!msg || typeof msg !== 'object') return false;
  const candidate = msg as Partial<ReactionMessage>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.reactionId === 'string' &&
    isWhitelistedReaction(candidate.reactionId) &&
    typeof candidate.from === 'string' &&
    candidate.from.trim().length > 0 &&
    typeof candidate.ts === 'number' &&
    Number.isFinite(candidate.ts)
  );
}
export function isDuplicateMessage(seenIds: Set<string>, id: string): boolean {
  return seenIds.has(id);
}
export function isOwnMessage(from: string, myDisplayName: string): boolean {
  if (!from || !myDisplayName) return false;
  return from.trim().toLowerCase() === myDisplayName.trim().toLowerCase();
}
export interface RateLimiter {
  canSend: (now?: number) => boolean;
  record: (now?: number) => void;
  reset: () => void;
}
export function createRateLimiter(
  minIntervalMs: number,
  maxInWindow: number,
  windowMs: number
): RateLimiter {
  const timestamps: number[] = [];
  return {
    canSend(now = Date.now()): boolean {
      if (timestamps.length > 0) {
        const lastTime = timestamps[timestamps.length - 1];
        if (now - lastTime < minIntervalMs) {
          return false;
        }
      }
      const windowStart = now - windowMs;
      let countInWindow = 0;
      for (let i = timestamps.length - 1; i >= 0; i--) {
        if (timestamps[i] >= windowStart) {
          countInWindow++;
        } else {
          break;
        }
      }
      return countInWindow < maxInWindow;
    },
    record(now = Date.now()) {
      timestamps.push(now);
      const windowStart = now - windowMs;
      while (timestamps.length > 0 && timestamps[0] < windowStart) {
        timestamps.shift();
      }
    },
    reset() {
      timestamps.length = 0;
    },
  };
}
export function createChatRateLimiter(): RateLimiter {
  return createRateLimiter(500, 5, 5000);
}
export function createReactionRateLimiter(): RateLimiter {
  return createRateLimiter(400, 10, 10000);
}
export function addMessageWithCap(
  messages: ChatMessage[],
  newMsg: ChatMessage,
  cap = 50
): ChatMessage[] {
  const next = [...messages, newMsg];
  if (next.length > cap) {
    return next.slice(next.length - cap);
  }
  return next;
}
export function addReactionWithCap(
  reactions: FloatingReaction[],
  newReaction: FloatingReaction,
  cap = 8
): FloatingReaction[] {
  const next = [...reactions, newReaction];
  if (next.length > cap) {
    return next.slice(next.length - cap);
  }
  return next;
}
export interface BroadcastChannelSender {
  send: (args: {
    type: 'broadcast';
    event: string;
    payload: Record<string, unknown>;
  }) => unknown;
}
export function handleIncomingChat(
  payload: unknown,
  myDisplayName: string,
  seenIds: Set<string>,
  limiter: RateLimiter
): ChatMessage | null {
  if (!isValidChatMessage(payload)) return null;
  if (isOwnMessage(payload.from, myDisplayName)) return null;
  if (isDuplicateMessage(seenIds, payload.id)) return null;
  if (!limiter.canSend(payload.ts)) return null;
  seenIds.add(payload.id);
  limiter.record(payload.ts);
  if (seenIds.size > 200) {
    const first = seenIds.values().next().value;
    if (first) seenIds.delete(first);
  }
  return {
    id: payload.id,
    from: payload.from,
    text: sanitizeChatText(payload.text),
    ts: payload.ts,
  };
}
export function handleIncomingReaction(
  payload: unknown,
  myDisplayName: string,
  seenIds: Set<string>,
  limiter: RateLimiter
): ReactionMessage | null {
  if (!isValidReactionMessage(payload)) return null;
  if (isOwnMessage(payload.from, myDisplayName)) return null;
  if (isDuplicateMessage(seenIds, payload.id)) return null;
  if (!limiter.canSend(payload.ts)) return null;
  seenIds.add(payload.id);
  limiter.record(payload.ts);
  if (seenIds.size > 200) {
    const first = seenIds.values().next().value;
    if (first) seenIds.delete(first);
  }
  return {
    id: payload.id,
    reactionId: payload.reactionId,
    from: payload.from,
    ts: payload.ts,
  };
}
export function sendBroadcastChat(
  channel: BroadcastChannelSender | null,
  from: string,
  text: string,
  limiter: RateLimiter,
  seenIds: Set<string>
): ChatMessage | null {
  if (!channel) return null;
  const now = Date.now();
  if (!limiter.canSend(now)) return null;
  if (!isValidChatText(text)) return null;
  const sanitized = sanitizeChatText(text);
  const id = generateMessageId();
  const message: ChatMessage = {
    id,
    from,
    text: sanitized,
    ts: now,
  };
  limiter.record(now);
  seenIds.add(id);
  void channel.send({
    type: 'broadcast',
    event: 'chat',
    payload: { ...message },
  });
  return message;
}
export function sendBroadcastReaction(
  channel: BroadcastChannelSender | null,
  from: string,
  reactionId: string,
  limiter: RateLimiter,
  seenIds: Set<string>
): ReactionMessage | null {
  if (!channel) return null;
  const now = Date.now();
  if (!limiter.canSend(now)) return null;
  if (!isWhitelistedReaction(reactionId)) return null;
  const id = generateMessageId();
  const reaction: ReactionMessage = {
    id,
    reactionId,
    from,
    ts: now,
  };
  limiter.record(now);
  seenIds.add(id);
  void channel.send({
    type: 'broadcast',
    event: 'reaction',
    payload: { ...reaction },
  });
  return reaction;
}
