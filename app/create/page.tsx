"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@solana/wallet-adapter-react"
import { Plus, DollarSign, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { realDLMMService } from "@/lib/dlmm-real"

const MARKET_TEMPLATES = [
  {
    id: "crypto-price",
    name: "Crypto Price Prediction",
    description: "Will [TOKEN] reach $[PRICE] by [DATE]?",
    category: "Crypto",
    oracle: "Pyth Network",
  },
  {
    id: "custom",
    name: "Custom Market",
    description: "Create your own prediction market",
    category: "Custom",
    oracle: "Manual Resolution",
  },
]

export default function CreateMarketPage() {
  const { connected, publicKey } = useWallet()
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    endDate: "",
    bondAmount: "10", // SOL required to create market
  })
  const [loading, setLoading] = useState(false)

  const handleCreateMarket = async () => {
    if (!connected || !publicKey) {
      alert("Please connect your wallet first")
      return
    }

    if (!formData.title || !formData.endDate) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const market = await realDLMMService.createMarket({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        endDate: new Date(formData.endDate),
        creatorWallet: publicKey.toString(),
        bondAmount: Number.parseFloat(formData.bondAmount),
      })

      alert(`Market created successfully! ID: ${market.id}`)
      router.push(`/markets/${market.id}`)
    } catch (error) {
      console.error("Market creation failed:", error)
      alert("Failed to create market. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Prediction Market</h1>
        <p className="text-gray-600">Launch your own prediction market with DLMM liquidity</p>
      </div>

      {!connected && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">Connect your wallet to create markets</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Template</CardTitle>
            <CardDescription>Select a template to get started quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MARKET_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                  <div className="flex space-x-2">
                    <Badge variant="secondary">{template.category}</Badge>
                    <Badge variant="outline">{template.oracle}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Market Details */}
        <Card>
          <CardHeader>
            <CardTitle>Market Details</CardTitle>
            <CardDescription>Configure your prediction market</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Market Question *</Label>
              <Input
                id="title"
                placeholder="Will ETH reach $5,000 by July 2024?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide additional context about the market resolution criteria..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="politics">Politics</SelectItem>
                    <SelectItem value="weather">Weather</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="endDate">Resolution Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Bond */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Market Bond</span>
            </CardTitle>
            <CardDescription>Required bond to prevent spam and ensure market quality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">Bond Required</p>
                <p className="text-sm text-gray-600">Refunded when market resolves correctly</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{formData.bondAmount} SOL</p>
                <p className="text-sm text-gray-600">≈ $200 USD</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Button */}
        <Button
          onClick={handleCreateMarket}
          disabled={!connected || loading || !formData.title || !formData.endDate}
          className="w-full"
          size="lg"
        >
          {loading ? "Creating Market..." : "Create Market"}
          <Plus className="ml-2 h-4 w-4" />
        </Button>

        {connected && (
          <div className="text-sm text-gray-600 space-y-1">
            <p>✅ Your wallet will be charged {formData.bondAmount} SOL as a market creation bond</p>
            <p>✅ You'll earn 5% of all trading fees from this market</p>
            <p>✅ Bond is refunded when the market resolves successfully</p>
          </div>
        )}
      </div>
    </div>
  )
}
