export type FindingsPrimitive = string | number | boolean | null

export interface FindingsFilterOption {
  label: string
  value: string
}

export interface FindingsFilterDefinition {
  label: string
  default: string
  options: FindingsFilterOption[]
}

export type FindingsFilters = Record<string, FindingsFilterDefinition>

export interface FindingsTabDefinition {
  id: string
  label: string
  components: string[]
}

export interface FindingsBaseComponent {
  id: string
  type: "metric" | "chart" | "table"
  title: string
}

export interface FindingsMetricComponent extends FindingsBaseComponent {
  type: "metric"
  value: string
  description?: string
}

export interface FindingsChartComponent extends FindingsBaseComponent {
  type: "chart"
  chartType: string
  subtitle?: string
  xKey?: string
  yKey?: string
  series?: string[]
  filterId?: string
  data: Record<string, FindingsPrimitive>[]
  variants?: Record<string, Record<string, FindingsPrimitive>[]>
}

export interface FindingsTableComponent extends FindingsBaseComponent {
  type: "table"
  columns: string[]
  rows: Record<string, FindingsPrimitive>[]
}

export type FindingsComponent =
  | FindingsMetricComponent
  | FindingsChartComponent
  | FindingsTableComponent

export interface ShinyFindingsArtifacts {
  version: string
  generatedAt: string
  source: {
    script: string
    csv: string[]
  }
  filters: FindingsFilters
  tabs: FindingsTabDefinition[]
  components: Record<string, FindingsComponent>
}
