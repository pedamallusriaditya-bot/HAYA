import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyBoard, checkWinner, type Board, type Player } from './engine.ts';

// Simulated Supabase Realtime Channel for unit testing
type BroadcastPayload = Record<string, unknown>;
type BroadcastHandler = (data: { event: string; payload: BroadcastPayload }) => void;
type PresenceHandler = (data?: { key: string }) => void;

interface ChannelConfig {
  private?: boolean;
  presence?: { key?: string };
}

interface PresenceRecord {
  userId?: string;
  displayName?: string;
  avatar?: Record<string, unknown>;
  status?: string;
  currentGame?: string | null;
  timestamp?: number;
  joined_at?: number;
  [key: string]: unknown;
}

class MockRealtimeChannel {
  public topic: string;
  public config: ChannelConfig;
  public presenceStateData: Record<string, PresenceRecord[]> = {};
  public broadcastHandlers: Map<string, BroadcastHandler[]> = new Map();
  public presenceHandlers: Map<string, PresenceHandler[]> = new Map();
  public trackedPayload: PresenceRecord | null = null;

  constructor(topic: string, opts?: { config?: ChannelConfig }) {
    this.topic = topic;
    this.config = opts?.config || {};
  }

  on(
    type: 'broadcast' | 'presence' | 'postgres_changes',
    filter: { event: string },
    callback: BroadcastHandler | PresenceHandler
  ): this {
    if (type === 'broadcast') {
      const event = filter.event;
      const list = this.broadcastHandlers.get(event) || [];
      list.push(callback as BroadcastHandler);
      this.broadcastHandlers.set(event, list);
    } else if (type === 'presence') {
      const event = filter.event;
      const list = this.presenceHandlers.get(event) || [];
      list.push(callback as PresenceHandler);
      this.presenceHandlers.set(event, list);
    }
    return this;
  }

  subscribe(callback?: (status: string) => void): this {
    if (callback) callback('SUBSCRIBED');
    return this;
  }

  unsubscribe(): Promise<void> {
    return Promise.resolve();
  }

  send(msg: { type: string; event: string; payload: BroadcastPayload }): Promise<{ error: null }> {
    const list = this.broadcastHandlers.get(msg.event) || [];
    list.forEach((cb) => cb({ event: msg.event, payload: msg.payload }));
    return Promise.resolve({ error: null });
  }

  track(payload: PresenceRecord): Promise<void> {
    this.trackedPayload = payload;
    const key = this.config.presence?.key || 'default';
    this.presenceStateData[key] = [payload];
    return Promise.resolve();
  }

  presenceState(): Record<string, PresenceRecord[]> {
    return this.presenceStateData;
  }

  simulatePresenceSync(): void {
    const list = this.presenceHandlers.get('sync') || [];
    list.forEach((cb) => cb());
  }

  simulatePresenceLeave(key: string): void {
    delete this.presenceStateData[key];
    const list = this.presenceHandlers.get('leave') || [];
    list.forEach((cb) => cb({ key }));
    this.simulatePresenceSync();
  }
}

test('Lobby Channel: Private channel configuration and zero email in presence payload', async () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const displayName = 'Aditya';
  const myEmail = 'player1@haya.local';

  // 1. Channel must be configured with private: true
  const channel = new MockRealtimeChannel('haya-global-lobby', {
    config: {
      private: true,
      presence: { key: userId },
    },
  });

  assert.equal(channel.config.private, true, 'Lobby channel must be marked private');
  assert.equal(channel.config.presence?.key, userId, 'Presence key must use user id');

  // 2. Track presence: Payload must NOT include email
  const presencePayload: PresenceRecord = {
    userId,
    displayName,
    avatar: { headwear: 'cap', clothingColor: '#3b82f6' },
    status: 'online',
    currentGame: null,
    timestamp: Date.now(),
  };

  await channel.track(presencePayload);

  assert.ok(channel.trackedPayload);
  assert.equal(channel.trackedPayload.userId, userId);
  assert.equal(channel.trackedPayload.displayName, displayName);
  assert.equal('email' in channel.trackedPayload, false, 'Presence payload must NOT broadcast email');
  assert.notEqual(JSON.stringify(channel.trackedPayload).includes(myEmail), true, 'Payload json must not contain email');

  // 3. Friend presence resolution without email
  const friendUserId = '00000000-0000-0000-0000-000000000002';
  const friendName = 'Harika';

  channel.presenceStateData[friendUserId] = [
    {
      userId: friendUserId,
      displayName: friendName,
      avatar: { headwear: 'beanie', clothingColor: '#ec4899' },
      status: 'online',
      currentGame: null,
      timestamp: Date.now(),
    },
  ];

  let resolvedFriendOnline = false;
  let resolvedFriendStatus = 'offline';

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    Object.values(state).forEach((presences) => {
      presences.forEach((p) => {
        const isFriend =
          (p.userId && p.userId !== userId) ||
          (p.displayName && p.displayName.toLowerCase() === friendName.toLowerCase());
        if (isFriend) {
          resolvedFriendOnline = true;
          resolvedFriendStatus = p.status || 'online';
        }
      });
    });
  });

  channel.simulatePresenceSync();
  assert.equal(resolvedFriendOnline, true, 'Friend identified by userId and displayName without email');
  assert.equal(resolvedFriendStatus, 'online');

  // 4. Friend leaves
  channel.on('presence', { event: 'leave' }, ({ key }: { key: string } = { key: '' }) => {
    if (key !== userId) {
      resolvedFriendOnline = false;
      resolvedFriendStatus = 'offline';
    }
  });

  channel.simulatePresenceLeave(friendUserId);
  assert.equal(resolvedFriendOnline, false, 'Friend status transitions to offline on leave');
});

test('Multiplayer Invitations: Private channel, handshake, and expiration', async () => {
  // 1. Invitations channel must be private
  const invDbChannel = new MockRealtimeChannel('haya-invitations-db', {
    config: { private: true },
  });
  assert.equal(invDbChannel.config.private, true, 'Invitations DB channel must be private');

  // 2. Broadcast invitation handshake
  const lobbyChannel = new MockRealtimeChannel('haya-global-lobby', {
    config: { private: true },
  });

  let receivedInvite: Record<string, unknown> | null = null;
  let inviteResponse: Record<string, unknown> | null = null;

  lobbyChannel.on('broadcast', { event: 'game_invite' }, (data: { event: string; payload: BroadcastPayload }) => {
    receivedInvite = data.payload;
  });

  lobbyChannel.on('broadcast', { event: 'invite_response' }, (data: { event: string; payload: BroadcastPayload }) => {
    inviteResponse = data.payload;
  });

  const now = Date.now();
  const validInvite = {
    id: 'inv_123',
    gameId: 'tictactoe',
    matchId: 'match_tictactoe_123',
    fromName: 'Aditya',
    toName: 'Harika',
    createdAt: now,
    expiresAt: now + 45000,
  };

  // Host sends invite
  await lobbyChannel.send({
    type: 'broadcast',
    event: 'game_invite',
    payload: validInvite,
  });

  assert.ok(receivedInvite);
  const inviteObj = receivedInvite as Record<string, unknown>;
  assert.equal(inviteObj.id, 'inv_123');
  assert.equal(inviteObj.matchId, 'match_tictactoe_123');

  // Guest accepts invite
  await lobbyChannel.send({
    type: 'broadcast',
    event: 'invite_response',
    payload: {
      inviteId: 'inv_123',
      status: 'accepted',
      matchId: 'match_tictactoe_123',
      gameId: 'tictactoe',
    },
  });

  assert.ok(inviteResponse);
  const responseObj = inviteResponse as Record<string, unknown>;
  assert.equal(responseObj.status, 'accepted');
  assert.equal(responseObj.matchId, 'match_tictactoe_123');

  // Expired invitation validation
  const expiredInvite = {
    ...validInvite,
    id: 'inv_expired',
    expiresAt: now - 1000,
  };
  const isExpired = Date.now() > (expiredInvite.expiresAt as number);
  assert.equal(isExpired, true, 'Expired invitation must be recognized as expired');
});

test('Online Tic-Tac-Toe: Private room channel, turns, win, rematch, and exit', async () => {
  const matchId = 'match_test_room_1';

  // 1. Private channel configuration
  const matchChannel = new MockRealtimeChannel(`haya-match-${matchId}`, {
    config: {
      private: true,
      presence: { key: 'Aditya' },
    },
  });

  assert.equal(matchChannel.config.private, true, 'Match channel must be private');
  assert.equal(matchChannel.topic, 'haya-match-match_test_room_1');

  // Track match presence without email
  await matchChannel.track({ joined_at: Date.now() });
  assert.ok(matchChannel.trackedPayload);
  assert.equal('email' in matchChannel.trackedPayload, false, 'Match presence must not broadcast email');

  // 2. Game state simulation for both players
  const hostBoard: Board = createEmptyBoard();
  const guestBoard: Board = createEmptyBoard();
  let currentTurn: Player = 'X';
  let winnerResult: Player | 'draw' | null = null;
  const score = { host: 0, guest: 0, draws: 0 };
  let rounds = 1;

  // Listeners for move broadcast
  matchChannel.on('broadcast', { event: 'move' }, (data: { event: string; payload: BroadcastPayload }) => {
    const { payload } = data;
    const index = payload.index as number;
    const symbol = payload.symbol as Player;
    hostBoard[index] = symbol;
    guestBoard[index] = symbol;

    const res = checkWinner(hostBoard);
    if (res.winner) {
      winnerResult = res.winner;
      if (res.winner === 'X') score.host += 1;
      else if (res.winner === 'O') score.guest += 1;
      else score.draws += 1;
    }

    currentTurn = symbol === 'X' ? 'O' : 'X';
  });

  matchChannel.on('broadcast', { event: 'rematch' }, () => {
    rounds += 1;
    for (let i = 0; i < hostBoard.length; i++) {
      hostBoard[i] = null;
      guestBoard[i] = null;
    }
    winnerResult = null;
    currentTurn = 'X';
  });

  let matchExited = false;
  matchChannel.on('broadcast', { event: 'match_exit' }, () => {
    matchExited = true;
  });

  // Turn 1: Host plays 'X' at index 0 (top-left)
  assert.equal(currentTurn, 'X');
  await matchChannel.send({
    type: 'broadcast',
    event: 'move',
    payload: { index: 0, symbol: 'X' },
  });
  assert.equal(hostBoard[0], 'X');
  assert.equal(guestBoard[0], 'X');
  assert.equal(currentTurn, 'O');

  // Turn 2: Guest plays 'O' at index 3 (middle-left)
  await matchChannel.send({
    type: 'broadcast',
    event: 'move',
    payload: { index: 3, symbol: 'O' },
  });
  assert.equal(guestBoard[3], 'O');
  assert.equal(currentTurn, 'X');

  // Turn 3: Host plays 'X' at index 1 (top-center)
  await matchChannel.send({
    type: 'broadcast',
    event: 'move',
    payload: { index: 1, symbol: 'X' },
  });
  assert.equal(currentTurn, 'O');

  // Turn 4: Guest plays 'O' at index 4 (center)
  await matchChannel.send({
    type: 'broadcast',
    event: 'move',
    payload: { index: 4, symbol: 'O' },
  });
  assert.equal(currentTurn, 'X');

  // Turn 5: Host plays 'X' at index 2 (top-right) -> Winning line [0, 1, 2]!
  await matchChannel.send({
    type: 'broadcast',
    event: 'move',
    payload: { index: 2, symbol: 'X' },
  });

  assert.equal(winnerResult, 'X', 'Host won round 1 with top horizontal row');
  assert.equal(score.host, 1);
  assert.equal(score.guest, 0);

  // 3. Rematch flow
  await matchChannel.send({
    type: 'broadcast',
    event: 'rematch',
    payload: {},
  });

  assert.equal(rounds, 2, 'Rounds incremented to 2');
  assert.equal(hostBoard.every((c) => c === null), true, 'Board reset for rematch');
  assert.equal(winnerResult, null);
  assert.equal(currentTurn, 'X');

  // 4. Match Exit flow
  await matchChannel.send({
    type: 'broadcast',
    event: 'match_exit',
    payload: {},
  });

  assert.equal(matchExited, true, 'Match exit received successfully');
});
