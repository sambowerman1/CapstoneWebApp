"use client"

import { useEffect, useState } from "react"
import MapContainer from "@/components/map/MapContainer"
import MapControls from "@/components/map/MapControls"
import { loadHighwayData } from "@/lib/data-loader"
import type { Highway, HighwayDataset } from "@/types/highway"

export default function MapPage() {
  const [data, setData] = useState<HighwayDataset | null>(null)
  const [filteredHighways, setFilteredHighways] = useState<Highway[]>([])
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
    branch?: string
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

    if (filters.branch) {
      filtered = filtered.filter((h) => h.honoree.branch === filters.branch)
    }

    setFilteredHighways(filtered)
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
      <h1 className="text-4xl font-bold mb-6">Florida Memorial Highways Map</h1>
      <p className="text-gray-600 mb-8">
        Explore {data?.metadata.totalCount} memorial highways across Florida.
        Click on any marker to view detailed demographic information about the honoree.
      </p>

      <MapControls
        onFilterChange={handleFilterChange}
        states={data?.metadata.states || []}
      />

      <div className="mt-6">
        <MapContainer highways={filteredHighways} />
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredHighways.length} of {data?.metadata.totalCount}{" "}
        highways
      </div>
    </div>
  )
}
