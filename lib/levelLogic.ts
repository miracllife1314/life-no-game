/**
 * NLP Game Pet Leveling Logic
 * Start at 600 XP, increases by 100 XP per evolved stage.
 * 20,000 XP is the final form (Stage 6, Level 25).
 */

export function getExpNeededForNextLevel(level: number): number {
  if (level < 5) return 600;      // Stage 1 (Egg): LV 0-4
  if (level < 10) return 700;     // Stage 2 (Baby): LV 5-9
  if (level < 15) return 800;     // Stage 3 (Growing): LV 10-14
  if (level < 20) return 900;     // Stage 4 (Mature): LV 15-19
  if (level < 25) return 1000;    // Stage 5 (Holy Beast): LV 20-24
  return 1100;                    // Stage 6 (Ultimate): LV 25+
}

export function getExpThresholdForLevel(level: number): number {
  if (level <= 0) return 0;
  let total = 0;
  for (let i = 0; i < level; i++) {
    total += getExpNeededForNextLevel(i);
  }
  return total;
}

export function calculateLevelFromExp(exp: number): number {
  if (exp <= 0) return 0;
  let level = 0;
  let threshold = 0;
  while (true) {
    const nextCost = getExpNeededForNextLevel(level);
    if (threshold + nextCost > exp) {
      break;
    }
    threshold += nextCost;
    level++;
  }
  return level;
}

export function getExpProgressInCurrentLevel(exp: number) {
  const currentLevel = calculateLevelFromExp(exp);
  const baseThreshold = getExpThresholdForLevel(currentLevel);
  const currentLevelExp = Math.max(0, exp - baseThreshold);
  const nextLevelExp = getExpNeededForNextLevel(currentLevel);
  const percentage = Math.min(100, Math.max(0, (currentLevelExp / nextLevelExp) * 100));
  
  return {
    currentLevelExp,
    nextLevelExp,
    percentage
  };
}
