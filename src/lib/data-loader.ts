import type { HighwayDataset, AnalysisData, Highway } from "@/types/highway"

export async function loadHighwayData(): Promise<HighwayDataset> {
  const response = await fetch("/data/highways.json")
  if (!response.ok) {
    throw new Error("Failed to load highway data")
  }
  return response.json()
}

export async function loadAnalysisData(): Promise<AnalysisData> {
  const response = await fetch("/data/analysis.json")
  if (!response.ok) {
    throw new Error("Failed to load analysis data")
  }
  return response.json()
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
