import { NextResponse } from "next/server"

const DEFAULT_SHINY_TARGET = "https://memorialhighway.shinyapps.io/rshiny-capstone/"

export async function GET() {
  const target =
    process.env.SHINY_STATUS_TARGET ||
    process.env.NEXT_PUBLIC_SHINY_EMBED_URL ||
    DEFAULT_SHINY_TARGET

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)

    const response = await fetch(target, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, target, reason: `Shiny responded with ${response.status}` },
        { status: 503 }
      )
    }

    return NextResponse.json({ ok: true, target })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, target, reason }, { status: 503 })
  }
}
