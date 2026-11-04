import React from 'react';
import type { AvatarConfig } from '@/types/avatar';
import AvatarSvg from './AvatarSvg';
import { sanitizeAvatarConfig, DEFAULT_ADITYA_AVATAR, DEFAULT_HARIKA_AVATAR, DEFAULT_BOT_AVATAR } from './avatarPresets';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'preview' | number;

type PlayerAvatarProps = {
  config?: AvatarConfig | null;
  name?: string;
  email?: string;
  isBot?: boolean;
  size?: AvatarSize;
  animate?: boolean;
  className?: string;
  badge?: React.ReactNode;
  showBorder?: boolean;
  glow?: boolean;
};

const SIZE_MAP: Record<string, number> = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 72,
  xl: 112,
  '2xl': 160,
  preview: 240,
};

export function PlayerAvatar({
  config,
  name,
  email,
  isBot = false,
  size = 'md',
  animate = false,
  className = '',
  badge,
  showBorder = true,
  glow = false,
}: PlayerAvatarProps) {
  // Resolve fallback config if not provided
  const resolvedConfig = React.useMemo(() => {
    if (config) {
      return sanitizeAvatarConfig(config, name || config.displayName);
    }
    if (isBot) {
      return { ...DEFAULT_BOT_AVATAR, displayName: name || 'CPU Bot' };
    }
    const lowerEmail = (email || '').toLowerCase();
    const lowerName = (name || '').toLowerCase();
    if (lowerEmail.includes('harika') || lowerName.includes('harika')) {
      return { ...DEFAULT_HARIKA_AVATAR, displayName: name || 'Harika' };
    }
    return { ...DEFAULT_ADITYA_AVATAR, displayName: name || 'Aditya' };
  }, [config, name, email, isBot]);

  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 48;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className} ${
        glow ? 'shadow-lg shadow-amber-500/20' : ''
      }`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <div
        className={`w-full h-full rounded-2xl overflow-hidden ${
          showBorder
            ? 'ring-1.5 ring-slate-700/80 bg-slate-950 shadow-inner'
            : ''
        }`}
      >
        <AvatarSvg config={resolvedConfig} size="100%" animate={animate} />
      </div>

      {badge && (
        <div className="absolute -bottom-0.5 -right-0.5 z-10">
          {badge}
        </div>
      )}
    </div>
  );
}

export default PlayerAvatar;
