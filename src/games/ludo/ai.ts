import {
  GOAL_STEP,
  HOME_STRETCH_START,
  TRACK_LENGTH,
  getTrackCoordinate,
  isTokenSafe,
  SAFE_TRACK_INDICES,
  type PlayerState,
  type Token,
} from './engine';
export async function getLudoBotMove(
  botPlayer: PlayerState,
  opponents: PlayerState | PlayerState[],
  legalTokenIds: number[],
  diceRoll: number,
  tierLevel: number // 1 to 6
): Promise<number> {
  if (legalTokenIds.length === 0) return -1;
  if (legalTokenIds.length === 1) return legalTokenIds[0];

  const oppList: PlayerState[] = (Array.isArray(opponents) ? opponents : [opponents]).filter(
    (p) => p.color !== botPlayer.color
  );

  const startTime = Date.now();
  let chosenTokenId = legalTokenIds[0];

  // 1. Beginner: Completely random legal move
  if (tierLevel === 1) {
    chosenTokenId = legalTokenIds[Math.floor(Math.random() * legalTokenIds.length)];
  }

  // 2. Easy: Prefers leaving yard, otherwise advances furthest piece
  else if (tierLevel === 2) {
    const yardToken = legalTokenIds.find((id) => {
      const t = botPlayer.tokens.find((tok) => tok.id === id);
      return t && t.step === -1;
    });

    if (yardToken !== undefined) {
      chosenTokenId = yardToken;
    } else {
      let maxStep = -1;
      for (const id of legalTokenIds) {
        const t = botPlayer.tokens.find((tok) => tok.id === id);
        if (t && t.step > maxStep) {
          maxStep = t.step;
          chosenTokenId = id;
        }
      }
    }
  }

  // 3. Normal: Balances captures, safe squares, home goals, and yard releases
  else if (tierLevel === 3) {
    let bestScore = -Infinity;

    for (const id of legalTokenIds) {
      const token = botPlayer.tokens.find((t) => t.id === id)!;
      let score = 0;

      const nextStep = token.step === -1 ? 0 : token.step + diceRoll;

      // Finish move
      if (nextStep === GOAL_STEP) {
        score += 1500;
      }

      // Entering safe home stretch
      if (token.step < HOME_STRETCH_START && nextStep >= HOME_STRETCH_START) {
        score += 600;
      }

      // Yard release
      if (token.step === -1) {
        score += 400;
      }

      // Check capture across all opponents
      if (nextStep >= 0 && nextStep < HOME_STRETCH_START) {
        const landingCoord = getTrackCoordinate(botPlayer.color, nextStep);
        if (landingCoord !== null && !SAFE_TRACK_INDICES.has(landingCoord)) {
          for (const opp of oppList) {
            const captures = opp.tokens.some((t) => {
              if (t.step >= 0 && t.step < HOME_STRETCH_START) {
                return getTrackCoordinate(opp.color, t.step) === landingCoord;
              }
              return false;
            });
            if (captures) {
              score += 900;
              break;
            }
          }
        }
      }

      // Moving onto safe square
      if (isTokenSafe(botPlayer.color, nextStep)) {
        score += 250;
      }

      // Forward advancement
      score += nextStep * 5;

      if (score > bestScore) {
        bestScore = score;
        chosenTokenId = id;
      }
    }
  }

  // 4. Hard: Evaluates opponent chaser danger and avoids risky exposure
  else if (tierLevel === 4) {
    let bestScore = -Infinity;

    for (const id of legalTokenIds) {
      const token = botPlayer.tokens.find((t) => t.id === id)!;
      const score = evaluateCandidateMove(token, diceRoll, botPlayer, oppList, false);

      if (score > bestScore) {
        bestScore = score;
        chosenTokenId = id;
      }
    }
  }

  // 5. Expert: Advanced threat probabilities, multi-token spacing, and home stretch security
  else if (tierLevel === 5) {
    let bestScore = -Infinity;

    for (const id of legalTokenIds) {
      const token = botPlayer.tokens.find((t) => t.id === id)!;
      let score = evaluateCandidateMove(token, diceRoll, botPlayer, oppList, true);

      // Encourage activating idle tokens rather than leaving them in yard
      const tokensInYard = botPlayer.tokens.filter((t) => t.step === -1).length;
      if (token.step === -1 && tokensInYard > 1) {
        score += 200;
      }

      if (score > bestScore) {
        bestScore = score;
        chosenTokenId = id;
      }
    }
  }

  // 6. Master: Lookahead expected value simulation over all opponent rolls (1-6)
  else {
    let bestScore = -Infinity;

    for (const id of legalTokenIds) {
      const token = botPlayer.tokens.find((t) => t.id === id)!;
      const baseScore = evaluateCandidateMove(token, diceRoll, botPlayer, oppList, true);

      // Simulate all opponents' responses on candidate landing position
      const nextStep = token.step === -1 ? 0 : token.step + diceRoll;
      let vulnerabilityPenalty = 0;

      if (nextStep >= 0 && nextStep < HOME_STRETCH_START) {
        const landingCoord = getTrackCoordinate(botPlayer.color, nextStep);

        if (landingCoord !== null && !SAFE_TRACK_INDICES.has(landingCoord)) {
          for (const opp of oppList) {
            for (const oppToken of opp.tokens) {
              if (oppToken.step >= 0 && oppToken.step < HOME_STRETCH_START) {
                const oppCoord = getTrackCoordinate(opp.color, oppToken.step);
                if (oppCoord !== null) {
                  const dist = (landingCoord - oppCoord + TRACK_LENGTH) % TRACK_LENGTH;
                  if (dist >= 1 && dist <= 6 && oppToken.step + dist < HOME_STRETCH_START) {
                    vulnerabilityPenalty += 600 * (1 / 6);
                  }
                }
              }
            }
          }
        }
      }

      const totalScore = baseScore - vulnerabilityPenalty;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        chosenTokenId = id;
      }
    }
  }
  const elapsed = Date.now() - startTime;
  const targetDelay = 350 + Math.floor(Math.random() * 200);
  if (elapsed < targetDelay) {
    await new Promise((resolve) => setTimeout(resolve, targetDelay - elapsed));
  }

  return chosenTokenId;
}

function evaluateCandidateMove(
  token: Token,
  diceRoll: number,
  botPlayer: PlayerState,
  oppList: PlayerState[],
  isDeep: boolean
): number {
  let score = 0;
  const nextStep = token.step === -1 ? 0 : token.step + diceRoll;

  // 1. Goal reach
  if (nextStep === GOAL_STEP) {
    return 3000;
  }

  // 2. Entering safe home stretch
  if (token.step < HOME_STRETCH_START && nextStep >= HOME_STRETCH_START) {
    score += 800;
  }

  // 3. Yard release
  if (token.step === -1) {
    score += 500;
  }

  // 4. Captures across all opponents
  if (nextStep >= 0 && nextStep < HOME_STRETCH_START) {
    const landingCoord = getTrackCoordinate(botPlayer.color, nextStep);
    if (landingCoord !== null && !SAFE_TRACK_INDICES.has(landingCoord)) {
      for (const opp of oppList) {
        for (const oppToken of opp.tokens) {
          if (oppToken.step >= 0 && oppToken.step < HOME_STRETCH_START) {
            const oppCoord = getTrackCoordinate(opp.color, oppToken.step);
            if (oppCoord === landingCoord) {
              score += 1000 + oppToken.step * 10;
              break;
            }
          }
        }
      }
    }
  }
  if (token.step >= 0 && token.step < HOME_STRETCH_START) {
    const currentCoord = getTrackCoordinate(botPlayer.color, token.step);
    if (currentCoord !== null && !SAFE_TRACK_INDICES.has(currentCoord)) {
      for (const opp of oppList) {
        for (const oppToken of opp.tokens) {
          if (oppToken.step >= 0 && oppToken.step < HOME_STRETCH_START) {
            const oppCoord = getTrackCoordinate(opp.color, oppToken.step);
            if (oppCoord !== null) {
              const dist = (currentCoord - oppCoord + TRACK_LENGTH) % TRACK_LENGTH;
              if (dist >= 1 && dist <= 6 && oppToken.step + dist < HOME_STRETCH_START) {
                score += 350;
              }
            }
          }
        }
      }
    }
  }
  if (isTokenSafe(botPlayer.color, nextStep)) {
    score += 300;
  }
  if (isDeep && nextStep >= 0 && nextStep < HOME_STRETCH_START) {
    const landingCoord = getTrackCoordinate(botPlayer.color, nextStep);
    if (landingCoord !== null && !SAFE_TRACK_INDICES.has(landingCoord)) {
      for (const opp of oppList) {
        for (const oppToken of opp.tokens) {
          if (oppToken.step >= 0 && oppToken.step < HOME_STRETCH_START) {
            const oppCoord = getTrackCoordinate(opp.color, oppToken.step);
            if (oppCoord !== null) {
              const dist = (landingCoord - oppCoord + TRACK_LENGTH) % TRACK_LENGTH;
              if (dist >= 1 && dist <= 6 && oppToken.step + dist < HOME_STRETCH_START) {
                score -= 450;
              }
            }
          }
        }
      }
    }
  }
  score += nextStep * 8;
  return score;
}
