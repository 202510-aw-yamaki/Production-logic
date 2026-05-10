import type {
  AbilityDeltaMap,
  BloodRegion,
  InbreedingFactor,
  MyostatinGenotype,
  MyostatinProbabilities,
  MyostatinProfile,
  Rank,
  SireLineTendency,
  SireLineTendencyReport,
  Surface,
} from "./types.ts";

export const FACTOR_BASE_DELTAS: Record<InbreedingFactor, AbilityDeltaMap> = {
  speed: { speed: 6, acceleration: 2 },
  stamina: { stamina: 6, sustain: 2 },
  power: { power: 6, speed: 1 },
  guts: { guts: 6, temperament: 2 },
  acceleration: { acceleration: 6, speed: 2 },
  sustain: { sustain: 6, stamina: 2 },
  fear: { fear: -5, temperament: 2 },
};

const SIRE_LINE_TENDENCIES: Record<string, SireLineTendency> = {
  "All American": "acceleration",
  "Big Brown": "acceleration",
  "Blame": "sustain",
  "Cape Cross": "sustain",
  "Colonel John": "sustain",
  "Daiwa Major": "acceleration",
  "Danehill Dancer": "acceleration",
  "Deep Impact": "acceleration",
  "Dubai Millennium": "acceleration",
  "Fappiano": "sustain",
  "Frankel": "acceleration",
  "Galileo": "sustain",
  "Gold Allure": "sustain",
  "Harbinger": "sustain",
  "Heart's Cry": "sustain",
  "Henny Hughes": "acceleration",
  "Iffraaj": "acceleration",
  "King Halo": "acceleration",
  "King Kamehameha": "acceleration",
  "Kingmambo": "acceleration",
  "Kurofune": "acceleration",
  "Manhattan Cafe": "sustain",
  "Mill Reef": "sustain",
  "Montjeu": "sustain",
  "Motivator": "sustain",
  "Mr. Prospector": "acceleration",
  "Neo Universe": "sustain",
  "New Approach": "sustain",
  "Northern Dancer": "balanced",
  "Orfevre": "sustain",
  "Per Incanto": "acceleration",
  "Relaunch": "sustain",
  "Roberto": "sustain",
  "Rulership": "sustain",
  "Sadler's Wells": "sustain",
  "Sea The Stars": "sustain",
  "Shamardal": "acceleration",
  "Storm Cat": "acceleration",
  "Street Cry": "sustain",
  "Sunday Silence": "acceleration",
  "Symboli Kris S": "sustain",
  "Tapit": "sustain",
  "Tavistock": "sustain",
  "Tizway": "sustain",
  "Uncle Mo": "acceleration",
  "Wilburn": "acceleration",
  "Zoffany": "acceleration",
};

const SIRE_LINE_DELTAS: Record<SireLineTendency, AbilityDeltaMap> = {
  acceleration: { acceleration: 5, speed: 2, sustain: -1 },
  sustain: { sustain: 5, stamina: 2, acceleration: -1 },
  balanced: {},
};

const SIRE_LINE_LABELS: Record<SireLineTendency, string> = {
  acceleration: "Acceleration",
  sustain: "Sustain",
  balanced: "Balanced",
};

const MYOSTATIN_DELTAS: Record<MyostatinGenotype, AbilityDeltaMap> = {
  CC: { speed: 8, power: 5, acceleration: 6, stamina: -5, sustain: -4 },
  CT: { speed: 3, stamina: 2, power: 2, acceleration: 1, sustain: 1 },
  TT: { stamina: 8, sustain: 6, health: 2, speed: -5, acceleration: -4 },
};

export const DEFAULT_MYOSTATIN_PROFILE: MyostatinProfile = {
  probabilities: { CC: 0.25, CT: 0.5, TT: 0.25 },
};

export function getSireLineTendency(sireLine: string): SireLineTendencyReport {
  const tendency = SIRE_LINE_TENDENCIES[sireLine] ?? "balanced";
  return {
    sireLine,
    tendency,
    label: SIRE_LINE_LABELS[tendency],
    abilityDeltas: { ...SIRE_LINE_DELTAS[tendency] },
  };
}

export function estimateStallionMyostatin(input: {
  surface: Surface;
  distanceMin: number;
  distanceMax: number;
  sireLine: string;
  bloodRegion: BloodRegion;
}): MyostatinProfile {
  let probabilities: MyostatinProbabilities = { CC: 0.25, CT: 0.5, TT: 0.25 };
  if (input.distanceMax <= 2000) probabilities = addProbabilities(probabilities, { CC: 0.24, CT: -0.08, TT: -0.16 });
  if (input.distanceMin <= 1200) probabilities = addProbabilities(probabilities, { CC: 0.08, CT: 0, TT: -0.08 });
  if (input.distanceMax >= 3000) probabilities = addProbabilities(probabilities, { CC: -0.18, CT: -0.04, TT: 0.22 });
  if (input.surface === "dirt") probabilities = addProbabilities(probabilities, { CC: 0.08, CT: 0, TT: -0.08 });
  probabilities = applyRegionMyostatinBias(probabilities, input.bloodRegion);
  probabilities = applyTendencyMyostatinBias(probabilities, input.sireLine);
  return { probabilities: normalizeProbabilities(probabilities) };
}

export function estimateBroodmareMyostatin(input: {
  surface: Surface;
  speedRank: Rank;
  staminaRank: Rank;
  sireLine: string;
  bloodRegion: BloodRegion;
}): MyostatinProfile {
  let probabilities: MyostatinProbabilities = { CC: 0.24, CT: 0.52, TT: 0.24 };
  probabilities = addProbabilities(probabilities, {
    CC: rankBias(input.speedRank),
    CT: 0,
    TT: rankBias(input.staminaRank),
  });
  if (input.surface === "dirt") probabilities = addProbabilities(probabilities, { CC: 0.06, CT: 0, TT: -0.06 });
  probabilities = applyRegionMyostatinBias(probabilities, input.bloodRegion);
  probabilities = applyTendencyMyostatinBias(probabilities, input.sireLine);
  return { probabilities: normalizeProbabilities(probabilities) };
}

export function resolveFoalMyostatin(
  sire: MyostatinProfile,
  dam: MyostatinProfile,
  random: () => number,
): MyostatinProfile {
  const sireC = cAlleleProbability(sire);
  const damC = cAlleleProbability(dam);
  const probabilities = normalizeProbabilities({
    CC: sireC * damC,
    CT: sireC * (1 - damC) + (1 - sireC) * damC,
    TT: (1 - sireC) * (1 - damC),
  });

  return {
    genotype: sampleMyostatinGenotype(probabilities, random),
    probabilities,
  };
}

export function getMyostatinAbilityDeltas(profile: MyostatinProfile): AbilityDeltaMap {
  const genotype = profile.genotype ?? mostLikelyGenotype(profile.probabilities);
  return { ...MYOSTATIN_DELTAS[genotype] };
}

export function normalizeMyostatinProfile(profile?: MyostatinProfile): MyostatinProfile {
  if (!profile) return { probabilities: { ...DEFAULT_MYOSTATIN_PROFILE.probabilities } };
  if (profile.genotype) {
    return {
      genotype: profile.genotype,
      probabilities: deterministicProbabilities(profile.genotype),
    };
  }
  return {
    probabilities: normalizeProbabilities(profile.probabilities),
  };
}

function applyRegionMyostatinBias(
  probabilities: MyostatinProbabilities,
  region: BloodRegion,
): MyostatinProbabilities {
  if (region === "america") return addProbabilities(probabilities, { CC: 0.07, CT: 0, TT: -0.07 });
  if (region === "europe") return addProbabilities(probabilities, { CC: -0.07, CT: 0, TT: 0.07 });
  if (region === "australia") return addProbabilities(probabilities, { CC: 0.03, CT: 0, TT: -0.03 });
  return probabilities;
}

function applyTendencyMyostatinBias(
  probabilities: MyostatinProbabilities,
  sireLine: string,
): MyostatinProbabilities {
  const tendency = getSireLineTendency(sireLine).tendency;
  if (tendency === "acceleration") return addProbabilities(probabilities, { CC: 0.06, CT: 0, TT: -0.06 });
  if (tendency === "sustain") return addProbabilities(probabilities, { CC: -0.06, CT: 0, TT: 0.06 });
  return probabilities;
}

function rankBias(rank: Rank): number {
  if (rank === "A") return 0.14;
  if (rank === "B") return 0.06;
  if (rank === "C") return -0.02;
  return -0.08;
}

function addProbabilities(
  base: MyostatinProbabilities,
  delta: MyostatinProbabilities,
): MyostatinProbabilities {
  return {
    CC: base.CC + delta.CC,
    CT: base.CT + delta.CT,
    TT: base.TT + delta.TT,
  };
}

function normalizeProbabilities(input: MyostatinProbabilities): MyostatinProbabilities {
  const floor = 0.02;
  const cc = Math.max(floor, input.CC);
  const ct = Math.max(floor, input.CT);
  const tt = Math.max(floor, input.TT);
  const total = cc + ct + tt;
  return {
    CC: roundProbability(cc / total),
    CT: roundProbability(ct / total),
    TT: roundProbability(tt / total),
  };
}

function deterministicProbabilities(genotype: MyostatinGenotype): MyostatinProbabilities {
  return {
    CC: genotype === "CC" ? 1 : 0,
    CT: genotype === "CT" ? 1 : 0,
    TT: genotype === "TT" ? 1 : 0,
  };
}

function cAlleleProbability(profile: MyostatinProfile): number {
  const probabilities = profile.genotype
    ? deterministicProbabilities(profile.genotype)
    : normalizeProbabilities(profile.probabilities);
  return probabilities.CC + probabilities.CT * 0.5;
}

function sampleMyostatinGenotype(
  probabilities: MyostatinProbabilities,
  random: () => number,
): MyostatinGenotype {
  const roll = random();
  if (roll < probabilities.CC) return "CC";
  if (roll < probabilities.CC + probabilities.CT) return "CT";
  return "TT";
}

function mostLikelyGenotype(probabilities: MyostatinProbabilities): MyostatinGenotype {
  if (probabilities.CC >= probabilities.CT && probabilities.CC >= probabilities.TT) return "CC";
  if (probabilities.TT >= probabilities.CT && probabilities.TT >= probabilities.CC) return "TT";
  return "CT";
}

function roundProbability(value: number): number {
  return Math.round(value * 1000) / 1000;
}
