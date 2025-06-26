import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals-poolodds.css"
import ClientLayout from "./clientLayout-poolodds"
import { ErrorBoundary } from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pool Odds - Where Liquidity Meets Prophecy",
  description:
    "The deeper the pool, the clearer the future. Trade on prediction markets powered by dynamic liquidity pools.",
  keywords: ["prediction markets", "liquidity pools", "DeFi", "trading", "odds", "Solana", "crypto"],
  authors: [{ name: "Pool Odds Team" }],
  creator: "Pool Odds",
  publisher: "Pool Odds",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://poolodds.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Pool Odds - Where Liquidity Meets Prophecy",
    description:
      "The deeper the pool, the clearer the future. Trade on prediction markets powered by dynamic liquidity pools.",
    url: "https://poolodds.com",
    siteName: "Pool Odds",
    images: [
      {
        url: "/pool-odds-logo.png",
        width: 1200,
        height: 630,
        alt: "Pool Odds - Liquidity-Driven Prediction Markets",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pool Odds - Where Liquidity Meets Prophecy",
    description:
      "The deeper the pool, the clearer the future. Trade on prediction markets powered by dynamic liquidity pools.",
    images: ["/pool-odds-logo.png"],
    creator: "@poolodds",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/pool-odds-logo.png" />
        <link rel="apple-touch-icon" href="/pool-odds-logo.png" />
        <meta name="theme-color" content="#0a0b2e" />
        <meta name="msapplication-TileColor" content="#0a0b2e" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ClientLayout>{children}</ClientLayout>
        </ErrorBoundary>
      </body>
    </html>
  )
}
