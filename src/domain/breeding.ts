import {
  abilityScoresToRanks,
  clampAbility,
  INBREEDING_WARNING_THRESHOLD,
  rankToMidScore,
  SEED_PATTERN_COUNT,
} from "./constants.ts";
import { broodmareToPedigreeNode, stallionToPedigreeNode } from "./horses.ts";
import type {
  AbilityScores,
  BloodRegion,
  BreedingEvaluation,
  BreedingGrade,
  Broodmare,
  FiveGenerationPedigree,
  PedigreeNode,
  ProducedHorse,
  Rank,
  Sex,
  Stallion,
  Surface,
} from "./types.ts";

export const PEDIGREE_CONTRIBUTIONS = [50, 25, 12.5, 6.25, 3.125] as const;

interface GenerateFoalInput {
  sire: Stallion;
  dam: Broodmare;
  seedIndex: number;
  birthIndex: number;
  name?: string;
  createdAt?: string;
}

interface RerollProducedHorseSeedInput {
  horse: ProducedHorse;
  sire: Stallion;
  dam: Broodmare;
  seedIndex: number;
}

interface AncestorOccurrence {
  node: PedigreeNode;
  position: string;
  contribution: number;
}

const STABILITY_VARIANCE: Record<Rank, number> = {
  A: 14,
  B: 22,
  C: 32,
  D: 44,
};

const GRADE_MINIMUMS: Record<BreedingGrade, number> = {
  normal: 0,
  good: 16,
  very_good: 32,
};

export function buildFoalPedigree(
  sire: Stallion,
  dam: Broodmare,
  rootHorseId: string,
): FiveGenerationPedigree {
  const generations: PedigreeNode[][] = [
    [stallionToPedigreeNode(sire), broodmareToPedigreeNode(dam)],
  ];

  for (let generationIndex = 1; generationIndex < 5; generationIndex += 1) {
    generations.push([
      ...sire.pedigree.generations[generationIndex - 1],
      ...dam.pedigree.generations[generationIndex - 1],
    ]);
  }

  return {
    rootHorseId,
    generations,
  };
}

export function evaluateBreeding(sire: Stallion, dam: Broodmare): BreedingEvaluation {
  return evaluatePedigree(buildFoalPedigree(sire, dam, "evaluation"));
}

export function evaluatePedigree(pedigree: FiveGenerationPedigree): BreedingEvaluation {
  const occurrences = collectAncestorOccurrences(pedigree);
  const inbreeding = Array.from(occurrences.values())
    .filter((items) => items.length > 1)
    .map((items) => {
      const totalBloodPercent = roundBloodPercent(
        items.reduce((total, item) => total + item.contribution, 0),
      );
      return {
        ancestorId: items[0].node.id,
        ancestorName: items[0].node.name,
        positions: items.map((item) => item.position),
        totalBloodPercent,
      };
    })
    .sort((a, b) => b.totalBloodPercent - a.totalBloodPercent);

  const allNodes = pedigree.generations.flat();
  const sireLineDiversityCount = new Set(allNodes.map((node) => node.sireLine)).size;
  const mareLineDiversityCount = new Set(
    allNodes.map((node) => node.mareLine).filter(Boolean),
  ).size;
  const isGoodBySireLine = sireLineDiversityCount >= 6;
  const isGoodByMareLine = mareLineDiversityCount >= 3;
  const grade: BreedingGrade =
    isGoodBySireLine && isGoodByMareLine
      ? "very_good"
      : isGoodBySireLine || isGoodByMareLine
        ? "good"
        : "normal";

  return {
    sireLineDiversityCount,
    mareLineDiversityCount,
    isGoodBySireLine,
    isGoodByMareLine,
    grade,
    inbreeding,
    strongestInbreedingPercent: inbreeding[0]?.totalBloodPercent ?? 0,
    hasOutcross: inbreeding.length === 0,
  };
}

export function generateProducedHorse(input: GenerateFoalInput): ProducedHorse {
  validateSeedIndex(input.seedIndex);

  const id = `foal-${input.birthIndex}-${input.sire.id}-${input.dam.id}-${input.seedIndex}`;
  const pedigree = buildFoalPedigree(input.sire, input.dam, id);
  const breedingEvaluation = evaluatePedigree(pedigree);
  const random = createSeededRandom(`${input.sire.id}:${input.dam.id}:${input.seedIndex}`);
  const abilities = generateAbilityScores(input.sire, input.dam, breedingEvaluation, random);

  return {
    id,
    name: input.name?.trim() || `生産馬${input.birthIndex}`,
    sex: random() > 0.5 ? "male" : "female",
    sireId: input.sire.id,
    damId: input.dam.id,
    birthIndex: input.birthIndex,
    seedIndex: input.seedIndex,
    abilities,
    ranks: abilityScoresToRanks(abilities),
    surface: inheritSurface(input.sire.surface, input.dam.surface, random),
    pedigree,
    breedingEvaluation,
    createdAt: input.createdAt ?? new Date().toISOString(),
    raceRecord: {
      starts: 0,
      wins: 0,
      places: 0,
      shows: 0,
      g1Wins: 0,
      injuryCount: 0,
    },
  };
}

export function rerollProducedHorseSeed(input: RerollProducedHorseSeedInput): ProducedHorse {
  validateSeedIndex(input.seedIndex);

  const pedigree = buildFoalPedigree(input.sire, input.dam, input.horse.id);
  const breedingEvaluation = evaluatePedigree(pedigree);
  const random = createSeededRandom(`${input.sire.id}:${input.dam.id}:${input.seedIndex}`);
  const abilities = generateAbilityScores(input.sire, input.dam, breedingEvaluation, random);

  return {
    ...input.horse,
    sireId: input.sire.id,
    damId: input.dam.id,
    seedIndex: input.seedIndex,
    abilities,
    ranks: abilityScoresToRanks(abilities),
    pedigree,
    breedingEvaluation,
  };
}

function collectAncestorOccurrences(
  pedigree: FiveGenerationPedigree,
): Map<string, AncestorOccurrence[]> {
  const occurrences = new Map<string, AncestorOccurrence[]>();

  pedigree.generations.forEach((generation, generationIndex) => {
    generation.forEach((node, slotIndex) => {
      const items = occurrences.get(node.id) ?? [];
      items.push({
        node,
        position: `${generationIndex + 1}-${slotIndex + 1}`,
        contribution: PEDIGREE_CONTRIBUTIONS[generationIndex],
      });
      occurrences.set(node.id, items);
    });
  });

  return occurrences;
}

function generateAbilityScores(
  sire: Stallion,
  dam: Broodmare,
  evaluation: BreedingEvaluation,
  random: () => number,
): AbilityScores {
  const variance = STABILITY_VARIANCE[sire.stabilityRank];
  const gradeMinimum = GRADE_MINIMUMS[evaluation.grade];
  const distanceStamina = distanceToRankMidpoint(sire.distanceMax);
  const distanceSpeed = distanceToSpeedMidpoint(sire.distanceMin, sire.distanceMax);
  const regionFear = fearAdjustment(sire.bloodRegion) + fearAdjustment(dam.bloodRegion);
  const inbreedingPenalty = calculateConstitutionPenalty(evaluation.strongestInbreedingPercent);

  const raw: AbilityScores = {
    speed: sampleAbility(
      average([rankToMidScore(dam.speedRank), rankToMidScore(sire.performanceRank), distanceSpeed]),
      variance,
      random,
    ),
    stamina: sampleAbility(
      average([rankToMidScore(dam.staminaRank), rankToMidScore(sire.robustnessRank), distanceStamina]),
      variance,
      random,
    ),
    power: sampleAbility(
      average([
        rankToMidScore(sire.robustnessRank),
        rankToMidScore(sire.performanceRank),
        sire.surface === "dirt" || dam.surface === "dirt" ? 88 : 64,
      ]),
      variance,
      random,
    ),
    guts: sampleAbility(
      average([rankToMidScore(sire.bottomRank), rankToMidScore(sire.performanceRank)]),
      variance,
      random,
    ),
    acceleration: sampleAbility(
      average([rankToMidScore(sire.bottomRank), rankToMidScore(dam.speedRank), distanceSpeed]),
      variance,
      random,
    ),
    sustain: sampleAbility(
      average([rankToMidScore(sire.bottomRank), rankToMidScore(dam.staminaRank), distanceStamina]),
      variance,
      random,
    ),
    temperament: sampleAbility(
      average([rankToMidScore(sire.temperamentRank), rankToMidScore(sire.stabilityRank)]),
      variance,
      random,
    ),
    fear: sampleAbility(
      average([rankToMidScore(sire.temperamentRank), rankToMidScore(dam.speedRank)]) + regionFear,
      variance,
      random,
    ),
    constitution: sampleAbility(
      average([rankToMidScore(sire.robustnessRank), 64]) - inbreedingPenalty,
      variance,
      random,
    ),
    health: sampleAbility(
      average([rankToMidScore(sire.robustnessRank), rankToMidScore(sire.stabilityRank)]),
      variance,
      random,
    ),
  };

  if (evaluation.hasOutcross) {
    raw.constitution = Math.max(raw.constitution, 32);
  }

  return applyMinimums(raw, gradeMinimum);
}

function sampleAbility(base: number, variance: number, random: () => number): number {
  const bell = random() + random() + random() - 1.5;
  return clampAbility(base + bell * variance);
}

function applyMinimums(scores: AbilityScores, minimum: number): AbilityScores {
  return {
    speed: Math.max(scores.speed, minimum),
    stamina: Math.max(scores.stamina, minimum),
    power: Math.max(scores.power, minimum),
    guts: Math.max(scores.guts, minimum),
    acceleration: Math.max(scores.acceleration, minimum),
    sustain: Math.max(scores.sustain, minimum),
    temperament: Math.max(scores.temperament, minimum),
    fear: Math.max(scores.fear, minimum),
    constitution: Math.max(scores.constitution, minimum),
    health: Math.max(scores.health, minimum),
  };
}

export function calculateConstitutionPenalty(strongestInbreedingPercent: number): number {
  if (strongestInbreedingPercent <= 0) return 0;
  if (strongestInbreedingPercent > INBREEDING_WARNING_THRESHOLD) {
    return 20 + Math.round((strongestInbreedingPercent - INBREEDING_WARNING_THRESHOLD) * 0.7);
  }
  return Math.round(strongestInbreedingPercent * 0.2);
}

function inheritSurface(sireSurface: Surface, damSurface: Surface, random: () => number): Surface {
  if (sireSurface === damSurface) return sireSurface;
  if (sireSurface === "versatile") return damSurface;
  if (damSurface === "versatile") return sireSurface;
  return random() > 0.5 ? sireSurface : damSurface;
}

function distanceToRankMidpoint(distanceMax: number): number {
  if (distanceMax >= 3000) return rankToMidScore("A");
  if (distanceMax >= 2400) return rankToMidScore("B");
  if (distanceMax >= 2000) return rankToMidScore("C");
  return rankToMidScore("D");
}

function distanceToSpeedMidpoint(distanceMin: number, distanceMax: number): number {
  if (distanceMin <= 1200 && distanceMax <= 2000) return rankToMidScore("A");
  if (distanceMin <= 1400 && distanceMax <= 2400) return rankToMidScore("B");
  if (distanceMin <= 1800) return rankToMidScore("C");
  return rankToMidScore("D");
}

function fearAdjustment(region: BloodRegion): number {
  if (region === "japan") return 5;
  if (region === "europe") return -7;
  if (region === "australia") return 2;
  return 0;
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundBloodPercent(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function validateSeedIndex(seedIndex: number): void {
  if (!Number.isInteger(seedIndex) || seedIndex < 0 || seedIndex >= SEED_PATTERN_COUNT) {
    throw new Error(`seedIndex must be between 0 and ${SEED_PATTERN_COUNT - 1}`);
  }
}

function createSeededRandom(seedText: string): () => number {
  let seed = hashText(seedText);
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
