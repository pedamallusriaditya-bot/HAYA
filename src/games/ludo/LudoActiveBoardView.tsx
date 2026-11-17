import React from 'react';
import { Trophy } from 'lucide-react';
import type { AvatarConfig } from '@/types/avatar';
import {
  countTokensHome,
  type PlayerState,
  type LudoColor,
} from './engine';
import LudoBoard from './LudoBoard';
import PlayerDiceCard from './PlayerDiceCard';

type LudoActiveBoardViewProps = {
  players: PlayerState[];
  legalTokenIds: number[];
  currentTurn: LudoColor;
  onTokenClick: (tokenId: number) => void;
  isHumanTurn: boolean;
  winner: PlayerState | null;
  mode: string;
  onlineMyColor: LudoColor | null;
  activeRoll: number | null;
  isRolling: boolean;
  diceRolls: Record<LudoColor, number | null>;
  onRoll: () => void;
  extraTurn: boolean;
  myAvatar: AvatarConfig;
  friendAvatar?: AvatarConfig;
};

export default function LudoActiveBoardView({
  players,
  legalTokenIds,
  currentTurn,
  onTokenClick,
  isHumanTurn,
  winner,
  mode,
  onlineMyColor,
  activeRoll,
  isRolling,
  diceRolls,
  onRoll,
  extraTurn,
  myAvatar,
  friendAvatar,
}: LudoActiveBoardViewProps) {
  return (
    <div className="lg:flex lg:items-start lg:justify-center lg:gap-8 max-w-5xl mx-auto space-y-6 lg:space-y-0">
      {/* Ludo Board */}
      <div className="w-full max-w-[440px] sm:max-w-[480px] mx-auto shrink-0">
        <LudoBoard
          players={players}
          legalTokenIds={legalTokenIds}
          currentTurn={currentTurn}
          onTokenClick={onTokenClick}
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
            const avatarConfig = p.isBot ? undefined : isMe ? myAvatar : friendAvatar;

            return (
              <PlayerDiceCard
                key={p.color}
                player={p}
                isActiveTurn={isActive}
                isRolling={isActive && isRolling}
                lastRoll={diceRolls[p.color]}
                onRoll={onRoll}
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
  );
}
