import React from 'react';

export function BackHair({
  style,
  shadow,
}: {
  style: string;
  shadow: string;
}) {
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

export function FrontHair({
  style,
  color,
  highlight,
  shadow,
}: {
  style: string;
  color: string;
  highlight: string;
  shadow: string;
}) {
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
