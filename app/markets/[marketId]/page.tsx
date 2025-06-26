import { notFound } from "next/navigation"
import { OddsChart } from "@/components/odds-chart"
import { TradingInterface } from "@/components/trading-interface"
import { LiquidityInterface } from "@/components/liquidity-interface"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { dlmmService } from "@/lib/dlmm"
import { Clock, Users, DollarSign, TrendingUp } from "lucide-react"

interface MarketPageProps {
  params: {
    marketId: string
  }
}

export default async function MarketPage({ params }: MarketPageProps) {
  const market = await dlmmService.getMarket(params.marketId)

  if (!market) {
    notFound()
  }

  const odds = await dlmmService.getMarketOdds(params.marketId)

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
    return `$${volume}`
  }

  const daysUntilEnd = Math.ceil((market.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Market Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Badge variant="secondary">{market.category}</Badge>
          <Badge variant={market.resolved ? "default" : "outline"}>{market.resolved ? "Resolved" : "Active"}</Badge>
        </div>
        <h1 className="text-3xl font-bold mb-2">{market.title}</h1>
        <p className="text-gray-600 mb-4">{market.description}</p>

        {/* Market Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Volume</p>
              <p className="font-semibold">{formatVolume(market.totalVolume)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Time Left</p>
              <p className="font-semibold">{daysUntilEnd} days</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Traders</p>
              <p className="font-semibold">247</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">24h Change</p>
              <p className="font-semibold text-green-600">+2.3%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Odds and Trading */}
        <div className="lg:col-span-2 space-y-6">
          {odds && <OddsChart odds={odds} />}
          {odds && <TradingInterface market={market} odds={odds} />}
        </div>

        {/* Right Column - Liquidity and Info */}
        <div className="space-y-6">
          <LiquidityInterface market={market} />

          {/* Market Details */}
          <Card>
            <CardHeader>
              <CardTitle>Market Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolution Date</p>
                <p className="font-semibold">{market.endDate.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="font-semibold">{market.createdAt.toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Resolution Source</p>
                <p className="font-semibold">Chainlink Price Feeds</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pool Addresses</p>
                <div className="space-y-1">
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded">YES: {market.yesPoolId}</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded">NO: {market.noPoolId}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
