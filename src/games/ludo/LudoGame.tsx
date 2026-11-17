import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { useHighScore } from '@/lib/useHighScore';
import { useGameRecorder } from '@/lib/useGameRecorder';
import { useAuth } from '@/auth/AuthContext';
import { useMultiplayer } from '@/context/MultiplayerContext';
import { useRouter } from '@/router';
import { supabase } from '@/lib/supabase';
import BotMatchHeader from '@/components/bot/BotMatchHeader';
import { LUDO_DIFFICULTIES_HARDEST_FIRST, type DifficultyTier } from '@/components/bot/botConfigs';
import {
  createInitialTokens,
  getLegalMoves,
  executeMove,
  hasPlayerWon,
  getBotColors,
  COLOR_START_OFFSETS,
  applyRemoteMove,
  getNextTurnColor,
  createOnlineMatchPlayers,
  type PlayerState,
  type LudoColor,
} from './engine';
import { getLudoBotMove } from './ai';
import OnlineColorReservation from './OnlineColorReservation';
import { LudoChooseView, LudoOfflineConfigView } from './LudoSetupViews';
import LudoActiveBoardView from './LudoActiveBoardView';
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

  // Mutable refs to prevent stale closures inside long-lived Realtime channel subscriptions
  const onlineMyColorRef = useRef<LudoColor | null>(onlineMyColor);
  onlineMyColorRef.current = onlineMyColor;

  const onlineOpponentColorRef = useRef<LudoColor | null>(onlineOpponentColor);
  onlineOpponentColorRef.current = onlineOpponentColor;

  const handleRemoteMoveRef = useRef<
    (color: LudoColor, tokenId: number, roll: number, givesExtraTurn: boolean) => void
  >(() => {});
  const startOnlineMatchRef = useRef<(myCol: LudoColor, oppCol: LudoColor) => void>(() => {});

  const setInMatchStatusRef = useRef(setInMatchStatus);
  setInMatchStatusRef.current = setInMatchStatus;

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
  const profileId = profile?.id;
  const myName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';

  useEffect(() => {
    if (!matchId) return;

    setInMatchStatusRef.current(true, 'ludo');

    const ch = supabase.channel(`haya-match-${matchId}`, {
      config: {
        private: true,
        presence: { key: myName },
      },
    });

    matchChannelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const names = Object.keys(state);
      setOpponentConnected(names.some((n) => n !== myName));
    })
      .on('broadcast', { event: 'ludo_move' }, ({ payload }) => {
        const { color, tokenId, roll, givesExtraTurn } = payload;
        handleRemoteMoveRef.current(color, tokenId, roll, givesExtraTurn);
      })
      .on('broadcast', { event: 'ludo_roll' }, ({ payload }) => {
        const { color, roll } = payload;
        setDiceRolls((prev) => ({ ...prev, [color]: roll }));
        setActiveRoll(roll);
        arcadeAudio.playBlip();
      })
      .on('broadcast', { event: 'ludo_restart' }, () => {
        const myCol = onlineMyColorRef.current;
        const oppCol = onlineOpponentColorRef.current;
        if (myCol && oppCol) {
          startOnlineMatchRef.current(myCol, oppCol);
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
  }, [matchId, profileId, myName]);

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

      const { players: initPlayers, startingTurn } = createOnlineMatchPlayers(
        myCol,
        oppCol,
        activeMatch?.opponentName
      );

      setPlayers(initPlayers);
      setCurrentTurn(startingTurn);
      setDiceRolls({ red: null, green: null, yellow: null, blue: null });
      setActiveRoll(null);
      setIsRolling(false);
      setExtraTurn(false);
      setWinner(null);
      setMode('online_playing');
      arcadeAudio.playCoin();
    },
    [activeMatch?.opponentName, resetSession]
  );
  startOnlineMatchRef.current = startOnlineMatch;

  // Active player object
  const activePlayer = players.find((p) => p.color === currentTurn);
  const otherPlayers = players.filter((p) => p.color !== currentTurn);

  // Legal moves for currently active roll (memoized to avoid unstable dependency in useEffect)
  const legalTokenIds = useMemo(() => {
    if (activeRoll === null || winner !== null || !activePlayer) {
      return [];
    }
    return getLegalMoves(activePlayer, activeRoll);
  }, [activeRoll, winner, activePlayer]);

  // Advance turn to the next active player in the match
  const advanceTurn = useCallback(
    (currentCol: LudoColor, activePlayers: PlayerState[]) => {
      const nextColor = getNextTurnColor(currentCol, activePlayers);

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
        const { nextPlayers, isWinningMove, winner: victor } = applyRemoteMove(
          prev,
          color,
          tokenId,
          roll
        );
        if (isWinningMove && victor) {
          isOpponentVictorious = true;
          wonActor = victor;
        }
        return nextPlayers;
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
  handleRemoteMoveRef.current = handleRemoteMove;

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

  const handleRestartMatch = useCallback(() => {
    if (mode === 'online_playing') {
      if (onlineMyColor && onlineOpponentColor) {
        startOnlineMatch(onlineMyColor, onlineOpponentColor);
        if (matchChannelRef.current) {
          void matchChannelRef.current.send({
            type: 'broadcast',
            event: 'ludo_restart',
            payload: {},
          });
        }
      }
    } else {
      startOfflineMatch();
    }
  }, [mode, onlineMyColor, onlineOpponentColor, startOnlineMatch, startOfflineMatch]);

  const toggleSound = () => {
    const next = arcadeAudio.toggleSound();
    setSoundOn(next);
  };

  // 1. PRE-GAME SELECTION & ONLINE INVITATION LOBBY
  if (mode === 'choose') {
    return <LudoChooseView onConfigureOffline={() => setMode('offline_config')} />;
  }

  // 2. OFFLINE MATCH CONFIGURATION SCREEN
  if (mode === 'offline_config') {
    return (
      <LudoOfflineConfigView
        botCount={botCount}
        setBotCount={setBotCount}
        humanColor={humanColor}
        setHumanColor={setHumanColor}
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        onStartMatch={startOfflineMatch}
        onBack={() => setMode('choose')}
      />
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
        onRestart={handleRestartMatch}
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
              onClick={handleRestartMatch}
              className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Rematch
            </button>
          </div>
        </div>
      )}

      {/* Main Board & Players Layout */}
      <LudoActiveBoardView
        players={players}
        legalTokenIds={legalTokenIds}
        currentTurn={currentTurn}
        onTokenClick={handleTokenMove}
        isHumanTurn={isHumanTurn}
        winner={winner}
        mode={mode}
        onlineMyColor={onlineMyColor}
        activeRoll={activeRoll}
        isRolling={isRolling}
        diceRolls={diceRolls}
        onRoll={rollDice}
        extraTurn={extraTurn}
        myAvatar={myAvatar}
        friendAvatar={friend?.avatar}
      />
    </div>
  );
}
