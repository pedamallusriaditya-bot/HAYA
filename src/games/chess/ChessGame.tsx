import React, { useState, useEffect, useCallback } from 'react';
import { Chess, type Square, type Move, type PieceSymbol } from 'chess.js';
import { RotateCcw, Flag, History, ShieldAlert } from 'lucide-react';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';
import FriendMatchStation from '@/components/FriendMatchStation';
import ArcadeDifficultySlider from '@/components/common/ArcadeDifficultySlider';
import BotMatchHeader from '@/components/bot/BotMatchHeader';
import { CHESS_DIFFICULTIES, type DifficultyTier } from '@/components/bot/botConfigs';
import ChessBoard from './ChessBoard';
import ChessPiece from './ChessPieces';
import PromotionModal from './PromotionModal';
import { useAuth } from '@/auth/AuthContext';
import PlayerAvatar from '@/components/avatar/PlayerAvatar';
import { getCachedAvatar } from '@/lib/avatarStorage';
import {
  createChessGame,
  getGameStatus,
  getCapturedPieces,
  calculateMaterialAdvantage,
  type CapturedPieces,
  type GameStatus,
} from './engine';
import { getBotChessMove } from './ai';

type GameMode = 'choose' | 'bot';

export default function ChessGame() {
  const { profile } = useAuth();
  const rawName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
  const playerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const playerAvatar = getCachedAvatar(profile?.email || '', playerName);

  const [mode, setMode] = useState<GameMode>('choose');
  const [selectedLevel, setSelectedLevel] = useState<number>(3); // Default Casual Level 3
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const botColor: 'w' | 'b' = playerColor === 'w' ? 'b' : 'w';

  // Game state
  const [chess] = useState<Chess>(() => createChessGame());
  const [fen, setFen] = useState<string>(() => chess.fen());
  const [status, setStatus] = useState<GameStatus>(() => getGameStatus(chess));
  const [captured, setCaptured] = useState<CapturedPieces>(() => getCapturedPieces(chess));
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Scoreboard
  const [stats, setStats] = useState({ playerWins: 0, botWins: 0, draws: 0 });

  const currentTier: DifficultyTier =
    CHESS_DIFFICULTIES.find((d) => d.level === selectedLevel) || CHESS_DIFFICULTIES[2];

  const { submit } = useHighScore('chess', currentTier.name);
  const { recordResult, resetSession } = useGameRecorder('chess', currentTier.name);

  const resetGame = useCallback(
    (newPlayerColor: 'w' | 'b' = playerColor) => {
      resetSession();
      chess.reset();
      setFen(chess.fen());
      setStatus(getGameStatus(chess));
      setCaptured(getCapturedPieces(chess));
      setMoveHistory([]);
      setSelectedSquare(null);
      setLegalMoves([]);
      setLastMove(null);
      setIsBotThinking(false);
      setPendingPromotion(null);
      setPlayerColor(newPlayerColor);
      arcadeAudio.playCoin();
    },
    [chess, playerColor, resetSession]
  );

  const applyMove = useCallback(
    (moveArgs: { from: string; to: string; promotion?: string }) => {
      try {
        const result = chess.move(moveArgs);
        if (result) {
          setFen(chess.fen());
          const newStatus = getGameStatus(chess);
          setStatus(newStatus);
          setCaptured(getCapturedPieces(chess));
          setMoveHistory(chess.history());
          setLastMove({ from: moveArgs.from, to: moveArgs.to });
          setSelectedSquare(null);
          setLegalMoves([]);

          // Sound effects
          if (newStatus.isCheckmate) {
            if (newStatus.winner === playerColor) {
              setStats((s) => ({ ...s, playerWins: s.playerWins + 1 }));
              submit(1);
              void recordResult({
                result: 'win',
                score: 1,
                opponentType: 'bot',
                opponentName: currentTier.name,
                botDifficulty: currentTier.name,
              });
              arcadeAudio.playWin();
            } else {
              setStats((s) => ({ ...s, botWins: s.botWins + 1 }));
              void recordResult({
                result: 'loss',
                score: 0,
                opponentType: 'bot',
                opponentName: currentTier.name,
                botDifficulty: currentTier.name,
              });
              arcadeAudio.playDraw();
            }
          } else if (newStatus.isDraw) {
            setStats((s) => ({ ...s, draws: s.draws + 1 }));
            void recordResult({
              result: 'draw',
              score: 0,
              opponentType: 'bot',
              opponentName: currentTier.name,
              botDifficulty: currentTier.name,
            });
            arcadeAudio.playDraw();
          } else {
            arcadeAudio.playMove(result.color === 'w');
          }
          return true;
        }
      } catch (err) {
        console.warn('Illegal move attempted:', err);
      }
      return false;
    },
    [chess, playerColor, submit, recordResult, currentTier.name]
  );

  // Handle Square Selection and Player Move
  const handleSquareClick = (square: Square) => {
    if (status.isOver || isBotThinking || chess.turn() !== playerColor) return;

    // If already selected a piece, check if target square is a legal destination
    if (selectedSquare) {
      const matchMove = legalMoves.find((m) => m.to === square);
      if (matchMove) {
        // Check for promotion
        if (matchMove.promotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }
        applyMove({ from: selectedSquare, to: square });
        return;
      }
    }

    // Otherwise select piece of player's color
    const piece = chess.get(square);
    if (piece && piece.color === playerColor) {
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const handlePromotionSelect = (piece: PieceSymbol) => {
    if (!pendingPromotion) return;
    applyMove({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: piece,
    });
    setPendingPromotion(null);
  };

  // Bot Turn Trigger
  useEffect(() => {
    if (mode !== 'bot') return;
    if (status.isOver) return;

    if (chess.turn() === botColor) {
      setIsBotThinking(true);
      let isSubscribed = true;

      getBotChessMove(chess, selectedLevel)
        .then((botMove) => {
          if (!isSubscribed) return;
          if (botMove) {
            applyMove(botMove);
          }
          setIsBotThinking(false);
        })
        .catch((err) => {
          console.error('[Chess Bot Error]:', err);
          if (isSubscribed) setIsBotThinking(false);
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [mode, status.isOver, fen, botColor, chess, selectedLevel, applyMove]);

  const handleResign = () => {
    if (status.isOver) return;
    setStats((s) => ({ ...s, botWins: s.botWins + 1 }));
    setStatus({
      isOver: true,
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      winner: botColor,
      drawReason: 'Player resigned',
    });
    arcadeAudio.playDraw();
  };

  const toggleSound = () => {
    const next = arcadeAudio.toggleSound();
    setSoundOn(next);
  };

  // Pre-game selection station
  if (mode === 'choose') {
    return (
      <div className="space-y-6">
        <FriendMatchStation
          gameId="chess"
          onPlayBot={() => {
            resetGame('w');
            setMode('bot');
          }}
          botDifficultyComponent={
            <div className="space-y-4">
              <ArcadeDifficultySlider
                difficulties={CHESS_DIFFICULTIES}
                selectedId={selectedLevel}
                onSelect={(lvl) => setSelectedLevel(Number(lvl))}
                title="Chess Bot Difficulty"
              />

              {/* Side / Color selection */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs uppercase font-bold text-slate-300 font-mono">
                  Select Your Color:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlayerColor('w')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                      playerColor === 'w'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    ⚪ White (Moves First)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerColor('b')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                      playerColor === 'b'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    ⚫ Black (Bot Moves First)
                  </button>
                </div>
              </div>
            </div>
          }
        />
      </div>
    );
  }

  const { whiteLead } = calculateMaterialAdvantage(captured);
  const isPlayerTurn = chess.turn() === playerColor;

  return (
    <div className="space-y-6 animate-in">
      {pendingPromotion && (
        <PromotionModal color={playerColor} onSelect={handlePromotionSelect} />
      )}

      {/* Top Station Header */}
      <BotMatchHeader
        tier={currentTier}
        isBotThinking={isBotThinking}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onExit={() => setMode('choose')}
        onRestart={() => resetGame(playerColor)}
        statusText={
          status.isOver
            ? status.winner === playerColor
              ? 'Victory! You checkmated the bot'
              : status.winner === 'draw'
              ? status.drawReason || 'Match Drawn'
              : 'Bot Won by Checkmate'
            : isPlayerTurn
            ? `Your Turn (${playerColor === 'w' ? 'White' : 'Black'})`
            : 'Bot is calculating move...'
        }
        isGameOver={status.isOver}
      />

      {/* Scoreboard and Material Adv */}
      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-center items-center">
        <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-400/40 text-sky-300 flex items-center justify-between px-3.5">
          <div className="flex items-center gap-2 text-left">
            <PlayerAvatar config={playerAvatar} name={playerName} size="xs" />
            <div>
              <div className="text-[11px] font-semibold uppercase truncate max-w-[80px]">
                {playerName}
              </div>
              <div className="text-[10px] text-sky-400/70">
                {playerColor === 'w' ? 'White' : 'Black'}
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold">{stats.playerWins}</div>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
          <div className="text-[11px] font-semibold uppercase">Draws</div>
          <div className="text-2xl font-bold mt-0.5">{stats.draws}</div>
        </div>
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-400/40 text-rose-300 flex items-center justify-between px-3.5">
          <div className="text-2xl font-bold">{stats.botWins}</div>
          <div className="flex items-center gap-2 text-right flex-row-reverse">
            <PlayerAvatar isBot size="xs" />
            <div>
              <div className="text-[11px] font-semibold uppercase">
                Bot
              </div>
              <div className="text-[10px] text-rose-400/70">
                {botColor === 'w' ? 'White' : 'Black'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Layout: Board + Side Panel */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Board Column */}
        <div className="lg:col-span-8 flex flex-col items-center gap-3">
          {/* Opponent Captured Pieces Bar */}
          <div className="w-full max-w-[460px] flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div className="flex items-center gap-1 min-h-[22px] flex-wrap">
              <span className="text-slate-400 font-mono text-[11px] mr-1">
                Bot Captures:
              </span>
              {captured[botColor].map((p, i) => (
                <div key={i} className="w-4 h-4">
                  <ChessPiece type={p} color={playerColor} />
                </div>
              ))}
            </div>
            {((playerColor === 'w' && whiteLead < 0) || (playerColor === 'b' && whiteLead > 0)) && (
              <span className="font-mono font-bold text-rose-400 text-xs">
                +{Math.abs(whiteLead)}
              </span>
            )}
          </div>

          {/* Interactive Chess Board */}
          <ChessBoard
            chess={chess}
            playerColor={playerColor}
            selectedSquare={selectedSquare}
            onSquareClick={handleSquareClick}
            legalMovesForSelected={legalMoves}
            lastMove={lastMove}
            isCheck={status.isCheck}
            disabled={status.isOver || isBotThinking || !isPlayerTurn}
          />

          {/* Player Captured Pieces Bar */}
          <div className="w-full max-w-[460px] flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div className="flex items-center gap-1 min-h-[22px] flex-wrap">
              <span className="text-slate-400 font-mono text-[11px] mr-1">
                Your Captures:
              </span>
              {captured[playerColor].map((p, i) => (
                <div key={i} className="w-4 h-4">
                  <ChessPiece type={p} color={botColor} />
                </div>
              ))}
            </div>
            {((playerColor === 'w' && whiteLead > 0) || (playerColor === 'b' && whiteLead < 0)) && (
              <span className="font-mono font-bold text-emerald-400 text-xs">
                +{Math.abs(whiteLead)}
              </span>
            )}
          </div>
        </div>

        {/* Side Panel: Turn status, Move history & Actions */}
        <div className="lg:col-span-4 space-y-4">
          {/* Match Outcome Banner */}
          {status.isOver ? (
            <div className="arcade-cabinet p-5 border-2 border-amber-400 text-center space-y-3 animate-pop">
              <span className="token-badge !bg-amber-500/10 !border-amber-500/30 !text-amber-400">
                MATCH CONCLUDED
              </span>
              <h3 className="text-xl font-bold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {status.winner === playerColor
                  ? '🎉 Victory! You beat the CPU!'
                  : status.winner === 'draw'
                  ? '🤝 Match Drawn!'
                  : '🤖 CPU Wins! Rematch?'}
              </h3>
              <p className="text-xs text-slate-400">
                {status.drawReason || (status.isCheckmate ? 'Ended by checkmate' : 'Match complete')}
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => resetGame(playerColor)}
                  className="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  <RotateCcw className="h-4 w-4" /> Rematch
                </button>
              </div>
            </div>
          ) : (
            <div className="arcade-cabinet p-4 flex items-center justify-between border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isPlayerTurn ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs font-bold text-slate-200">
                  {isPlayerTurn
                    ? `Your Turn (${playerColor === 'w' ? 'White' : 'Black'})`
                    : isBotThinking
                    ? 'Bot is calculating move...'
                    : `Bot's Turn (${botColor === 'w' ? 'White' : 'Black'})`}
                </span>
              </div>
              {status.isCheck && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse">
                  <ShieldAlert className="h-3 w-3" /> Check!
                </span>
              )}
            </div>
          )}

          {/* Move History Log */}
          <div className="arcade-cabinet p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase font-mono text-slate-400 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-amber-400" /> Move Log
              </span>
              <span>{Math.ceil(moveHistory.length / 2)} Rounds</span>
            </div>

            <div className="max-h-48 overflow-y-auto scrollbar-thin divide-y divide-slate-800/40 font-mono text-xs">
              {moveHistory.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">
                  No moves made yet
                </div>
              ) : (
                Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                  const whiteMove = moveHistory[i * 2];
                  const blackMove = moveHistory[i * 2 + 1];

                  return (
                    <div key={i} className="py-1.5 flex items-center justify-between px-2 text-slate-300">
                      <span className="text-slate-500 w-8">{i + 1}.</span>
                      <span className="w-16 font-bold text-slate-200">{whiteMove}</span>
                      <span className="w-16 font-bold text-amber-300/90">{blackMove || ''}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Resign / Surrender Button */}
          {!status.isOver && (
            <button
              type="button"
              onClick={handleResign}
              disabled={isBotThinking}
              className="btn-ghost w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:text-rose-400 hover:border-rose-500/40"
            >
              <Flag className="h-3.5 w-3.5" />
              <span>Resign Match</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
