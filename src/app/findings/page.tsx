"use client"

import { useEffect, useState } from "react"

type ShinyStatus = {
  ok: boolean
  target: string
  reason?: string
}

const SHINY_EMBED_URL =
  process.env.NEXT_PUBLIC_SHINY_EMBED_URL ||
  "https://memorialhighway.shinyapps.io/rshiny-capstone/"

export default function FindingsPage() {
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [shinyStatus, setShinyStatus] = useState<ShinyStatus | null>(null)
  const [hasFrameError, setHasFrameError] = useState(false)

  const checkShinyStatus = async () => {
    setLoadingStatus(true)
    try {
      const response = await fetch("/api/shiny-status", { cache: "no-store" })
      const status = (await response.json()) as ShinyStatus
      setShinyStatus(status)
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error"
      setShinyStatus({ ok: false, target: SHINY_EMBED_URL, reason })
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    checkShinyStatus()
  }, [])

  const showFallback = !loadingStatus && (!shinyStatus?.ok || hasFrameError)

  return (
    <main className="w-full h-[calc(100vh-4rem)] min-h-[760px]">
      {loadingStatus ? (
        <div className="h-full flex items-center justify-center px-6">
          <div className="text-gray-600">Checking Shiny dashboard availability...</div>
        </div>
      ) : showFallback ? (
        <div className="h-full flex items-center justify-center px-6">
          <div className="max-w-xl text-center">
            <h1 className="text-2xl font-semibold mb-2">Shiny dashboard is unavailable</h1>
            <p className="text-gray-600 mb-3">
              The embedded dashboard could not be loaded.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Target: <code>{shinyStatus?.target ?? SHINY_EMBED_URL}</code>
              {shinyStatus?.reason ? ` | ${shinyStatus.reason}` : ""}
            </p>
            <button
              type="button"
              onClick={checkShinyStatus}
              className="rounded-md bg-black text-white px-4 py-2 text-sm hover:bg-gray-800"
            >
              Retry connection
            </button>
          </div>
        </div>
      ) : (
        <iframe
          src={SHINY_EMBED_URL}
          title="Memorial Highways Shiny Dashboard"
          className="w-full h-full border-0"
          allow="fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setHasFrameError(true)}
        />
      )}
    </main>
  )
}
