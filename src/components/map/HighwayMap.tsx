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

interface HighwayMapProps {
  highways: Highway[]
}

export default function HighwayMap({ highways }: HighwayMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [selectedHighway, setSelectedHighway] = useState<Highway | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Initialize map centered on US
    const map = L.map(mapContainerRef.current).setView([39.8283, -98.5795], 4)

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

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

      if (Array.isArray(coordinates[0])) {
        // Polyline (array of coordinates)
        const polyline = L.polyline(coordinates as [number, number][], {
          color: "#3b82f6",
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
    return `
      <div class="p-2">
        <h3 class="font-bold text-lg mb-2">${highway.name}</h3>
        <p class="mb-1"><strong>Honoree:</strong> ${highway.honoree.name}</p>
        ${highway.honoree.branch ? `<p class="mb-1"><strong>Branch:</strong> ${highway.honoree.branch}</p>` : ""}
        ${highway.honoree.rank ? `<p class="mb-1"><strong>Rank:</strong> ${highway.honoree.rank}</p>` : ""}
        <p class="mb-1"><strong>State:</strong> ${highway.state}</p>
        <p class="mb-1"><strong>Designated:</strong> ${highway.designation.year}</p>
      </div>
    `
  }

  return <div ref={mapContainerRef} className="w-full h-full" />
}
