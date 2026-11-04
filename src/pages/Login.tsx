import { useState } from 'react';
import { Gamepad2, Lock, Mail, Eye, EyeOff, Sparkles, ArrowRight, AlertCircle, Loader2, User } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';

const PLAYERS = [
  {
    name: 'Aditya',
    email: 'pedamallusriaditya@gmail.com',
    tag: 'Player 1',
    emoji: '🎮',
    accent: 'from-sky-500 to-indigo-600',
    border: 'border-sky-500/50 hover:border-sky-400',
    activeGlow: 'ring-2 ring-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/20',
  },
  {
    name: 'Harika',
    email: 'pasulaharika61@gmail.com',
    tag: 'Player 2',
    emoji: '✨',
    accent: 'from-fuchsia-500 to-pink-600',
    border: 'border-fuchsia-500/50 hover:border-fuchsia-400',
    activeGlow: 'ring-2 ring-fuchsia-400 bg-fuchsia-500/10 shadow-lg shadow-fuchsia-500/20',
  },
];

export default function Login() {
  const { signIn, session, devSignIn, logoutNotice, clearLogoutNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return null;

  function selectPlayer(playerEmail: string) {
    setEmail(playerEmail);
    setError(null);
    clearLogoutNotice();
    if (import.meta.env.DEV && devSignIn) {
      const p = PLAYERS.find((x) => x.email === playerEmail);
      if (p) {
        devSignIn(p.email, p.name);
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    clearLogoutNotice();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Please choose your player and enter your password.');
      return;
    }

    setBusy(true);
    const res = await signIn(cleanEmail, password);
    setBusy(false);

    if (res.error) {
      setError(res.error);
    }
  }

  const selectedPlayer = PLAYERS.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());

  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden bg-slate-950 flex items-center justify-center p-3 xs:p-4 sm:p-6 py-6 xs:py-8 safe-top safe-bottom">
      {/* Playful animated background glow orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-sky-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute -top-10 right-1/3 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating subtle game icons in background */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-10">
        <span className="absolute top-12 left-10 text-6xl">🎮</span>
        <span className="absolute top-20 right-16 text-5xl">🎲</span>
        <span className="absolute bottom-24 left-16 text-5xl">♟️</span>
        <span className="absolute bottom-16 right-20 text-6xl">🏆</span>
        <span className="absolute top-1/2 left-8 text-4xl">🧩</span>
        <span className="absolute top-1/3 right-12 text-4xl">🎯</span>
      </div>

      <div className="relative w-full max-w-md">
        {/* Game Console Header */}
        <div className="text-center mb-4 xs:mb-6 animate-in">
          <div className="inline-flex items-center justify-center gap-2 mb-2 xs:mb-3">
            <div className="h-12 w-12 xs:h-14 xs:w-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-fuchsia-500 p-0.5 shadow-xl shadow-sky-500/20 animate-pop">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Gamepad2 className="h-6 w-6 xs:h-8 xs:w-8 text-sky-400" />
              </div>
            </div>
          </div>
          <h1
            className="text-2xl xs:text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-teal-300 to-fuchsia-400 bg-clip-text text-transparent"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            HAYA GAMES
          </h1>
          <p className="text-slate-400 text-xs xs:text-sm mt-1 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Aditya & Harika&apos;s Private Arcade
          </p>
        </div>

        {/* Arcade Console Card */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-slate-900/80 border border-slate-800/80 p-4 xs:p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/60 animate-in">
          {logoutNotice && (
            <div className="mb-5 flex items-start justify-between gap-3 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-200 animate-pop">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{logoutNotice}</span>
              </div>
              <button
                type="button"
                onClick={clearLogoutNotice}
                className="text-amber-400 hover:text-amber-200 font-bold ml-1 text-xs px-1"
                aria-label="Dismiss notice"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Player Selection */}
          <div className="mb-6">
            <label className="text-xs uppercase font-bold tracking-wider text-slate-400 block mb-3 text-center">
              Who is playing?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PLAYERS.map((p) => {
                const isSelected = selectedPlayer?.email === p.email;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => selectPlayer(p.email)}
                    className={`relative p-3.5 rounded-2xl border transition-all duration-200 text-left flex flex-col items-center gap-2 ${
                      isSelected
                        ? p.activeGlow
                        : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-3xl transform transition-transform hover:scale-110">{p.emoji}</span>
                    <div className="text-center">
                      <span className="block font-bold text-slate-100 text-sm sm:text-base">{p.name}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{p.tag}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email input (hidden or editable) */}
            <div>
              <label className="label text-xs uppercase tracking-wider font-semibold text-slate-400" htmlFor="email">
                Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input pl-10 text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Select a player above or enter email"
                  disabled={busy}
                />
              </div>
            </div>

            {/* Password input with show/hide */}
            <div>
              <label className="label text-xs uppercase tracking-wider font-semibold text-slate-400" htmlFor="password">
                Secret Passcode
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pl-10 pr-10 text-sm tracking-wider"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300 animate-pop">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Arcade Play Button */}
            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-sky-400 via-teal-300 to-sky-400 hover:from-sky-300 hover:to-teal-200 shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading Arcade...</span>
                </>
              ) : (
                <>
                  <span>Press Start</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick tip & DEV Mode Bypass */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center space-y-3">
            <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Private 2-player arcade room
            </span>

            {import.meta.env.DEV && (
              <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-center">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                  🛠️ Local Dev Audit Bypass
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => devSignIn?.('pasulaharika61@gmail.com', 'Harika')}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-fuchsia-600/30 border border-fuchsia-500/50 text-fuchsia-300 hover:bg-fuchsia-600/50 transition"
                  >
                    ✨ Harika (P2)
                  </button>
                  <button
                    type="button"
                    onClick={() => devSignIn?.('pedamallusriaditya@gmail.com', 'Aditya')}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-sky-600/30 border border-sky-500/50 text-sky-300 hover:bg-sky-600/50 transition"
                  >
                    🎮 Aditya (P1)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
