/**
 * All-States Memorial Highway Data Processor
 *
 * Joins the openclaw CSV (bio fields) with the geocode pipeline output
 * (centroid coordinates) and writes per-state JSON files consumed by
 * the Next.js map.
 *
 * Run with (from CapstoneWebApp/): npx tsx scripts/process-all-states-data.ts
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

const SOURCE_DATA = path.resolve(__dirname, "source-data");
const CSV_SOURCE = path.join(SOURCE_DATA, "all_states_summarized.csv");
const CSV_GEOCODED = path.join(SOURCE_DATA, "highways_geocoded.csv");
const PUBLIC_DATA = path.resolve(__dirname, "..", "public", "data");

// Anomalies to suppress from the map: matched by (state code, exact highway_name).
// Matching by name keeps removals stable across CSV re-parses.
const EXCLUDE_BY_NAME = new Set<string>([
  "HI|Farrington Highway",
  "HI|Kalanianaole Highway",
  "NY|The Korean War Veterans Memorial Parkway",
  "NY|Jewish War Veterans Memorial Highway",
]);
const STATES_DIR = path.join(PUBLIC_DATA, "states");

interface StateMeta {
  name: string;
  center: [number, number];
  zoom: number;
}

const STATE_META: Record<string, StateMeta> = {
  AL: { name: "Alabama", center: [32.7794, -86.8287], zoom: 7 },
  AK: { name: "Alaska", center: [64.0685, -152.2782], zoom: 4 },
  AZ: { name: "Arizona", center: [34.2744, -111.6602], zoom: 6 },
  AR: { name: "Arkansas", center: [34.8938, -92.4426], zoom: 7 },
  CA: { name: "California", center: [36.78, -119.42], zoom: 6 },
  CO: { name: "Colorado", center: [38.9972, -105.5478], zoom: 7 },
  CT: { name: "Connecticut", center: [41.6219, -72.7273], zoom: 8 },
  DE: { name: "Delaware", center: [38.9896, -75.505], zoom: 8 },
  FL: { name: "Florida", center: [27.9944, -81.7603], zoom: 7 },
  GA: { name: "Georgia", center: [32.6415, -83.4426], zoom: 7 },
  HI: { name: "Hawaii", center: [20.2927, -156.3737], zoom: 7 },
  ID: { name: "Idaho", center: [44.3509, -114.6130], zoom: 6 },
  IL: { name: "Illinois", center: [40.0417, -89.1965], zoom: 6 },
  IN: { name: "Indiana", center: [39.8942, -86.2816], zoom: 7 },
  IA: { name: "Iowa", center: [42.0751, -93.4960], zoom: 7 },
  KS: { name: "Kansas", center: [38.4937, -98.3804], zoom: 7 },
  KY: { name: "Kentucky", center: [37.5347, -85.3021], zoom: 7 },
  LA: { name: "Louisiana", center: [31.0689, -91.9968], zoom: 7 },
  ME: { name: "Maine", center: [45.3695, -69.2428], zoom: 7 },
  MD: { name: "Maryland", center: [39.0550, -76.7909], zoom: 7 },
  MA: { name: "Massachusetts", center: [42.2596, -71.8083], zoom: 8 },
  MI: { name: "Michigan", center: [44.3148, -85.6024], zoom: 6 },
  MN: { name: "Minnesota", center: [46.2807, -94.3053], zoom: 6 },
  MS: { name: "Mississippi", center: [32.7364, -89.6678], zoom: 7 },
  MO: { name: "Missouri", center: [38.3566, -92.4580], zoom: 7 },
  MT: { name: "Montana", center: [47.0, -109.6], zoom: 6 },
  NE: { name: "Nebraska", center: [41.5, -99.8], zoom: 7 },
  NV: { name: "Nevada", center: [39.3289, -116.6312], zoom: 6 },
  NH: { name: "New Hampshire", center: [43.6805, -71.5832], zoom: 7 },
  NJ: { name: "New Jersey", center: [40.1907, -74.6728], zoom: 7 },
  NM: { name: "New Mexico", center: [34.4071, -106.1126], zoom: 7 },
  NY: { name: "New York", center: [42.9538, -75.5268], zoom: 7 },
  NC: { name: "North Carolina", center: [35.5557, -79.3877], zoom: 7 },
  ND: { name: "North Dakota", center: [47.4501, -100.4659], zoom: 7 },
  OH: { name: "Ohio", center: [40.2862, -82.7937], zoom: 7 },
  OK: { name: "Oklahoma", center: [35.5889, -97.4943], zoom: 7 },
  OR: { name: "Oregon", center: [43.9336, -120.5583], zoom: 6 },
  PA: { name: "Pennsylvania", center: [40.8781, -77.7996], zoom: 7 },
  RI: { name: "Rhode Island", center: [41.6762, -71.5562], zoom: 9 },
  SC: { name: "South Carolina", center: [33.9169, -80.8964], zoom: 7 },
  SD: { name: "South Dakota", center: [44.4443, -100.2263], zoom: 7 },
  TN: { name: "Tennessee", center: [35.8580, -86.3505], zoom: 7 },
  TX: { name: "Texas", center: [31.97, -99.90], zoom: 6 },
  UT: { name: "Utah", center: [39.3055, -111.6703], zoom: 6 },
  VT: { name: "Vermont", center: [44.0687, -72.6658], zoom: 7 },
  VA: { name: "Virginia", center: [37.5215, -78.8537], zoom: 7 },
  WA: { name: "Washington", center: [47.3826, -120.4472], zoom: 6 },
  WV: { name: "West Virginia", center: [38.6409, -80.6227], zoom: 7 },
  WI: { name: "Wisconsin", center: [44.5, -89.5], zoom: 7 },
  WY: { name: "Wyoming", center: [42.9957, -107.5512], zoom: 7 },
  DC: { name: "District of Columbia", center: [38.9072, -77.0369], zoom: 11 },
};

const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_META).map(([code, meta]) => [meta.name.toLowerCase(), code])
);

function parseBool(v: string | undefined): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  const s = v.trim().toLowerCase();
  if (s === "yes" || s === "true") return true;
  if (s === "no" || s === "false") return false;
  return undefined;
}

function parseYear(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = v.trim().match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : undefined;
}

function parseEducation(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.trim();
  if (!s || s === "[]") return undefined;
  try {
    const parsed = JSON.parse(s.replace(/'/g, '"'));
    if (Array.isArray(parsed)) return parsed.join(", ") || undefined;
  } catch {
    // fall through
  }
  return s.replace(/[\[\]']/g, "").trim() || undefined;
}

function parseNumber(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function cleanStr(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.trim();
  if (!s || s.toLowerCase() === "not found") return undefined;
  return s;
}

interface Highway {
  id: string;
  shapeId: string;
  name: string;
  state: string;
  county: string;
  honoree: Record<string, unknown>;
  location: {
    coordinates: [number, number];
    county?: string;
    state: string;
  };
  designation: { year?: number; legislation?: string };
  description?: string;
  bill?: string;
  highway?: string;
  lawWebLink?: string;
}

function buildHighway(
  src: Record<string, string>,
  geo: Record<string, string> | undefined,
  stateCode: string
): Highway | null {
  const lat = parseNumber(geo?.centroid_lat);
  const lon = parseNumber(geo?.centroid_lon);
  if (lat === undefined || lon === undefined) return null;

  const id = geo?.id || src.id || "";
  const personName =
    cleanStr(src.person_name) || cleanStr(src.odmp_name) || "Unknown";
  const summary = cleanStr(src.summary) || cleanStr(src.odmp_bio);
  const county = cleanStr(src.county) || cleanStr(geo?.parsed_county);
  const routeNo = cleanStr(src.route_no);

  const isLawEnforcement = Boolean(
    cleanStr(src.odmp_url) ||
      cleanStr(src.odmp_name) ||
      cleanStr(src.odmp_cause)
  );

  const honoree: Record<string, unknown> = {
    name: personName,
    summary,
    education: parseEducation(src.education),
    gender: cleanStr(src.gender),
    placeOfBirth: cleanStr(src.place_of_birth),
    placeOfDeath: cleanStr(src.place_of_death),
    birthYear: parseYear(src.dob),
    deathYear: parseYear(src.dod),
    involvedInSports: parseBool(src.involved_in_sports),
    involvedInPolitics: parseBool(src.involved_in_politics),
    involvedInMilitary: parseBool(src.involved_in_military),
    involvedInMusic: parseBool(src.involved_in_music),
    age: parseNumber(src.odmp_age),
    tour: parseNumber(src.odmp_tour),
    causeOfDeath: cleanStr(src.odmp_cause),
    incidentDescription: cleanStr(src.odmp_incident_details),
    involvedInLawEnforcement: isLawEnforcement || undefined,
  };

  for (const k of Object.keys(honoree)) {
    if (honoree[k] === undefined) delete honoree[k];
  }

  const hw: Highway = {
    id: `${stateCode}-${id}`,
    shapeId: `csv-${id}`,
    name: cleanStr(src.highway_name) || "Unnamed Memorial Highway",
    state: stateCode,
    county: county || "",
    honoree,
    location: {
      coordinates: [lat, lon],
      county,
      state: stateCode,
    },
    designation: {},
    highway: routeNo,
    lawWebLink: cleanStr(src.wikipedia_url) || cleanStr(src.odmp_url),
  };

  if (!county) delete (hw as Partial<Highway>).county;
  if (!hw.highway) delete hw.highway;
  if (!hw.lawWebLink) delete hw.lawWebLink;
  if (!hw.location.county) delete hw.location.county;

  return hw;
}

function readCSV(p: string): Record<string, string>[] {
  const content = fs.readFileSync(p, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: false,
  }) as Record<string, string>[];
}

function main() {
  console.log("Reading source CSV...");
  const srcRows = readCSV(CSV_SOURCE);
  console.log(`  ${srcRows.length} rows`);

  console.log("Reading geocoded CSV...");
  const geoRows = readCSV(CSV_GEOCODED);
  console.log(`  ${geoRows.length} rows`);

  const geoById = new Map<string, Record<string, string>>();
  for (const g of geoRows) {
    if (g.id) geoById.set(String(g.id).trim(), g);
  }

  const byState = new Map<string, Highway[]>();
  let unknownState = 0;
  let noCentroid = 0;
  let excluded = 0;
  let built = 0;

  srcRows.forEach((row, idx) => {
    const stateName = (row.state || "").trim().toLowerCase();
    const stateCode = NAME_TO_CODE[stateName];
    if (!stateCode) {
      unknownState++;
      return;
    }

    const highwayName = (row.highway_name || "").trim();
    if (EXCLUDE_BY_NAME.has(`${stateCode}|${highwayName}`)) {
      excluded++;
      return;
    }
    const geoKey = String(idx + 1);
    const geo = geoById.get(geoKey);
    const synthetic = { ...row, id: geoKey };
    const hw = buildHighway(synthetic, geo, stateCode);
    if (!hw) {
      noCentroid++;
      return;
    }

    const list = byState.get(stateCode) ?? [];
    list.push(hw);
    byState.set(stateCode, list);
    built++;
  });

  console.log(`Built ${built} highways (${unknownState} unknown-state, ${noCentroid} no-centroid, ${excluded} excluded)`);

  if (!fs.existsSync(STATES_DIR)) fs.mkdirSync(STATES_DIR, { recursive: true });

  const sortedStates = [...byState.keys()].sort();
  const allHighways: Highway[] = [];
  const stateInfo: Record<
    string,
    { name: string; count: number; center: [number, number]; zoom: number }
  > = {};
  const now = new Date().toISOString();

  for (const code of sortedStates) {
    const highways = byState.get(code)!;
    const meta = STATE_META[code];
    const stateDir = path.join(STATES_DIR, code);
    if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });

    // Deterministic jitter for markers that share exact coords (state-centroid fallbacks).
    // Spreads stacked points into a visible ring so each is individually clickable.
    const coordCounts = new Map<string, number>();
    for (const hw of highways) {
      const key = `${hw.location.coordinates[0]},${hw.location.coordinates[1]}`;
      coordCounts.set(key, (coordCounts.get(key) ?? 0) + 1);
    }
    const coordSeen = new Map<string, number>();
    for (const hw of highways) {
      const key = `${hw.location.coordinates[0]},${hw.location.coordinates[1]}`;
      if ((coordCounts.get(key) ?? 0) > 1) {
        const seen = coordSeen.get(key) ?? 0;
        const total = coordCounts.get(key)!;
        const angle = (seen / total) * Math.PI * 2;
        const radius = 0.08 + (seen % 8) * 0.015;
        hw.location.coordinates = [
          hw.location.coordinates[0] + Math.sin(angle) * radius,
          hw.location.coordinates[1] + Math.cos(angle) * radius,
        ];
        coordSeen.set(key, seen + 1);
      }
    }

    const dataset = {
      highways,
      metadata: {
        lastUpdated: now,
        totalCount: highways.length,
        states: [code],
      },
    };
    fs.writeFileSync(
      path.join(stateDir, "highways.json"),
      JSON.stringify(dataset, null, 2)
    );

    stateInfo[code] = {
      name: meta.name,
      count: highways.length,
      center: meta.center,
      zoom: meta.zoom,
    };
    allHighways.push(...highways);
  }

  const index = {
    states: sortedStates,
    lastUpdated: now,
    totalHighways: allHighways.length,
    stateInfo,
  };
  fs.writeFileSync(
    path.join(PUBLIC_DATA, "index.json"),
    JSON.stringify(index, null, 2)
  );

  const combined = {
    highways: allHighways,
    metadata: {
      lastUpdated: now,
      totalCount: allHighways.length,
      states: sortedStates,
    },
  };
  fs.writeFileSync(
    path.join(PUBLIC_DATA, "highways.json"),
    JSON.stringify(combined, null, 2)
  );

  console.log("Done.");
  console.log(`  ${sortedStates.length} state files written`);
  console.log(`  ${allHighways.length} highways total`);
  for (const code of sortedStates) {
    console.log(`    ${code}: ${stateInfo[code].count}`);
  }
}

main();
