import { SAVE_DATA_VERSION, SAVE_KEY } from "./constants.ts";
import { normalizeMyostatinProfile } from "./bloodlineTraits.ts";
import { evaluatePedigree } from "./breeding.ts";
import { defaultBroodmares, defaultStallions } from "./horses.ts";
import { normalizeFamilyNumber, normalizePedigree } from "./pedigree.ts";
import type { ProducedHorse, SaveData } from "./types.ts";

export interface ParsedSaveData {
  data: SaveData;
  warning?: string;
}

export function createInitialSaveData(now = new Date().toISOString()): SaveData {
  return {
    version: SAVE_DATA_VERSION,
    savedAt: now,
    defaultStallions,
    defaultBroodmares,
    producedHorses: [],
    homebredStallionIds: [],
    homebredBroodmareIds: [],
  };
}

export function saveToLocalStorage(data: SaveData): SaveData {
  const savedData = {
    ...data,
    version: SAVE_DATA_VERSION,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(savedData));
  return savedData;
}

export function loadFromLocalStorage(): ParsedSaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  return parseSaveDataJson(raw);
}

export function serializeSaveData(data: SaveData): string {
  return JSON.stringify(
    {
      ...data,
      version: SAVE_DATA_VERSION,
      savedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export function parseSaveDataJson(raw: string): ParsedSaveData {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("JSONの形式が正しくありません。");
  }

  if (!isSaveData(value)) {
    throw new Error("セーブデータとして必要な項目が不足しています。");
  }

  return {
    data: normalizeSaveData(value),
    warning:
      value.version === SAVE_DATA_VERSION
        ? undefined
        : `セーブデータのversionが現在の${SAVE_DATA_VERSION}と異なります。`,
  };
}

function normalizeSaveData(data: SaveData): SaveData {
  const producedHorses = data.producedHorses.map(normalizeProducedHorse);
  return {
    ...data,
    version: SAVE_DATA_VERSION,
    defaultStallions,
    defaultBroodmares,
    producedHorses,
    homebredStallionIds: data.homebredStallionIds.filter((id) =>
      producedHorses.some((horse) => horse.id === id),
    ),
    homebredBroodmareIds: data.homebredBroodmareIds.filter((id) =>
      producedHorses.some((horse) => horse.id === id),
    ),
  };
}

function normalizeProducedHorse(horse: ProducedHorse): ProducedHorse {
  const pedigree = normalizePedigree(horse.pedigree);
  const familyNumber = normalizeFamilyNumber(horse.familyNumber ?? pedigree.generations[0]?.[1]?.familyNumber);
  const normalizedHorse = {
    ...horse,
    pedigree,
    familyNumber,
  };
  return {
    ...normalizedHorse,
    myostatin: normalizeMyostatinProfile(horse.myostatin),
    abilityInfluences: horse.abilityInfluences ?? [],
    breedingEvaluation: evaluatePedigree(pedigree),
  };
}

function isSaveData(value: unknown): value is SaveData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.version === "number" &&
    typeof data.savedAt === "string" &&
    Array.isArray(data.defaultStallions) &&
    Array.isArray(data.defaultBroodmares) &&
    Array.isArray(data.producedHorses) &&
    Array.isArray(data.homebredStallionIds) &&
    Array.isArray(data.homebredBroodmareIds) &&
    data.producedHorses.every(isProducedHorseSaveShape)
  );
}

function isProducedHorseSaveShape(value: unknown): value is ProducedHorse {
  if (!value || typeof value !== "object") return false;
  const horse = value as Record<string, unknown>;
  return (
    typeof horse.id === "string" &&
    typeof horse.name === "string" &&
    typeof horse.sireId === "string" &&
    typeof horse.damId === "string" &&
    typeof horse.birthIndex === "number" &&
    typeof horse.seedIndex === "number" &&
    isRecord(horse.abilities) &&
    isRecord(horse.ranks) &&
    isRecord(horse.pedigree) &&
    Array.isArray((horse.pedigree as Record<string, unknown>).generations) &&
    isRecord(horse.breedingEvaluation) &&
    Array.isArray((horse.breedingEvaluation as Record<string, unknown>).inbreeding) &&
    typeof horse.createdAt === "string" &&
    isRecord(horse.raceRecord)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}
