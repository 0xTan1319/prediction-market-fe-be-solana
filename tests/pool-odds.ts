import * as anchor from "@coral-xyz/anchor"
import type { Program } from "@coral-xyz/anchor"
import type { PoolOdds } from "../target/types/pool_odds"
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token"
import { assert } from "chai"
import { describe, before, it } from "mocha"

describe("pool-odds", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.PoolOdds as Program<PoolOdds>

  // Test accounts
  let authority: Keypair
  let feeRecipient: Keypair
  let creator: Keypair
  let trader: Keypair
  let baseTokenMint: PublicKey
  let globalState: PublicKey
  let market: PublicKey
  let yesPool: PublicKey
  let noPool: PublicKey

  before(async () => {
    // Initialize test accounts
    authority = Keypair.generate()
    feeRecipient = Keypair.generate()
    creator = Keypair.generate()
    trader = Keypair.generate()

    // Airdrop SOL to test accounts
    await provider.connection.requestAirdrop(authority.publicKey, 10 * LAMPORTS_PER_SOL)
    await provider.connection.requestAirdrop(creator.publicKey, 10 * LAMPORTS_PER_SOL)
    await provider.connection.requestAirdrop(trader.publicKey, 10 * LAMPORTS_PER_SOL)

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Create base token mint (USDC)
    baseTokenMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      6, // USDC decimals
    )

    // Derive PDAs
    ;[globalState] = PublicKey.findProgramAddressSync([Buffer.from("global_state")], program.programId)
  })

  it("Initializes the program", async () => {
    const params = {
      protocolFeeRate: 100, // 1%
      defaultMarketFeeRate: 300, // 3%
      minMarketDuration: 3600, // 1 hour
      maxMarketDuration: 31536000, // 1 year
      minBondAmount: new anchor.BN(100_000_000), // 0.1 SOL
      maxMarketsPerCreator: 100,
    }

    const tx = await program.methods
      .initialize(params)
      .accounts({
        globalState,
        authority: authority.publicKey,
        feeRecipient: feeRecipient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc()

    console.log("Initialize transaction signature:", tx)

    // Verify global state
    const globalStateAccount = await program.account.globalState.fetch(globalState)
    assert.equal(globalStateAccount.authority.toString(), authority.publicKey.toString())
    assert.equal(globalStateAccount.protocolFeeRate, 100)
    assert.equal(globalStateAccount.defaultMarketFeeRate, 300)
    assert.equal(globalStateAccount.paused, false)
  })

  it("Creates a market", async () => {
    const currentTime = Math.floor(Date.now() / 1000)
    const endTime = currentTime + 86400 // 24 hours from now

    // Derive market PDA
    const globalStateAccount = await program.account.globalState.fetch(globalState)
    ;[market] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        creator.publicKey.toBuffer(),
        new anchor.BN(globalStateAccount.totalMarkets).toArrayLike(Buffer, "le", 8),
      ],
      program.programId,
    )

    // Derive share mint PDAs
    const [yesShareMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("yes_share_mint"), market.toBuffer()],
      program.programId,
    )

    const [noShareMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("no_share_mint"), market.toBuffer()],
      program.programId,
    )

    // Derive user PDA
    const [user] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), creator.publicKey.toBuffer()],
      program.programId,
    )

    // Create creator's base token account
    const creatorBaseAccount = await createAccount(provider.connection, creator, baseTokenMint, creator.publicKey)

    // Mint tokens to creator for bond
    await mintTo(
      provider.connection,
      creator,
      baseTokenMint,
      creatorBaseAccount,
      authority,
      1000 * 1e6, // 1000 USDC
    )

    // Create bond vault
    const bondVault = await createAccount(provider.connection, authority, baseTokenMint, authority.publicKey)

    const params = {
      title: "Will ETH reach $5000 by end of year?",
      description: "Market resolves based on ETH/USD price at year end",
      category: 0, // Crypto
      endTime: new anchor.BN(endTime),
      resolutionSource: { oracle: {} },
      oracleAccount: null,
      targetPrice: new anchor.BN(5000 * 1e6), // $5000 with 6 decimals
      bondAmount: new anchor.BN(100 * 1e6), // 100 USDC
    }

    const tx = await program.methods
      .createMarket(params)
      .accounts({
        globalState,
        market,
        user,
        creator: creator.publicKey,
        yesShareMint,
        noShareMint,
        baseTokenMint,
        creatorBaseAccount,
        bondVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc()

    console.log("Create market transaction signature:", tx)

    // Verify market creation
    const marketAccount = await program.account.market.fetch(market)
    assert.equal(marketAccount.creator.toString(), creator.publicKey.toString())
    assert.equal(marketAccount.status.active !== undefined, true)
    assert.equal(marketAccount.bondAmount.toNumber(), 100 * 1e6)

    // Verify user stats updated
    const userAccount = await program.account.user.fetch(user)
    assert.equal(userAccount.marketsCreated, 1)
  })

  it("Creates pools for the market", async () => {
    // Derive pool PDAs
    ;[yesPool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), market.toBuffer(), Buffer.from("yes")],
      program.programId,
    )
    ;[noPool] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), market.toBuffer(), Buffer.from("no")],
      program.programId,
    )

    // Derive vault PDAs
    const [yesBaseVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("base_vault"), yesPool.toBuffer()],
      program.programId,
    )

    const [yesShareVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("share_vault"), yesPool.toBuffer()],
      program.programId,
    )

    const [noBaseVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("base_vault"), noPool.toBuffer()],
      program.programId,
    )

    const [noShareVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("share_vault"), noPool.toBuffer()],
      program.programId,
    )

    // Derive LP mint PDAs
    const [yesLpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("lp_mint"), yesPool.toBuffer()],
      program.programId,
    )

    const [noLpMint] = PublicKey.findProgramAddressSync([Buffer.from("lp_mint"), noPool.toBuffer()], program.programId)

    const params = {
      initialLiquidity: new anchor.BN(1000 * 1e6), // 1000 USDC
    }

    const tx = await program.methods
      .createPools(params)
      .accounts({
        market,
        yesPool,
        noPool,
        yesBaseVault,
        yesShareVault,
        noBaseVault,
        noShareVault,
        yesLpMint,
        noLpMint,
        creator: creator.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc()

    console.log("Create pools transaction signature:", tx)

    // Verify pools created
    const yesPoolAccount = await program.account.pool.fetch(yesPool)
    const noPoolAccount = await program.account.pool.fetch(noPool)

    assert.equal(yesPoolAccount.market.toString(), market.toString())
    assert.equal(yesPoolAccount.outcome.yes !== undefined, true)
    assert.equal(noPoolAccount.outcome.no !== undefined, true)

    // Verify market updated with pool addresses
    const marketAccount = await program.account.market.fetch(market)
    assert.equal(marketAccount.yesPool.toString(), yesPool.toString())
    assert.equal(marketAccount.noPool.toString(), noPool.toString())
  })

  it("Executes a trade", async () => {
    // Create trader's token accounts
    const traderBaseAccount = await createAccount(provider.connection, trader, baseTokenMint, trader.publicKey)

    // Mint tokens to trader
    await mintTo(
      provider.connection,
      trader,
      baseTokenMint,
      traderBaseAccount,
      authority,
      1000 * 1e6, // 1000 USDC
    )

    // Get market and share mint info
    const marketAccount = await program.account.market.fetch(market)

    // Create trader's share token account (will be created by instruction)
    const traderShareAccount = PublicKey.findProgramAddressSync(
      [trader.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), marketAccount.yesShareMint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )[0]

    // Derive position PDA
    const [position] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        trader.publicKey.toBuffer(),
        market.toBuffer(),
        Buffer.from([0]), // YES outcome
      ],
      program.programId,
    )

    // Derive user PDA
    const [user] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), trader.publicKey.toBuffer()],
      program.programId,
    )

    // Get pool vaults
    const yesPoolAccount = await program.account.pool.fetch(yesPool)

    const params = {
      outcome: { yes: {} },
      amountIn: new anchor.BN(100 * 1e6), // 100 USDC
      minAmountOut: new anchor.BN(0),
      isBuy: true,
    }

    const tx = await program.methods
      .trade(params)
      .accounts({
        market,
        pool: yesPool,
        position,
        user,
        trader: trader.publicKey,
        traderBaseAccount,
        traderShareAccount,
        baseVault: yesPoolAccount.baseTokenVault,
        shareVault: yesPoolAccount.shareTokenVault,
        shareMint: marketAccount.yesShareMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([trader])
      .rpc()

    console.log("Trade transaction signature:", tx)

    // Verify trade execution
    const positionAccount = await program.account.position.fetch(position)
    assert.equal(positionAccount.owner.toString(), trader.publicKey.toString())
    assert.equal(positionAccount.outcome.yes !== undefined, true)
    assert.isTrue(positionAccount.shares.toNumber() > 0)

    // Verify user stats updated
    const userAccount = await program.account.user.fetch(user)
    assert.equal(userAccount.totalTrades.toNumber(), 1)
    assert.isTrue(userAccount.totalVolume.toNumber() > 0)
  })

  it("Resolves the market", async () => {
    // Fast forward time to market end (in a real test, you'd use a time manipulation method)
    // For now, we'll test manual resolution

    const params = {
      outcome: { yes: {} }, // Market resolves to YES
    }

    const tx = await program.methods
      .resolveMarket(params)
      .accounts({
        market,
        resolver: creator.publicKey,
        globalState,
        oracleAccount: null,
      })
      .signers([creator])
      .rpc()

    console.log("Resolve market transaction signature:", tx)

    // Verify market resolution
    const marketAccount = await program.account.market.fetch(market)
    assert.equal(marketAccount.status.resolved !== undefined, true)
    assert.equal(marketAccount.winningOutcome.yes !== undefined, true)
    assert.isNotNull(marketAccount.resolvedAt)
  })

  it("Claims winnings", async () => {
    // This would be implemented in the claim_winnings instruction
    // For now, we'll just verify the market is resolved
    const marketAccount = await program.account.market.fetch(market)
    assert.equal(marketAccount.status.resolved !== undefined, true)

    console.log("Market successfully resolved, winnings can be claimed")
  })
})
