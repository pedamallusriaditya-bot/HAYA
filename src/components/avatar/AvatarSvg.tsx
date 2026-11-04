import React from 'react';
import type { AvatarConfig } from '@/types/avatar';

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
      <defs>
        {/* Glow Filters */}
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Linear Gradients */}
        <linearGradient id="cyber-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="50%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id="warm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#451a03" />
          <stop offset="70%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        <linearGradient id="cosmic-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e1035" />
          <stop offset="50%" stopColor="#3b0764" />
          <stop offset="100%" stopColor="#c026d3" stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id="midnight-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#030712" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        <linearGradient id="emerald-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#022c22" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>

        {/* Glasses sheen gradient */}
        <linearGradient id="lens-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1. BACKGROUND LAYER */}
      <rect width="200" height="200" rx="16" fill={getBackgroundFill(background)} />

      {background === 'retro_grid' && (
        <g opacity="0.35">
          {/* Synthwave Grid Lines */}
          <line x1="0" y1="140" x2="200" y2="140" stroke="#f43f5e" strokeWidth="1" />
          <line x1="0" y1="155" x2="200" y2="155" stroke="#f43f5e" strokeWidth="1.2" />
          <line x1="0" y1="172" x2="200" y2="172" stroke="#f43f5e" strokeWidth="1.5" />
          <line x1="0" y1="192" x2="200" y2="192" stroke="#f43f5e" strokeWidth="2" />
          <line x1="100" y1="130" x2="20" y2="200" stroke="#06b6d4" strokeWidth="1.2" />
          <line x1="100" y1="130" x2="60" y2="200" stroke="#06b6d4" strokeWidth="1.2" />
          <line x1="100" y1="130" x2="100" y2="200" stroke="#06b6d4" strokeWidth="1.2" />
          <line x1="100" y1="130" x2="140" y2="200" stroke="#06b6d4" strokeWidth="1.2" />
          <line x1="100" y1="130" x2="180" y2="200" stroke="#06b6d4" strokeWidth="1.2" />
          {/* Distant Sun */}
          <circle cx="100" cy="115" r="30" fill="#f59e0b" opacity="0.4" filter="url(#neon-glow)" />
        </g>
      )}

      {background === 'cyber_neon' && (
        <g opacity="0.4">
          <circle cx="100" cy="95" r="75" stroke="#38bdf8" strokeWidth="2" fill="none" strokeDasharray="6 4" />
          <circle cx="100" cy="95" r="62" stroke="#f43f5e" strokeWidth="1.5" fill="none" />
        </g>
      )}

      {background === 'cosmic_purple' && (
        <g opacity="0.6">
          <circle cx="35" cy="35" r="1.5" fill="#ffffff" />
          <circle cx="165" cy="40" r="1.2" fill="#ffffff" />
          <circle cx="175" cy="110" r="1.8" fill="#fbcfe8" />
          <circle cx="25" cy="120" r="1.2" fill="#ffffff" />
          <circle cx="85" cy="20" r="1" fill="#ffffff" />
          <circle cx="140" cy="15" r="1.5" fill="#fbcfe8" />
          {/* Subtle Nebula glow */}
          <circle cx="100" cy="80" r="50" fill="#a855f7" opacity="0.25" filter="url(#neon-glow)" />
        </g>
      )}

      {background === 'emerald_matrix' && (
        <g opacity="0.25">
          <line x1="0" y1="30" x2="200" y2="30" stroke="#10b981" strokeWidth="0.8" strokeDasharray="4 8" />
          <line x1="0" y1="70" x2="200" y2="70" stroke="#10b981" strokeWidth="0.8" strokeDasharray="6 6" />
          <line x1="0" y1="110" x2="200" y2="110" stroke="#10b981" strokeWidth="0.8" strokeDasharray="3 9" />
          <line x1="0" y1="150" x2="200" y2="150" stroke="#10b981" strokeWidth="0.8" strokeDasharray="5 7" />
          <line x1="0" y1="190" x2="200" y2="190" stroke="#10b981" strokeWidth="0.8" strokeDasharray="4 8" />
        </g>
      )}

      {/* Main Avatar Character Group (Supports Subtle Breathing Animation) */}
      <g className={animate ? 'origin-bottom animate-[pulse_4s_ease-in-out_infinite]' : ''}>
        {/* 2. BACK HAIR LAYER (Falls behind shoulders) */}
        {renderBackHair(hairStyle, hairColor, deepHairShadow)}

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
        {renderClothing(clothing, clothingColor, clothingAccentColor, clothingShadow)}

        {/* 5. HEAD & EARS */}
        <g id="head-base">
          {/* Ears */}
          <circle cx="53" cy="94" r="10" fill={skinTone} />
          <circle cx="53" cy="94" r="6" fill={shadowSkin} />
          <circle cx="147" cy="94" r="10" fill={skinTone} />
          <circle cx="147" cy="94" r="6" fill={shadowSkin} />

          {/* Face Shapes */}
          {renderFaceShape(baseShape, skinTone, shadowSkin)}
        </g>

        {/* 6. FACE DETAILS (Blush, Bandaid, Star Tattoo) */}
        {renderFaceDetails(accessory, accessoryColor)}

        {/* 7. EYES, BROWS & MOUTH */}
        <g id="facial-features">
          {renderEyebrows(eyebrowStyle, hairColor)}
          {renderEyes(eyeStyle, eyeColor)}
          {renderNose(shadowSkin)}
          {renderMouth(expression)}
        </g>

        {/* 8. FRONT HAIR LAYER */}
        {renderFrontHair(hairStyle, hairColor, hairHighlight, deepHairShadow)}

        {/* 9. ACCESSORIES (Glasses, Shades, Earrings) */}
        {renderAccessories(accessory, accessoryColor)}

        {/* 10. HEADWEAR (Caps, Beanies, Headsets, Crowns) */}
        {renderHeadwear(headwear, headwearColor, clothingAccentColor)}
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

/* =========================================================================
   LAYER RENDERERS
   ========================================================================= */

function getBackgroundFill(bg: string): string {
  switch (bg) {
    case 'retro_grid':
      return '#0f051d';
    case 'cyber_neon':
      return 'url(#cyber-bg)';
    case 'warm_amber':
      return 'url(#warm-bg)';
    case 'cosmic_purple':
      return 'url(#cosmic-bg)';
    case 'midnight_gradient':
      return 'url(#midnight-bg)';
    case 'emerald_matrix':
      return 'url(#emerald-bg)';
    case 'transparent':
      return 'transparent';
    case 'arcade_dark':
    default:
      return '#0b0f19';
  }
}

function renderFaceShape(shape: string, skin: string, shadow: string) {
  switch (shape) {
    case 'round':
      return (
        <path
          d="M58 82 C58 48 74 44 100 44 C126 44 142 48 142 82 C142 118 126 136 100 136 C74 136 58 118 58 82 Z"
          fill={skin}
        />
      );
    case 'oval':
      return (
        <path
          d="M60 82 C60 46 76 42 100 42 C124 42 140 46 140 82 C140 122 122 139 100 139 C78 139 60 122 60 82 Z"
          fill={skin}
        />
      );
    case 'square':
      return (
        <path
          d="M58 80 C58 48 74 44 100 44 C126 44 142 48 142 80 C142 110 134 130 118 134 C108 136 92 136 82 134 C66 130 58 110 58 80 Z"
          fill={skin}
        />
      );
    case 'heart':
      return (
        <path
          d="M56 76 C56 46 75 43 100 45 C125 43 144 46 144 76 C144 108 126 134 100 137 C74 134 56 108 56 76 Z"
          fill={skin}
        />
      );
    case 'cyber':
      return (
        <g>
          <path
            d="M58 75 L62 48 C75 44 125 44 138 48 L142 75 L138 115 L116 135 L84 135 L62 115 Z"
            fill={skin}
          />
          {/* Subtle cybernetic jawline edge lines */}
          <path d="M68 112 L84 130 L116 130 L132 112" stroke={shadow} strokeWidth="1.2" fill="none" opacity="0.6" />
        </g>
      );
    default:
      return (
        <path
          d="M58 82 C58 48 74 44 100 44 C126 44 142 48 142 82 C142 118 126 136 100 136 C74 136 58 118 58 82 Z"
          fill={skin}
        />
      );
  }
}

function renderBackHair(style: string, color: string, shadow: string) {
  switch (style) {
    case 'long':
      return (
        <g id="back-hair-long">
          <path
            d="M52 80 C40 100 36 145 42 185 C46 192 64 195 72 170 C76 150 78 120 78 95 Z"
            fill={shadow}
          />
          <path
            d="M148 80 C160 100 164 145 158 185 C154 192 136 195 128 170 C124 150 122 120 122 95 Z"
            fill={shadow}
          />
        </g>
      );
    case 'ponytail':
      return (
        <g id="back-hair-ponytail">
          {/* High voluminous ponytail puffing behind head */}
          <path
            d="M100 50 C120 20 160 30 168 65 C174 95 158 125 150 145 C146 130 148 95 138 75 C128 55 110 52 100 50 Z"
            fill={shadow}
          />
        </g>
      );
    case 'wavy':
      return (
        <g id="back-hair-wavy">
          <path
            d="M50 82 C42 105 38 135 44 155 C48 165 62 175 70 155 C74 135 76 110 76 90 Z"
            fill={shadow}
          />
          <path
            d="M150 82 C158 105 162 135 156 155 C152 165 138 175 130 155 C126 135 124 110 124 90 Z"
            fill={shadow}
          />
        </g>
      );
    case 'curly':
      return (
        <g id="back-hair-curly">
          <circle cx="48" cy="95" r="16" fill={shadow} />
          <circle cx="46" cy="118" r="16" fill={shadow} />
          <circle cx="50" cy="140" r="14" fill={shadow} />
          <circle cx="152" cy="95" r="16" fill={shadow} />
          <circle cx="154" cy="118" r="16" fill={shadow} />
          <circle cx="150" cy="140" r="14" fill={shadow} />
        </g>
      );
    case 'dreads':
      return (
        <g id="back-hair-dreads">
          <rect x="42" y="85" width="10" height="75" rx="5" fill={shadow} />
          <rect x="36" y="95" width="9" height="65" rx="4.5" fill={shadow} />
          <rect x="148" y="85" width="10" height="75" rx="5" fill={shadow} />
          <rect x="155" y="95" width="9" height="65" rx="4.5" fill={shadow} />
        </g>
      );
    default:
      return null;
  }
}

function renderFrontHair(style: string, color: string, highlight: string, shadow: string) {
  switch (style) {
    case 'short':
      return (
        <g id="hair-short">
          {/* Main hair cap */}
          <path
            d="M52 82 C50 50 68 34 100 34 C132 34 150 50 148 82 C142 66 128 54 108 55 C90 56 70 65 52 82 Z"
            fill={color}
          />
          {/* Side bangs */}
          <path d="M52 75 L62 88 L65 72 L78 86 L80 62 L60 52 Z" fill={color} />
          {/* Hair shine */}
          <path d="M80 42 Q100 38 120 42" stroke={highlight} strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'spiky':
      return (
        <g id="hair-spiky">
          <path
            d="M50 80 L42 60 L58 64 L54 44 L72 52 L76 30 L95 45 L106 24 L120 44 L138 32 L138 52 L154 48 L148 70 L158 64 L148 84 C135 60 115 56 100 58 C80 60 62 68 50 80 Z"
            fill={color}
          />
          {/* Front fringe spikes */}
          <polygon points="70,60 85,78 82,62" fill={shadow} />
          <polygon points="90,60 102,78 106,60" fill={highlight} />
          <polygon points="112,62 125,76 122,60" fill={color} />
        </g>
      );
    case 'curly':
      return (
        <g id="hair-curly">
          <circle cx="58" cy="62" r="15" fill={color} />
          <circle cx="78" cy="46" r="16" fill={color} />
          <circle cx="100" cy="42" r="17" fill={color} />
          <circle cx="122" cy="46" r="16" fill={color} />
          <circle cx="142" cy="62" r="15" fill={color} />
          <circle cx="64" cy="78" r="12" fill={color} />
          <circle cx="136" cy="78" r="12" fill={color} />
          <circle cx="82" cy="62" r="10" fill={highlight} />
          <circle cx="118" cy="62" r="10" fill={highlight} />
        </g>
      );
    case 'wavy':
      return (
        <g id="hair-wavy">
          <path
            d="M52 82 C50 48 70 34 100 34 C130 34 150 48 148 82 C146 95 142 110 138 120 C134 102 136 82 132 68 C122 54 105 52 90 56 C75 60 62 72 58 92 C54 105 52 118 50 125 C48 112 50 96 52 82 Z"
            fill={color}
          />
          {/* Sweeping soft wave */}
          <path d="M68 54 Q100 48 126 62" stroke={highlight} strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'long':
      return (
        <g id="hair-long">
          <path
            d="M52 85 C50 48 70 36 100 36 C130 36 150 48 148 85 C146 110 142 140 138 160 C132 140 135 110 132 85 C124 64 110 58 100 58 C90 58 76 64 68 85 C65 110 68 140 62 160 C58 140 54 110 52 85 Z"
            fill={color}
          />
          <path d="M78 44 Q100 40 122 44" stroke={highlight} strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'side_part':
      return (
        <g id="hair-side-part">
          <path
            d="M52 82 C50 50 65 36 95 35 C128 35 148 48 148 82 C138 68 124 58 98 58 C80 58 68 68 52 82 Z"
            fill={color}
          />
          {/* Swept bang over eye */}
          <path d="M72 40 L135 62 C120 78 100 84 85 82 L72 65 Z" fill={color} />
          <path d="M78 44 L125 62" stroke={highlight} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'ponytail':
      return (
        <g id="hair-ponytail-front">
          <path
            d="M54 82 C52 48 70 38 100 38 C130 38 148 48 146 82 C140 64 125 56 100 56 C75 56 60 64 54 82 Z"
            fill={color}
          />
          {/* Top knot tie */}
          <circle cx="106" cy="38" r="8" fill={highlight} />
        </g>
      );
    case 'bob':
      return (
        <g id="hair-bob">
          <path
            d="M52 82 C50 46 70 34 100 34 C130 34 150 46 148 82 C146 112 138 128 128 125 C132 105 130 82 125 68 C118 58 105 56 100 56 C95 56 82 58 75 68 C70 82 68 105 72 125 C62 128 54 112 52 82 Z"
            fill={color}
          />
          {/* Bang fringe */}
          <path d="M75 58 Q100 64 125 58 L125 68 Q100 74 75 68 Z" fill={color} />
        </g>
      );
    case 'dreads':
      return (
        <g id="hair-dreads-front">
          <rect x="52" y="45" width="10" height="48" rx="5" fill={color} />
          <rect x="65" y="38" width="10" height="54" rx="5" fill={color} />
          <rect x="80" y="34" width="11" height="52" rx="5" fill={color} />
          <rect x="95" y="32" width="10" height="48" rx="5" fill={color} />
          <rect x="110" y="34" width="11" height="52" rx="5" fill={color} />
          <rect x="125" y="38" width="10" height="54" rx="5" fill={color} />
          <rect x="138" y="45" width="10" height="48" rx="5" fill={color} />
          {/* Golden bead clips */}
          <rect x="65" y="60" width="10" height="5" fill="#facc15" rx="1" />
          <rect x="125" y="66" width="10" height="5" fill="#facc15" rx="1" />
        </g>
      );
    case 'cyber_buzz':
      return (
        <g id="hair-cyber-buzz">
          <path
            d="M54 78 C54 48 70 38 100 38 C130 38 146 48 146 78 C138 65 125 56 100 56 C75 56 62 65 54 78 Z"
            fill={color}
          />
          {/* Dual cyber shaved razor cut slits */}
          <line x1="124" y1="50" x2="136" y2="60" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
          <line x1="128" y1="56" x2="140" y2="66" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'afro':
      return (
        <g id="hair-afro">
          <circle cx="100" cy="65" r="46" fill={color} />
          <circle cx="70" cy="65" r="32" fill={color} />
          <circle cx="130" cy="65" r="32" fill={color} />
          <circle cx="100" cy="42" r="30" fill={highlight} opacity="0.3" />
        </g>
      );
    default:
      return null;
  }
}

function renderEyebrows(style: string, color: string) {
  switch (style) {
    case 'arched':
      return (
        <g stroke={color} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M72 75 Q82 69 92 74" />
          <path d="M108 74 Q118 69 128 75" />
        </g>
      );
    case 'bold':
      return (
        <g stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none">
          <path d="M70 76 L92 73" />
          <path d="M108 73 L130 76" />
        </g>
      );
    case 'furrowed':
      return (
        <g stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M70 73 L92 78" />
          <path d="M108 78 L130 73" />
        </g>
      );
    case 'natural':
    default:
      return (
        <g stroke={color} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M71 76 Q81 72 91 75" />
          <path d="M109 75 Q119 72 129 76" />
        </g>
      );
  }
}

function renderEyes(style: string, color: string) {
  switch (style) {
    case 'anime_sparkle':
      return (
        <g id="eyes-anime">
          {/* Sclera */}
          <ellipse cx="81" cy="90" rx="9" ry="11" fill="#ffffff" />
          <ellipse cx="119" cy="90" rx="9" ry="11" fill="#ffffff" />
          {/* Iris */}
          <ellipse cx="81" cy="91" rx="7" ry="8.5" fill={color} />
          <ellipse cx="119" cy="91" rx="7" ry="8.5" fill={color} />
          {/* Pupil */}
          <circle cx="81" cy="91" r="4.5" fill="#0f172a" />
          <circle cx="119" cy="91" r="4.5" fill="#0f172a" />
          {/* Big Specular Catchlights */}
          <circle cx="79" cy="88" r="3" fill="#ffffff" />
          <circle cx="117" cy="88" r="3" fill="#ffffff" />
          <circle cx="84" cy="94" r="1.5" fill="#ffffff" />
          <circle cx="122" cy="94" r="1.5" fill="#ffffff" />
          {/* Eyelash line */}
          <path d="M70 85 Q81 81 92 86" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M108 86 Q119 81 130 85" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'chill_almond':
      return (
        <g id="eyes-chill">
          <ellipse cx="81" cy="90" rx="8" ry="7" fill="#ffffff" />
          <ellipse cx="119" cy="90" rx="8" ry="7" fill="#ffffff" />
          <circle cx="81" cy="90" r="5" fill={color} />
          <circle cx="119" cy="90" r="5" fill={color} />
          <circle cx="81" cy="90" r="2.8" fill="#0f172a" />
          <circle cx="119" cy="90" r="2.8" fill="#0f172a" />
          <circle cx="79" cy="88.5" r="1.8" fill="#ffffff" />
          <circle cx="117" cy="88.5" r="1.8" fill="#ffffff" />
          {/* Eyelids */}
          <path d="M72 88 Q81 84 90 88" stroke="#0f172a" strokeWidth="2.5" fill="none" />
          <path d="M110 88 Q119 84 128 88" stroke="#0f172a" strokeWidth="2.5" fill="none" />
        </g>
      );
    case 'wide':
      return (
        <g id="eyes-wide">
          <circle cx="81" cy="89" r="8.5" fill="#ffffff" />
          <circle cx="119" cy="89" r="8.5" fill="#ffffff" />
          <circle cx="81" cy="89" r="5.5" fill={color} />
          <circle cx="119" cy="89" r="5.5" fill={color} />
          <circle cx="81" cy="89" r="3.2" fill="#0f172a" />
          <circle cx="119" cy="89" r="3.2" fill="#0f172a" />
          <circle cx="79" cy="87" r="2" fill="#ffffff" />
          <circle cx="117" cy="87" r="2" fill="#ffffff" />
        </g>
      );
    case 'cyber_glow':
      return (
        <g id="eyes-cyber">
          {/* Cyber glowing visor pupil */}
          <rect x="73" y="85" width="16" height="8" rx="4" fill="#0f172a" />
          <rect x="111" y="85" width="16" height="8" rx="4" fill="#0f172a" />
          <rect x="75" y="87" width="12" height="4" rx="2" fill={color} filter="url(#neon-glow)" />
          <rect x="113" y="87" width="12" height="4" rx="2" fill={color} filter="url(#neon-glow)" />
          <line x1="70" y1="89" x2="130" y2="89" stroke={color} strokeWidth="1" opacity="0.4" />
        </g>
      );
    case 'wink':
      return (
        <g id="eyes-wink">
          {/* Left Eye is Winking line */}
          <path d="M73 90 Q81 83 89 90" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Right Eye is Open Sparkle */}
          <ellipse cx="119" cy="90" rx="8" ry="9" fill="#ffffff" />
          <circle cx="119" cy="90" r="5.5" fill={color} />
          <circle cx="119" cy="90" r="3.2" fill="#0f172a" />
          <circle cx="117" cy="88" r="2" fill="#ffffff" />
          <path d="M110 85 Q119 82 128 85" stroke="#0f172a" strokeWidth="2.5" fill="none" />
        </g>
      );
    case 'focused':
    default:
      return (
        <g id="eyes-focused">
          <ellipse cx="81" cy="90" rx="8" ry="7.5" fill="#ffffff" />
          <ellipse cx="119" cy="90" rx="8" ry="7.5" fill="#ffffff" />
          <circle cx="81" cy="90" r="5" fill={color} />
          <circle cx="119" cy="90" r="5" fill={color} />
          <circle cx="81" cy="90" r="2.8" fill="#0f172a" />
          <circle cx="119" cy="90" r="2.8" fill="#0f172a" />
          <circle cx="79" cy="88" r="1.8" fill="#ffffff" />
          <circle cx="117" cy="88" r="1.8" fill="#ffffff" />
          <path d="M72 85 Q81 82 90 85" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M110 85 Q119 82 128 85" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>
      );
  }
}

function renderNose(shadow: string) {
  return (
    <g id="nose">
      <path d="M98 100 Q100 104 102 100" stroke={shadow} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </g>
  );
}

function renderMouth(expr: string) {
  switch (expr) {
    case 'smile':
      return (
        <path d="M90 114 Q100 123 110 114" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      );
    case 'grin':
      return (
        <path
          d="M88 113 Q100 126 112 113 Z"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      );
    case 'laugh':
      return (
        <g>
          <path
            d="M86 112 Q100 130 114 112 Z"
            fill="#881337"
            stroke="#0f172a"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Tongue */}
          <path d="M92 121 Q100 117 108 121 Q100 128 92 121 Z" fill="#f43f5e" />
        </g>
      );
    case 'determined':
      return (
        <path d="M91 116 L109 113" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      );
    case 'surprised':
      return (
        <ellipse cx="100" cy="116" rx="4.5" ry="6.5" fill="#881337" stroke="#0f172a" strokeWidth="2.2" />
      );
    case 'neutral':
    default:
      return (
        <line x1="93" y1="115" x2="107" y2="115" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      );
  }
}

function renderFaceDetails(acc: string, color: string) {
  return (
    <g id="face-details">
      {acc === 'face_blush' && (
        <>
          <ellipse cx="71" cy="98" rx="6.5" ry="3.5" fill="#f43f5e" opacity="0.45" />
          <ellipse cx="129" cy="98" rx="6.5" ry="3.5" fill="#f43f5e" opacity="0.45" />
        </>
      )}

      {acc === 'arcade_bandaid' && (
        <g transform="translate(93, 98) rotate(-10)">
          <rect x="0" y="0" width="16" height="7" rx="3.5" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
          <circle cx="8" cy="3.5" r="1.5" fill="#d97706" />
        </g>
      )}

      {acc === 'star_tattoo' && (
        <g transform="translate(126, 98) scale(0.9)">
          <path
            d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z"
            fill={color || '#facc15'}
          />
        </g>
      )}
    </g>
  );
}

function renderClothing(style: string, color: string, accent: string, shadow: string) {
  switch (style) {
    case 'arcade_hoodie':
      return (
        <g id="clothing-hoodie">
          {/* Main hoodie body */}
          <path
            d="M32 195 L36 158 C42 144 56 138 78 136 L122 136 C144 138 158 144 164 158 L168 195 Z"
            fill={color}
          />
          {/* Thick hoodie neckline / collar */}
          <path
            d="M74 136 C74 156 86 166 100 166 C114 166 126 156 126 136 Z"
            fill={shadow}
          />
          <path
            d="M78 136 C78 152 88 160 100 160 C112 160 122 152 122 136 Z"
            fill={color}
          />
          {/* Drawstrings */}
          <line x1="93" y1="154" x2="93" y2="175" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="107" y1="154" x2="107" y2="175" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="93" cy="177" r="2" fill={accent} />
          <circle cx="107" cy="177" r="2" fill={accent} />
          {/* Chest accent stripe */}
          <path d="M42 178 L158 178" stroke={accent} strokeWidth="3" opacity="0.8" />
        </g>
      );
    case 'varsity_jacket':
      return (
        <g id="clothing-varsity">
          {/* Body */}
          <path
            d="M32 195 L36 158 C42 144 56 138 78 136 L122 136 C144 138 158 144 164 158 L168 195 Z"
            fill={color}
          />
          {/* Sleeves */}
          <path d="M32 195 L36 158 C42 144 55 140 64 144 L60 195 Z" fill="#f8fafc" />
          <path d="M168 195 L164 158 C158 144 145 140 136 144 L140 195 Z" fill="#f8fafc" />
          {/* Collar stripes */}
          <path d="M80 136 Q100 148 120 136" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Snap buttons */}
          <circle cx="100" cy="155" r="2.5" fill={accent} />
          <circle cx="100" cy="170" r="2.5" fill={accent} />
          <circle cx="100" cy="185" r="2.5" fill={accent} />
        </g>
      );
    case 'gamer_jersey':
      return (
        <g id="clothing-jersey">
          <path
            d="M32 195 L36 158 C42 144 56 138 78 136 L122 136 C144 138 158 144 164 158 L168 195 Z"
            fill={color}
          />
          {/* V-neck collar */}
          <polygon points="86,136 100,154 114,136" fill={shadow} />
          <path d="M84 136 L100 155 L116 136" stroke={accent} strokeWidth="3.5" fill="none" />
          {/* Esports chevron flank stripes */}
          <polygon points="40,170 55,160 55,195 40,195" fill={accent} opacity="0.8" />
          <polygon points="160,170 145,160 145,195 160,195" fill={accent} opacity="0.8" />
        </g>
      );
    case 'cyber_techwear':
      return (
        <g id="clothing-cyber">
          <path
            d="M32 195 L36 158 C42 144 56 138 78 136 L122 136 C144 138 158 144 164 158 L168 195 Z"
            fill="#090d16"
          />
          {/* High collar */}
          <path d="M82 128 L82 145 L118 145 L118 128 Z" fill="#1e293b" />
          {/* Neon piping */}
          <path d="M82 145 L82 195" stroke={accent} strokeWidth="3" filter="url(#neon-glow)" />
          <path d="M118 145 L118 195" stroke={accent} strokeWidth="3" filter="url(#neon-glow)" />
          <line x1="60" y1="165" x2="82" y2="165" stroke={accent} strokeWidth="2" />
          <line x1="118" y1="165" x2="140" y2="165" stroke={accent} strokeWidth="2" />
        </g>
      );
    case 'sweater':
      return (
        <g id="clothing-sweater">
          <path
            d="M32 195 L36 158 C42 144 56 138 78 136 L122 136 C144 138 158 144 164 158 L168 195 Z"
            fill={color}
          />
          {/* Ribbed crew collar */}
          <ellipse cx="100" cy="140" rx="18" ry="8" fill={shadow} />
          <path d="M82 140 Q100 147 118 140" stroke={accent} strokeWidth="3" fill="none" />
        </g>
      );
    case 'tshirt':
    default:
      return (
        <g id="clothing-tshirt">
          <path
            d="M32 195 L36 158 C42 144 56 138 78 136 L122 136 C144 138 158 144 164 158 L168 195 Z"
            fill={color}
          />
          <path d="M80 136 Q100 152 120 136" stroke={accent} strokeWidth="3.5" fill="none" />
        </g>
      );
  }
}

function renderAccessories(style: string, color: string) {
  switch (style) {
    case 'glasses':
      return (
        <g id="acc-glasses">
          {/* Circular stylish frames */}
          <circle cx="80" cy="90" r="13" stroke="#facc15" strokeWidth="2.8" fill="url(#lens-sheen)" />
          <circle cx="120" cy="90" r="13" stroke="#facc15" strokeWidth="2.8" fill="url(#lens-sheen)" />
          {/* Bridge */}
          <line x1="93" y1="90" x2="107" y2="90" stroke="#facc15" strokeWidth="2.5" />
          {/* Temples */}
          <line x1="67" y1="90" x2="52" y2="88" stroke="#facc15" strokeWidth="2" />
          <line x1="133" y1="90" x2="148" y2="88" stroke="#facc15" strokeWidth="2" />
        </g>
      );
    case 'sunglasses':
      return (
        <g id="acc-sunglasses">
          <path
            d="M66 84 L94 84 L90 98 C88 102 72 102 70 98 Z"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          <path
            d="M106 84 L134 84 L130 98 C128 102 112 102 110 98 Z"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          {/* Bridge & temples */}
          <line x1="94" y1="86" x2="106" y2="86" stroke="#1e293b" strokeWidth="3" />
          <line x1="66" y1="85" x2="52" y2="86" stroke="#1e293b" strokeWidth="2.5" />
          <line x1="134" y1="85" x2="148" y2="86" stroke="#1e293b" strokeWidth="2.5" />
          {/* Gradient slash reflection */}
          <line x1="72" y1="87" x2="84" y2="99" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8" />
          <line x1="112" y1="87" x2="124" y2="99" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8" />
        </g>
      );
    case 'earrings':
      return (
        <g id="acc-earrings">
          {/* Gold Hoops */}
          <circle cx="50" cy="102" r="4.5" stroke={color || '#facc15'} strokeWidth="2" fill="none" />
          <circle cx="150" cy="102" r="4.5" stroke={color || '#facc15'} strokeWidth="2" fill="none" />
        </g>
      );
    default:
      return null;
  }
}

function renderHeadwear(style: string, color: string, accent: string) {
  switch (style) {
    case 'arcade_cap':
      return (
        <g id="hw-cap">
          {/* Cap dome */}
          <path d="M54 75 C52 42 70 34 100 34 C130 34 148 42 146 75 Z" fill={color} />
          {/* Cap visor */}
          <path d="M48 74 C48 74 70 70 100 70 C130 70 152 74 152 74 C162 76 164 84 150 84 L50 84 C36 84 38 76 48 74 Z" fill={darkenColor(color, 0.15)} />
          {/* Front Button / Eyelet */}
          <circle cx="100" cy="34" r="3.5" fill={accent} />
        </g>
      );
    case 'beanie':
      return (
        <g id="hw-beanie">
          {/* Main Beanie Body */}
          <path d="M52 72 C50 36 70 28 100 28 C130 28 150 36 148 72 Z" fill={color} />
          {/* Ribbed fold */}
          <rect x="48" y="66" width="104" height="15" rx="5" fill={darkenColor(color, 0.15)} />
          {/* Top pompom */}
          <circle cx="100" cy="24" r="8" fill={accent} />
        </g>
      );
    case 'cyber_headband':
      return (
        <g id="hw-headband">
          <rect x="52" y="62" width="96" height="13" rx="3" fill="#0f172a" />
          <line x1="56" y1="68" x2="144" y2="68" stroke={accent} strokeWidth="3" filter="url(#neon-glow)" />
        </g>
      );
    case 'gamer_headset':
      return (
        <g id="hw-gamer-headset">
          {/* Over-head band */}
          <path
            d="M45 92 C42 45 68 30 100 30 C132 30 158 45 155 92"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          {/* Headband cushion */}
          <path
            d="M75 32 Q100 28 125 32"
            stroke="#0f172a"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left Ear Cup */}
          <rect x="38" y="78" width="14" height="28" rx="7" fill="#0f172a" stroke={color} strokeWidth="2.5" />
          <circle cx="45" cy="92" r="4" fill={accent} filter="url(#neon-glow)" />
          {/* Right Ear Cup */}
          <rect x="148" y="78" width="14" height="28" rx="7" fill="#0f172a" stroke={color} strokeWidth="2.5" />
          <circle cx="155" cy="92" r="4" fill={accent} filter="url(#neon-glow)" />
          {/* Boom mic on left */}
          <path d="M45 98 C40 115 65 125 78 120" stroke="#0f172a" strokeWidth="2.5" fill="none" />
          <circle cx="80" cy="120" r="3" fill={accent} />
        </g>
      );
    case 'cat_ears_headset':
      return (
        <g id="hw-cat-ears">
          {/* Over-head band */}
          <path
            d="M45 92 C42 45 68 30 100 30 C132 30 158 45 155 92"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left Cat Ear */}
          <polygon points="62,38 74,12 88,32" fill={color} />
          <polygon points="66,35 74,18 84,31" fill={accent} filter="url(#neon-glow)" />
          {/* Right Cat Ear */}
          <polygon points="138,38 126,12 112,32" fill={color} />
          <polygon points="134,35 126,18 116,31" fill={accent} filter="url(#neon-glow)" />
          {/* Ear Cups */}
          <rect x="38" y="78" width="14" height="28" rx="7" fill="#0f172a" stroke={color} strokeWidth="2.5" />
          <rect x="148" y="78" width="14" height="28" rx="7" fill="#0f172a" stroke={color} strokeWidth="2.5" />
        </g>
      );
    case 'crown':
      return (
        <g id="hw-crown">
          <polygon
            points="65,58 60,32 78,44 100,24 122,44 140,32 135,58"
            fill="#eab308"
            stroke="#ca8a04"
            strokeWidth="1.5"
          />
          {/* Gemstones */}
          <circle cx="61" cy="33" r="3" fill="#ef4444" />
          <circle cx="100" cy="25" r="4" fill="#38bdf8" />
          <circle cx="139" cy="33" r="3" fill="#ef4444" />
          <circle cx="100" cy="50" r="3" fill="#10b981" />
        </g>
      );
    default:
      return null;
  }
}

/* =========================================================================
   COLOR HELPER UTILITIES
   ========================================================================= */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c
      .split('')
      .map((x) => x + x)
      .join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [r, g, b]
      .map((x) => clamp(x).toString(16).padStart(2, '0'))
      .join('')
  );
}

function darkenColor(hex: string, amount: number): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
  } catch {
    return hex;
  }
}

function lightenColor(hex: string, amount: number): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  } catch {
    return hex;
  }
}
