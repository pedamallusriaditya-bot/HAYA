import { useCallback, useRef } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { recordGameResult } from './gameRecordsService';
import type { GameRecord } from './supabase';

export type RecordGameParams = {
  result: 'win' | 'loss' | 'draw' | 'completed';
  score?: number;
  scoreType?: 'score' | 'time';
  mode?: 'single' | 'bot' | 'multi';
  opponentType?: 'none' | 'bot' | 'human';
  opponentName?: string | null;
  botDifficulty?: string | null;
  matchId?: string | null;
  durationSeconds?: number;
};

export function useGameRecorder(gameId: string, initialDifficulty: string | null = null) {
  const { user } = useAuth();
  const sessionMatchIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  const gameStartRef = useRef<number>(Date.now());
  const recordedRef = useRef<boolean>(false);

  const resetSession = useCallback(() => {
    sessionMatchIdRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    gameStartRef.current = Date.now();
    recordedRef.current = false;
  }, []);

  const recordResult = useCallback(
    async (params: RecordGameParams) => {
      if (!user) return;
      // Prevent duplicate submissions for the same game session unless an explicit custom matchId was given
      if (recordedRef.current && !params.matchId) {
        return;
      }

      const calculatedDuration = Math.max(1, Math.round((Date.now() - gameStartRef.current) / 1000));
      const durationSeconds = params.durationSeconds ?? calculatedDuration;
      const matchId = params.matchId || sessionMatchIdRef.current;

      const record: GameRecord = {
        user_id: user.id,
        game: gameId,
        mode:
          params.mode ||
          (params.opponentType === 'bot'
            ? 'bot'
            : params.opponentType === 'human'
            ? 'multi'
            : 'single'),
        result: params.result,
        score: params.score ?? (params.result === 'win' ? 1 : 0),
        score_type: params.scoreType || 'score',
        opponent_type: params.opponentType || 'none',
        opponent_name: params.opponentName || null,
        bot_difficulty: params.botDifficulty !== undefined ? params.botDifficulty : initialDifficulty,
        duration_seconds: durationSeconds,
        match_id: matchId,
      };

      recordedRef.current = true;
      return await recordGameResult(record);
    },
    [user, gameId, initialDifficulty]
  );

  return { recordResult, resetSession, sessionMatchId: sessionMatchIdRef.current };
}

