import { SAVE_DATA_VERSION, SAVE_KEY } from "./constants.ts";
import { defaultBroodmares, defaultStallions } from "./horses.ts";
import type { SaveData } from "./types.ts";

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
  return {
    ...data,
    defaultStallions,
    defaultBroodmares,
    producedHorses: data.producedHorses,
    homebredStallionIds: data.homebredStallionIds.filter((id) =>
      data.producedHorses.some((horse) => horse.id === id),
    ),
    homebredBroodmareIds: data.homebredBroodmareIds.filter((id) =>
      data.producedHorses.some((horse) => horse.id === id),
    ),
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
    Array.isArray(data.homebredBroodmareIds)
  );
}
