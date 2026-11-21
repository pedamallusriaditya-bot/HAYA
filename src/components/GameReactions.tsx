import { useState, useEffect, useCallback, useRef } from 'react';
import { Smile, ChevronUp, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import {
  REACTIONS,
  TOP_REACTIONS,
  getReaction,
  type ReactionId,
} from '@/games/shared/reactions';
import type { FloatingReaction, ReactionMessage } from '@/games/shared/chatHelpers';
import { arcadeAudio } from '@/lib/arcadeAudio';

export interface GameReactionsProps {
  floatingReactions: FloatingReaction[];
  onSendReaction: (reactionId: ReactionId) => boolean | ReactionMessage | null;
  onRemoveReaction?: (id: string) => void;
  muted?: boolean;
  myDisplayName?: string;
  opponentName?: string;
}

/**
 * Instant Emoji Reactions UI & Overlay Component.
 * - One-tap reaction bar with 6 top reactions (expandable to all 12).
 * - Floating emoji overlay over board with pointer-events: none.
 * - Polite aria-live screen-reader announcement.
 * - Prefers-reduced-motion fallback (static badge).
 * - Cooldown enforcement and optional quiet reaction sound (off by default).
 */
export default function GameReactions({
  floatingReactions,
  onSendReaction,
  onRemoveReaction,
  muted = false,
  myDisplayName = 'You',
  opponentName = 'Opponent',
}: GameReactionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [reactionSound, setReactionSound] = useState(false); // OFF by default
  const [announcement, setAnnouncement] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Play subtle sound on incoming reaction (if sound toggled on and not muted)
  useEffect(() => {
    if (floatingReactions.length === 0 || muted || !reactionSound) return;
    const latest = floatingReactions[floatingReactions.length - 1];
    if (latest.from !== myDisplayName) {
      arcadeAudio.playBlip();
    }
  }, [floatingReactions, muted, reactionSound, myDisplayName]);

  // Screen reader polite announcement
  useEffect(() => {
    if (floatingReactions.length === 0 || muted) return;
    const latest = floatingReactions[floatingReactions.length - 1];
    if (latest.from !== myDisplayName) {
      const rx = getReaction(latest.reactionId);
      const name = latest.from || opponentName;
      setAnnouncement(`${name} reacted with ${rx?.label || latest.reactionId}`);
    }
  }, [floatingReactions, muted, myDisplayName, opponentName]);

  // Close popup if clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [expanded]);

  const handleTriggerReaction = useCallback(
    (id: ReactionId) => {
      if (cooldown) return;
      const sent = onSendReaction(id);
      if (sent) {
        setCooldown(true);
        setTimeout(() => setCooldown(false), 400);
        setExpanded(false);
      }
    },
    [cooldown, onSendReaction]
  );

  return (
    <>
      {/* Animation Styles with Prefers-Reduced-Motion Handling */}
      <style>{`
        @keyframes reactionFloatUp {
          0% {
            opacity: 0;
            transform: translate3d(0, 30px, 0) scale(0.7);
          }
          15% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1.15);
          }
          30% {
            opacity: 1;
            transform: translate3d(0, -10px, 0) scale(1);
          }
          80% {
            opacity: 0.9;
            transform: translate3d(0, -70px, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -110px, 0) scale(0.9);
          }
        }
        .animate-reaction-float {
          animation: reactionFloatUp 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-reaction-float {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      {/* Polite Aria-Live Region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Floating Reaction Overlay (Non-Blocking, High Z-Index, pointer-events: none) */}
      <div
        className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        {floatingReactions.map((rx, idx) => {
          const descriptor = getReaction(rx.reactionId);
          const isMe = rx.from === myDisplayName;
          // Stagger horizontal positions slightly so multiple concurrent reactions don't completely overlap
          const offsetXPx = ((idx % 5) - 2) * 50;

          return (
            <div
              key={rx.id}
              onAnimationEnd={() => onRemoveReaction?.(rx.id)}
              className="absolute animate-reaction-float flex flex-col items-center select-none"
              style={{
                transform: `translateX(${offsetXPx}px)`,
                top: '45%',
              }}
            >
              <span className="text-4xl sm:text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter">
                {descriptor?.emoji || '👍'}
              </span>
              <span className="mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-950/85 text-amber-300 border border-amber-500/30 shadow backdrop-blur-sm">
                {isMe ? 'You' : rx.from || opponentName}
              </span>
            </div>
          );
        })}
      </div>

      {/* Always-Visible Reaction Bar Container */}
      <div className="fixed bottom-4 left-4 z-40" ref={popoverRef}>
        {/* Full 12 Reactions Popover Grid */}
        {expanded && (
          <div
            role="region"
            aria-label="All reactions selector"
            className="absolute bottom-14 left-0 w-64 p-2.5 rounded-2xl bg-slate-950/95 border border-amber-500/30 shadow-2xl backdrop-blur-md grid grid-cols-4 gap-1.5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="col-span-4 flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800 text-[11px] font-bold text-slate-300">
              <span>Send Reaction</span>
              <button
                type="button"
                onClick={() => setReactionSound((s) => !s)}
                aria-label={reactionSound ? 'Reaction audio enabled' : 'Reaction audio disabled'}
                className={`p-1 rounded text-[10px] flex items-center gap-1 border transition-all ${
                  reactionSound
                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    : 'text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
                title={reactionSound ? 'Reaction sound ON' : 'Reaction sound OFF (Click to toggle)'}
              >
                {reactionSound ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                <span className="text-[9px] uppercase font-mono">Audio</span>
              </button>
            </div>

            {REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleTriggerReaction(r.id)}
                disabled={cooldown}
                aria-label={`Send ${r.label} reaction`}
                className="flex items-center justify-center h-10 rounded-xl text-xl hover:bg-amber-500/20 active:scale-95 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reaction Bar */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-950/90 border border-slate-800 shadow-xl backdrop-blur-md">
          {/* Desktop/Tablet: Top 6 One-Tap Reaction Buttons */}
          <div className="hidden sm:flex items-center gap-1">
            {TOP_REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleTriggerReaction(r.id)}
                disabled={cooldown}
                aria-label={`Send ${r.label} reaction`}
                className="w-9 h-9 flex items-center justify-center rounded-full text-lg hover:bg-slate-800 active:scale-90 hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {r.emoji}
              </button>
            ))}
          </div>

          {/* Expand/Collapse Button (Shows on both, with smiley for mobile) */}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? 'Close reaction picker' : 'Open reaction picker'}
            className="flex items-center justify-center gap-1 px-2.5 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700/60 active:scale-95 transition-all text-xs font-bold"
          >
            <Smile className="w-4 h-4" />
            <span className="sm:hidden text-xs">React</span>
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
