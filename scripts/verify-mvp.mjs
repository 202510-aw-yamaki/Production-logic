import assert from "node:assert/strict";
import {
  calculateConstitutionPenalty,
  evaluateBreeding,
  evaluatePedigree,
  generateProducedHorse,
  rerollProducedHorseSeed,
} from "../src/domain/breeding.ts";
import { SEED_PATTERN_COUNT } from "../src/domain/constants.ts";
import { defaultBroodmares, defaultStallions } from "../src/domain/horses.ts";
import { REAL_PEDIGREE_SOURCE_URLS } from "../src/domain/realPedigrees.ts";
import {
  createInitialSaveData,
  loadFromLocalStorage,
  parseSaveDataJson,
  saveToLocalStorage,
  serializeSaveData,
} from "../src/domain/storage.ts";

const excludedStallions = ["イクイノックス", "コントレイル", "ドゥラメンテ", "Galileo", "Dubawi", "Tiznow"];

assert.equal(defaultStallions.length, 24, "defaultStallions should contain 24 horses");
assert.equal(defaultBroodmares.length, 48, "defaultBroodmares should contain 48 horses");
assert.ok(defaultStallions.some((horse) => horse.name === "Too Darn Hot"), "Too Darn Hot should be included");
assert.deepEqual(
  excludedStallions.filter((name) => defaultStallions.some((horse) => horse.name === name)),
  [],
  "excluded stallion names should not be default stallions",
);

const expectedStallions = [
  ["キタサンブラック", 1800, 3200, "B", "A", "B", "A", "B", "turf"],
  ["キズナ", 1800, 2600, "B", "B", "A", "B", "A", "versatile"],
  ["ミッキーアイル", 1000, 1800, "C", "B", "B", "B", "B", "turf"],
  ["リアルスティール", 1400, 2400, "B", "B", "B", "A", "C", "versatile"],
  ["エピファネイア", 1600, 3000, "C", "A", "B", "A", "B", "turf"],
  ["サートゥルナーリア", 1400, 2400, "B", "B", "B", "B", "B", "turf"],
  ["ロードカナロア", 1000, 1600, "A", "A", "A", "A", "A", "turf"],
  ["ゴールドシップ", 2200, 3200, "D", "A", "A", "B", "C", "turf"],
  ["モーリス", 1400, 2000, "B", "A", "B", "B", "B", "turf"],
  ["オルフェーヴル", 1600, 3000, "C", "A", "B", "A", "C", "versatile"],
  ["スワーヴリチャード", 1600, 2600, "B", "B", "B", "A", "B", "turf"],
  ["シルバーステート", 1200, 2200, "B", "B", "C", "B", "C", "turf"],
  ["ドレフォン", 1200, 2000, "B", "B", "B", "B", "A", "versatile"],
  ["ルヴァンスレーヴ", 1600, 2100, "B", "B", "C", "C", "B", "dirt"],
  ["ナダル", 1200, 2000, "B", "B", "C", "B", "C", "dirt"],
  ["アドマイヤマーズ", 1400, 1800, "B", "B", "B", "B", "B", "turf"],
  ["Frankel", 1200, 2000, "B", "A", "A", "A", "A", "turf"],
  ["Too Darn Hot", 1400, 2200, "B", "B", "B", "A", "B", "turf"],
  ["Sea The Stars", 1600, 2400, "A", "A", "B", "A", "A", "turf"],
  ["Into Mischief", 1000, 2000, "B", "A", "A", "A", "A", "dirt"],
  ["Gun Runner", 1400, 2200, "A", "A", "A", "A", "A", "dirt"],
  ["Wootton Bassett", 1400, 2400, "B", "A", "B", "A", "A", "turf"],
  ["Flightline", 1200, 2000, "B", "A", "B", "A", "A", "dirt"],
  ["Tiz the Law", 1400, 2400, "B", "B", "B", "B", "B", "dirt"],
];

expectedStallions.forEach(
  ([
    name,
    distanceMin,
    distanceMax,
    temperamentRank,
    bottomRank,
    robustnessRank,
    performanceRank,
    stabilityRank,
    surface,
  ], index) => {
    const actual = defaultStallions[index];
    assert.equal(actual.name, name, `stallion ${index + 1} name`);
    assert.equal(actual.distanceMin, distanceMin, `stallion ${name} distanceMin`);
    assert.equal(actual.distanceMax, distanceMax, `stallion ${name} distanceMax`);
    assert.equal(actual.temperamentRank, temperamentRank, `stallion ${name} temperament`);
    assert.equal(actual.bottomRank, bottomRank, `stallion ${name} bottom`);
    assert.equal(actual.robustnessRank, robustnessRank, `stallion ${name} robustness`);
    assert.equal(actual.performanceRank, performanceRank, `stallion ${name} performance`);
    assert.equal(actual.stabilityRank, stabilityRank, `stallion ${name} stability`);
    assert.equal(actual.surface, surface, `stallion ${name} surface`);
  },
);

const expectedBroodmares = [
  ["シャトーブランシュ", "A", "A", "turf"],
  ["ヤンキーローズ", "A", "B", "turf"],
  ["サザンスターズ", "A", "B", "turf"],
  ["ロカ", "A", "B", "turf"],
  ["チェッキーノ", "A", "B", "turf"],
  ["パルティトゥーラ", "B", "A", "turf"],
  ["トップデサイル", "B", "B", "versatile"],
  ["エアルーティーン", "A", "B", "turf"],
  ["オートクレール", "B", "A", "turf"],
  ["コーステッド", "A", "B", "turf"],
  ["インナーアージ", "B", "A", "turf"],
  ["サンブルエミューズ", "A", "B", "turf"],
  ["ルミナスパレード", "A", "B", "turf"],
  ["アスコルティ", "A", "C", "turf"],
  ["インディアマントゥアナ", "A", "B", "turf"],
  ["ブチコ", "A", "C", "versatile"],
  ["デアリングバード", "A", "B", "turf"],
  ["フォエヴァーダーリング", "A", "B", "dirt"],
  ["アムールポエジー", "B", "B", "dirt"],
  ["ネフェルティティ", "B", "B", "dirt"],
  ["チェストケローズ", "A", "B", "dirt"],
  ["クイーンパイレーツ", "B", "B", "dirt"],
  ["エミーズプライド", "B", "B", "dirt"],
  ["マルケッサ", "B", "B", "versatile"],
  ["サイマー", "B", "B", "versatile"],
  ["エッジースタイル", "B", "A", "turf"],
  ["ブルークランズ", "A", "B", "turf"],
  ["ロッテンマイヤー", "A", "B", "turf"],
  ["ミュージアムヒル", "A", "B", "turf"],
  ["シロインジャー", "A", "C", "turf"],
  ["Together Forever", "A", "B", "turf"],
  ["Rhododendron", "A", "B", "turf"],
  ["Modern Ideals", "A", "B", "turf"],
  ["Modern Eagle", "A", "B", "turf"],
  ["Rosaline", "A", "B", "turf"],
  ["Folk Melody", "A", "B", "turf"],
  ["Missy Moo", "A", "C", "turf"],
  ["Lilahjay", "A", "B", "turf"],
  ["Berimbau", "A", "C", "turf"],
  ["Puca", "A", "B", "dirt"],
  ["Heavenly Love", "B", "B", "dirt"],
  ["Nonna Bella", "A", "B", "dirt"],
  ["Queen Caroline", "A", "B", "versatile"],
  ["Sataves", "B", "B", "dirt"],
  ["Mopotism", "A", "B", "dirt"],
  ["Ma’am", "B", "B", "dirt"],
  ["Too Precious", "A", "B", "turf"],
  ["Queen Blossom", "A", "B", "turf"],
];

expectedBroodmares.forEach(([name, speedRank, staminaRank, surface], index) => {
  const actual = defaultBroodmares[index];
  assert.equal(actual.name, name, `broodmare ${index + 1} name`);
  assert.equal(actual.speedRank, speedRank, `broodmare ${name} speed`);
  assert.equal(actual.staminaRank, staminaRank, `broodmare ${name} stamina`);
  assert.equal(actual.surface, surface, `broodmare ${name} surface`);
});

const expectedBroodmareBloodlines = [
  ["King Halo", "Blancherie", "japan"],
  ["All American", "Condesaar", "australia"],
  ["Smart Strike", "Stacelita", "mixed"],
  ["Harbinger", "Land's Edge", "japan"],
  ["King Kamehameha", "Happy Path", "japan"],
  ["Manhattan Cafe", "Fortepiano", "japan"],
  ["Congrats", "Sequoia Queen", "america"],
  ["Harbinger", "Air Magdalene", "japan"],
  ["Durandal", "ジョイアサーティン", "japan"],
  ["Tizway", "Malibu Pier", "america"],
  ["Deep Impact", "Musical Way", "japan"],
  ["Daiwa Major", "Vite Marcher", "japan"],
  ["Symboli Kris S", "Luminous Point", "japan"],
  ["Danehill Dancer", "Listen", "japan"],
  ["Wilburn", "Speed Wagon", "america"],
  ["King Kamehameha", "Shirayukihime", "japan"],
  ["King Kamehameha", "Daring Heart", "japan"],
  ["Congrats", "Darling My Darling", "america"],
  ["Neo Universe", "Happy Request", "japan"],
  ["Gold Allure", "La Verita", "japan"],
  ["Uncle Mo", "Deputy's Delight", "america"],
  ["King Kamehameha", "California Nectar", "japan"],
  ["King Kamehameha", "Emmy's Smile", "japan"],
  ["Orfevre", "Malpensa", "japan"],
  ["Zoffany", "Serisia", "europe"],
  ["Harbinger", "Land's Edge", "japan"],
  ["Rulership", "Land's Edge", "japan"],
  ["Kurofune", "Adelheid", "japan"],
  ["Heart's Cry", "Loretto Chapel", "japan"],
  ["Harbinger", "Yukichan", "japan"],
  ["Galileo", "Green Room", "europe"],
  ["Galileo", "Halfway To Heaven", "europe"],
  ["New Approach", "Epitome", "europe"],
  ["Montjeu", "Millionaia", "europe"],
  ["New Approach", "Reem Three", "europe"],
  ["Street Cry", "Folk Opera", "europe"],
  ["Per Incanto", "Royal Rhythm", "australia"],
  ["Tavistock", "Upstage", "australia"],
  ["Shamardal", "Percussive", "australia"],
  ["Big Brown", "Boat's Ghost", "america"],
  ["Malibu Moon", "Darling My Darling", "america"],
  ["Stay Thirsty", "Nonna Mia", "america"],
  ["Blame", "Queens Plaza", "america"],
  ["Uncle Mo", "Pacific Sky", "america"],
  ["Uncle Mo", "Peppy Rafaela", "america"],
  ["Colonel John", "Naughty Little Nun", "america"],
  ["Holy Roman Emperor", "Delicate Charm", "europe"],
  ["Jeremy", "Mark Of An Angel", "europe"],
];

expectedBroodmareBloodlines.forEach(([sireLine, mareLine, bloodRegion], index) => {
  const actual = defaultBroodmares[index];
  assert.equal(actual.sireLine, sireLine, `broodmare ${index + 1} sireLine`);
  assert.equal(actual.mareLine, mareLine, `broodmare ${index + 1} mareLine`);
  assert.equal(actual.bloodRegion, bloodRegion, `broodmare ${index + 1} bloodRegion`);
});

for (const horse of [...defaultStallions, ...defaultBroodmares]) {
  assert.equal(horse.pedigree.generations.length, 5, `${horse.name} should have five generations`);
  horse.pedigree.generations.forEach((generation, index) => {
    assert.equal(generation.length, 2 ** (index + 1), `${horse.name} generation ${index + 1} size`);
  });
}

assert.equal(Object.keys(REAL_PEDIGREE_SOURCE_URLS).length, 72, "all MVP horses should have real pedigree sources");

const kitasanBlack = defaultStallions.find((horse) => horse.id === "stallion-kitasan-black");
assert.ok(kitasanBlack, "Kitasan Black should exist");
assert.equal(kitasanBlack.pedigree.generations[0][0].name, "Black Tide", "Kitasan Black sire");
assert.equal(kitasanBlack.pedigree.generations[0][1].name, "Sugar Heart", "Kitasan Black dam");
assert.equal(kitasanBlack.pedigree.generations[1][0].name, "Sunday Silence", "Kitasan Black sire sire");
assert.equal(kitasanBlack.pedigree.generations[1][1].name, "Wind in Her Hair", "Kitasan Black sire dam");

const southernStars = defaultBroodmares.find((horse) => horse.id === "broodmare-buena-vista");
assert.ok(southernStars, "Southern Stars should exist");
assert.equal(southernStars.pedigree.generations[0][0].name, "Smart Strike", "Southern Stars sire");
assert.equal(southernStars.pedigree.generations[0][1].name, "Stacelita", "Southern Stars dam");

const threeByFour = makePedigreeWithCross(2, 3);
assert.equal(evaluatePedigree(threeByFour).inbreeding[0].totalBloodPercent, 18.75, "3x4 should be 18.75");
assert.ok(
  evaluatePedigree(makePedigreeWithCross(2, 2)).strongestInbreedingPercent > 18.75,
  "3x3 should exceed 18.75",
);
assert.equal(evaluatePedigree(makeOutcrossPedigree()).hasOutcross, true, "outcross should be detected");
assert.equal(calculateConstitutionPenalty(0), 0, "outcross should not penalize constitution");
assert.equal(calculateConstitutionPenalty(18.75), 4, "3x4 constitution penalty should be light");
assert.equal(calculateConstitutionPenalty(21.875), 22, "21.875% constitution penalty should keep current balance");

const sire = defaultStallions[0];
const dam = defaultBroodmares[0];
const producedA = generateProducedHorse({
  sire,
  dam,
  seedIndex: 42,
  birthIndex: 1,
  createdAt: "2026-05-09T00:00:00.000Z",
});
const producedB = generateProducedHorse({
  sire,
  dam,
  seedIndex: 42,
  birthIndex: 1,
  createdAt: "2026-05-09T00:00:00.000Z",
});
assert.deepEqual(producedA.abilities, producedB.abilities, "same sire, dam and seed should be deterministic");
assert.equal(evaluateBreeding(sire, dam).grade, "very_good", "representative pair should be very_good");
assert.ok(Math.min(...Object.values(producedA.abilities)) >= 32, "very_good should guarantee each ability >=32");
const rerolledProduced = rerollProducedHorseSeed({ horse: producedA, sire, dam, seedIndex: 43 });
assert.equal(rerolledProduced.id, producedA.id, "reroll should keep produced horse id");
assert.equal(rerolledProduced.seedIndex, 43, "reroll should update seedIndex");
assert.notDeepEqual(rerolledProduced.abilities, producedA.abilities, "different seed should change abilities");
assert.throws(
  () => generateProducedHorse({ sire, dam, seedIndex: SEED_PATTERN_COUNT, birthIndex: 1 }),
  /seedIndex/,
  "seedIndex should reject 8192",
);
assert.throws(
  () => rerollProducedHorseSeed({ horse: producedA, sire, dam, seedIndex: SEED_PATTERN_COUNT }),
  /seedIndex/,
  "reroll should reject 8192",
);

const goodSire = makeSyntheticStallion("good-sire", ["A", "B", "C", "D", "E", "F"], ["M"]);
const goodDam = makeSyntheticBroodmare("good-dam", ["G", "H", "I", "J", "K", "L"], ["M"]);
assert.equal(evaluateBreeding(goodSire, goodDam).grade, "good", "sire-line diversity alone should be good");
const goodFoal = generateProducedHorse({ sire: goodSire, dam: goodDam, seedIndex: 1, birthIndex: 1 });
assert.ok(Math.min(...Object.values(goodFoal.abilities)) >= 16, "good should guarantee each ability >=16");

const outcrossSire = makeSyntheticStallion("outcross-sire", ["A"], ["M1"], true);
const outcrossDam = makeSyntheticBroodmare("outcross-dam", ["B"], ["M2"], true);
const outcrossFoal = generateProducedHorse({ sire: outcrossSire, dam: outcrossDam, seedIndex: 2, birthIndex: 1 });
assert.equal(evaluateBreeding(outcrossSire, outcrossDam).hasOutcross, true, "synthetic pair should be outcross");
assert.ok(outcrossFoal.abilities.constitution >= 32, "outcross should guarantee constitution C or better");

assert.throws(() => parseSaveDataJson("{"), /JSON/, "invalid JSON should be rejected");
assert.throws(() => parseSaveDataJson("{}"), /セーブデータ/, "malformed save data should be rejected");

const localStorageStore = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageStore.get(key) ?? null,
  setItem: (key, value) => localStorageStore.set(key, String(value)),
  removeItem: (key) => localStorageStore.delete(key),
  clear: () => localStorageStore.clear(),
  key: (index) => Array.from(localStorageStore.keys())[index] ?? null,
  get length() {
    return localStorageStore.size;
  },
};
const savedData = saveToLocalStorage({
  ...createInitialSaveData("2026-05-09T00:00:00.000Z"),
  producedHorses: [producedA],
});
assert.equal(loadFromLocalStorage()?.data.producedHorses.length, 1, "localStorage save should be restorable");
assert.equal(parseSaveDataJson(serializeSaveData(savedData)).data.version, 1, "serialized JSON should be restorable");

console.log("MVP verification passed");

function makePedigreeWithCross(firstGenerationIndex, secondGenerationIndex) {
  const shared = makeNode("shared", "Shared", "SharedM");
  const generations = Array.from({ length: 5 }, (_, generationIndex) =>
    Array.from({ length: 2 ** (generationIndex + 1) }, (_, slotIndex) =>
      makeNode(`n-${generationIndex}-${slotIndex}`, `Line${generationIndex}-${slotIndex}`, `M${generationIndex}`),
    ),
  );
  generations[firstGenerationIndex][0] = shared;
  generations[secondGenerationIndex][1] = shared;
  return { rootHorseId: "cross", generations };
}

function makeOutcrossPedigree() {
  return {
    rootHorseId: "outcross",
    generations: Array.from({ length: 5 }, (_, generationIndex) =>
      Array.from({ length: 2 ** (generationIndex + 1) }, (_, slotIndex) =>
        makeNode(`o-${generationIndex}-${slotIndex}`, `Line${generationIndex}-${slotIndex}`, `M${slotIndex}`),
      ),
    ),
  };
}

function makeSyntheticStallion(id, sireLines, mareLines, uniqueIds = false) {
  return {
    id,
    name: id,
    source: "default",
    surface: "turf",
    distanceMin: 1200,
    distanceMax: 2000,
    temperamentRank: "D",
    bottomRank: "D",
    robustnessRank: "D",
    performanceRank: "D",
    stabilityRank: "D",
    sireLine: sireLines[0],
    mareLine: mareLines[0],
    bloodRegion: "japan",
    pedigree: makeSyntheticPedigree(id, sireLines, mareLines, uniqueIds),
  };
}

function makeSyntheticBroodmare(id, sireLines, mareLines, uniqueIds = false) {
  return {
    id,
    name: id,
    source: "default",
    speedRank: "D",
    staminaRank: "D",
    surface: "turf",
    sireLine: sireLines[0],
    mareLine: mareLines[0],
    bloodRegion: "japan",
    pedigree: makeSyntheticPedigree(id, sireLines, mareLines, uniqueIds),
  };
}

function makeSyntheticPedigree(rootHorseId, sireLines, mareLines, uniqueIds) {
  return {
    rootHorseId,
    generations: Array.from({ length: 5 }, (_, generationIndex) =>
      Array.from({ length: 2 ** (generationIndex + 1) }, (_, slotIndex) => {
        const sireLine = sireLines[slotIndex % sireLines.length];
        const mareLine = mareLines[slotIndex % mareLines.length];
        const id = uniqueIds
          ? `${rootHorseId}-${generationIndex}-${slotIndex}`
          : `shared-${sireLine}-${mareLine}-${generationIndex}-${slotIndex}`;
        return makeNode(id, sireLine, mareLine);
      }),
    ),
  };
}

function makeNode(id, sireLine, mareLine) {
  return {
    id,
    name: id,
    sireLine,
    mareLine,
    bloodRegion: "mixed",
  };
}
