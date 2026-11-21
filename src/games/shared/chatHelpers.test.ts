import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REACTIONS,
  TOP_REACTIONS,
  isWhitelistedReaction,
  getReaction,
} from './reactions.ts';
import {
  sanitizeChatText,
  isValidChatText,
  isValidChatMessage,
  isValidReactionMessage,
  isDuplicateMessage,
  isOwnMessage,
  createRateLimiter,
  createChatRateLimiter,
  createReactionRateLimiter,
  addMessageWithCap,
  addReactionWithCap,
  handleIncomingChat,
  handleIncomingReaction,
  sendBroadcastChat,
  sendBroadcastReaction,
  type ChatMessage,
  type ReactionMessage,
  type FloatingReaction,
  type BroadcastChannelSender,
} from './chatHelpers.ts';

test('Reactions Whitelist: Exactly 12 reactions with top 6 defined', () => {
  assert.equal(REACTIONS.length, 12);
  assert.equal(TOP_REACTIONS.length, 6);

  const expectedIds = [
    'thumbs_up',
    'fire',
    'laugh',
    'wow',
    'cry',
    'angry',
    'party',
    'clap',
    'heart',
    'handshake',
    'cool',
    'thinking',
  ];

  for (const id of expectedIds) {
    assert.equal(isWhitelistedReaction(id), true, `Expected ${id} to be whitelisted`);
    const descriptor = getReaction(id);
    assert.ok(descriptor);
    assert.equal(descriptor?.id, id);
    assert.ok(descriptor?.emoji);
    assert.ok(descriptor?.label);
  }

  // Reject unknown or arbitrary emoji/strings
  assert.equal(isWhitelistedReaction('poop'), false);
  assert.equal(isWhitelistedReaction('skull'), false);
  assert.equal(isWhitelistedReaction('👍'), false);
  assert.equal(isWhitelistedReaction(''), false);
  assert.equal(isWhitelistedReaction('random_string'), false);
  assert.equal(getReaction('unknown'), undefined);
});

test('Chat Sanitizing & Validation: Strips control chars, trims, enforces 1-200 length', () => {
  // Normal string
  assert.equal(sanitizeChatText('Hello world!'), 'Hello world!');
  assert.equal(isValidChatText('Hello world!'), true);

  // Whitespace trimming
  assert.equal(sanitizeChatText('   Good game!   '), 'Good game!');
  assert.equal(isValidChatText('   Good game!   '), true);

  // Control characters stripped (ASCII 0x00 - 0x1F, DEL 0x7F, 0x80 - 0x9F)
  const dirty = 'Hello\x00\x08\x1B\x7FWorld!';
  assert.equal(sanitizeChatText(dirty), 'HelloWorld!');

  // Preserves emojis and Unicode text
  const emojiText = 'Nice move! 🔥🎯';
  assert.equal(sanitizeChatText(emojiText), emojiText);
  assert.equal(isValidChatText(emojiText), true);

  // Empty or whitespace-only is invalid
  assert.equal(sanitizeChatText('   '), '');
  assert.equal(isValidChatText('   '), false);
  assert.equal(isValidChatText(''), false);

  // Maximum 200 characters
  const exactly200 = 'a'.repeat(200);
  assert.equal(isValidChatText(exactly200), true);

  const tooLong201 = 'a'.repeat(201);
  assert.equal(isValidChatText(tooLong201), false);
});

test('Message Schema Validation: Validates ChatMessage and ReactionMessage structures', () => {
  const validChat: ChatMessage = {
    id: 'msg-1',
    from: 'Aditya',
    text: 'Good luck!',
    ts: Date.now(),
  };
  assert.equal(isValidChatMessage(validChat), true);

  // Invalid chat messages
  assert.equal(isValidChatMessage(null), false);
  assert.equal(isValidChatMessage({}), false);
  assert.equal(isValidChatMessage({ ...validChat, text: '' }), false);
  assert.equal(isValidChatMessage({ ...validChat, from: '  ' }), false);
  assert.equal(isValidChatMessage({ ...validChat, id: '' }), false);
  assert.equal(isValidChatMessage({ ...validChat, ts: 'not-a-number' }), false);

  const validReaction: ReactionMessage = {
    id: 'rx-1',
    reactionId: 'fire',
    from: 'Harika',
    ts: Date.now(),
  };
  assert.equal(isValidReactionMessage(validReaction), true);

  // Invalid reaction messages
  assert.equal(isValidReactionMessage(null), false);
  assert.equal(isValidReactionMessage({ ...validReaction, reactionId: 'invalid_rx' }), false);
  assert.equal(isValidReactionMessage({ ...validReaction, from: '' }), false);
  assert.equal(isValidReactionMessage({ ...validReaction, ts: NaN }), false);
});

test('Duplicate & Self Rejection: Deduplicates by id and ignores own messages', () => {
  const seenIds = new Set<string>();
  seenIds.add('id-100');

  assert.equal(isDuplicateMessage(seenIds, 'id-100'), true);
  assert.equal(isDuplicateMessage(seenIds, 'id-101'), false);

  // Own message detection (case-insensitive and trimmed)
  assert.equal(isOwnMessage('Aditya', 'Aditya'), true);
  assert.equal(isOwnMessage(' aditya ', 'ADITYA'), true);
  assert.equal(isOwnMessage('Harika', 'Aditya'), false);
  assert.equal(isOwnMessage('', 'Aditya'), false);
});

test('Rate Limiter: Dual-tier cooldown and window throttling', () => {
  // Test limiter: 1 per 100ms, max 3 in 500ms
  const limiter = createRateLimiter(100, 3, 500);

  // 1st request at t=0
  assert.equal(limiter.canSend(1000), true);
  limiter.record(1000);

  // 2nd request too soon (t=50ms < 100ms min interval) -> rejected
  assert.equal(limiter.canSend(1050), false);

  // 2nd request after min interval (t=110ms) -> accepted
  assert.equal(limiter.canSend(1110), true);
  limiter.record(1110);

  // 3rd request after min interval (t=220ms) -> accepted
  assert.equal(limiter.canSend(1220), true);
  limiter.record(1220);

  // 4th request at t=330ms -> rejected (already 3 in 500ms window)
  assert.equal(limiter.canSend(1330), false);

  // After window expires (t=1600ms > 1000+500ms) -> accepted
  assert.equal(limiter.canSend(1600), true);
  limiter.record(1600);

  // Reset clears state
  limiter.reset();
  assert.equal(limiter.canSend(1650), true);
});

test('Chat Rate Limiter: 1 per 500ms and max 5 per 5s', () => {
  const chatLimiter = createChatRateLimiter();
  const base = 10000;

  // Send 5 messages spaced by 600ms
  for (let i = 0; i < 5; i++) {
    const t = base + i * 600;
    assert.equal(chatLimiter.canSend(t), true, `Message ${i + 1} should be allowed`);
    chatLimiter.record(t);
  }

  // 6th message within 5s window rejected
  assert.equal(chatLimiter.canSend(base + 3100), false, '6th message in 5s should be rejected');

  // Spaced message before 500ms min interval rejected
  assert.equal(chatLimiter.canSend(base + 3000), false, '< 500ms rejected');

  // Message after window rolls past first timestamps accepted
  assert.equal(chatLimiter.canSend(base + 5100), true);
});

test('Reaction Rate Limiter: 1 per 400ms and max 10 per 10s', () => {
  const rxLimiter = createReactionRateLimiter();
  const base = 20000;

  // Send 10 reactions spaced by 450ms
  for (let i = 0; i < 10; i++) {
    const t = base + i * 450;
    assert.equal(rxLimiter.canSend(t), true, `Reaction ${i + 1} should be allowed`);
    rxLimiter.record(t);
  }

  // 11th reaction in 10s window rejected
  assert.equal(rxLimiter.canSend(base + 4600), false, '11th reaction in 10s rejected');

  // After 10s window rolls
  assert.equal(rxLimiter.canSend(base + 10100), true);
});

test('FIFO Caps: 50-message cap and 8-reaction cap enforce oldest dropped', () => {
  let messages: ChatMessage[] = [];
  for (let i = 1; i <= 60; i++) {
    const msg: ChatMessage = {
      id: `m-${i}`,
      from: 'Player',
      text: `Message ${i}`,
      ts: i,
    };
    messages = addMessageWithCap(messages, msg, 50);
  }

  assert.equal(messages.length, 50);
  assert.equal(messages[0].id, 'm-11');
  assert.equal(messages[49].id, 'm-60');

  let reactions: FloatingReaction[] = [];
  for (let i = 1; i <= 15; i++) {
    const rx: FloatingReaction = {
      id: `r-${i}`,
      reactionId: 'fire',
      from: 'Player',
      ts: i,
      addedAt: i,
    };
    reactions = addReactionWithCap(reactions, rx, 8);
  }

  assert.equal(reactions.length, 8);
  assert.equal(reactions[0].id, 'r-8');
  assert.equal(reactions[7].id, 'r-15');
});

test('handleIncomingChat and handleIncomingReaction: Validation, deduplication, and rate limiting', () => {
  const seenIds = new Set<string>();
  const limiter = createRateLimiter(200, 5, 5000);
  const myName = 'Aditya';

  // Valid incoming chat from opponent
  const validIncoming = {
    id: 'inc-1',
    from: 'Harika',
    text: 'Good game!',
    ts: 1000,
  };
  const result = handleIncomingChat(validIncoming, myName, seenIds, limiter);
  assert.ok(result);
  assert.equal(result?.text, 'Good game!');
  assert.equal(seenIds.has('inc-1'), true);

  // Duplicate rejected
  const dupResult = handleIncomingChat(validIncoming, myName, seenIds, limiter);
  assert.equal(dupResult, null);

  // Own message reflection rejected
  const ownMsg = {
    id: 'inc-2',
    from: 'Aditya',
    text: 'Hello!',
    ts: 1500,
  };
  assert.equal(handleIncomingChat(ownMsg, myName, seenIds, limiter), null);

  // Invalid payload rejected
  assert.equal(handleIncomingChat('bad-data', myName, seenIds, limiter), null);

  // Valid incoming reaction
  const rxSeenIds = new Set<string>();
  const rxLimiter = createRateLimiter(200, 5, 5000);
  const validRx = {
    id: 'rx-inc-1',
    reactionId: 'party',
    from: 'Harika',
    ts: 2000,
  };
  const rxResult = handleIncomingReaction(validRx, myName, rxSeenIds, rxLimiter);
  assert.ok(rxResult);
  assert.equal(rxResult?.reactionId, 'party');

  // Unknown reaction id rejected
  const invalidRx = {
    id: 'rx-inc-2',
    reactionId: 'unknown_emoji',
    from: 'Harika',
    ts: 2500,
  };
  assert.equal(handleIncomingReaction(invalidRx, myName, rxSeenIds, rxLimiter), null);
});

test('sendBroadcastChat and sendBroadcastReaction: Formatting and channel dispatch', () => {
  const sentPayloads: Array<{ type: string; event: string; payload: Record<string, unknown> }> = [];
  const mockChannel: BroadcastChannelSender = {
    send: (args) => {
      sentPayloads.push(args);
      return Promise.resolve();
    },
  };

  const limiter = createRateLimiter(0, 10, 10000);
  const seenIds = new Set<string>();

  const msg = sendBroadcastChat(mockChannel, 'Aditya', 'Rematch?', limiter, seenIds);
  assert.ok(msg);
  assert.equal(msg?.from, 'Aditya');
  assert.equal(msg?.text, 'Rematch?');
  assert.equal(sentPayloads.length, 1);
  assert.equal(sentPayloads[0].event, 'chat');
  assert.equal(sentPayloads[0].payload.text, 'Rematch?');

  const rx = sendBroadcastReaction(mockChannel, 'Aditya', 'thumbs_up', limiter, seenIds);
  assert.ok(rx);
  assert.equal(rx?.reactionId, 'thumbs_up');
  assert.equal(sentPayloads.length, 2);
  assert.equal(sentPayloads[1].event, 'reaction');
  assert.equal(sentPayloads[1].payload.reactionId, 'thumbs_up');
});
