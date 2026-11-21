import { useState, useCallback, useRef } from 'react';
import { RotateCcw, ArrowLeft, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { recordGameResult } from '@/lib/gameRecordsService';
import { useOnlineMatchChannel } from '@/games/shared/useOnlineMatchChannel';
import { useGameChat } from '@/games/shared/useGameChat';
import GameChat from '@/components/GameChat';
import GameReactions from '@/components/GameReactions';
import Connect4Board from './Connect4Board';
import type { Connect4Piece, Connect4Board as BoardType, WinningLine } from './engine';
import {
  createInitialOnlineState,
  applyOnlineMove,
  type Connect4OnlineState,
} from './onlineEngine';

type OnlineRoomProps = {
  matchId: string;
  role: 'host' | 'guest';
  opponentName: string;
  onExit: () => void;
};

type MovePayload = {
  col: number;
};

type StateSnapshot = {
  board: BoardType;
  currentTurn: Connect4Piece;
  seq: number;
  winner: Connect4Piece | 'draw' | null;
  winningLine: WinningLine | null;
};

export default function OnlineRoom({ matchId, role, opponentName, onExit }: OnlineRoomProps) {
  const { profile } = useAuth();
  const { exitActiveMatch } = useMultiplayer();
  const myName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';

  // Role: Host is Red ('R'), Guest is Yellow ('Y')
  const myPiece: Connect4Piece = role === 'host' ? 'R' : 'Y';
  const opponentPiece: Connect4Piece = role === 'host' ? 'Y' : 'R';

  // Round tracking (for rematch swapped first mover & unique match recording)
  const roundRef = useRef(1);
  const firstMoverForRound = (round: number): Connect4Piece => (round % 2 === 1 ? 'R' : 'Y');

  const [gameState, setGameState] = useState<Connect4OnlineState>(() =>
    createInitialOnlineState(firstMoverForRound(1))
  );
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [score, setScore] = useState({ me: 0, opponent: 0, draws: 0 });

  const chat = useGameChat();

  const recordResultOnce = useCallback(
    (winner: Connect4Piece | 'draw') => {
      if (!profile?.id) return;
      const isWinner = winner === myPiece;
      const isDraw = winner === 'draw';

      void recordGameResult({
        user_id: profile.id,
        game: 'connect4',
        mode: 'multi',
        result: isDraw ? 'draw' : isWinner ? 'win' : 'loss',
        score: isWinner ? 1 : 0,
        opponent_type: 'human',
        opponent_name: opponentName,
        match_id: `${matchId}_rnd_${roundRef.current}`,
      });
    },
    [profile?.id, myPiece, opponentName, matchId]
  );

  const {
    connecting,
    opponentConnected,
    error,
    channel,
    sendMove,
    sendRematch,
    sendExit,
    sendChat,
    sendReaction,
  } = useOnlineMatchChannel<MovePayload, StateSnapshot>({
    matchId,
    gameId: 'connect4',
    role,
    onChat: (msg) => chat.addMessage(msg),
    onReaction: (rx) => chat.addReaction(rx),
    onMove: (payload, seq) => {
      const { col } = payload;
      const result = applyOnlineMove(gameStateRef.current, col, opponentPiece, seq);
      if (!result.success) return;

      setGameState(result.nextState);
      arcadeAudio.playMove(false);

      if (result.winnerResult.winner) {
        if (result.winnerResult.winner === 'draw') {
          setScore((s) => ({ ...s, draws: s.draws + 1 }));
          arcadeAudio.playDraw();
        } else if (result.winnerResult.winner === myPiece) {
          setScore((s) => ({ ...s, me: s.me + 1 }));
          arcadeAudio.playWin();
        } else {
          setScore((s) => ({ ...s, opponent: s.opponent + 1 }));
          arcadeAudio.playDraw();
        }
        recordResultOnce(result.winnerResult.winner);
      }
    },
    onState: (snapshot, seq) => {
      setGameState({
        board: snapshot.board,
        currentTurn: snapshot.currentTurn,
        lastAppliedSeq: seq,
        winner: snapshot.winner,
        winningLine: snapshot.winningLine,
      });
    },
    onRematch: () => {
      roundRef.current += 1;
      const nextFirst = firstMoverForRound(roundRef.current);
      setGameState(createInitialOnlineState(nextFirst));
      arcadeAudio.playCoin();
    },
    onExit: () => {
      chat.clear();
      alert(`${opponentName} left the match.`);
      exitActiveMatch();
      onExit();
    },
    getCurrentState: () => ({
      board: gameStateRef.current.board,
      currentTurn: gameStateRef.current.currentTurn,
      seq: gameStateRef.current.lastAppliedSeq,
      winner: gameStateRef.current.winner,
      winningLine: gameStateRef.current.winningLine,
    }),
  });

  const handleColumnClick = (col: number) => {
    if (!channel || gameState.winner !== null || gameState.currentTurn !== myPiece) {
      return;
    }

    const currentSeq = gameState.lastAppliedSeq + 1;
    const result = applyOnlineMove(gameState, col, myPiece, currentSeq);
    if (!result.success) return;

    setGameState(result.nextState);
    arcadeAudio.playMove(true);

    sendMove({ col });

    if (result.winnerResult.winner) {
      if (result.winnerResult.winner === 'draw') {
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
        arcadeAudio.playDraw();
      } else if (result.winnerResult.winner === myPiece) {
        setScore((s) => ({ ...s, me: s.me + 1 }));
        arcadeAudio.playWin();
      } else {
        setScore((s) => ({ ...s, opponent: s.opponent + 1 }));
        arcadeAudio.playDraw();
      }
      recordResultOnce(result.winnerResult.winner);
    }
  };

  const handleRequestRematch = () => {
    if (!channel) return;
    roundRef.current += 1;
    const nextFirst = firstMoverForRound(roundRef.current);
    setGameState(createInitialOnlineState(nextFirst));
    sendRematch();
    arcadeAudio.playCoin();
  };

  const handleLeaveMatch = useCallback(() => {
    sendExit();
    exitActiveMatch();
    onExit();
  }, [sendExit, exitActiveMatch, onExit]);

  if (connecting) {
    return (
      <div className="arcade-cabinet p-12 text-center space-y-4 max-w-md mx-auto">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto" />
        <h3 className="font-bold text-slate-100 text-lg">Linking Match Stations...</h3>
        <p className="text-xs text-slate-400">Connecting you and {opponentName} directly.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="arcade-cabinet p-8 text-center space-y-4 border-rose-500/40 max-w-md mx-auto">
        <div className="text-rose-400 font-bold">{error}</div>
        <button onClick={handleLeaveMatch} className="btn-primary">
          Return to Lobby
        </button>
      </div>
    );
  }

  const isMyTurn = gameState.currentTurn === myPiece && gameState.winner === null;

  return (
    <div className="space-y-6 animate-in">
      {/* Top Station Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-md mx-auto">
        <button onClick={handleLeaveMatch} className="btn-ghost !py-1.5 !px-3">
          <ArrowLeft className="h-4 w-4" /> Leave Match
        </button>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full border ${
              opponentConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            {opponentConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span>{opponentConnected ? `Linked with ${opponentName}` : `Waiting for ${opponentName}...`}</span>
          </div>
        </div>
      </div>

      {/* Arena Scoreboard */}
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
        <div
          className={`p-3 rounded-2xl border ${
            myPiece === 'R'
              ? 'bg-rose-500/10 border-rose-400/40 text-rose-300'
              : 'bg-amber-500/10 border-amber-400/40 text-amber-300'
          }`}
        >
          <div className="text-xs font-semibold uppercase">{myName} ({myPiece === 'R' ? 'Red' : 'Yellow'})</div>
          <div className="text-2xl font-bold mt-0.5">{score.me}</div>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
          <div className="text-xs font-semibold uppercase">Ties</div>
          <div className="text-2xl font-bold mt-0.5">{score.draws}</div>
        </div>
        <div
          className={`p-3 rounded-2xl border ${
            opponentPiece === 'R'
              ? 'bg-rose-500/10 border-rose-400/40 text-rose-300'
              : 'bg-amber-500/10 border-amber-400/40 text-amber-300'
          }`}
        >
          <div className="text-xs font-semibold uppercase">{opponentName} ({opponentPiece === 'R' ? 'Red' : 'Yellow'})</div>
          <div className="text-2xl font-bold mt-0.5">{score.opponent}</div>
        </div>
      </div>

      {/* Status Banner */}
      <div className="text-center">
        {gameState.winner ? (
          <div className="inline-block p-3 px-6 rounded-2xl bg-slate-900/90 border border-amber-400/40 animate-pop">
            <span className="font-bold text-amber-300">
              {gameState.winner === 'draw'
                ? "It's a Draw!"
                : gameState.winner === myPiece
                ? '🎉 Victory! You won!'
                : `${opponentName} Won!`}
            </span>
          </div>
        ) : (
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
            {isMyTurn ? (
              <span className="text-emerald-400 font-bold animate-pulse">Your Turn: Drop a piece</span>
            ) : (
              <span>{opponentName}&apos;s Turn...</span>
            )}
          </div>
        )}
      </div>

      {/* Main Connect 4 Board */}
      <Connect4Board
        board={gameState.board}
        onColumnClick={handleColumnClick}
        winningLine={gameState.winningLine}
        currentTurn={gameState.currentTurn}
        disabled={!isMyTurn}
      />

      {/* Rematch Button */}
      {gameState.winner && (
        <div className="flex justify-center">
          <button onClick={handleRequestRematch} className="btn-primary flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Rematch
          </button>
        </div>
      )}

      <GameChat
        messages={chat.messages}
        unread={chat.unread}
        open={chat.open}
        setOpen={chat.setOpen}
        muted={chat.muted}
        setMuted={chat.setMuted}
        onSendChat={(text) => {
          const msg = sendChat(text);
          if (msg) chat.addMessage(msg, true);
          return msg;
        }}
        myDisplayName={myName}
        opponentName={opponentName}
      />
      <GameReactions
        floatingReactions={chat.floatingReactions}
        onSendReaction={(rxId) => {
          const rx = sendReaction(rxId);
          if (rx) chat.addReaction(rx, true);
          return rx;
        }}
        onRemoveReaction={chat.removeReaction}
        muted={chat.muted}
        myDisplayName={myName}
        opponentName={opponentName}
      />
    </div>
  );
}
