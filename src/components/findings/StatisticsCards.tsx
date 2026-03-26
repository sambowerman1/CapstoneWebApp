import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalysisData } from "@/types/highway"

interface StatisticsCardsProps {
  demographics: AnalysisData["demographics"]
}

export default function StatisticsCards({ demographics }: StatisticsCardsProps) {
  const totalByState = Object.values(demographics.byState).reduce((a, b) => a + b, 0)
  const totalInvolvement = demographics.byInvolvement
    ? Object.values(demographics.byInvolvement).reduce((a, b) => a + b, 0)
    : 0

  // Get top involvement categories
  const involvementEntries = demographics.byInvolvement
    ? Object.entries(demographics.byInvolvement)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Highways
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalByState.toLocaleString()}</div>
          <p className="text-xs text-gray-500 mt-1">
            Across {Object.keys(demographics.byState).length} states
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            By State
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(demographics.byState).map(([state, count]) => (
              <div key={state} className="flex justify-between items-center text-sm">
                <span className={`px-2 py-0.5 rounded ${
                  state === 'FL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {state === 'FL' ? 'Florida' : state === 'MI' ? 'Michigan' : state}
                </span>
                <span className="font-semibold">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {involvementEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              By Background
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {involvementEntries.slice(0, 4).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{category}</span>
                  <span className="font-semibold">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {demographics.byGender && Object.keys(demographics.byGender).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              By Gender
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(demographics.byGender)
                .filter(([gender]) => gender !== 'Not found')
                .map(([gender, count]) => (
                  <div key={gender} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{gender}</span>
                    <span className="font-semibold">{count.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
