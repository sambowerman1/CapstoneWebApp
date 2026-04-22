"use client"

import { useEffect, useState } from "react"
import MapContainer from "@/components/map/MapContainer"
import MapControls from "@/components/map/MapControls"
import { loadHighwayData } from "@/lib/data-loader"
import type { Highway, HighwayDataset } from "@/types/highway"

export default function MapPage() {
  const [data, setData] = useState<HighwayDataset | null>(null)
  const [filteredHighways, setFilteredHighways] = useState<Highway[]>([])
  const [selectedState, setSelectedState] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHighwayData()
      .then((result) => {
        setData(result)
        setFilteredHighways(result.highways)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Failed to load data:", error)
        setLoading(false)
      })
  }, [])

  const handleFilterChange = (filters: {
    state?: string
    search?: string
  }) => {
    if (!data) return

    let filtered = data.highways

    if (filters.state) {
      filtered = filtered.filter((h) => h.state === filters.state)
    }

    if (filters.search) {
      const query = filters.search.toLowerCase()
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(query) ||
          h.honoree.name.toLowerCase().includes(query)
      )
    }

    setFilteredHighways(filtered)
  }

  const handleStateSelect = (state: string | undefined) => {
    setSelectedState(state)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-600">Loading map...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">Memorial Highways Map</h1>
      <p className="text-gray-600 mb-8">
        Explore {data?.metadata.totalCount.toLocaleString()} memorial highways across{" "}
        {data?.metadata.states.length} states.
        Click on any marker to view detailed information about the honoree.
      </p>

      <MapControls
        onFilterChange={handleFilterChange}
        onStateSelect={handleStateSelect}
        states={data?.metadata.states || []}
      />

      <div className="mt-6">
        <MapContainer highways={filteredHighways} selectedState={selectedState} />
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredHighways.length.toLocaleString()} of {data?.metadata.totalCount.toLocaleString()}{" "}
        highways
      </div>
    </div>
  )
}
