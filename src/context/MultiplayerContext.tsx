import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';
import { useRouter } from '@/router';
import { arcadeAudio } from '@/lib/arcadeAudio';
import type { AvatarConfig } from '@/types/avatar';
import { getCachedAvatar } from '@/lib/avatarStorage';

export type PresenceStatus = 'online' | 'in_match' | 'offline';

export type FriendState = {
  email: string;
  name: string;
  emoji: string;
  avatar?: AvatarConfig;
  status: PresenceStatus;
  currentGame: string | null;
  lastSeen: number | null;
};

export type Invitation = {
  id: string;
  fromEmail: string;
  fromName: string;
  fromAvatar?: AvatarConfig;
  toEmail: string;
  gameId: string;
  matchId: string;
  createdAt: number;
  expiresAt: number;
  expiresIn?: number;
};

type MultiplayerContextType = {
  friend: FriendState;
  outgoingInvite: Invitation | null;
  incomingInvite: Invitation | null;
  activeMatch: { matchId: string; gameId: string; role: 'host' | 'guest'; opponentName: string } | null;
  sendInvite: (gameId: string) => void;
  cancelOutgoingInvite: () => void;
  acceptIncomingInvite: () => void;
  declineIncomingInvite: () => void;
  setInMatchStatus: (inMatch: boolean, gameId?: string) => void;
  exitActiveMatch: () => void;
};

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined);

const AUTHORIZED_ACCOUNTS = [
  { email: 'pedamallusriaditya@gmail.com', name: 'Aditya', emoji: '🎮' },
  { email: 'pasulaharika61@gmail.com', name: 'Harika', emoji: '✨' },
];

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const myEmail = user?.email?.toLowerCase().trim() || '';
  const myFriendInfo = AUTHORIZED_ACCOUNTS.find((a) => a.email !== myEmail) || {
    email: myEmail === 'pedamallusriaditya@gmail.com' ? 'pasulaharika61@gmail.com' : 'pedamallusriaditya@gmail.com',
    name: myEmail === 'pedamallusriaditya@gmail.com' ? 'Harika' : 'Aditya',
    emoji: myEmail === 'pedamallusriaditya@gmail.com' ? '✨' : '🎮',
  };

  const myDisplayName = AUTHORIZED_ACCOUNTS.find((a) => a.email === myEmail)?.name || myEmail.split('@')[0];

  const [friend, setFriend] = useState<FriendState>({
    email: myFriendInfo.email,
    name: myFriendInfo.name,
    emoji: myFriendInfo.emoji,
    avatar: getCachedAvatar(myFriendInfo.email, myFriendInfo.name),
    status: 'offline',
    currentGame: null,
    lastSeen: null,
  });

  const [outgoingInvite, setOutgoingInvite] = useState<Invitation | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<Invitation | null>(null);
  const [activeMatch, setActiveMatch] = useState<{ matchId: string; gameId: string; role: 'host' | 'guest'; opponentName: string } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lobbyChannelRef = useRef<any>(null);
  const currentGameRef = useRef<string | null>(null);
  const isMatchRef = useRef<boolean>(false);

  // Expiry timer for invitations (45 seconds)
  useEffect(() => {
    if (!outgoingInvite && !incomingInvite) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (outgoingInvite && now > outgoingInvite.expiresAt) {
        setOutgoingInvite(null);
        arcadeAudio.playDraw();
      }
      if (incomingInvite && now > incomingInvite.expiresAt) {
        setIncomingInvite(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [outgoingInvite, incomingInvite]);

  const updatePresence = useCallback((status: PresenceStatus, gameId: string | null = null) => {
    if (!lobbyChannelRef.current || !user) return;
    currentGameRef.current = gameId;
    isMatchRef.current = status === 'in_match';

    const myAvatar = getCachedAvatar(myEmail, myDisplayName);

    void lobbyChannelRef.current.track({
      userId: user.id,
      email: myEmail,
      displayName: myDisplayName,
      avatar: myAvatar,
      status,
      currentGame: gameId,
      timestamp: Date.now(),
    });
  }, [user, myEmail, myDisplayName]);

  // Subscribe to Global Lobby Presence and Broadcast
  useEffect(() => {
    if (!user || !myEmail) return;

    const ch = supabase.channel('haya-global-lobby', {
      config: { presence: { key: user.id } },
    });

    lobbyChannelRef.current = ch;

    // Presence Sync
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      // Find friend's presence across all active sessions
      let friendOnline = false;
      let friendStatus: PresenceStatus = 'offline';
      let friendGame: string | null = null;
      let lastTimestamp: number | null = null;
      let friendAvatar: AvatarConfig | undefined = undefined;

      Object.values(state).forEach((presences) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (presences as any[]).forEach((p) => {
          if (p.email?.toLowerCase() === myFriendInfo.email.toLowerCase()) {
            friendOnline = true;
            friendStatus = p.status || 'online';
            friendGame = p.currentGame || null;
            lastTimestamp = p.timestamp || Date.now();
            if (p.avatar) {
              friendAvatar = p.avatar;
            }
          }
        });
      });

      setFriend((prev) => ({
        ...prev,
        status: friendOnline ? friendStatus : 'offline',
        currentGame: friendOnline ? friendGame : null,
        lastSeen: friendOnline ? lastTimestamp : prev.lastSeen,
        avatar: friendAvatar || prev.avatar || getCachedAvatar(myFriendInfo.email, myFriendInfo.name),
      }));
    })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === myFriendInfo.email || key === friend.email) {
          setFriend((prev) => ({ ...prev, status: 'offline', currentGame: null }));
        }
      })
      // Direct Broadcast Invitations
      .on('broadcast', { event: 'game_invite' }, ({ payload }) => {
        const invite = payload as Invitation;
        // Verify this invitation is meant for me
        if (invite.toEmail?.toLowerCase() === myEmail.toLowerCase()) {
          // If already in a match, auto-decline
          if (isMatchRef.current) {
            ch.send({
              type: 'broadcast',
              event: 'invite_response',
              payload: { inviteId: invite.id, status: 'declined', reason: 'in_match' },
            });
            return;
          }

          setIncomingInvite(invite);
          arcadeAudio.playCoin();
        }
      })
      .on('broadcast', { event: 'invite_response' }, ({ payload }) => {
        const { inviteId, status, matchId, gameId } = payload;

        setOutgoingInvite((current) => {
          if (current && current.id === inviteId) {
            if (status === 'accepted') {
              arcadeAudio.playWin();
              setActiveMatch({
                matchId,
                gameId,
                role: 'host',
                opponentName: myFriendInfo.name,
              });
              // Update presence to in_match
              updatePresence('in_match', gameId);
              // Navigate to match route
              navigate(`/play/${gameId}?match=${matchId}`);
              return null;
            } else if (status === 'declined') {
              arcadeAudio.playDraw();
              alert(`${myFriendInfo.name} is unable to play right now.`);
              return null;
            } else if (status === 'cancelled') {
              return null;
            }
          }
          return current;
        });

        // If incoming invite was cancelled by sender
        setIncomingInvite((current) => {
          if (current && current.id === inviteId && status === 'cancelled') {
            return null;
          }
          return current;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          updatePresence('online', null);
        }
      });

    const handleAvatarUpdate = () => {
      if (lobbyChannelRef.current) {
        updatePresence(isMatchRef.current ? 'in_match' : 'online', currentGameRef.current);
      }
    };
    window.addEventListener('haya_avatar_updated', handleAvatarUpdate);

    return () => {
      window.removeEventListener('haya_avatar_updated', handleAvatarUpdate);
      void ch.unsubscribe();
      lobbyChannelRef.current = null;
    };
  }, [user, myEmail, myFriendInfo.email, myFriendInfo.name, friend.email, updatePresence, navigate]);

  // Subscribe to Postgres Realtime changes on multiplayer_invitations table
  useEffect(() => {
    if (!user || !myEmail) return;

    const channel = supabase
      .channel('haya-invitations-db')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'multiplayer_invitations',
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = (payload.new || payload.old) as any;
          if (!row) return;

          const toMe = row.to_email?.toLowerCase() === myEmail.toLowerCase();
          const fromMe = row.from_email?.toLowerCase() === myEmail.toLowerCase();

          // Incoming invitation for me
          if (toMe) {
            if (row.status === 'pending') {
              const expiresMs = new Date(row.expires_at).getTime();
              if (Date.now() < expiresMs && !isMatchRef.current) {
                setIncomingInvite({
                  id: row.id,
                  fromEmail: row.from_email,
                  fromName: row.from_name,
                  fromAvatar: getCachedAvatar(row.from_email, row.from_name),
                  toEmail: row.to_email,
                  gameId: row.game_id,
                  matchId: row.match_id,
                  createdAt: new Date(row.created_at).getTime(),
                  expiresAt: expiresMs,
                });
                arcadeAudio.playCoin();
              }
            } else if (
              row.status === 'cancelled' ||
              row.status === 'declined' ||
              row.status === 'expired'
            ) {
              setIncomingInvite((curr) =>
                curr && curr.matchId === row.match_id ? null : curr
              );
            }
          }

          // Outgoing invitation from me
          if (fromMe) {
            if (row.status === 'accepted') {
              arcadeAudio.playWin();
              setActiveMatch({
                matchId: row.match_id,
                gameId: row.game_id,
                role: 'host',
                opponentName: myFriendInfo.name,
              });
              setOutgoingInvite(null);
              updatePresence('in_match', row.game_id);
              navigate(`/play/${row.game_id}?match=${row.match_id}`);
            } else if (
              row.status === 'declined' ||
              row.status === 'cancelled' ||
              row.status === 'expired'
            ) {
              setOutgoingInvite((curr) =>
                curr && curr.matchId === row.match_id ? null : curr
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [user, myEmail, myFriendInfo.name, updatePresence, navigate]);

  // Actions
  const sendInvite = useCallback((gameId: string) => {
    if (!lobbyChannelRef.current || friend.status === 'offline') return;

    const matchId = `match_${gameId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inviteId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresMs = Date.now() + 45000; // 45 seconds
    const expiresAtIso = new Date(expiresMs).toISOString();

    const invite: Invitation = {
      id: inviteId,
      fromEmail: myEmail,
      fromName: myDisplayName,
      fromAvatar: getCachedAvatar(myEmail, myDisplayName),
      toEmail: myFriendInfo.email,
      gameId,
      matchId,
      createdAt: Date.now(),
      expiresAt: expiresMs,
    };

    setOutgoingInvite(invite);
    arcadeAudio.playBlip();

    void lobbyChannelRef.current.send({
      type: 'broadcast',
      event: 'game_invite',
      payload: invite,
    });

    // Supabase DB Persistence
    void supabase
      .from('multiplayer_invitations')
      .insert([
        {
          id: inviteId,
          from_email: myEmail,
          from_name: myDisplayName,
          to_email: myFriendInfo.email,
          game_id: gameId,
          match_id: matchId,
          status: 'pending',
          expires_at: expiresAtIso,
        },
      ])
      .then(({ error }) => {
        if (error) {
          console.warn('[MultiplayerContext] DB invitation insert notice:', error.message);
        }
      });
  }, [friend.status, myEmail, myDisplayName, myFriendInfo.email]);

  const cancelOutgoingInvite = useCallback(() => {
    if (!outgoingInvite || !lobbyChannelRef.current) return;

    void lobbyChannelRef.current.send({
      type: 'broadcast',
      event: 'invite_response',
      payload: { inviteId: outgoingInvite.id, status: 'cancelled' },
    });

    void supabase
      .from('multiplayer_invitations')
      .update({ status: 'cancelled' })
      .eq('match_id', outgoingInvite.matchId);

    setOutgoingInvite(null);
  }, [outgoingInvite]);

  const acceptIncomingInvite = useCallback(() => {
    if (!incomingInvite || !lobbyChannelRef.current) return;

    const { id, matchId, gameId } = incomingInvite;

    void lobbyChannelRef.current.send({
      type: 'broadcast',
      event: 'invite_response',
      payload: { inviteId: id, status: 'accepted', matchId, gameId },
    });

    void supabase
      .from('multiplayer_invitations')
      .update({ status: 'accepted' })
      .eq('match_id', incomingInvite.matchId);

    setActiveMatch({
      matchId,
      gameId,
      role: 'guest',
      opponentName: incomingInvite.fromName,
    });

    setIncomingInvite(null);
    updatePresence('in_match', gameId);
    arcadeAudio.playCoin();
    navigate(`/play/${gameId}?match=${matchId}`);
  }, [incomingInvite, updatePresence, navigate]);

  const declineIncomingInvite = useCallback(() => {
    if (!incomingInvite || !lobbyChannelRef.current) return;

    void lobbyChannelRef.current.send({
      type: 'broadcast',
      event: 'invite_response',
      payload: { inviteId: incomingInvite.id, status: 'declined' },
    });

    void supabase
      .from('multiplayer_invitations')
      .update({ status: 'declined' })
      .eq('match_id', incomingInvite.matchId);

    setIncomingInvite(null);
  }, [incomingInvite]);

  const setInMatchStatus = useCallback((inMatch: boolean, gameId?: string) => {
    updatePresence(inMatch ? 'in_match' : 'online', gameId || null);
  }, [updatePresence]);

  const exitActiveMatch = useCallback(() => {
    setActiveMatch(null);
    updatePresence('online', null);
  }, [updatePresence]);

  return (
    <MultiplayerContext.Provider
      value={{
        friend,
        outgoingInvite,
        incomingInvite,
        activeMatch,
        sendInvite,
        cancelOutgoingInvite,
        acceptIncomingInvite,
        declineIncomingInvite,
        setInMatchStatus,
        exitActiveMatch,
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error('useMultiplayer must be used within <MultiplayerProvider>');
  return ctx;
}
