import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useRouter } from '@/router';
import type {
  AvatarConfig,
  AvatarCategory,
  BaseShape,
  HairStyle,
  EyeStyle,
  EyebrowStyle,
  Expression,
  ClothingStyle,
  HeadwearStyle,
  AccessoryStyle,
  BackgroundStyle,
} from '@/types/avatar';
import {
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CLOTHING_COLORS,
  ACCENT_COLORS,
  HEADWEAR_COLORS,
} from '@/types/avatar';
import AvatarSvg from '@/components/avatar/AvatarSvg';
import {
  getCachedAvatar,
  saveUserAvatar,
} from '@/lib/avatarStorage';
import {
  getRandomAvatarConfig,
  PRESET_AVATARS,
  DEFAULT_ADITYA_AVATAR,
  DEFAULT_HARIKA_AVATAR,
} from '@/components/avatar/avatarPresets';
import { arcadeAudio } from '@/lib/arcadeAudio';
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
  Activity,
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
        {/* =========================================================
            LEFT PANEL: LIVE PREVIEW & IDENTITY CONTROLS
           ========================================================= */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="arcade-cabinet p-4 sm:p-6 border-2 border-slate-700/80 bg-slate-950/90 flex flex-col items-center gap-4 text-center">
            {/* Live Character Canvas */}
            <div className="relative group">
              <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl p-1 bg-gradient-to-tr from-amber-500/30 via-rose-500/20 to-sky-500/30 shadow-2xl shadow-amber-500/10 border-2 border-slate-700">
                <AvatarSvg
                  config={config}
                  size="100%"
                  animate={animatePreview}
                  className="w-full h-full rounded-[22px] shadow-inner"
                />
              </div>

              {/* Animation Toggle Pill */}
              <button
                type="button"
                onClick={() => setAnimatePreview((a) => !a)}
                className={`absolute bottom-3 right-3 px-2 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 border backdrop-blur-md transition ${
                  animatePreview
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                    : 'bg-slate-900/80 border-slate-700 text-slate-400'
                }`}
                title="Toggle Idle Motion"
              >
                <Activity className="h-3 w-3" />
                {animatePreview ? 'IDLE ON' : 'PAUSED'}
              </button>
            </div>

            {/* Display Name Input */}
            <div className="w-full max-w-xs space-y-1 text-left">
              <label
                htmlFor="avatar-name"
                className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between"
              >
                <span>Character Name</span>
                <span className="font-mono text-[9px] text-slate-500">
                  {config.displayName?.length || 0}/20
                </span>
              </label>
              <input
                id="avatar-name"
                type="text"
                maxLength={20}
                value={config.displayName || ''}
                onChange={(e) => updateConfig('displayName', e.target.value)}
                placeholder="Enter character name"
                className="input text-xs py-2 px-3 text-slate-100 font-bold"
              />
            </div>

            {/* Quick Presets Carousel */}
            <div className="w-full pt-1 border-t border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2 text-left">
                Arcade Style Presets:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      arcadeAudio.playBlip();
                      setConfig({ ...preset.config, displayName: config.displayName });
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:border-amber-400/50 hover:text-amber-300 whitespace-nowrap shrink-0 transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Reset Actions */}
            <div className="w-full flex items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-500">
              <button
                type="button"
                onClick={handleFactoryReset}
                className="hover:text-amber-400 transition underline underline-offset-2"
              >
                Reset to Player Default
              </button>
              <span>V1.0 SVG VECTOR</span>
            </div>
          </div>
        </div>

        {/* =========================================================
            RIGHT PANEL: MODULAR CUSTOMIZATION OPTIONS
           ========================================================= */}
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
          <div className="arcade-cabinet p-4 sm:p-6 border-slate-800 space-y-6">
            {/* CATEGORY 1: BASE & SKIN */}
            {activeTab === 'base' && (
              <div className="space-y-6 animate-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Face & Body Silhouette
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {(['round', 'oval', 'square', 'heart', 'cyber'] as BaseShape[]).map((shape) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => updateConfig('baseShape', shape)}
                        className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 group ${
                          config.baseShape === shape
                            ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <AvatarSvg
                            config={{ ...config, baseShape: shape, headwear: 'none', hairStyle: 'cyber_buzz' }}
                            size={44}
                          />
                        </div>
                        <span className="text-xs font-semibold capitalize">{shape}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Skin Tone Palette
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.value}
                        type="button"
                        onClick={() => updateConfig('skinTone', tone.value)}
                        className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-2 transition-transform active:scale-95 flex items-center justify-center ${
                          config.skinTone === tone.value
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-white scale-110'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: tone.value }}
                        title={tone.label}
                      >
                        {config.skinTone === tone.value && <Check className="h-4 w-4 text-slate-900 drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 2: HAIRSTYLE & COLOR */}
            {activeTab === 'hair' && (
              <div className="space-y-6 animate-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Hairstyle Cut
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {(
                      [
                        'short',
                        'spiky',
                        'curly',
                        'wavy',
                        'long',
                        'side_part',
                        'ponytail',
                        'bob',
                        'dreads',
                        'cyber_buzz',
                        'afro',
                      ] as HairStyle[]
                    ).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => updateConfig('hairStyle', style)}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 group ${
                          config.hairStyle === style
                            ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <AvatarSvg
                            config={{ ...config, hairStyle: style, headwear: 'none' }}
                            size={44}
                          />
                        </div>
                        <span className="text-[11px] font-semibold capitalize truncate w-full">
                          {style.replace('_', ' ')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Hair Color Dye
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {HAIR_COLORS.map((dye) => (
                      <button
                        key={dye.value}
                        type="button"
                        onClick={() => updateConfig('hairColor', dye.value)}
                        className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-2 transition-transform active:scale-95 flex items-center justify-center ${
                          config.hairColor === dye.value
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-white scale-110'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: dye.value }}
                        title={dye.label}
                      >
                        {config.hairColor === dye.value && (
                          <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 3: EYES & BROWS */}
            {activeTab === 'eyes' && (
              <div className="space-y-6 animate-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Eye Shape & Style
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-2.5">
                    {(['focused', 'anime_sparkle', 'chill_almond', 'wide', 'cyber_glow', 'wink'] as EyeStyle[]).map(
                      (style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => updateConfig('eyeStyle', style)}
                          className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 group ${
                            config.eyeStyle === style
                              ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <AvatarSvg
                              config={{ ...config, eyeStyle: style, headwear: 'none' }}
                              size={44}
                            />
                          </div>
                          <span className="text-[11px] font-semibold capitalize">
                            {style.replace('_', ' ')}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Iris Eye Color
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {EYE_COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => updateConfig('eyeColor', col.value)}
                        className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-2 transition-transform active:scale-95 flex items-center justify-center ${
                          config.eyeColor === col.value
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-white scale-110'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: col.value }}
                        title={col.label}
                      >
                        {config.eyeColor === col.value && (
                          <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Eyebrows
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-4 gap-2.5">
                    {(['natural', 'arched', 'bold', 'furrowed'] as EyebrowStyle[]).map((brow) => (
                      <button
                        key={brow}
                        type="button"
                        onClick={() => updateConfig('eyebrowStyle', brow)}
                        className={`p-2.5 rounded-xl border text-center transition capitalize text-xs font-semibold ${
                          config.eyebrowStyle === brow
                            ? 'bg-amber-500/15 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {brow}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 4: MOUTH & EXPRESSION */}
            {activeTab === 'mouth' && (
              <div className="space-y-6 animate-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Facial Expression
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-2.5">
                    {(['neutral', 'smile', 'grin', 'laugh', 'determined', 'surprised'] as Expression[]).map(
                      (expr) => (
                        <button
                          key={expr}
                          type="button"
                          onClick={() => updateConfig('expression', expr)}
                          className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 group ${
                            config.expression === expr
                              ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <AvatarSvg
                              config={{ ...config, expression: expr, headwear: 'none' }}
                              size={44}
                            />
                          </div>
                          <span className="text-xs font-semibold capitalize">{expr}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 5: CLOTHING */}
            {activeTab === 'clothing' && (
              <div className="space-y-6 animate-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Arcade Upper-Body Outfit
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-2.5">
                    {(
                      [
                        'arcade_hoodie',
                        'tshirt',
                        'varsity_jacket',
                        'gamer_jersey',
                        'cyber_techwear',
                        'sweater',
                      ] as ClothingStyle[]
                    ).map((cloth) => (
                      <button
                        key={cloth}
                        type="button"
                        onClick={() => updateConfig('clothing', cloth)}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 group ${
                          config.clothing === cloth
                            ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <AvatarSvg config={{ ...config, clothing: cloth }} size={44} />
                        </div>
                        <span className="text-[11px] font-semibold capitalize">
                          {cloth.replace('_', ' ')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Primary Fabric Color
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {CLOTHING_COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => updateConfig('clothingColor', col.value)}
                        className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-2 transition-transform active:scale-95 flex items-center justify-center ${
                          config.clothingColor === col.value
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-white scale-110'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: col.value }}
                        title={col.label}
                      >
                        {config.clothingColor === col.value && (
                          <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Accent & Piping Color
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {ACCENT_COLORS.map((acc) => (
                      <button
                        key={acc.value}
                        type="button"
                        onClick={() => updateConfig('clothingAccentColor', acc.value)}
                        className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-2 transition-transform active:scale-95 flex items-center justify-center ${
                          config.clothingAccentColor === acc.value
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-white scale-110'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: acc.value }}
                        title={acc.label}
                      >
                        {config.clothingAccentColor === acc.value && (
                          <Check className="h-4 w-4 text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 6: HEADWEAR */}
            {activeTab === 'headwear' && (
              <div className="space-y-6 animate-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Headwear & Headsets
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {(
                      [
                        'none',
                        'arcade_cap',
                        'beanie',
                        'cyber_headband',
                        'gamer_headset',
                        'cat_ears_headset',
                        'crown',
                      ] as HeadwearStyle[]
                    ).map((hw) => (
                      <button
                        key={hw}
                        type="button"
                        onClick={() => updateConfig('headwear', hw)}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 group ${
                          config.headwear === hw
                            ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <AvatarSvg config={{ ...config, headwear: hw }} size={44} />
                        </div>
                        <span className="text-[11px] font-semibold capitalize">
                          {hw.replace('_', ' ')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {config.headwear !== 'none' && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                      Headwear Color
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {HEADWEAR_COLORS.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => updateConfig('headwearColor', col.value)}
                          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border-2 transition-transform active:scale-95 flex items-center justify-center ${
                            config.headwearColor === col.value
                              ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-white scale-110'
                            : 'border-slate-700 hover:scale-105'
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.label}
                        >
                          {config.headwearColor === col.value && (
                            <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CATEGORY 7: ACCESSORIES */}
            {activeTab === 'accessory' && (
              <div className="space-y-6 animate-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Face & Eye Accessories
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {(
                      [
                        'none',
                        'glasses',
                        'sunglasses',
                        'earrings',
                        'face_blush',
                        'arcade_bandaid',
                        'star_tattoo',
                      ] as AccessoryStyle[]
                    ).map((acc) => (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => updateConfig('accessory', acc)}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 group ${
                          config.accessory === acc
                            ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <AvatarSvg config={{ ...config, accessory: acc }} size={44} />
                        </div>
                        <span className="text-[11px] font-semibold capitalize">
                          {acc.replace('_', ' ')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 8: BACKGROUND */}
            {activeTab === 'background' && (
              <div className="space-y-6 animate-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider mb-2">
                    Card & Profile Backdrop
                  </h3>
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {(
                      [
                        'arcade_dark',
                        'retro_grid',
                        'midnight_gradient',
                        'cyber_neon',
                        'warm_amber',
                        'cosmic_purple',
                        'emerald_matrix',
                        'transparent',
                      ] as BackgroundStyle[]
                    ).map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => updateConfig('background', bg)}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 group ${
                          config.background === bg
                            ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-2 ring-amber-400/30'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform rounded-xl overflow-hidden border border-slate-700">
                          <AvatarSvg config={{ ...config, background: bg }} size={44} />
                        </div>
                        <span className="text-[11px] font-semibold capitalize">
                          {bg.replace('_', ' ')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

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
