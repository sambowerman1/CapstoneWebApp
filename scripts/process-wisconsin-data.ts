/**
 * Wisconsin Memorial Highway Data Processor
 *
 * Run with: npx tsx scripts/process-wisconsin-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCSV } from './shared/csv-parser.js';
import { getCoordinatesForCounty } from './shared/coordinate-utils.js';
import { extractHonoreeName, parseBooleanField, detectInvolvement } from './shared/name-utils.js';
import { generateAnalysisData } from './shared/analysis-generator.js';
import { WISCONSIN_CENTER } from './county-data/wisconsin-counties.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Non-person entries to skip (generic memorials, not specific people)
const SKIP_NAMES = new Set([
  'Blue Star', 'Cinco de Mayo', 'Citizen Soldier', 'Gold Star Families',
  'Purple Heart', 'POW-MIA', 'Veterans',
]);

function isPersonName(cleanedName: string, inputName: string): boolean {
  if (SKIP_NAMES.has(cleanedName)) return false;
  // Skip generic/event-based entries
  const lower = cleanedName.toLowerCase();
  if (lower.includes('memorial day') || lower.includes('veterans')) return false;
  if (lower.includes('highway') && !lower.includes(' ')) return false;
  // A person name typically has at least 2 words
  return cleanedName.split(/\s+/).length >= 2 || inputName.includes('Memorial');
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

function processRow(row: Record<string, string>, index: number): Highway | null {
  const inputName = row['input_name']?.trim() || '';
  const cleanedName = row['cleaned_name']?.trim() || '';

  if (!inputName || !isPersonName(cleanedName, inputName)) return null;

  const honoreeName = cleanedName || extractHonoreeName(inputName);
  const bio = row['ai_summary']?.trim() || '';
  const odmpBio = row['odmp_bio']?.trim() || '';
  const fullBio = [bio, odmpBio].filter(Boolean).join(' ');

  const involvement = detectInvolvement(inputName, fullBio);

  // Override with explicit AI flags if available
  if (parseBooleanField(row['ai_involved_in_sports'])) involvement.involvedInSports = true;
  if (parseBooleanField(row['ai_involved_in_politics'])) involvement.involvedInPolitics = true;
  if (parseBooleanField(row['ai_involved_in_military'])) involvement.involvedInMilitary = true;
  if (parseBooleanField(row['ai_involved_in_music'])) involvement.involvedInMusic = true;
  if (odmpBio) involvement.involvedInLawEnforcement = true;

  const coords = getCoordinatesForCounty('', {}, WISCONSIN_CENTER);

  const honoree: Record<string, any> = { name: honoreeName };
  if (bio) honoree.summary = bio;
  if (row['ai_education']?.trim() && row['ai_education'].trim() !== '[]') {
    try {
      const parsed = JSON.parse(row['ai_education'].replace(/'/g, '"'));
      if (Array.isArray(parsed) && parsed.length > 0) honoree.education = parsed.join(', ');
    } catch {
      const cleaned = row['ai_education'].replace(/[\[\]']/g, '').trim();
      if (cleaned) honoree.education = cleaned;
    }
  }
  if (row['ai_gender']?.trim() && row['ai_gender'].trim() !== 'not found') honoree.gender = row['ai_gender'].trim();
  if (row['ai_place_of_birth']?.trim() && row['ai_place_of_birth'].trim() !== 'not found') honoree.placeOfBirth = row['ai_place_of_birth'].trim();
  if (row['ai_place_of_death']?.trim() && row['ai_place_of_death'].trim() !== 'not found') honoree.placeOfDeath = row['ai_place_of_death'].trim();

  // ODMP fields
  if (row['odmp_age']?.trim()) honoree.age = parseInt(row['odmp_age'], 10) || undefined;
  if (row['odmp_tour']?.trim()) honoree.tour = row['odmp_tour'].trim();
  if (row['odmp_cause']?.trim()) honoree.causeOfDeath = row['odmp_cause'].trim();
  if (row['odmp_incident_details']?.trim()) honoree.incidentDescription = row['odmp_incident_details'].trim();

  // Add involvement flags
  if (involvement.involvedInMilitary) honoree.involvedInMilitary = true;
  if (involvement.involvedInPolitics) honoree.involvedInPolitics = true;
  if (involvement.involvedInLawEnforcement) honoree.involvedInLawEnforcement = true;
  if (involvement.involvedInFireService) honoree.involvedInFireService = true;
  if (involvement.involvedInSports) honoree.involvedInSports = true;
  if (involvement.involvedInMusic) honoree.involvedInMusic = true;

  // Clean undefined values
  Object.keys(honoree).forEach(key => {
    if (honoree[key] === undefined || honoree[key] === '') delete honoree[key];
  });

  return {
    id: `wi-${index}`,
    shapeId: `WI_${index}`,
    name: inputName,
    state: 'WI',
    county: 'Unknown',
    honoree,
    location: { coordinates: coords, county: 'Unknown', state: 'WI' },
    designation: {},
  };
}

async function main() {
  const csvPath = path.join(__dirname, '..', 'newStates', 'wisconsin', 'wisconsin_commemorative_highways_output.csv');
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'states', 'WI');
  const outputPath = path.join(outputDir, 'highways.json');
  const analysisPath = path.join(outputDir, 'analysis.json');

  console.log('Reading Wisconsin CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Found ${rows.length} rows`);

  const highways: Highway[] = [];
  rows.forEach((row, index) => {
    const hw = processRow(row, index + 1);
    if (hw) highways.push(hw);
  });

  console.log(`Processed ${highways.length} memorial highways`);

  const dataset = {
    highways,
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalCount: highways.length,
      states: ['WI'],
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

  const analysis = generateAnalysisData(highways, 'WI', 'Wisconsin');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

  console.log(`Done! ${highways.length} highways written to ${outputPath}`);
}

main().catch(console.error);
