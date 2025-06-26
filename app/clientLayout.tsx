"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { TrendingUp, Menu } from "lucide-react"
import { WalletWarningsSuppressor } from "@/components/wallet-warnings-suppressor"

import { useMemo } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { clusterApiUrl } from "@solana/web3.js"

// Import wallet adapter CSS
require("@solana/wallet-adapter-react-ui/styles.css")

const inter = Inter({ subsets: ["latin"] })

function WalletContextProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletWarningsSuppressor />
        <WalletContextProvider>
          <nav className="border-b border-meteora-navy-light/20 bg-meteora-navy/95 backdrop-blur-md supports-[backdrop-filter]:bg-meteora-navy/80 sticky top-0 z-50">
            <div className="container-mobile">
              <div className="flex h-16 items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                  <TrendingUp className="h-6 w-6 text-meteora-orange" />
                  <span className="font-bold text-xl text-white hidden sm:block">DLMM Markets</span>
                  <span className="font-bold text-lg text-white sm:hidden">DLMM</span>
                  <Badge
                    variant="secondary"
                    className="bg-meteora-orange/20 text-meteora-orange border-meteora-orange/30"
                  >
                    MVP
                  </Badge>
                </Link>

                <div className="hidden md:flex items-center space-x-6">
                  <Link href="/" className="text-sm font-medium text-meteora-gray hover:text-white transition-colors">
                    Markets
                  </Link>
                  <Link
                    href="/create"
                    className="text-sm font-medium text-meteora-gray hover:text-white transition-colors"
                  >
                    Create
                  </Link>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                  <WalletMultiButton className="!bg-meteora-orange !text-white hover:!bg-meteora-orange-dark !text-xs sm:!text-sm !px-2 sm:!px-4" />
                  <Button variant="ghost" size="sm" className="md:hidden text-white hover:bg-meteora-navy-light">
                    <Menu className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          <main className="min-h-screen bg-meteora-gradient">{children}</main>

          <footer className="border-t border-meteora-navy-light/20 bg-meteora-navy">
            <div className="container-mobile py-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-meteora-orange" />
                    <span className="font-bold text-white">DLMM Markets</span>
                  </div>
                  <p className="text-sm text-meteora-gray">The future of prediction markets with dynamic liquidity.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 text-white">Markets</h3>
                  <ul className="space-y-2 text-sm text-meteora-gray">
                    <li>
                      <Link href="/">Active Markets</Link>
                    </li>
                    <li>
                      <Link href="/">Resolved Markets</Link>
                    </li>
                    <li>
                      <Link href="/">Create Market</Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 text-white">Liquidity</h3>
                  <ul className="space-y-2 text-sm text-meteora-gray">
                    <li>
                      <Link href="/">Provide Liquidity</Link>
                    </li>
                    <li>
                      <Link href="/">LP Rewards</Link>
                    </li>
                    <li>
                      <Link href="/">Pool Analytics</Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 text-white">Resources</h3>
                  <ul className="space-y-2 text-sm text-meteora-gray">
                    <li>
                      <Link href="/">Documentation</Link>
                    </li>
                    <li>
                      <Link href="/">API</Link>
                    </li>
                    <li>
                      <Link href="/">Discord</Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-meteora-navy-light/20 mt-8 pt-8 text-center text-sm text-meteora-gray">
                <p>&copy; 2024 DLMM Markets. Built with Meteora DLMM SDK.</p>
              </div>
            </div>
          </footer>
        </WalletContextProvider>
      </body>
    </html>
  )
}
