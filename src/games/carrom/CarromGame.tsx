import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RotateCcw,
  Trophy,
  Disc,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import PlayerAvatar from '@/components/avatar/PlayerAvatar';
import FriendMatchStation from '@/components/FriendMatchStation';
import ArcadeDifficultySlider from '@/components/common/ArcadeDifficultySlider';
import BotMatchHeader from '@/components/bot/BotMatchHeader';
import {
  CARROM_DIFFICULTIES,
  CARROM_DIFFICULTIES_HARDEST_FIRST,
  type DifficultyTier,
} from '@/components/bot/botConfigs';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';
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
import { computeBotMove } from './ai';
import CarromBoard from './CarromBoard';
import type { Piece, PlayerSide, QueenStatus, TurnPhase } from './types';

type GameMode = 'choose' | 'bot';

export default function CarromGame() {
  const { profile } = useAuth();
  const rawName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
  const playerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const [mode, setMode] = useState<GameMode>('choose');
  // Default Level 4 (Advanced)
  const [selectedLevel, setSelectedLevel] = useState<number>(4);

  // Audio state
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Match state
  const [currentTurn, setCurrentTurn] = useState<PlayerSide>('player');
  const [turnPhase, setTurnPhase] = useState<TurnPhase>('placement');
  const [queenStatus, setQueenStatus] = useState<QueenStatus>('on_board');
  const [winner, setWinner] = useState<PlayerSide | null>(null);

  // Striker aiming & power
  const [strikerX, setStrikerX] = useState<number>(BOARD_SIZE / 2);
  const [aimAngle, setAimAngle] = useState<number>(-Math.PI / 2); // Pointing upward into board
  const [shotPower, setShotPower] = useState<number>(900); // 350 to 1600

  // Bot aiming animation
  const [botAimData, setBotAimData] = useState<{
    baselineX: number;
    aimAngle: number;
    power: number;
    progress: number;
  } | null>(null);

  // Last shot notification
  const [lastNotification, setLastNotification] = useState<string>(
    'White breaks first. Position striker along baseline, then tap Aim Shot.'
  );

  // Match stats
  const [stats, setStats] = useState({ playerWins: 0, botWins: 0 });

  // Physics simulation references
  const piecesRef = useRef<Piece[]>([]);
  const [, setRenderTrigger] = useState(0);
  const pocketedThisShotRef = useRef<Piece[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const shotTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Current difficulty tier
  const currentTier: DifficultyTier =
    CARROM_DIFFICULTIES.find((d) => d.level === selectedLevel) || CARROM_DIFFICULTIES[3];

  const { submit } = useHighScore('carrom', currentTier.name);
  const { recordResult, resetSession } = useGameRecorder('carrom', currentTier.name);

  // Initialize or reset game
  const resetGame = useCallback(
    (startingSide: PlayerSide = 'player') => {
      resetSession();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (shotTimeoutRef.current) clearTimeout(shotTimeoutRef.current);
      if (botTimerRef.current) clearTimeout(botTimerRef.current);

      const initialPieces = createInitialBoard(startingSide);
      piecesRef.current = initialPieces;

      setCurrentTurn(startingSide);
      setTurnPhase('placement');
      setQueenStatus('on_board');
      setWinner(null);
      setStrikerX(BOARD_SIZE / 2);
      setAimAngle(startingSide === 'player' ? -Math.PI / 2 : Math.PI / 2);
      setShotPower(900);
      setBotAimData(null);
      pocketedThisShotRef.current = [];
      setLastNotification('Match started! Position striker along baseline, then tap Aim Shot.');
      setRenderTrigger((r) => r + 1);
    },
    [resetSession]
  );

  // Sound toggle
  const toggleSound = () => {
    const next = carromAudio.toggleSound();
    setSoundOn(next);
  };

  // Turn management: Run shot physics
  const executeShot = useCallback(
    (shooter: PlayerSide, baselineX: number, angle: number, power: number) => {
      const striker = piecesRef.current.find((p) => p.type === 'striker');
      if (!striker) return;

      // Position striker on baseline
      striker.x = baselineX;
      striker.y = shooter === 'player' ? BASELINE_Y_PLAYER : BASELINE_Y_BOT;
      striker.vx = Math.cos(angle) * power;
      striker.vy = Math.sin(angle) * power;
      striker.isPocketed = false;
      striker.isFalling = false;
      striker.fallScale = 1.0;
      striker.fallAlpha = 1.0;

      pocketedThisShotRef.current = [];
      setTurnPhase('settling');

      // Play flick sound
      carromAudio.playFlick(power / 1600);

      const startTime = performance.now();
      let lastTime = startTime;

      const physicsLoop = (currentTime: number) => {
        const delta = Math.min(0.04, (currentTime - lastTime) / 1000);
        lastTime = currentTime;

        // Step physics simulation
        const newlyPocketed = stepPhysics(piecesRef.current, delta || 1 / 60, false);
        for (const p of newlyPocketed) {
          pocketedThisShotRef.current.push(p);
        }

        // Force UI re-render
        setRenderTrigger((r) => r + 1);

        const elapsedTime = (currentTime - startTime) / 1000;
        const settled = arePiecesSettled(piecesRef.current) || elapsedTime > 11;

        if (settled) {
          // Force velocity clamp to 0
          for (const p of piecesRef.current) {
            p.vx = 0;
            p.vy = 0;
          }

          // Evaluate Shot Results using Carrom Rules
          const result = resolveShot(
            shooter,
            pocketedThisShotRef.current,
            queenStatus,
            piecesRef.current
          );

          setQueenStatus(result.nextQueenStatus);
          piecesRef.current = result.updatedPieces;

          // Notifications
          if (result.shotResult.foulReason) {
            setLastNotification(
              `${shooter === 'player' ? 'You' : 'Bot'} committed a FOUL (Striker Pocketed)! Turn lost${
                result.shotResult.penaltyReturned ? ' + 1 penalty piece returned' : ''
              }.`
            );
          } else if (result.shotResult.queenCovered) {
            setLastNotification(
              `👑 ${shooter === 'player' ? 'You' : 'Bot'} COVERED the Queen! (+3 bonus points)`
            );
          } else if (result.shotResult.queenReturnedToCenter) {
            setLastNotification('Queen was not covered and returned to the center.');
          } else if (result.shotResult.turnContinued) {
            setLastNotification(
              `Nice shot! ${shooter === 'player' ? 'You' : 'Bot'} pocketed a piece and keeps the turn.`
            );
          } else {
            setLastNotification('No piece pocketed. Turn passes to opponent.');
          }

          // Check Winner
          if (result.shotResult.winner) {
            setWinner(result.shotResult.winner);
            setTurnPhase('game_over');

            const finalScore = calculateScore(piecesRef.current, result.nextQueenStatus);
            if (result.shotResult.winner === 'player') {
              carromAudio.playWin();
              setStats((s) => ({ ...s, playerWins: s.playerWins + 1 }));
              submit(finalScore.playerScore);
              void recordResult({
                result: 'win',
                score: finalScore.playerScore,
                opponentType: 'bot',
                opponentName: currentTier.name,
                botDifficulty: currentTier.name,
              });
            } else {
              setStats((s) => ({ ...s, botWins: s.botWins + 1 }));
              void recordResult({
                result: 'loss',
                score: finalScore.playerScore,
                opponentType: 'bot',
                opponentName: currentTier.name,
                botDifficulty: currentTier.name,
              });
            }
            return;
          }

          // Prepare next turn
          const nextShooter = result.nextPlayer;
          setCurrentTurn(nextShooter);
          setTurnPhase('placement');

          // Reset striker position for next shooter
          const nextStriker = piecesRef.current.find((p) => p.type === 'striker');
          if (nextStriker) {
            nextStriker.x = BOARD_SIZE / 2;
            nextStriker.y = nextShooter === 'player' ? BASELINE_Y_PLAYER : BASELINE_Y_BOT;
            nextStriker.vx = 0;
            nextStriker.vy = 0;
            nextStriker.isPocketed = false;
            nextStriker.isFalling = false;
            nextStriker.fallScale = 1.0;
            nextStriker.fallAlpha = 1.0;
          }

          setStrikerX(BOARD_SIZE / 2);
          setAimAngle(nextShooter === 'player' ? -Math.PI / 2 : Math.PI / 2);
          setBotAimData(null);
          setRenderTrigger((r) => r + 1);
        } else {
          animFrameIdRef.current = requestAnimationFrame(physicsLoop);
        }
      };

      animFrameIdRef.current = requestAnimationFrame(physicsLoop);
    },
    [queenStatus, submit, recordResult, currentTier.name]
  );

  // Trigger Human Player Shot
  const handlePlayerShoot = useCallback(() => {
    if (currentTurn !== 'player' || turnPhase !== 'aiming') return;
    executeShot('player', strikerX, aimAngle, shotPower);
  }, [currentTurn, turnPhase, strikerX, aimAngle, shotPower, executeShot]);

  // Natural Bot Turn AI Loop
  useEffect(() => {
    if (mode !== 'bot' || currentTurn !== 'bot' || (turnPhase !== 'placement' && turnPhase !== 'aiming') || winner) {
      return;
    }

    // 1. Natural thinking delay
    const thinkDelay = 450 + Math.random() * 250;

    botTimerRef.current = setTimeout(() => {
      // Calculate bot move using difficulty engine
      const decision = computeBotMove(selectedLevel, piecesRef.current, queenStatus);

      // 2. Animate bot striker sliding along baseline
      const striker = piecesRef.current.find((p) => p.type === 'striker');
      const startX = striker ? striker.x : BOARD_SIZE / 2;
      const targetX = decision.baselineX;
      const slideDuration = 400; // ms
      const slideStart = performance.now();

      const animateSlide = (now: number) => {
        const elapsed = now - slideStart;
        const progress = Math.min(1, elapsed / slideDuration);
        const currentX = startX + (targetX - startX) * progress;

        if (striker) {
          striker.x = currentX;
          striker.y = BASELINE_Y_BOT;
        }
        setRenderTrigger((r) => r + 1);

        if (progress < 1) {
          requestAnimationFrame(animateSlide);
        } else {
          setTurnPhase('aiming');
          // 3. Show aiming ray and power charging preview
          const aimStart = performance.now();
          const aimDuration = 550;

          const animateAim = (aimNow: number) => {
            const aimElapsed = aimNow - aimStart;
            const aimProgress = Math.min(1, aimElapsed / aimDuration);

            setBotAimData({
              baselineX: targetX,
              aimAngle: decision.aimAngle,
              power: decision.power,
              progress: aimProgress,
            });

            if (aimProgress < 1) {
              requestAnimationFrame(animateAim);
            } else {
              // 4. Release shot!
              setBotAimData(null);
              executeShot('bot', targetX, decision.aimAngle, decision.power);
            }
          };

          requestAnimationFrame(animateAim);
        }
      };

      requestAnimationFrame(animateSlide);
    }, thinkDelay);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [mode, currentTurn, turnPhase, winner, selectedLevel, queenStatus, executeShot]);

  // Clean up animations on unmount
  useEffect(() => {
    const animId = animFrameIdRef;
    const timeoutId = shotTimeoutRef;
    const botId = botTimerRef;
    return () => {
      if (animId.current) cancelAnimationFrame(animId.current);
      if (timeoutId.current) clearTimeout(timeoutId.current);
      if (botId.current) clearTimeout(botId.current);
    };
  }, []);

  // Pre-Game Lobby Station
  if (mode === 'choose') {
    return (
      <div className="space-y-6">
        <FriendMatchStation
          gameId="carrom"
          onPlayBot={() => {
            resetGame('player');
            setMode('bot');
          }}
          botDifficultyComponent={
            <div className="space-y-4">
              <ArcadeDifficultySlider
                difficulties={CARROM_DIFFICULTIES_HARDEST_FIRST}
                selectedId={selectedLevel}
                onSelect={(lvl) => setSelectedLevel(Number(lvl))}
                title="Carrom Bot Difficulty"
              />

              {/* Bot Level Details Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-slate-300 font-mono flex items-center gap-1.5">
                    <Disc className="h-4 w-4 text-amber-400" />
                    7-Tier Precision Calibration
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {currentTier.badge} · {currentTier.name}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{currentTier.description}</p>
                {currentTier.depthOrDetail && (
                  <div className="mt-1 font-mono text-[11px] text-amber-400/90 flex items-center gap-1">
                    <span>⚡ AI Engine:</span> {currentTier.depthOrDetail}
                  </div>
                )}
              </div>
            </div>
          }
        />
      </div>
    );
  }

  // Calculate current scores
  const score = calculateScore(piecesRef.current, queenStatus);
  const isPlayerTurn = currentTurn === 'player';

  return (
    <div className="space-y-4 sm:space-y-6 animate-in">
      {/* Top Station Header */}
      <BotMatchHeader
        tier={currentTier}
        isBotThinking={currentTurn === 'bot' && !winner}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onExit={() => setMode('choose')}
        onRestart={() => resetGame('player')}
        statusText={
          winner
            ? winner === 'player'
              ? '🎉 Victory! You cleared the board and defeated the bot!'
              : 'Bot Won the match!'
            : isPlayerTurn
            ? 'Your Turn: Aim & Flick Striker'
            : `Bot (${currentTier.name}) is calculating shot...`
        }
        isGameOver={!!winner}
      />

      {/* Arcade Scoreboard HUD */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto">
        {/* Player Score Card */}
        <div
          className={`p-2.5 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
            isPlayerTurn && !winner
              ? 'bg-amber-500/10 border-amber-400/60 shadow-lg shadow-amber-500/10'
              : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <PlayerAvatar size="xs" />
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-slate-100 truncate">
                {playerName}
              </div>
              <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                <span>⚪ White</span>
                <span className="text-slate-400">({score.remainingWhite} left · {stats.playerWins}W)</span>
              </div>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 ml-2">
            {score.playerScore}
          </div>
        </div>

        {/* Center Queen Status Card */}
        <div className="p-2 sm:p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col justify-center items-center">
          <div className="text-[10px] uppercase font-bold text-slate-400 font-mono flex items-center gap-1">
            <span>👑 QUEEN</span>
          </div>
          <div className="mt-0.5">
            {queenStatus === 'on_board' && (
              <span className="text-[10px] sm:text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                🔴 On Board (+3)
              </span>
            )}
            {queenStatus === 'pending_cover_player' && (
              <span className="text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                ⏳ Cover Req. (You)
              </span>
            )}
            {queenStatus === 'pending_cover_bot' && (
              <span className="text-[10px] sm:text-xs font-bold text-orange-300 bg-orange-500/20 px-2 py-0.5 rounded-full border border-orange-500/40 animate-pulse">
                ⏳ Cover Req. (Bot)
              </span>
            )}
            {queenStatus === 'covered_player' && (
              <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                👑 Covered by You (+3)
              </span>
            )}
            {queenStatus === 'covered_bot' && (
              <span className="text-[10px] sm:text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
                👑 Covered by Bot (+3)
              </span>
            )}
          </div>
        </div>

        {/* Bot Score Card */}
        <div
          className={`p-2.5 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
            !isPlayerTurn && !winner
              ? 'bg-rose-500/10 border-rose-400/60 shadow-lg shadow-rose-500/10'
              : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="text-xl sm:text-2xl font-black text-rose-400 mr-2">
            {score.botScore}
          </div>
          <div className="flex items-center gap-2 min-w-0 text-right flex-row-reverse">
            <PlayerAvatar isBot size="xs" />
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-slate-100 truncate">
                Bot ({currentTier.name})
              </div>
              <div className="text-[10px] font-mono text-rose-400 flex items-center gap-1 justify-end">
                <span>⚫ Black</span>
                <span className="text-slate-400">({score.remainingBlack} left · {stats.botWins}W)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Board Arena */}
      <div className="flex flex-col items-center gap-4">
        <CarromBoard
          pieces={piecesRef.current}
          currentTurn={currentTurn}
          turnPhase={turnPhase}
          strikerX={strikerX}
          onStrikerXChange={setStrikerX}
          aimAngle={aimAngle}
          onAimAngleChange={setAimAngle}
          shotPower={shotPower}
          onShotPowerChange={setShotPower}
          onShoot={handlePlayerShoot}
          onLockPlacement={() => {
            setTurnPhase('aiming');
            setLastNotification('Aiming active! Pull back to flick, or adjust power slider and click Strike.');
          }}
          onReposition={() => {
            setTurnPhase('placement');
            setLastNotification('Position striker along your baseline.');
          }}
          botAimingData={botAimData}
          disabled={!isPlayerTurn || turnPhase === 'settling' || turnPhase === 'shooting' || !!winner}
        />

        {/* Live Notification Bar */}
        <div className="w-full max-w-[min(90vw,540px,68vh)] text-center text-xs font-mono text-slate-300 py-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          {lastNotification}
        </div>

        {/* Player Controls (Desktop + Mobile buttons) */}
        {isPlayerTurn && !winner && (
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
                  <span>Aim Shot 🎯</span>
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
                    onClick={handlePlayerShoot}
                    disabled={turnPhase === 'settling' || turnPhase === 'shooting'}
                    className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <span>STRIKE!</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Game Over Modal */}
      {winner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in">
          <div className="arcade-cabinet max-w-md w-full p-6 text-center space-y-4 border-2 border-amber-400/50 shadow-2xl shadow-amber-500/10 animate-pop">
            <div className="inline-flex p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
              <Trophy className="h-10 w-10 animate-bounce" />
            </div>

            <h3
              className="text-2xl font-black tracking-tight text-slate-100"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {winner === 'player' ? 'ARCADE VICTORY!' : 'MATCH DEFEAT'}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300">
              {winner === 'player'
                ? `Phenomenal performance! You defeated Bot on ${currentTier.name} difficulty.`
                : `Bot (${currentTier.name}) captured all pieces first. Calibrate your shots and try again!`}
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex justify-around">
              <div>
                <div className="text-slate-400">Your Score</div>
                <div className="text-lg font-bold text-amber-400">{score.playerScore}</div>
              </div>
              <div className="border-r border-slate-800" />
              <div>
                <div className="text-slate-400">Bot Score</div>
                <div className="text-lg font-bold text-rose-400">{score.botScore}</div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => resetGame('player')}
                className="flex-1 btn-primary py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Rematch</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="flex-1 btn-ghost py-2.5 text-xs font-bold uppercase tracking-wider"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
