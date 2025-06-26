"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWallet } from "@solana/wallet-adapter-react"
import { databaseService } from "@/lib/database-service"
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react"

interface Trade {
  id: string
  outcome: "YES" | "NO"
  trade_type: "BUY" | "SELL"
  amount_in: number
  amount_out: number
  price: number
  status: "PENDING" | "CONFIRMED" | "FAILED"
  created_at: string
  markets?: {
    title: string
    slug: string
  }
}

export function UserDashboard() {
  const { publicKey, connected } = useWallet()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalVolume: 0,
    winRate: 0,
    unrealizedPnl: 0,
  })

  useEffect(() => {
    if (connected && publicKey) {
      loadUserData()
    }
  }, [connected, publicKey])

  const loadUserData = async () => {
    if (!publicKey) return

    try {
      setLoading(true)
      const userTrades = await databaseService.getUserTrades(publicKey.toString())
      setTrades(userTrades)

      // Calculate stats
      const totalVolume = userTrades.reduce((sum, trade) => sum + trade.amount_in, 0)
      const confirmedTrades = userTrades.filter((t) => t.status === "CONFIRMED")

      setStats({
        totalTrades: userTrades.length,
        totalVolume,
        winRate: confirmedTrades.length > 0 ? (confirmedTrades.length / userTrades.length) * 100 : 0,
        unrealizedPnl: 0, // This would be calculated based on current market prices
      })
    } catch (error) {
      console.error("Failed to load user data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <Card className="meteora-card">
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-meteora-gray">Connect your wallet to view your trading dashboard</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="meteora-card">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-meteora-navy-light rounded w-3/4"></div>
            <div className="h-4 bg-meteora-navy-light rounded w-1/2"></div>
            <div className="h-4 bg-meteora-navy-light rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="meteora-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-meteora-gray">Total Trades</p>
                <p className="text-2xl font-bold text-white">{stats.totalTrades}</p>
              </div>
              <Activity className="h-6 w-6 text-meteora-orange" />
            </div>
          </CardContent>
        </Card>

        <Card className="meteora-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-meteora-gray">Total Volume</p>
                <p className="text-2xl font-bold text-white">${stats.totalVolume.toFixed(2)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-meteora-purple" />
            </div>
          </CardContent>
        </Card>

        <Card className="meteora-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-meteora-gray">Success Rate</p>
                <p className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="meteora-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-meteora-gray">Unrealized P&L</p>
                <p className="text-2xl font-bold text-white">${stats.unrealizedPnl.toFixed(2)}</p>
              </div>
              <TrendingDown className="h-6 w-6 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading History */}
      <Card className="meteora-card">
        <CardHeader>
          <CardTitle className="text-white">Trading History</CardTitle>
          <CardDescription className="text-meteora-gray">Your recent trades and positions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="trades" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-meteora-navy-light">
              <TabsTrigger value="trades" className="data-[state=active]:bg-meteora-orange">
                Recent Trades
              </TabsTrigger>
              <TabsTrigger value="positions" className="data-[state=active]:bg-meteora-orange">
                Open Positions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trades" className="space-y-4">
              {trades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-meteora-gray">No trades yet. Start trading to see your history!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trades.slice(0, 10).map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between p-4 bg-meteora-navy-light/30 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`p-2 rounded-full ${
                            trade.outcome === "YES" ? "bg-green-400/20" : "bg-red-400/20"
                          }`}
                        >
                          {trade.outcome === "YES" ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {trade.trade_type} {trade.outcome} - {trade.markets?.title || "Unknown Market"}
                          </p>
                          <p className="text-sm text-meteora-gray">
                            {trade.amount_in.toFixed(4)} USDC → {trade.amount_out.toFixed(4)} shares
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            trade.status === "CONFIRMED"
                              ? "default"
                              : trade.status === "PENDING"
                                ? "secondary"
                                : "destructive"
                          }
                          className={
                            trade.status === "CONFIRMED"
                              ? "bg-green-400/20 text-green-400"
                              : trade.status === "PENDING"
                                ? "bg-yellow-400/20 text-yellow-400"
                                : "bg-red-400/20 text-red-400"
                          }
                        >
                          {trade.status}
                        </Badge>
                        <p className="text-sm text-meteora-gray mt-1">
                          {new Date(trade.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="positions" className="space-y-4">
              <div className="text-center py-8">
                <p className="text-meteora-gray">Open positions will be displayed here once implemented.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
