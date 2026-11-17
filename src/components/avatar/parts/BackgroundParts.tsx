import React from 'react';

export function BackgroundDefs() {
  return (
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
  );
}

export function BackgroundEffects({ background }: { background: string }) {
  if (background === 'retro_grid') {
    return (
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
    );
  }

  if (background === 'cyber_neon') {
    return (
      <g opacity="0.4">
        <circle cx="100" cy="95" r="75" stroke="#38bdf8" strokeWidth="2" fill="none" strokeDasharray="6 4" />
        <circle cx="100" cy="95" r="62" stroke="#f43f5e" strokeWidth="1.5" fill="none" />
      </g>
    );
  }

  if (background === 'cosmic_purple') {
    return (
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
    );
  }

  if (background === 'emerald_matrix') {
    return (
      <g opacity="0.25">
        <line x1="0" y1="30" x2="200" y2="30" stroke="#10b981" strokeWidth="0.8" strokeDasharray="4 8" />
        <line x1="0" y1="70" x2="200" y2="70" stroke="#10b981" strokeWidth="0.8" strokeDasharray="6 6" />
        <line x1="0" y1="110" x2="200" y2="110" stroke="#10b981" strokeWidth="0.8" strokeDasharray="3 9" />
        <line x1="0" y1="150" x2="200" y2="150" stroke="#10b981" strokeWidth="0.8" strokeDasharray="5 7" />
        <line x1="0" y1="190" x2="200" y2="190" stroke="#10b981" strokeWidth="0.8" strokeDasharray="4 8" />
      </g>
    );
  }

  return null;
}
