import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp } from 'lucide-react';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';
import FriendMatchStation from '@/components/FriendMatchStation';
import ArcadeDifficultySlider from '@/components/common/ArcadeDifficultySlider';
import BotMatchHeader from '@/components/bot/BotMatchHeader';
import { SNAKES_DIFFICULTIES, type DifficultyTier } from '@/components/bot/botConfigs';
import DiceWidget from '@/games/ludo/DiceWidget';
import SnakesBoard from './SnakesBoard';
import { calculateMove } from './engine';
import { getBotRoll, generateTelemetry, type BotTelemetry } from './ai';

type GameMode = 'choose' | 'bot';

export default function SnakesGame() {
  const [mode, setMode] = useState<GameMode>('choose');
  const [selectedLevel, setSelectedLevel] = useState<number>(3); // Default Normal Level 3

  // Game state
  const [playerSquare, setPlayerSquare] = useState<number>(0);
  const [botSquare, setBotSquare] = useState<number>(0);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'bot'>('player');

  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [extraTurn, setExtraTurn] = useState(false);
  const [lastJump, setLastJump] = useState<{ from: number; to: number; type: 'ladder' | 'snake' } | null>(null);
  const [winner, setWinner] = useState<'player' | 'bot' | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  // Event feed log
  const [eventLogs, setEventLogs] = useState<string[]>([
    'Welcome to Snakes & Ladders! Roll the dice to enter the board.',
  ]);

  // Scoreboard
  const [stats, setStats] = useState({ playerWins: 0, botWins: 0 });

  const currentTier: DifficultyTier =
    SNAKES_DIFFICULTIES.find((d) => d.level === selectedLevel) || SNAKES_DIFFICULTIES[2];

  const { submit } = useHighScore('snakes', currentTier.name);
  const { recordResult, resetSession } = useGameRecorder('snakes', currentTier.name);

  const resetGame = useCallback(() => {
    resetSession();
    setPlayerSquare(0);
    setBotSquare(0);
    setCurrentTurn('player');
    setDiceValue(null);
    setIsRolling(false);
    setIsBotThinking(false);
    setExtraTurn(false);
    setLastJump(null);
    setWinner(null);
    setEventLogs(['Game started! You roll first. Reach square 100 to win!']);
    arcadeAudio.playCoin();
  }, [resetSession]);

  const addLog = (msg: string) => {
    setEventLogs((prev) => [msg, ...prev.slice(0, 5)]);
  };

  // Live telemetry (calculated when level >= 4)
  const telemetry: BotTelemetry = generateTelemetry(playerSquare, botSquare);

  // Handle Player Roll
  const handlePlayerRoll = useCallback(() => {
    if (isRolling || isBotThinking || currentTurn !== 'player' || winner) return;

    setIsRolling(true);
    arcadeAudio.playBlip();

    // Roll animation
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      setIsRolling(false);

      const moveRes = calculateMove(playerSquare, roll);

      // 1. Advance to intermediate square
      setPlayerSquare(moveRes.intermediateSquare);

      if (moveRes.bounced) {
        arcadeAudio.playMove(true);
        addLog(`🎲 You rolled ${roll}! Bounced off 100 back to ${moveRes.intermediateSquare}.`);
      } else {
        arcadeAudio.playMove(true);
        addLog(`🎲 You rolled ${roll} and moved to square ${moveRes.intermediateSquare}.`);
      }

      // 2. Check ladder or snake jump
      if (moveRes.jumpType) {
        setTimeout(() => {
          setPlayerSquare(moveRes.finalSquare);
          setLastJump({ from: moveRes.jumpFrom!, to: moveRes.jumpTo!, type: moveRes.jumpType! });

          if (moveRes.jumpType === 'ladder') {
            arcadeAudio.playWin();
            addLog(`🚀 LADDER BOOST! You climbed from ${moveRes.jumpFrom} to ${moveRes.jumpTo}!`);
          } else {
            arcadeAudio.playDraw();
            addLog(`🐍 SNAKE BITE! You slid down from ${moveRes.jumpFrom} to ${moveRes.jumpTo}!`);
          }
        }, 400);
      } else {
        setLastJump(null);
      }

      // 3. Check win condition
      if (moveRes.finalSquare === 100) {
        setTimeout(() => {
          setWinner('player');
          setStats((s) => ({ ...s, playerWins: s.playerWins + 1 }));
          arcadeAudio.playWin();
          addLog('🎉 CONGRATULATIONS! You reached square 100 and won the match!');
          submit(100);
          void recordResult({
            result: 'win',
            score: 100,
            opponentType: 'bot',
            opponentName: currentTier.name,
            botDifficulty: currentTier.name,
          });
        }, 500);
        return;
      }

      // 4. Extra turn on 6 or pass to bot
      if (moveRes.givesExtraTurn) {
        setExtraTurn(true);
        addLog('⭐ Roll of 6! You earn an extra turn!');
      } else {
        setExtraTurn(false);
        setCurrentTurn('bot');
      }
    }, 600);
  }, [isRolling, isBotThinking, currentTurn, winner, playerSquare, submit, currentTier.name, recordResult]);

  // Handle Bot Turn
  useEffect(() => {
    if (currentTurn !== 'bot' || winner || isBotThinking || mode !== 'bot') return;

    let isSubscribed = true;
    setIsBotThinking(true);

    const runBotTurn = async () => {
      const { roll, moveResult } = await getBotRoll(botSquare, selectedLevel);
      if (!isSubscribed) return;

      setIsRolling(true);
      setDiceValue(roll);
      arcadeAudio.playBlip();

      setTimeout(() => {
        if (!isSubscribed) return;
        setIsRolling(false);
        setIsBotThinking(false);

        // 1. Advance bot to intermediate
        setBotSquare(moveResult.intermediateSquare);

        if (moveResult.bounced) {
          arcadeAudio.playMove(false);
          addLog(`🤖 Bot rolled ${roll}! Bounced off 100 to ${moveResult.intermediateSquare}.`);
        } else {
          arcadeAudio.playMove(false);
          addLog(`🤖 Bot rolled ${roll} and moved to square ${moveResult.intermediateSquare}.`);
        }

        // 2. Check ladder or snake jump for bot
        if (moveResult.jumpType) {
          setTimeout(() => {
            if (!isSubscribed) return;
            setBotSquare(moveResult.finalSquare);
            setLastJump({ from: moveResult.jumpFrom!, to: moveResult.jumpTo!, type: moveResult.jumpType! });

            if (moveResult.jumpType === 'ladder') {
              arcadeAudio.playDraw();
              addLog(`🚀 Bot found a Ladder from ${moveResult.jumpFrom} up to ${moveResult.jumpTo}!`);
            } else {
              arcadeAudio.playDraw();
              addLog(`🐍 Bot hit a Snake from ${moveResult.jumpFrom} down to ${moveResult.jumpTo}!`);
            }
          }, 400);
        } else {
          setLastJump(null);
        }

        // 3. Check win condition
        if (moveResult.finalSquare === 100) {
          setTimeout(() => {
            if (!isSubscribed) return;
            setWinner('bot');
            setStats((s) => ({ ...s, botWins: s.botWins + 1 }));
            arcadeAudio.playDraw();
            addLog('🤖 CPU reached square 100 first. Better luck next roll!');
            void recordResult({
              result: 'loss',
              score: playerSquare,
              opponentType: 'bot',
              opponentName: currentTier.name,
              botDifficulty: currentTier.name,
            });
          }, 500);
          return;
        }

        // 4. Extra turn on 6 or pass back to player
        if (moveResult.givesExtraTurn) {
          setExtraTurn(true);
          addLog('⭐ Bot rolled a 6! Bot gets an extra turn!');
          // Bot will trigger again via useEffect
        } else {
          setExtraTurn(false);
          setCurrentTurn('player');
        }
      }, 600);
    };

    void runBotTurn();

    return () => {
      isSubscribed = false;
    };
  }, [currentTurn, winner, isBotThinking, mode, botSquare, selectedLevel, currentTier.name, playerSquare, recordResult]);

  const toggleSound = () => {
    const next = arcadeAudio.toggleSound();
    setSoundOn(next);
  };

  // Pre-game selection station
  if (mode === 'choose') {
    return (
      <div className="space-y-6">
        <FriendMatchStation
          gameId="snakes"
          onPlayBot={() => {
            resetGame();
            setMode('bot');
          }}
          botDifficultyComponent={
            <div className="space-y-4">
              <ArcadeDifficultySlider
                difficulties={SNAKES_DIFFICULTIES}
                selectedId={selectedLevel}
                onSelect={(lvl) => setSelectedLevel(Number(lvl))}
                title="Snakes & Ladders AI Difficulty"
              />
            </div>
          }
        />
      </div>
    );
  }

  const isPlayerTurn = currentTurn === 'player';

  return (
    <div className="space-y-6 animate-in">
      {/* Top Station Header */}
      <BotMatchHeader
        tier={currentTier}
        isBotThinking={isBotThinking}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onExit={() => setMode('choose')}
        onRestart={resetGame}
        statusText={
          winner === null
            ? isPlayerTurn
              ? 'Your Turn! Roll the dice.'
              : 'Bot is preparing roll...'
            : winner === 'player'
            ? '🎉 Victory! You reached square 100!'
            : '🤖 CPU Wins! Square 100 reached.'
        }
        isGameOver={winner !== null}
      />

      {/* Scoreboard & Position Tracker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-3 max-w-2xl mx-auto text-center font-mono">
        <div className="p-2 xs:p-3 rounded-xl sm:rounded-2xl bg-sky-500/10 border border-sky-400/40 text-sky-300">
          <div className="text-[10px] uppercase font-bold text-sky-400">Your Square</div>
          <div className="text-xl xs:text-2xl font-bold mt-0.5">{playerSquare}/100</div>
        </div>

        <div className="p-2 xs:p-3 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-400/40 text-rose-300">
          <div className="text-[10px] uppercase font-bold text-rose-400">Bot Square</div>
          <div className="text-xl xs:text-2xl font-bold mt-0.5">{botSquare}/100</div>
        </div>

        <div className="p-2 xs:p-3 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">You Won</div>
          <div className="text-xl xs:text-2xl font-bold mt-0.5 text-amber-400">{stats.playerWins}</div>
        </div>

        <div className="p-2 xs:p-3 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-300">
          <div className="text-[10px] uppercase font-bold text-slate-400">Bot Won</div>
          <div className="text-xl xs:text-2xl font-bold mt-0.5 text-slate-400">{stats.botWins}</div>
        </div>
      </div>

      {/* Advanced Markov Chain Analytical Telemetry (for Levels 4, 5, 6) */}
      {selectedLevel >= 4 && (
        <div className="max-w-2xl mx-auto p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950 border border-amber-400/30 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono mb-2">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider">
              <TrendingUp className="h-4 w-4" /> Markov Analytics
            </span>
            <span className="text-slate-400 text-[11px] sm:text-xs">
              Est. Turns Left: You {telemetry.playerExpectedTurns} | Bot {telemetry.botExpectedTurns}
            </span>
          </div>

          {/* Win Probability Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-sky-400 font-bold">You: {telemetry.playerWinPercent}%</span>
              <span className="text-rose-400 font-bold">Bot: {telemetry.botWinPercent}%</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
              <div
                className="bg-sky-500 transition-all duration-500"
                style={{ width: `${telemetry.playerWinPercent}%` }}
              />
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${telemetry.botWinPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Arcade Board */}
      <SnakesBoard
        playerSquare={playerSquare}
        botSquare={botSquare}
        lastJump={lastJump}
        activeTurn={currentTurn}
      />

      {/* Bottom Control Station: Dice Roller & Live Feed */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 max-w-2xl mx-auto items-center">
        {/* Dice Roller */}
        <div className="md:col-span-5 flex justify-center">
          <DiceWidget
            diceValue={diceValue}
            isRolling={isRolling}
            onRoll={handlePlayerRoll}
            canRoll={isPlayerTurn && !isBotThinking && winner === null}
            isBotRolling={isBotThinking}
            extraTurn={extraTurn}
          />
        </div>

        {/* Live Event Ticker Feed */}
        <div className="md:col-span-7 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1 max-h-32 sm:max-h-36 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold text-slate-500 border-b border-slate-900 pb-1 flex items-center justify-between">
            <span>Arcade Commentary</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>
          </div>
          {eventLogs.map((log, i) => (
            <div
              key={i}
              className={`py-0.5 leading-relaxed ${
                i === 0 ? 'text-slate-100 font-semibold text-[11px] sm:text-xs' : 'text-slate-500 text-[10px] sm:text-[11px]'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
