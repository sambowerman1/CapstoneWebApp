/**
 * Nebraska Memorial Highway Data Processor
 *
 * Run with: npx tsx scripts/process-nebraska-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCSV } from './shared/csv-parser.js';
import { getCoordinatesForCounty } from './shared/coordinate-utils.js';
import { extractHonoreeName, detectInvolvement } from './shared/name-utils.js';
import { generateAnalysisData } from './shared/analysis-generator.js';
import { NEBRASKA_COUNTIES, NEBRASKA_CENTER } from './county-data/nebraska-counties.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Non-person entries to skip
const SKIP_NAMES = new Set([
  'American Legion', 'Blue Star', 'Gold Star', 'Purple Heart',
  'Veterans', 'POW-MIA', 'Pearl Harbor',
]);

function isPersonEntry(name: string): boolean {
  if (!name) return false;
  if (SKIP_NAMES.has(name)) return false;
  const lower = name.toLowerCase();
  if (lower.includes('veterans') || lower.includes('memorial day')) return false;
  if (lower.includes('legion') || lower.includes('star')) return false;
  // Person names typically have at least 2 words
  return name.split(/\s+/).length >= 2;
}

function parseCountyFromLocation(location: string): string {
  if (!location) return 'Unknown';
  // Try patterns like "Platte/Butler County Line" or "Lancaster/Cass County Line"
  const countyMatch = location.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\/|County|county)/);
  if (countyMatch) {
    const county = countyMatch[1].trim();
    if (NEBRASKA_COUNTIES[county]) return county;
  }
  // Try to find any county name in the location string
  for (const county of Object.keys(NEBRASKA_COUNTIES)) {
    if (location.includes(county)) return county;
  }
  // Try city names that might map to counties
  if (location.includes('Kearney')) return 'Buffalo';
  if (location.includes('Omaha')) return 'Douglas';
  if (location.includes('Lincoln')) return 'Lancaster';
  if (location.includes('Tecumseh')) return 'Johnson';
  if (location.includes('Cozad')) return 'Dawson';
  if (location.includes('Elmwood')) return 'Cass';
  if (location.includes('McCook')) return 'Red Willow';
  if (location.includes('Scottsbluff')) return 'Scotts Bluff';
  if (location.includes('North Platte')) return 'Lincoln';
  if (location.includes('Norfolk')) return 'Madison';
  if (location.includes('Columbus')) return 'Platte';
  if (location.includes('Grand Island')) return 'Hall';
  if (location.includes('Hastings')) return 'Adams';
  if (location.includes('Fremont')) return 'Dodge';
  if (location.includes('Beatrice')) return 'Gage';
  if (location.includes('Bellevue')) return 'Sarpy';
  return 'Unknown';
}

function parseDate(dateStr: string): { year?: number; month?: number; day?: number } {
  if (!dateStr) return {};
  // Format: "1886-08-28" or similar
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return { year: parseInt(match[1]), month: parseInt(match[2]), day: parseInt(match[3]) };
  }
  return {};
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

function loadODMPData(): Map<string, Record<string, string>> {
  const odmpPath = path.join(__dirname, '..', 'newStates', 'nebraska', 'nebraska_matched_officers.csv');
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

async function main() {
  const csvPath = path.join(__dirname, '..', 'newStates', 'nebraska', 'final_output_nebraska.csv');
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'states', 'NE');
  const outputPath = path.join(outputDir, 'highways.json');
  const analysisPath = path.join(outputDir, 'analysis.json');

  console.log('Reading Nebraska CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Found ${rows.length} rows`);

  const odmpData = loadODMPData();
  console.log(`Loaded ${odmpData.size} ODMP records`);

  const highways: Highway[] = [];

  rows.forEach((row, index) => {
    const name = row['Name']?.trim() || '';
    if (!isPersonEntry(name)) {
      console.log(`  Skipping non-person: ${name}`);
      return;
    }

    const route = row['Route']?.trim() || '';
    const location = row['Location']?.trim() || '';
    const county = parseCountyFromLocation(location);
    const coords = getCoordinatesForCounty(county, NEBRASKA_COUNTIES, NEBRASKA_CENTER);

    const honoreeName = extractHonoreeName(name);
    const occupation = row['Primary Occupation']?.trim() || '';
    const involvement = detectInvolvement(name, occupation);

    const honoree: Record<string, any> = { name: honoreeName };
    if (row['Sex']?.trim()) honoree.gender = row['Sex'].trim();
    if (row['Race']?.trim()) honoree.race = row['Race'].trim();
    if (occupation) honoree.summary = `Occupation: ${occupation}`;

    const birth = parseDate(row['Birth Date']?.trim() || '');
    const death = parseDate(row['Death Date']?.trim() || '');
    if (birth.year) honoree.birthYear = birth.year;
    if (death.year) honoree.deathYear = death.year;

    // ODMP data
    const odmp = odmpData.get(honoreeName.toLowerCase()) || odmpData.get(name.toLowerCase());
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

    // Parse designation date
    let desYear: number | undefined;
    const dateStr = row['Date']?.trim() || '';
    if (dateStr) {
      const yearMatch = dateStr.match(/(\d{2})$/);
      if (yearMatch) {
        const yr = parseInt(yearMatch[1]);
        desYear = yr > 50 ? 1900 + yr : 2000 + yr;
      }
    }

    // Clean undefined
    Object.keys(honoree).forEach(key => {
      if (honoree[key] === undefined || honoree[key] === '') delete honoree[key];
    });

    highways.push({
      id: `ne-${index + 1}`,
      shapeId: `NE_${row['Number']?.trim() || index + 1}`,
      name: `${name} Memorial Highway`,
      state: 'NE',
      county,
      honoree,
      location: { coordinates: coords, county, state: 'NE' },
      designation: { year: desYear },
      highway: route || undefined,
    });
  });

  console.log(`Processed ${highways.length} memorial highways`);

  const dataset = {
    highways,
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalCount: highways.length,
      states: ['NE'],
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

  const analysis = generateAnalysisData(highways, 'NE', 'Nebraska');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

  console.log(`Done! ${highways.length} highways written to ${outputPath}`);
}

main().catch(console.error);
