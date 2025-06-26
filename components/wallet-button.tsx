"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

export function WalletButton() {
  const { connected, publicKey } = useWallet()

  if (connected && publicKey) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-meteora-gray">
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </span>
        <WalletMultiButton className="!bg-meteora-orange hover:!bg-meteora-orange/80 !text-white !border-none !rounded-lg !px-4 !py-2 !text-sm !font-medium" />
      </div>
    )
  }

  return (
    <WalletMultiButton className="!bg-meteora-orange hover:!bg-meteora-orange/80 !text-white !border-none !rounded-lg !px-4 !py-2 !text-sm !font-medium" />
  )
}
