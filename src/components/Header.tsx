import { Gamepad2, LogOut, Menu, X, Home, User, Trophy, Users, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Link, useRouter } from '@/router';
import PlayerAvatar from '@/components/avatar/PlayerAvatar';
import { getCachedAvatar } from '@/lib/avatarStorage';
import type { AvatarConfig } from '@/types/avatar';

const navItems = [
  { to: '/', label: 'Arcade Floor', icon: Home },
  { to: '/singleplayer', label: 'Single Player', icon: User },
  { to: '/multiplayer', label: 'Multiplayer', icon: Users },
  { to: '/avatar', label: 'Avatar Studio', icon: Sparkles },
  { to: '/scores', label: 'High Scores', icon: Trophy },
];

export default function Header() {
  const { profile, signOut } = useAuth();
  const { path } = useRouter();
  const [open, setOpen] = useState(false);

  const rawName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';
  const playerName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const isAditya = profile?.email?.toLowerCase().includes('aditya');

  const [avatar, setAvatar] = useState<AvatarConfig>(() =>
    getCachedAvatar(profile?.email || '', playerName)
  );

  useEffect(() => {
    if (profile?.email) {
      setAvatar(getCachedAvatar(profile.email, playerName));
    }
  }, [profile?.email, playerName]);

  useEffect(() => {
    const handleAvatarUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ email: string; config: AvatarConfig }>;
      if (
        !profile?.email ||
        customEvent.detail?.email?.toLowerCase() === profile.email.toLowerCase()
      ) {
        setAvatar(customEvent.detail.config);
      }
    };
    window.addEventListener('haya_avatar_updated', handleAvatarUpdate);
    return () => window.removeEventListener('haya_avatar_updated', handleAvatarUpdate);
  }, [profile?.email]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          {/* Logo with Arcade Marquee styling */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] sm:rounded-[14px] flex items-center justify-center">
                <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 group-hover:text-amber-300 transition" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-wider text-slate-100" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  HAYA
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 tracking-widest">
                  ARCADE
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const active = path === item.to || (item.to !== '/' && path.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs uppercase font-bold tracking-wider transition ${
                    active
                      ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              to="/avatar"
              className="flex items-center gap-2 sm:gap-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/60 pl-1.5 pr-2.5 sm:pr-3 py-1 sm:py-1.5 transition group"
              title="Click to customize your 2D character"
            >
              <PlayerAvatar
                config={avatar}
                name={playerName}
                email={profile?.email}
                size="sm"
                className="group-hover:scale-105 transition-transform"
              />
              <div className="hidden xs:flex flex-col">
                <span className="text-xs font-bold text-slate-200 leading-tight group-hover:text-amber-300 transition">
                  {avatar.displayName || playerName}
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-semibold leading-tight flex items-center gap-1">
                  <span>{isAditya ? 'P1' : 'P2'}</span>
                  <span className="text-[9px] text-slate-500">· EDIT</span>
                </span>
              </div>
            </Link>

            <button
              onClick={() => signOut()}
              className="btn-ghost !min-h-[40px] !w-10 !p-0 flex items-center justify-center text-slate-400 hover:text-rose-400"
              title="Sign out from Arcade"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>

            <button
              className="md:hidden btn-ghost !min-h-[40px] !w-10 !p-0 flex items-center justify-center"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle navigation menu"
            >
              {open ? <X className="h-5 w-5 text-amber-400" /> : <Menu className="h-5 w-5 text-slate-200" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/98 backdrop-blur-xl animate-in px-4 py-4 space-y-2.5 max-h-[calc(100dvh-4rem)] overflow-y-auto">
          {navItems.map((item) => {
            const active = path === item.to || (item.to !== '/' && path.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition ${
                  active ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              to="/avatar"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 group"
            >
              <PlayerAvatar config={avatar} name={playerName} email={profile?.email} size="sm" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
                  {avatar.displayName || playerName}
                </span>
                <span className="text-[10px] font-mono text-amber-400">Edit 2D Avatar →</span>
              </div>
            </Link>
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
