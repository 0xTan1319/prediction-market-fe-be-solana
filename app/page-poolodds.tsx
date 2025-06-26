import { MarketStats } from "@/components/market-stats-poolodds"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Droplets, Zap, Plus, TrendingUp, Waves, Target } from "lucide-react"
import Link from "next/link"
import { MarketGrid } from "@/components/market-grid-fixed"

export default function HomePage() {
  return (
    <div className="container-mobile py-8">
      {/* Hero Section */}
      <div className="text-center mb-12 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-poolodds-green/10 via-transparent to-poolodds-purple/10 rounded-3xl blur-3xl"></div>
        <div className="relative">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img
                src="/pool-odds-logo.png"
                alt="Pool Odds Logo"
                className="h-24 w-24 sm:h-32 sm:w-32 object-contain poolodds-glow"
              />
              <div className="absolute inset-0 animate-pool-ripple">
                <div className="h-24 w-24 sm:h-32 sm:w-32 border-2 border-poolodds-green/30 rounded-full"></div>
              </div>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-white">Pool Odds</h1>
          <p className="text-xl sm:text-2xl text-poolodds-green mb-4 font-medium">Where Liquidity Meets Prophecy</p>
          <p className="text-lg sm:text-xl text-poolodds-gray mb-8 max-w-3xl mx-auto">
            The deeper the pool, the clearer the future. Trade on prediction markets where odds are shaped by liquidity
            depth, not just price.
          </p>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8">
            <Badge
              variant="secondary"
              className="bg-poolodds-navy-light/50 text-poolodds-green border-poolodds-green/30 px-4 py-2 text-sm poolodds-glow"
            >
              <Droplets className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Liquidity-Driven Odds</span>
              <span className="sm:hidden">Liquidity Odds</span>
            </Badge>
            <Badge
              variant="secondary"
              className="bg-poolodds-navy-light/50 text-poolodds-purple border-poolodds-purple/30 px-4 py-2 text-sm poolodds-glow-purple"
            >
              <Zap className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Oracle Resolution</span>
              <span className="sm:hidden">Auto-Resolve</span>
            </Badge>
            <Badge
              variant="secondary"
              className="bg-poolodds-navy-light/50 text-poolodds-blue border-poolodds-blue/30 px-4 py-2 text-sm"
            >
              <Waves className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Dynamic Pools</span>
              <span className="sm:hidden">Dynamic</span>
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/markets/eth-5k-july-2024">
              <Button size="lg" className="poolodds-button w-full sm:w-auto text-lg px-8 py-3">
                Start Trading
                <Target className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/create">
              <Button
                variant="outline"
                size="lg"
                className="poolodds-button-outline w-full sm:w-auto text-lg px-8 py-3"
              >
                Create Pool
                <Plus className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <p className="text-poolodds-green font-medium text-lg italic">"Liquidity is the new insider info."</p>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <MarketStats totalVolume={2100000} activeMarkets={24} resolvedToday={3} />

      {/* Featured Markets */}
      <div className="my-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-white">Live Pools</h2>
            <div className="relative">
              <Droplets className="h-6 w-6 text-poolodds-green animate-odds-pulse" />
              <div className="absolute inset-0 h-6 w-6 text-poolodds-green/30 animate-pool-ripple">
                <Waves className="h-6 w-6" />
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="animate-pulse border-poolodds-green text-poolodds-green w-fit poolodds-glow"
          >
            <div className="w-2 h-2 bg-poolodds-green rounded-full mr-2 animate-ping"></div>
            Live Odds
          </Badge>
        </div>

        <MarketGrid />
      </div>

      {/* Value Props */}
      <Card className="poolodds-card poolodds-glow">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Why Pool Odds?</CardTitle>
          <CardDescription className="text-poolodds-gray text-lg">
            Revolutionary prediction markets where deeper pools mean sharper probabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-poolodds-green/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:poolodds-glow transition-all duration-300">
                <Droplets className="h-8 w-8 text-poolodds-green" />
              </div>
              <h3 className="font-semibold mb-3 text-white text-lg">Liquidity-Weighted Odds</h3>
              <p className="text-sm text-poolodds-gray leading-relaxed">
                Market confidence reflects liquidity depth, not just token price. Deeper pools create more accurate odds
                and higher confidence levels.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-poolodds-purple/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:poolodds-glow-purple transition-all duration-300">
                <Zap className="h-8 w-8 text-poolodds-purple" />
              </div>
              <h3 className="font-semibold mb-3 text-white text-lg">Oracle-Powered Resolution</h3>
              <p className="text-sm text-poolodds-gray leading-relaxed">
                Pyth Network oracles automatically resolve markets. No waiting, no disputes, instant payouts when events
                conclude.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-poolodds-blue/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-poolodds-blue/30 transition-all duration-300">
                <TrendingUp className="h-8 w-8 text-poolodds-blue" />
              </div>
              <h3 className="font-semibold mb-3 text-white text-lg">Dynamic Fee Rewards</h3>
              <p className="text-sm text-poolodds-gray leading-relaxed">
                Earn higher fees by providing liquidity to imbalanced pools. Help balance the odds, earn more rewards.
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-poolodds-navy-light/30 rounded-lg border border-poolodds-green/20">
            <div className="text-center">
              <h4 className="text-poolodds-green font-semibold mb-2">The Pool Odds Advantage</h4>
              <p className="text-sm text-poolodds-gray">
                <span className="text-white font-medium">Not just another AMM:</span> Unlike Uniswap, odds adjust based
                on liquidity depth, not just price.
                <br />
                <span className="text-white font-medium">Not just another predictor:</span> Unlike Polymarket, liquidity
                providers directly influence the odds.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
