import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';
import { setMatchActiveState } from '@/auth/authUtils';
import { useRouter } from '@/router';
import { arcadeAudio } from '@/lib/arcadeAudio';
import type { AvatarConfig } from '@/types/avatar';
import { getCachedAvatar } from '@/lib/avatarStorage';
import { shouldStartHostMatch, createHostMatch } from './multiplayerHelpers';

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

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const { navigate } = useRouter();

  const userId = user?.id;
  const myEmail = user?.email?.toLowerCase().trim() || '';
  const myDisplayName =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    (myEmail ? myEmail.split('@')[0] : 'Player');

  const isHarika =
    myDisplayName.toLowerCase().includes('harika') ||
    myEmail.toLowerCase().includes('harika');
  const defaultFriendName = isHarika ? 'Aditya' : 'Harika';
  const defaultFriendEmoji = isHarika ? '🎮' : '✨';

  const [friend, setFriend] = useState<FriendState>(() => ({
    email: '',
    name: defaultFriendName,
    emoji: defaultFriendEmoji,
    avatar: getCachedAvatar('', defaultFriendName),
    status: 'offline',
    currentGame: null,
    lastSeen: null,
  }));

  // Fetch friend profile from the Supabase profiles table via authenticated RLS
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    supabase
      .from('profiles')
      .select('id, email, display_name, avatar_data')
      .neq('id', user.id)
      .limit(1)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          if (!mounted) return;
          if (error) {
            console.warn('[MultiplayerContext] Friend profile fetch notice:', error.message);
            return;
          }
          if (data) {
            const friendEmail = data.email || '';
            const friendName = data.display_name || (friendEmail.toLowerCase().includes('harika') ? 'Harika' : 'Aditya');
            const friendEmoji = friendName.toLowerCase().includes('harika') ? '✨' : '🎮';
            setFriend((prev) => ({
              ...prev,
              email: friendEmail,
              name: friendName,
              emoji: friendEmoji,
              avatar: (data.avatar_data as AvatarConfig) || prev.avatar || getCachedAvatar(friendEmail, friendName),
            }));
          }
        },
        (err: unknown) => {
          console.warn('[MultiplayerContext] Failed to load friend profile:', err);
        }
      );

    return () => {
      mounted = false;
    };
  }, [user]);

  // DEV-only fallback for mock dev accounts
  useEffect(() => {
    if (import.meta.env.DEV && user && !friend.email) {
      const devEmails = ((import.meta.env as Record<string, string | undefined>).VITE_ALLOWED_EMAILS || '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean);
      if (devEmails.length > 1) {
        const otherDev = devEmails.find((e: string) => e !== myEmail) || (isHarika ? devEmails[0] : devEmails[1]);
        if (otherDev) {
          setFriend((prev) => ({ ...prev, email: otherDev }));
        }
      }
    }
  }, [user, myEmail, isHarika, friend.email]);

  const [outgoingInvite, setOutgoingInvite] = useState<Invitation | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<Invitation | null>(null);
  const [activeMatch, setActiveMatch] = useState<{ matchId: string; gameId: string; role: 'host' | 'guest'; opponentName: string } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lobbyChannelRef = useRef<any>(null);
  const currentGameRef = useRef<string | null>(null);
  const isMatchRef = useRef<boolean>(false);

  // Keep latest mutable values in refs to avoid recreating channels on render
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const friendRef = useRef(friend);
  friendRef.current = friend;

  const outgoingInviteRef = useRef(outgoingInvite);
  outgoingInviteRef.current = outgoingInvite;

  const activeMatchRef = useRef(activeMatch);
  activeMatchRef.current = activeMatch;

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
      displayName: myDisplayName,
      avatar: myAvatar,
      status,
      currentGame: gameId,
      timestamp: Date.now(),
    });
  }, [user, myEmail, myDisplayName]);

  const updatePresenceRef = useRef(updatePresence);
  updatePresenceRef.current = updatePresence;

  // Idempotent host match launcher used by both broadcast and database change paths
  const startHostMatch = useCallback((matchId: string, gameId: string, opponentName?: string) => {
    if (!shouldStartHostMatch(activeMatchRef.current?.matchId, matchId)) {
      return;
    }
    const resolvedOpponent = opponentName || friendRef.current.name || 'Friend';
    setOutgoingInvite(null);
    setActiveMatch(createHostMatch(matchId, gameId, resolvedOpponent));
    updatePresenceRef.current('in_match', gameId);
    arcadeAudio.playWin();
    navigateRef.current(`/play/${gameId}?match=${matchId}`);
  }, []);

  // Subscribe to Global Lobby Presence and Broadcast
  useEffect(() => {
    if (!userId || !myEmail) return;

    if (import.meta.env.DEV) {
      console.debug('[MultiplayerContext] Creating lobby channel (haya-global-lobby) for user:', userId);
    }

    const ch = supabase.channel('haya-global-lobby', {
      config: {
        private: true,
        presence: { key: userId },
      },
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
          const isFriend =
            (p.userId && p.userId !== userId) ||
            (p.displayName && p.displayName.toLowerCase() === friendRef.current.name.toLowerCase());
          if (isFriend) {
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
        avatar: friendAvatar || prev.avatar || getCachedAvatar(friendRef.current.email, friendRef.current.name),
      }));
    })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== userId) {
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
        const currentOutgoing = outgoingInviteRef.current;

        if (currentOutgoing && currentOutgoing.id === inviteId) {
          if (status === 'accepted') {
            startHostMatch(matchId || currentOutgoing.matchId, gameId || currentOutgoing.gameId, friendRef.current.name);
          } else if (status === 'declined') {
            setOutgoingInvite(null);
            arcadeAudio.playDraw();
            alert(`${friendRef.current.name} is unable to play right now.`);
          } else if (status === 'cancelled') {
            setOutgoingInvite(null);
          }
        }

        // If incoming invite was cancelled by sender
        setIncomingInvite((current) => {
          if (current && current.id === inviteId && status === 'cancelled') {
            return null;
          }
          return current;
        });
      })
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.debug('[MultiplayerContext] Subscribed to lobby channel (haya-global-lobby), status:', status);
        }
        if (status === 'SUBSCRIBED') {
          updatePresenceRef.current(isMatchRef.current ? 'in_match' : 'online', currentGameRef.current);
        }
      });

    const handleAvatarUpdate = () => {
      if (lobbyChannelRef.current) {
        updatePresenceRef.current(isMatchRef.current ? 'in_match' : 'online', currentGameRef.current);
      }
    };
    window.addEventListener('haya_avatar_updated', handleAvatarUpdate);

    return () => {
      if (import.meta.env.DEV) {
        console.debug('[MultiplayerContext] Unsubscribing lobby channel (haya-global-lobby)');
      }
      window.removeEventListener('haya_avatar_updated', handleAvatarUpdate);
      void ch.unsubscribe();
      lobbyChannelRef.current = null;
    };
  }, [userId, myEmail, startHostMatch]);

  // Subscribe to Postgres Realtime changes on multiplayer_invitations table
  useEffect(() => {
    if (!userId || !myEmail) return;

    if (import.meta.env.DEV) {
      console.debug('[MultiplayerContext] Creating invitations DB channel (haya-invitations-db) for user:', userId);
    }

    const channel = supabase
      .channel('haya-invitations-db', {
        config: { private: true },
      })
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
              startHostMatch(row.match_id, row.game_id, friendRef.current.name);
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
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.debug('[MultiplayerContext] Subscribed to invitations DB channel (haya-invitations-db), status:', status);
        }
      });

    return () => {
      if (import.meta.env.DEV) {
        console.debug('[MultiplayerContext] Unsubscribing invitations DB channel (haya-invitations-db)');
      }
      void channel.unsubscribe();
    };
  }, [userId, myEmail, startHostMatch]);

  // Actions
  const sendInvite = useCallback((gameId: string) => {
    if (!friend.email) return;
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
      toEmail: friend.email,
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
          to_email: friend.email,
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
  }, [friend.status, friend.email, myEmail, myDisplayName]);

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

  const acceptIncomingInvite = useCallback(async () => {
    if (!incomingInvite || !lobbyChannelRef.current) return;

    const { id, matchId, gameId, fromName } = incomingInvite;

    void lobbyChannelRef.current.send({
      type: 'broadcast',
      event: 'invite_response',
      payload: { inviteId: id, status: 'accepted', matchId, gameId },
    });

    const { error } = await supabase
      .from('multiplayer_invitations')
      .update({ status: 'accepted' })
      .eq('match_id', matchId);

    if (error) {
      console.error('[MultiplayerContext] Failed to update invitation to accepted in DB:', error);
      alert('Unable to record accepted invitation in database. Please check your connection.');
    }

    setActiveMatch({
      matchId,
      gameId,
      role: 'guest',
      opponentName: fromName,
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
    setMatchActiveState(inMatch);
  }, [updatePresence]);

  const exitActiveMatch = useCallback(() => {
    setActiveMatch(null);
    updatePresence('online', null);
    setMatchActiveState(false);
  }, [updatePresence]);

  useEffect(() => {
    if (activeMatch) {
      setMatchActiveState(true);
    }
  }, [activeMatch]);

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

// eslint-disable-next-line react-refresh/only-export-components
export function useMultiplayer() {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error('useMultiplayer must be used within <MultiplayerProvider>');
  return ctx;
}
