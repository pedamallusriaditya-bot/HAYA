import { useState, useCallback, useRef } from 'react';
import { RotateCcw, ArrowLeft, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { recordGameResult } from '@/lib/gameRecordsService';
import { useOnlineMatchChannel } from '@/games/shared/useOnlineMatchChannel';
import DiceWidget from '@/games/ludo/DiceWidget';
import SnakesBoard from './SnakesBoard';
import {
  createInitialOnlineState,
  applyOnlineRoll,
  type SnakesOnlineState,
  type SnakesPlayerIndex,
} from './onlineEngine.ts';

type OnlineRoomProps = {
  matchId: string;
  role: 'host' | 'guest';
  opponentName: string;
  onExit: () => void;
};

type MovePayload = {
  roll: number;
};

type StateSnapshot = {
  positions: [number, number];
  currentTurn: SnakesPlayerIndex;
  seq: number;
  winner: SnakesPlayerIndex | null;
  lastRoll: number | null;
  lastJump: { from: number; to: number; type: 'ladder' | 'snake' } | null;
};

export default function OnlineRoom({ matchId, role, opponentName, onExit }: OnlineRoomProps) {
  const { profile } = useAuth();
  const { exitActiveMatch } = useMultiplayer();
  const myName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';

  // Role: Host is Player 0, Guest is Player 1
  const myIndex: SnakesPlayerIndex = role === 'host' ? 0 : 1;
  const opponentIndex: SnakesPlayerIndex = role === 'host' ? 1 : 0;

  const roundRef = useRef(0);
  const recordedRoundsRef = useRef<Set<number>>(new Set());

  const [gameState, setGameState] = useState<SnakesOnlineState>(() =>
    createInitialOnlineState(0)
  );
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [score, setScore] = useState({ me: 0, opponent: 0 });
  const [isRolling, setIsRolling] = useState(false);
  const [eventLogs, setEventLogs] = useState<string[]>([
    'Connected to online match! Host rolls first.',
  ]);

  const addLog = (msg: string) => {
    setEventLogs((prev) => [msg, ...prev.slice(0, 4)]);
  };

  const recordResultOnce = useCallback(
    (winner: SnakesPlayerIndex | null) => {
      const currentRound = roundRef.current;
      if (recordedRoundsRef.current.has(currentRound)) return;
      recordedRoundsRef.current.add(currentRound);

      if (!profile?.id || winner === null) return;
      const isWinner = winner === myIndex;

      void recordGameResult({
        user_id: profile.id,
        game: 'snakes',
        mode: 'multi',
        result: isWinner ? 'win' : 'loss',
        score: gameStateRef.current.positions[myIndex],
        opponent_type: 'human',
        opponent_name: opponentName,
        match_id: `${matchId}_rnd_${currentRound}`,
      });
    },
    [profile?.id, myIndex, opponentName, matchId]
  );

  const {
    connecting,
    opponentConnected,
    error,
    channel,
    sendMove,
    sendRematch,
    sendExit,
  } = useOnlineMatchChannel<MovePayload, StateSnapshot>({
    matchId,
    gameId: 'snakes',
    role,
    onMove: (payload, seq) => {
      const { roll } = payload;
      const result = applyOnlineRoll(gameStateRef.current, opponentIndex, roll, seq);
      if (!result.success) return;

      const next = result.nextState;
      setGameState(next);

      if (result.moveRes.jumpType === 'ladder') {
        arcadeAudio.playDraw();
        addLog(`🚀 ${opponentName} climbed a ladder to ${result.moveRes.finalSquare}!`);
      } else if (result.moveRes.jumpType === 'snake') {
        arcadeAudio.playWin();
        addLog(`🐍 ${opponentName} slid down a snake to ${result.moveRes.finalSquare}!`);
      } else if (result.moveRes.givesExtraTurn) {
        arcadeAudio.playBlip();
        addLog(`🎲 ${opponentName} rolled a 6! Extra turn.`);
      } else {
        arcadeAudio.playMove(false);
        addLog(`🎲 ${opponentName} rolled ${roll} and moved to ${result.moveRes.finalSquare}.`);
      }

      if (next.winner !== null) {
        if (next.winner === myIndex) {
          setScore((s) => ({ ...s, me: s.me + 1 }));
          arcadeAudio.playWin();
        } else {
          setScore((s) => ({ ...s, opponent: s.opponent + 1 }));
          arcadeAudio.playDraw();
        }
        recordResultOnce(next.winner);
      }
    },
    onState: (snapshot, seq) => {
      setGameState({
        positions: snapshot.positions,
        currentTurn: snapshot.currentTurn,
        lastAppliedSeq: seq,
        winner: snapshot.winner,
        lastRoll: snapshot.lastRoll,
        lastJump: snapshot.lastJump,
      });
    },
    onRematch: () => {
      roundRef.current += 1;
      const nextFirst: SnakesPlayerIndex = roundRef.current % 2 === 0 ? 0 : 1;
      setGameState(createInitialOnlineState(nextFirst));
      setEventLogs([`Rematch started! Round ${roundRef.current + 1}.`]);
      arcadeAudio.playCoin();
    },
    onExit: () => {
      alert(`${opponentName} left the match.`);
      exitActiveMatch();
      onExit();
    },
    getCurrentState: () => ({
      positions: gameStateRef.current.positions,
      currentTurn: gameStateRef.current.currentTurn,
      seq: gameStateRef.current.lastAppliedSeq,
      winner: gameStateRef.current.winner,
      lastRoll: gameStateRef.current.lastRoll,
      lastJump: gameStateRef.current.lastJump,
    }),
  });

  const handleRollDice = () => {
    if (
      !channel ||
      gameState.winner !== null ||
      gameState.currentTurn !== myIndex ||
      isRolling
    ) {
      return;
    }

    setIsRolling(true);
    arcadeAudio.playBlip();

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setIsRolling(false);

      const currentSeq = (gameStateRef.current.lastAppliedSeq || 0) + 1;
      const result = applyOnlineRoll(gameStateRef.current, myIndex, roll, currentSeq);
      if (!result.success) return;

      const next = result.nextState;
      setGameState(next);
      sendMove({ roll });

      if (result.moveRes.jumpType === 'ladder') {
        arcadeAudio.playWin();
        addLog(`🚀 You rolled ${roll} and zoomed up a ladder to ${result.moveRes.finalSquare}!`);
      } else if (result.moveRes.jumpType === 'snake') {
        arcadeAudio.playDraw();
        addLog(`🐍 You rolled ${roll} and slid down a snake to ${result.moveRes.finalSquare}!`);
      } else if (result.moveRes.givesExtraTurn) {
        arcadeAudio.playBlip();
        addLog(`⭐ You rolled a 6! Extra turn!`);
      } else {
        arcadeAudio.playMove(true);
        addLog(`🎲 You rolled ${roll} and moved to square ${result.moveRes.finalSquare}.`);
      }

      if (next.winner !== null) {
        if (next.winner === myIndex) {
          setScore((s) => ({ ...s, me: s.me + 1 }));
          arcadeAudio.playWin();
        } else {
          setScore((s) => ({ ...s, opponent: s.opponent + 1 }));
          arcadeAudio.playDraw();
        }
        recordResultOnce(next.winner);
      }
    }, 500);
  };

  const handleRequestRematch = () => {
    if (!channel) return;
    roundRef.current += 1;
    const nextFirst: SnakesPlayerIndex = roundRef.current % 2 === 0 ? 0 : 1;
    setGameState(createInitialOnlineState(nextFirst));
    sendRematch();
    setEventLogs([`Rematch started! Round ${roundRef.current + 1}.`]);
    arcadeAudio.playCoin();
  };

  const handleManualExit = () => {
    sendExit();
    exitActiveMatch();
    onExit();
  };

  const isMyTurn = gameState.currentTurn === myIndex;
  const isGameOver = gameState.winner !== null;

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <button
          onClick={handleManualExit}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Leave Match
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {connecting ? (
              <span className="flex items-center gap-1 text-amber-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting...
              </span>
            ) : opponentConnected ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Wifi className="w-3.5 h-3.5" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500">
                <WifiOff className="w-3.5 h-3.5" /> Waiting for {opponentName}...
              </span>
            )}
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
            {role === 'host' ? 'Host (P1 Sky)' : 'Guest (P2 Rose)'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          {error}
        </div>
      )}

      {/* Match Score & Status Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
        <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-300">
          <div className="text-[10px] uppercase font-bold text-sky-400">
            {role === 'host' ? 'You (P1)' : `${opponentName} (P1)`}
          </div>
          <div className="text-xl font-bold mt-0.5">
            {gameState.positions[0]}/100
          </div>
        </div>

        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-300">
          <div className="text-[10px] uppercase font-bold text-rose-400">
            {role === 'guest' ? 'You (P2)' : `${opponentName} (P2)`}
          </div>
          <div className="text-xl font-bold mt-0.5">
            {gameState.positions[1]}/100
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">Your Score</div>
          <div className="text-xl font-bold mt-0.5 text-amber-400">{score.me}</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">Opponent Score</div>
          <div className="text-xl font-bold mt-0.5 text-slate-400">{score.opponent}</div>
        </div>
      </div>

      {/* Status Alert */}
      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center font-mono text-sm">
        {isGameOver ? (
          <div className="text-amber-400 font-bold">
            {gameState.winner === myIndex
              ? '🎉 Victory! You reached square 100!'
              : `👑 ${opponentName} reached square 100 and won!`}
          </div>
        ) : isMyTurn ? (
          <div className="text-emerald-400 font-semibold animate-pulse">
            👉 It is your turn! Roll the dice!
          </div>
        ) : (
          <div className="text-slate-400">
            Waiting for {opponentName} to roll...
          </div>
        )}
      </div>

      {/* Board */}
      <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-2xl flex flex-col items-center">
        <SnakesBoard
          playerSquare={gameState.positions[0]}
          botSquare={gameState.positions[1]}
          lastJump={gameState.lastJump}
          activeTurn={gameState.currentTurn === 0 ? 'player' : 'bot'}
          playerLabel={role === 'host' ? 'YOU' : opponentName.slice(0, 3).toUpperCase()}
          botLabel={role === 'guest' ? 'YOU' : opponentName.slice(0, 3).toUpperCase()}
          p1Tag={role === 'host' ? `${myName} (You)` : `${opponentName} (Host)`}
          p2Tag={role === 'guest' ? `${myName} (You)` : `${opponentName} (Guest)`}
        />

        {/* Dice Controller */}
        <div className="mt-4 flex flex-col items-center gap-3">
          <DiceWidget
            diceValue={gameState.lastRoll}
            isRolling={isRolling}
            onRoll={handleRollDice}
            canRoll={isMyTurn && !isGameOver && !isRolling && opponentConnected}
            isBotRolling={!isMyTurn && !isGameOver && opponentConnected}
            extraTurn={false}
          />

          <p className="text-[11px] font-mono text-slate-400">
            {isGameOver
              ? 'Match ended'
              : !opponentConnected
              ? 'Waiting for opponent...'
              : isMyTurn
              ? 'Click the dice to roll'
              : `${opponentName}'s turn`}
          </p>
        </div>
      </div>

      {/* Event Logs & Rematch */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs font-mono">
        <div className="space-y-1 text-slate-400 text-left w-full sm:w-auto">
          {eventLogs.map((log, i) => (
            <div key={i} className={i === 0 ? 'text-slate-200 font-medium' : 'opacity-70'}>
              {log}
            </div>
          ))}
        </div>

        {isGameOver && (
          <button
            onClick={handleRequestRematch}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Rematch
          </button>
        )}
      </div>
    </div>
  );
}
