/**
 * Texas Memorial Highway Data Processor
 *
 * Run with: npx tsx scripts/process-texas-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCSV } from './shared/csv-parser.js';
import { getCoordinatesForCounty } from './shared/coordinate-utils.js';
import { extractHonoreeName, detectInvolvement } from './shared/name-utils.js';
import { generateAnalysisData } from './shared/analysis-generator.js';
import { TEXAS_COUNTIES, TEXAS_CENTER } from './county-data/texas-counties.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const wikiPath = path.join(__dirname, '..', 'newStates', 'texas', 'wiki_scraper_output.csv');
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
  const csvPath = path.join(__dirname, '..', 'newStates', 'texas', 'texas_data_with_counties.csv');
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'states', 'TX');
  const outputPath = path.join(outputDir, 'highways.json');
  const analysisPath = path.join(outputDir, 'analysis.json');

  console.log('Reading Texas CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Found ${rows.length} rows`);

  const wikiData = loadWikiData();
  console.log(`Loaded ${wikiData.size} Wiki records`);

  const highways: Highway[] = [];

  rows.forEach((row, index) => {
    const memorialName = row['MEMORIAL_H']?.trim() || '';
    if (!memorialName) return;

    const county = row['county']?.trim() || 'Unknown';
    const coords = getCoordinatesForCounty(county, TEXAS_COUNTIES, TEXAS_CENTER);
    const honoreeName = extractHonoreeName(memorialName);

    const route = row['RTE_PRFX']?.trim() && row['RTE_NBR']?.trim()
      ? `${row['RTE_PRFX'].trim()}-${row['RTE_NBR'].trim()}`
      : row['RTE_NM']?.trim() || '';

    const involvement = detectInvolvement(memorialName, '');

    const honoree: Record<string, any> = { name: honoreeName };

    // Wiki data lookup
    const wiki = wikiData.get(honoreeName.toLowerCase());
    if (wiki) {
      if (wiki['Primary Occupation']?.trim()) {
        honoree.summary = `Occupation: ${wiki['Primary Occupation'].trim()}`;
        // Re-detect involvement with occupation info
        const fullInvolvement = detectInvolvement(memorialName, wiki['Primary Occupation'].trim());
        Object.assign(involvement, fullInvolvement);
      }
      if (wiki['Sex']?.trim()) honoree.gender = wiki['Sex'].trim();
      if (wiki['Race']?.trim()) honoree.race = wiki['Race'].trim();
      const birthYear = parseDate(wiki['Birth Date']?.trim() || '');
      const deathYear = parseDate(wiki['Death Date']?.trim() || '');
      if (birthYear) honoree.birthYear = birthYear;
      if (deathYear) honoree.deathYear = deathYear;
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

    highways.push({
      id: `tx-${row['OBJECTID']?.trim() || index + 1}`,
      shapeId: `TX_${row['OBJECTID']?.trim() || index + 1}`,
      name: memorialName,
      state: 'TX',
      county,
      honoree,
      location: { coordinates: coords, county, state: 'TX' },
      designation: {},
      highway: route || undefined,
    });
  });

  console.log(`Processed ${highways.length} memorial highways`);

  const dataset = {
    highways,
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalCount: highways.length,
      states: ['TX'],
    },
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

  const analysis = generateAnalysisData(highways, 'TX', 'Texas');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

  console.log(`Done! ${highways.length} highways written to ${outputPath}`);
}

main().catch(console.error);
