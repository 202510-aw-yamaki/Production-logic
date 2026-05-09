import { writeFile } from "node:fs/promises";
import { defaultBroodmares, defaultStallions } from "../src/domain/horses.ts";

const NETKEIBA_SEARCH_URL = "https://en.netkeiba.com/db/horse/horse_list.html";
const NETKEIBA_PEDIGREE_URL = "https://en.netkeiba.com/db/horse/ped";
const USER_AGENT = "Mozilla/5.0 (compatible; ProductionLogicPedigreeBuilder/1.0)";

const SEARCH_ALIASES = {
  "broodmare-buena-vista": ["Southern Stars"],
  "broodmare-gran-alegria": ["Halteclere"],
  "broodmare-inspiral": ["Ma'am"],
};

const SOURCE_ID_OVERRIDES = {
  "broodmare-gran-alegria": "2011100647",
  "broodmare-inspiral": "000a01fe43",
};

function normalize(value) {
  return value
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeHtml(value.replace(/<span[^>]*class="spec_from"[^>]*>([^<]+)<\/span>/g, "$1").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanHorseName(value) {
  return stripTags(value).replace(/\s+\(([A-Z]{2,4})\)$/g, "").trim();
}

async function fetchText(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "user-agent": USER_AGENT,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function searchHorse(word) {
  const body = new URLSearchParams({
    type: "db",
    encode: "",
    word,
    submit: "Search",
  });
  const html = await fetchText(NETKEIBA_SEARCH_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return [...html.matchAll(/<a href="https:\/\/en\.netkeiba\.com\/db\/horse\/([0-9a-z]+)\/" title="([^"]+)"[\s\S]*?<div class="DataBox_01">([\s\S]*?)<\/div>/g)].map(
    (match) => ({
      id: match[1],
      title: decodeHtml(match[2]).trim(),
      text: stripTags(match[3]),
    }),
  );
}

function matchesParent(candidate, horse) {
  const text = normalize(candidate.text);
  return text.includes(`sire: ${normalize(horse.sireLine)}`) && text.includes(`dam: ${normalize(horse.mareLine ?? "")}`);
}

async function resolveSourceId(horse) {
  if (SOURCE_ID_OVERRIDES[horse.id]) {
    return {
      id: SOURCE_ID_OVERRIDES[horse.id],
      query: horse.name,
      title: horse.name,
      text: "manual source id override",
    };
  }

  const queries = [horse.name, ...(SEARCH_ALIASES[horse.id] ?? [])];
  for (const query of queries) {
    const candidates = await searchHorse(query);
    const byParent = candidates.find((candidate) => matchesParent(candidate, horse));
    if (byParent) return { ...byParent, query };

    const byTitle = candidates.find((candidate) => normalize(candidate.title) === normalize(query));
    if (byTitle) return { ...byTitle, query };

    if (horse.id.startsWith("stallion-") && candidates.length > 0) {
      return { ...candidates[0], query };
    }

    if (candidates.length === 1) return { ...candidates[0], query };
  }

  throw new Error(`Could not resolve netkeiba id for ${horse.id} (${horse.name})`);
}

function parsePedigreeTable(html) {
  const sectionStart = html.indexOf('<section class="HorsePedigree">');
  const tableStart = html.indexOf("<table", sectionStart);
  const tableEnd = html.indexOf("</table>", tableStart);
  if (sectionStart < 0 || tableStart < 0 || tableEnd < 0) {
    throw new Error("Pedigree table was not found");
  }

  const table = html.slice(tableStart, tableEnd);
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => match[1]);
  const occupied = [];
  const cells = [];

  rows.forEach((row, rowIndex) => {
    occupied[rowIndex] ??= [];
    let columnIndex = 0;
    for (const match of row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)) {
      while (occupied[rowIndex][columnIndex]) columnIndex += 1;

      const attrs = match[1];
      const body = match[2];
      const link = body.match(/<a href="https:\/\/en\.netkeiba\.com\/db\/horse\/([0-9a-z]+)\/"[^>]*>([\s\S]*?)<\/a>/i);
      if (!link) {
        columnIndex += 1;
        continue;
      }

      const rowSpan = Number((attrs.match(/rowspan="?(\d+)/i) ?? [null, "1"])[1]);
      const sex = /Female/.test(attrs) ? "F" : "M";
      cells.push({
        id: `netkeiba-${link[1]}`,
        name: cleanHorseName(link[2]),
        sex,
        row: rowIndex,
        column: columnIndex,
      });

      for (let rowOffset = rowIndex; rowOffset < rowIndex + rowSpan; rowOffset += 1) {
        occupied[rowOffset] ??= [];
        occupied[rowOffset][columnIndex] = true;
      }
      columnIndex += 1;
    }
  });

  const generations = Array.from({ length: 5 }, (_, column) =>
    cells
      .filter((cell) => cell.column === column)
      .sort((a, b) => a.row - b.row)
      .map(({ id, name, sex }) => [id, name, sex]),
  );

  generations.forEach((generation, index) => {
    const expected = 2 ** (index + 1);
    if (generation.length !== expected) {
      throw new Error(`Generation ${index + 1} has ${generation.length} nodes; expected ${expected}`);
    }
  });

  return generations;
}

async function fetchPedigree(sourceId) {
  const sourceUrl = `${NETKEIBA_PEDIGREE_URL}/${sourceId}/`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const html = await fetchText(sourceUrl);
      return {
        sourceUrl,
        generations: parsePedigreeTable(html),
      };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

function renderGeneratedFile(records) {
  const rawPedigrees = Object.fromEntries(records.map((record) => [record.horseId, record.generations]));
  const sourceUrls = Object.fromEntries(records.map((record) => [record.horseId, record.sourceUrl]));

  return `import { getAncestorFactors } from "./ancestorFactors.ts";
import type { FiveGenerationPedigree, PedigreeNode } from "./types.ts";

type RawPedigreeNode = [id: string, name: string, sex: "M" | "F"];
type RawPedigree = RawPedigreeNode[][];

// Generated by scripts/generate-real-pedigrees.mjs from netkeiba 5-generation pedigree pages.
// Source URLs are stored in REAL_PEDIGREE_SOURCE_URLS for auditability.
const RAW_REAL_PEDIGREES: Record<string, RawPedigree> = ${JSON.stringify(rawPedigrees, null, 2)};

export const REAL_PEDIGREE_SOURCE_URLS: Record<string, string> = ${JSON.stringify(sourceUrls, null, 2)};

export const REAL_PEDIGREES: Record<string, FiveGenerationPedigree> = Object.fromEntries(
  Object.entries(RAW_REAL_PEDIGREES).map(([rootHorseId, generations]) => [
    rootHorseId,
    {
      rootHorseId,
      generations: generations.map((generation) => generation.map(toPedigreeNode)),
    },
  ]),
);

function toPedigreeNode([id, name, sex]: RawPedigreeNode): PedigreeNode {
  const factors = getAncestorFactors(name);
  return {
    id,
    name,
    sireLine: name,
    mareLine: sex === "F" ? name : undefined,
    bloodRegion: "mixed",
    ...(factors.length > 0 ? { factors } : {}),
  };
}
`;
}

const horses = [...defaultStallions, ...defaultBroodmares];
const records = [];

for (const horse of horses) {
  const source = await resolveSourceId(horse);
  const pedigree = await fetchPedigree(source.id);
  records.push({
    horseId: horse.id,
    sourceId: source.id,
    sourceUrl: pedigree.sourceUrl,
    generations: pedigree.generations,
  });
  console.log(`${records.length}/${horses.length} ${horse.id} <- ${source.id} (${source.title})`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}

await writeFile(new URL("../src/domain/realPedigrees.ts", import.meta.url), renderGeneratedFile(records), "utf8");
