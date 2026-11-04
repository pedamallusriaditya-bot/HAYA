import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';
import FriendMatchStation from '@/components/FriendMatchStation';
import ArcadeDifficultySlider from '@/components/common/ArcadeDifficultySlider';
import BotMatchHeader from '@/components/bot/BotMatchHeader';
import { CONNECT4_DIFFICULTIES, type DifficultyTier } from '@/components/bot/botConfigs';
import {
  createEmptyBoard,
  cloneBoard,
  dropPiece,
  checkWinner,
  type Connect4Board as BoardType,
  type Connect4Piece,
  type WinningLine,
} from './engine';
import { getConnect4BotMove } from './ai';
import Connect4Board from './Connect4Board';

type GameMode = 'choose' | 'bot';

export default function Connect4Game() {
  const [mode, setMode] = useState<GameMode>('choose');
  const [selectedLevel, setSelectedLevel] = useState<number>(3); // Default Normal Level 3
  const [playerPiece, setPlayerPiece] = useState<Connect4Piece>('R');
  const botPiece: Connect4Piece = playerPiece === 'R' ? 'Y' : 'R';

  const [board, setBoard] = useState<BoardType>(createEmptyBoard);
  const [currentTurn, setCurrentTurn] = useState<Connect4Piece>('R');
  const [winner, setWinner] = useState<Connect4Piece | 'draw' | null>(null);
  const [winningLine, setWinningLine] = useState<WinningLine | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Scoreboard
  const [stats, setStats] = useState({ playerWins: 0, botWins: 0, draws: 0 });

  const currentTier: DifficultyTier =
    CONNECT4_DIFFICULTIES.find((d) => d.level === selectedLevel) || CONNECT4_DIFFICULTIES[2];

  const { submit } = useHighScore('connect4', currentTier.name);
  const { recordResult, resetSession } = useGameRecorder('connect4', currentTier.name);

  const resetGame = useCallback(
    (firstTurn: Connect4Piece = 'R', newPlayerPiece: Connect4Piece = playerPiece) => {
      resetSession();
      setBoard(createEmptyBoard());
      setWinner(null);
      setWinningLine(null);
      setCurrentTurn(firstTurn);
      setIsBotThinking(false);
      setPlayerPiece(newPlayerPiece);
      arcadeAudio.playCoin();
    },
    [playerPiece, resetSession]
  );

  const handleMakeMove = useCallback(
    (col: number, piece: Connect4Piece) => {
      setBoard((prev) => {
        const next = cloneBoard(prev);
        const row = dropPiece(next, col, piece);
        if (row === -1) return prev;

        const result = checkWinner(next);
        if (result.winner) {
          setWinner(result.winner);
          setWinningLine(result.winningLine);

          const isBotMode = mode === 'bot';
          const opponentType = isBotMode ? ('bot' as const) : ('human' as const);
          const opponentName = isBotMode ? currentTier.name : 'Pass & Play';
          const botDifficulty = isBotMode ? currentTier.name : null;

          if (result.winner === 'draw') {
            setStats((s) => ({ ...s, draws: s.draws + 1 }));
            void recordResult({
              result: 'draw',
              score: 0,
              mode: isBotMode ? 'bot' : 'single',
              opponentType,
              opponentName,
              botDifficulty,
            });
            arcadeAudio.playDraw();
          } else if (result.winner === playerPiece) {
            setStats((s) => ({ ...s, playerWins: s.playerWins + 1 }));
            submit(1);
            void recordResult({
              result: 'win',
              score: 1,
              mode: isBotMode ? 'bot' : 'single',
              opponentType,
              opponentName,
              botDifficulty,
            });
            arcadeAudio.playWin();
          } else {
            setStats((s) => ({ ...s, botWins: s.botWins + 1 }));
            void recordResult({
              result: 'loss',
              score: 0,
              mode: isBotMode ? 'bot' : 'single',
              opponentType,
              opponentName,
              botDifficulty,
            });
            arcadeAudio.playDraw();
          }
        }

        return next;
      });

      arcadeAudio.playMove(piece === 'R');
      setCurrentTurn(piece === 'R' ? 'Y' : 'R');
    },
    [playerPiece, submit, mode, currentTier.name, recordResult]
  );

  // Player column click
  const handleColumnClick = (col: number) => {
    if (winner !== null || currentTurn !== playerPiece || isBotThinking) {
      return;
    }
    handleMakeMove(col, playerPiece);
  };

  // Bot Turn Trigger
  useEffect(() => {
    if (mode !== 'bot') return;
    if (winner !== null) return;

    if (currentTurn === botPiece) {
      setIsBotThinking(true);
      let isSubscribed = true;

      getConnect4BotMove(board, botPiece, selectedLevel)
        .then((chosenCol) => {
          if (!isSubscribed) return;
          if (chosenCol !== -1) {
            handleMakeMove(chosenCol, botPiece);
          }
          setIsBotThinking(false);
        })
        .catch((err) => {
          console.error('[Connect4 Bot Error]:', err);
          if (isSubscribed) setIsBotThinking(false);
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [currentTurn, botPiece, board, selectedLevel, winner, mode, handleMakeMove]);

  const toggleSound = () => {
    const next = arcadeAudio.toggleSound();
    setSoundOn(next);
  };

  // Pre-game selection station
  if (mode === 'choose') {
    return (
      <div className="space-y-6">
        <FriendMatchStation
          gameId="connect4"
          onPlayBot={() => {
            resetGame('R', 'R');
            setMode('bot');
          }}
          botDifficultyComponent={
            <div className="space-y-4">
              <ArcadeDifficultySlider
                difficulties={CONNECT4_DIFFICULTIES}
                selectedId={selectedLevel}
                onSelect={(lvl) => setSelectedLevel(Number(lvl))}
                title="Connect Four Bot Difficulty"
              />

              {/* Player Piece Picker */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs uppercase font-bold text-slate-300 font-mono">
                  Select Your Color:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlayerPiece('R')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                      playerPiece === 'R'
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-rose-500 border border-white" />
                    Red (First)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerPiece('Y')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                      playerPiece === 'Y'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-amber-400 border border-slate-900" />
                    Yellow (Bot First)
                  </button>
                </div>
              </div>
            </div>
          }
        />
      </div>
    );
  }

  const isPlayerTurn = currentTurn === playerPiece;

  return (
    <div className="space-y-6 animate-in">
      {/* Top Station Header */}
      <BotMatchHeader
        tier={currentTier}
        isBotThinking={isBotThinking}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onExit={() => setMode('choose')}
        onRestart={() => resetGame('R', playerPiece)}
        statusText={
          winner === null
            ? isPlayerTurn
              ? `Your Turn (${playerPiece === 'R' ? 'Red' : 'Yellow'})`
              : 'Bot is calculating move...'
            : winner === 'draw'
            ? 'Match Drawn!'
            : winner === playerPiece
            ? '🎉 Victory! You beat the CPU!'
            : '🤖 CPU Wins!'
        }
        isGameOver={winner !== null}
      />

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-400/40 text-rose-300">
          <div className="text-[11px] font-semibold uppercase">
            You ({playerPiece === 'R' ? 'Red' : 'Yellow'})
          </div>
          <div className="text-2xl font-bold mt-0.5">{stats.playerWins}</div>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
          <div className="text-[11px] font-semibold uppercase">Ties</div>
          <div className="text-2xl font-bold mt-0.5">{stats.draws}</div>
        </div>
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/40 text-amber-300">
          <div className="text-[11px] font-semibold uppercase">
            Bot ({botPiece === 'R' ? 'Red' : 'Yellow'})
          </div>
          <div className="text-2xl font-bold mt-0.5">{stats.botWins}</div>
        </div>
      </div>

      {/* Turn & Status Indicator */}
      <div className="text-center">
        {winner === null ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isPlayerTurn
                  ? playerPiece === 'R'
                    ? 'bg-rose-500 animate-pulse'
                    : 'bg-amber-400 animate-pulse'
                  : 'bg-indigo-400'
              }`}
            />
            <span className="text-sm font-semibold text-slate-200">
              {isPlayerTurn
                ? `Your Turn (${playerPiece === 'R' ? 'Red' : 'Yellow'})`
                : isBotThinking
                ? 'Bot is calculating move...'
                : `Bot's Turn (${botPiece === 'R' ? 'Red' : 'Yellow'})`}
            </span>
          </div>
        ) : (
          <div className="animate-pop space-y-3">
            <span
              className={`inline-block px-5 py-2 rounded-2xl font-bold text-lg border ${
                winner === 'draw'
                  ? 'bg-slate-800 text-slate-300 border-slate-600'
                  : winner === playerPiece
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
                  : 'bg-rose-500/20 text-rose-300 border-rose-400/50'
              }`}
            >
              {winner === 'draw'
                ? '🤝 Match Drawn! Grid is full'
                : winner === playerPiece
                ? '🎉 Connect Four! You won!'
                : '🤖 Bot connected four! Rematch?'}
            </span>

            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => resetGame('R', playerPiece)}
                className="btn-primary py-2 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7x6 Connect Four Board */}
      <Connect4Board
        board={board}
        onColumnClick={handleColumnClick}
        winningLine={winningLine}
        currentTurn={currentTurn}
        disabled={winner !== null || !isPlayerTurn || isBotThinking}
      />

      <div className="max-w-md mx-auto text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
        <span>Connect Four AI uses Alpha-Beta minimax and column-ordered search.</span>
      </div>
    </div>
  );
}
