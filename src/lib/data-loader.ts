import type { HighwayDataset, AnalysisData, Highway } from "@/types/highway"

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
