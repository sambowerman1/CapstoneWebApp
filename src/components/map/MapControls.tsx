"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface MapControlsProps {
  onFilterChange: (filters: {
    state?: string
    search?: string
    branch?: string
  }) => void
  onStateSelect?: (state: string | undefined) => void
  states: string[]
}

export default function MapControls({ onFilterChange, onStateSelect, states }: MapControlsProps) {
  const [search, setSearch] = useState("")
  const [state, setState] = useState<string>("__all__")
  const [branch, setBranch] = useState<string>("__all__")

  const handleStateChange = (value: string) => {
    setState(value)
    // Notify parent of state selection for map centering
    if (onStateSelect) {
      onStateSelect(value === "__all__" ? undefined : value)
    }
  }

  const handleApplyFilters = () => {
    onFilterChange({
      search: search || undefined,
      state: state === "__all__" ? undefined : state || undefined,
      branch: branch === "__all__" ? undefined : branch || undefined,
    })
  }

  const handleReset = () => {
    setSearch("")
    setState("__all__")
    setBranch("__all__")
    onFilterChange({})
    if (onStateSelect) {
      onStateSelect(undefined)
    }
  }

  // State display names (50 states + DC)
  const stateNames: Record<string, string> = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
    CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
    FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
    IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
    KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
    MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
    NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
    OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
    VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
    WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
  }

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder="Search highways or honorees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select value={state} onValueChange={handleStateChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All States</SelectItem>
            {states.filter(s => s && s.trim() !== '').sort().map((s) => (
              <SelectItem key={s} value={s}>
                {stateNames[s] || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Branches</SelectItem>
            <SelectItem value="Army">Army</SelectItem>
            <SelectItem value="Navy">Navy</SelectItem>
            <SelectItem value="Air Force">Air Force</SelectItem>
            <SelectItem value="Marines">Marines</SelectItem>
            <SelectItem value="Coast Guard">Coast Guard</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply
          </Button>
          <Button onClick={handleReset} variant="outline">
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}
