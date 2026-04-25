"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type {
  FindingsChartComponent,
  FindingsComponent,
  FindingsFilterDefinition,
  FindingsPrimitive,
  FindingsTableComponent,
} from "@/types/findings"

type FindingsRow = Record<string, FindingsPrimitive>

interface FilterProps {
  id: string
  definition: FindingsFilterDefinition
  value: string
  onChange: (id: string, value: string) => void
}

function FindingsFilter({ id, definition, value, onChange }: FilterProps) {
  return (
    <div className="w-full md:w-72">
      <p className="text-sm text-gray-600 mb-2">{definition.label}</p>
      <Select value={value} onValueChange={(next) => onChange(id, next)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {definition.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function valueToNumber(value: FindingsPrimitive): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function formatValue(value: FindingsPrimitive): string {
  if (value === null) return "-"
  if (typeof value === "number") return value.toLocaleString()
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
}

function getChartData(component: FindingsChartComponent, activeFilters: Record<string, string>): FindingsRow[] {
  if (!component.filterId || !component.variants) return component.data
  const selectedValue = activeFilters[component.filterId]
  if (!selectedValue) return component.data
  return component.variants[selectedValue] ?? component.data
}

function BasicBarChart({
  data,
  xKey,
  yKey,
  limit = 25,
}: {
  data: FindingsRow[]
  xKey: string
  yKey: string
  limit?: number
}) {
  const trimmed = [...data]
    .sort((a, b) => valueToNumber(b[yKey]) - valueToNumber(a[yKey]))
    .slice(0, limit)
  const maxValue = Math.max(...trimmed.map((row) => valueToNumber(row[yKey])), 1)

  return (
    <div className="space-y-2">
      {trimmed.map((row, index) => {
        const label = String(row[xKey] ?? `Item ${index + 1}`)
        const val = valueToNumber(row[yKey])
        const width = Math.max((val / maxValue) * 100, 2)
        return (
          <div key={`${label}-${index}`} className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span className="truncate pr-3">{label}</span>
              <span>{val.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded bg-gray-100">
              <div className="h-2 rounded bg-blue-600" style={{ width: `${width}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PieLikeList({
  data,
  xKey,
  yKey,
}: {
  data: FindingsRow[]
  xKey: string
  yKey: string
}) {
  const total = data.reduce((sum, row) => sum + valueToNumber(row[yKey]), 0) || 1
  return (
    <div className="space-y-2">
      {data.map((row, idx) => {
        const label = String(row[xKey] ?? `Category ${idx + 1}`)
        const value = valueToNumber(row[yKey])
        const pct = (value / total) * 100
        return (
          <div key={`${label}-${idx}`} className="rounded border p-2">
            <div className="flex justify-between text-sm">
              <span>{label}</span>
              <span className="font-semibold">
                {value.toLocaleString()} ({pct.toFixed(1)}%)
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StackedBarSummary({
  data,
  xKey,
  yKey,
  series,
}: {
  data: FindingsRow[]
  xKey: string
  yKey: string
  series?: string[]
}) {
  if (!series || series.length === 0) {
    return <BasicBarChart data={data} xKey={xKey} yKey={yKey} />
  }

  if (series.length > 1) {
    return (
      <div className="space-y-3">
        {data.slice(0, 20).map((row, idx) => {
          const label = String(row[xKey] ?? `Row ${idx + 1}`)
          const total = series.reduce((sum, key) => sum + valueToNumber(row[key]), 0)
          return (
            <div key={`${label}-${idx}`} className="rounded border p-2">
              <div className="text-sm font-medium mb-1">{label}</div>
              <div className="flex flex-wrap gap-2">
                {series.map((key) => (
                  <Badge key={key} variant="secondary">
                    {key}: {valueToNumber(row[key]).toLocaleString()}
                  </Badge>
                ))}
                <Badge>Total: {total.toLocaleString()}</Badge>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const groupKey = series[0]
  const grouped = new Map<string, Map<string, number>>()
  data.forEach((row) => {
    const xVal = String(row[xKey] ?? "Unknown")
    const gVal = String(row[groupKey] ?? "Unknown")
    const count = valueToNumber(row[yKey])
    if (!grouped.has(xVal)) grouped.set(xVal, new Map())
    const bucket = grouped.get(xVal)!
    bucket.set(gVal, (bucket.get(gVal) ?? 0) + count)
  })

  const groupEntries = [...grouped.entries()]
    .map(([label, seriesCounts]) => ({
      label,
      total: [...seriesCounts.values()].reduce((a, b) => a + b, 0),
      seriesCounts,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  return (
    <div className="space-y-3">
      {groupEntries.map((entry) => (
        <div key={entry.label} className="rounded border p-2">
          <div className="flex justify-between text-sm mb-1">
            <span>{entry.label}</span>
            <span className="font-semibold">{entry.total.toLocaleString()}</span>
          </div>
          <div className="flex h-3 rounded overflow-hidden bg-gray-100">
            {[...entry.seriesCounts.entries()].map(([seriesName, count], index) => {
              const width = Math.max((count / Math.max(entry.total, 1)) * 100, 2)
              const colors = ["bg-blue-600", "bg-emerald-600", "bg-amber-500", "bg-violet-600", "bg-rose-500", "bg-cyan-600"]
              return (
                <div
                  key={`${entry.label}-${seriesName}`}
                  className={colors[index % colors.length]}
                  style={{ width: `${width}%` }}
                  title={`${seriesName}: ${count.toLocaleString()}`}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {[...entry.seriesCounts.entries()].map(([seriesName, count]) => (
              <Badge key={`${entry.label}-${seriesName}`} variant="outline">
                {seriesName}: {count.toLocaleString()}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SimpleTable({ component }: { component: FindingsTableComponent }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {component.columns.map((column) => (
              <th key={column} className="px-3 py-2 text-left font-semibold text-gray-700 border-b">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {component.rows.slice(0, 200).map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="odd:bg-white even:bg-gray-50/60">
              {component.columns.map((column) => (
                <td key={`${rowIndex}-${column}`} className="px-3 py-2 border-b align-top">
                  {formatValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScatterSummary({ data, xKey, yKey }: { data: FindingsRow[]; xKey: string; yKey: string }) {
  const points = data
    .map((row) => ({ x: valueToNumber(row[xKey]), y: valueToNumber(row[yKey]), label: String(row.state ?? row[xKey] ?? "") }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))

  const top = [...points].sort((a, b) => b.y - a.y).slice(0, 10)
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Scatter points: {points.length.toLocaleString()}</p>
      <div className="grid gap-2">
        {top.map((point, idx) => (
          <div key={`${point.label}-${idx}`} className="flex justify-between rounded border p-2 text-sm">
            <span className="truncate pr-3">{point.label || `Point ${idx + 1}`}</span>
            <span>
              x={point.x.toFixed(2)}, y={point.y.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function renderChart(component: FindingsChartComponent, activeFilters: Record<string, string>) {
  const data = getChartData(component, activeFilters)
  const xKey = component.xKey ?? "x"
  const yKey = component.yKey ?? "y"

  if (component.chartType === "pie") {
    return <PieLikeList data={data} xKey={xKey} yKey={yKey} />
  }
  if (component.chartType === "stackedBar") {
    return <StackedBarSummary data={data} xKey={xKey} yKey={yKey} series={component.series} />
  }
  if (component.chartType === "scatter") {
    return <ScatterSummary data={data} xKey={xKey} yKey={yKey} />
  }
  if (component.chartType === "line") {
    return <BasicBarChart data={data} xKey={xKey} yKey={yKey} />
  }
  if (component.chartType === "multiMetric") {
    return (
      <div className="space-y-2">
        {data.slice(0, 30).map((row, idx) => (
          <div key={`multi-${idx}`} className="rounded border p-2 text-sm">
            {Object.entries(row).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600">{key}</span>
                <span className="font-medium">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // mapPseudo and bar both render as ranked bars.
  return <BasicBarChart data={data} xKey={xKey} yKey={yKey} />
}

interface ShinyFindingsRendererProps {
  component: FindingsComponent
  filters: Record<string, FindingsFilterDefinition>
  activeFilters: Record<string, string>
  onFilterChange: (id: string, value: string) => void
}

export default function ShinyFindingsRenderer({
  component,
  filters,
  activeFilters,
  onFilterChange,
}: ShinyFindingsRendererProps) {
  if (component.type === "metric") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">{component.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{component.value}</div>
          {component.description && <p className="text-xs text-gray-500 mt-1">{component.description}</p>}
        </CardContent>
      </Card>
    )
  }

  if (component.type === "table") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{component.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleTable component={component} />
        </CardContent>
      </Card>
    )
  }

  const chart = component
  const filterDef = chart.filterId ? filters[chart.filterId] : undefined
  const filterValue = chart.filterId ? activeFilters[chart.filterId] ?? filterDef?.default ?? "" : ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{chart.title}</CardTitle>
        {chart.subtitle && <p className="text-sm text-gray-500">{chart.subtitle}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {filterDef && chart.filterId && (
          <FindingsFilter
            id={chart.filterId}
            definition={filterDef}
            value={filterValue}
            onChange={onFilterChange}
          />
        )}
        {renderChart(chart, activeFilters)}
      </CardContent>
    </Card>
  )
}
