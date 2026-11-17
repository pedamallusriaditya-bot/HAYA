import React from 'react';

export function Clothing({
  style,
  color,
  accent,
  shadow,
}: {
  style: string;
  color: string;
  accent: string;
  shadow: string;
}) {
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
