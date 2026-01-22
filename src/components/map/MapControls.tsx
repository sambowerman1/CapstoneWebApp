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
  states: string[]
}

export default function MapControls({ onFilterChange, states }: MapControlsProps) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/81368653-ea8a-4c33-8f58-d330d2591a97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapControls.tsx:24',message:'MapControls rendered',data:{statesCount:states?.length,statesArray:states?.slice(0,10),hasEmptyStates:states?.some((s:string)=>s==='')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const [search, setSearch] = useState("")
  const [state, setState] = useState<string>("__all__")
  const [branch, setBranch] = useState<string>("__all__")

  const handleApplyFilters = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/81368653-ea8a-4c33-8f58-d330d2591a97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapControls.tsx:handleApplyFilters',message:'Applying filters',data:{state,branch,search},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'filter-logic'})}).catch(()=>{});
    // #endregion
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
  }

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder="Search highways or honorees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select value={state} onValueChange={setState}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by state" />
          </SelectTrigger>
          <SelectContent>
            {/* #region agent log */}
            {(() => { fetch('http://127.0.0.1:7242/ingest/81368653-ea8a-4c33-8f58-d330d2591a97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapControls.tsx:57',message:'State SelectContent rendering',data:{stateValue:state},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{}); return null; })()}
            {/* #endregion */}
            <SelectItem value="__all__">All States</SelectItem>
            {states.filter(s => s && s.trim() !== '').sort().map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by branch" />
          </SelectTrigger>
          <SelectContent>
            {/* #region agent log */}
            {(() => { fetch('http://127.0.0.1:7242/ingest/81368653-ea8a-4c33-8f58-d330d2591a97',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapControls.tsx:71',message:'Branch SelectContent rendering',data:{branchValue:branch},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{}); return null; })()}
            {/* #endregion */}
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
