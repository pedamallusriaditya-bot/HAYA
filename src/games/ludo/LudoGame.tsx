import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Trophy, Play, ArrowLeft } from 'lucide-react';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';
import { useAuth } from '@/auth/AuthContext';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { useRouter } from '@/router';
import { supabase } from '@/lib/supabase';
import FriendMatchStation from '@/components/FriendMatchStation';
import BotMatchHeader from '@/components/bot/BotMatchHeader';
import ArcadeDifficultySlider from '@/components/common/ArcadeDifficultySlider';
import { LUDO_DIFFICULTIES, LUDO_DIFFICULTIES_HARDEST_FIRST, type DifficultyTier } from '@/components/bot/botConfigs';
import {
  createInitialTokens,
  getLegalMoves,
  executeMove,
  hasPlayerWon,
  countTokensHome,
  getBotColors,
  COLOR_START_OFFSETS,
  type PlayerState,
  type LudoColor,
} from './engine';
import { getLudoBotMove } from './ai';
import LudoBoard from './LudoBoard';
import PlayerDiceCard from './PlayerDiceCard';
import OnlineColorReservation from './OnlineColorReservation';
import { getCachedAvatar } from '@/lib/avatarStorage';

type GameMode = 'choose' | 'offline_config' | 'playing' | 'online_reservation' | 'online_playing';

export default function LudoGame() {
  const { profile } = useAuth();
  const { path } = useRouter();
  const { activeMatch, exitActiveMatch, setInMatchStatus, friend } = useMultiplayer();

  const rawName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
  const playerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const myAvatar = getCachedAvatar(profile?.email || '', playerName);

  // Mode & Configuration state
  const [mode, setMode] = useState<GameMode>('choose');
  const [selectedLevel, setSelectedLevel] = useState<number>(3); // Default Normal Level 3
  const [botCount, setBotCount] = useState<1 | 2 | 3>(1);
  const [humanColor, setHumanColor] = useState<LudoColor>('red');

  // Match players state
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [currentTurn, setCurrentTurn] = useState<LudoColor>('red');

  // Individual dice states for each player (preserves each player's last roll)
  const [diceRolls, setDiceRolls] = useState<Record<LudoColor, number | null>>({
    red: null,
    green: null,
    yellow: null,
    blue: null,
  });

  const [activeRoll, setActiveRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [extraTurn, setExtraTurn] = useState(false);
  const [winner, setWinner] = useState<PlayerState | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  // Online Multiplayer State
  const [onlineMyColor, setOnlineMyColor] = useState<LudoColor | null>(null);
  const [onlineOpponentColor, setOnlineOpponentColor] = useState<LudoColor | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchChannelRef = useRef<any>(null);

  // Check if active match from invitation or URL query parameter
  const matchId = activeMatch?.matchId || (path.includes('match=') ? path.split('match=')[1]?.split('&')[0] : null);

  const currentTier: DifficultyTier =
    LUDO_DIFFICULTIES_HARDEST_FIRST.find((d) => d.level === selectedLevel) ||
    LUDO_DIFFICULTIES_HARDEST_FIRST[3];

  const { submit } = useHighScore('ludo', currentTier.name);
  const { recordResult, resetSession } = useGameRecorder('ludo', currentTier.name);

  // Detect incoming online match routing
  useEffect(() => {
    if (matchId) {
      setMode('online_reservation');
    }
  }, [matchId]);

  // Online Realtime match channel subscription
  useEffect(() => {
    if (!matchId) return;

    setInMatchStatus(true, 'ludo');
    const myName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';

    const ch = supabase.channel(`haya-match-${matchId}`, {
      config: { presence: { key: myName } },
    });

    matchChannelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const names = Object.keys(state);
      setOpponentConnected(names.some((n) => n !== myName));
    })
      .on('broadcast', { event: 'ludo_move' }, ({ payload }) => {
        const { color, tokenId, roll, givesExtraTurn } = payload;
        handleRemoteMove(color, tokenId, roll, givesExtraTurn);
      })
      .on('broadcast', { event: 'ludo_roll' }, ({ payload }) => {
        const { color, roll } = payload;
        setDiceRolls((prev) => ({ ...prev, [color]: roll }));
        setActiveRoll(roll);
        arcadeAudio.playBlip();
      })
      .on('broadcast', { event: 'ludo_restart' }, () => {
        if (onlineMyColor && onlineOpponentColor) {
          startOnlineMatch(onlineMyColor, onlineOpponentColor);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void ch.track({ joined_at: Date.now() });
        }
      });

    return () => {
      void ch.unsubscribe();
      matchChannelRef.current = null;
    };
  }, [matchId, profile, setInMatchStatus]);

  // Build active player states for offline match based on chosen color and bot count
  const buildOfflinePlayers = useCallback(
    (hColor: LudoColor, bCount: 1 | 2 | 3): PlayerState[] => {
      const botColors = getBotColors(hColor, bCount);

      const humanPlayer: PlayerState = {
        color: hColor,
        name: `You (${hColor.toUpperCase()})`,
        isBot: false,
        tokens: createInitialTokens(),
        startTrackIndex: COLOR_START_OFFSETS[hColor],
      };

      const botPlayers: PlayerState[] = botColors.map((bColor, idx) => ({
        color: bColor,
        name: `Bot ${idx + 1} (${bColor.toUpperCase()})`,
        isBot: true,
        tokens: createInitialTokens(),
        startTrackIndex: COLOR_START_OFFSETS[bColor],
      }));

      return [humanPlayer, ...botPlayers];
    },
    []
  );

  // Initialize and start an offline match
  const startOfflineMatch = useCallback(() => {
    resetSession();
    const newPlayers = buildOfflinePlayers(humanColor, botCount);
    setPlayers(newPlayers);
    setCurrentTurn(humanColor); // Human starts
    setDiceRolls({ red: null, green: null, yellow: null, blue: null });
    setActiveRoll(null);
    setIsRolling(false);
    setIsBotThinking(false);
    setExtraTurn(false);
    setWinner(null);
    setMode('playing');
    arcadeAudio.playCoin();
  }, [humanColor, botCount, buildOfflinePlayers, resetSession]);

  // Start online 2-player match with authoritatively reserved colors
  const startOnlineMatch = useCallback(
    (myCol: LudoColor, oppCol: LudoColor) => {
      resetSession();
      setOnlineMyColor(myCol);
      setOnlineOpponentColor(oppCol);

      const p1: PlayerState = {
        color: myCol,
        name: `You (${myCol.toUpperCase()})`,
        isBot: false,
        tokens: createInitialTokens(),
        startTrackIndex: COLOR_START_OFFSETS[myCol],
      };

      const p2: PlayerState = {
        color: oppCol,
        name: `${activeMatch?.opponentName || 'Opponent'} (${oppCol.toUpperCase()})`,
        isBot: false,
        tokens: createInitialTokens(),
        startTrackIndex: COLOR_START_OFFSETS[oppCol],
      };

      // Standard starting turn is red if present, or host
      const startingTurn = myCol === 'red' ? myCol : oppCol === 'red' ? oppCol : myCol;

      setPlayers([p1, p2]);
      setCurrentTurn(startingTurn);
      setDiceRolls({ red: null, green: null, yellow: null, blue: null });
      setActiveRoll(null);
      setIsRolling(false);
      setExtraTurn(false);
      setWinner(null);
      setMode('online_playing');
      arcadeAudio.playCoin();
    },
    [activeMatch]
  );

  // Active player object
  const activePlayer = players.find((p) => p.color === currentTurn);
  const otherPlayers = players.filter((p) => p.color !== currentTurn);

  // Legal moves for currently active roll
  const legalTokenIds =
    activeRoll !== null && winner === null && activePlayer
      ? getLegalMoves(activePlayer, activeRoll)
      : [];

  // Advance turn to the next active player in the match
  const advanceTurn = useCallback(
    (currentCol: LudoColor, activePlayers: PlayerState[]) => {
      const idx = activePlayers.findIndex((p) => p.color === currentCol);
      const nextIdx = (idx + 1) % activePlayers.length;
      const nextColor = activePlayers[nextIdx].color;

      setActiveRoll(null);
      setExtraTurn(false);
      setCurrentTurn(nextColor);
    },
    []
  );

  // Roll the dice for active player
  const rollDice = useCallback(() => {
    if (activeRoll !== null || isRolling || winner !== null || !activePlayer) return;

    setIsRolling(true);
    arcadeAudio.playMove(currentTurn === humanColor);

    setTimeout(() => {
      // 100% fair random roll (1-6)
      const roll = Math.floor(Math.random() * 6) + 1;

      // Update individual player's dice display without overwriting others' last rolls
      setDiceRolls((prev) => ({ ...prev, [currentTurn]: roll }));
      setActiveRoll(roll);
      setIsRolling(false);

      // Broadcast in online mode
      if (mode === 'online_playing' && matchChannelRef.current) {
        void matchChannelRef.current.send({
          type: 'broadcast',
          event: 'ludo_roll',
          payload: { color: currentTurn, roll },
        });
      }

      // Check if any legal moves are possible
      const moves = getLegalMoves(activePlayer, roll);
      if (moves.length === 0) {
        // No moves possible -> turn advances after brief pause
        setTimeout(() => {
          advanceTurn(currentTurn, players);
        }, 800);
      }
    }, 450);
  }, [activeRoll, isRolling, winner, activePlayer, currentTurn, humanColor, mode, advanceTurn, players]);

  // Execute a local token move
  const handleTokenMove = useCallback(
    (tokenId: number) => {
      if (activeRoll === null || winner !== null || !activePlayer) return;

      const playerClone: PlayerState = {
        ...activePlayer,
        tokens: activePlayer.tokens.map((t) => ({ ...t })),
      };

      const othersClone = otherPlayers.map((p) => ({
        ...p,
        tokens: p.tokens.map((t) => ({ ...t })),
      }));

      const result = executeMove(playerClone, othersClone, tokenId, activeRoll);

      const nextPlayers = players.map((p) => {
        if (p.color === playerClone.color) return playerClone;
        const updatedOther = othersClone.find((o) => o.color === p.color);
        return updatedOther || p;
      });

      setPlayers(nextPlayers);
      arcadeAudio.playMove(currentTurn === humanColor);

      // Broadcast move in online mode
      if (mode === 'online_playing' && matchChannelRef.current) {
        void matchChannelRef.current.send({
          type: 'broadcast',
          event: 'ludo_move',
          payload: {
            color: currentTurn,
            tokenId,
            roll: activeRoll,
            givesExtraTurn: result.givesExtraTurn,
            reachedHome: result.reachedHome,
          },
        });
      }

      // Check Victory
      if (hasPlayerWon(playerClone)) {
        setWinner(playerClone);
        const isOnline = mode === 'online_playing';
        const isUserWinner = isOnline
          ? playerClone.color === onlineMyColor
          : !playerClone.isBot;

        if (isUserWinner) {
          submit(1);
          arcadeAudio.playWin();
        } else {
          arcadeAudio.playDraw();
        }

        const oppName = isOnline ? (activeMatch?.opponentName || 'Online Player') : currentTier.name;
        void recordResult({
          result: isUserWinner ? 'win' : 'loss',
          score: isUserWinner ? 1 : 0,
          mode: isOnline ? 'multi' : 'bot',
          opponentType: isOnline ? 'human' : 'bot',
          opponentName: oppName,
          botDifficulty: isOnline ? null : currentTier.name,
          matchId: isOnline && matchId ? matchId : undefined,
        });
        return;
      }

      // Handle extra turn or advance
      if (result.givesExtraTurn) {
        setActiveRoll(null);
        setExtraTurn(true);
      } else {
        advanceTurn(currentTurn, players);
      }
    },
    [activeRoll, winner, activePlayer, otherPlayers, players, currentTurn, humanColor, mode, submit, advanceTurn, onlineMyColor, activeMatch?.opponentName, currentTier.name, matchId, recordResult]
  );

  // Handle move received from remote online opponent
  const handleRemoteMove = useCallback(
    (
      color: LudoColor,
      tokenId: number,
      roll: number,
      givesExtraTurn: boolean
    ) => {
      let isOpponentVictorious = false;
      let wonActor: PlayerState | null = null;

      setPlayers((prev) => {
        const actor = prev.find((p) => p.color === color);
        if (!actor) return prev;

        const actorClone = { ...actor, tokens: actor.tokens.map((t) => ({ ...t })) };
        const othersClone = prev
          .filter((p) => p.color !== color)
          .map((p) => ({ ...p, tokens: p.tokens.map((t) => ({ ...t })) }));

        executeMove(actorClone, othersClone, tokenId, roll);

        if (hasPlayerWon(actorClone)) {
          isOpponentVictorious = true;
          wonActor = actorClone;
        }

        return prev.map((p) => {
          if (p.color === color) return actorClone;
          const updatedOther = othersClone.find((o) => o.color === p.color);
          return updatedOther || p;
        });
      });

      if (isOpponentVictorious && wonActor) {
        setWinner(wonActor);
        arcadeAudio.playDraw();
        void recordResult({
          result: 'loss',
          score: 0,
          mode: 'multi',
          opponentType: 'human',
          opponentName: activeMatch?.opponentName || 'Online Player',
          botDifficulty: null,
          matchId: matchId || undefined,
        });
        return;
      }

      arcadeAudio.playMove(false);

      if (givesExtraTurn) {
        setActiveRoll(null);
        setExtraTurn(true);
      } else {
        setPlayers((currentPlayers) => {
          advanceTurn(color, currentPlayers);
          return currentPlayers;
        });
      }
    },
    [advanceTurn, activeMatch?.opponentName, matchId, recordResult]
  );

  // Bot Turn Automation (Deterministic & strict; NO temporary rolling messages)
  useEffect(() => {
    if (mode !== 'playing') return;
    if (winner !== null || !activePlayer || !activePlayer.isBot) return;

    let isSubscribed = true;

    // 1. If dice not yet rolled, bot rolls dice automatically
    if (activeRoll === null && !isRolling) {
      setIsBotThinking(true);
      const timer = setTimeout(() => {
        if (!isSubscribed) return;
        rollDice();
      }, 550);
      return () => {
        isSubscribed = false;
        clearTimeout(timer);
      };
    }

    // 2. If dice rolled, bot chooses best candidate move
    if (activeRoll !== null && legalTokenIds.length > 0) {
      setIsBotThinking(true);
      getLudoBotMove(activePlayer, otherPlayers, legalTokenIds, activeRoll, selectedLevel)
        .then((chosenId) => {
          if (!isSubscribed) return;
          if (chosenId !== -1) {
            handleTokenMove(chosenId);
          }
          setIsBotThinking(false);
        })
        .catch(() => {
          if (isSubscribed) setIsBotThinking(false);
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [
    mode,
    winner,
    activePlayer,
    otherPlayers,
    activeRoll,
    isRolling,
    legalTokenIds,
    selectedLevel,
    rollDice,
    handleTokenMove,
  ]);

  const toggleSound = () => {
    const next = arcadeAudio.toggleSound();
    setSoundOn(next);
  };

  // 1. PRE-GAME SELECTION & ONLINE INVITATION LOBBY
  if (mode === 'choose') {
    return (
      <div className="space-y-6">
        <FriendMatchStation
          gameId="ludo"
          onPlayBot={() => {
            setMode('offline_config');
          }}
          botDifficultyComponent={
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Offline Custom Match
                </span>
                <p className="text-xs text-slate-400 mb-3">
                  Play with 1, 2, or 3 bots and customize your color and bot difficulty.
                </p>
                <button
                  type="button"
                  onClick={() => setMode('offline_config')}
                  className="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" /> Configure Match &amp; Difficulty
                </button>
              </div>
            </div>
          }
        />
      </div>
    );
  }

  // 2. OFFLINE MATCH CONFIGURATION SCREEN
  if (mode === 'offline_config') {
    const botColorsPreview = getBotColors(humanColor, botCount);

    return (
      <div className="arcade-cabinet p-6 sm:p-8 max-w-2xl mx-auto space-y-6 animate-in border-2 border-slate-700/80">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setMode('choose')}
            className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Lobby
          </button>
          <div className="token-badge">OFFLINE MATCH SETUP</div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Configure Ludo Match
          </h2>
          <p className="text-xs text-slate-400">
            Choose your player color, number of bot opponents, and AI difficulty tier.
          </p>
        </div>

        {/* 1. Choose Number of Bots */}
        <div className="space-y-2">
          <label className="text-xs uppercase font-bold tracking-wider text-slate-300 block">
            Number of Bot Opponents
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3].map((num) => {
              const isSelected = botCount === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setBotCount(num as 1 | 2 | 3)}
                  className={`p-3 rounded-xl border-2 text-center transition-all select-none ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/30 text-amber-300 ring-1 ring-amber-400 font-black shadow-md'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="block text-base">{num} {num === 1 ? 'Bot' : 'Bots'}</span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    {num + 1} Players Total
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Choose Human Color */}
        <div className="space-y-2">
          <label className="text-xs uppercase font-bold tracking-wider text-slate-300 block">
            Your Player Color
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map((c) => {
              const isSelected = humanColor === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setHumanColor(c)}
                  className={`p-3 rounded-xl border-2 text-center transition-all select-none flex flex-col items-center gap-1.5 ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/30 ring-1 ring-amber-400 shadow-md'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 opacity-80'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full ${
                      c === 'red'
                        ? 'bg-rose-500 shadow-rose-500/50'
                        : c === 'green'
                        ? 'bg-emerald-500 shadow-emerald-500/50'
                        : c === 'yellow'
                        ? 'bg-amber-400 shadow-amber-500/50'
                        : 'bg-sky-500 shadow-sky-500/50'
                    } shadow-md`}
                  />
                  <span className={`text-xs font-bold uppercase ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                    {c}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Match Player Roster Preview */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
          <span className="text-[11px] font-mono uppercase font-bold text-slate-400 block">
            Match Player Roster ({botCount + 1} Active Players):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Human */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  humanColor === 'red'
                    ? 'bg-rose-500'
                    : humanColor === 'green'
                    ? 'bg-emerald-500'
                    : humanColor === 'yellow'
                    ? 'bg-amber-400'
                    : 'bg-sky-500'
                }`}
              />
              <div className="truncate">
                <span className="font-bold text-xs text-slate-100 block truncate">You</span>
                <span className="text-[9px] font-mono text-amber-400">HUMAN</span>
              </div>
            </div>

            {/* Assigned Bots */}
            {botColorsPreview.map((bColor, idx) => (
              <div
                key={bColor}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2"
              >
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    bColor === 'red'
                      ? 'bg-rose-500'
                      : bColor === 'green'
                      ? 'bg-emerald-500'
                      : bColor === 'yellow'
                      ? 'bg-amber-400'
                      : 'bg-sky-500'
                  }`}
                />
                <div className="truncate">
                  <span className="font-bold text-xs text-slate-300 block truncate">
                    Bot {idx + 1}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">AI</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Arcade Difficulty Slider */}
        <ArcadeDifficultySlider
          difficulties={LUDO_DIFFICULTIES}
          selectedId={selectedLevel}
          onSelect={(lvl) => setSelectedLevel(Number(lvl))}
          title="Ludo Bot Difficulty"
        />

        {/* Start Match Action */}
        <button
          type="button"
          onClick={startOfflineMatch}
          className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
        >
          <Play className="h-4 w-4" /> Start Ludo Match ({botCount + 1} Players)
        </button>
      </div>
    );
  }

  // 3. ONLINE COLOR RESERVATION SCREEN
  if (mode === 'online_reservation') {
    const myName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
    const myEmail = profile?.email || '';
    const oppName = activeMatch?.opponentName || 'Friend';

    return (
      <OnlineColorReservation
        matchId={matchId || 'match_ludo_default'}
        myEmail={myEmail}
        myName={myName}
        opponentName={oppName}
        opponentConnected={opponentConnected}
        channel={matchChannelRef.current}
        onBothReady={(myCol, oppCol) => {
          startOnlineMatch(myCol, oppCol);
        }}
      />
    );
  }

  // 4. GAMEPLAY (OFFLINE OR ONLINE)
  const isHumanTurn =
    mode === 'online_playing'
      ? currentTurn === onlineMyColor
      : currentTurn === humanColor;

  return (
    <div className="space-y-6 animate-in">
      {/* Top Station Header */}
      <BotMatchHeader
        tier={currentTier}
        isBotThinking={isBotThinking}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onExit={() => {
          if (mode === 'online_playing') {
            exitActiveMatch();
          }
          setMode('choose');
        }}
        onRestart={() => {
          if (mode === 'online_playing') {
            if (onlineMyColor && onlineOpponentColor) {
              startOnlineMatch(onlineMyColor, onlineOpponentColor);
            }
          } else {
            startOfflineMatch();
          }
        }}
        statusText={
          winner !== null
            ? `🎉 Game Finished! ${winner.name} won!`
            : isHumanTurn
            ? activeRoll === null
              ? 'Your Turn: Roll your dice!'
              : legalTokenIds.length > 0
              ? 'Select a pulsing token to advance'
              : 'No legal moves for this roll'
            : `${activePlayer?.name || 'Player'} is taking their turn...`
        }
        isGameOver={winner !== null}
      />

      {/* Match Concluded Banner */}
      {winner !== null && (
        <div className="arcade-cabinet p-5 border-2 border-amber-400 text-center space-y-3 animate-pop max-w-md mx-auto">
          <span className="token-badge !bg-amber-500/10 !border-amber-500/30 !text-amber-400">
            MATCH CONCLUDED
          </span>
          <h3 className="text-xl font-bold text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {!winner.isBot ? '🎉 VICTORY! All tokens home!' : `${winner.name} Won!`}
          </h3>
          <p className="text-xs text-slate-400">
            All 4 tokens for {winner.name} returned to the center goal first.
          </p>
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => {
                if (mode === 'online_playing') {
                  if (onlineMyColor && onlineOpponentColor) {
                    startOnlineMatch(onlineMyColor, onlineOpponentColor);
                  }
                } else {
                  startOfflineMatch();
                }
              }}
              className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Rematch
            </button>
          </div>
        </div>
      )}

      {/* Main Board & Players Layout */}
      <div className="lg:flex lg:items-start lg:justify-center lg:gap-8 max-w-5xl mx-auto space-y-6 lg:space-y-0">
        {/* Ludo Board */}
        <div className="w-full max-w-[440px] sm:max-w-[480px] mx-auto shrink-0">
          <LudoBoard
            players={players}
            legalTokenIds={legalTokenIds}
            currentTurn={currentTurn}
            onTokenClick={handleTokenMove}
            disabled={winner !== null || !isHumanTurn}
          />
        </div>

        {/* Active Players & Individual Dice Cards */}
        <div className="w-full max-w-[440px] sm:max-w-[480px] lg:max-w-[360px] mx-auto space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span className="uppercase font-bold tracking-wider">Active Player Stations</span>
            <span>{players.length} Active</span>
          </div>

          <div className={players.length <= 2 ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2' : 'grid grid-cols-2 lg:grid-cols-1 gap-2'}>
            {players.map((p) => {
              const isActive = currentTurn === p.color;
              const isMe = mode === 'online_playing' ? p.color === onlineMyColor : !p.isBot;
              const canPlayerRoll = isActive && isMe && activeRoll === null && !isRolling && winner === null;
              const avatarConfig = p.isBot ? undefined : isMe ? myAvatar : friend?.avatar;

              return (
                <PlayerDiceCard
                  key={p.color}
                  player={p}
                  isActiveTurn={isActive}
                  isRolling={isActive && isRolling}
                  lastRoll={diceRolls[p.color]}
                  onRoll={rollDice}
                  canRoll={canPlayerRoll}
                  extraTurn={isActive && extraTurn}
                  tokensHome={countTokensHome(p)}
                  avatar={avatarConfig}
                />
              );
            })}
          </div>

          {/* Quick Rules Reminder */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Roll a 6 to release from yard. Landing on opponent tokens captures them!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
