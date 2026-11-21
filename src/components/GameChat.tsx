import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { MessageSquare, X, Send, Volume2, VolumeX } from 'lucide-react';
import {
  type ChatMessage,
  QUICK_CHAT_PHRASES,
  sanitizeChatText,
} from '@/games/shared/chatHelpers';

export interface GameChatProps {
  messages: ChatMessage[];
  unread: number;
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  muted: boolean;
  setMuted: (muted: boolean | ((prev: boolean) => boolean)) => void;
  onSendChat: (text: string) => boolean | ChatMessage | null;
  myDisplayName: string;
  opponentName?: string;
}

/**
 * Ephemeral In-Game Chat UI Component.
 * - Auto-scrolling plain-text message list.
 * - One-tap quick chat phrases.
 * - Politeness aria-live screen reader announcements.
 * - Zero persistence: in-memory React state only.
 */
export default function GameChat({
  messages,
  unread,
  open,
  setOpen,
  muted,
  setMuted,
  onSendChat,
  myDisplayName,
  opponentName = 'Opponent',
}: GameChatProps) {
  const [inputText, setInputText] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll message feed when open or new message arrives
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when chat is opened
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Screen-reader announcement on incoming messages
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.from !== myDisplayName && !muted) {
      setAnnouncement(`New chat from ${lastMsg.from}: ${lastMsg.text}`);
    }
  }, [messages, myDisplayName, muted]);

  const handleSend = useCallback(
    (textToSend: string) => {
      const sanitized = sanitizeChatText(textToSend);
      if (!sanitized || cooldown) return;

      const sent = onSendChat(sanitized);
      if (sent) {
        setInputText('');
        setCooldown(true);
        setTimeout(() => setCooldown(false), 500);
      }
    },
    [cooldown, onSendChat]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(inputText);
  };

  const handleQuickChat = (phrase: string) => {
    handleSend(phrase);
  };

  return (
    <>
      {/* Polite Aria-Live Region for Screen Readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Floating Chat Trigger Button (when closed) */}
      {!open && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={
              unread > 0
                ? `Open in-game chat (${unread} unread message${unread > 1 ? 's' : ''})`
                : 'Open in-game chat'
            }
            className="relative flex items-center justify-center w-11 h-11 rounded-full bg-slate-900/90 text-amber-400 border border-amber-500/30 hover:border-amber-400/60 shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all"
          >
            <MessageSquare className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black shadow animate-pulse">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Chat Flyout Panel */}
      {open && (
        <aside
          role="complementary"
          aria-label="In-game chat panel"
          className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] h-96 max-h-[75vh] flex flex-col rounded-2xl bg-slate-950/95 border border-amber-500/30 shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Match Chat
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMuted((prev) => !prev)}
                aria-label={muted ? 'Unmute chat and reactions' : 'Mute chat and reactions'}
                className={`p-1.5 rounded-lg border transition-all ${
                  muted
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-transparent'
                }`}
                title={muted ? 'Muted (Click to unmute)' : 'Mute incoming chat & reactions'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat panel"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Muted Warning Banner */}
          {muted && (
            <div className="px-3 py-1 bg-rose-500/10 border-b border-rose-500/20 text-[11px] text-rose-300 flex items-center justify-between">
              <span>Incoming chat & reactions muted</span>
              <button
                type="button"
                onClick={() => setMuted(false)}
                className="text-[10px] font-bold underline hover:text-rose-100"
              >
                Unmute
              </button>
            </div>
          )}

          {/* Message Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 px-4 space-y-1">
                <MessageSquare className="w-6 h-6 opacity-40 text-amber-400/60" />
                <p className="text-[11px]">No messages yet.</p>
                <p className="text-[10px] text-slate-600">Send a quick chat or type below!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.from === myDisplayName;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold">
                      {isMe ? 'You' : m.from || opponentName}
                    </span>
                    <div
                      className={`max-w-[85%] px-3 py-1.5 rounded-xl text-xs break-words whitespace-pre-wrap leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Chat Phrases Bar */}
          <div className="px-2 py-1.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_CHAT_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleQuickChat(phrase)}
                disabled={cooldown}
                aria-label={`Send quick chat: ${phrase}`}
                className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/70 hover:border-amber-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-1.5"
          >
            <input
              ref={inputRef}
              type="text"
              maxLength={200}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message (max 200)..."
              aria-label="Chat message input"
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || cooldown}
              aria-label="Send message"
              className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
