import type { HighwayDataset, AnalysisData, Highway } from "@/types/highway"
import type {
  FindingsComponent,
  FindingsFilterDefinition,
  FindingsPrimitive,
  FindingsTabDefinition,
  ShinyFindingsArtifacts,
} from "@/types/findings"

export interface StateIndex {
  states: string[]
  lastUpdated: string
  totalHighways: number
  stateInfo: Record<string, {
    name: string
    count: number
    center: [number, number]
    zoom: number
  }>
}

// Load state index
export async function loadStateIndex(): Promise<StateIndex> {
  const response = await fetch("/data/index.json")
  if (!response.ok) {
    throw new Error("Failed to load state index")
  }
  return response.json()
}

// Load specific state data
export async function loadStateData(stateCode: string): Promise<HighwayDataset> {
  const response = await fetch(`/data/states/${stateCode}/highways.json`)
  if (!response.ok) {
    throw new Error(`Failed to load highway data for state: ${stateCode}`)
  }
  return response.json()
}

// Load specific state analysis
export async function loadStateAnalysis(stateCode: string): Promise<AnalysisData> {
  const response = await fetch(`/data/states/${stateCode}/analysis.json`)
  if (!response.ok) {
    throw new Error(`Failed to load analysis data for state: ${stateCode}`)
  }
  return response.json()
}

// Load all highway data from all states
export async function loadHighwayData(): Promise<HighwayDataset> {
  // First get the state index
  const index = await loadStateIndex()

  // Load all state data in parallel
  const stateDataPromises = index.states.map(stateCode => loadStateData(stateCode))
  const stateDatasets = await Promise.all(stateDataPromises)

  // Combine all highways
  const allHighways: Highway[] = []
  const allStates: string[] = []

  stateDatasets.forEach((dataset, idx) => {
    allHighways.push(...dataset.highways)
    if (!allStates.includes(index.states[idx])) {
      allStates.push(index.states[idx])
    }
  })

  return {
    highways: allHighways,
    metadata: {
      lastUpdated: index.lastUpdated,
      totalCount: allHighways.length,
      states: allStates,
    },
  }
}

// Load combined analysis data from all states
export async function loadAnalysisData(): Promise<AnalysisData> {
  // First get the state index
  const index = await loadStateIndex()

  // Load all state analysis data in parallel
  const analysisPromises = index.states.map(stateCode => loadStateAnalysis(stateCode))
  const stateAnalyses = await Promise.all(analysisPromises)

  // Combine demographics
  const combinedDemographics: AnalysisData['demographics'] = {
    byBranch: {},
    byState: {},
    byDecade: {},
    byConflict: {},
    byCounty: {},
    byGender: {},
    byInvolvement: {},
  }

  // Merge demographics from each state
  stateAnalyses.forEach((analysis, idx) => {
    const stateCode = index.states[idx]

    // Add state count
    combinedDemographics.byState[stateCode] = index.stateInfo[stateCode].count

    // Merge each demographic category
    Object.entries(analysis.demographics.byBranch || {}).forEach(([key, value]) => {
      combinedDemographics.byBranch[key] = (combinedDemographics.byBranch[key] || 0) + value
    })

    Object.entries(analysis.demographics.byDecade || {}).forEach(([key, value]) => {
      combinedDemographics.byDecade[key] = (combinedDemographics.byDecade[key] || 0) + value
    })

    Object.entries(analysis.demographics.byConflict || {}).forEach(([key, value]) => {
      combinedDemographics.byConflict[key] = (combinedDemographics.byConflict[key] || 0) + value
    })

    Object.entries(analysis.demographics.byCounty || {}).forEach(([key, value]) => {
      // Prefix county with state to avoid conflicts
      const countyKey = `${key} (${stateCode})`
      combinedDemographics.byCounty![countyKey] = value
    })

    Object.entries(analysis.demographics.byGender || {}).forEach(([key, value]) => {
      combinedDemographics.byGender![key] = (combinedDemographics.byGender![key] || 0) + value
    })

    Object.entries(analysis.demographics.byInvolvement || {}).forEach(([key, value]) => {
      combinedDemographics.byInvolvement![key] = (combinedDemographics.byInvolvement![key] || 0) + value
    })
  })

  // Combine findings from all states
  const combinedFindings: AnalysisData['findings'] = []

  // Add a cross-state comparison finding
  combinedFindings.push({
    id: 'finding-state-comparison',
    title: 'Multi-State Distribution',
    description: `Memorial highways across ${index.states.length} states: ${Object.entries(combinedDemographics.byState).map(([state, count]) => `${state}: ${count}`).join(', ')}`,
    visualizationType: 'chart',
    data: combinedDemographics.byState,
  })

  // Include unique findings from each state
  stateAnalyses.forEach((analysis, idx) => {
    const stateCode = index.states[idx]
    analysis.findings.forEach(finding => {
      combinedFindings.push({
        ...finding,
        id: `${stateCode}-${finding.id}`,
        title: `${index.stateInfo[stateCode].name}: ${finding.title}`,
      })
    })
  })

  return {
    demographics: combinedDemographics,
    findings: combinedFindings,
  }
}

// Filter utilities
export function filterHighwaysByState(highways: Highway[], state: string): Highway[] {
  return highways.filter((h) => h.state === state)
}

export function searchHighways(highways: Highway[], query: string): Highway[] {
  const lowerQuery = query.toLowerCase()
  return highways.filter(
    (h) =>
      h.name.toLowerCase().includes(lowerQuery) ||
      h.honoree.name.toLowerCase().includes(lowerQuery) ||
      h.state.toLowerCase().includes(lowerQuery)
  )
}

export function filterHighwaysByBranch(highways: Highway[], branch: string): Highway[] {
  return highways.filter((h) => h.honoree.branch === branch)
}

function parsePrimitive(value: unknown): FindingsPrimitive {
  if (typeof value !== "string") {
    return (value as FindingsPrimitive) ?? null
  }

  const trimmed = value.trim()
  if (trimmed === "") return ""

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed)
    return Number.isNaN(num) ? value : num
  }

  if (trimmed.toLowerCase() === "true") return true
  if (trimmed.toLowerCase() === "false") return false

  return value
}

function normalizeRows(rows: unknown): Record<string, FindingsPrimitive>[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => {
    if (!row || typeof row !== "object") return {}
    return Object.fromEntries(
      Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, parsePrimitive(value)])
    )
  })
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string")
  }
  if (typeof value === "string") return [value]
  return []
}

function normalizeFindingsComponent(component: FindingsComponent): FindingsComponent {
  if (component.type === "metric") {
    return {
      ...component,
      value: String(component.value),
    }
  }

  if (component.type === "table") {
    return {
      ...component,
      columns: normalizeStringArray(component.columns),
      rows: normalizeRows(component.rows),
    }
  }

  const normalizedVariants: Record<string, Record<string, FindingsPrimitive>[]> = {}
  if (component.variants && typeof component.variants === "object") {
    Object.entries(component.variants).forEach(([key, rows]) => {
      normalizedVariants[key] = normalizeRows(rows)
    })
  }

  return {
    ...component,
    data: normalizeRows(component.data),
    series: normalizeStringArray(component.series),
    variants: Object.keys(normalizedVariants).length > 0 ? normalizedVariants : undefined,
  }
}

function normalizeFilters(raw: unknown): Record<string, FindingsFilterDefinition> {
  if (!raw || typeof raw !== "object") return {}
  const filters = raw as Record<string, FindingsFilterDefinition>
  return Object.fromEntries(
    Object.entries(filters).map(([id, filterDef]) => [
      id,
      {
        label: filterDef?.label ?? id,
        default: filterDef?.default ?? "",
        options: Array.isArray(filterDef?.options) ? filterDef.options : [],
      },
    ])
  )
}

function normalizeTabs(raw: unknown): FindingsTabDefinition[] {
  if (!Array.isArray(raw)) return []
  return raw.map((tab) => {
    const safeTab = tab as FindingsTabDefinition
    return {
      id: safeTab.id,
      label: safeTab.label,
      components: normalizeStringArray(safeTab.components),
    }
  })
}

function normalizeComponents(raw: unknown): Record<string, FindingsComponent> {
  if (!raw || typeof raw !== "object") return {}
  const components = raw as Record<string, FindingsComponent>
  return Object.fromEntries(
    Object.entries(components).map(([id, component]) => [id, normalizeFindingsComponent(component)])
  )
}

// Load precomputed R Shiny findings artifacts.
export async function loadShinyFindingsArtifacts(): Promise<ShinyFindingsArtifacts> {
  const response = await fetch("/data/rshiny/findings-artifacts.json")
  if (!response.ok) {
    throw new Error("Failed to load Shiny findings artifacts")
  }

  const raw = (await response.json()) as ShinyFindingsArtifacts

  return {
    ...raw,
    filters: normalizeFilters(raw.filters),
    tabs: normalizeTabs(raw.tabs),
    components: normalizeComponents(raw.components),
  }
}
