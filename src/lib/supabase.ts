import { createClient } from '@supabase/supabase-js';

const url =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? import.meta.env.VITE_SUPABASE_URL
    : '';
const anonKey =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : '';

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase credentials: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. ' +
    'Please copy .env.example to .env and configure your Supabase project credentials.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UserPreferences = {
  sound: boolean;
  music: boolean;
  theme?: string;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  avatar_data?: Record<string, unknown> | null;
  preferences?: UserPreferences;
  created_at?: string;
  updated_at?: string;
};

export type GameScore = {
  id: string;
  game: string;
  difficulty: string;
  score: number;
  score_type: 'score' | 'time';
  created_at: string;
};

export type GameRecord = {
  id?: string;
  user_id: string;
  game: string;
  mode: 'single' | 'bot' | 'multi';
  result: 'win' | 'loss' | 'draw' | 'completed';
  score: number;
  score_type?: 'score' | 'time';
  opponent_type?: 'none' | 'bot' | 'human';
  opponent_name?: string | null;
  bot_difficulty?: string | null;
  duration_seconds?: number | null;
  match_id?: string | null;
  created_at?: string;
};

export type MultiplayerInvitation = {
  id: string;
  from_email: string;
  from_name: string;
  to_email: string;
  game_id: string;
  match_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  created_at: string;
  expires_at: string;
};
