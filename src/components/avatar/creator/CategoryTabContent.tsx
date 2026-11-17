import React from 'react';
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
import { Check } from 'lucide-react';

type CategoryTabContentProps = {
  activeTab: AvatarCategory;
  config: AvatarConfig;
  updateConfig: <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => void;
};

export default function CategoryTabContent({
  activeTab,
  config,
  updateConfig,
}: CategoryTabContentProps) {
  return (
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
                  {config.skinTone === tone.value && (
                    <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                  )}
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
  );
}
