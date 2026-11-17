import React from 'react';
import { Play, ArrowLeft } from 'lucide-react';
import FriendMatchStation from '@/components/FriendMatchStation';
import ArcadeDifficultySlider from '@/components/common/ArcadeDifficultySlider';
import { LUDO_DIFFICULTIES } from '@/components/bot/botConfigs';
import { getBotColors, type LudoColor } from './engine';

export function LudoChooseView({
  onConfigureOffline,
}: {
  onConfigureOffline: () => void;
}) {
  return (
    <div className="space-y-6">
      <FriendMatchStation
        gameId="ludo"
        onPlayBot={onConfigureOffline}
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
                onClick={onConfigureOffline}
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

export function LudoOfflineConfigView({
  botCount,
  setBotCount,
  humanColor,
  setHumanColor,
  selectedLevel,
  setSelectedLevel,
  onStartMatch,
  onBack,
}: {
  botCount: 1 | 2 | 3;
  setBotCount: (n: 1 | 2 | 3) => void;
  humanColor: LudoColor;
  setHumanColor: (c: LudoColor) => void;
  selectedLevel: number;
  setSelectedLevel: (lvl: number) => void;
  onStartMatch: () => void;
  onBack: () => void;
}) {
  const botColorsPreview = getBotColors(humanColor, botCount);

  return (
    <div className="arcade-cabinet p-6 sm:p-8 max-w-2xl mx-auto space-y-6 animate-in border-2 border-slate-700/80">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={onBack}
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
        onClick={onStartMatch}
        className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20"
      >
        <Play className="h-4 w-4" /> Start Ludo Match ({botCount + 1} Players)
      </button>
    </div>
  );
}
