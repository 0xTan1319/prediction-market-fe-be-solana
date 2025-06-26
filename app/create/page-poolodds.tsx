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
import { Plus, DollarSign, AlertCircle, Droplets, Target } from "lucide-react"
import { useRouter } from "next/navigation"
import { realDLMMService } from "@/lib/dlmm-real-fixed"

const POOL_TEMPLATES = [
  {
    id: "crypto-price",
    name: "Crypto Price Pool",
    description: "Will [TOKEN] reach $[PRICE] by [DATE]?",
    category: "Crypto",
    oracle: "Pyth Network",
  },
  {
    id: "custom",
    name: "Custom Pool",
    description: "Create your own prediction pool",
    category: "Custom",
    oracle: "Manual Resolution",
  },
]

export default function CreatePoolPage() {
  const { connected, publicKey } = useWallet()
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    endDate: "",
    bondAmount: "10", // SOL required to create pool
  })
  const [loading, setLoading] = useState(false)

  const handleCreatePool = async () => {
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

      alert(`Pool created successfully! ID: ${market.id}`)
      router.push(`/markets/${market.id}`)
    } catch (error) {
      console.error("Pool creation failed:", error)
      alert("Failed to create pool. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <Droplets className="h-12 w-12 text-poolodds-green poolodds-glow" />
            <div className="absolute inset-0 h-12 w-12 text-poolodds-green/30 animate-pool-ripple">
              <Target className="h-12 w-12" />
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-white">Create Prediction Pool</h1>
        <p className="text-poolodds-gray">Launch your own prediction pool where liquidity shapes the odds</p>
      </div>

      {!connected && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <p className="text-yellow-200">Connect your wallet to create prediction pools</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Template Selection */}
        <Card className="poolodds-card">
          <CardHeader>
            <CardTitle className="text-white">Choose Pool Template</CardTitle>
            <CardDescription className="text-poolodds-gray">Select a template to get started quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {POOL_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedTemplate === template.id
                      ? "border-poolodds-green bg-poolodds-green/10 poolodds-glow"
                      : "border-poolodds-navy-light/30 hover:border-poolodds-green/50"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <h3 className="font-semibold mb-1 text-white">{template.name}</h3>
                  <p className="text-sm text-poolodds-gray mb-2">{template.description}</p>
                  <div className="flex space-x-2">
                    <Badge
                      variant="secondary"
                      className="bg-poolodds-purple/20 text-poolodds-purple border-poolodds-purple/30"
                    >
                      {template.category}
                    </Badge>
                    <Badge variant="outline" className="border-poolodds-blue text-poolodds-blue">
                      {template.oracle}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pool Details */}
        <Card className="poolodds-card">
          <CardHeader>
            <CardTitle className="text-white">Pool Details</CardTitle>
            <CardDescription className="text-poolodds-gray">Configure your prediction pool</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">
                Pool Question *
              </Label>
              <Input
                id="title"
                placeholder="Will ETH reach $5,000 by July 2024?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 poolodds-input"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Provide additional context about the pool resolution criteria..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 poolodds-input"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-white">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="mt-1 poolodds-input">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-poolodds-navy border-poolodds-navy-light">
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="politics">Politics</SelectItem>
                    <SelectItem value="weather">Weather</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="endDate" className="text-white">
                  Resolution Date *
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1 poolodds-input"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pool Bond */}
        <Card className="poolodds-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <DollarSign className="h-5 w-5" />
              <span>Pool Creation Bond</span>
            </CardTitle>
            <CardDescription className="text-poolodds-gray">
              Required bond to prevent spam and ensure pool quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-poolodds-navy-light/30 rounded-lg border border-poolodds-green/20">
              <div>
                <p className="font-semibold text-white">Bond Required</p>
                <p className="text-sm text-poolodds-gray">Refunded when pool resolves correctly</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-poolodds-green">{formData.bondAmount} SOL</p>
                <p className="text-sm text-poolodds-gray">≈ $200 USD</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Button */}
        <Button
          onClick={handleCreatePool}
          disabled={!connected || loading || !formData.title || !formData.endDate}
          className="w-full poolodds-button text-lg py-3"
          size="lg"
        >
          {loading ? "Creating Pool..." : "Create Prediction Pool"}
          <Plus className="ml-2 h-5 w-5" />
        </Button>

        {connected && (
          <div className="text-sm text-poolodds-gray space-y-1 bg-poolodds-navy-light/20 p-4 rounded-lg">
            <p className="flex items-center">
              <span className="text-poolodds-green mr-2">✓</span>
              Your wallet will be charged {formData.bondAmount} SOL as a pool creation bond
            </p>
            <p className="flex items-center">
              <span className="text-poolodds-green mr-2">✓</span>
              You'll earn 5% of all trading fees from this pool
            </p>
            <p className="flex items-center">
              <span className="text-poolodds-green mr-2">✓</span>
              Bond is refunded when the pool resolves successfully
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
