import { useState, useCallback, useRef, useEffect } from 'react';
import {
  type ChatMessage,
  type ReactionMessage,
  type FloatingReaction,
  addMessageWithCap,
  addReactionWithCap,
} from './chatHelpers';

export interface UseGameChatReturn {
  messages: ChatMessage[];
  unread: number;
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  muted: boolean;
  setMuted: (muted: boolean | ((prev: boolean) => boolean)) => void;
  addMessage: (msg: ChatMessage, isOutgoing?: boolean) => void;
  floatingReactions: FloatingReaction[];
  addReaction: (reaction: ReactionMessage, isOutgoing?: boolean) => void;
  removeReaction: (id: string) => void;
  clear: () => void;
}

/**
 * Pure in-memory React state hook for in-game chat and floating reactions.
 * Zero persistence: no database, no localStorage, no sessionStorage, no cookies.
 * Disappears completely on unmount, match_exit, or reload.
 */
export function useGameChat(): UseGameChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpenState] = useState(false);
  const [muted, setMuted] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  const openRef = useRef(open);
  openRef.current = open;

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const reactionTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const setOpen = useCallback((action: boolean | ((prev: boolean) => boolean)) => {
    setOpenState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next) {
        setUnread(0);
      }
      return next;
    });
  }, []);

  const removeReaction = useCallback((id: string) => {
    const timer = reactionTimeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      reactionTimeoutsRef.current.delete(id);
    }
    setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addReaction = useCallback(
    (reaction: ReactionMessage, isOutgoing = false) => {
      // If muted and incoming, silently drop
      if (!isOutgoing && mutedRef.current) return;

      const floating: FloatingReaction = {
        ...reaction,
        addedAt: Date.now(),
      };

      setFloatingReactions((prev) => addReactionWithCap(prev, floating, 8));

      // Auto-remove after 2200ms fallback timeout if animationend does not fire
      const timer = setTimeout(() => {
        removeReaction(reaction.id);
      }, 2200);

      reactionTimeoutsRef.current.set(reaction.id, timer);
    },
    [removeReaction]
  );

  const addMessage = useCallback((msg: ChatMessage, isOutgoing = false) => {
    // If muted and incoming, silently drop
    if (!isOutgoing && mutedRef.current) return;

    setMessages((prev) => addMessageWithCap(prev, msg, 50));

    // Increment unread count if chat panel is closed and message is incoming
    if (!isOutgoing && !openRef.current) {
      setUnread((count) => count + 1);
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setUnread(0);
    setFloatingReactions([]);
    reactionTimeoutsRef.current.forEach((timer) => clearTimeout(timer));
    reactionTimeoutsRef.current.clear();
  }, []);

  // Strict cleanup on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return {
    messages,
    unread,
    open,
    setOpen,
    muted,
    setMuted,
    addMessage,
    floatingReactions,
    addReaction,
    removeReaction,
    clear,
  };
}
