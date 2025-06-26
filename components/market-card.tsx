"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Market } from "@/types/market"
import { useMarketOdds } from "@/hooks/use-market-odds"
import { TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react"
import Link from "next/link"

interface MarketCardProps {
  market: Market
}

export function MarketCard({ market }: MarketCardProps) {
  const { odds, loading, error, refetch } = useMarketOdds(market.id)

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
    return `$${volume}`
  }

  const daysUntilEnd = Math.ceil((market.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <Link href={`/markets/${market.id}`}>
      <Card className="meteora-card hover:shadow-2xl hover:shadow-meteora-orange/10 transition-all duration-300 cursor-pointer group">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold line-clamp-2 text-white group-hover:text-meteora-orange transition-colors">
                {market.title}
              </CardTitle>
              <CardDescription className="mt-1 text-meteora-gray text-sm">{market.description}</CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="bg-meteora-purple/20 text-meteora-purple border-meteora-purple/30 shrink-0"
            >
              {market.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Odds Display with Error Handling */}
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-meteora-navy-light rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-meteora-navy-light rounded"></div>
              </div>
            ) : error ? (
              <div className="text-center py-2">
                <p className="text-red-400 text-sm mb-2">Failed to load odds</p>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    refetch()
                  }}
                  className="text-xs text-meteora-orange hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : odds ? (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="font-medium text-white text-sm sm:text-base">
                      YES {Math.max(0, Math.min(100, odds.yesImpliedProbability)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="font-medium text-white text-sm sm:text-base">
                      NO {Math.max(0, Math.min(100, odds.noImpliedProbability)).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={Math.max(0, Math.min(100, odds.yesImpliedProbability))}
                  className="h-2 bg-meteora-navy-light"
                >
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-meteora-orange transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, odds.yesImpliedProbability))}%` }}
                  />
                </Progress>
                <div className="flex justify-between text-xs text-meteora-gray mt-1">
                  <span>${Math.max(0.01, odds.yes).toFixed(3)}</span>
                  <span className="hidden sm:inline">Confidence: {Math.max(0, odds.confidence).toFixed(0)}%</span>
                  <span>${Math.max(0.01, odds.no).toFixed(3)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-meteora-gray text-sm">Odds unavailable</p>
              </div>
            )}

            {/* Market Stats */}
            <div className="flex justify-between text-sm text-meteora-gray">
              <div className="flex items-center space-x-1">
                <DollarSign className="h-4 w-4" />
                <span>{formatVolume(market.totalVolume)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">{Math.max(0, daysUntilEnd)} days left</span>
                <span className="sm:hidden">{Math.max(0, daysUntilEnd)}d</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
