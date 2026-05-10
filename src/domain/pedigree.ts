import type { FiveGenerationPedigree, PedigreeNode, Sex } from "./types.ts";

export const FAMILY_NUMBER_VALUES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "16",
  "19",
  "22",
] as const;

const SIRE_LINE_GROUPS: Record<string, string> = {
  "All American": "Hail to Reason",
  "Big Brown": "Northern Dancer",
  Blame: "Hail to Reason",
  "Cape Cross": "Northern Dancer",
  "Colonel John": "Man o' War",
  Congrats: "Bold Ruler",
  Curlin: "Mr. Prospector",
  "Daiwa Major": "Hail to Reason",
  "Danehill Dancer": "Northern Dancer",
  Danzig: "Northern Dancer",
  "Deep Impact": "Hail to Reason",
  "Divine Park": "Mr. Prospector",
  "Dubai Millennium": "Mr. Prospector",
  Durandal: "Hail to Reason",
  Fappiano: "Mr. Prospector",
  Frankel: "Northern Dancer",
  Galileo: "Northern Dancer",
  "Gold Allure": "Hail to Reason",
  "Gun Runner": "Mr. Prospector",
  "Hail to Reason": "Hail to Reason",
  Halo: "Hail to Reason",
  Harbinger: "Northern Dancer",
  "Heart's Cry": "Hail to Reason",
  "Henny Hughes": "Northern Dancer",
  "Holy Roman Emperor": "Northern Dancer",
  Iffraaj: "Mr. Prospector",
  "Into Mischief": "Northern Dancer",
  Jeremy: "Northern Dancer",
  "King Halo": "Northern Dancer",
  "King Kamehameha": "Mr. Prospector",
  Kingmambo: "Mr. Prospector",
  Kurofune: "Northern Dancer",
  "Malibu Moon": "Bold Ruler",
  "Manhattan Cafe": "Hail to Reason",
  "Medaglia d'Oro": "Northern Dancer",
  "Mill Reef": "Nasrullah",
  Montjeu: "Northern Dancer",
  Motivator: "Northern Dancer",
  "Mr. Prospector": "Mr. Prospector",
  Nasrullah: "Nasrullah",
  "Native Dancer": "Native Dancer",
  "Neo Universe": "Hail to Reason",
  "New Approach": "Northern Dancer",
  Nijinsky: "Northern Dancer",
  "Northern Dancer": "Northern Dancer",
  "Northern Taste": "Northern Dancer",
  Orfevre: "Hail to Reason",
  "Per Incanto": "Mr. Prospector",
  Relaunch: "Man o' War",
  Roberto: "Hail to Reason",
  Rulership: "Mr. Prospector",
  "Sadler's Wells": "Northern Dancer",
  "Sea The Stars": "Northern Dancer",
  "Seattle Slew": "Bold Ruler",
  Shamardal: "Northern Dancer",
  "Smart Strike": "Mr. Prospector",
  "Stay Gold": "Hail to Reason",
  "Stay Thirsty": "Bold Ruler",
  "Storm Cat": "Northern Dancer",
  "Street Cry": "Mr. Prospector",
  "Sunday Silence": "Hail to Reason",
  "Symboli Kris S": "Hail to Reason",
  Tapit: "Bold Ruler",
  Tavistock: "Northern Dancer",
  Tizway: "Man o' War",
  "Tiz the Law": "Bold Ruler",
  "Uncle Mo": "Nasrullah",
  Wilburn: "Bold Ruler",
  "Wootton Bassett": "Mr. Prospector",
  Zoffany: "Northern Dancer",
};

export function resolveSireLineGroup(sireLine: string): string {
  return SIRE_LINE_GROUPS[sireLine] ?? "Other";
}

export function normalizeFamilyNumber(familyNumber?: string): string | undefined {
  const value = familyNumber?.trim();
  if (!value) return undefined;
  const number = value.match(/\d+/)?.[0];
  return number ? `${number}号族` : value;
}

export function familyNumberFromOffset(offset: number): string {
  return normalizeFamilyNumber(FAMILY_NUMBER_VALUES[offset % FAMILY_NUMBER_VALUES.length]) ?? "1号族";
}

export function familyNumberFromText(value: string): string {
  return familyNumberFromOffset(hashText(value));
}

export function sexFromRawPedigree(value: "M" | "F"): Sex {
  return value === "M" ? "male" : "female";
}

export function sexFromPedigreeSlot(slotIndex: number): Sex {
  return slotIndex % 2 === 0 ? "male" : "female";
}

export function normalizePedigreeNode(
  node: PedigreeNode,
  generationIndex: number,
  slotIndex: number,
): PedigreeNode {
  const sex = node.sex ?? sexFromPedigreeSlot(slotIndex);
  return {
    ...node,
    sex,
    sireLineGroup: node.sireLineGroup ?? resolveSireLineGroup(node.sireLine),
    familyNumber: normalizeFamilyNumber(node.familyNumber ?? node.mareLine) ?? familyNumberFromText(node.name),
  };
}

export function normalizePedigree(pedigree: FiveGenerationPedigree): FiveGenerationPedigree {
  return {
    ...pedigree,
    generations: pedigree.generations.map((generation, generationIndex) =>
      generation.map((node, slotIndex) => normalizePedigreeNode(node, generationIndex, slotIndex)),
    ),
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
