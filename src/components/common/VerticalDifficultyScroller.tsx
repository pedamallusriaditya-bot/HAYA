import React, { useRef, useEffect } from 'react';
import { Cpu, Check, AlertCircle } from 'lucide-react';
import type { DifficultyTier } from '../bot/botConfigs';

export type UniversalDifficultyItem = {
  level?: number;
  id: string | number;
  name: string;
  badge?: string;
  color?: string;
  description?: string;
  depthOrDetail?: string;
  honestyNote?: string;
};

type VerticalDifficultyScrollerProps = {
  difficulties: (DifficultyTier | UniversalDifficultyItem)[];
  selectedId: string | number;
  onSelect: (id: string | number) => void;
  title?: string;
  maxHeight?: string;
  compact?: boolean;
};

export default function VerticalDifficultyScroller({
  difficulties,
  selectedId,
  onSelect,
  title,
  maxHeight = 'max-h-[360px]',
  compact = false,
}: VerticalDifficultyScrollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll selected item into view on mount or when selection changes
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedId]);

  const selectedItem = difficulties.find(
    (d) => String(d.id) === String(selectedId) || (d.level !== undefined && d.level === Number(selectedId))
  ) || difficulties[0];

  return (
    <div className="space-y-3">
      {/* Header with Title and Selected Tier Indicator */}
      {title && (
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-2">
          <span className="flex items-center gap-1.5 font-bold text-slate-200">
            <Cpu className="h-3.5 w-3.5 text-amber-400" />
            {title.toUpperCase()}
          </span>
          <span className="font-bold text-amber-400 flex items-center gap-1">
            <span>{selectedItem.badge ? `${selectedItem.badge} · ` : ''}</span>
            <span>{selectedItem.name}</span>
          </span>
        </div>
      )}

      {/* Scroller Hint / Indicators */}
      <div className="relative">
        {/* Subtle Top & Bottom Gradient Shadows for scroll cue */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-slate-950/80 to-transparent z-10 rounded-t-2xl opacity-60" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-950/80 to-transparent z-10 rounded-b-2xl opacity-60" />

        {/* Scrollable Container (Hardest at top -> Easiest at bottom) */}
        <div
          ref={containerRef}
          tabIndex={0}
          role="region"
          aria-label={title || 'Difficulty Level Selection'}
          className={`${maxHeight} overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-amber-500/50 scroll-smooth rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2 sm:p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-400/50`}
        >
          {difficulties.map((item) => {
            const isSelected =
              String(item.id) === String(selectedId) ||
              (item.level !== undefined && item.level === Number(selectedId));

            return (
              <button
                key={String(item.id)}
                ref={isSelected ? selectedItemRef : null}
                type="button"
                onClick={() => onSelect(item.level !== undefined ? item.level : item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item.level !== undefined ? item.level : item.id);
                  }
                }}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex flex-col justify-between select-none ${
                  isSelected
                    ? 'border-amber-400 bg-amber-950/25 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400'
                    : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <span
                      className={`font-bold text-sm leading-tight ${
                        isSelected ? 'text-amber-300' : 'text-slate-100'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>

                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                      <Check className="h-3 w-3 stroke-[3]" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 uppercase">SELECT</span>
                  )}
                </div>

                {item.description && !compact && (
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                )}

                {item.depthOrDetail && !compact && (
                  <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-amber-400/80">Strategy: {item.depthOrDetail}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Tier Strategy Detail Footer */}
      {selectedItem && (selectedItem.description || selectedItem.honestyNote) && (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
              <Cpu className="h-3.5 w-3.5 text-amber-400" />
              Active Calibration: <strong className="text-amber-400">{selectedItem.name}</strong>
            </span>
            {selectedItem.depthOrDetail && (
              <span className="font-mono text-[10px] text-slate-400">
                {selectedItem.depthOrDetail}
              </span>
            )}
          </div>
          {selectedItem.description && (
            <p className="text-slate-400 text-xs leading-relaxed">{selectedItem.description}</p>
          )}
          {selectedItem.honestyNote && (
            <div className="pt-1.5 border-t border-slate-800/80 flex items-start gap-1.5 text-amber-300/90 text-[11px]">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p>{selectedItem.honestyNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
