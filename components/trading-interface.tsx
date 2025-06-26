"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { Market, MarketOdds } from "@/types/market"
import { dlmmService } from "@/lib/dlmm"
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"

interface TradingInterfaceProps {
  market: Market
  odds: MarketOdds
}

export function TradingInterface({ market, odds }: TradingInterfaceProps) {
  const [activeTab, setActiveTab] = useState<"YES" | "NO">("YES")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const wallet = useWallet()

  const handleTrade = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) return

    if (!wallet.connected) {
      alert("Please connect your wallet first")
      return
    }

    setLoading(true)
    try {
      const poolId = activeTab === "YES" ? market.yesPoolId : market.noPoolId
      if (!poolId) {
        alert("Pool not found for this market")
        return
      }

      const quote = await dlmmService.swap(wallet, poolId, Number.parseFloat(amount), "USDC")

      if (quote) {
        alert(`Trade executed! You'll receive ${Number.parseFloat(quote.outAmount).toFixed(4)} ${activeTab} shares`)
        setAmount("")
      }
    } catch (error) {
      console.error("Trade failed:", error)
      alert("Trade failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const calculateShares = () => {
    if (!amount) return "0"
    const price = activeTab === "YES" ? odds.yes : odds.no
    return (Number.parseFloat(amount) / price).toFixed(4)
  }

  const calculatePotentialReturn = () => {
    if (!amount) return "0"
    const shares = Number.parseFloat(calculateShares())
    return (shares * 1).toFixed(2) // Assuming $1 payout per winning share
  }

  return (
    <Card className="meteora-card">
      <CardHeader>
        <CardTitle className="text-white">Trade Shares</CardTitle>
        <CardDescription className="text-meteora-gray">Buy YES or NO shares based on your prediction</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "YES" | "NO")}>
          <TabsList className="grid w-full grid-cols-2 bg-meteora-navy-light">
            <TabsTrigger
              value="YES"
              className="flex items-center space-x-2 data-[state=active]:bg-meteora-orange data-[state=active]:text-white text-meteora-gray"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">YES</span>
              <Badge variant="secondary" className="bg-green-400/20 text-green-400 border-green-400/30 text-xs">
                {odds.yesImpliedProbability.toFixed(1)}%
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="NO"
              className="flex items-center space-x-2 data-[state=active]:bg-meteora-orange data-[state=active]:text-white text-meteora-gray"
            >
              <TrendingDown className="h-4 w-4" />
              <span className="hidden sm:inline">NO</span>
              <Badge variant="secondary" className="bg-red-400/20 text-red-400 border-red-400/30 text-xs">
                {odds.noImpliedProbability.toFixed(1)}%
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="YES" className="space-y-4">
            <div className="p-4 bg-green-400/10 border border-green-400/20 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                <span className="font-medium text-white">YES Shares</span>
                <span className="text-sm text-meteora-gray">${odds.yes.toFixed(3)} per share</span>
              </div>
              <p className="text-sm text-meteora-gray">
                You believe the outcome will be YES. If correct, each share pays $1.00.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="NO" className="space-y-4">
            <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                <span className="font-medium text-white">NO Shares</span>
                <span className="text-sm text-meteora-gray">${odds.no.toFixed(3)} per share</span>
              </div>
              <p className="text-sm text-meteora-gray">
                You believe the outcome will be NO. If correct, each share pays $1.00.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 mt-6">
          <div>
            <Label htmlFor="amount" className="text-meteora-gray">
              Amount (USDC)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 meteora-input"
            />
          </div>

          {amount && (
            <div className="p-4 bg-meteora-navy-light/30 border border-meteora-navy-light/20 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-meteora-gray">You pay:</span>
                <span className="font-medium text-white">${amount} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-meteora-gray">You receive:</span>
                <span className="font-medium text-white">
                  {calculateShares()} {activeTab} shares
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-meteora-gray">Potential return:</span>
                <span className="font-medium text-green-400">${calculatePotentialReturn()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-meteora-gray">Potential profit:</span>
                <span className="text-meteora-gray">
                  ${(Number.parseFloat(calculatePotentialReturn()) - Number.parseFloat(amount || "0")).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleTrade}
            disabled={!amount || Number.parseFloat(amount) <= 0 || loading}
            className="w-full meteora-button"
          >
            {loading ? "Processing..." : `Buy ${activeTab} Shares`}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
