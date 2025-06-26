# Pool Odds Smart Contracts

> **Where Liquidity Meets Prophecy** 🔮💧

A sophisticated Solana-based prediction market platform powered by Dynamic Liquidity Market Makers (DLMM), built with the Anchor framework.

## 🌟 Overview

Pool Odds revolutionizes prediction markets by using liquidity depth to determine market confidence and odds, rather than just token prices. The deeper the liquidity pool, the more confident the market prediction becomes.

### Key Features

- **🏊 Dual Pool Architecture**: Separate YES/NO liquidity pools for each market
- **📊 Liquidity-Weighted Odds**: Market confidence based on pool depth
- **🔮 Oracle Integration**: Automated resolution via Pyth Network
- **💰 Dynamic Fees**: Fee rates adjust based on pool imbalances
- **🛡️ Security First**: Comprehensive validation and overflow protection
- **⚡ High Performance**: Optimized for Solana's speed and efficiency

## 🏗️ Architecture

### Core Components

1. **Global State**: Program-wide configuration and statistics
2. **Markets**: Individual prediction markets with metadata
3. **Pools**: YES/NO liquidity pools using constant product AMM
4. **Positions**: User trading positions and P&L tracking
5. **Users**: User statistics and activity tracking

### Account Structure

#### Market Account
```rust
pub struct Market {
    pub creator: Pubkey,           // Market creator
    pub title: [u8; 64],          // Market question
    pub status: MarketStatus,      // Active/Resolved/Cancelled
    pub end_time: i64,             // Resolution deadline
    pub yes_pool: Pubkey,          // YES outcome pool
    pub no_pool: Pubkey,           // NO outcome pool
    pub oracle_account: Option<Pubkey>, // Price feed
    pub target_price: Option<u64>, // Oracle target
    // ... additional fields
}
