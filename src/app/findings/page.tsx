"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DataTable from "@/components/findings/DataTable"
import StatisticsCards from "@/components/findings/StatisticsCards"
import { loadAnalysisData, loadHighwayData } from "@/lib/data-loader"
import type { AnalysisData, HighwayDataset } from "@/types/highway"

export default function FindingsPage() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [highwayData, setHighwayData] = useState<HighwayDataset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadAnalysisData(), loadHighwayData()])
      .then(([analysis, highways]) => {
        setAnalysisData(analysis)
        setHighwayData(highways)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Failed to load data:", error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-600">Loading findings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Analysis & Findings</h1>
      <p className="text-gray-600 mb-8">
        Demographic analysis and insights from memorial highway data across Florida
      </p>

      {analysisData && <StatisticsCards demographics={analysisData.demographics} />}

      <Tabs defaultValue="all" className="mt-8">
        <TabsList>
          <TabsTrigger value="all">All Highways</TabsTrigger>
          <TabsTrigger value="insights">Key Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {highwayData && <DataTable data={highwayData.highways} />}
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <div className="space-y-6">
            {analysisData?.findings.map((finding) => (
              <div
                key={finding.id}
                className="border rounded-lg p-6 bg-white shadow-sm"
              >
                <h3 className="text-xl font-semibold mb-2">{finding.title}</h3>
                <p className="text-gray-700 mb-4">{finding.description}</p>
                {finding.imageUrl && (
                  <div className="mt-4 rounded-lg overflow-hidden border">
                    <Image
                      src={finding.imageUrl}
                      alt={finding.title}
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      priority={finding.id === 'finding-inequality-matrix'}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
