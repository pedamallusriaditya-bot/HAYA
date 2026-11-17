import React from 'react';
import type { AvatarConfig } from '@/types/avatar';
import { darkenColor, lightenColor } from './parts/colorUtils';
import { BackgroundDefs, BackgroundEffects } from './parts/BackgroundParts';
import { getBackgroundFill } from './parts/backgroundUtils';
import { BackHair, FrontHair } from './parts/HairParts';
import { FaceShape, FaceDetails, Eyebrows, Eyes, Nose, Mouth } from './parts/FaceParts';
import { Clothing } from './parts/ClothingParts';
import { Accessories, Headwear } from './parts/AccessoriesParts';

type AvatarSvgProps = {
  config: AvatarConfig;
  size?: number | string;
  className?: string;
  animate?: boolean;
};

export default function AvatarSvg({
  config,
  size = 200,
  className = '',
  animate = false,
}: AvatarSvgProps) {
  const {
    baseShape,
    skinTone,
    hairStyle,
    hairColor,
    eyeStyle,
    eyeColor,
    eyebrowStyle,
    expression,
    clothing,
    clothingColor,
    clothingAccentColor,
    headwear,
    headwearColor,
    accessory,
    accessoryColor,
    background,
  } = config;

  // Darker shade calculation for neck/jaw shadows
  const shadowSkin = darkenColor(skinTone, 0.18);
  const deepHairShadow = darkenColor(hairColor, 0.25);
  const hairHighlight = lightenColor(hairColor, 0.22);
  const clothingShadow = darkenColor(clothingColor, 0.2);

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`select-none overflow-hidden rounded-2xl ${className} ${
        animate ? 'transition-all duration-300' : ''
      }`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <BackgroundDefs />

      {/* 1. BACKGROUND LAYER */}
      <rect width="200" height="200" rx="16" fill={getBackgroundFill(background)} />

      <BackgroundEffects background={background} />

      {/* Main Avatar Character Group (Supports Subtle Breathing Animation) */}
      <g className={animate ? 'origin-bottom animate-[pulse_4s_ease-in-out_infinite]' : ''}>
        {/* 2. BACK HAIR LAYER (Falls behind shoulders) */}
        <BackHair style={hairStyle} shadow={deepHairShadow} />

        {/* 3. NECK & BODY BASE */}
        <g id="neck-and-body">
          {/* Neck */}
          <rect x="87" y="115" width="26" height="32" rx="4" fill={shadowSkin} />
          <path d="M87 122 Q100 132 113 122 L113 140 L87 140 Z" fill={shadowSkin} opacity="0.5" />

          {/* Shoulders / Upper Torso base */}
          <path
            d="M32 195 L36 158 C42 144 56 138 78 136 L122 136 C144 138 158 144 164 158 L168 195 Z"
            fill={shadowSkin}
          />
        </g>

        {/* 4. CLOTHING LAYER */}
        <Clothing
          style={clothing}
          color={clothingColor}
          accent={clothingAccentColor}
          shadow={clothingShadow}
        />

        {/* 5. HEAD & EARS */}
        <g id="head-base">
          {/* Ears */}
          <circle cx="53" cy="94" r="10" fill={skinTone} />
          <circle cx="53" cy="94" r="6" fill={shadowSkin} />
          <circle cx="147" cy="94" r="10" fill={skinTone} />
          <circle cx="147" cy="94" r="6" fill={shadowSkin} />

          {/* Face Shapes */}
          <FaceShape shape={baseShape} skin={skinTone} shadow={shadowSkin} />
        </g>

        {/* 6. FACE DETAILS (Blush, Bandaid, Star Tattoo) */}
        <FaceDetails accessory={accessory} color={accessoryColor} />

        {/* 7. EYES, BROWS & MOUTH */}
        <g id="facial-features">
          <Eyebrows style={eyebrowStyle} color={hairColor} />
          <Eyes style={eyeStyle} color={eyeColor} />
          <Nose shadow={shadowSkin} />
          <Mouth expr={expression} />
        </g>

        {/* 8. FRONT HAIR LAYER */}
        <FrontHair
          style={hairStyle}
          color={hairColor}
          highlight={hairHighlight}
          shadow={deepHairShadow}
        />

        {/* 9. ACCESSORIES (Glasses, Shades, Earrings) */}
        <Accessories style={accessory} color={accessoryColor} />

        {/* 10. HEADWEAR (Caps, Beanies, Headsets, Crowns) */}
        <Headwear
          style={headwear}
          color={headwearColor}
          accent={clothingAccentColor}
        />
      </g>

      {/* Outer Glow / Arcade Border Frame */}
      <rect
        x="0.75"
        y="0.75"
        width="198.5"
        height="198.5"
        rx="15.25"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
