/**
 * Michigan Memorial Highway Data Processor
 *
 * Converts the CSV data from Michigan/michigan_memorial_highways.csv
 * into the JSON format expected by the web application.
 *
 * Run with: npx tsx scripts/process-michigan-data.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Michigan County Centroids (all 83 counties)
const MICHIGAN_COUNTIES: Record<string, [number, number]> = {
  "Alcona": [44.7108, -83.4234],
  "Alger": [46.4510, -86.5417],
  "Allegan": [42.5914, -85.8819],
  "Alpena": [45.0616, -83.4631],
  "Antrim": [45.0166, -85.1447],
  "Arenac": [44.0430, -83.7452],
  "Baraga": [46.7755, -88.1566],
  "Barry": [42.5936, -85.3097],
  "Bay": [43.7102, -83.9303],
  "Benzie": [44.6355, -86.1019],
  "Berrien": [41.9191, -86.4280],
  "Branch": [41.9169, -85.0592],
  "Calhoun": [42.2456, -85.0055],
  "Cass": [41.9148, -85.9886],
  "Charlevoix": [45.2599, -85.2301],
  "Cheboygan": [45.4730, -84.4927],
  "Chippewa": [46.3281, -84.5360],
  "Clare": [43.9877, -84.8469],
  "Clinton": [42.9439, -84.6016],
  "Crawford": [44.6838, -84.6105],
  "Delta": [45.7912, -86.8688],
  "Dickinson": [46.0204, -87.8700],
  "Eaton": [42.5961, -84.8383],
  "Emmet": [45.5842, -84.9806],
  "Genesee": [43.0218, -83.7068],
  "Gladwin": [43.9877, -84.3885],
  "Gogebic": [46.4955, -89.7936],
  "Grand Traverse": [44.7631, -85.5492],
  "Gratiot": [43.2940, -84.6047],
  "Hillsdale": [41.8879, -84.5955],
  "Houghton": [47.0167, -88.5644],
  "Huron": [43.9275, -82.8553],
  "Ingham": [42.5971, -84.3736],
  "Ionia": [42.9450, -85.0750],
  "Iosco": [44.3088, -83.5611],
  "Iron": [46.2088, -88.5328],
  "Isabella": [43.6417, -84.8469],
  "Jackson": [42.2470, -84.4034],
  "Kalamazoo": [42.2456, -85.5311],
  "Kalkaska": [44.7339, -85.1750],
  "Kent": [43.0320, -85.5491],
  "Keweenaw": [47.3750, -88.1250],
  "Lake": [44.0068, -85.8094],
  "Lapeer": [43.0836, -83.2156],
  "Leelanau": [45.0083, -85.8869],
  "Lenawee": [41.8984, -84.0678],
  "Livingston": [42.6028, -83.9120],
  "Luce": [46.4739, -85.5250],
  "Mackinac": [46.0006, -85.0750],
  "Macomb": [42.6694, -82.9103],
  "Manistee": [44.2361, -86.1575],
  "Marquette": [46.5472, -87.5006],
  "Mason": [43.9565, -86.2867],
  "Mecosta": [43.6417, -85.3097],
  "Menominee": [45.5006, -87.5756],
  "Midland": [43.6417, -84.3885],
  "Missaukee": [44.3088, -85.0905],
  "Monroe": [41.9191, -83.5150],
  "Montcalm": [43.2940, -85.1622],
  "Montmorency": [45.0166, -84.1428],
  "Muskegon": [43.2940, -86.1756],
  "Newaygo": [43.5564, -85.8094],
  "Oakland": [42.6611, -83.3856],
  "Oceana": [43.6417, -86.3267],
  "Ogemaw": [44.3088, -84.1428],
  "Ontonagon": [46.8006, -89.3075],
  "Osceola": [43.9877, -85.3097],
  "Oscoda": [44.6838, -84.1428],
  "Otsego": [45.0166, -84.6105],
  "Ottawa": [42.9450, -85.9886],
  "Presque Isle": [45.3950, -84.0750],
  "Roscommon": [44.3088, -84.6105],
  "Saginaw": [43.3339, -84.0469],
  "St. Clair": [42.9212, -82.6628],
  "St. Joseph": [41.9169, -85.5283],
  "Sanilac": [43.4422, -82.6292],
  "Schoolcraft": [46.1006, -86.1172],
  "Shiawassee": [42.9511, -84.1469],
  "Tuscola": [43.4922, -83.4436],
  "Van Buren": [42.2456, -86.3006],
  "Washtenaw": [42.2553, -83.8386],
  "Wayne": [42.2831, -83.2547],
  "Wexford": [44.3088, -85.5803],
};

const MICHIGAN_CENTER: [number, number] = [44.3148, -85.6024];

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

// Parse county names from the Description field
function parseCountiesFromDescription(description: string): string[] {
  const counties: string[] = [];

  // Pattern: "in X County"
  const singleMatches = description.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[Cc]ounty/gi);
  if (singleMatches) {
    singleMatches.forEach(match => {
      const countyName = match.replace(/^in\s+/i, '').replace(/\s+[Cc]ounty$/i, '').trim();
      if (MICHIGAN_COUNTIES[countyName] && !counties.includes(countyName)) {
        counties.push(countyName);
      }
    });
  }

  // Pattern: "X and Y counties"
  const multiMatch = description.match(/in\s+([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\s+[Cc]ounties/i);
  if (multiMatch) {
    const county1 = multiMatch[1].trim();
    const county2 = multiMatch[2].trim();
    if (MICHIGAN_COUNTIES[county1] && !counties.includes(county1)) counties.push(county1);
    if (MICHIGAN_COUNTIES[county2] && !counties.includes(county2)) counties.push(county2);
  }

  // Pattern: "X, Y, and Z counties" or "X, Y and Z Counties"
  const listMatch = description.match(/in\s+([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*(?:,?\s+and\s+[A-Z][a-z]+))\s+[Cc]ounties/i);
  if (listMatch) {
    const countyStr = listMatch[1];
    const countyNames = countyStr.split(/,\s*|\s+and\s+/i).map(c => c.trim());
    countyNames.forEach(countyName => {
      if (MICHIGAN_COUNTIES[countyName] && !counties.includes(countyName)) {
        counties.push(countyName);
      }
    });
  }

  // If no counties found yet, search for county names directly in description
  if (counties.length === 0) {
    // Try to find individual county names
    for (const county of Object.keys(MICHIGAN_COUNTIES)) {
      // Check for exact match with word boundaries
      const regex = new RegExp(`\\b${county}\\b`, 'i');
      if (regex.test(description) && !counties.includes(county)) {
        counties.push(county);
      }
    }
  }

  return counties;
}

// Get coordinates for a highway based on counties mentioned
function getHighwayCoordinates(counties: string[]): [number, number] {
  if (counties.length === 0) {
    return MICHIGAN_CENTER;
  }

  if (counties.length === 1) {
    const coords = MICHIGAN_COUNTIES[counties[0]];
    if (coords) {
      // Add small random offset to prevent markers stacking
      const latOffset = (Math.random() - 0.5) * 0.08;
      const lngOffset = (Math.random() - 0.5) * 0.08;
      return [coords[0] + latOffset, coords[1] + lngOffset];
    }
  }

  // For multi-county highways, average the coordinates
  let totalLat = 0;
  let totalLng = 0;
  let count = 0;

  counties.forEach(county => {
    const coords = MICHIGAN_COUNTIES[county];
    if (coords) {
      totalLat += coords[0];
      totalLng += coords[1];
      count++;
    }
  });

  if (count > 0) {
    return [totalLat / count, totalLng / count];
  }

  return MICHIGAN_CENTER;
}

// Extract honoree name from highway name
function extractHonoreeName(highwayName: string): string {
  // Remove common suffixes
  let name = highwayName
    .replace(/\s+(Memorial\s+)?(Highway|Bridge|Freeway|Parkway|Drive|Boulevard|Road|Way|Trail|Overpass|Interchange|Bypass|Causeway)$/i, '')
    .replace(/\s+Memorial$/i, '')
    .trim();

  // Remove military/rank prefixes
  const rankPrefixes = [
    'SPC ', 'PFC ', 'Sgt ', 'Sgt. ', 'Sergeant ', 'Staff Sergeant ',
    'Corporal ', 'Cpl ', 'Cpl. ', 'Marine Lance Corporal ', 'Lance Corporal ',
    'Specialist ', 'Specialist 5 ', 'Trooper ', 'Officer ', 'Sheriff ',
    'Chief ', 'Deputy ', 'Firefighter ', 'Captain ', 'Lieutenant ',
    'Lt. ', 'Col. ', 'Colonel ', 'Major ', 'Private ', 'Pvt ',
    'Corpsman ', 'Auxiliary Lieutenant ', 'Detective ', 'Dr. ',
    'Marine ', 'Army ', 'Navy ', 'Air Force ', 'Airman ',
    'Technical Sergeant ', 'Master Sergeant ', 'First Sergeant ',
    'Command Sergeant Major ', 'Sergeant Major ', 'Chief Warrant Officer ',
    'Warrant Officer ', 'Petty Officer ', 'Chief Petty Officer ',
    'Senior Airman ', 'Staff Sgt. ', 'Tech Sgt. ', 'Master Sgt. ',
    'Chief Special Warfare Operator ', 'SEAL ', 'Lansing Firefighter '
  ];

  for (const prefix of rankPrefixes) {
    if (name.startsWith(prefix)) {
      name = name.substring(prefix.length);
      break;
    }
  }

  // Handle special cases where the name has extra descriptors
  name = name.replace(/,\s*WWII.*$/i, '');
  name = name.replace(/\s+Jr\.?$/i, ' Jr.');
  name = name.replace(/\s+USAF$/i, '');

  return name.trim();
}

// Determine if highway is for a military person based on name and biography
function isMilitary(name: string, biography: string): boolean {
  const militaryTerms = [
    'army', 'navy', 'marine', 'air force', 'military', 'soldier', 'veteran',
    'sergeant', 'corporal', 'private', 'captain', 'lieutenant', 'colonel',
    'general', 'enlisted', 'deployed', 'regiment', 'battalion', 'division',
    'infantry', 'cavalry', 'seal', 'special forces', 'airborne', 'paratrooper',
    'war', 'combat', 'medal of honor', 'purple heart', 'bronze star',
    'killed in action', 'kia', 'afghanistan', 'iraq', 'vietnam', 'wwii', 'ww2'
  ];

  const lowerName = name.toLowerCase();
  const lowerBio = biography.toLowerCase();

  return militaryTerms.some(term =>
    lowerName.includes(term) || lowerBio.includes(term)
  );
}

// Determine if highway is for law enforcement
function isLawEnforcement(name: string, biography: string): boolean {
  const lawTerms = [
    'police', 'sheriff', 'deputy', 'trooper', 'officer', 'state police',
    'corrections officer', 'prison', 'law enforcement', 'patrol'
  ];

  const lowerName = name.toLowerCase();
  const lowerBio = biography.toLowerCase();

  return lawTerms.some(term =>
    lowerName.includes(term) || lowerBio.includes(term)
  );
}

// Determine if highway is for a firefighter
function isFirefighter(name: string, biography: string): boolean {
  const fireTerms = ['firefighter', 'fire chief', 'fire department', 'fire rescue'];

  const lowerName = name.toLowerCase();
  const lowerBio = biography.toLowerCase();

  return fireTerms.some(term =>
    lowerName.includes(term) || lowerBio.includes(term)
  );
}

// Determine if highway is for a politician
function isPolitician(biography: string): boolean {
  const politicalTerms = [
    'governor', 'senator', 'representative', 'congressman', 'congresswoman',
    'legislator', 'state house', 'state senate', 'politician', 'elected',
    'campaign', 'legislative', 'speaker', 'township supervisor', 'commissioner',
    'secretary of state', 'mayor', 'council', 'president'
  ];

  const lowerBio = biography.toLowerCase();

  return politicalTerms.some(term => lowerBio.includes(term));
}

interface Highway {
  id: string;
  shapeId: string;
  name: string;
  state: string;
  county: string;
  honoree: {
    name: string;
    summary?: string;
    involvedInMilitary?: boolean;
    involvedInPolitics?: boolean;
    involvedInLawEnforcement?: boolean;
    involvedInFireService?: boolean;
  };
  location: {
    coordinates: [number, number];
    county: string;
    state: string;
  };
  designation: {
    year?: number;
    legislation?: string;
  };
  description?: string;
  highway?: string; // The route number (M-66, US-131, etc.)
  lawWebLink?: string;
}

function processRow(row: Record<string, string>, index: number): Highway | null {
  const highwayName = row['MemorialHighwayName']?.trim();
  const description = row['Description']?.trim();

  if (!highwayName) {
    console.warn(`Skipping row ${index}: missing highway name`);
    return null;
  }

  // Parse counties from description
  const counties = parseCountiesFromDescription(description || '');
  const countyStr = counties.length > 0
    ? (counties.length > 1 ? `${counties.join(', ')} (Multi-County)` : counties[0])
    : 'Unknown';

  const coords = getHighwayCoordinates(counties);
  const honoreeName = extractHonoreeName(highwayName);
  const biography = row['Biographies']?.trim() || '';

  const highway: Highway = {
    id: `mi-${row['OBJECTID'] || index}`,
    shapeId: row['GlobalID']?.replace(/[{}]/g, '') || `MI_${index}`,
    name: highwayName,
    state: 'MI',
    county: countyStr,
    honoree: {
      name: honoreeName,
      summary: biography || undefined,
      involvedInMilitary: isMilitary(highwayName, biography),
      involvedInPolitics: isPolitician(biography),
      involvedInLawEnforcement: isLawEnforcement(highwayName, biography),
      involvedInFireService: isFirefighter(highwayName, biography),
    },
    location: {
      coordinates: coords,
      county: countyStr,
      state: 'MI',
    },
    designation: {
      legislation: row['Law']?.trim() || undefined,
    },
    description: description || undefined,
    highway: row['Highway']?.trim() || undefined,
    lawWebLink: row['LawWebLink']?.trim() || undefined,
  };

  // Clean up undefined values in honoree
  Object.keys(highway.honoree).forEach(key => {
    const value = highway.honoree[key as keyof typeof highway.honoree];
    if (value === undefined || value === false) {
      delete highway.honoree[key as keyof typeof highway.honoree];
    }
  });

  return highway;
}

function generateAnalysisData(highways: Highway[]): object {
  const byCounty: Record<string, number> = {};
  const byInvolvement: Record<string, number> = {
    'Military': 0,
    'Politics': 0,
    'Law Enforcement': 0,
    'Fire Service': 0,
  };
  const byHighwayType: Record<string, number> = {};

  highways.forEach(hw => {
    // Count by county
    const county = hw.county.replace(' (Multi-County)', '');
    if (county.includes(',')) {
      // Multi-county - count for each
      county.split(',').forEach(c => {
        const trimmed = c.trim();
        byCounty[trimmed] = (byCounty[trimmed] || 0) + 1;
      });
    } else {
      byCounty[county] = (byCounty[county] || 0) + 1;
    }

    // Count by involvement
    if (hw.honoree.involvedInMilitary) byInvolvement['Military']++;
    if (hw.honoree.involvedInPolitics) byInvolvement['Politics']++;
    if (hw.honoree.involvedInLawEnforcement) byInvolvement['Law Enforcement']++;
    if (hw.honoree.involvedInFireService) byInvolvement['Fire Service']++;

    // Count by highway type - only count valid route prefixes
    if (hw.highway) {
      const hwType = hw.highway.split(',')[0].trim().split('-')[0].trim();
      // Only count valid Michigan route types
      const validTypes = ['M', 'US', 'I', 'BR', 'BL'];
      if (validTypes.includes(hwType)) {
        byHighwayType[hwType] = (byHighwayType[hwType] || 0) + 1;
      }
    }
  });

  return {
    demographics: {
      byBranch: {},
      byState: { 'MI': highways.length },
      byDecade: {},
      byConflict: {},
      byCounty,
      byInvolvement,
      byHighwayType,
    },
    findings: [
      {
        id: 'finding-michigan-counties',
        title: 'Michigan County Distribution',
        description: `Memorial highways are distributed across ${Object.keys(byCounty).length} Michigan counties.`,
        visualizationType: 'map',
        data: byCounty,
      },
      {
        id: 'finding-michigan-involvement',
        title: 'Honoree Background Categories',
        description: 'Michigan memorial highway honorees by category of involvement.',
        visualizationType: 'chart',
        data: byInvolvement,
      },
      {
        id: 'finding-michigan-highway-types',
        title: 'Highway Types',
        description: 'Distribution of memorial highways by route type (Interstate, US, State).',
        visualizationType: 'chart',
        data: byHighwayType,
      },
    ],
  };
}

async function main() {
  const csvPath = path.join(__dirname, '..', 'Michigan', 'michigan_memorial_highways.csv');
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'states', 'MI', 'highways.json');
  const analysisPath = path.join(__dirname, '..', 'public', 'data', 'states', 'MI', 'analysis.json');

  console.log('Reading CSV file...');

  // Read file with BOM handling
  let csvContent = fs.readFileSync(csvPath, 'utf-8');
  // Remove BOM if present
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.substring(1);
  }

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
  const allCounties = new Set<string>();
  highways.forEach(h => {
    const county = h.county.replace(' (Multi-County)', '');
    if (county.includes(',')) {
      county.split(',').forEach(c => allCounties.add(c.trim()));
    } else if (county !== 'Unknown') {
      allCounties.add(county);
    }
  });

  const dataset = {
    highways,
    metadata: {
      lastUpdated: new Date().toISOString(),
      totalCount: highways.length,
      states: ['MI'],
      counties: Array.from(allCounties).sort(),
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
  console.log(`- Counties found: ${allCounties.size}`);
}

main().catch(console.error);
