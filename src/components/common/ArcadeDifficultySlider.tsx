import React, { useRef, useState, useCallback } from 'react';
import { Cpu, Flame, Shield } from 'lucide-react';
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

export type ArcadeDifficultySliderProps = {
  difficulties: (DifficultyTier | UniversalDifficultyItem)[];
  selectedId: string | number;
  onSelect: (id: string | number) => void;
  title?: string;
  className?: string;
};

export default function ArcadeDifficultySlider({
  difficulties,
  selectedId,
  onSelect,
  title = 'BOT DIFFICULTY',
  className = '',
}: ArcadeDifficultySliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);

  const numLevels = difficulties.length;
  const maxIndex = Math.max(0, numLevels - 1);

  // Find index of current selected item (hardest = index 0 on left, easiest = maxIndex on right)
  const selectedIndex = difficulties.findIndex(
    (d) =>
      String(d.id) === String(selectedId) ||
      (d.level !== undefined && d.level === Number(selectedId))
  );

  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const activeItem = difficulties[activeIndex] || difficulties[0];

  // Helper to get percentage for a given index (0..maxIndex -> 0%..100%)
  const getPercentForIndex = useCallback(
    (index: number) => {
      if (maxIndex === 0) return 50;
      return (index / maxIndex) * 100;
    },
    [maxIndex]
  );

  // Helper to commit index selection
  const selectIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(maxIndex, idx));
      const target = difficulties[clamped];
      if (!target) return;
      const targetVal =
        target.level !== undefined && typeof selectedId === 'number'
          ? target.level
          : target.id;
      onSelect(targetVal);
    },
    [difficulties, maxIndex, selectedId, onSelect]
  );

  // Calculate index from a pointer X position relative to track
  const getIndexFromPointer = useCallback(
    (clientX: number): { index: number; percent: number } => {
      if (!trackRef.current) return { index: activeIndex, percent: getPercentForIndex(activeIndex) };
      const rect = trackRef.current.getBoundingClientRect();
      const width = rect.width;
      if (width <= 0) return { index: 0, percent: 0 };

      const offsetX = Math.max(0, Math.min(width, clientX - rect.left));
      const rawRatio = offsetX / width;
      const nearestIdx = Math.round(rawRatio * maxIndex);
      return {
        index: nearestIdx,
        percent: rawRatio * 100,
      };
    },
    [activeIndex, getPercentForIndex, maxIndex]
  );

  // Pointer Down (Click or Drag Start)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (e.button !== 0) return; // Only primary button
    isDraggingRef.current = true;
    setIsDragging(true);

    if (trackRef.current) {
      try {
        trackRef.current.setPointerCapture(e.pointerId);
      } catch {
        // Fallback if pointer capture unsupported
      }
    }

    const { index, percent } = getIndexFromPointer(e.clientX);
    setDragPercent(percent);
    selectIndex(index);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const { index, percent } = getIndexFromPointer(e.clientX);
    setDragPercent(percent);
    selectIndex(index);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragPercent(null);

    if (trackRef.current) {
      try {
        trackRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    const { index } = getIndexFromPointer(e.clientX);
    selectIndex(index);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      // ArrowLeft moves toward left (Harder = lower index in hardest-first order)
      selectIndex(activeIndex - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      // ArrowRight moves toward right (Easier = higher index in hardest-first order)
      selectIndex(activeIndex + 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectIndex(0); // Leftmost = Hardest
    } else if (e.key === 'End') {
      e.preventDefault();
      selectIndex(maxIndex); // Rightmost = Easiest
    }
  };

  // Current percentage position of thumb (0% = left = hardest, 100% = right = easiest)
  const currentPercent = isDragging && dragPercent !== null
    ? dragPercent
    : getPercentForIndex(activeIndex);

  // Formatted level name & badge
  const levelBadge = activeItem.badge || (activeItem.level !== undefined ? `Level ${activeItem.level}` : '');
  const levelName = activeItem.name || String(activeItem.id).toUpperCase();

  return (
    <div
      className={`space-y-2.5 p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 shadow-xl select-none ${className}`}
    >
      {/* Header: Label on Left, Selected Level + Name on Right */}
      <div className="flex items-center justify-between text-xs font-mono tracking-wider">
        <span className="flex items-center gap-1.5 font-bold text-slate-300">
          <Cpu className="h-3.5 w-3.5 text-amber-400" />
          <span>{title.toUpperCase()}</span>
        </span>
        <div className="flex items-center gap-1.5 font-bold">
          {levelBadge && (
            <span className="text-amber-400 font-mono text-[11px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30">
              {levelBadge}
            </span>
          )}
          <span className="text-slate-100 font-sans tracking-normal uppercase text-xs">
            {levelName}
          </span>
        </div>
      </div>

      {/* Retro Arcade Slider Area */}
      <div className="relative pt-2 pb-1 px-1">
        {/* Track container with touch/drag events */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={title}
          aria-valuemin={1}
          aria-valuemax={numLevels}
          aria-valuenow={maxIndex - activeIndex + 1}
          aria-valuetext={`${levelBadge} ${levelName}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="relative h-8 mx-3.5 flex items-center cursor-pointer touch-none focus:outline-none group"
        >
          {/* Outer Rail / Channel */}
          <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-700/80 shadow-inner overflow-hidden relative">
            {/* Active filled segment from Left (Hardest) to Thumb */}
            <div
              className={`h-full bg-gradient-to-r from-rose-500/80 via-amber-400 to-emerald-400 ${
                isDragging ? '' : 'transition-all duration-200 ease-out motion-reduce:transition-none'
              }`}
              style={{ width: `${currentPercent}%` }}
            />
          </div>

          {/* Tick Marks for each selectable level */}
          <div className="absolute inset-x-0 pointer-events-none flex justify-between px-0.5">
            {difficulties.map((d, i) => {
              const isPassed = i <= activeIndex;
              const isCurrent = i === activeIndex;
              return (
                <div
                  key={String(d.id || i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    isCurrent
                      ? 'bg-amber-300 ring-2 ring-amber-400/60 scale-125'
                      : isPassed
                      ? 'bg-amber-500/80'
                      : 'bg-slate-700'
                  }`}
                  style={{ transform: 'translateY(-50%)' }}
                />
              );
            })}
          </div>

          {/* Movable Retro Diamond/Arcade Indicator */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none ${
              isDragging ? '' : 'transition-all duration-200 ease-out motion-reduce:transition-none'
            }`}
            style={{ left: `${currentPercent}%` }}
          >
            {/* Outer glowing diamond/hexagon thumb */}
            <div className="relative flex items-center justify-center">
              {/* Outer Amber Glow */}
              <div
                className={`absolute inset-0 rounded-full blur-md bg-amber-400 transition-opacity ${
                  isDragging ? 'opacity-80 scale-150' : 'opacity-40 group-hover:opacity-60'
                }`}
              />

              {/* Diamond-shaped arcade puck */}
              <div
                className={`relative w-6 h-6 rounded-md rotate-45 border-2 shadow-lg flex items-center justify-center transition-transform ${
                  isDragging
                    ? 'scale-110 border-white bg-gradient-to-br from-amber-300 to-amber-500 shadow-amber-500/50'
                    : 'border-amber-300 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 group-hover:border-white shadow-amber-500/30'
                }`}
              >
                {/* Inner metallic jewel specular highlight */}
                <div className="w-2 h-2 rounded-sm bg-white/90 shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Labels at each end: HARDEST on Left, EASIEST on Right */}
        <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-slate-500 pt-1.5 px-1">
          <span className="flex items-center gap-1 text-rose-400/95 font-bold">
            <Flame className="h-3 w-3 text-rose-400" />
            HARDEST
          </span>
          <span className="text-[9px] xs:text-[10px] text-slate-500 font-normal">
            {numLevels} LEVELS · DRAG OR TAP
          </span>
          <span className="flex items-center gap-1 text-emerald-400/95 font-bold">
            EASIEST
            <Shield className="h-3 w-3 text-emerald-400" />
          </span>
        </div>
      </div>
    </div>
  );
}
