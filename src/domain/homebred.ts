import { scoreToRank } from "./constants.ts";
import type { Broodmare, ProducedHorse, Rank, Stallion } from "./types.ts";

export function producedHorseToStallion(horse: ProducedHorse): Stallion {
  const sireNode = horse.pedigree.generations[0]?.[0];
  const damNode = horse.pedigree.generations[0]?.[1];
  return {
    id: horse.id,
    name: horse.name,
    source: "homebred",
    surface: horse.surface,
    distanceMin: estimateDistanceMin(horse),
    distanceMax: estimateDistanceMax(horse),
    temperamentRank: horse.ranks.temperament,
    bottomRank: bestRank([horse.abilities.guts, horse.abilities.acceleration, horse.abilities.sustain]),
    robustnessRank: horse.ranks.health,
    performanceRank: bestRank([horse.abilities.speed, horse.abilities.stamina, horse.abilities.power]),
    stabilityRank: horse.ranks.constitution,
    sireLine: sireNode?.sireLine ?? "Homebred",
    mareLine: damNode?.mareLine ?? "Homebred",
    bloodRegion: sireNode?.bloodRegion ?? damNode?.bloodRegion ?? "mixed",
    pedigree: horse.pedigree,
    raceRecord: horse.raceRecord,
  };
}

export function producedHorseToBroodmare(horse: ProducedHorse): Broodmare {
  const sireNode = horse.pedigree.generations[0]?.[0];
  const damNode = horse.pedigree.generations[0]?.[1];
  return {
    id: horse.id,
    name: horse.name,
    source: "homebred",
    speedRank: horse.ranks.speed,
    staminaRank: horse.ranks.stamina,
    surface: horse.surface,
    sireLine: sireNode?.sireLine ?? "Homebred",
    mareLine: damNode?.mareLine ?? "Homebred",
    bloodRegion: sireNode?.bloodRegion ?? damNode?.bloodRegion ?? "mixed",
    pedigree: horse.pedigree,
    raceRecord: horse.raceRecord,
  };
}

function bestRank(values: number[]): Rank {
  return scoreToRank(Math.max(...values));
}

function estimateDistanceMin(horse: ProducedHorse): number {
  if (horse.abilities.speed >= 96) return 1000;
  if (horse.abilities.speed >= 64) return 1200;
  if (horse.abilities.stamina >= 96) return 1800;
  return 1400;
}

function estimateDistanceMax(horse: ProducedHorse): number {
  if (horse.abilities.stamina >= 96) return 3600;
  if (horse.abilities.stamina >= 64) return 2800;
  if (horse.abilities.speed >= 96) return 2000;
  return 2400;
}
