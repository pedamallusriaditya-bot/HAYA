import React from 'react';
import type { AvatarConfig } from '@/types/avatar';
import AvatarSvg from '@/components/avatar/AvatarSvg';
import { arcadeAudio } from '@/lib/arcadeAudio';
import { PRESET_AVATARS } from '@/components/avatar/avatarPresets';
import { Activity } from 'lucide-react';

type AvatarPreviewPanelProps = {
  config: AvatarConfig;
  animatePreview: boolean;
  setAnimatePreview: React.Dispatch<React.SetStateAction<boolean>>;
  updateConfig: <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => void;
  setConfig: React.Dispatch<React.SetStateAction<AvatarConfig>>;
  handleFactoryReset: () => void;
};

export default function AvatarPreviewPanel({
  config,
  animatePreview,
  setAnimatePreview,
  updateConfig,
  setConfig,
  handleFactoryReset,
}: AvatarPreviewPanelProps) {
  return (
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
  );
}
