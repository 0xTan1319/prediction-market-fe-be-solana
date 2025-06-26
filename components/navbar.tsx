"use client"

import Link from "next/link"
import { WalletButton } from "./wallet-button"
import { Button } from "@/components/ui/button"
import { TrendingUp, Plus } from "lucide-react"

export function Navbar() {
  return (
    <nav className="border-b border-meteora-navy-light/20 bg-meteora-navy/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-meteora-orange rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Pool Odds</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/markets" className="text-meteora-gray hover:text-white transition-colors">
              Markets
            </Link>
            <Link href="/portfolio" className="text-meteora-gray hover:text-white transition-colors">
              Portfolio
            </Link>
            <Link href="/liquidity" className="text-meteora-gray hover:text-white transition-colors">
              Liquidity
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex border-meteora-orange text-meteora-orange hover:bg-meteora-orange hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Market
            </Button>
            <WalletButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
