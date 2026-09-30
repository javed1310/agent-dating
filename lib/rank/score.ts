export type ScoreComponents = {
  interest: number;
  chemistry: number;
  values_fit: number;
  lifestyle: number;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function componentScore(score: ScoreComponents) {
  return Math.round(clamp(
    score.interest * .30 + score.chemistry * .25 + score.values_fit * .25 + score.lifestyle * .20,
  ));
}

// Weak evidence should move a subjective judgment toward neutral, not turn it into
// an unjustified low score. At 100% confidence the judgment is unchanged.
export function confidenceAdjusted(score: number, confidence = 1) {
  const reliable = clamp(confidence, 0, 1);
  return 50 + (clamp(score) - 50) * reliable;
}

export function finalScore(
  self: number,
  mutual: number,
  similarity: number,
  redA = 0,
  redB = 0,
  confidenceA = 1,
  confidenceB = 1,
) {
  const profileFit = clamp(similarity, 0, 1) * 100;
  const redFlagPenalty = Math.max(clamp(redA, 0, 10), clamp(redB, 0, 10));
  const raw = .55 * confidenceAdjusted(self, confidenceA)
    + .25 * confidenceAdjusted(mutual, confidenceB)
    + .20 * profileFit
    - redFlagPenalty;
  return Math.round(clamp(raw) * 10) / 10;
}
