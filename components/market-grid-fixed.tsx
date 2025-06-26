"use client"

import { MarketCard } from "@/components/market-card-fixed" // Updated import

// Client-side component that can use hooks
const featuredMarkets = [
  {
    id: "eth-5k-july-2024",
    title: "Will ETH hit $5K by July 2024?",
    description: "Ethereum price prediction using Pyth oracle resolution",
    category: "Crypto",
    endDate: new Date("2024-07-31"),
    resolved: false,
    yesPoolId: "eth-5k-yes-pool",
    noPoolId: "eth-5k-no-pool",
    totalVolume: 125000,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "btc-100k-2024",
    title: "Will BTC reach $100K in 2024?",
    description: "Bitcoin price prediction with automated oracle resolution",
    category: "Crypto",
    endDate: new Date("2024-12-31"),
    resolved: false,
    yesPoolId: "btc-100k-yes-pool",
    noPoolId: "btc-100k-no-pool",
    totalVolume: 89000,
    createdAt: new Date("2024-01-15"),
  },
]

export function MarketGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {featuredMarkets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  )
}
