import type { AbilityKey, AbilityRanks, AbilityScores, RaceRecord, Rank } from "./types";

export const SEED_PATTERN_COUNT = 8192;
export const SAVE_DATA_VERSION = 1;
export const SAVE_KEY = "horse_breeding_game_save_v1";

export const ABILITY_KEYS: AbilityKey[] = [
  "speed",
  "stamina",
  "power",
  "guts",
  "acceleration",
  "sustain",
  "temperament",
  "fear",
  "constitution",
  "health",
];

export const RANK_RANGES: Record<Rank, { min: number; max: number }> = {
  A: { min: 96, max: 127 },
  B: { min: 64, max: 95 },
  C: { min: 32, max: 63 },
  D: { min: 0, max: 31 },
};

export const RANK_LABELS: Record<Rank, string> = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
};

export const SURFACE_LABELS = {
  turf: "芝",
  dirt: "ダート",
  versatile: "万能",
} as const;

export const SEX_LABELS = {
  male: "牡馬",
  female: "牝馬",
} as const;

export const BREEDING_GRADE_LABELS = {
  normal: "通常配合",
  good: "良い配合",
  very_good: "とても良い配合",
} as const;

export const INBREEDING_WARNING_THRESHOLD = 18.75;
export const MAX_HOMEBRED_STALLIONS = 3;
export const MAX_HOMEBRED_BROODMARES = 5;

export function clampAbility(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(127, Math.round(value)));
}

export function scoreToRank(value: number): Rank {
  const score = clampAbility(value);
  if (score >= RANK_RANGES.A.min) return "A";
  if (score >= RANK_RANGES.B.min) return "B";
  if (score >= RANK_RANGES.C.min) return "C";
  return "D";
}

export function rankToMinScore(rank: Rank): number {
  return RANK_RANGES[rank].min;
}

export function rankToMaxScore(rank: Rank): number {
  return RANK_RANGES[rank].max;
}

export function rankToMidScore(rank: Rank): number {
  const range = RANK_RANGES[rank];
  return Math.round((range.min + range.max) / 2);
}

export function abilityScoresToRanks(scores: AbilityScores): AbilityRanks {
  return {
    speed: scoreToRank(scores.speed),
    stamina: scoreToRank(scores.stamina),
    power: scoreToRank(scores.power),
    guts: scoreToRank(scores.guts),
    acceleration: scoreToRank(scores.acceleration),
    sustain: scoreToRank(scores.sustain),
    temperament: scoreToRank(scores.temperament),
    fear: scoreToRank(scores.fear),
    constitution: scoreToRank(scores.constitution),
    health: scoreToRank(scores.health),
  };
}

export function createEmptyRaceRecord(): RaceRecord {
  return {
    starts: 0,
    wins: 0,
    places: 0,
    shows: 0,
    g1Wins: 0,
    injuryCount: 0,
  };
}
