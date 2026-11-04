import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Bot, Trophy, Volume2, VolumeX, Sparkles, ArrowLeft } from 'lucide-react';
import { createEmptyBoard, checkWinner, type Board, type Player } from './engine';
import { getBotMove, type BotDifficulty } from './ai';
import { arcadeAudio } from '@/lib/arcadeAudio';
import OnlineRoom from './OnlineRoom';
import FriendMatchStation from '@/components/FriendMatchStation';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { useGameRecorder } from '@/lib/useGameRecorder';
import ArcadeDifficultySlider from '@/components/common/ArcadeDifficultySlider';
import { TICTACTOE_DIFFICULTIES } from '@/components/bot/botConfigs';
import { useAuth } from '@/auth/AuthContext';
import PlayerAvatar from '@/components/avatar/PlayerAvatar';
import { getCachedAvatar } from '@/lib/avatarStorage';

type GameMode = 'choose' | 'bot';

export default function TicTacToeGame() {
  const { profile } = useAuth();
  const rawName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
  const playerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const playerAvatar = getCachedAvatar(profile?.email || '', playerName);

  const { activeMatch, exitActiveMatch } = useMultiplayer();
  const [mode, setMode] = useState<GameMode>('choose');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('hard');
  const [playerSymbol, setPlayerSymbol] = useState<Player>('X');
  const botSymbol: Player = playerSymbol === 'X' ? 'O' : 'X';

  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [currentTurn, setCurrentTurn] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [winningLine, setWinningLine] = useState<[number, number, number] | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // Match stats
  const [stats, setStats] = useState({ playerWins: 0, botWins: 0, draws: 0 });
  const { recordResult, resetSession } = useGameRecorder('tictactoe', difficulty);

  const resetGame = useCallback((firstTurn: Player = 'X') => {
    resetSession();
    setBoard(createEmptyBoard());
    setWinner(null);
    setWinningLine(null);
    setCurrentTurn(firstTurn);
    setIsBotThinking(false);
    arcadeAudio.playCoin();
  }, [resetSession]);

  const makeMove = useCallback((index: number, symbol: Player) => {
    setBoard((prev) => {
      const next = [...prev];
      next[index] = symbol;
      const result = checkWinner(next);

      if (result.winner) {
        setWinner(result.winner);
        setWinningLine(result.winningLine);

        const isBotMode = mode === 'bot';
        const opponentType = isBotMode ? ('bot' as const) : ('human' as const);
        const opponentName = isBotMode ? `Bot (${difficulty})` : 'Pass & Play';
        const botDifficulty = isBotMode ? difficulty : null;

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
        } else if (result.winner === playerSymbol) {
          setStats((s) => ({ ...s, playerWins: s.playerWins + 1 }));
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

    arcadeAudio.playMove(symbol === 'X');
    setCurrentTurn(symbol === 'X' ? 'O' : 'X');
  }, [playerSymbol, mode, difficulty, recordResult]);

  // Handle Player Click
  const handleCellClick = (index: number) => {
    if (board[index] !== null || winner !== null || currentTurn !== playerSymbol || isBotThinking) {
      return;
    }
    makeMove(index, playerSymbol);
  };

  // Bot Turn Trigger
  useEffect(() => {
    if (mode !== 'bot') return;
    if (winner !== null) return;

    if (currentTurn === botSymbol) {
      setIsBotThinking(true);
      const timer = setTimeout(() => {
        const botMove = getBotMove(board, botSymbol, difficulty);
        if (botMove !== -1) {
          makeMove(botMove, botSymbol);
        }
        setIsBotThinking(false);
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [currentTurn, botSymbol, board, difficulty, winner, mode, makeMove]);

  const toggleMute = () => {
    const next = arcadeAudio.toggleSound();
    setSoundOn(next);
  };

  // If there is an active direct online match for Tic-Tac-Toe
  if (activeMatch && activeMatch.gameId === 'tictactoe') {
    return (
      <OnlineRoom
        matchId={activeMatch.matchId}
        role={activeMatch.role}
        opponentName={activeMatch.opponentName}
        onExit={() => {
          exitActiveMatch();
          setMode('choose');
        }}
      />
    );
  }

  // Pre-game selection station (Friend Presence & Bot Choice)
  if (mode === 'choose') {
    return (
      <FriendMatchStation
        gameId="tictactoe"
        onPlayBot={() => {
          resetGame('X');
          setMode('bot');
        }}
        botDifficultyComponent={
          <div className="space-y-4">
            <ArcadeDifficultySlider
              difficulties={TICTACTOE_DIFFICULTIES}
              selectedId={difficulty}
              onSelect={(d) => setDifficulty(d as BotDifficulty)}
              title="Tic-Tac-Toe AI Difficulty"
            />
          </div>
        }
      />
    );
  }

  // Active Bot Match Screen
  return (
    <div className="space-y-6 animate-in">
      {/* Top Station Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => setMode('choose')}
          className="btn-ghost !py-1.5 !px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Lobby Station
        </button>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="px-3 py-1 text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" /> CPU Battle Active
          </div>
        </div>

        {/* Audio and Status Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="btn-ghost !p-2"
            title={soundOn ? 'Mute arcade audio' : 'Unmute audio'}
          >
            {soundOn ? <Volume2 className="h-4 w-4 text-amber-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>

          <span className="token-badge">
            <Sparkles className="h-3 w-3" />
            1 COIN · ACTIVE
          </span>
        </div>
      </div>

      {/* Difficulty and Symbol Controls */}
      {/* Difficulty & Symbol Selection Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider mr-1">AI:</span>
          {(['easy', 'medium', 'hard'] as BotDifficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDifficulty(d);
                resetGame(currentTurn);
              }}
              className={`btn !min-h-[36px] !py-1 !px-2.5 text-xs capitalize font-semibold rounded-xl transition flex-1 sm:flex-none ${
                difficulty === d
                  ? d === 'hard'
                    ? 'bg-rose-500 text-white font-bold'
                    : d === 'medium'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-emerald-500 text-slate-950 font-bold'
                  : 'btn-ghost'
              }`}
            >
              {d === 'hard' ? 'Master' : d === 'medium' ? 'Veteran' : 'Rookie'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Play as:</span>
          <button
            onClick={() => {
              setPlayerSymbol('X');
              resetGame('X');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition min-h-[36px] ${
              playerSymbol === 'X' ? 'bg-sky-500/20 border-sky-400 text-sky-300' : 'border-slate-700 text-slate-400'
            }`}
          >
            X (First)
          </button>
          <button
            onClick={() => {
              setPlayerSymbol('O');
              resetGame('X');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition min-h-[36px] ${
              playerSymbol === 'O' ? 'bg-rose-500/20 border-rose-400 text-rose-300' : 'border-slate-700 text-slate-400'
            }`}
          >
            O (Bot First)
          </button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-md mx-auto text-center font-mono items-center">
        <div className="p-2 sm:p-2.5 rounded-2xl bg-sky-500/10 border border-sky-400/40 text-sky-300 flex items-center justify-between px-3">
          <div className="flex items-center gap-1.5 text-left">
            <PlayerAvatar config={playerAvatar} name={playerName} size="xs" />
            <div>
              <div className="text-[10px] font-semibold uppercase truncate max-w-[65px]">{playerName}</div>
              <div className="text-[9px] text-sky-400/70 font-sans">({playerSymbol})</div>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold">{stats.playerWins}</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
          <div className="text-[10px] sm:text-xs font-semibold uppercase">Ties</div>
          <div className="text-xl sm:text-2xl font-bold mt-0.5">{stats.draws}</div>
        </div>
        <div className="p-2 sm:p-2.5 rounded-2xl bg-rose-500/10 border border-rose-400/40 text-rose-300 flex items-center justify-between px-3">
          <div className="text-xl sm:text-2xl font-bold">{stats.botWins}</div>
          <div className="flex items-center gap-1.5 text-right flex-row-reverse">
            <PlayerAvatar isBot size="xs" />
            <div>
              <div className="text-[10px] font-semibold uppercase">Bot</div>
              <div className="text-[9px] text-rose-400/70 font-sans">({botSymbol})</div>
            </div>
          </div>
        </div>
      </div>

      {/* Turn & Status Indicator */}
      <div className="text-center">
        {winner === null ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                currentTurn === playerSymbol ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs sm:text-sm font-semibold">
              {currentTurn === playerSymbol
                ? `Your Turn (${playerSymbol})`
                : isBotThinking
                ? 'Bot is calculating move...'
                : `Bot's Turn (${botSymbol})`}
            </span>
          </div>
        ) : (
          <div className="animate-pop">
            <span
              className={`inline-block px-4 py-2 rounded-2xl font-bold text-base sm:text-lg border ${
                winner === 'draw'
                  ? 'bg-slate-800 text-slate-300 border-slate-600'
                  : winner === playerSymbol
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-lg shadow-amber-500/20'
                  : 'bg-rose-500/20 text-rose-300 border-rose-400/50'
              }`}
            >
              {winner === 'draw'
                ? '🤝 Match Drawn!'
                : winner === playerSymbol
                ? '🎉 Victory! You beat the CPU!'
                : '🤖 Bot Wins! Rematch?'}
            </span>
          </div>
        )}
      </div>

      {/* 3x3 Playable Arcade Board */}
      <div className="flex justify-center">
        <div className="arcade-cabinet p-3.5 sm:p-6 w-full max-w-[min(100%,360px)]">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 aspect-square">
            {board.map((cell, idx) => {
              const isWinCell = winningLine?.includes(idx);
              const isClickable = cell === null && winner === null && currentTurn === playerSymbol && !isBotThinking;

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={!isClickable}
                  aria-label={`Cell ${idx + 1}, ${cell || 'empty'}`}
                  className={`w-full aspect-square rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-3xl xs:text-4xl sm:text-5xl leading-none select-none transition-colors border-2
                    ${cell === null
                      ? isClickable
                        ? 'bg-slate-950/80 border-slate-700/80 hover:bg-slate-800/80 hover:border-amber-400/60 cursor-pointer active:scale-95'
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

          {/* Quick Rematch Action */}
          <div className="mt-4 sm:mt-5 flex gap-3">
            <button
              onClick={() => resetGame('X')}
              className="btn-primary w-full py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{winner ? 'Play Again' : 'Reset Board'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Arcade Rules / High Score Note */}
      <div className="max-w-md mx-auto text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
        <span>Master AI uses unbeatable Minimax graph search. Test your wits!</span>
      </div>
    </div>
  );
}
