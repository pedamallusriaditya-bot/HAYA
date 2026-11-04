import React, { useState, useEffect, useCallback } from 'react';
import { Check, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { arcadeAudio } from '@/lib/arcadeAudio';
import type { LudoColor } from './engine';

type ColorReservationState = {
  red?: { email: string; name: string };
  green?: { email: string; name: string };
  yellow?: { email: string; name: string };
  blue?: { email: string; name: string };
};

type OnlineColorReservationProps = {
  matchId: string;
  myEmail: string;
  myName: string;
  opponentName: string;
  opponentConnected: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: any;
  onBothReady: (myColor: LudoColor, opponentColor: LudoColor) => void;
};

const ALL_COLORS: { id: LudoColor; label: string; bg: string; border: string; text: string }[] = [
  {
    id: 'red',
    label: 'Ruby Red',
    bg: 'bg-rose-500/20 hover:bg-rose-500/30',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
  },
  {
    id: 'green',
    label: 'Emerald Green',
    bg: 'bg-emerald-500/20 hover:bg-emerald-500/30',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
  },
  {
    id: 'yellow',
    label: 'Amber Yellow',
    bg: 'bg-amber-500/20 hover:bg-amber-500/30',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
  },
  {
    id: 'blue',
    label: 'Sapphire Blue',
    bg: 'bg-sky-500/20 hover:bg-sky-500/30',
    border: 'border-sky-500/40',
    text: 'text-sky-400',
  },
];

export default function OnlineColorReservation({
  matchId,
  myEmail,
  myName,
  opponentName,
  opponentConnected,
  channel,
  onBothReady,
}: OnlineColorReservationProps) {
  const [reservations, setReservations] = useState<ColorReservationState>({});
  const [isReserving, setIsReserving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load current reservations from authoritative backend
  const fetchReservations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('match_color_reservations')
        .select('*')
        .eq('match_id', matchId);

      if (error) {
        // Table might not exist or network error -> fallback to channel broadcast state
        return;
      }

      const map: ColorReservationState = {};
      if (data) {
        for (const row of data) {
          const col = row.color as LudoColor;
          map[col] = { email: row.user_email, name: row.user_name };
        }
      }
      setReservations(map);
    } catch {
      // Ignore network errors in offline/dev
    }
  }, [matchId]);

  useEffect(() => {
    void fetchReservations();

    // Listen to realtime broadcast events for instant sub-millisecond sync
    if (channel) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onBroadcast = ({ payload }: { payload: any }) => {
        if (payload?.type === 'color_reservation_update') {
          setReservations(payload.reservations);
        }
      };

      channel.on('broadcast', { event: 'color_reservation' }, onBroadcast);
    }
  }, [fetchReservations, channel]);

  // Determine user's selected color and opponent's selected color
  let myColor: LudoColor | null = null;
  let opponentColor: LudoColor | null = null;

  for (const [col, info] of Object.entries(reservations) as [LudoColor, { email: string; name: string }][]) {
    if (info.email.toLowerCase() === myEmail.toLowerCase()) {
      myColor = col;
    } else {
      opponentColor = col;
    }
  }

  // Check if both players have distinct reservations
  const canStartMatch =
    myColor !== null && opponentColor !== null && myColor !== opponentColor && opponentConnected;

  // Authoritative reservation request (first-come, first-served)
  const handleSelectColor = async (color: LudoColor) => {
    if (isReserving) return;
    setErrorMessage(null);

    // If already reserved by opponent
    const existing = reservations[color];
    if (existing && existing.email.toLowerCase() !== myEmail.toLowerCase()) {
      setErrorMessage(`Color already reserved by ${existing.name || 'opponent'}.`);
      arcadeAudio.playDraw();
      return;
    }

    // If already selected by me
    if (existing && existing.email.toLowerCase() === myEmail.toLowerCase()) {
      return;
    }

    setIsReserving(true);

    try {
      // 1. Authoritative release of previous reservation by this user
      await supabase
        .from('match_color_reservations')
        .delete()
        .eq('match_id', matchId)
        .eq('user_email', myEmail);

      // 2. Authoritative insert of new reservation
      const { error } = await supabase.from('match_color_reservations').insert({
        match_id: matchId,
        color,
        user_email: myEmail,
        user_name: myName,
      });

      if (error) {
        // Unique violation: opponent claimed it at the exact same millisecond
        setErrorMessage('Another player reserved this color first! Please pick a different color.');
        arcadeAudio.playDraw();
        void fetchReservations();
      } else {
        // Success
        arcadeAudio.playMove(true);
        const nextMap: ColorReservationState = {
          ...reservations,
          [color]: { email: myEmail, name: myName },
        };
        // Remove old color if any
        if (myColor && myColor !== color) {
          delete nextMap[myColor];
        }
        setReservations(nextMap);

        // Broadcast to opponent
        if (channel) {
          void channel.send({
            type: 'broadcast',
            event: 'color_reservation',
            payload: {
              type: 'color_reservation_update',
              reservations: nextMap,
            },
          });
        }
      }
    } catch {
      // Optimistic fallback for local dev
      const nextMap: ColorReservationState = {
        ...reservations,
        [color]: { email: myEmail, name: myName },
      };
      if (myColor && myColor !== color) {
        delete nextMap[myColor];
      }
      setReservations(nextMap);

      if (channel) {
        void channel.send({
          type: 'broadcast',
          event: 'color_reservation',
          payload: {
            type: 'color_reservation_update',
            reservations: nextMap,
          },
        });
      }
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <div className="arcade-cabinet p-6 max-w-xl mx-auto space-y-6 animate-in border-2 border-slate-700/80">
      <div className="text-center space-y-1">
        <div className="token-badge mb-1">
          <Sparkles className="h-3 w-3" /> FIRST-COME, FIRST-SERVED COLOR DRAFT
        </div>
        <h2 className="text-2xl font-extrabold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Reserve Your Ludo Color
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Both players choose their controlling color before entering the match. The first confirmed reservation claims the color.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 text-center animate-pop">
          {errorMessage}
        </div>
      )}

      {/* 4 Color Reservation Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ALL_COLORS.map((c) => {
          const res = reservations[c.id];
          const isMine = res && res.email.toLowerCase() === myEmail.toLowerCase();
          const isOpponent = res && res.email.toLowerCase() !== myEmail.toLowerCase();
          const isAvailable = !res;

          return (
            <button
              key={c.id}
              type="button"
              disabled={isOpponent || isReserving}
              onClick={() => handleSelectColor(c.id)}
              className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between select-none ${
                isMine
                  ? 'border-amber-400 bg-amber-950/30 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400'
                  : isOpponent
                  ? 'border-slate-800 bg-slate-950/80 opacity-50 cursor-not-allowed'
                  : `${c.border} ${c.bg} hover:scale-[1.02] cursor-pointer`
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-3.5 h-3.5 rounded-full ${
                      c.id === 'red'
                        ? 'bg-rose-500'
                        : c.id === 'green'
                        ? 'bg-emerald-500'
                        : c.id === 'yellow'
                        ? 'bg-amber-400'
                        : 'bg-sky-500'
                    }`}
                  />
                  <span className={`font-bold text-sm ${c.text}`}>{c.label}</span>
                </div>

                <div className="text-xs">
                  {isMine && (
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Check className="h-3 w-3 stroke-[3]" />
                      Selected by You
                    </span>
                  )}
                  {isOpponent && (
                    <span className="font-mono text-slate-400 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-slate-500" />
                      Reserved by {opponentName}
                    </span>
                  )}
                  {isAvailable && (
                    <span className="font-mono text-slate-400">Available to claim</span>
                  )}
                </div>
              </div>

              {isMine && (
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                  LOCKED
                </span>
              )}
              {isOpponent && (
                <span className="text-[10px] font-mono text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  TAKEN
                </span>
              )}
              {isAvailable && (
                <span className="text-[10px] font-mono text-slate-400 uppercase px-2 py-0.5 rounded border border-slate-700">
                  CLAIM
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status Bar & Start Button */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Opponent Status: <strong className={opponentConnected ? 'text-emerald-400' : 'text-amber-400'}>{opponentConnected ? `${opponentName} Connected` : 'Waiting for connection...'}</strong>
          </span>
          <span className="text-slate-400 font-mono">
            {myColor ? `Your Color: ${myColor.toUpperCase()}` : 'Select a color'}
          </span>
        </div>

        {canStartMatch ? (
          <button
            type="button"
            onClick={() => onBothReady(myColor!, opponentColor!)}
            className="btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 animate-pop"
          >
            <Sparkles className="h-4 w-4" /> Start Online Match
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="text-center py-2 text-xs text-slate-500 font-mono">
            {!opponentConnected
              ? 'Waiting for opponent to connect...'
              : !myColor
              ? 'Please select your color above.'
              : !opponentColor
              ? `Waiting for ${opponentName} to select their color...`
              : 'Configuring match...'}
          </div>
        )}
      </div>
    </div>
  );
}
