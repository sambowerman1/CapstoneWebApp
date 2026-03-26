// Michigan county centroids for coordinate fallback
// All 83 Michigan counties with approximate center coordinates [lat, lng]

export const MICHIGAN_COUNTIES: Record<string, [number, number]> = {
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

// State center and default zoom
export const MICHIGAN_CENTER: [number, number] = [44.3148, -85.6024];
export const MICHIGAN_ZOOM = 6;

// Helper function to get county coordinates with fallback
export function getCountyCoordinates(countyName: string): [number, number] {
  // Normalize county name (remove " County" suffix if present)
  const normalized = countyName.replace(/\s+[Cc]ounty$/, "").trim();

  // Try direct match
  if (MICHIGAN_COUNTIES[normalized]) {
    return MICHIGAN_COUNTIES[normalized];
  }

  // Try case-insensitive match
  const lowerName = normalized.toLowerCase();
  for (const [county, coords] of Object.entries(MICHIGAN_COUNTIES)) {
    if (county.toLowerCase() === lowerName) {
      return coords;
    }
  }

  // Return state center as fallback
  return MICHIGAN_CENTER;
}

// Parse county name(s) from description text
export function parseCountyFromDescription(description: string): string[] {
  const counties: string[] = [];

  // Pattern: "in X County"
  const singleCountyMatch = description.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[Cc]ounty/gi);
  if (singleCountyMatch) {
    singleCountyMatch.forEach(match => {
      const countyName = match.replace(/^in\s+/i, "").replace(/\s+[Cc]ounty$/i, "").trim();
      if (MICHIGAN_COUNTIES[countyName]) {
        counties.push(countyName);
      }
    });
  }

  // Pattern: "X and Y counties"
  const multiCountyMatch = description.match(/in\s+([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\s+[Cc]ounties/i);
  if (multiCountyMatch) {
    const county1 = multiCountyMatch[1].trim();
    const county2 = multiCountyMatch[2].trim();
    if (MICHIGAN_COUNTIES[county1]) counties.push(county1);
    if (MICHIGAN_COUNTIES[county2]) counties.push(county2);
  }

  // Pattern: county name mentioned directly
  if (counties.length === 0) {
    for (const county of Object.keys(MICHIGAN_COUNTIES)) {
      if (description.includes(county)) {
        counties.push(county);
      }
    }
  }

  return counties;
}
