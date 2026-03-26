/**
 * ArcGIS Geometry Fetcher
 *
 * Fetches polyline geometry from ArcGIS FeatureServer endpoints
 * and merges them into existing highways.json files.
 *
 * Run with: npx tsx scripts/fetch-geometry.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ArcGISFeature {
  attributes: Record<string, any>;
  geometry?: {
    paths: number[][][]; // [[[lng, lat], [lng, lat], ...], ...]
  };
}

interface ArcGISResponse {
  features: ArcGISFeature[];
  exceededTransferLimit?: boolean;
}

const STATES = [
  {
    code: 'FL',
    name: 'Florida',
    url: 'https://services1.arcgis.com/O1JpcwDW8sjYuddV/arcgis/rest/services/Roadway_Designations/FeatureServer/0',
    matchField: 'GlobalID',  // ArcGIS field name
    idExtractor: (hw: any) => hw.shapeId, // Our JSON field → ArcGIS match value
  },
  {
    code: 'TX',
    name: 'Texas',
    url: 'https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Memorial_Highways/FeatureServer/0',
    matchField: 'OBJECTID',
    idExtractor: (hw: any) => {
      // shapeId is "TX_1", "TX_2" etc → extract number
      const match = hw.shapeId.match(/TX_(\d+)/);
      return match ? parseInt(match[1]) : null;
    },
  },
];

async function fetchAllFeatures(
  baseUrl: string,
  outField: string,
  batchSize = 1000,
): Promise<Map<string, number[][][]>> {
  const geometryMap = new Map<string, number[][][]>();
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const queryUrl = `${baseUrl}/query?where=1%3D1&outFields=${outField}&returnGeometry=true&resultRecordCount=${batchSize}&resultOffset=${offset}&f=json&outSR=4326`;

    console.log(`  Fetching batch at offset ${offset}...`);
    const response = await fetch(queryUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ArcGISResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      hasMore = false;
      break;
    }

    for (const feature of data.features) {
      if (feature.geometry?.paths) {
        const key = String(feature.attributes[outField]);
        geometryMap.set(key, feature.geometry.paths);
      }
    }

    console.log(`  Got ${data.features.length} features (total: ${geometryMap.size})`);

    if (data.exceededTransferLimit) {
      offset += batchSize;
    } else {
      hasMore = false;
    }
  }

  return geometryMap;
}

/**
 * Convert ArcGIS paths [lng, lat] to Leaflet [lat, lng] format.
 * Concatenates multiple paths into a single coordinate array.
 */
function convertPaths(paths: number[][][]): [number, number][] {
  const coords: [number, number][] = [];
  for (const pathSegment of paths) {
    for (const [lng, lat] of pathSegment) {
      coords.push([lat, lng]);
    }
  }
  return coords;
}

async function processState(stateConfig: typeof STATES[number]) {
  const { code, name, url, matchField, idExtractor } = stateConfig;
  const jsonPath = path.join(__dirname, '..', 'public', 'data', 'states', code, 'highways.json');

  console.log(`\n=== Processing ${name} (${code}) ===`);

  // Read existing highways
  const dataset = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Loaded ${dataset.highways.length} highways from JSON`);

  // Fetch geometries from ArcGIS
  console.log(`Fetching geometry from ArcGIS FeatureServer...`);
  const geometryMap = await fetchAllFeatures(url, matchField);
  console.log(`Fetched ${geometryMap.size} geometries`);

  // Match and merge
  let matched = 0;
  let unmatched = 0;

  for (const highway of dataset.highways) {
    const matchKey = idExtractor(highway);
    if (matchKey === null || matchKey === undefined) {
      unmatched++;
      continue;
    }

    const paths = geometryMap.get(String(matchKey));
    if (paths) {
      const polylineCoords = convertPaths(paths);
      if (polylineCoords.length >= 2) {
        highway.location.coordinates = polylineCoords;
        matched++;
      } else {
        unmatched++;
      }
    } else {
      unmatched++;
    }
  }

  console.log(`Matched: ${matched}, Unmatched (kept as points): ${unmatched}`);

  // Write back
  fs.writeFileSync(jsonPath, JSON.stringify(dataset, null, 2));
  console.log(`Written updated data to ${jsonPath}`);
}

async function main() {
  console.log('ArcGIS Geometry Fetcher');
  console.log('======================');

  for (const stateConfig of STATES) {
    try {
      await processState(stateConfig);
    } catch (error) {
      console.error(`Error processing ${stateConfig.name}:`, error);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
