/**
 * Shared coordinate utilities for generating marker positions from county centroids.
 */

/**
 * Get coordinates for a highway based on county name, with random offset to prevent stacking.
 */
export function getCoordinatesForCounty(
  county: string,
  countyMap: Record<string, [number, number]>,
  stateCenter: [number, number],
): [number, number] {
  const coords = countyMap[county];
  if (coords) {
    const latOffset = (Math.random() - 0.5) * 0.08;
    const lngOffset = (Math.random() - 0.5) * 0.08;
    return [coords[0] + latOffset, coords[1] + lngOffset];
  }
  // Fallback to state center with larger random offset
  const latOffset = (Math.random() - 0.5) * 0.5;
  const lngOffset = (Math.random() - 0.5) * 0.5;
  return [stateCenter[0] + latOffset, stateCenter[1] + lngOffset];
}

/**
 * Average coordinates from multiple counties.
 */
export function averageCoordinates(
  counties: string[],
  countyMap: Record<string, [number, number]>,
  stateCenter: [number, number],
): [number, number] {
  const validCoords = counties
    .map(c => countyMap[c])
    .filter((c): c is [number, number] => !!c);

  if (validCoords.length === 0) {
    const latOffset = (Math.random() - 0.5) * 0.5;
    const lngOffset = (Math.random() - 0.5) * 0.5;
    return [stateCenter[0] + latOffset, stateCenter[1] + lngOffset];
  }

  const avgLat = validCoords.reduce((s, c) => s + c[0], 0) / validCoords.length;
  const avgLng = validCoords.reduce((s, c) => s + c[1], 0) / validCoords.length;
  const latOffset = (Math.random() - 0.5) * 0.08;
  const lngOffset = (Math.random() - 0.5) * 0.08;
  return [avgLat + latOffset, avgLng + lngOffset];
}
