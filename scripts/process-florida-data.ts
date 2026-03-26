/**
 * Florida Memorial Highway Data Processor
 * 
 * Converts the CSV data from MapData/matched_data_with_odmp.csv
 * into the JSON format expected by the web application.
 * 
 * Run with: npx ts-node scripts/process-florida-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Florida County Centroids (copied from lib/county-centroids.ts for standalone execution)
const FLORIDA_COUNTIES: Record<string, [number, number]> = {
  'Alachua': [29.6783, -82.3248],
  'Baker': [30.3319, -82.2842],
  'Bay': [30.2593, -85.6602],
  'Bradford': [29.9502, -82.1776],
  'Brevard': [28.3922, -80.7214],
  'Broward': [26.1224, -80.3724],
  'Calhoun': [30.3969, -85.1942],
  'Charlotte': [26.8940, -81.9498],
  'Citrus': [28.8894, -82.4843],
  'Clay': [29.9875, -81.7840],
  'Collier': [26.1420, -81.3669],
  'Columbia': [30.1898, -82.6248],
  'DeSoto': [27.1645, -81.8348],
  'Dixie': [29.4211, -83.0598],
  'Duval': [30.3322, -81.6557],
  'Escambia': [30.6479, -87.3143],
  'Flagler': [29.4680, -81.3134],
  'Franklin': [29.8985, -84.8796],
  'Gadsden': [30.5757, -84.6174],
  'Gilchrist': [29.6950, -82.8240],
  'Glades': [26.9503, -81.1542],
  'Gulf': [29.9324, -85.2526],
  'Hamilton': [30.5211, -82.9598],
  'Hardee': [27.4891, -81.8095],
  'Hendry': [26.5531, -81.1709],
  'Hernando': [28.5519, -82.4554],
  'Highlands': [27.3164, -81.3479],
  'Hillsborough': [27.9904, -82.3018],
  'Holmes': [30.8533, -85.8549],
  'Indian River': [27.6648, -80.5589],
  'Jackson': [30.7766, -85.2327],
  'Jefferson': [30.5461, -83.8768],
  'Lafayette': [29.9324, -83.2298],
  'Lake': [28.8091, -81.6434],
  'Lee': [26.5629, -81.8495],
  'Leon': [30.5089, -84.2534],
  'Levy': [29.2941, -82.8240],
  'Liberty': [30.2391, -84.8818],
  'Madison': [30.4211, -83.5043],
  'Manatee': [27.4989, -82.3387],
  'Marion': [29.1945, -82.0348],
  'Martin': [27.1003, -80.3882],
  'Miami-Dade': [25.6137, -80.5656],
  'Monroe': [24.7743, -81.2340],
  'Nassau': [30.6099, -81.7840],
  'Okaloosa': [30.6324, -86.5943],
  'Okeechobee': [27.2439, -80.8295],
  'Orange': [28.5383, -81.3792],
  'Osceola': [28.1028, -81.0598],
  'Palm Beach': [26.7056, -80.6689],
  'Pasco': [28.2961, -82.4168],
  'Pinellas': [27.8736, -82.6775],
  'Polk': [27.9881, -81.7840],
  'Putnam': [29.6211, -81.7340],
  'Santa Rosa': [30.6699, -86.8443],
  'Sarasota': [27.2770, -82.4443],
  'Seminole': [28.7411, -81.2340],
  'St. Johns': [29.9002, -81.4340],
  'St. Lucie': [27.3467, -80.4054],
  'Sumter': [28.6891, -82.0598],
  'Suwannee': [30.1898, -82.9598],
  'Taylor': [30.0574, -83.6043],
  'Union': [30.0574, -82.3843],
  'Volusia': [29.0280, -81.1340],
  'Wakulla': [30.1324, -84.4043],
  'Walton': [30.6324, -86.1143],
  'Washington': [30.6324, -85.5943],
};

const FLORIDA_CENTER: [number, number] = [27.9944, -81.7603];

function normalizeCountyName(county: string): string {
  // Normalize various unicode dashes to regular hyphen
  return county.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-');
}

function getCountyCoords(county: string): [number, number] {
  const normalized = normalizeCountyName(county);
  const coords = FLORIDA_COUNTIES[normalized];
  if (!coords) {
    console.warn(`Unknown Florida county: "${county}". Using Florida center as fallback.`);
    return FLORIDA_CENTER;
  }
  return coords;
}

// Simple CSV parser that handles quoted fields with commas
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] || '';
    });
    
    results.push(row);
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function parseBooleanField(value: string): boolean {
  return value?.toLowerCase() === 'yes' || value?.toLowerCase() === 'true';
}

function parseEducation(value: string): string | undefined {
  if (!value || value === '[]') return undefined;
  // Remove brackets and clean up
  try {
    const parsed = JSON.parse(value.replace(/'/g, '"'));
    if (Array.isArray(parsed)) {
      return parsed.join(', ');
    }
  } catch {
    // If JSON parsing fails, just return cleaned string
    return value.replace(/[\[\]']/g, '').trim() || undefined;
  }
  return value;
}

function extractYear(dateStr: string): number {
  if (!dateStr) return 2014; // Default year
  
  // Handle format like "2014/07/01 05:00:00+00" or just "2014"
  const yearMatch = dateStr.match(/^(\d{4})/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }
  
  return 2014;
}

interface Highway {
  id: string;
  shapeId: string;
  name: string;
  state: string;
  county: string;
  honoree: {
    name: string;
    branch?: string;
    rank?: string;
    age?: number;
    tour?: number;
    causeOfDeath?: string;
    incidentDescription?: string;
    summary?: string;
    education?: string;
    placeOfBirth?: string;
    placeOfDeath?: string;
    gender?: string;
    involvedInSports?: boolean;
    involvedInPolitics?: boolean;
    involvedInMilitary?: boolean;
    involvedInMusic?: boolean;
  };
  location: {
    coordinates: [number, number];
    county: string;
    state: string;
  };
  designation: {
    year: number;
    legislation?: string;
  };
  description?: string;
  bill?: string;
}

function processRow(row: Record<string, string>, index: number): Highway | null {
  const rawCounty = row['COUNTY']?.trim();
  const designation = row['DESIGNATIO']?.trim();
  
  if (!rawCounty || !designation) {
    console.warn(`Skipping row ${index}: missing county or designation`);
    return null;
  }

  // Normalize county name
  const county = normalizeCountyName(rawCounty);

  // Get the honoree name - prefer name_sam, fallback to extracting from designation
  let honoreeName = row['name_sam']?.trim();
  if (!honoreeName || honoreeName === '') {
    // Try to extract name from designation (e.g., "Staff Sergeant Michael A. Bock Memorial Highway")
    honoreeName = designation.replace(/ Memorial (Highway|Boulevard|Bridge|Drive|Street|Way).*$/i, '').trim();
  }

  const coords = getCountyCoords(county);
  
  // Add small random offset to prevent markers from stacking exactly on top of each other
  const latOffset = (Math.random() - 0.5) * 0.1;
  const lngOffset = (Math.random() - 0.5) * 0.1;

  const highway: Highway = {
    id: `fl-${row['OBJECTID'] || index}`,
    shapeId: row['GlobalID'] || `FL_${index}`,
    name: designation,
    state: 'FL',
    county: county,
    honoree: {
      name: honoreeName,
      summary: row['summary']?.trim() || undefined,
      education: parseEducation(row['education']),
      gender: row['gender_sam']?.trim() || undefined,
      placeOfBirth: row['place_of_birth']?.trim() !== 'not found' ? row['place_of_birth']?.trim() : undefined,
      placeOfDeath: row['place_of_death']?.trim() !== 'not found' ? row['place_of_death']?.trim() : undefined,
      involvedInSports: parseBooleanField(row['involved_in_sports']),
      involvedInPolitics: parseBooleanField(row['involved_in_politics']),
      involvedInMilitary: parseBooleanField(row['involved_in_military']),
      involvedInMusic: parseBooleanField(row['involved_in_music']),
      // ODMP fields for law enforcement officers
      age: row['age'] ? parseInt(row['age'], 10) || undefined : undefined,
      tour: row['tour'] ? parseInt(row['tour'], 10) || undefined : undefined,
      causeOfDeath: row['cause']?.trim() || undefined,
      incidentDescription: row['incident_description']?.trim() || undefined,
    },
    location: {
      coordinates: [coords[0] + latOffset, coords[1] + lngOffset],
      county: county,
      state: 'FL',
    },
    designation: {
      year: extractYear(row['EFFECTIVE_']),
      legislation: row['BILL']?.trim() || undefined,
    },
    description: row['DESCRIPTIO']?.trim() || undefined,
    bill: row['BILL']?.trim() || undefined,
  };

  // Clean up undefined values
  Object.keys(highway.honoree).forEach(key => {
    if (highway.honoree[key as keyof typeof highway.honoree] === undefined) {
      delete highway.honoree[key as keyof typeof highway.honoree];
    }
  });

  return highway;
}

function generateAnalysisData(highways: Highway[]): object {
  const byCounty: Record<string, number> = {};
  const byDecade: Record<string, number> = {};
  const byGender: Record<string, number> = {};
  const byInvolvement: Record<string, number> = {
    'Military': 0,
    'Politics': 0,
    'Sports': 0,
    'Music': 0,
  };

  highways.forEach(hw => {
    // Count by county
    byCounty[hw.county] = (byCounty[hw.county] || 0) + 1;

    // Count by decade
    const decade = `${Math.floor(hw.designation.year / 10) * 10}s`;
    byDecade[decade] = (byDecade[decade] || 0) + 1;

    // Count by gender
    if (hw.honoree.gender) {
      const gender = hw.honoree.gender.charAt(0).toUpperCase() + hw.honoree.gender.slice(1);
      byGender[gender] = (byGender[gender] || 0) + 1;
    }

    // Count by involvement
    if (hw.honoree.involvedInMilitary) byInvolvement['Military']++;
    if (hw.honoree.involvedInPolitics) byInvolvement['Politics']++;
    if (hw.honoree.involvedInSports) byInvolvement['Sports']++;
    if (hw.honoree.involvedInMusic) byInvolvement['Music']++;
  });

  return {
    demographics: {
      byBranch: {}, // Not available in Florida data
      byState: { 'FL': highways.length },
      byDecade,
      byConflict: {}, // Not available in Florida data
      byCounty,
      byGender,
      byInvolvement,
    },
    findings: [
      {
        id: 'finding-inequality-matrix',
        title: 'Commemorative Inequality Matrix',
        description: 'Analysis of mean memorials per 100k voters across poverty levels and county political leaning based on the 2024 election. This matrix reveals patterns in how memorial highways are distributed across different demographic and political contexts in Florida.',
        visualizationType: 'chart',
        imageUrl: '/visualizations/inequality-matrix.png',
        data: null,
      },
      {
        id: 'finding-florida-counties',
        title: 'Florida County Distribution',
        description: `Memorial highways are distributed across ${Object.keys(byCounty).length} Florida counties, with varying concentrations reflecting local legislative activity and community priorities.`,
        visualizationType: 'map',
        data: byCounty,
      },
      {
        id: 'finding-gender-breakdown',
        title: 'Gender Representation in Memorials',
        description: `Analysis of gender representation among those honored with memorial highways in Florida shows ${byGender['Male'] || 0} male and ${byGender['Female'] || 0} female honorees.`,
        visualizationType: 'chart',
        data: byGender,
      },
      {
        id: 'finding-involvement',
        title: 'Honoree Background Categories',
        description: 'Many memorial highway honorees had involvement in military service, politics, sports, or music during their lifetime.',
        visualizationType: 'chart',
        data: byInvolvement,
      },
    ],
  };
}

async function main() {
  const csvPath = path.join(__dirname, '..', 'MapData', 'matched_data_with_odmp.csv');
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'highways.json');
  const analysisPath = path.join(__dirname, '..', 'public', 'data', 'analysis.json');

  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  console.log('Parsing CSV...');
  const rows = parseCSV(csvContent);
  console.log(`Found ${rows.length} rows`);

  console.log('Processing highways...');
  const highways: Highway[] = [];
  
  rows.forEach((row, index) => {
    const highway = processRow(row, index + 1);
    if (highway) {
      highways.push(highway);
    }
  });

  console.log(`Successfully processed ${highways.length} highways`);

  // Get unique counties for metadata
  const counties = [...new Set(highways.map(h => h.county))].sort();

  const dataset = {
    highways,
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalCount: highways.length,
      states: ['FL'],
      counties,
    },
  };

  console.log('Writing highways.json...');
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

  console.log('Generating analysis data...');
  const analysisData = generateAnalysisData(highways);

  console.log('Writing analysis.json...');
  fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));

  console.log('Done!');
  console.log(`- ${highways.length} highways written to ${outputPath}`);
  console.log(`- Analysis data written to ${analysisPath}`);
  console.log(`- Counties: ${counties.length}`);
}

main().catch(console.error);
