/**
 * HAYA Games - 2D Player Avatar Customization Types & Palettes
 */

export type BaseShape = 'round' | 'oval' | 'square' | 'heart' | 'cyber';

export type HairStyle =
  | 'short'
  | 'spiky'
  | 'curly'
  | 'wavy'
  | 'long'
  | 'side_part'
  | 'ponytail'
  | 'bob'
  | 'dreads'
  | 'cyber_buzz'
  | 'afro';

export type EyeStyle =
  | 'focused'
  | 'anime_sparkle'
  | 'chill_almond'
  | 'wide'
  | 'cyber_glow'
  | 'wink';

export type EyebrowStyle = 'natural' | 'arched' | 'bold' | 'furrowed';

export type Expression = 'neutral' | 'smile' | 'grin' | 'laugh' | 'determined' | 'surprised';

export type ClothingStyle =
  | 'arcade_hoodie'
  | 'tshirt'
  | 'varsity_jacket'
  | 'gamer_jersey'
  | 'cyber_techwear'
  | 'sweater';

export type HeadwearStyle =
  | 'none'
  | 'arcade_cap'
  | 'beanie'
  | 'cyber_headband'
  | 'gamer_headset'
  | 'cat_ears_headset'
  | 'crown';

export type AccessoryStyle =
  | 'none'
  | 'glasses'
  | 'sunglasses'
  | 'earrings'
  | 'face_blush'
  | 'arcade_bandaid'
  | 'star_tattoo';

export type BackgroundStyle =
  | 'transparent'
  | 'arcade_dark'
  | 'retro_grid'
  | 'midnight_gradient'
  | 'cyber_neon'
  | 'warm_amber'
  | 'cosmic_purple'
  | 'emerald_matrix';

export type AvatarConfig = {
  version: 1;
  displayName?: string;
  baseShape: BaseShape;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  eyeStyle: EyeStyle;
  eyeColor: string;
  eyebrowStyle: EyebrowStyle;
  expression: Expression;
  clothing: ClothingStyle;
  clothingColor: string;
  clothingAccentColor: string;
  headwear: HeadwearStyle;
  headwearColor: string;
  accessory: AccessoryStyle;
  accessoryColor: string;
  background: BackgroundStyle;
};

export type AvatarCategory =
  | 'base'
  | 'hair'
  | 'eyes'
  | 'mouth'
  | 'clothing'
  | 'headwear'
  | 'accessory'
  | 'background';

// Curated Palettes
export const SKIN_TONES = [
  { label: 'Fair Ivory', value: '#ffd8be' },
  { label: 'Peach Warm', value: '#fcd3b3' },
  { label: 'Sunlit Honey', value: '#f5be8e' },
  { label: 'Golden Tan', value: '#d4976a' },
  { label: 'Warm Caramel', value: '#b46f43' },
  { label: 'Rich Chestnut', value: '#7c4323' },
  { label: 'Deep Espresso', value: '#4a2512' },
  { label: 'Cyber Violet', value: '#c4b5fd' },
  { label: 'Neon Mint', value: '#a7f3d0' },
  { label: 'Arcade Gold', value: '#fde047' },
  { label: 'Android Slate', value: '#cbd5e1' },
];

export const HAIR_COLORS = [
  { label: 'Midnight Black', value: '#1e293b' },
  { label: 'Dark Chocolate', value: '#3b2318' },
  { label: 'Chestnut Brown', value: '#6b3f23' },
  { label: 'Golden Honey', value: '#d97706' },
  { label: 'Electric Blonde', value: '#fbbf24' },
  { label: 'Crimson Flame', value: '#dc2626' },
  { label: 'Arcade Fuchsia', value: '#d946ef' },
  { label: 'Synth Cyan', value: '#06b6d4' },
  { label: 'Neon Violet', value: '#8b5cf6' },
  { label: 'Toxic Green', value: '#10b981' },
  { label: 'Platinum Silver', value: '#e2e8f0' },
];

export const EYE_COLORS = [
  { label: 'Deep Amber', value: '#f59e0b' },
  { label: 'Ocean Sky', value: '#0284c7' },
  { label: 'Cyber Teal', value: '#14b8a6' },
  { label: 'Neon Emerald', value: '#10b981' },
  { label: 'Electric Violet', value: '#8b5cf6' },
  { label: 'Ruby Laser', value: '#ef4444' },
  { label: 'Obsidian Dark', value: '#1e293b' },
];

export const CLOTHING_COLORS = [
  { label: 'Arcade Indigo', value: '#4f46e5' },
  { label: 'Cyber Teal', value: '#0d9488' },
  { label: 'Vapor Fuchsia', value: '#c026d3' },
  { label: 'Crimson Nitro', value: '#e11d48' },
  { label: 'Sunset Amber', value: '#ea580c' },
  { label: 'Stealth Black', value: '#0f172a' },
  { label: 'Matrix Emerald', value: '#059669' },
  { label: 'Ice White', value: '#f1f5f9' },
];

export const ACCENT_COLORS = [
  { label: 'Laser Yellow', value: '#facc15' },
  { label: 'Electric Cyan', value: '#38bdf8' },
  { label: 'Neon Pink', value: '#f43f5e' },
  { label: 'Lime Burst', value: '#4ade80' },
  { label: 'Pure White', value: '#ffffff' },
  { label: 'Violet Glow', value: '#a855f7' },
  { label: 'Orange Flare', value: '#fb923c' },
];

export const HEADWEAR_COLORS = [
  { label: 'Slate Charcoal', value: '#1e293b' },
  { label: 'Arcade Gold', value: '#eab308' },
  { label: 'Hyper Cyan', value: '#06b6d4' },
  { label: 'Magenta Pop', value: '#ec4899' },
  { label: 'Royal Violet', value: '#7c3aed' },
  { label: 'Racing Red', value: '#dc2626' },
  { label: 'Pure White', value: '#ffffff' },
];
