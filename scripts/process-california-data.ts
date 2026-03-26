/**
 * California Memorial Highway Data Processor
 *
 * Run with: npx tsx scripts/process-california-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCSV } from './shared/csv-parser.js';
import { getCoordinatesForCounty } from './shared/coordinate-utils.js';
import { extractHonoreeName, detectInvolvement } from './shared/name-utils.js';
import { generateAnalysisData } from './shared/analysis-generator.js';
import { CALIFORNIA_COUNTIES, CA_CITY_TO_COUNTY, CALIFORNIA_CENTER } from './county-data/california-counties.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Non-person highway names to skip
const SKIP_PATTERNS = [
  /blue star/i, /gold star/i, /purple heart/i, /^veterans/i,
  /pow[\s-]*mia/i, /pearl harbor/i, /medal of honor/i,
  /^american legion/i, /^world war/i, /^korean war/i,
  /^vietnam/i, /^fallen officers/i, /^memorial/i,
  /^scenic/i, /^historic/i, /^el camino real/i,
];

function isPersonHighway(name: string): boolean {
  if (!name) return false;
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(name)) return false;
  }
  // Extract the person-name portion
  const honoreeName = extractHonoreeName(name);
  // Person names typically have at least 2 words
  return honoreeName.split(/\s+/).length >= 2;
}

function parseCountyFromLocations(fromLoc: string, toLoc: string, district: string): string {
  const combined = `${fromLoc} ${toLoc}`.toLowerCase();

  // Try to find county name directly
  for (const county of Object.keys(CALIFORNIA_COUNTIES)) {
    if (combined.includes(county.toLowerCase())) return county;
  }

  // Try city-to-county mapping
  for (const [city, county] of Object.entries(CA_CITY_TO_COUNTY)) {
    if (combined.includes(city)) return county;
  }

  // District-based fallback (Caltrans districts)
  const districtToCounty: Record<string, string> = {
    '1': 'Humboldt', '2': 'Shasta', '3': 'Sacramento',
    '4': 'Alameda', '5': 'San Luis Obispo', '6': 'Fresno',
    '7': 'Los Angeles', '8': 'San Bernardino', '9': 'Inyo',
    '10': 'Stanislaus', '11': 'San Diego', '12': 'Orange',
  };

  // District can be comma-separated like "12, 7, 5"
  const firstDistrict = district.split(',')[0].trim();
  if (districtToCounty[firstDistrict]) return districtToCounty[firstDistrict];

  return 'Unknown';
}

function extractDesignationYear(howNamed: string): number | undefined {
  if (!howNamed) return undefined;
  // Pattern: "ACR 58, CH 108, 2003" or "SCR 36, CH 104, 1983"
  const yearMatch = howNamed.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) return parseInt(yearMatch[1]);
  return undefined;
}

interface Highway {
  id: string;
  shapeId: string;
  name: string;
  state: string;
  county: string;
  honoree: Record<string, any>;
  location: { coordinates: [number, number]; county: string; state: string };
  designation: { year?: number; legislation?: string };
  description?: string;
  highway?: string;
}

function loadWikiData(): Map<string, Record<string, string>> {
  const wikiPath = path.join(__dirname, '..', 'newStates', 'california', 'wiki_scraper_output_california.csv');
  try {
    const content = fs.readFileSync(wikiPath, 'utf-8');
    const rows = parseCSV(content);
    const map = new Map<string, Record<string, string>>();
    for (const row of rows) {
      const name = row['Name']?.trim();
      if (name) {
        map.set(name.toLowerCase(), row);
      }
    }
    return map;
  } catch {
    console.warn('Could not load Wiki data');
    return new Map();
  }
}

function loadFindAGraveData(): Map<string, Record<string, string>> {
  const fagPath = path.join(__dirname, '..', 'newStates', 'california', 'findagrave_results.csv');
  try {
    const content = fs.readFileSync(fagPath, 'utf-8');
    const rows = parseCSV(content);
    const map = new Map<string, Record<string, string>>();
    for (const row of rows) {
      const name = row['query_name']?.trim();
      const score = parseFloat(row['match_score'] || '0');
      if (name && score > 0.5 && row['parsed_bio_snippet']?.trim()) {
        map.set(name.toLowerCase(), row);
      }
    }
    return map;
  } catch {
    console.warn('Could not load FindAGrave data');
    return new Map();
  }
}

function loadODMPData(): Map<string, Record<string, string>> {
  const odmpPath = path.join(__dirname, '..', 'newStates', 'california', 'odmp_ca_officers.csv');
  try {
    const content = fs.readFileSync(odmpPath, 'utf-8');
    const rows = parseCSV(content);
    const map = new Map<string, Record<string, string>>();
    for (const row of rows) {
      const matchName = row['matched_input_name']?.trim();
      if (matchName) {
        map.set(matchName.toLowerCase(), row);
      }
    }
    return map;
  } catch {
    console.warn('Could not load ODMP data');
    return new Map();
  }
}

function parseDate(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/(\d{4})/);
  if (match) {
    const yr = parseInt(match[1]);
    if (yr > 1000) return yr;
  }
  return undefined;
}

async function main() {
  const csvPath = path.join(__dirname, '..', 'newStates', 'california', 'california_memorial_highways.csv');
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'states', 'CA');
  const outputPath = path.join(outputDir, 'highways.json');
  const analysisPath = path.join(outputDir, 'analysis.json');

  console.log('Reading California CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Found ${rows.length} rows`);

  const wikiData = loadWikiData();
  const findAGraveData = loadFindAGraveData();
  const odmpData = loadODMPData();
  console.log(`Loaded ${wikiData.size} Wiki, ${findAGraveData.size} FindAGrave, ${odmpData.size} ODMP records`);

  const highways: Highway[] = [];

  rows.forEach((row, index) => {
    const highwayName = row['highway_name']?.trim() || '';
    if (!highwayName || !isPersonHighway(highwayName)) return;

    const honoreeName = extractHonoreeName(highwayName);
    const fromLoc = row['from_location']?.trim() || '';
    const toLoc = row['to_location']?.trim() || '';
    const district = row['district']?.trim() || '';
    const county = parseCountyFromLocations(fromLoc, toLoc, district);
    const coords = getCoordinatesForCounty(county, CALIFORNIA_COUNTIES, CALIFORNIA_CENTER);
    const routeNo = row['route_no']?.trim() || '';
    const howNamed = row['how_named']?.trim() || '';

    const involvement = detectInvolvement(highwayName, '');

    const honoree: Record<string, any> = { name: honoreeName };

    // Wiki data
    const wiki = wikiData.get(honoreeName.toLowerCase());
    if (wiki) {
      if (wiki['Primary_Occupation']?.trim()) {
        honoree.summary = `Occupation: ${wiki['Primary_Occupation'].trim()}`;
        const fullInvolvement = detectInvolvement(highwayName, wiki['Primary_Occupation'].trim());
        Object.assign(involvement, fullInvolvement);
      }
      if (wiki['Sex']?.trim()) honoree.gender = wiki['Sex'].trim();
      if (wiki['Race']?.trim()) honoree.race = wiki['Race'].trim();
      const birthYear = parseDate(wiki['Birth_Date']?.trim() || '');
      const deathYear = parseDate(wiki['Death_Date']?.trim() || '');
      if (birthYear) honoree.birthYear = birthYear;
      if (deathYear) honoree.deathYear = deathYear;
    }

    // FindAGrave data
    const fag = findAGraveData.get(honoreeName.toLowerCase());
    if (fag) {
      if (fag['parsed_bio_snippet']?.trim() && !honoree.summary) {
        honoree.summary = fag['parsed_bio_snippet'].trim();
      }
      if (fag['parsed_place']?.trim()) {
        honoree.placeOfDeath = fag['parsed_place'].trim();
      }
    }

    // ODMP data
    const odmp = odmpData.get(honoreeName.toLowerCase());
    if (odmp) {
      if (odmp['bio']?.trim()) honoree.summary = odmp['bio'].trim();
      if (odmp['age']?.trim()) honoree.age = parseInt(odmp['age'], 10) || undefined;
      if (odmp['tour']?.trim()) honoree.tour = odmp['tour'].trim();
      if (odmp['cause']?.trim()) honoree.causeOfDeath = odmp['cause'].trim();
      if (odmp['incident_details']?.trim()) honoree.incidentDescription = odmp['incident_details'].trim();
      involvement.involvedInLawEnforcement = true;
    }

    // Add involvement flags
    if (involvement.involvedInMilitary) honoree.involvedInMilitary = true;
    if (involvement.involvedInPolitics) honoree.involvedInPolitics = true;
    if (involvement.involvedInLawEnforcement) honoree.involvedInLawEnforcement = true;
    if (involvement.involvedInFireService) honoree.involvedInFireService = true;
    if (involvement.involvedInSports) honoree.involvedInSports = true;
    if (involvement.involvedInMusic) honoree.involvedInMusic = true;

    // Clean undefined
    Object.keys(honoree).forEach(key => {
      if (honoree[key] === undefined || honoree[key] === '') delete honoree[key];
    });

    const desYear = extractDesignationYear(howNamed);

    highways.push({
      id: `ca-${row['_id']?.trim() || index + 1}`,
      shapeId: `CA_${row['_id']?.trim() || index + 1}`,
      name: highwayName,
      state: 'CA',
      county,
      honoree,
      location: { coordinates: coords, county, state: 'CA' },
      designation: {
        year: desYear,
        legislation: howNamed || undefined,
      },
      highway: routeNo ? `Route ${routeNo}` : undefined,
    });
  });

  console.log(`Processed ${highways.length} memorial highways`);

  const dataset = {
    highways,
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalCount: highways.length,
      states: ['CA'],
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

  const analysis = generateAnalysisData(highways, 'CA', 'California');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

  console.log(`Done! ${highways.length} highways written to ${outputPath}`);
}

main().catch(console.error);
