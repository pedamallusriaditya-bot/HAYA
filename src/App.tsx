import { Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useRouter } from '@/router';
import { MultiplayerProvider } from '@/context/MultiplayerContext';
import IncomingInviteModal from '@/components/IncomingInviteModal';
import Login from '@/pages/Login';
import Header from '@/components/Header';
import Dashboard from '@/pages/Dashboard';
import GameCatalog from '@/pages/GameCatalog';
import GamePlay from '@/pages/GamePlay';
import Scores from '@/pages/Scores';
import MultiplayerStub from '@/pages/MultiplayerStub';
import AvatarCreator from '@/pages/AvatarCreator';

export default function App() {
  const { session, loading, profile, signOut } = useAuth();
  const { path } = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  // Allowlist backstop: if a session exists but no profile row was created, the
  // trigger deleted the account (non-allowlisted email). Block access here too.
  if (session && profile === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-bold mb-2">Access not authorized</h1>
          <p className="text-slate-400 mb-6">
            This account is not on the HAYA Games allowlist. Sign in with one of
            the authorized email addresses.
          </p>
          <button className="btn-primary" onClick={() => signOut()}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <MultiplayerProvider>
      <div className="min-h-screen min-h-[100dvh] flex flex-col justify-between bg-slate-950 text-slate-100 overflow-x-hidden">
        <IncomingInviteModal />
        <Header />
        <main className="flex-1 w-full">{renderRoute(path)}</main>
        <footer className="border-t border-slate-800/80 mt-10 py-6 text-center text-xs text-slate-500 font-mono px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          HAYA Games · Private Arcade Platform · Authorized Accounts Only
        </footer>
      </div>
    </MultiplayerProvider>
  );
}

function renderRoute(path: string) {
  if (path === '/' || path === '') return <Dashboard />;
  if (path === '/singleplayer') return <GameCatalog mode="single" />;
  if (path === '/multiplayer') return <MultiplayerStub />;
  if (path === '/scores') return <Scores />;
  if (path === '/avatar') return <AvatarCreator />;
  if (path.startsWith('/play/')) {
    const raw = path.replace('/play/', '');
    const id = raw.split('?')[0];
    return <GamePlay gameId={id} />;
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center animate-in">
      <h1 className="text-2xl font-bold mb-2 text-slate-100">Page not found</h1>
      <p className="text-slate-400">The arcade machine you're looking for doesn't exist.</p>
    </div>
  );
}
