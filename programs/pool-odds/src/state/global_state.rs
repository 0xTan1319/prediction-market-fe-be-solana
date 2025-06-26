use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct GlobalState {
    /// Program authority
    pub authority: Pubkey,
    /// Protocol fee recipient
    pub fee_recipient: Pubkey,
    /// Protocol fee rate (basis points)
    pub protocol_fee_rate: u16,
    /// Default market fee rate (basis points)
    pub default_market_fee_rate: u16,
    /// Minimum market duration in seconds
    pub min_market_duration: i64,
    /// Maximum market duration in seconds
    pub max_market_duration: i64,
    /// Minimum bond amount for market creation
    pub min_bond_amount: u64,
    /// Maximum number of markets per creator
    pub max_markets_per_creator: u32,
    /// Program paused state
    pub paused: bool,
    /// Total number of markets created
    pub total_markets: u64,
    /// Total volume across all markets
    pub total_volume: u64,
    /// Total fees collected
    pub total_fees: u64,
    /// Reserved space for future upgrades
    pub reserved: [u8; 128],
}

impl GlobalState {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // fee_recipient
        2 + // protocol_fee_rate
        2 + // default_market_fee_rate
        8 + // min_market_duration
        8 + // max_market_duration
        8 + // min_bond_amount
        4 + // max_markets_per_creator
        1 + // paused
        8 + // total_markets
        8 + // total_volume
        8 + // total_fees
        128; // reserved

    pub fn is_paused(&self) -> bool {
        self.paused
    }

    pub fn validate_market_duration(&self, duration: i64) -> Result<()> {
        require!(
            duration >= self.min_market_duration && duration <= self.max_market_duration,
            crate::errors::PoolOddsError::InvalidMarketDuration
        );
        Ok(())
    }

    pub fn validate_bond_amount(&self, amount: u64) -> Result<()> {
        require!(
            amount >= self.min_bond_amount,
            crate::errors::PoolOddsError::InsufficientBondAmount
        );
        Ok(())
    }
}
