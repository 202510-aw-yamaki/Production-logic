import assert from "node:assert/strict";
import { evaluateBreeding, evaluatePedigree, generateProducedHorse } from "../src/domain/breeding.ts";
import { SEED_PATTERN_COUNT } from "../src/domain/constants.ts";
import { defaultBroodmares, defaultStallions } from "../src/domain/horses.ts";
import { parseSaveDataJson } from "../src/domain/storage.ts";

const excludedStallions = ["イクイノックス", "コントレイル", "ドゥラメンテ", "Galileo", "Dubawi", "Tiznow"];

assert.equal(defaultStallions.length, 24, "defaultStallions should contain 24 horses");
assert.equal(defaultBroodmares.length, 48, "defaultBroodmares should contain 48 horses");
assert.ok(defaultStallions.some((horse) => horse.name === "Too Darn Hot"), "Too Darn Hot should be included");
assert.deepEqual(
  excludedStallions.filter((name) => defaultStallions.some((horse) => horse.name === name)),
  [],
  "excluded stallion names should not be default stallions",
);

for (const horse of [...defaultStallions, ...defaultBroodmares]) {
  assert.equal(horse.pedigree.generations.length, 5, `${horse.name} should have five generations`);
  horse.pedigree.generations.forEach((generation, index) => {
    assert.equal(generation.length, 2 ** (index + 1), `${horse.name} generation ${index + 1} size`);
  });
}

const threeByFour = makePedigreeWithCross(2, 3);
assert.equal(evaluatePedigree(threeByFour).inbreeding[0].totalBloodPercent, 18.75, "3x4 should be 18.75");
assert.ok(
  evaluatePedigree(makePedigreeWithCross(2, 2)).strongestInbreedingPercent > 18.75,
  "3x3 should exceed 18.75",
);
assert.equal(evaluatePedigree(makeOutcrossPedigree()).hasOutcross, true, "outcross should be detected");

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
assert.throws(
  () => generateProducedHorse({ sire, dam, seedIndex: SEED_PATTERN_COUNT, birthIndex: 1 }),
  /seedIndex/,
  "seedIndex should reject 8192",
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
