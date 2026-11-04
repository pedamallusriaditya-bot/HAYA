import { Cpu, AlertCircle, Sparkles, Check } from 'lucide-react';
import type { DifficultyTier } from './botConfigs';

type BotDifficultySelectorProps = {
  difficulties: DifficultyTier[];
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
  gameTitle?: string;
  isCompact?: boolean;
};

export default function BotDifficultySelector({
  difficulties,
  selectedLevel,
  onSelectLevel,
  gameTitle,
  isCompact = false,
}: BotDifficultySelectorProps) {
  const selectedTier = difficulties.find((d) => d.level === selectedLevel) || difficulties[0];

  if (isCompact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5 font-bold text-slate-200">
            <Cpu className="h-3.5 w-3.5 text-amber-400" />
            AI DIFFICULTY LEVEL:
          </span>
          <span className="font-bold text-amber-400">
            {selectedTier.badge} · {selectedTier.name}
          </span>
        </div>

        {/* Compact Horizontal Scroll / Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {difficulties.map((diff) => {
            const isSelected = diff.level === selectedLevel;
            return (
              <button
                key={diff.level}
                type="button"
                onClick={() => onSelectLevel(diff.level)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {diff.name}
              </button>
            );
          })}
        </div>

        {/* Compact Description & Honesty Box */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
          <p className="text-slate-300 leading-relaxed">{selectedTier.description}</p>
          {selectedTier.depthOrDetail && (
            <div className="mt-1.5 font-mono text-[11px] text-amber-400/90 flex items-center gap-1">
              <span>⚡ Strategy:</span> {selectedTier.depthOrDetail}
            </div>
          )}
          {selectedTier.honestyNote && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[11px] text-slate-400">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>{selectedTier.honestyNote}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <div className="token-badge !bg-amber-500/10 !border-amber-500/30 !text-amber-400 mb-1">
            <Sparkles className="h-3 w-3" />
            CALIBRATE BOT OPPONENT
          </div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span>{gameTitle ? `${gameTitle} AI Tiers` : 'Select AI Difficulty'}</span>
          </h3>
        </div>
        <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
          SELECTED: <strong className="text-amber-400">{selectedTier.badge} - {selectedTier.name}</strong>
        </div>
      </div>

      {/* Grid of difficulties (adaptive for 6 or 10 tiers) */}
      <div className={`grid gap-2.5 ${difficulties.length > 6 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {difficulties.map((diff) => {
          const isSelected = diff.level === selectedLevel;

          return (
            <button
              key={diff.level}
              type="button"
              onClick={() => onSelectLevel(diff.level)}
              className={`text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-amber-400 bg-amber-950/20 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className={`text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                    isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {diff.badge}
                  </span>
                  {isSelected && <Check className="h-4 w-4 text-amber-400" />}
                </div>

                <div className="font-bold text-slate-100 text-sm leading-snug">
                  {diff.name}
                </div>

                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {diff.description}
                </p>
              </div>

              {diff.depthOrDetail && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-amber-400/90 truncate">
                  {diff.depthOrDetail}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Tier Deep Detail Banner */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-amber-400" />
            Configured Strategy: <span className="text-amber-400">{selectedTier.name}</span>
          </span>
          <span className="font-mono text-[11px] text-slate-400">{selectedTier.depthOrDetail}</span>
        </div>
        <p className="text-slate-300">{selectedTier.description}</p>
        {selectedTier.honestyNote && (
          <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-amber-300/90">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="text-[11px]">{selectedTier.honestyNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}
