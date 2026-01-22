/**
 * Florida County Centroids
 *
 * Lookup table mapping all 67 Florida counties to their geographic center coordinates [latitude, longitude].
 * Used to place highway markers on the map when exact coordinates are not available.
 */

export const FLORIDA_COUNTIES: Record<string, [number, number]> = {
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

/**
 * Florida geographic center (fallback coordinates)
 */
const FLORIDA_CENTER: [number, number] = [27.9944, -81.7603];

/**
 * Get coordinates for a Florida county
 * @param county - County name
 * @returns [latitude, longitude] coordinates or Florida center if county not found
 */
export function getCountyCoords(county: string): [number, number] {
  const coords = FLORIDA_COUNTIES[county];
  if (!coords) {
    console.warn(`Unknown Florida county: "${county}". Using Florida center as fallback.`);
    return FLORIDA_CENTER;
  }
  return coords;
}

/**
 * Get list of all Florida county names
 */
export function getAllCounties(): string[] {
  return Object.keys(FLORIDA_COUNTIES).sort();
}
