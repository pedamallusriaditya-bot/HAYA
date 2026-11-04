import { createClient } from '@supabase/supabase-js';

const url =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  'https://rvonbjizjwkogwfulery.supabase.co';
const anonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b25iaml6andrb2d3ZnVsZXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDYwNzMsImV4cCI6MjEwNzk4MjA3M30.AgF3y84I95dd3Xy59yXobAOMJzAXUwZr7MGEYWgrH6E';

if (!url || !anonKey) {
  throw new Error('Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
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
  difficulty: string | null;
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
