import { supabase } from './supabase.ts';
import type { AvatarConfig } from '../types/avatar.ts';
import {
  sanitizeAvatarConfig,
  DEFAULT_ADITYA_AVATAR,
  DEFAULT_HARIKA_AVATAR,
} from '../components/avatar/avatarPresets.ts';

const STORAGE_PREFIX = 'haya_avatar_';

/**
 * Retrieves the local cache key for an email.
 */
function getCacheKey(email: string): string {
  return `${STORAGE_PREFIX}${email.toLowerCase().trim()}`;
}

/**
 * Synchronously loads avatar from local storage or returns sensible default.
 */
export function getCachedAvatar(email: string, defaultName?: string): AvatarConfig {
  if (typeof window === 'undefined') {
    return email.toLowerCase().includes('harika')
      ? DEFAULT_HARIKA_AVATAR
      : DEFAULT_ADITYA_AVATAR;
  }

  try {
    const raw = localStorage.getItem(getCacheKey(email));
    if (raw) {
      const parsed = JSON.parse(raw);
      return sanitizeAvatarConfig(parsed, defaultName || (email.toLowerCase().includes('harika') ? 'Harika' : 'Aditya'));
    }
  } catch (err) {
    console.warn('[AvatarStorage] Error reading cached avatar:', err);
  }

  const name = defaultName || (email.toLowerCase().includes('harika') ? 'Harika' : 'Aditya');
  return email.toLowerCase().includes('harika')
    ? { ...DEFAULT_HARIKA_AVATAR, displayName: name }
    : { ...DEFAULT_ADITYA_AVATAR, displayName: name };
}

/**
 * Loads the user's avatar from Supabase (falling back to local cache).
 */
export async function loadUserAvatar(email: string, userId?: string): Promise<AvatarConfig> {
  const cached = getCachedAvatar(email);

  if (!userId) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_data, display_name')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data?.avatar_data) {
      const sanitized = sanitizeAvatarConfig(data.avatar_data, data.display_name || cached.displayName);
      // Update local storage
      localStorage.setItem(getCacheKey(email), JSON.stringify(sanitized));
      return sanitized;
    }
  } catch (err) {
    console.warn('[AvatarStorage] Could not fetch remote avatar:', err);
  }

  return cached;
}

/**
 * Saves the user's avatar locally and to Supabase.
 */
export async function saveUserAvatar(
  email: string,
  config: AvatarConfig,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const sanitized = sanitizeAvatarConfig(config, config.displayName);
  const cacheKey = getCacheKey(email);

  // 1. Immediately cache in localStorage
  try {
    localStorage.setItem(cacheKey, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[AvatarStorage] Failed to cache avatar locally:', err);
  }

  // 2. Broadcast local event for instant reactive UI sync across components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('haya_avatar_updated', {
        detail: { email: email.toLowerCase().trim(), config: sanitized },
      })
    );
  }

  // 3. Persist to Supabase if authenticated and userId provided
  if (userId) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_data: sanitized,
          display_name: sanitized.displayName || (email.includes('harika') ? 'Harika' : 'Aditya'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.warn('[AvatarStorage] Supabase update warning:', error.message);
        return { success: true, error: error.message };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Storage error';
      console.warn('[AvatarStorage] Remote sync failed, preserved locally:', message);
      return { success: true, error: message };
    }
  }

  return { success: true };
}
