"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MarketOdds } from "@/types/market"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

interface OddsChartProps {
  odds: MarketOdds
  loading?: boolean
}

export function OddsChart({ odds, loading }: OddsChartProps) {
  if (loading) {
    return (
      <Card className="meteora-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Activity className="h-5 w-5" />
            <span>Live Market Odds</span>
          </CardTitle>
          <CardDescription className="text-meteora-gray">
            Odds are dynamically calculated based on liquidity depth and trading activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="meteora-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Activity className="h-5 w-5" />
          <span>Live Market Odds</span>
        </CardTitle>
        <CardDescription className="text-meteora-gray">
          Odds are dynamically calculated based on liquidity depth and trading activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* YES Outcome */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span className="font-semibold text-lg text-white">YES</span>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-green-400">
                  {odds.yesImpliedProbability.toFixed(1)}%
                </div>
                <div className="text-sm text-meteora-gray">${odds.yes.toFixed(3)} per share</div>
              </div>
            </div>
            <div className="w-full bg-meteora-navy-light rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${odds.yesImpliedProbability}%` }}
              ></div>
            </div>
          </div>

          {/* NO Outcome */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-400" />
                <span className="font-semibold text-lg text-white">NO</span>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-red-400">
                  {odds.noImpliedProbability.toFixed(1)}%
                </div>
                <div className="text-sm text-meteora-gray">${odds.no.toFixed(3)} per share</div>
              </div>
            </div>
            <div className="w-full bg-meteora-navy-light rounded-full h-3">
              <div
                className="bg-gradient-to-r from-red-400 to-red-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${odds.noImpliedProbability}%` }}
              ></div>
            </div>
          </div>

          {/* Market Confidence */}
          <div className="pt-4 border-t border-meteora-navy-light/30">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-meteora-gray">Market Confidence</span>
              <span className="text-sm font-semibold text-white">{odds.confidence.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-meteora-navy-light rounded-full h-2 mt-1">
              <div
                className="bg-gradient-to-r from-meteora-orange to-meteora-orange-light h-2 rounded-full transition-all duration-500"
                style={{ width: `${odds.confidence}%` }}
              ></div>
            </div>
            <p className="text-xs text-meteora-gray mt-1">
              Based on total liquidity depth ($
              {(odds.liquidityRatio * 100000 + (1 - odds.liquidityRatio) * 100000).toLocaleString()})
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
