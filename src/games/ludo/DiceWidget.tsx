import React from 'react';
import { Dices, Sparkles } from 'lucide-react';

type DiceWidgetProps = {
  diceValue: number | null;
  isRolling: boolean;
  onRoll: () => void;
  canRoll: boolean;
  isBotRolling: boolean;
  extraTurn: boolean;
};

export default function DiceWidget({
  diceValue,
  isRolling,
  onRoll,
  canRoll,
  isBotRolling,
  extraTurn,
}: DiceWidgetProps) {
  // SVG Pips for values 1-6
  const renderPips = (val: number) => {
    switch (val) {
      case 1:
        return <circle cx="20" cy="20" r="3.5" fill="#0f172a" />;
      case 2:
        return (
          <>
            <circle cx="12" cy="12" r="3" fill="#0f172a" />
            <circle cx="28" cy="28" r="3" fill="#0f172a" />
          </>
        );
      case 3:
        return (
          <>
            <circle cx="10" cy="10" r="3" fill="#0f172a" />
            <circle cx="20" cy="20" r="3" fill="#0f172a" />
            <circle cx="30" cy="30" r="3" fill="#0f172a" />
          </>
        );
      case 4:
        return (
          <>
            <circle cx="12" cy="12" r="3" fill="#0f172a" />
            <circle cx="28" cy="12" r="3" fill="#0f172a" />
            <circle cx="12" cy="28" r="3" fill="#0f172a" />
            <circle cx="28" cy="28" r="3" fill="#0f172a" />
          </>
        );
      case 5:
        return (
          <>
            <circle cx="11" cy="11" r="3" fill="#0f172a" />
            <circle cx="29" cy="11" r="3" fill="#0f172a" />
            <circle cx="20" cy="20" r="3" fill="#0f172a" />
            <circle cx="11" cy="29" r="3" fill="#0f172a" />
            <circle cx="29" cy="29" r="3" fill="#0f172a" />
          </>
        );
      case 6:
        return (
          <>
            <circle cx="12" cy="10" r="2.8" fill="#0f172a" />
            <circle cx="12" cy="20" r="2.8" fill="#0f172a" />
            <circle cx="12" cy="30" r="2.8" fill="#0f172a" />
            <circle cx="28" cy="10" r="2.8" fill="#0f172a" />
            <circle cx="28" cy="20" r="2.8" fill="#0f172a" />
            <circle cx="28" cy="30" r="2.8" fill="#0f172a" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
      {/* 3D Dice Graphic */}
      <div
        className={`w-14 h-14 rounded-2xl bg-amber-300 border-2 border-amber-200 shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all ${
          isRolling || isBotRolling ? 'animate-spin scale-105' : 'hover:scale-105'
        }`}
      >
        <svg viewBox="0 0 40 40" className="w-10 h-10">
          {diceValue ? renderPips(diceValue) : <circle cx="20" cy="20" r="4" fill="#0f172a" />}
        </svg>
      </div>

      <div className="flex-1">
        {extraTurn && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 mb-1 animate-pulse">
            <Sparkles className="h-3 w-3" /> Extra Turn!
          </span>
        )}

        {canRoll ? (
          <button
            type="button"
            onClick={onRoll}
            disabled={isRolling}
            className="btn-primary w-full py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <Dices className="h-4 w-4" />
            <span>{isRolling ? 'Rolling...' : 'Roll Dice'}</span>
          </button>
        ) : (
          <div className="text-xs font-bold text-slate-400">
            {isBotRolling ? (
              <span className="text-amber-400 font-mono flex items-center gap-1 animate-pulse">
                Bot is rolling dice...
              </span>
            ) : diceValue ? (
              <span className="text-slate-200">
                Rolled <strong className="text-amber-400 text-sm">{diceValue}</strong>! Select a token.
              </span>
            ) : (
              <span>Waiting for turn...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
