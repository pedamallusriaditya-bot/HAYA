import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthContext';

/**
 * Loads and persists the user's best score for a single-player game.
 * The DB keeps a single best row per (user, game, difficulty) via a unique
 * constraint; we upsert here and only keep the better of the local vs stored
 * value so the UI never regresses.
 */
export function useHighScore(game: string, difficulty: string | null = null) {
  const { user } = useAuth();
  const [best, setBest] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBest(null);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('game_scores')
        .select('score, score_type')
        .eq('user_id', user.id)
        .eq('game', game)
        .eq('difficulty', difficulty)
        .maybeSingle();
      if (active) {
        setBest(data?.score ?? null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, game, difficulty]);

  const submit = useCallback(
    async (score: number, scoreType: 'score' | 'time' = 'score') => {
      if (!user) return false;
      const isBetter =
        best === null ||
        (scoreType === 'score' ? score > best : score < best);
      if (!isBetter) return false;

      const { error } = await supabase
        .from('game_scores')
        .upsert(
          { user_id: user.id, game, difficulty, score, score_type: scoreType },
          { onConflict: 'user_id,game,difficulty' }
        );
      if (!error) setBest(score);
      return !error;
    },
    [user, game, difficulty, best]
  );

  return { best, submit, loading };
}
