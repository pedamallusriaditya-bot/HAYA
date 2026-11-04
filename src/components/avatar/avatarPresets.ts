import type {
  AvatarConfig,
  BaseShape,
  HairStyle,
  EyeStyle,
  EyebrowStyle,
  Expression,
  ClothingStyle,
  HeadwearStyle,
  AccessoryStyle,
  BackgroundStyle,
} from '../../types/avatar.ts';
import {
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CLOTHING_COLORS,
  ACCENT_COLORS,
  HEADWEAR_COLORS,
} from '../../types/avatar.ts';

export const DEFAULT_ADITYA_AVATAR: AvatarConfig = {
  version: 1,
  displayName: 'Aditya',
  baseShape: 'square',
  skinTone: '#f5be8e',
  hairStyle: 'spiky',
  hairColor: '#1e293b',
  eyeStyle: 'focused',
  eyeColor: '#0284c7',
  eyebrowStyle: 'bold',
  expression: 'determined',
  clothing: 'arcade_hoodie',
  clothingColor: '#0f172a',
  clothingAccentColor: '#38bdf8',
  headwear: 'gamer_headset',
  headwearColor: '#06b6d4',
  accessory: 'none',
  accessoryColor: '#facc15',
  background: 'cyber_neon',
};

export const DEFAULT_HARIKA_AVATAR: AvatarConfig = {
  version: 1,
  displayName: 'Harika',
  baseShape: 'round',
  skinTone: '#fcd3b3',
  hairStyle: 'wavy',
  hairColor: '#3b2318',
  eyeStyle: 'anime_sparkle',
  eyeColor: '#8b5cf6',
  eyebrowStyle: 'arched',
  expression: 'smile',
  clothing: 'varsity_jacket',
  clothingColor: '#c026d3',
  clothingAccentColor: '#f43f5e',
  headwear: 'none',
  headwearColor: '#ec4899',
  accessory: 'star_tattoo',
  accessoryColor: '#facc15',
  background: 'cosmic_purple',
};

export const DEFAULT_BOT_AVATAR: AvatarConfig = {
  version: 1,
  displayName: 'CPU Bot',
  baseShape: 'cyber',
  skinTone: '#cbd5e1',
  hairStyle: 'cyber_buzz',
  hairColor: '#06b6d4',
  eyeStyle: 'cyber_glow',
  eyeColor: '#10b981',
  eyebrowStyle: 'bold',
  expression: 'grin',
  clothing: 'cyber_techwear',
  clothingColor: '#0f172a',
  clothingAccentColor: '#4ade80',
  headwear: 'gamer_headset',
  headwearColor: '#1e293b',
  accessory: 'sunglasses',
  accessoryColor: '#10b981',
  background: 'emerald_matrix',
};

export const PRESET_AVATARS: { name: string; description: string; config: AvatarConfig }[] = [
  {
    name: 'Cyberpunk Rebel',
    description: 'High-tech neon techwear with glowing laser shades',
    config: {
      version: 1,
      baseShape: 'cyber',
      skinTone: '#ffd8be',
      hairStyle: 'spiky',
      hairColor: '#06b6d4',
      eyeStyle: 'cyber_glow',
      eyeColor: '#0284c7',
      eyebrowStyle: 'bold',
      expression: 'determined',
      clothing: 'cyber_techwear',
      clothingColor: '#0f172a',
      clothingAccentColor: '#38bdf8',
      headwear: 'cyber_headband',
      headwearColor: '#06b6d4',
      accessory: 'sunglasses',
      accessoryColor: '#06b6d4',
      background: 'cyber_neon',
    },
  },
  {
    name: 'Arcade Champion',
    description: 'Golden crown and tournament gamer jersey',
    config: {
      version: 1,
      baseShape: 'oval',
      skinTone: '#d4976a',
      hairStyle: 'short',
      hairColor: '#1e293b',
      eyeStyle: 'focused',
      eyeColor: '#f59e0b',
      eyebrowStyle: 'natural',
      expression: 'grin',
      clothing: 'gamer_jersey',
      clothingColor: '#ea580c',
      clothingAccentColor: '#facc15',
      headwear: 'crown',
      headwearColor: '#eab308',
      accessory: 'earrings',
      accessoryColor: '#facc15',
      background: 'warm_amber',
    },
  },
  {
    name: 'Cosmic Dreamer',
    description: 'Starry galaxy aesthetic with relaxed hoodie vibes',
    config: {
      version: 1,
      baseShape: 'heart',
      skinTone: '#fcd3b3',
      hairStyle: 'long',
      hairColor: '#d946ef',
      eyeStyle: 'anime_sparkle',
      eyeColor: '#8b5cf6',
      eyebrowStyle: 'arched',
      expression: 'smile',
      clothing: 'arcade_hoodie',
      clothingColor: '#c026d3',
      clothingAccentColor: '#f43f5e',
      headwear: 'cat_ears_headset',
      headwearColor: '#ec4899',
      accessory: 'face_blush',
      accessoryColor: '#f43f5e',
      background: 'cosmic_purple',
    },
  },
  {
    name: 'Retro Synthwave',
    description: '80s arcade cap, cool shades, and neon grid',
    config: {
      version: 1,
      baseShape: 'round',
      skinTone: '#f5be8e',
      hairStyle: 'curly',
      hairColor: '#3b2318',
      eyeStyle: 'chill_almond',
      eyeColor: '#14b8a6',
      eyebrowStyle: 'natural',
      expression: 'smile',
      clothing: 'varsity_jacket',
      clothingColor: '#4f46e5',
      clothingAccentColor: '#facc15',
      headwear: 'arcade_cap',
      headwearColor: '#dc2626',
      accessory: 'sunglasses',
      accessoryColor: '#facc15',
      background: 'retro_grid',
    },
  },
  {
    name: 'Midnight Streamer',
    description: 'Pro gaming headset, cozy oversized sweater, and chill smile',
    config: {
      version: 1,
      baseShape: 'oval',
      skinTone: '#ffd8be',
      hairStyle: 'ponytail',
      hairColor: '#6b3f23',
      eyeStyle: 'wide',
      eyeColor: '#0284c7',
      eyebrowStyle: 'natural',
      expression: 'laugh',
      clothing: 'sweater',
      clothingColor: '#059669',
      clothingAccentColor: '#ffffff',
      headwear: 'gamer_headset',
      headwearColor: '#1e293b',
      accessory: 'glasses',
      accessoryColor: '#facc15',
      background: 'midnight_gradient',
    },
  },
];

const BASE_SHAPES: BaseShape[] = ['round', 'oval', 'square', 'heart', 'cyber'];
const HAIR_STYLES: HairStyle[] = [
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
];
const EYE_STYLES: EyeStyle[] = ['focused', 'anime_sparkle', 'chill_almond', 'wide', 'cyber_glow', 'wink'];
const EYEBROW_STYLES: EyebrowStyle[] = ['natural', 'arched', 'bold', 'furrowed'];
const EXPRESSIONS: Expression[] = ['neutral', 'smile', 'grin', 'laugh', 'determined', 'surprised'];
const CLOTHING_STYLES: ClothingStyle[] = [
  'arcade_hoodie',
  'tshirt',
  'varsity_jacket',
  'gamer_jersey',
  'cyber_techwear',
  'sweater',
];
const HEADWEAR_STYLES: HeadwearStyle[] = [
  'none',
  'none', // weighted toward none
  'arcade_cap',
  'beanie',
  'cyber_headband',
  'gamer_headset',
  'cat_ears_headset',
  'crown',
];
const ACCESSORY_STYLES: AccessoryStyle[] = [
  'none',
  'none', // weighted toward none
  'glasses',
  'sunglasses',
  'earrings',
  'face_blush',
  'arcade_bandaid',
  'star_tattoo',
];
const BACKGROUND_STYLES: BackgroundStyle[] = [
  'arcade_dark',
  'retro_grid',
  'midnight_gradient',
  'cyber_neon',
  'warm_amber',
  'cosmic_purple',
  'emerald_matrix',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomAvatarConfig(currentName?: string): AvatarConfig {
  return {
    version: 1,
    displayName: currentName || 'Player',
    baseShape: pickRandom(BASE_SHAPES),
    skinTone: pickRandom(SKIN_TONES).value,
    hairStyle: pickRandom(HAIR_STYLES),
    hairColor: pickRandom(HAIR_COLORS).value,
    eyeStyle: pickRandom(EYE_STYLES),
    eyeColor: pickRandom(EYE_COLORS).value,
    eyebrowStyle: pickRandom(EYEBROW_STYLES),
    expression: pickRandom(EXPRESSIONS),
    clothing: pickRandom(CLOTHING_STYLES),
    clothingColor: pickRandom(CLOTHING_COLORS).value,
    clothingAccentColor: pickRandom(ACCENT_COLORS).value,
    headwear: pickRandom(HEADWEAR_STYLES),
    headwearColor: pickRandom(HEADWEAR_COLORS).value,
    accessory: pickRandom(ACCESSORY_STYLES),
    accessoryColor: pickRandom(ACCENT_COLORS).value,
    background: pickRandom(BACKGROUND_STYLES),
  };
}

/**
 * Validates and sanitizes avatar configuration, falling back gracefully
 * if fields are missing or corrupted.
 */
export function sanitizeAvatarConfig(raw: unknown, defaultName = 'Player'): AvatarConfig {
  const fallback = defaultName.toLowerCase().includes('harika')
    ? DEFAULT_HARIKA_AVATAR
    : DEFAULT_ADITYA_AVATAR;

  if (!raw || typeof raw !== 'object') {
    return { ...fallback, displayName: defaultName };
  }

  const obj = raw as Record<string, unknown>;

  const check = <T>(val: unknown, validList: T[], fallbackVal: T): T => {
    return typeof val === 'string' && (validList as unknown[]).includes(val)
      ? (val as unknown as T)
      : fallbackVal;
  };

  const checkColor = (val: unknown, fallbackVal: string): string => {
    if (typeof val === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) {
      return val;
    }
    return fallbackVal;
  };

  return {
    version: 1,
    displayName:
      typeof obj.displayName === 'string' && obj.displayName.trim().length > 0
        ? obj.displayName.trim().slice(0, 20)
        : defaultName,
    baseShape: check(obj.baseShape, BASE_SHAPES, fallback.baseShape),
    skinTone: checkColor(obj.skinTone, fallback.skinTone),
    hairStyle: check(obj.hairStyle, HAIR_STYLES, fallback.hairStyle),
    hairColor: checkColor(obj.hairColor, fallback.hairColor),
    eyeStyle: check(obj.eyeStyle, EYE_STYLES, fallback.eyeStyle),
    eyeColor: checkColor(obj.eyeColor, fallback.eyeColor),
    eyebrowStyle: check(obj.eyebrowStyle, EYEBROW_STYLES, fallback.eyebrowStyle),
    expression: check(obj.expression, EXPRESSIONS, fallback.expression),
    clothing: check(obj.clothing, CLOTHING_STYLES, fallback.clothing),
    clothingColor: checkColor(obj.clothingColor, fallback.clothingColor),
    clothingAccentColor: checkColor(obj.clothingAccentColor, fallback.clothingAccentColor),
    headwear: check(obj.headwear, HEADWEAR_STYLES, fallback.headwear),
    headwearColor: checkColor(obj.headwearColor, fallback.headwearColor),
    accessory: check(obj.accessory, ACCESSORY_STYLES, fallback.accessory),
    accessoryColor: checkColor(obj.accessoryColor, fallback.accessoryColor),
    background: check(obj.background, BACKGROUND_STYLES, fallback.background),
  };
}
