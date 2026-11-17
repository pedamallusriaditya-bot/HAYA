import React from 'react';

export function FaceShape({
  shape,
  skin,
  shadow,
}: {
  shape: string;
  skin: string;
  shadow: string;
}) {
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

export function FaceDetails({
  accessory,
  color,
}: {
  accessory: string;
  color: string;
}) {
  return (
    <g id="face-details">
      {accessory === 'face_blush' && (
        <>
          <ellipse cx="71" cy="98" rx="6.5" ry="3.5" fill="#f43f5e" opacity="0.45" />
          <ellipse cx="129" cy="98" rx="6.5" ry="3.5" fill="#f43f5e" opacity="0.45" />
        </>
      )}

      {accessory === 'arcade_bandaid' && (
        <g transform="translate(93, 98) rotate(-10)">
          <rect x="0" y="0" width="16" height="7" rx="3.5" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
          <circle cx="8" cy="3.5" r="1.5" fill="#d97706" />
        </g>
      )}

      {accessory === 'star_tattoo' && (
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

export function Eyebrows({
  style,
  color,
}: {
  style: string;
  color: string;
}) {
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

export function Eyes({
  style,
  color,
}: {
  style: string;
  color: string;
}) {
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

export function Nose({ shadow }: { shadow: string }) {
  return (
    <g id="nose">
      <path d="M98 100 Q100 104 102 100" stroke={shadow} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </g>
  );
}

export function Mouth({ expr }: { expr: string }) {
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
