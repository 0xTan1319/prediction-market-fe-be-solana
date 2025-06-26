"use client"

import { useState, useEffect } from "react"
import type { Market } from "@/types/market"
import { dlmmService } from "@/lib/dlmm"

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const marketData = await dlmmService.getMarkets()
        setMarkets(marketData)
        setError(null)
      } catch (err) {
        setError("Failed to fetch markets")
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [])

  return { markets, loading, error, refetch: () => setLoading(true) }
}
