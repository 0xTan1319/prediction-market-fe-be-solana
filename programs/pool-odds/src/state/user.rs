use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct User {
    /// User wallet address
    pub authority: Pubkey,
    /// Total number of markets created
    pub markets_created: u32,
    /// Total number of trades
    pub total_trades: u64,
    /// Total volume traded
    pub total_volume: u64,
    /// Total fees paid
    pub total_fees_paid: u64,
    /// Total fees earned (as LP)
    pub total_fees_earned: u64,
    /// Realized profit/loss across all positions
    pub total_realized_pnl: i64,
    /// User registration timestamp
    pub created_at: i64,
    /// Last activity timestamp
    pub last_activity: i64,
    /// User bump seed
    pub bump: u8,
    /// Reserved space for future upgrades
    pub reserved: [u8; 64],
}

impl User {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        4 + // markets_created
        8 + // total_trades
        8 + // total_volume
        8 + // total_fees_paid
        8 + // total_fees_earned
        8 + // total_realized_pnl
        8 + // created_at
        8 + // last_activity
        1 + // bump
        64; // reserved

    /// Update user stats after a trade
    pub fn update_after_trade(&mut self, volume: u64, fees: u64) -> Result<()> {
        self.total_trades = self.total_trades
            .checked_add(1)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        self.total_volume = self.total_volume
            .checked_add(volume)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        self.total_fees_paid = self.total_fees_paid
            .checked_add(fees)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        self.last_activity = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Update user stats after market creation
    pub fn update_after_market_creation(&mut self) -> Result<()> {
        self.markets_created = self.markets_created
            .checked_add(1)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        self.last_activity = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Update user stats after earning LP fees
    pub fn update_after_fee_earning(&mut self, fees: u64) -> Result<()> {
        self.total_fees_earned = self.total_fees_earned
            .checked_add(fees)
            .ok_or(crate::errors::PoolOddsError::MathOverflow)?;

        self.last_activity = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Calculate net profit/loss
    pub fn calculate_net_pnl(&self) -> i64 {
        self.total_realized_pnl
            .saturating_add(self.total_fees_earned as i64)
            .saturating_sub(self.total_fees_paid as i64)
    }

    /// Check if user can create more markets
    pub fn can_create_market(&self, max_markets: u32) -> bool {
        self.markets_created < max_markets
    }
}
