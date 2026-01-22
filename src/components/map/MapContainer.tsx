"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import type { Highway } from "@/types/highway"

const MapSkeleton = () => (
  <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
    <p className="text-gray-500">Loading map...</p>
  </div>
)

const HighwayMap = dynamic(() => import("./HighwayMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

interface MapContainerProps {
  highways: Highway[]
}

export default function MapContainer({ highways }: MapContainerProps) {
  return (
    <div className="w-full h-[600px] md:h-[800px] rounded-lg overflow-hidden border">
      <HighwayMap highways={highways} />
    </div>
  )
}
