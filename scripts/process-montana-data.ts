/**
 * Montana Memorial Highway Data Processor
 *
 * Run with: npx tsx scripts/process-montana-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCSV } from './shared/csv-parser.js';
import { getCoordinatesForCounty } from './shared/coordinate-utils.js';
import { extractHonoreeName, detectInvolvement } from './shared/name-utils.js';
import { generateAnalysisData } from './shared/analysis-generator.js';
import { MONTANA_CENTER } from './county-data/montana-counties.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Non-person entries to skip
const SKIP_NAMES = new Set([
  'Lewis And Clark', 'Lewis And Clark National Historic Trail Auto Route',
  'Nez Perce National Historic Trail Auto Route', 'State Vietnam Veterans Memorial',
  'Veterans', 'Beartooth', 'Missouri Breaks Back Country Byway',
  'Garnet Back Country Byway', 'Pioneer Mountains Scenic Byway',
  'Big Sheep Creek Back Country Byway', 'Kings Hill Scenic Byway',
  'Lake Koocanusa Scenic Byway', 'St RegisParadise Scenic Byway',
  'Camino Real', 'Canamex', 'First Special Services Force', 'Old Forts',
  'Montana Highway 3', 'Big Sky Back Country Byway', 'Purple Heart',
  'Montana State Firefighters Memorial', 'Warrior Trail',
  'Rawhide Stampede Rustlers And Rendezvous Trade',
  'Pintler Veterans Memorial Scenic', 'Prisoner Of War  Missing In Action',
  'Montana Veterans Memorial', 'Northeast Montana Veterans Memorial Park',
  'Shelby Veterans Memorial Flag Monument', 'Montana Medal Of Honor',
  'Pearl Harbor Veterans', 'Beartracks',
  'State Korean War Veterans Memorial  Butte',
  'State Korean War Veterans Memorial  Missoula',
  'State Veterans Memorial Rose Garden',
  'State Iraq And Afghanistan Veterans Memorial Grateful Nation Montana',
  'Pikuni Veterans', 'Flathead County Veterans Memorial',
  'Carbon County Veterans Memorial Loop',
  '163rd Infantry Regiment Sunset Division Heritage',
]);

function isPersonEntry(name: string): boolean {
  if (!name) return false;
  if (SKIP_NAMES.has(name)) return false;
  const lower = name.toLowerCase();
  if (lower.includes('veterans') || lower.includes('memorial park')) return false;
  if (lower.includes('scenic byway') || lower.includes('back country')) return false;
  if (lower.includes('historic trail')) return false;
  // Person names typically have at least 2 words
  return name.split(/\s+/).length >= 2;
}

function parseDate(dateStr: string): number | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/(\d{4})/);
  if (match) {
    const yr = parseInt(match[1]);
    if (yr > 0 && yr !== 0) return yr;
  }
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
}

function loadFindAGraveData(): Map<string, Record<string, string>> {
  const fagPath = path.join(__dirname, '..', 'newStates', 'montana', 'montana_findagrave_results.csv');
  try {
    const content = fs.readFileSync(fagPath, 'utf-8');
    const rows = parseCSV(content);
    const map = new Map<string, Record<string, string>>();
    for (const row of rows) {
      const name = row['Name']?.trim();
      if (name && row['BioText']?.trim()) {
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
  const odmpPath = path.join(__dirname, '..', 'newStates', 'montana', 'montana_matched_officers.csv');
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
  const csvPath = path.join(__dirname, '..', 'newStates', 'montana', 'final_output.csv');
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'states', 'MT');
  const outputPath = path.join(outputDir, 'highways.json');
  const analysisPath = path.join(outputDir, 'analysis.json');

  console.log('Reading Montana CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Found ${rows.length} rows`);

  const findAGraveData = loadFindAGraveData();
  const odmpData = loadODMPData();
  console.log(`Loaded ${findAGraveData.size} FindAGrave records, ${odmpData.size} ODMP records`);

  const highways: Highway[] = [];

  rows.forEach((row, index) => {
    const name = row['Name']?.trim() || '';
    if (!isPersonEntry(name)) {
      console.log(`  Skipping: ${name}`);
      return;
    }

    // Clean name - remove suffixes like ", LCSO 15-47 Memorial Highway"
    const cleanName = name.replace(/,\s*(LCSO|Memorial).*$/i, '').trim();
    const honoreeName = extractHonoreeName(cleanName);

    const occupation = row['Primary Occupation']?.trim() || '';
    const bio = occupation ? `Occupation: ${occupation}` : '';
    const involvement = detectInvolvement(cleanName, bio);

    const honoree: Record<string, any> = { name: honoreeName };
    if (row['Sex']?.trim()) honoree.gender = row['Sex'].trim();
    if (row['Race']?.trim()) honoree.race = row['Race'].trim();
    if (occupation) honoree.summary = `Occupation: ${occupation}`;

    const birthYear = parseDate(row['Birth Date']?.trim() || '');
    const deathYear = parseDate(row['Death Date']?.trim() || '');
    if (birthYear) honoree.birthYear = birthYear;
    if (deathYear) honoree.deathYear = deathYear;

    // FindAGrave data
    const fag = findAGraveData.get(name.toLowerCase()) || findAGraveData.get(cleanName.toLowerCase());
    if (fag && fag['BioText']?.trim()) {
      if (!honoree.summary) honoree.summary = fag['BioText'].trim();
      else honoree.summary += '. ' + fag['BioText'].trim();
    }

    // ODMP data
    const odmpKey = honoreeName.toLowerCase();
    const odmp = odmpData.get(odmpKey) || odmpData.get(cleanName.toLowerCase());
    if (odmp) {
      if (odmp['bio']?.trim()) honoree.summary = odmp['bio'].trim();
      if (odmp['age']?.trim()) honoree.age = parseInt(odmp['age'], 10) || undefined;
      if (odmp['tour']?.trim()) honoree.tour = odmp['tour'].trim();
      if (odmp['cause']?.trim()) honoree.causeOfDeath = odmp['cause'].trim();
      if (odmp['incident_details']?.trim()) honoree.incidentDescription = odmp['incident_details'].trim();
      involvement.involvedInLawEnforcement = true;
    }

    // Check name for law enforcement hints
    if (name.toLowerCase().includes('highway patrol') || name.toLowerCase().includes('officer')) {
      involvement.involvedInLawEnforcement = true;
    }
    if (name.toLowerCase().includes('fire chief') || name.toLowerCase().includes('firefighter')) {
      involvement.involvedInFireService = true;
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

    const coords = getCoordinatesForCounty('', {}, MONTANA_CENTER);

    highways.push({
      id: `mt-${index + 1}`,
      shapeId: `MT_${row['Number']?.trim() || index + 1}`,
      name: name.includes('Memorial') ? name : `${name} Memorial Highway`,
      state: 'MT',
      county: 'Unknown',
      honoree,
      location: { coordinates: coords, county: 'Unknown', state: 'MT' },
      designation: { legislation: row['Legal Reference']?.trim() || undefined },
    });
  });

  console.log(`Processed ${highways.length} memorial highways`);

  const dataset = {
    highways,
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalCount: highways.length,
      states: ['MT'],
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

  const analysis = generateAnalysisData(highways, 'MT', 'Montana');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

  console.log(`Done! ${highways.length} highways written to ${outputPath}`);
}

main().catch(console.error);
