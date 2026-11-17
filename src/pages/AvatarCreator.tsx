import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useRouter } from '@/router';
import type { AvatarConfig, AvatarCategory } from '@/types/avatar';
import { getCachedAvatar, saveUserAvatar } from '@/lib/avatarStorage';
import {
  getRandomAvatarConfig,
  DEFAULT_ADITYA_AVATAR,
  DEFAULT_HARIKA_AVATAR,
} from '@/components/avatar/avatarPresets';
import { arcadeAudio } from '@/lib/arcadeAudio';
import AvatarPreviewPanel from '@/components/avatar/creator/AvatarPreviewPanel';
import CategoryTabContent from '@/components/avatar/creator/CategoryTabContent';
import {
  Sparkles,
  Dices,
  RotateCcw,
  Check,
  ArrowLeft,
  Loader2,
  Smile,
  Eye,
  Shirt,
  Crown,
  Glasses,
  Image as ImageIcon,
  User,
  Save,
} from 'lucide-react';

const CATEGORIES: { id: AvatarCategory; label: string; icon: React.ElementType }[] = [
  { id: 'base', label: 'Base & Skin', icon: User },
  { id: 'hair', label: 'Hairstyle', icon: Sparkles },
  { id: 'eyes', label: 'Eyes & Brows', icon: Eye },
  { id: 'mouth', label: 'Expression', icon: Smile },
  { id: 'clothing', label: 'Clothing', icon: Shirt },
  { id: 'headwear', label: 'Headwear', icon: Crown },
  { id: 'accessory', label: 'Accessories', icon: Glasses },
  { id: 'background', label: 'Background', icon: ImageIcon },
];

export default function AvatarCreator() {
  const { user, profile, updateProfileState } = useAuth();
  const { navigate } = useRouter();

  const userEmail = user?.email || profile?.email || 'player@haya.local';
  const defaultPlayerName =
    profile?.display_name || (userEmail.toLowerCase().includes('harika') ? 'Harika' : 'Aditya');

  // Initial loaded config
  const [savedConfig, setSavedConfig] = useState<AvatarConfig>(() =>
    getCachedAvatar(userEmail, defaultPlayerName)
  );

  // Active working config
  const [config, setConfig] = useState<AvatarConfig>(() => ({
    ...savedConfig,
    displayName: savedConfig.displayName || defaultPlayerName,
  }));

  const [activeTab, setActiveTab] = useState<AvatarCategory>('base');
  const [animatePreview, setAnimatePreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if user changes
  useEffect(() => {
    const loaded = getCachedAvatar(userEmail, defaultPlayerName);
    setSavedConfig(loaded);
    setConfig(loaded);
  }, [userEmail, defaultPlayerName]);

  // Option change handler
  const updateConfig = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    arcadeAudio.playBlip();
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Randomize handler
  const handleRandomize = () => {
    arcadeAudio.playMove(true);
    const randomized = getRandomAvatarConfig(config.displayName);
    setConfig(randomized);
  };

  // Reset to last saved state
  const handleReset = () => {
    arcadeAudio.playCoin();
    setConfig({ ...savedConfig });
  };

  // Reset to initial factory preset
  const handleFactoryReset = () => {
    arcadeAudio.playCoin();
    const factory = userEmail.toLowerCase().includes('harika')
      ? { ...DEFAULT_HARIKA_AVATAR, displayName: 'Harika' }
      : { ...DEFAULT_ADITYA_AVATAR, displayName: 'Aditya' };
    setConfig(factory);
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    arcadeAudio.playCoin();

    const cleanName = (config.displayName || defaultPlayerName).trim().slice(0, 20);
    const toSave: AvatarConfig = {
      ...config,
      displayName: cleanName,
    };

    const res = await saveUserAvatar(userEmail, toSave, user?.id);
    if (res.success && updateProfileState) {
      updateProfileState({ avatar_data: toSave, display_name: cleanName });
    }

    setSavedConfig(toSave);
    setConfig(toSave);
    setSaving(false);
    setSaveSuccess(true);
    arcadeAudio.playWin();

    setTimeout(() => {
      setSaveSuccess(false);
    }, 3500);
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-in select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="btn-ghost !p-2 flex items-center justify-center text-slate-400 hover:text-slate-100"
              title="Back to Arcade"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="token-badge !bg-amber-500/10 !border-amber-400/30 !text-amber-400">
              <Sparkles className="h-3 w-3" />
              2D CHARACTER STUDIO
            </div>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100 mt-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Avatar Customizer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Design your unique 2D arcade persona. Instantly shown across all HAYA matches and leaderboards.
          </p>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn-ghost py-2 px-3 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5"
            title="Revert to last saved avatar"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Revert</span>
          </button>
          <button
            type="button"
            onClick={handleRandomize}
            className="btn-arcade-teal py-2 px-3 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5"
            title="Randomize appearance"
          >
            <Dices className="h-4 w-4" />
            <span>Randomize</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary py-2 px-4 text-xs uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 fill-slate-950" />}
            <span>{saving ? 'Saving...' : 'Save Avatar'}</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-400/40 text-emerald-300 text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-pop">
          <span className="flex items-center gap-2 font-bold">
            <Check className="h-4 w-4 text-emerald-400" />
            Avatar updated successfully! Your character is now active across all games.
          </span>
          <button
            onClick={() => navigate('/')}
            className="text-xs uppercase font-mono font-bold underline hover:text-emerald-200"
          >
            Return to Dashboard →
          </button>
        </div>
      )}

      {/* Main Two-Panel Studio Layout */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: LIVE PREVIEW & IDENTITY CONTROLS */}
        <AvatarPreviewPanel
          config={config}
          animatePreview={animatePreview}
          setAnimatePreview={setAnimatePreview}
          updateConfig={updateConfig}
          setConfig={setConfig}
          handleFactoryReset={handleFactoryReset}
        />

        {/* RIGHT PANEL: MODULAR CUSTOMIZATION OPTIONS */}
        <div className="lg:col-span-7 space-y-5">
          {/* Category Tabs (Horizontally scrollable on mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    arcadeAudio.playBlip();
                    setActiveTab(cat.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap shrink-0 transition ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Category Options Content */}
          <CategoryTabContent
            activeTab={activeTab}
            config={config}
            updateConfig={updateConfig}
          />

          {/* Sticky Bottom Bar on Mobile */}
          <div className="sm:hidden flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleRandomize}
              className="btn-arcade-teal flex-1 py-3 text-xs uppercase font-bold flex items-center justify-center gap-1.5"
            >
              <Dices className="h-4 w-4" />
              <span>Random</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 py-3 text-xs uppercase font-bold flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 fill-slate-950" />}
              <span>{saving ? 'Saving...' : 'Save Avatar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
