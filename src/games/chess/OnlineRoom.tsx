import { useState, useCallback, useRef, useMemo } from 'react';
import type { Square, Move, PieceSymbol } from 'chess.js';
import { RotateCcw, ArrowLeft, Loader2, Wifi, WifiOff, Flag, Handshake } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { recordGameResult } from '@/lib/gameRecordsService';
import { useOnlineMatchChannel } from '@/games/shared/useOnlineMatchChannel';
import { useGameChat } from '@/games/shared/useGameChat';
import GameChat from '@/components/GameChat';
import GameReactions from '@/components/GameReactions';
import ChessBoard from './ChessBoard';
import ChessPiece from './ChessPieces';
import PromotionModal from './PromotionModal';
import {
  createChessGame,
  getCapturedPieces,
  calculateMaterialAdvantage,
  type CapturedPieces,
  type ChessColor,
} from './engine.ts';
import {
  createInitialChessOnlineState,
  applyOnlineChessMove,
  applyResignation,
  applyDrawAgreement,
  type ChessOnlineState,
} from './onlineEngine.ts';

type OnlineRoomProps = {
  matchId: string;
  role: 'host' | 'guest';
  opponentName: string;
  onExit: () => void;
};

type ChessActionPayload =
  | { type: 'move'; from: string; to: string; promotion?: string; fenAfter?: string }
  | { type: 'resign' }
  | { type: 'draw_offer' }
  | { type: 'draw_accept' }
  | { type: 'draw_decline' };

type StateSnapshot = {
  fen: string;
  turn: ChessColor;
  seq: number;
  winner: ChessColor | 'draw' | null;
  isOver: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason?: string;
  lastMove: { from: string; to: string } | null;
};

export default function OnlineRoom({ matchId, role, opponentName, onExit }: OnlineRoomProps) {
  const { profile } = useAuth();
  const { exitActiveMatch } = useMultiplayer();
  const rawName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
  const myName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const roundRef = useRef(0);
  const recordedRoundsRef = useRef<Set<number>>(new Set());

  // Alternate colors on rematches: Host is White first round (round 0)
  const myColor: ChessColor = (role === 'host') === (roundRef.current % 2 === 0) ? 'w' : 'b';
  const opponentColor: ChessColor = myColor === 'w' ? 'b' : 'w';

  const [gameState, setGameState] = useState<ChessOnlineState>(() =>
    createInitialChessOnlineState()
  );
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Local UI selection
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [drawOfferedByOpponent, setDrawOfferedByOpponent] = useState(false);
  const [drawOfferPending, setDrawOfferPending] = useState(false);

  // Scoreboard
  const [score, setScore] = useState({ me: 0, opponent: 0, draws: 0 });

  const chat = useGameChat();

  // Chess instance for move generation on current FEN
  const currentChess = useMemo(() => {
    return createChessGame(gameState.fen);
  }, [gameState.fen]);

  const legalMovesForSelected: Move[] = useMemo(() => {
    if (!selectedSquare) return [];
    return currentChess.moves({ square: selectedSquare, verbose: true });
  }, [currentChess, selectedSquare]);

  const captured: CapturedPieces = useMemo(() => {
    return getCapturedPieces(currentChess);
  }, [currentChess]);

  const advantage = useMemo(() => {
    return calculateMaterialAdvantage(captured);
  }, [captured]);

  const recordResultOnce = useCallback(
    (winner: ChessColor | 'draw' | null) => {
      const currentRound = roundRef.current;
      if (recordedRoundsRef.current.has(currentRound)) return;
      recordedRoundsRef.current.add(currentRound);

      if (!profile?.id || winner === null) return;
      const isWinner = winner === myColor;
      const isDraw = winner === 'draw';

      void recordGameResult({
        user_id: profile.id,
        game: 'chess',
        mode: 'multi',
        result: isDraw ? 'draw' : isWinner ? 'win' : 'loss',
        score: isWinner ? 1 : 0,
        opponent_type: 'human',
        opponent_name: opponentName,
        match_id: `${matchId}_rnd_${currentRound}`,
      });
    },
    [profile?.id, myColor, opponentName, matchId]
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
  } = useOnlineMatchChannel<ChessActionPayload, StateSnapshot>({
    matchId,
    gameId: 'chess',
    role,
    onChat: (msg) => chat.addMessage(msg),
    onReaction: (rx) => chat.addReaction(rx),
    onMove: (action, seq) => {
      if (action.type === 'move') {
        const result = applyOnlineChessMove(
          gameStateRef.current,
          opponentColor,
          {
            from: action.from,
            to: action.to,
            promotion: action.promotion,
            fenAfter: action.fenAfter,
          },
          seq
        );
        if (!result.success) return;

        setGameState(result.nextState);
        setSelectedSquare(null);

        if (result.nextState.isOver) {
          if (result.nextState.isCheckmate) {
            setScore((s) => ({ ...s, opponent: s.opponent + 1 }));
            arcadeAudio.playDraw();
          } else {
            setScore((s) => ({ ...s, draws: s.draws + 1 }));
            arcadeAudio.playDraw();
          }
          recordResultOnce(result.nextState.winner);
        } else {
          arcadeAudio.playMove(opponentColor === 'w');
        }
      } else if (action.type === 'resign') {
        const next = applyResignation(gameStateRef.current, opponentColor, seq);
        setGameState(next);
        setScore((s) => ({ ...s, me: s.me + 1 }));
        arcadeAudio.playWin();
        recordResultOnce(next.winner);
      } else if (action.type === 'draw_offer') {
        setDrawOfferedByOpponent(true);
        arcadeAudio.playBlip();
      } else if (action.type === 'draw_accept') {
        const next = applyDrawAgreement(gameStateRef.current, seq);
        setGameState(next);
        setDrawOfferPending(false);
        setDrawOfferedByOpponent(false);
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
        arcadeAudio.playDraw();
        recordResultOnce('draw');
      } else if (action.type === 'draw_decline') {
        setDrawOfferPending(false);
      }
    },
    onState: (snapshot, seq) => {
      setGameState({
        fen: snapshot.fen,
        turn: snapshot.turn,
        lastAppliedSeq: seq,
        winner: snapshot.winner,
        isOver: snapshot.isOver,
        isCheck: snapshot.isCheck,
        isCheckmate: snapshot.isCheckmate,
        isStalemate: snapshot.isStalemate,
        isDraw: snapshot.isDraw,
        drawReason: snapshot.drawReason,
        captured: getCapturedPieces(createChessGame(snapshot.fen)),
        lastMove: snapshot.lastMove,
        history: [],
      });
    },
    onRematch: () => {
      roundRef.current += 1;
      setGameState(createInitialChessOnlineState());
      setSelectedSquare(null);
      setPendingPromotion(null);
      setDrawOfferedByOpponent(false);
      setDrawOfferPending(false);
      arcadeAudio.playCoin();
    },
    onExit: () => {
      chat.clear();
      alert(`${opponentName} left the match.`);
      exitActiveMatch();
      onExit();
    },
    getCurrentState: () => ({
      fen: gameStateRef.current.fen,
      turn: gameStateRef.current.turn,
      seq: gameStateRef.current.lastAppliedSeq,
      winner: gameStateRef.current.winner,
      isOver: gameStateRef.current.isOver,
      isCheck: gameStateRef.current.isCheck,
      isCheckmate: gameStateRef.current.isCheckmate,
      isStalemate: gameStateRef.current.isStalemate,
      isDraw: gameStateRef.current.isDraw,
      drawReason: gameStateRef.current.drawReason,
      lastMove: gameStateRef.current.lastMove,
    }),
  });

  const executeLocalMove = (from: string, to: string, promotion?: string) => {
    if (!channel || gameState.isOver || gameState.turn !== myColor) return;

    const currentSeq = (gameStateRef.current.lastAppliedSeq || 0) + 1;
    // Speculatively check chess engine
    const testChess = createChessGame(gameStateRef.current.fen);
    try {
      const res = testChess.move({ from: from as Square, to: to as Square, promotion });
      if (!res) return;
    } catch {
      return;
    }

    const fenAfter = testChess.fen();
    const result = applyOnlineChessMove(
      gameStateRef.current,
      myColor,
      { from, to, promotion, fenAfter },
      currentSeq
    );
    if (!result.success) return;

    setGameState(result.nextState);
    setSelectedSquare(null);
    setPendingPromotion(null);

    sendMove({
      type: 'move',
      from,
      to,
      promotion,
      fenAfter,
    });

    if (result.nextState.isOver) {
      if (result.nextState.isCheckmate) {
        setScore((s) => ({ ...s, me: s.me + 1 }));
        arcadeAudio.playWin();
      } else {
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
        arcadeAudio.playDraw();
      }
      recordResultOnce(result.nextState.winner);
    } else {
      arcadeAudio.playMove(myColor === 'w');
    }
  };

  const handleSquareClick = (square: Square) => {
    if (gameState.isOver || gameState.turn !== myColor) return;

    if (selectedSquare) {
      const matchMove = legalMovesForSelected.find((m) => m.to === square);
      if (matchMove) {
        if (matchMove.promotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }
        executeLocalMove(selectedSquare, square);
        return;
      }
    }

    const piece = currentChess.get(square);
    if (piece && piece.color === myColor) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePromotionSelect = (piece: PieceSymbol) => {
    if (!pendingPromotion) return;
    executeLocalMove(pendingPromotion.from, pendingPromotion.to, piece);
  };

  const handleResign = () => {
    if (gameState.isOver || !channel) return;
    const confirmResign = window.confirm('Are you sure you want to resign the game?');
    if (!confirmResign) return;

    const currentSeq = (gameStateRef.current.lastAppliedSeq || 0) + 1;
    const next = applyResignation(gameStateRef.current, myColor, currentSeq);
    setGameState(next);
    sendMove({ type: 'resign' });
    setScore((s) => ({ ...s, opponent: s.opponent + 1 }));
    arcadeAudio.playDraw();
    recordResultOnce(next.winner);
  };

  const handleOfferDraw = () => {
    if (gameState.isOver || !channel || drawOfferPending) return;
    setDrawOfferPending(true);
    sendMove({ type: 'draw_offer' });
    arcadeAudio.playBlip();
  };

  const handleAcceptDraw = () => {
    if (!channel) return;
    const currentSeq = (gameStateRef.current.lastAppliedSeq || 0) + 1;
    const next = applyDrawAgreement(gameStateRef.current, currentSeq);
    setGameState(next);
    setDrawOfferedByOpponent(false);
    sendMove({ type: 'draw_accept' });
    setScore((s) => ({ ...s, draws: s.draws + 1 }));
    arcadeAudio.playDraw();
    recordResultOnce('draw');
  };

  const handleDeclineDraw = () => {
    if (!channel) return;
    setDrawOfferedByOpponent(false);
    sendMove({ type: 'draw_decline' });
  };

  const handleRequestRematch = () => {
    if (!channel) return;
    roundRef.current += 1;
    setGameState(createInitialChessOnlineState());
    setSelectedSquare(null);
    setPendingPromotion(null);
    setDrawOfferedByOpponent(false);
    setDrawOfferPending(false);
    sendRematch();
    arcadeAudio.playCoin();
  };

  const handleManualExit = () => {
    sendExit();
    exitActiveMatch();
    onExit();
  };

  const isMyTurn = gameState.turn === myColor;

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in select-none">
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
            {myColor === 'w' ? 'White (Move First)' : 'Black'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          {error}
        </div>
      )}

      {/* Draw offer banner */}
      {drawOfferedByOpponent && !gameState.isOver && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex items-center justify-between">
          <span className="text-xs font-mono text-amber-300 flex items-center gap-2">
            <Handshake className="w-4 h-4 text-amber-400" />
            {opponentName} offered a draw!
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleAcceptDraw}
              className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition"
            >
              Accept
            </button>
            <button
              onClick={handleDeclineDraw}
              className="px-3 py-1 bg-slate-800 text-slate-300 font-bold rounded-lg text-xs hover:bg-slate-700 transition"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">{myName}</div>
          <div className="text-xl font-bold mt-0.5 text-emerald-400">{score.me}</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">Draws</div>
          <div className="text-xl font-bold mt-0.5 text-slate-400">{score.draws}</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">{opponentName}</div>
          <div className="text-xl font-bold mt-0.5 text-rose-400">{score.opponent}</div>
        </div>
      </div>

      {/* Opponent Info & Captured */}
      <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full border ${opponentColor === 'w' ? 'bg-white border-slate-400' : 'bg-slate-900 border-slate-700'}`} />
          <span className="text-xs font-mono font-bold text-slate-300">{opponentName}</span>
        </div>
        <div className="flex items-center gap-1">
          {captured[myColor].map((p, idx) => (
            <div key={idx} className="w-4 h-4 opacity-75">
              <ChessPiece type={p} color={opponentColor} />
            </div>
          ))}
          {advantage.whiteLead !== 0 && (
            <span className="text-[10px] font-mono font-bold text-slate-400 ml-1">
              {((opponentColor === 'w' && advantage.whiteLead > 0) || (opponentColor === 'b' && advantage.whiteLead < 0))
                ? `+${Math.abs(advantage.whiteLead)}`
                : ''}
            </span>
          )}
        </div>
      </div>

      {/* Status Alert */}
      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center font-mono text-sm">
        {gameState.isOver ? (
          <div className="text-amber-400 font-bold">
            {gameState.isCheckmate
              ? gameState.winner === myColor
                ? '🏆 Checkmate! You win!'
                : `💀 Checkmate! ${opponentName} wins!`
              : gameState.drawReason || 'Game ended in a draw!'}
          </div>
        ) : isMyTurn ? (
          <div className="text-emerald-400 font-semibold animate-pulse">
            {gameState.isCheck ? '⚠️ Check! Your turn.' : '👉 Your Turn. Pick a piece to move.'}
          </div>
        ) : (
          <div className="text-slate-400">
            {gameState.isCheck ? `⚠️ ${opponentName} is in check!` : `Waiting for ${opponentName}...`}
          </div>
        )}
      </div>

      {/* Chess Board */}
      <div className="p-2 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm shadow-2xl flex flex-col items-center">
        <ChessBoard
          chess={currentChess}
          playerColor={myColor}
          selectedSquare={selectedSquare}
          onSquareClick={handleSquareClick}
          legalMovesForSelected={legalMovesForSelected}
          lastMove={gameState.lastMove}
          isCheck={gameState.isCheck}
          disabled={!isMyTurn || gameState.isOver || !opponentConnected}
        />
      </div>

      {/* Player Info & Captured */}
      <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full border ${myColor === 'w' ? 'bg-white border-slate-400' : 'bg-slate-900 border-slate-700'}`} />
          <span className="text-xs font-mono font-bold text-slate-300">{myName} (You)</span>
        </div>
        <div className="flex items-center gap-1">
          {captured[opponentColor].map((p, idx) => (
            <div key={idx} className="w-4 h-4 opacity-75">
              <ChessPiece type={p} color={myColor} />
            </div>
          ))}
          {advantage.whiteLead !== 0 && (
            <span className="text-[10px] font-mono font-bold text-slate-400 ml-1">
              {((myColor === 'w' && advantage.whiteLead > 0) || (myColor === 'b' && advantage.whiteLead < 0))
                ? `+${Math.abs(advantage.whiteLead)}`
                : ''}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        {!gameState.isOver ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOfferDraw}
              disabled={drawOfferPending || !isMyTurn}
              className="px-3 py-1.5 rounded-xl text-xs font-bold font-mono bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition flex items-center gap-1.5"
            >
              <Handshake className="w-3.5 h-3.5 text-amber-400" />
              {drawOfferPending ? 'Draw Offered...' : 'Offer Draw'}
            </button>
            <button
              onClick={handleResign}
              className="px-3 py-1.5 rounded-xl text-xs font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition flex items-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5" />
              Resign
            </button>
          </div>
        ) : (
          <button
            onClick={handleRequestRematch}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Rematch (Swap Sides)
          </button>
        )}
      </div>

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <PromotionModal color={myColor} onSelect={handlePromotionSelect} />
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
