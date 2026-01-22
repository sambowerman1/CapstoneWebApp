import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalysisData } from "@/types/highway"

interface StatisticsCardsProps {
  demographics: AnalysisData["demographics"]
}

export default function StatisticsCards({ demographics }: StatisticsCardsProps) {
  const totalByBranch = Object.values(demographics.byBranch).reduce((a, b) => a + b, 0)
  const totalByState = Object.values(demographics.byState).reduce((a, b) => a + b, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Highways
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalByState}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            States Covered
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {Object.keys(demographics.byState).length}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Military Branches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {Object.keys(demographics.byBranch).filter(
              (branch) => demographics.byBranch[branch] > 0
            ).length}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Conflicts Represented
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {Object.keys(demographics.byConflict).length}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
