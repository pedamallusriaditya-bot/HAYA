import { useEffect, useState, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';
import { useMultiplayer } from '@/context/MultiplayerContext';
import {
  getMatchChannelTopic,
  isNewerSeq,
  hasSeqGap,
  shouldAdoptStateSnapshot,
} from './onlineMatchHelpers';
import {
  type ChatMessage,
  type ReactionMessage,
  createChatRateLimiter,
  createReactionRateLimiter,
  handleIncomingChat,
  handleIncomingReaction,
  sendBroadcastChat,
  sendBroadcastReaction,
} from './chatHelpers';

export type UseOnlineMatchChannelOptions<
  TMove extends Record<string, unknown> = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>
> = {
  matchId: string;
  gameId: string;
  role: 'host' | 'guest';
  onMove?: (payload: TMove, seq: number) => void;
  onState?: (snapshot: TState, seq: number) => void;
  onStateRequest?: () => void;
  onRematch?: (payload?: unknown) => void;
  onExit?: () => void;
  onOpponentJoined?: () => void;
  onChat?: (msg: ChatMessage) => void;
  onReaction?: (reaction: ReactionMessage) => void;
  getCurrentState?: () => TState | null | undefined;
};

export type UseOnlineMatchChannelReturn<
  TMove extends Record<string, unknown> = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>
> = {
  connecting: boolean;
  opponentConnected: boolean;
  error: string | null;
  channel: RealtimeChannel | null;
  sendMove: (payload: TMove) => void;
  sendState: (snapshot: TState) => void;
  requestState: () => void;
  sendRematch: (payload?: unknown) => void;
  sendExit: () => void;
  sendChat: (text: string) => ChatMessage | null;
  sendReaction: (reactionId: string) => ReactionMessage | null;
  seqRef: React.MutableRefObject<number>;
  lastAppliedSeqRef: React.MutableRefObject<number>;
};

export function useOnlineMatchChannel<
  TMove extends Record<string, unknown> = Record<string, unknown>,
  TState extends Record<string, unknown> = Record<string, unknown>
>(
  options: UseOnlineMatchChannelOptions<TMove, TState>
): UseOnlineMatchChannelReturn<TMove, TState> {
  const {
    matchId,
    gameId,
    role,
    onMove,
    onState,
    onStateRequest,
    onRematch,
    onExit,
    onOpponentJoined,
    onChat,
    onReaction,
    getCurrentState,
  } = options;
  const { profile } = useAuth();
  const { setInMatchStatus } = useMultiplayer();

  const [connecting, setConnecting] = useState(true);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const seqRef = useRef<number>(0);
  const lastAppliedSeqRef = useRef<number>(0);

  // Keep latest callbacks in refs so the channel is created once per matchId
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const onStateRef = useRef(onState);
  onStateRef.current = onState;

  const onStateRequestRef = useRef(onStateRequest);
  onStateRequestRef.current = onStateRequest;

  const onRematchRef = useRef(onRematch);
  onRematchRef.current = onRematch;

  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const onOpponentJoinedRef = useRef(onOpponentJoined);
  onOpponentJoinedRef.current = onOpponentJoined;

  const onChatRef = useRef(onChat);
  onChatRef.current = onChat;

  const onReactionRef = useRef(onReaction);
  onReactionRef.current = onReaction;

  const chatSeenIdsRef = useRef<Set<string>>(new Set());
  const reactionSeenIdsRef = useRef<Set<string>>(new Set());

  const senderChatLimiterRef = useRef(createChatRateLimiter());
  const receiverChatLimiterRef = useRef(createChatRateLimiter());
  const senderReactionLimiterRef = useRef(createReactionRateLimiter());
  const receiverReactionLimiterRef = useRef(createReactionRateLimiter());

  const getCurrentStateRef = useRef(getCurrentState);
  getCurrentStateRef.current = getCurrentState;

  const roleRef = useRef(role);
  roleRef.current = role;

  const myName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';

  const sendState = useCallback((snapshot: TState) => {
    if (!channelRef.current) return;
    const seq = typeof snapshot.seq === 'number' ? (snapshot.seq as number) : seqRef.current;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'state',
      payload: { ...snapshot, seq },
    });
  }, []);

  const requestState = useCallback(() => {
    if (!channelRef.current) return;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'state_request',
      payload: {},
    });
  }, []);

  const sendMove = useCallback((payload: TMove) => {
    if (!channelRef.current) return;
    seqRef.current += 1;
    const currentSeq = seqRef.current;
    lastAppliedSeqRef.current = currentSeq;

    void channelRef.current.send({
      type: 'broadcast',
      event: 'move',
      payload: { ...payload, seq: currentSeq },
    });
  }, []);

  const sendRematch = useCallback((payload?: unknown) => {
    if (!channelRef.current) return;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'rematch',
      payload: (payload as Record<string, unknown>) || {},
    });
  }, []);

  const sendExit = useCallback(() => {
    if (!channelRef.current) return;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'match_exit',
      payload: {},
    });
  }, []);

  const sendChat = useCallback(
    (text: string): ChatMessage | null => {
      return sendBroadcastChat(
        channelRef.current,
        myName,
        text,
        senderChatLimiterRef.current,
        chatSeenIdsRef.current
      );
    },
    [myName]
  );

  const sendReaction = useCallback(
    (reactionId: string): ReactionMessage | null => {
      return sendBroadcastReaction(
        channelRef.current,
        myName,
        reactionId,
        senderReactionLimiterRef.current,
        reactionSeenIdsRef.current
      );
    },
    [myName]
  );

  useEffect(() => {
    if (!matchId) return;

    setInMatchStatus(true, gameId);

    const topic = getMatchChannelTopic(matchId);
    const ch = supabase.channel(topic, {
      config: {
        private: true,
        presence: { key: myName },
      },
    });

    channelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const userNames = Object.keys(state);
      const isOpponentHere = userNames.some((u) => u !== myName);
      setOpponentConnected(isOpponentHere);

      if (isOpponentHere) {
        onOpponentJoinedRef.current?.();
        // Host sends snapshot whenever opponent joins
        if (roleRef.current === 'host') {
          const currentState = getCurrentStateRef.current?.();
          if (currentState) {
            sendState(currentState);
          }
        }
      }
    })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        const p = payload as TMove & { seq?: number };
        const seq = typeof p?.seq === 'number' ? p.seq : 0;
        if (seq > 0) {
          if (!isNewerSeq(lastAppliedSeqRef.current, seq)) return;
          if (hasSeqGap(lastAppliedSeqRef.current, seq)) {
            requestState();
          }
          lastAppliedSeqRef.current = seq;
          if (seq > seqRef.current) seqRef.current = seq;
        }
        onMoveRef.current?.(p, seq);
      })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        const snap = payload as TState & { seq?: number };
        const seq = typeof snap?.seq === 'number' ? snap.seq : 0;
        if (seq > 0) {
          if (!shouldAdoptStateSnapshot(lastAppliedSeqRef.current, seq)) return;
          lastAppliedSeqRef.current = seq;
          if (seq > seqRef.current) seqRef.current = seq;
        }
        onStateRef.current?.(snap, seq);
      })
      .on('broadcast', { event: 'state_request' }, () => {
        if (onStateRequestRef.current) {
          onStateRequestRef.current();
        } else {
          const currentState = getCurrentStateRef.current?.();
          if (currentState) {
            sendState(currentState);
          }
        }
      })
      .on('broadcast', { event: 'rematch' }, ({ payload }) => {
        onRematchRef.current?.(payload);
      })
      .on('broadcast', { event: 'match_exit' }, () => {
        onExitRef.current?.();
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        const msg = handleIncomingChat(
          payload,
          myName,
          chatSeenIdsRef.current,
          receiverChatLimiterRef.current
        );
        if (msg) {
          onChatRef.current?.(msg);
        }
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const rx = handleIncomingReaction(
          payload,
          myName,
          reactionSeenIdsRef.current,
          receiverReactionLimiterRef.current
        );
        if (rx) {
          onReactionRef.current?.(rx);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void ch.track({ joined_at: Date.now() });
          setConnecting(false);
          if (roleRef.current === 'guest') {
            requestState();
          }
        } else if (status === 'CHANNEL_ERROR') {
          setConnecting(false);
          setError('Failed to establish match connection.');
        }
      });

    return () => {
      setInMatchStatus(false);
      void ch.unsubscribe();
      channelRef.current = null;
    };
  }, [matchId, gameId, myName, sendState, requestState, setInMatchStatus]);

  return {
    connecting,
    opponentConnected,
    error,
    channel: channelRef.current,
    sendMove,
    sendState,
    requestState,
    sendRematch,
    sendExit,
    sendChat,
    sendReaction,
    seqRef,
    lastAppliedSeqRef,
  };
}
