"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Highway } from "@/types/highway"

// Fix for default marker icons in webpack
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
})

// State centers and zoom levels (all 50 states + DC)
const STATE_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  AL: { center: [32.7794, -86.8287], zoom: 7 },
  AK: { center: [64.0685, -152.2782], zoom: 4 },
  AZ: { center: [34.2744, -111.6602], zoom: 6 },
  AR: { center: [34.8938, -92.4426], zoom: 7 },
  CA: { center: [36.78, -119.42], zoom: 6 },
  CO: { center: [38.9972, -105.5478], zoom: 7 },
  CT: { center: [41.6219, -72.7273], zoom: 8 },
  DE: { center: [38.9896, -75.505], zoom: 8 },
  FL: { center: [27.9944, -81.7603], zoom: 7 },
  GA: { center: [32.6415, -83.4426], zoom: 7 },
  HI: { center: [20.2927, -156.3737], zoom: 7 },
  ID: { center: [44.3509, -114.6130], zoom: 6 },
  IL: { center: [40.0417, -89.1965], zoom: 6 },
  IN: { center: [39.8942, -86.2816], zoom: 7 },
  IA: { center: [42.0751, -93.4960], zoom: 7 },
  KS: { center: [38.4937, -98.3804], zoom: 7 },
  KY: { center: [37.5347, -85.3021], zoom: 7 },
  LA: { center: [31.0689, -91.9968], zoom: 7 },
  ME: { center: [45.3695, -69.2428], zoom: 7 },
  MD: { center: [39.0550, -76.7909], zoom: 7 },
  MA: { center: [42.2596, -71.8083], zoom: 8 },
  MI: { center: [44.3148, -85.6024], zoom: 6 },
  MN: { center: [46.2807, -94.3053], zoom: 6 },
  MS: { center: [32.7364, -89.6678], zoom: 7 },
  MO: { center: [38.3566, -92.4580], zoom: 7 },
  MT: { center: [47.0, -109.6], zoom: 6 },
  NE: { center: [41.5, -99.8], zoom: 7 },
  NV: { center: [39.3289, -116.6312], zoom: 6 },
  NH: { center: [43.6805, -71.5832], zoom: 7 },
  NJ: { center: [40.1907, -74.6728], zoom: 7 },
  NM: { center: [34.4071, -106.1126], zoom: 7 },
  NY: { center: [42.9538, -75.5268], zoom: 7 },
  NC: { center: [35.5557, -79.3877], zoom: 7 },
  ND: { center: [47.4501, -100.4659], zoom: 7 },
  OH: { center: [40.2862, -82.7937], zoom: 7 },
  OK: { center: [35.5889, -97.4943], zoom: 7 },
  OR: { center: [43.9336, -120.5583], zoom: 6 },
  PA: { center: [40.8781, -77.7996], zoom: 7 },
  RI: { center: [41.6762, -71.5562], zoom: 9 },
  SC: { center: [33.9169, -80.8964], zoom: 7 },
  SD: { center: [44.4443, -100.2263], zoom: 7 },
  TN: { center: [35.8580, -86.3505], zoom: 7 },
  TX: { center: [31.97, -99.90], zoom: 6 },
  UT: { center: [39.3055, -111.6703], zoom: 6 },
  VT: { center: [44.0687, -72.6658], zoom: 7 },
  VA: { center: [37.5215, -78.8537], zoom: 7 },
  WA: { center: [47.3826, -120.4472], zoom: 6 },
  WV: { center: [38.6409, -80.6227], zoom: 7 },
  WI: { center: [44.5, -89.5], zoom: 7 },
  WY: { center: [42.9957, -107.5512], zoom: 7 },
  DC: { center: [38.9072, -77.0369], zoom: 11 },
  ALL: { center: [39.8283, -98.5795], zoom: 4 },
}

// State colors for polylines and badges — legacy 7 preserved, others assigned from a palette
const STATE_COLORS: Record<string, string> = {
  FL: '#3b82f6', MI: '#10b981', CA: '#f59e0b', TX: '#ef4444',
  MT: '#8b5cf6', NE: '#ec4899', WI: '#14b8a6',
  AL: '#dc2626', AK: '#0891b2', AZ: '#ca8a04', AR: '#65a30d',
  CO: '#7c3aed', CT: '#0ea5e9', DE: '#e11d48', GA: '#059669',
  HI: '#0d9488', ID: '#9333ea', IL: '#2563eb', IN: '#d97706',
  IA: '#16a34a', KS: '#db2777', KY: '#6366f1', LA: '#ea580c',
  ME: '#0f766e', MD: '#be185d', MA: '#7c2d12', MN: '#1d4ed8',
  MS: '#a21caf', MO: '#15803d', NV: '#b45309', NH: '#0369a1',
  NJ: '#c026d3', NM: '#b91c1c', NY: '#1e40af', NC: '#047857',
  ND: '#9f1239', OH: '#a16207', OK: '#6d28d9', OR: '#0e7490',
  PA: '#991b1b', RI: '#075985', SC: '#86198f', SD: '#84cc16',
  TN: '#f97316', UT: '#c2410c', VT: '#166534', VA: '#1e3a8a',
  WA: '#0891b2', WV: '#7e22ce', WY: '#d97706', DC: '#475569',
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
}

interface HighwayMapProps {
  highways: Highway[]
  selectedState?: string
}

export default function HighwayMap({ highways, selectedState }: HighwayMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [selectedHighway, setSelectedHighway] = useState<Highway | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Get initial center based on selected state
    const stateConfig = STATE_CENTERS[selectedState || 'ALL'] || STATE_CENTERS.ALL

    // Initialize map
    const map = L.map(mapContainerRef.current).setView(stateConfig.center, stateConfig.zoom)

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle map centering when selectedState changes
  useEffect(() => {
    if (!mapRef.current) return

    const stateConfig = STATE_CENTERS[selectedState || 'ALL'] || STATE_CENTERS.ALL
    mapRef.current.setView(stateConfig.center, stateConfig.zoom, { animate: true })
  }, [selectedState])

  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current

    // Clear existing layers (except base layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer)
      }
    })

    // Add highway markers/polylines
    highways.forEach((highway) => {
      const { coordinates } = highway.location
      const stateColor = STATE_COLORS[highway.state] || '#6b7280'

      if (Array.isArray(coordinates[0])) {
        // Polyline (array of coordinates)
        const polyline = L.polyline(coordinates as [number, number][], {
          color: stateColor,
          weight: 3,
          opacity: 0.7,
        }).addTo(map)

        polyline.bindPopup(createPopupContent(highway))
        polyline.on("click", () => setSelectedHighway(highway))
      } else {
        // Single point marker
        const marker = L.marker(coordinates as [number, number]).addTo(map)
        marker.bindPopup(createPopupContent(highway))
        marker.on("click", () => setSelectedHighway(highway))
      }
    })
  }, [highways])

  function createPopupContent(highway: Highway): string {
    const badges: string[] = [];

    if (highway.honoree.involvedInMilitary) badges.push('<span style="background:#3b82f6;color:white;padding:2px 6px;border-radius:4px;font-size:11px;margin-right:4px;">Military</span>');
    if (highway.honoree.involvedInPolitics) badges.push('<span style="background:#8b5cf6;color:white;padding:2px 6px;border-radius:4px;font-size:11px;margin-right:4px;">Politics</span>');
    if (highway.honoree.involvedInSports) badges.push('<span style="background:#10b981;color:white;padding:2px 6px;border-radius:4px;font-size:11px;margin-right:4px;">Sports</span>');
    if (highway.honoree.involvedInMusic) badges.push('<span style="background:#f59e0b;color:white;padding:2px 6px;border-radius:4px;font-size:11px;margin-right:4px;">Music</span>');
    // @ts-ignore
    if (highway.honoree.involvedInLawEnforcement) badges.push('<span style="background:#dc2626;color:white;padding:2px 6px;border-radius:4px;font-size:11px;margin-right:4px;">Law Enforcement</span>');
    // @ts-ignore
    if (highway.honoree.involvedInFireService) badges.push('<span style="background:#ea580c;color:white;padding:2px 6px;border-radius:4px;font-size:11px;margin-right:4px;">Fire Service</span>');

    // Truncate summary if too long
    let summary = highway.honoree.summary || '';
    if (summary.length > 200) {
      summary = summary.substring(0, 200) + '...';
    }

    // Dynamic state badge
    const stateColor = STATE_COLORS[highway.state] || '#6b7280';
    const stateName = STATE_NAMES[highway.state] || highway.state;
    const stateBadge = `<span style="background:${stateColor};color:white;padding:2px 6px;border-radius:4px;font-size:11px;margin-right:4px;">${stateName}</span>`;

    return `
      <div style="max-width:320px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="margin-bottom:8px;">${stateBadge}</div>
        <h3 style="font-weight:bold;font-size:14px;margin-bottom:8px;color:#1f2937;">${highway.name}</h3>
        <p style="margin-bottom:4px;font-size:13px;"><strong>Honoree:</strong> ${highway.honoree.name}</p>
        <p style="margin-bottom:4px;font-size:13px;"><strong>County:</strong> ${highway.county || highway.location.county}</p>
        ${highway.designation.year ? `<p style="margin-bottom:4px;font-size:13px;"><strong>Designated:</strong> ${highway.designation.year}</p>` : ""}
        ${highway.designation.legislation ? `<p style="margin-bottom:4px;font-size:13px;"><strong>Legislation:</strong> ${highway.designation.legislation}</p>` : ""}
        ${highway.honoree.gender ? `<p style="margin-bottom:4px;font-size:13px;"><strong>Gender:</strong> ${highway.honoree.gender}</p>` : ""}
        ${highway.honoree.placeOfBirth ? `<p style="margin-bottom:4px;font-size:13px;"><strong>Birthplace:</strong> ${highway.honoree.placeOfBirth}</p>` : ""}
        ${highway.honoree.education ? `<p style="margin-bottom:4px;font-size:13px;"><strong>Education:</strong> ${highway.honoree.education}</p>` : ""}
        ${highway.honoree.causeOfDeath ? `<p style="margin-bottom:4px;font-size:13px;"><strong>Cause of Death:</strong> ${highway.honoree.causeOfDeath}</p>` : ""}
        ${badges.length > 0 ? `<div style="margin-top:8px;margin-bottom:8px;">${badges.join('')}</div>` : ""}
        ${summary ? `<p style="font-size:12px;color:#4b5563;margin-top:8px;line-height:1.4;">${summary}</p>` : ""}
      </div>
    `
  }

  return <div ref={mapContainerRef} className="w-full h-full" />
}
