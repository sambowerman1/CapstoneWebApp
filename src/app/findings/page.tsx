"use client"

import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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

  // Calculate state breakdown for display
  const stateBreakdown = analysisData?.demographics.byState
    ? Object.entries(analysisData.demographics.byState)
        .map(([state, count]) => `${state === 'FL' ? 'Florida' : state === 'MI' ? 'Michigan' : state}: ${count.toLocaleString()}`)
        .join(' | ')
    : ''

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Analysis & Findings</h1>
      <p className="text-gray-600 mb-2">
        Demographic analysis and insights from memorial highway data across multiple states
      </p>
      <p className="text-sm text-gray-500 mb-8">
        {stateBreakdown}
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
            {/* Question Card with nested Analysis */}
            <Collapsible className="border rounded-lg bg-white shadow-sm">
              <CollapsibleTrigger className="flex items-center w-full p-6 text-left">
                <h2 className="text-2xl font-semibold">When were these designees born?</h2>
                <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-6 pb-6">
                <div className="flex justify-center mb-6">
                  <div className="rounded-lg overflow-hidden border" style={{ width: '60%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/visualizations/date_of_birth_histogram.png"
                      alt="Date of birth histogram of memorial highway designees"
                      className="w-full h-auto"
                    />
                  </div>
                </div>

                {/* Nested Analysis dropdown - open by default */}
                <Collapsible defaultOpen className="border rounded-lg bg-gray-50">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
                    <h3 className="text-xl font-semibold">Analysis</h3>
                    <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      
                      <p className="text-gray-700 flex-1">
                        A majority of these designees were born after the 19th century. However the earliest was Augustine Herman, who was born in 1621. Augustine was a diplomat, cartographer, and prominent Maryland landowner.
                      </p>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Augustineherrmann1.jpg/250px-Augustineherrmann1.jpg"
                        alt="Augustine Herman"
                        width={250}
                        height={300}
                        className="rounded-lg shrink-0"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
