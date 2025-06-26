"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Market } from "@/types/market"
import { dlmmService } from "@/lib/dlmm"
import { Plus, Minus, Droplets } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"

interface LiquidityInterfaceProps {
  market: Market
}

export function LiquidityInterface({ market }: LiquidityInterfaceProps) {
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add")
  const [yesAmount, setYesAmount] = useState("")
  const [noAmount, setNoAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const wallet = useWallet()

  const handleAddLiquidity = async () => {
    if (!yesAmount && !noAmount) return

    if (!wallet.connected) {
      alert("Please connect your wallet first")
      return
    }

    setLoading(true)
    try {
      const promises = []

      if (yesAmount && Number.parseFloat(yesAmount) > 0 && market.yesPoolId) {
        promises.push(dlmmService.addLiquidity(wallet, market.yesPoolId, Number.parseFloat(yesAmount)))
      }

      if (noAmount && Number.parseFloat(noAmount) > 0 && market.noPoolId) {
        promises.push(dlmmService.addLiquidity(wallet, market.noPoolId, Number.parseFloat(noAmount)))
      }

      const results = await Promise.all(promises)
      const allSuccessful = results.every((result) => result.success)

      if (allSuccessful) {
        alert("Liquidity added successfully!")
        setYesAmount("")
        setNoAmount("")
      } else {
        const errors = results
          .filter((r) => !r.success)
          .map((r) => r.error)
          .join(", ")
        alert(`Some transactions failed: ${errors}`)
      }
    } catch (error) {
      alert("Failed to add liquidity. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const estimatedFees = () => {
    const yesLiq = Number.parseFloat(yesAmount || "0")
    const noLiq = Number.parseFloat(noAmount || "0")
    const totalLiq = yesLiq + noLiq
    return (totalLiq * 0.003 * 365).toFixed(2) // Estimated annual fees at 0.3%
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Droplets className="h-5 w-5" />
          <span>Provide Liquidity</span>
        </CardTitle>
        <CardDescription>Earn fees by providing liquidity to the market pools</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "add" | "remove")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Liquidity</span>
            </TabsTrigger>
            <TabsTrigger value="remove" className="flex items-center space-x-2">
              <Minus className="h-4 w-4" />
              <span>Remove Liquidity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="yes-amount">YES Pool (USDC)</Label>
                <Input
                  id="yes-amount"
                  type="number"
                  placeholder="0.00"
                  value={yesAmount}
                  onChange={(e) => setYesAmount(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Current liquidity: $75,000</p>
              </div>
              <div>
                <Label htmlFor="no-amount">NO Pool (USDC)</Label>
                <Input
                  id="no-amount"
                  type="number"
                  placeholder="0.00"
                  value={noAmount}
                  onChange={(e) => setNoAmount(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Current liquidity: $50,000</p>
              </div>
            </div>

            {(yesAmount || noAmount) && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Total liquidity:</span>
                  <span className="font-medium">
                    ${(Number.parseFloat(yesAmount || "0") + Number.parseFloat(noAmount || "0")).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated annual fees:</span>
                  <span className="font-medium text-green-600">${estimatedFees()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Fee rate:</span>
                  <span>0.3% + dynamic adjustments</span>
                </div>
              </div>
            )}

            <Button onClick={handleAddLiquidity} disabled={(!yesAmount && !noAmount) || loading} className="w-full">
              {loading ? "Adding Liquidity..." : "Add Liquidity"}
            </Button>

            <div className="text-sm text-gray-600 space-y-1">
              <p>
                💡 <strong>Pro tip:</strong> Adding more liquidity to the less liquid side can earn higher fees due to
                dynamic fee adjustments.
              </p>
              <p>
                ⚠️ <strong>Risk:</strong> You may experience impermanent loss if the market odds change significantly.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="remove" className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600">Connect your wallet to view and manage your liquidity positions.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
