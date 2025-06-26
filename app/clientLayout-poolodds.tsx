"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals-poolodds.css"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Droplets, Menu, Waves } from "lucide-react"
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
          <nav className="border-b border-poolodds-navy-light/20 bg-poolodds-navy/95 backdrop-blur-md supports-[backdrop-filter]:bg-poolodds-navy/80 sticky top-0 z-50">
            <div className="container-mobile">
              <div className="flex h-16 items-center justify-between">
                <Link href="/" className="flex items-center space-x-3">
                  <div className="relative">
                    <Droplets className="h-7 w-7 text-poolodds-green animate-odds-pulse" />
                    <div className="absolute inset-0 h-7 w-7 text-poolodds-green/30 animate-pool-ripple">
                      <Waves className="h-7 w-7" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xl text-white hidden sm:block">Pool Odds</span>
                    <span className="font-bold text-lg text-white sm:hidden">Pool Odds</span>
                    <span className="text-xs text-poolodds-green hidden sm:block">Liquidity meets prophecy</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-poolodds-green/20 text-poolodds-green border-poolodds-green/30"
                  >
                    BETA
                  </Badge>
                </Link>

                <div className="hidden md:flex items-center space-x-6">
                  <Link href="/" className="text-sm font-medium text-poolodds-gray hover:text-white transition-colors">
                    Markets
                  </Link>
                  <Link
                    href="/create"
                    className="text-sm font-medium text-poolodds-gray hover:text-white transition-colors"
                  >
                    Create Pool
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-poolodds-gray hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                  <WalletMultiButton className="!bg-poolodds-green !text-white hover:!bg-poolodds-green-dark !text-xs sm:!text-sm !px-2 sm:!px-4 poolodds-glow" />
                  <Button variant="ghost" size="sm" className="md:hidden text-white hover:bg-poolodds-navy-light">
                    <Menu className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </nav>

          <main className="min-h-screen bg-poolodds-gradient">{children}</main>

          <footer className="border-t border-poolodds-navy-light/20 bg-poolodds-navy">
            <div className="container-mobile py-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="relative">
                      <Droplets className="h-6 w-6 text-poolodds-green" />
                      <div className="absolute inset-0 h-6 w-6 text-poolodds-green/30">
                        <Waves className="h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-white">Pool Odds</span>
                      <p className="text-xs text-poolodds-green">Liquidity meets prophecy</p>
                    </div>
                  </div>
                  <p className="text-sm text-poolodds-gray mb-4">
                    The deeper the pool, the clearer the future. Trade on prediction markets powered by dynamic
                    liquidity.
                  </p>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="border-poolodds-green text-poolodds-green text-xs">
                      Liquidity-Driven
                    </Badge>
                    <Badge variant="outline" className="border-poolodds-purple text-poolodds-purple text-xs">
                      Oracle-Resolved
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 text-white">Markets</h3>
                  <ul className="space-y-2 text-sm text-poolodds-gray">
                    <li>
                      <Link href="/" className="hover:text-poolodds-green transition-colors">
                        Active Pools
                      </Link>
                    </li>
                    <li>
                      <Link href="/" className="hover:text-poolodds-green transition-colors">
                        Resolved Markets
                      </Link>
                    </li>
                    <li>
                      <Link href="/create" className="hover:text-poolodds-green transition-colors">
                        Create Pool
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 text-white">Liquidity</h3>
                  <ul className="space-y-2 text-sm text-poolodds-gray">
                    <li>
                      <Link href="/" className="hover:text-poolodds-green transition-colors">
                        Provide Liquidity
                      </Link>
                    </li>
                    <li>
                      <Link href="/" className="hover:text-poolodds-green transition-colors">
                        LP Rewards
                      </Link>
                    </li>
                    <li>
                      <Link href="/" className="hover:text-poolodds-green transition-colors">
                        Pool Analytics
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4 text-white">Community</h3>
                  <ul className="space-y-2 text-sm text-poolodds-gray">
                    <li>
                      <Link href="/" className="hover:text-poolodds-green transition-colors">
                        Documentation
                      </Link>
                    </li>
                    <li>
                      <Link href="/" className="hover:text-poolodds-green transition-colors">
                        Discord
                      </Link>
                    </li>
                    <li>
                      <Link href="/" className="hover:text-poolodds-green transition-colors">
                        Twitter
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-poolodds-navy-light/20 mt-8 pt-8 text-center text-sm text-poolodds-gray">
                <p>&copy; 2024 Pool Odds. Where liquidity meets prophecy.</p>
                <p className="mt-2 text-xs">
                  <span className="text-poolodds-green font-medium">"Liquidity is the new insider info."</span>
                </p>
              </div>
            </div>
          </footer>
        </WalletContextProvider>
      </body>
    </html>
  )
}
