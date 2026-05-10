export type Rank = "A" | "B" | "C" | "D";
export type Surface = "turf" | "dirt" | "versatile";
export type Sex = "male" | "female";
export type BloodRegion = "japan" | "europe" | "america" | "australia" | "mixed";
export type HorseSource = "default" | "homebred";
export type BreedingGrade = "normal" | "good" | "very_good";
export type MyostatinGenotype = "CC" | "CT" | "TT";
export type SireLineTendency = "acceleration" | "sustain" | "balanced";
export type InbreedingFactor =
  | "speed"
  | "stamina"
  | "power"
  | "guts"
  | "acceleration"
  | "sustain"
  | "fear";

export interface AbilityScores {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  acceleration: number;
  sustain: number;
  temperament: number;
  fear: number;
  constitution: number;
  health: number;
}

export type AbilityKey = keyof AbilityScores;
export type AbilityDeltaMap = Partial<Record<AbilityKey, number>>;

export interface AbilityRanks {
  speed: Rank;
  stamina: Rank;
  power: Rank;
  guts: Rank;
  acceleration: Rank;
  sustain: Rank;
  temperament: Rank;
  fear: Rank;
  constitution: Rank;
  health: Rank;
}

export interface PedigreeNode {
  id: string;
  name: string;
  sireId?: string;
  damId?: string;
  sireLine: string;
  mareLine?: string;
  familyNumber?: string;
  bloodRegion?: BloodRegion;
  factors?: InbreedingFactor[];
  myostatin?: MyostatinProfile;
}

export interface FiveGenerationPedigree {
  rootHorseId: string;
  generations: PedigreeNode[][];
}

export type MyostatinProbabilities = Record<MyostatinGenotype, number>;

export interface MyostatinProfile {
  genotype?: MyostatinGenotype;
  probabilities: MyostatinProbabilities;
}

export interface SireLineTendencyReport {
  sireLine: string;
  tendency: SireLineTendency;
  label: string;
  abilityDeltas: AbilityDeltaMap;
}

export interface FactorEffectReport {
  source: "inbreeding" | "outcross";
  factor: InbreedingFactor;
  ancestorName?: string;
  positions?: string[];
  bloodPercent: number;
  multiplier: number;
  abilityDeltas: AbilityDeltaMap;
}

export interface AbilityInfluence {
  source: "inbreeding" | "outcross" | "sire_line" | "myostatin" | "constitution";
  label: string;
  abilityDeltas: AbilityDeltaMap;
}

export interface RaceRecord {
  starts: number;
  wins: number;
  places: number;
  shows: number;
  g1Wins: number;
  injuryCount: number;
}

export interface Stallion {
  id: string;
  name: string;
  source: HorseSource;
  surface: Surface;
  distanceMin: number;
  distanceMax: number;
  temperamentRank: Rank;
  bottomRank: Rank;
  robustnessRank: Rank;
  performanceRank: Rank;
  stabilityRank: Rank;
  sireLine: string;
  mareLine?: string;
  familyNumber?: string;
  bloodRegion: BloodRegion;
  myostatin: MyostatinProfile;
  pedigree: FiveGenerationPedigree;
  raceRecord?: RaceRecord;
}

export interface Broodmare {
  id: string;
  name: string;
  source: HorseSource;
  speedRank: Rank;
  staminaRank: Rank;
  surface: Surface;
  sireLine: string;
  mareLine?: string;
  familyNumber?: string;
  bloodRegion: BloodRegion;
  myostatin: MyostatinProfile;
  pedigree: FiveGenerationPedigree;
  raceRecord?: RaceRecord;
}

export interface ProducedHorse {
  id: string;
  name: string;
  sex: Sex;
  sireId: string;
  damId: string;
  birthIndex: number;
  seedIndex: number;
  abilities: AbilityScores;
  ranks: AbilityRanks;
  surface: Surface;
  familyNumber?: string;
  myostatin: MyostatinProfile;
  abilityInfluences: AbilityInfluence[];
  pedigree: FiveGenerationPedigree;
  breedingEvaluation: BreedingEvaluation;
  createdAt: string;
  raceRecord: RaceRecord;
  retiredAs?: "stallion" | "broodmare";
}

export interface BreedingEvaluation {
  sireLineDiversityCount: number;
  mareLineDiversityCount: number;
  isGoodBySireLine: boolean;
  isGoodByMareLine: boolean;
  grade: BreedingGrade;
  inbreeding: InbreedingReport[];
  strongestInbreedingPercent: number;
  hasOutcross: boolean;
  constitutionPenalty: number;
  factorEffects: FactorEffectReport[];
  outcrossFactorEffects: FactorEffectReport[];
  sireLineTendency: SireLineTendencyReport;
}

export interface InbreedingReport {
  ancestorId: string;
  ancestorName: string;
  positions: string[];
  totalBloodPercent: number;
  factors: InbreedingFactor[];
  factorEffects: FactorEffectReport[];
}

export interface SaveData {
  version: number;
  savedAt: string;
  defaultStallions: Stallion[];
  defaultBroodmares: Broodmare[];
  producedHorses: ProducedHorse[];
  homebredStallionIds: string[];
  homebredBroodmareIds: string[];
}
