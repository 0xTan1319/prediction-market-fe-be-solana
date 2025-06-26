import { MarketStats } from "@/components/market-stats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Droplets, Zap, Plus } from "lucide-react"
import Link from "next/link"
import { MarketGrid } from "@/components/market-grid-fixed" // Updated import

export default function HomePage() {
  return (
    <div className="container-mobile py-8">
      {/* MVP Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-white">DLMM Prediction Markets</h1>
        <p className="text-lg sm:text-xl text-meteora-gray mb-6 max-w-3xl mx-auto">
          The first prediction market powered by Dynamic Liquidity Market Makers
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6">
          <Badge
            variant="secondary"
            className="bg-meteora-navy-light/50 text-meteora-orange border-meteora-orange/30 px-3 py-2"
          >
            <Droplets className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Liquidity-Based Odds</span>
            <span className="sm:hidden">Liquidity Odds</span>
          </Badge>
          <Badge
            variant="secondary"
            className="bg-meteora-navy-light/50 text-meteora-purple border-meteora-purple/30 px-3 py-2"
          >
            <Zap className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Pyth Oracle Resolution</span>
            <span className="sm:hidden">Oracle Resolution</span>
          </Badge>
          <Badge variant="secondary" className="bg-meteora-navy-light/50 text-green-400 border-green-400/30 px-3 py-2">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Real-time Updates</span>
            <span className="sm:hidden">Live Updates</span>
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/markets/eth-5k-july-2024">
            <Button size="lg" className="meteora-button w-full sm:w-auto">
              Start Trading
              <TrendingUp className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/create">
            <Button variant="outline" size="lg" className="meteora-button-outline w-full sm:w-auto">
              Create Market
              <Plus className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Stats */}
      <MarketStats totalVolume={2100000} activeMarkets={24} resolvedToday={3} />

      {/* Featured Markets */}
      <div className="my-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-white">Live Markets</h2>
          <Badge variant="outline" className="animate-pulse border-green-400 text-green-400 w-fit">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            Live
          </Badge>
        </div>

        {/* Client-side market grid */}
        <MarketGrid />
      </div>

      {/* MVP Value Props */}
      <Card className="meteora-card">
        <CardHeader>
          <CardTitle className="text-white">Why DLMM Prediction Markets?</CardTitle>
          <CardDescription className="text-meteora-gray">
            Revolutionary approach to prediction markets using concentrated liquidity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-meteora-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Droplets className="h-6 w-6 text-meteora-orange" />
              </div>
              <h3 className="font-semibold mb-2 text-white">Liquidity-Weighted Odds</h3>
              <p className="text-sm text-meteora-gray">
                Market confidence reflects liquidity depth, not just token price. Deeper liquidity = higher confidence.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-meteora-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-meteora-purple" />
              </div>
              <h3 className="font-semibold mb-2 text-white">Automated Resolution</h3>
              <p className="text-sm text-meteora-gray">
                Pyth Network oracles automatically resolve markets. No waiting, no disputes, instant payouts.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-semibold mb-2 text-white">Dynamic Fees</h3>
              <p className="text-sm text-meteora-gray">
                Earn higher fees by providing liquidity to imbalanced markets. Help balance odds, earn more.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
