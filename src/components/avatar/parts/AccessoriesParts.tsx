import React from 'react';
import { darkenColor } from './colorUtils';

export function Accessories({
  style,
  color,
}: {
  style: string;
  color: string;
}) {
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

export function Headwear({
  style,
  color,
  accent,
}: {
  style: string;
  color: string;
  accent: string;
}) {
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
