"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity, Clock, Droplets } from "lucide-react"
import { useEffect, useState } from "react"

interface MarketStatsProps {
  totalVolume: number
  activeMarkets: number
  resolvedToday: number
}

export function MarketStats({ totalVolume, activeMarkets, resolvedToday }: MarketStatsProps) {
  const [liveStats, setLiveStats] = useState({
    volume: totalVolume,
    markets: activeMarkets,
    resolved: resolvedToday,
  })

  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      setLiveStats((prev) => ({
        volume: prev.volume + Math.random() * 1000,
        markets: prev.markets + (Math.random() > 0.95 ? 1 : 0),
        resolved: prev.resolved + (Math.random() > 0.98 ? 1 : 0),
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
    return `$${volume.toFixed(0)}`
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="poolodds-card poolodds-glow">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-poolodds-gray">24h Pool Volume</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{formatVolume(liveStats.volume)}</p>
              <Badge
                variant="secondary"
                className="mt-1 bg-poolodds-green/20 text-poolodds-green border-poolodds-green/30"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
            <div className="relative">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-poolodds-green animate-odds-pulse" />
              <div className="absolute inset-0 h-6 w-6 sm:h-8 sm:w-8 text-poolodds-green/30 animate-pool-ripple">
                <Droplets className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="poolodds-card">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-poolodds-gray">Active Pools</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{liveStats.markets}</p>
              <Badge variant="outline" className="mt-1 border-poolodds-blue text-poolodds-blue">
                <TrendingUp className="h-3 w-3 mr-1" />
                Growing
              </Badge>
            </div>
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-poolodds-blue" />
          </div>
        </CardContent>
      </Card>

      <Card className="poolodds-card sm:col-span-2 lg:col-span-1">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-poolodds-gray">Resolved Today</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{liveStats.resolved}</p>
              <Badge
                variant="default"
                className="mt-1 bg-poolodds-purple/20 text-poolodds-purple border-poolodds-purple/30"
              >
                <Clock className="h-3 w-3 mr-1" />
                Oracle
              </Badge>
            </div>
            <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-poolodds-purple" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
