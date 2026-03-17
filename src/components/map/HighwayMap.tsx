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

// State centers and zoom levels
const STATE_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  FL: { center: [27.9944, -81.7603], zoom: 7 },
  MI: { center: [44.3148, -85.6024], zoom: 6 },
  CA: { center: [36.78, -119.42], zoom: 6 },
  TX: { center: [31.97, -99.90], zoom: 6 },
  MT: { center: [47.0, -109.6], zoom: 6 },
  NE: { center: [41.5, -99.8], zoom: 7 },
  WI: { center: [44.5, -89.5], zoom: 7 },
  ALL: { center: [39.8283, -98.5795], zoom: 4 },
}

// State colors for polylines and badges
const STATE_COLORS: Record<string, string> = {
  FL: '#3b82f6', // blue
  MI: '#10b981', // green
  CA: '#f59e0b', // amber
  TX: '#ef4444', // red
  MT: '#8b5cf6', // purple
  NE: '#ec4899', // pink
  WI: '#14b8a6', // teal
}

const STATE_NAMES: Record<string, string> = {
  FL: 'Florida',
  MI: 'Michigan',
  CA: 'California',
  TX: 'Texas',
  MT: 'Montana',
  NE: 'Nebraska',
  WI: 'Wisconsin',
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
