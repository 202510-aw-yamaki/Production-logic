# 03_DATA_MODEL.md

## 基本型

```ts
export type Rank = "A" | "B" | "C" | "D";
export type Surface = "turf" | "dirt" | "versatile";
export type Sex = "male" | "female";
export type BloodRegion = "japan" | "europe" | "america" | "australia" | "mixed";
```

## 能力

```ts
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
```

## 血統

```ts
export interface PedigreeNode {
  id: string;
  name: string;
  sireId?: string;
  damId?: string;
  sireLine: string;
  mareLine?: string;
  bloodRegion?: BloodRegion;
}

export interface FiveGenerationPedigree {
  rootHorseId: string;
  generations: PedigreeNode[][];
}
```

## 種牡馬

```ts
export interface Stallion {
  id: string;
  name: string;
  source: "default" | "homebred";
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
  bloodRegion: BloodRegion;
  pedigree: FiveGenerationPedigree;
  raceRecord?: RaceRecord;
}
```

## 繁殖牝馬

```ts
export interface Broodmare {
  id: string;
  name: string;
  source: "default" | "homebred";
  speedRank: Rank;
  staminaRank: Rank;
  surface: Surface;
  sireLine: string;
  mareLine?: string;
  bloodRegion: BloodRegion;
  pedigree: FiveGenerationPedigree;
  raceRecord?: RaceRecord;
}
```

## 生産馬

```ts
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
  pedigree: FiveGenerationPedigree;
  breedingEvaluation: BreedingEvaluation;
  createdAt: string;
  raceRecord: RaceRecord;
  retiredAs?: "stallion" | "broodmare";
}
```

## 戦績

```ts
export interface RaceRecord {
  starts: number;
  wins: number;
  places: number;
  shows: number;
  g1Wins: number;
  injuryCount: number;
}
```

## 配合評価

```ts
export interface BreedingEvaluation {
  sireLineDiversityCount: number;
  mareLineDiversityCount: number;
  isGoodBySireLine: boolean;
  isGoodByMareLine: boolean;
  grade: "normal" | "good" | "very_good";
  inbreeding: InbreedingReport[];
  strongestInbreedingPercent: number;
  hasOutcross: boolean;
}

export interface InbreedingReport {
  ancestorId: string;
  ancestorName: string;
  positions: string[];
  totalBloodPercent: number;
}
```

## 保存データ

```ts
export interface SaveData {
  version: number;
  savedAt: string;
  defaultStallions: Stallion[];
  defaultBroodmares: Broodmare[];
  producedHorses: ProducedHorse[];
  homebredStallionIds: string[];
  homebredBroodmareIds: string[];
}
```
