import { useEffect, useState, useCallback, useRef } from 'react';
import { RotateCcw, ArrowLeft, Loader2, Wifi, WifiOff, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { createEmptyBoard, checkWinner, type Board, type Player } from './engine';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { recordGameResult } from '@/lib/gameRecordsService';

type OnlineMatchProps = {
  matchId: string;
  role: 'host' | 'guest';
  opponentName: string;
  onExit: () => void;
};

export default function OnlineRoom({ matchId, role, opponentName, onExit }: OnlineMatchProps) {
  const { profile } = useAuth();
  const { exitActiveMatch, setInMatchStatus } = useMultiplayer();

  const [connecting, setConnecting] = useState<boolean>(true);
  const [opponentConnected, setOpponentConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Match State
  const mySymbol: Player = role === 'host' ? 'X' : 'O';
  const opponentSymbol: Player = role === 'host' ? 'O' : 'X';

  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [currentTurn, setCurrentTurn] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [winningLine, setWinningLine] = useState<[number, number, number] | null>(null);
  const [score, setScore] = useState({ me: 0, opponent: 0, draws: 0 });
  const roundRef = useRef(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const myName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';

  useEffect(() => {
    setInMatchStatus(true, 'tictactoe');
    const ch = supabase.channel(`haya-match-${matchId}`, {
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
    })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        const { index, symbol } = payload;
        setBoard((prev) => {
          if (prev[index] !== null) return prev; // Ignore invalid
          const next = [...prev];
          next[index] = symbol;

          const result = checkWinner(next);
          if (result.winner) {
            setWinner(result.winner);
            setWinningLine(result.winningLine);
            if (result.winner === 'draw') {
              setScore((s) => ({ ...s, draws: s.draws + 1 }));
              arcadeAudio.playDraw();
            } else if (result.winner === mySymbol) {
              setScore((s) => ({ ...s, me: s.me + 1 }));
              arcadeAudio.playWin();
            } else {
              setScore((s) => ({ ...s, opponent: s.opponent + 1 }));
              arcadeAudio.playDraw();
            }

            if (profile?.id) {
              void recordGameResult({
                user_id: profile.id,
                game: 'tictactoe',
                mode: 'multi',
                result: result.winner === 'draw' ? 'draw' : result.winner === mySymbol ? 'win' : 'loss',
                score: result.winner === mySymbol ? 1 : 0,
                opponent_type: 'human',
                opponent_name: opponentName,
                match_id: `${matchId}_rnd_${roundRef.current}`,
              });
            }
          }
          return next;
        });

        setCurrentTurn(symbol === 'X' ? 'O' : 'X');
        arcadeAudio.playMove(symbol === 'X');
      })
      .on('broadcast', { event: 'rematch' }, () => {
        roundRef.current += 1;
        setBoard(createEmptyBoard());
        setWinner(null);
        setWinningLine(null);
        setCurrentTurn('X');
        arcadeAudio.playCoin();
      })
      .on('broadcast', { event: 'match_exit' }, () => {
        alert(`${opponentName} left the match.`);
        exitActiveMatch();
        onExit();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void ch.track({ joined_at: Date.now() });
          setConnecting(false);
          arcadeAudio.playCoin();
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
  }, [matchId, myName, mySymbol, opponentName, onExit, exitActiveMatch, setInMatchStatus, profile?.id]);

  const handleCellClick = (index: number) => {
    if (!channelRef.current || winner || board[index] !== null || currentTurn !== mySymbol) return;

    const next = [...board];
    next[index] = mySymbol;
    setBoard(next);
    setCurrentTurn(opponentSymbol);
    arcadeAudio.playMove(mySymbol === 'X');

    // Broadcast move to opponent
    void channelRef.current.send({
      type: 'broadcast',
      event: 'move',
      payload: { index, symbol: mySymbol },
    });

    const result = checkWinner(next);
    if (result.winner) {
      setWinner(result.winner);
      setWinningLine(result.winningLine);
      if (result.winner === 'draw') {
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
        arcadeAudio.playDraw();
      } else if (result.winner === mySymbol) {
        setScore((s) => ({ ...s, me: s.me + 1 }));
        arcadeAudio.playWin();
      } else {
        setScore((s) => ({ ...s, opponent: s.opponent + 1 }));
      }

      if (profile?.id) {
        void recordGameResult({
          user_id: profile.id,
          game: 'tictactoe',
          mode: 'multi',
          result: result.winner === 'draw' ? 'draw' : result.winner === mySymbol ? 'win' : 'loss',
          score: result.winner === mySymbol ? 1 : 0,
          opponent_type: 'human',
          opponent_name: opponentName,
          match_id: `${matchId}_rnd_${roundRef.current}`,
        });
      }
    }
  };

  const requestRematch = () => {
    if (!channelRef.current) return;
    roundRef.current += 1;
    setBoard(createEmptyBoard());
    setWinner(null);
    setWinningLine(null);
    setCurrentTurn('X');
    void channelRef.current.send({
      type: 'broadcast',
      event: 'rematch',
      payload: {},
    });
    arcadeAudio.playCoin();
  };

  const handleLeaveMatch = useCallback(() => {
    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'match_exit',
        payload: {},
      });
    }
    exitActiveMatch();
    onExit();
  }, [exitActiveMatch, onExit]);

  if (connecting) {
    return (
      <div className="arcade-cabinet p-12 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
        <h3 className="font-bold text-slate-100 text-lg">Linking Match Stations...</h3>
        <p className="text-xs text-slate-400">Connecting you and {opponentName} directly.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="arcade-cabinet p-8 text-center space-y-4 border-rose-500/40">
        <div className="text-rose-400 font-bold">{error}</div>
        <button onClick={handleLeaveMatch} className="btn-primary">
          Return to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Top Station Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button onClick={handleLeaveMatch} className="btn-ghost !py-1.5 !px-3">
          <ArrowLeft className="h-4 w-4" /> Leave Match
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-xl">
            <span className="text-xs uppercase text-slate-400">Match Link:</span>
            <span className="font-mono font-bold text-amber-400">ACTIVE</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl">
            {opponentConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
            <span>{opponentConnected ? `Linked with ${opponentName}` : `Waiting for ${opponentName}...`}</span>
          </div>
        </div>
      </div>

      {/* Arena Scoreboard */}
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
        <div className={`p-3 rounded-2xl border ${mySymbol === 'X' ? 'bg-sky-500/10 border-sky-400/40 text-sky-300' : 'bg-rose-500/10 border-rose-400/40 text-rose-300'}`}>
          <div className="text-xs font-semibold uppercase">{myName} ({mySymbol})</div>
          <div className="text-2xl font-bold mt-0.5">{score.me}</div>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
          <div className="text-xs font-semibold uppercase">Ties</div>
          <div className="text-2xl font-bold mt-0.5">{score.draws}</div>
        </div>
        <div className={`p-3 rounded-2xl border ${opponentSymbol === 'X' ? 'bg-sky-500/10 border-sky-400/40 text-sky-300' : 'bg-rose-500/10 border-rose-400/40 text-rose-300'}`}>
          <div className="text-xs font-semibold uppercase">{opponentName} ({opponentSymbol})</div>
          <div className="text-2xl font-bold mt-0.5">{score.opponent}</div>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="text-center">
        {!winner ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700">
            <span className={`h-2.5 w-2.5 rounded-full ${currentTurn === mySymbol ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-sm font-semibold">
              {currentTurn === mySymbol ? 'Your Turn' : `${opponentName}'s Turn`} ({currentTurn})
            </span>
          </div>
        ) : (
          <div className="animate-pop">
            <span className="inline-block px-5 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold text-lg">
              {winner === 'draw' ? "🤝 Match Drawn!" : winner === mySymbol ? "🎉 Victory! You Won!" : `🏆 ${opponentName} Won!`}
            </span>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="flex justify-center">
        <div className="arcade-cabinet p-5 sm:p-6 w-full max-w-sm">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 aspect-square">
            {board.map((cell, idx) => {
              const isWinCell = winningLine?.includes(idx);
              const isMyTurn = currentTurn === mySymbol && !winner && cell === null;

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={!isMyTurn || !opponentConnected}
                  className={`w-full aspect-square rounded-2xl flex items-center justify-center font-black text-4xl sm:text-5xl leading-none select-none transition-colors border-2
                    ${cell === null
                      ? isMyTurn
                        ? 'bg-slate-950/80 border-slate-700/80 hover:bg-slate-800/80 hover:border-amber-400/60 cursor-pointer'
                        : 'bg-slate-950/40 border-slate-800/60 cursor-not-allowed'
                      : cell === 'X'
                      ? 'text-sky-400 bg-sky-500/10 border-sky-400/60 shadow-inner'
                      : 'text-rose-400 bg-rose-500/10 border-rose-400/60 shadow-inner'
                    }
                    ${isWinCell ? 'ring-4 ring-amber-400 animate-pulse' : ''}
                  `}
                >
                  {cell && <span className="animate-pop leading-none">{cell}</span>}
                </button>
              );
            })}
          </div>

          {!opponentConnected && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 text-center flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for {opponentName} to establish signal...</span>
            </div>
          )}

          {winner && (
            <div className="mt-5 text-center">
              <button onClick={requestRematch} className="btn-primary w-full py-2.5">
                <RotateCcw className="h-4 w-4" /> Play Rematch
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <span>Direct 2-Player Versus link with real-time state synchronization.</span>
      </div>
    </div>
  );
}
