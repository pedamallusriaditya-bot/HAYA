import { useState, useCallback, useRef, useEffect } from 'react';
import { RotateCcw, ArrowLeft, Loader2, Wifi, WifiOff, Flame, Disc } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { recordGameResult } from '@/lib/gameRecordsService';
import { useOnlineMatchChannel } from '@/games/shared/useOnlineMatchChannel';
import { carromAudio } from './carromAudio';
import {
  BOARD_SIZE,
  BASELINE_Y_PLAYER,
  BASELINE_Y_BOT,
  stepPhysics,
  arePiecesSettled,
} from './physics';
import {
  createInitialBoard,
  resolveShot,
  calculateScore,
} from './engine';
import CarromBoard from './CarromBoard';
import type { Piece, PlayerSide, QueenStatus, TurnPhase, CarromScore } from './types';
import {
  serializePieces,
  applyPieceSnapshot,
  flipAngle,
  type SerializedPiece,
} from './onlineEngine';

type OnlineRoomProps = {
  matchId: string;
  role: 'host' | 'guest';
  opponentName: string;
  onExit: () => void;
};

type CarromActionPayload =
  | { type: 'shot'; baselineX: number; aimAngle: number; power: number }
  | { type: 'resign' };

type StateSnapshot = {
  seq: number;
  pieces: SerializedPiece[];
  scores: CarromScore;
  queenStatus: QueenStatus;
  currentTurn: PlayerSide;
  winner: PlayerSide | null;
  notification: string;
};

export default function OnlineRoom({ matchId, role, opponentName, onExit }: OnlineRoomProps) {
  const { profile } = useAuth();
  const { exitActiveMatch } = useMultiplayer();
  const rawName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
  const myName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const roundRef = useRef(0);
  const recordedRoundsRef = useRef<Set<number>>(new Set());

  // Host is White ('player', breaks first), Guest is Black ('bot')
  const mySide: PlayerSide = (role === 'host') === (roundRef.current % 2 === 0) ? 'player' : 'bot';
  const opponentSide: PlayerSide = mySide === 'player' ? 'bot' : 'player';

  // State
  const [currentTurn, setCurrentTurn] = useState<PlayerSide>('player');
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('placement');
  const [queenStatus, setQueenStatus] = useState<QueenStatus>('on_board');
  const [winner, setWinner] = useState<PlayerSide | null>(null);

  // Striker aiming & power
  const [strikerX, setStrikerX] = useState<number>(BOARD_SIZE / 2);
  const [aimAngle, setAimAngle] = useState<number>(-Math.PI / 2);
  const [shotPower, setShotPower] = useState<number>(900);

  // Last shot notification
  const [lastNotification, setLastNotification] = useState<string>(
    'White breaks first. Position striker along baseline, then tap Aim Shot.'
  );

  // Match stats
  const [stats, setStats] = useState({ me: 0, opponent: 0 });

  // Physics simulation references
  const piecesRef = useRef<Piece[]>([]);
  const [, setRenderTrigger] = useState(0);
  const pocketedThisShotRef = useRef<Piece[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const isSimulatingRef = useRef(false);
  const pendingSnapshotRef = useRef<StateSnapshot | null>(null);
  const localSeqRef = useRef<number>(0);
  const sendStateRef = useRef<((state: StateSnapshot) => void) | null>(null);

  // Init board
  useEffect(() => {
    piecesRef.current = createInitialBoard('player');
    setRenderTrigger((r) => r + 1);
  }, []);

  const scores: CarromScore = calculateScore(piecesRef.current, queenStatus);

  const recordResultOnce = useCallback(
    (won: boolean) => {
      const currentRound = roundRef.current;
      if (recordedRoundsRef.current.has(currentRound)) return;
      recordedRoundsRef.current.add(currentRound);

      if (!profile?.id) return;
      void recordGameResult({
        user_id: profile.id,
        game: 'carrom',
        mode: 'multi',
        result: won ? 'win' : 'loss',
        score: won ? 1 : 0,
        opponent_type: 'human',
        opponent_name: opponentName,
        match_id: `${matchId}_rnd_${currentRound}`,
      });
    },
    [profile?.id, opponentName, matchId]
  );

  // Adopt snapshot
  const adoptSnapshot = useCallback((snapshot: StateSnapshot) => {
    applyPieceSnapshot(piecesRef.current, snapshot.pieces);
    setQueenStatus(snapshot.queenStatus);
    setCurrentTurn(snapshot.currentTurn);
    setWinner(snapshot.winner);
    setLastNotification(snapshot.notification);
    setTurnPhase(snapshot.winner ? 'game_over' : 'placement');

    // Reset striker for next shooter
    const striker = piecesRef.current.find((p) => p.type === 'striker');
    if (striker) {
      striker.x = BOARD_SIZE / 2;
      striker.y = snapshot.currentTurn === mySide ? BASELINE_Y_PLAYER : BASELINE_Y_BOT;
      striker.vx = 0;
      striker.vy = 0;
      striker.isPocketed = false;
    }
    setStrikerX(BOARD_SIZE / 2);
    setAimAngle(snapshot.currentTurn === mySide ? -Math.PI / 2 : Math.PI / 2);
    setRenderTrigger((r) => r + 1);

    if (snapshot.winner) {
      const isMyWin = snapshot.winner === mySide;
      if (isMyWin) {
        setStats((s) => ({ ...s, me: s.me + 1 }));
        arcadeAudio.playWin();
      } else {
        setStats((s) => ({ ...s, opponent: s.opponent + 1 }));
        arcadeAudio.playDraw();
      }
      recordResultOnce(isMyWin);
    }
  }, [mySide, recordResultOnce]);

  // Physics Shot Runner (local or remote)
  const executePhysicsShot = useCallback(
    (
      shooter: PlayerSide,
      x: number,
      y: number,
      angle: number,
      power: number,
      isAuthoritative: boolean
    ) => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      pocketedThisShotRef.current = [];
      isSimulatingRef.current = true;
      setTurnPhase('shooting');

      // Place striker and apply velocity impulse
      const striker = piecesRef.current.find((p) => p.type === 'striker');
      if (striker) {
        striker.x = x;
        striker.y = y;
        striker.vx = Math.cos(angle) * power;
        striker.vy = Math.sin(angle) * power;
        striker.isPocketed = false;
      }

      carromAudio.playFlick(power / 1600);

      let lastTime = performance.now();
      const startTime = performance.now();

      const physicsLoop = (currentTime: number) => {
        const rawDt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        const dt = Math.min(rawDt, 0.033);

        const newPocketed = stepPhysics(piecesRef.current, dt, false);
        for (const p of newPocketed) {
          if (!pocketedThisShotRef.current.some((already) => already.id === p.id)) {
            pocketedThisShotRef.current.push(p);
          }
        }

        setRenderTrigger((r) => r + 1);

        const settled = arePiecesSettled(piecesRef.current);
        const elapsed = currentTime - startTime;

        if ((settled && elapsed > 650) || elapsed > 8000) {
          // Stop pieces
          for (const p of piecesRef.current) {
            p.vx = 0;
            p.vy = 0;
          }
          isSimulatingRef.current = false;

          if (isAuthoritative) {
            // Authoritative shooter evaluates rules and broadcasts outcome
            const result = resolveShot(
              shooter,
              pocketedThisShotRef.current,
              queenStatus,
              piecesRef.current
            );

            piecesRef.current = result.updatedPieces;
            setQueenStatus(result.nextQueenStatus);

            let notif = '';
            if (result.shotResult.foulReason) {
              notif = `Foul! ${result.shotResult.foulReason}. Turn lost.`;
            } else if (result.shotResult.queenCovered) {
              notif = `Queen Covered! +3 points! Extra turn.`;
            } else if (result.shotResult.turnContinued) {
              notif = `Nice shot! Piece pocketed. Extra turn!`;
            } else {
              notif = `No piece pocketed. Turn passes to opponent.`;
            }

            const nextShooter = result.shotResult.winner ? currentTurn : result.nextPlayer;
            setCurrentTurn(nextShooter);
            setLastNotification(notif);

            if (result.shotResult.winner) {
              setWinner(result.shotResult.winner);
              setTurnPhase('game_over');
              const isMyWin = result.shotResult.winner === mySide;
              if (isMyWin) {
                setStats((s) => ({ ...s, me: s.me + 1 }));
                arcadeAudio.playWin();
              } else {
                setStats((s) => ({ ...s, opponent: s.opponent + 1 }));
                arcadeAudio.playDraw();
              }
              recordResultOnce(isMyWin);
            } else {
              setTurnPhase('placement');
            }

            // Reset striker position for next turn
            const nextStriker = piecesRef.current.find((p) => p.type === 'striker');
            if (nextStriker) {
              nextStriker.x = BOARD_SIZE / 2;
              nextStriker.y = nextShooter === mySide ? BASELINE_Y_PLAYER : BASELINE_Y_BOT;
              nextStriker.vx = 0;
              nextStriker.vy = 0;
              nextStriker.isPocketed = false;
            }
            setStrikerX(BOARD_SIZE / 2);
            setAimAngle(nextShooter === mySide ? -Math.PI / 2 : Math.PI / 2);
            setRenderTrigger((r) => r + 1);

            // Broadcast authoritative snapshot
            localSeqRef.current += 1;
            const finalScores = calculateScore(piecesRef.current, result.nextQueenStatus);
            sendStateRef.current?.({
              seq: localSeqRef.current,
              pieces: serializePieces(piecesRef.current),
              scores: finalScores,
              queenStatus: result.nextQueenStatus,
              currentTurn: nextShooter,
              winner: result.shotResult.winner,
              notification: notif,
            });
          } else {
            // Non-authoritative shooter: adopt pending snapshot if received
            if (pendingSnapshotRef.current) {
              adoptSnapshot(pendingSnapshotRef.current);
              pendingSnapshotRef.current = null;
            } else {
              setTurnPhase('placement');
            }
          }
        } else {
          animFrameIdRef.current = requestAnimationFrame(physicsLoop);
        }
      };

      animFrameIdRef.current = requestAnimationFrame(physicsLoop);
    },
    [queenStatus, currentTurn, mySide, adoptSnapshot, recordResultOnce]
  );

  const {
    connecting,
    opponentConnected,
    error,
    channel,
    sendMove,
    sendState,
    sendRematch,
    sendExit,
  } = useOnlineMatchChannel<CarromActionPayload, StateSnapshot>({
    matchId,
    gameId: 'carrom',
    role,
    onMove: (action) => {
      if (action.type === 'shot') {
        // Opponent shot!
        const opponentBaselineY = BASELINE_Y_BOT;
        const opponentStrikerX = BOARD_SIZE - action.baselineX;
        const opponentAimAngle = flipAngle(action.aimAngle);

        executePhysicsShot(
          opponentSide,
          opponentStrikerX,
          opponentBaselineY,
          opponentAimAngle,
          action.power,
          false // not authoritative (opponent will send snapshot)
        );
      } else if (action.type === 'resign') {
        setWinner(mySide);
        setTurnPhase('game_over');
        setLastNotification(`${opponentName} resigned. You win!`);
        setStats((s) => ({ ...s, me: s.me + 1 }));
        arcadeAudio.playWin();
        recordResultOnce(true);
      }
    },
    onState: (snapshot) => {
      if (isSimulatingRef.current) {
        pendingSnapshotRef.current = snapshot;
      } else {
        adoptSnapshot(snapshot);
      }
    },
    onRematch: () => {
      roundRef.current += 1;
      const startingSide: PlayerSide = roundRef.current % 2 === 0 ? 'player' : 'bot';
      piecesRef.current = createInitialBoard(startingSide);
      setCurrentTurn(startingSide);
      setQueenStatus('on_board');
      setWinner(null);
      setTurnPhase('placement');
      setLastNotification(`Rematch! Round ${roundRef.current + 1}.`);
      arcadeAudio.playCoin();
      setRenderTrigger((r) => r + 1);
    },
    onExit: () => {
      alert(`${opponentName} left the match.`);
      exitActiveMatch();
      onExit();
    },
    getCurrentState: (): StateSnapshot => ({
      seq: localSeqRef.current,
      pieces: serializePieces(piecesRef.current),
      scores: calculateScore(piecesRef.current, queenStatus),
      queenStatus,
      currentTurn,
      winner,
      notification: lastNotification,
    }),
  });

  useEffect(() => {
    sendStateRef.current = sendState;
  }, [sendState]);

  // Local shoot trigger
  const handleLocalShoot = () => {
    if (
      currentTurn !== mySide ||
      turnPhase !== 'aiming' ||
      !opponentConnected ||
      winner !== null
    ) {
      return;
    }

    sendMove({
      type: 'shot',
      baselineX: strikerX,
      aimAngle,
      power: shotPower,
    });

    executePhysicsShot(mySide, strikerX, BASELINE_Y_PLAYER, aimAngle, shotPower, true);
  };

  const handleManualExit = () => {
    sendExit();
    exitActiveMatch();
    onExit();
  };

  const handleRequestRematch = () => {
    if (!channel) return;
    roundRef.current += 1;
    const startingSide: PlayerSide = roundRef.current % 2 === 0 ? 'player' : 'bot';
    piecesRef.current = createInitialBoard(startingSide);
    setCurrentTurn(startingSide);
    setQueenStatus('on_board');
    setWinner(null);
    setTurnPhase('placement');
    setLastNotification(`Rematch! Round ${roundRef.current + 1}.`);
    sendRematch();
    arcadeAudio.playCoin();
    setRenderTrigger((r) => r + 1);
  };

  const isMyTurn = currentTurn === mySide;

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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {mySide === 'player' ? 'White (Breaks First)' : 'Black'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          {error}
        </div>
      )}

      {/* Match Score & Pieces Count */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">{myName}</div>
          <div className="text-xl font-bold mt-0.5 text-amber-400">{stats.me}W</div>
          <div className="text-[10px] text-slate-400">
            {mySide === 'player' ? scores.remainingWhite : scores.remainingBlack} pieces left
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">{opponentName}</div>
          <div className="text-xl font-bold mt-0.5 text-slate-400">{stats.opponent}W</div>
          <div className="text-[10px] text-slate-400">
            {opponentSide === 'player' ? scores.remainingWhite : scores.remainingBlack} pieces left
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">Queen Status</div>
          <div className="text-xs font-bold mt-1 text-rose-400 uppercase">
            {queenStatus.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">Current Turn</div>
          <div className="text-xs font-bold mt-1 text-emerald-400 uppercase">
            {isMyTurn ? 'Your Turn' : `${opponentName}'s Turn`}
          </div>
        </div>
      </div>

      {/* Arena */}
      <div className="flex flex-col items-center gap-4">
        <CarromBoard
          pieces={piecesRef.current}
          currentTurn={isMyTurn ? 'player' : 'bot'}
          turnPhase={turnPhase}
          strikerX={strikerX}
          onStrikerXChange={setStrikerX}
          aimAngle={aimAngle}
          onAimAngleChange={setAimAngle}
          shotPower={shotPower}
          onShotPowerChange={setShotPower}
          onShoot={handleLocalShoot}
          onLockPlacement={() => {
            setTurnPhase('aiming');
            setLastNotification('Aiming active! Pull back to flick, or adjust power slider and click Strike.');
          }}
          onReposition={() => {
            setTurnPhase('placement');
            setLastNotification('Position striker along your baseline.');
          }}
          disabled={!isMyTurn || turnPhase === 'settling' || turnPhase === 'shooting' || !!winner || !opponentConnected}
        />

        {/* Live Notification Bar */}
        <div className="w-full max-w-[min(90vw,540px,68vh)] text-center text-xs font-mono text-slate-300 py-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          {lastNotification}
        </div>

        {/* Player Controls */}
        {isMyTurn && !winner && (
          <div className="w-full max-w-[min(90vw,540px,68vh)] p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {turnPhase === 'placement' ? (
              <div className="flex items-center justify-between w-full gap-3">
                <span className="text-xs font-mono text-slate-300">
                  ↔ <strong className="text-amber-400">Placement:</strong> Drag striker left/right along baseline
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTurnPhase('aiming');
                    setLastNotification('Aiming active! Pull back or tap Strike to flick.');
                  }}
                  className="px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 shrink-0"
                >
                  Aim Shot 🎯
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <Flame className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-mono font-bold text-slate-300">POWER:</span>
                  <input
                    type="range"
                    min={350}
                    max={1600}
                    value={shotPower}
                    onChange={(e) => setShotPower(Number(e.target.value))}
                    disabled={turnPhase === 'settling' || turnPhase === 'shooting'}
                    className="flex-1 accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-amber-400 min-w-[34px] text-right">
                    {Math.round(((shotPower - 350) / 1250) * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTurnPhase('placement');
                      setLastNotification('Position striker along your baseline.');
                    }}
                    disabled={turnPhase === 'settling' || turnPhase === 'shooting'}
                    className="px-3 py-2 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    ↺ Reposition
                  </button>

                  <button
                    type="button"
                    onClick={handleLocalShoot}
                    disabled={turnPhase === 'settling' || turnPhase === 'shooting'}
                    className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <Disc className="w-4 h-4 fill-slate-950 text-slate-950" />
                    Strike!
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Rematch */}
        {winner && (
          <div className="w-full max-w-[min(90vw,540px,68vh)] p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-sm font-bold font-mono text-amber-400">
              {winner === mySide ? '🏆 You won the match!' : `👑 ${opponentName} won the match!`}
            </span>
            <button
              onClick={handleRequestRematch}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-lg flex items-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Rematch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
